# 附录 AB｜Activity 与 Inactivity Timeout 专章：Hermes 为什么不是给 Agent 一个固定超时，而是盯住它是否还在推进

## 先把 timeout 的判断标准看清

很多人做 Agent Runtime 时，给长任务兜底的第一反应通常是设一个固定上限：

- 跑超过 5 分钟就杀掉
- 跑超过 10 分钟就超时
- 反正别让它一直挂着

这套思路看起来合理，但一旦 Agent 真开始做复杂任务，很快就会遇到矛盾：

- 有些任务真的要跑很久
- 有些工具本来就会持续几分钟甚至更久
- 有些 streaming API 调用在稳定吐 token，但总时长并不短

如果你只看墙钟时间，
系统很容易误杀一颗其实还在正常推进的 Agent。

但反过来，如果你完全不设边界，
系统又可能被这些情况拖死：

- 卡住的 API 调用
- 挂死的工具执行
- 不再产出任何 token 的流式响应
- 锁死 session 的僵尸 agent

Hermes 对这个问题的回答，不是简单调大或调小 timeout，而是换了一个判断标准：

- 不看“这颗 agent 跑了多久”
- 优先看“这颗 agent 最近还有没有活动”

这一章就专门回答这个问题：

Hermes 为什么不把超时理解成“总运行时长上限”，而是做成一套基于 activity / inactivity 的运行时策略？

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `gateway/run.py`
- `tests/gateway/test_gateway_inactivity_timeout.py`
- `tests/cron/test_cron_inactivity_timeout.py`

---

## 1. Hermes 最核心的判断：对 Agent 来说，真正危险的不是“跑太久”，而是“长时间没有推进”

先把问题想透。

一颗 Agent 的总时长很长，不一定是坏事。

比如它可能正在：

- 连续调用多个工具
- 跑一个长时间终端命令
- 持续接收 streaming token
- 做多轮子任务委派

这种时候，虽然它已经运行很久，
但只要系统还能证明它在持续推进，
你就不应该贸然把它杀掉。

真正危险的情况其实是另一类：

- 表面上任务还没结束
- 但已经很久没有任何实质活动

比如：

- 没有新的 tool call
- 没有新的 API 响应
- 没有新的 stream delta
- 没有任何可观测的进度信号

Hermes 把这两种状态分得非常清楚：

- 长时间运行，不等于异常
- 长时间无活动，才更像异常

这就是它选择 inactivity timeout 的根本原因。

---

## 2. `gateway/run.py` 已经把答案写在注释里：用 inactivity-based timeout，而不是 wall-clock limit

看 `gateway/run.py` 里 `_run_agent()` 的超时逻辑，注释几乎直接把设计意图说透了：

- use an *inactivity*-based timeout instead of a wall-clock limit
- agent can run for hours if it's actively calling tools / receiving stream tokens
- but a hung API call or stuck tool with no activity is caught and killed

这几句话很重要，因为它说明 Hermes 不是“没有超时”，而是在认真区分两类风险：

### 2.1 可接受的长任务

- 任务耗时很久
- 但 activity 一直在更新

### 2.2 不可接受的挂死

- 任务没有结束
- 但 activity 已经停了很久

如果只看墙钟时间，这两类情况在系统眼里没有区别；但对真正能用的 Agent 来说，它们差别非常大。Hermes 在这里给出的工程答案是：让 agent 跑多久不是第一优先级，能不能证明它还在推进才是第一优先级。

---

## 3. `run_agent.py` 里的 `_touch_activity(...)`：Hermes 先把“推进”做成可观测信号

要做 inactivity timeout，前提是系统得知道：

- 什么叫“这颗 agent 还在动”

Hermes 没有靠猜，而是在 `run_agent.py` 里专门维护了一套 activity tracker。

核心函数是：

- `_touch_activity(desc: str)`

它每次被调用时都会更新：

- `self._last_activity_ts`
- `self._last_activity_desc`

然后 `get_activity_summary()` 会把这些状态包装成诊断快照返回出去，包括：

- `last_activity_ts`
- `last_activity_desc`
- `seconds_since_activity`
- `current_tool`
- `api_call_count`
- `max_iterations`
- `budget_used`
- `budget_max`

这一步特别关键。Hermes 不是在做一个“黑箱超时器”，而是在先把 agent 的推进过程显式暴露出来。它先回答的是“系统怎样知道 agent 还活着”，而不是一上来就问“超时阈值设多少秒”。如果连 activity 都不可观测，timeout 逻辑本质上只能是拍脑袋。

---

## 4. activity 在哪些关键节点会被刷新：Hermes 盯的不是“线程是否活着”，而是“工作是否在推进”

再往下看 `run_agent.py`，你会发现 `_touch_activity(...)` 并不是随便找地方调用一下。

它被放在了几类非常关键的运行时节点上。

### 4.1 每轮 API 调用开始时

在主循环里，Hermes 进入新一轮模型调用前会写：

- `starting API call #N`

这表示：

- Agent 正在发起新的推理步骤

### 4.2 streaming 请求发出和首个 chunk 到达时

在 `_interruptible_streaming_api_call(...)` 里，Hermes 会先记录：

- `waiting for provider response (streaming)`

等首个 chunk 真到达后，又更新为：

- `receiving stream response`

这个细节非常有价值。

因为它说明 Hermes 不是把“发起请求”与“真正收到输出”混成一件事，
而是把它们拆成两个活动阶段。

这能让超时诊断更准确地区分：到底是卡在请求发出后还没响应，还是已经进入稳定接收流。

### 4.3 工具开始和完成时

在工具执行路径里，Hermes 也会更新：

- `executing tool: <name>`
- `tool completed: <name> (Xs)`

也就是说，工具运行不是一段对 gateway 完全不可见的黑盒时间，系统至少能知道现在卡在哪个 tool、最后一次完成的是哪个 tool。

### 4.4 长工具还能通过 callback 持续续命

更进一步，Hermes 在工具执行前还会尝试：

- `set_activity_callback(self._touch_activity)`

源码注释写得很明确：

- 这是为了让长时间运行的工具执行持续上报 activity
- 避免 gateway 的 inactivity monitor 把正常命令误杀

这一点很重要，因为它说明 Hermes 不是只在“tool 开始”和“tool 结束”两个点上打卡，而是尽量让长工具在运行中也能持续刷新活跃度。这样 inactivity timeout 盯的是“最近有没有推进”，而不是“上次进入工具到现在过去了多久”。

---

## 5. Gateway 如何利用这套 activity tracker：先提醒，再超时，而不是上来就砍

看 `gateway/run.py` 里 `_run_agent()` 的主执行路径，
Hermes 对 inactivity 的处理不是一步到位直接 kill，
而是一个两阶段流程。

### 5.1 第一阶段：still working 通知

Hermes 会启动一个周期性任务 `_notify_long_running()`，
每隔 10 分钟给用户发一次：

- `⏳ Still working...`

而且消息里不是只有“还活着”四个字，
还会尽量拼上 activity summary：

- 当前是第几轮 iteration
- 当前正在跑哪个 tool
- 或最后一次活动描述是什么

这说明 Hermes 把“长时间运行”当成一个需要可观测性的场景，而不是沉默等待。

对消息平台尤其如此。

因为在聊天界面里，如果 10 分钟完全没声，
用户很容易以为：

- 系统死了
- 网络断了
- bot 丢消息了

Hermes 用这类 still working 通知解决的是“可感知性”问题。

### 5.2 第二阶段：warning 阶段

真正的 inactivity timeout 到来之前，
Hermes 还会先看：

- `HERMES_AGENT_TIMEOUT_WARNING`

如果 inactivity 已达到 warning 阈值，
而且本轮 warning 还没发过，
就会先给用户发一条提示：

- 已经多久没有活动
- 如果再没有响应，多少分钟后会被 timed out
- 你可以继续等，或者 `/reset`

这一层很能体现 Hermes 的产品意识。它没有把 timeout 当成“后台偷偷发生的技术事件”，而是把它变成一条用户可理解的状态过渡：先提醒你，再真的超时。

### 5.3 第三阶段：full timeout

只有当 `seconds_since_activity >= gateway_timeout` 时，
Hermes 才会认定：

- 这颗 agent 已经不是单纯慢，而是真正失去推进

这时它才会：

- 记录错误日志
- 调 `agent.interrupt("Execution timed out (inactivity)")`
- 拼出一段带诊断信息的用户可读结果

这套顺序很重要。Hermes 想避免两种极端：没有超时边界，系统被卡死；有超时边界，但上来就生硬砍掉。它选择的是更成熟的一条路：持续观测，分阶段提醒，最后才执行超时。

---

## 6. timeout 发生后，Hermes 为什么还要把“最后卡在哪里”告诉用户

很多系统超时后只会返回一句：

- Request timed out

这对用户和开发者其实都没什么帮助。

Hermes 在超时分支里，会先从 `get_activity_summary()` 提取：

- `last_activity_desc`
- `seconds_since_activity`
- `current_tool`
- `api_call_count`
- `max_iterations`

然后再拼成面向用户的诊断结果。

如果当前卡在 tool 上，就会告诉你：

- stuck on tool `<tool_name>`
- 已经多久没有活动
- 当前 iteration 走到哪里

如果当前没有 tool，而更像卡在 API 侧，
就会告诉你：

- 最后一次活动是什么
- 可能是在等待 provider response

这一步很值得学习。Hermes 没有把 timeout 只当成“失败结论”，而是尽量把它做成一次最小诊断报告。

这样用户能判断：

- 是不是可以再试一次
- 是不是该 `/reset`
- 是不是某个工具特别容易卡死

而开发者也能更容易定位问题卡在模型调用、工具执行，还是某个 session 进入了异常状态。

---

## 7. `gateway_timeout = 0` 和 warning = 0：Hermes 连“关闭机制”都做了清楚边界

Hermes 在配置桥接处，把：

- `agent.gateway_timeout`
- `agent.gateway_timeout_warning`

映射到了环境变量：

- `HERMES_AGENT_TIMEOUT`
- `HERMES_AGENT_TIMEOUT_WARNING`

然后在运行时解析时采用了一个很清楚的约定：

- timeout `> 0` 才启用
- 否则就是 `None`，表示 unlimited

warning 也是同样逻辑：

- warning `> 0` 才启用
- `0` 就代表禁用 warning

这类细节虽然不显眼，但很重要。很多系统会把“0”这种值解释得很含糊，最后导致看起来像关闭了超时，实际却走了奇怪的默认值。Hermes 在这里的处理很直接：0 就是关，None 就是不限制，这让运维行为更可预测。

---

## 8. activity tracker 不只服务 timeout，还服务 stale lock 清理

如果你继续往前看 `gateway/run.py` 处理 active session 的那段逻辑，
会发现 activity summary 还有另一个很关键的用途：

- stale `_running_agents` entry eviction

源码注释说得很清楚：

- 既然用了 inactivity-based timeout
- 那就不能只看 wall-clock age 来判断 entry 是否 stale
- 只有 agent 空闲超出阈值，或者 wall-clock age 极端夸张时，才应该清理

这里的判断大致是：

- 优先看 `seconds_since_activity`
- 只有 agent 真 idle 很久，才当成 stale
- 如果根本拿不到 activity tracker，再退回到一个很大的 wall-clock TTL

这一步很能体现 Hermes 设计的一致性。它没有一边说长任务可以跑很久，另一边又在别处用一个粗暴的 wall-clock TTL 把长任务当成 stale 清掉。相反，它把同一套 activity 语义复用到 inactivity timeout 和 stale lock eviction 上，这说明 Hermes 不是在堆临时补丁，而是在逐步建立统一的运行时判断标准。

---

## 9. 这不是 gateway 的孤例：cron 里也沿用了同一套 inactivity 思路

如果你再看 `tests/cron/test_cron_inactivity_timeout.py`，
会发现 Hermes 在 cron 场景里也做了类似的事情。

这些测试覆盖了几件事：

- active agent 正常完成时不应误超时
- idle agent 应该触发 inactivity timeout
- `HERMES_CRON_TIMEOUT=0` 表示 unlimited
- 超时错误信息里应该包含 activity summary
- 如果 agent 根本没有 `get_activity_summary()`，要保留向后兼容

这点很有教学意义，因为它说明 inactivity tracking 不是某个 gateway 的局部技巧，而是 Hermes 对“长时运行 agent”形成的一条通用方法论：

- 不同入口可以有不同的超时配置
- 但判断“该不该杀”时，优先看 activity

换句话说，Hermes 在 gateway 和 cron 两个完全不同的执行场景里，都在坚持同一个底层原则：真正应该被杀掉的，不是耗时长的 agent，而是已经不再推进的 agent。

---

## 10. 测试如何证明：Hermes 关心的是 inactivity，而不是 duration

`tests/gateway/test_gateway_inactivity_timeout.py` 里有几组测试特别适合帮助理解这一点。

### 10.1 `test_warning_fires_once_before_timeout`

证明：

- warning 会在 inactivity 达到阈值时触发
- 而且只触发一次

这说明 warning 是一个状态过渡点，不是每次 poll 都重复轰炸用户。

### 10.2 `test_full_timeout_still_fires_after_warning`

证明：

- warning 不是 timeout 的替代
- 它只是 full timeout 之前的预警阶段

### 10.3 `test_unlimited_timeout_no_warning`

证明：

- 当 timeout 是 unlimited 时
- warning 也不该再单独冒出来制造误导

### 10.4 `test_warning_zero_means_disabled`

证明：

- warning `0` 的语义就是关闭 warning

不是回退默认值，也不是“立刻 warning”。

### 10.5 cron 侧的 `test_agent_without_activity_summary_uses_wallclock_fallback`

证明：

- Hermes 也考虑了向后兼容
- 如果某颗 agent 没有 `get_activity_summary()`
- 不能直接把系统搞挂

这很能体现 Hermes 的工程成熟度：新机制要增强系统，但不能粗暴要求所有老路径立刻完全配合。

---

## 11. 读完这一篇记住 5 点

### 11.1 长时间运行不等于异常

Agent 和普通 HTTP handler 不一样。

只要它还在推进，
就可能是健康的长任务，而不是坏掉的请求。

### 11.2 先把“推进”做成可观测信号，再谈超时策略

Hermes 先有 `_touch_activity(...)` 和 `get_activity_summary()`，
再有 inactivity timeout。

这个顺序非常关键。

### 11.3 超时最好分阶段，而不是上来就砍

still working、
warning、
full timeout

这三层让用户体验和系统治理都更平滑。

### 11.4 诊断信息比“超时了”四个字重要得多

如果你能告诉用户：

- 最后卡在哪个 tool
- 卡了多久
- 当前第几轮

那一次 timeout 至少还能产出调试价值。

### 11.5 同一套 activity 语义，最好贯穿多个运行时问题

Hermes 不只拿 activity 来做 timeout，
还拿它来做 stale lock 清理。

这说明一套好的运行时观测语义，最好能服务多个治理问题，而不是只解决单一 bug。

---

## 最后把 timeout 边界收住

Hermes 在超时这件事上，最值得学习的不是某个具体秒数，而是它换了一个判断问题的角度：

- 不再问“这颗 agent 一共跑了多久”
- 而是先问“它最近还有没有推进”

围绕这个判断，Hermes 在源码里搭了一整套配套机制：

- `run_agent.py` 用 `_touch_activity(...)` 把关键推进节点显式打点
- `get_activity_summary()` 把 agent 状态变成 gateway 和 cron 可消费的诊断快照
- `gateway/run.py` 用 still working 通知、warning、full timeout 三段式处理 inactivity
- stale lock 清理也复用了同一套 activity 语义
- 测试则把 warning、timeout、unlimited、兼容回退这些边界都钉死

所以这章真正想让你带走的一句话是：

一个成熟的 Agent Runtime，不应该只是“设置超时”，
而应该先建立“什么叫还在推进”的运行时定义。

Hermes 的 inactivity timeout，本质上就是这条定义在工程里的落地版本。
