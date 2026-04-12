# 附录 AA｜Interrupt 与 Queue 专章：Hermes 为什么消息平台里的新消息不能直接塞进正在运行的 Agent 回合

## 先把 interrupt 和 queue 分开

很多人第一次做消息平台 Agent 时，都会自然地冒出一个想法：

- 如果用户又发来一条消息
- 那就直接把这条消息接到当前对话后面
- 让正在运行的 agent 顺手继续处理不就好了

这个想法看起来很省事，但在真实系统里通常会立刻出问题。

因为消息平台里的 Agent 并不是一个“永远停在 `await user_input`”的协程。
它很可能正在：

- 等模型返回
- 跑工具
- 持续 streaming
- 调子 Agent
- 处理中途的图片、语音、文件预处理

这时候如果你把新消息粗暴塞进当前回合，系统边界很快就会乱掉：

- 到底这条消息属于当前回合，还是下一回合？
- 如果模型还没产出最终回答，旧回答要不要发出去？
- 如果正在跑工具，新消息是立刻打断，还是排队？
- 如果启动阶段还没拿到真正的 agent 实例，怎么避免并发重入？

Hermes 在 gateway 里没有把这些问题糊成一团，
而是明确拆成了几层机制：

- 先用 sentinel 抢占 session
- 再区分“应该中断”还是“应该排队”
- 然后把 interrupt 信号送进 `AIAgent`
- 最后在当前回合收尾后，决定要不要续跑下一条消息

这一章就专门回答这个问题：

Hermes 为什么坚持不把消息平台里的新消息直接并进当前 Agent 回合，而是要做一整套 interrupt / queue / replay 机制？

这一篇主要结合这些源码和测试文件来看：

- `gateway/run.py`
- `run_agent.py`
- `tests/gateway/test_session_race_guard.py`
- `tests/gateway/test_queue_consumption.py`
- `tests/run_agent/test_run_agent.py`

---

## 1. Hermes 最核心的判断：消息平台里的“新消息”本质上是在抢同一个 session 的执行权

先把问题想透。

在普通 Web 接口里，一次请求通常就是一次执行。

但在消息平台里，同一个 session 会出现一种特殊情况：

- 上一条消息触发的 agent 还没跑完
- 下一条消息已经到了

这时系统面对的不是“怎么把新文本拼进历史”，
而是一个更底层的问题：

- 当前这个 session 的执行权该归谁

Hermes 认为这里不能靠模糊处理，
因为模糊处理最容易制造三类错误：

- 同一个 session 同时跑出两个 agent
- 新消息被错误地喂进旧回合，污染当前执行语义
- 旧回答和新回答的发送顺序混乱

所以它先做的不是“合并消息”，
而是“声明 session 当前正在被谁占用”。

这就是后面 sentinel 机制存在的原因。

---

## 2. `_AGENT_PENDING_SENTINEL`：Hermes 先抢占 session，再继续做异步准备

看 `gateway/run.py` 里 `_handle_message()` 进入真正处理前的那段逻辑。

源码注释写得非常清楚：

- 在 `_run_agent` 真正注册 `AIAgent` 之前
- 中间还有很多 `await` 点
- 比如 hook、vision enrichment、STT、session hygiene compression
- 如果不先放一个 sentinel
- 第二条消息就可能穿过“already running”判断
- 为同一个 session 再起一颗重复 agent
- 最后污染 transcript

因此 Hermes 在任何 `await` 之前先做了两件事：

- `self._running_agents[_quick_key] = _AGENT_PENDING_SENTINEL`
- `self._running_agents_ts[_quick_key] = time.time()`

这一步非常关键。

因为它说明 Hermes 防的不是“理论上的并发”，
而是消息平台环境里极常见的启动竞态：

- 第一条消息刚进来
- 还在准备运行时
- 第二条消息已经到了

如果你没有这层占位，
系统就会误以为：

- 现在还没有 active agent
- 那我也可以再开一个

而 Hermes 明确不允许这种事情发生。

### 2.1 sentinel 不是业务状态，而是启动期锁

这点很值得初学者注意。

`_AGENT_PENDING_SENTINEL` 不是一个“半成品 agent”，
也不是一个“空对象占位”，
它的语义更接近：

- 这个 session 的执行权已经被声明占用
- 只是实际 agent 还没完全创建好

这就是为什么后面很多分支都会专门判断：

- 当前 running entry 是不是 sentinel

因为“真实 agent 正在运行”和“session 正在启动、暂时不可重入”，
在 Hermes 看来是两种不同的忙碌状态。

### 2.2 测试也专门验证了这层防线

`tests/gateway/test_session_race_guard.py` 里的

- `test_second_message_during_sentinel_queued_not_duplicate`

验证的就是：

- 第一条消息卡在慢启动阶段
- 第二条消息到达时应该命中“already running”
- 被排入 pending
- 而不是再启动第二个 agent

这意味着 Hermes 把“启动期防重入”当成了明确的系统契约，
不是顺便碰巧实现出来的行为。

---

## 3. session 忙碌时，Hermes 不是一刀切，而是先分流不同类型的新输入

当 `_quick_key in self._running_agents` 成立后，
Hermes 并没有简单做成一句：

- “Agent 正在运行，请稍后再试”

而是立刻进入一套优先级分流逻辑。

从 `gateway/run.py` 可以看出，它会先判断：

- 是不是 `/status`
- 是不是 `/restart`
- 是不是 `/stop`
- 是不是 `/new`
- 是不是 `/queue`
- 是不是 `/model`
- 是不是 `/approve` / `/deny`
- 是不是 `/background`
- 是不是 photo follow-up
- 否则才走普通文本中断

这一步非常能体现 Hermes 的工程现实感。

因为在消息平台里，“session 正忙”不代表所有输入都该等价处理。

有些输入的语义是：

- 查询状态

有些是：

- 立刻停掉当前执行

有些是：

- 不打断，只排到下一轮

有些则必须绕过普通中断路径，
否则根本解不了当前阻塞。

Hermes 把这些情况分开，
本质上是在给消息平台 Agent 加一层调度语义。

---

## 4. `/stop`、`/new`、`/approve` 为什么都不能当普通“新消息”处理

这一段特别适合初学者建立边界感。

### 4.1 `/stop` 不是聊天消息，而是强制释放 session 锁

在 `gateway/run.py` 里，
`/stop` 到达 active session 时不会被排队成用户文本，
而是直接：

- `running_agent.interrupt("Stop requested")`
- 清理 adapter pending message
- 清理 `_running_agents`
- suspend 当前 session

源码注释写得很明白：

- soft interrupt 不足以处理真正挂死的 agent
- 必须 force-clean `_running_agents`
- 否则 session 会一直保持锁住状态

这说明 Hermes 把 `/stop` 看成运行时控制指令，
而不是“发给模型的一句话”。

### 4.2 `/new` 也必须绕过普通排队逻辑

`/new` 的处理类似。

Hermes 会先中断当前 agent，
清空 pending message，
再直接走 reset handler。

源码注释点出了原因：

- `/reset` 和 `/new` 不能只是被当成用户文本排进队列
- 否则它们可能带着旧历史重新被喂给 agent
- 反而继续污染那段已经坏掉的 session

所以 `/new` 本质上是在切断旧执行上下文，
而不是给当前 assistant 追加一句“请帮我重开会话”。

### 4.3 `/approve` 与 `/deny` 更说明“不是所有阻塞都能靠 interrupt 解决”

Hermes 还专门写了注释：

- `/approve` 和 `/deny` 必须绕过 running-agent interrupt path
- 因为 agent 线程可能正阻塞在 `threading.Event`

这句很有价值。

因为它告诉你：

- interrupt 不是万能中断
- 有些阻塞不是 agent loop 自己轮询出来的
- 而是卡在外部等待原语上

这种情况下，真正该做的是：

- 直达 approval handler
- 去 signal 那个等待事件

这就是成熟系统和 Demo 系统的差别：

- Demo 觉得“收到新消息就 interrupt”
- Hermes 会继续问：“interrupt 到底能不能真的解除当前阻塞？”

---

## 5. 普通新消息为什么默认触发 interrupt，而不是直接排队

当 session 正在运行、而新输入又不是上述特殊命令时，
Hermes 的默认策略是：

- `running_agent.interrupt(event.text)`

也就是优先中断当前运行。

这背后的判断并不复杂：

- 普通用户连续发新消息，通常意味着他改变了意图
- 或者他在追问、修正、补充
- 这时继续让旧回合跑到底，往往只会制造无效输出

所以 Hermes 在这里优先保证的是：

- 响应用户最新意图的延迟最小

而不是：

- 把旧回合执念般跑完

这也是为什么代码注释写的是：

- `Default behavior is to interrupt immediately so user text/stop messages are handled with minimal latency.`

对学习 Agent 的人来说，这里有个很重要的提醒：

消息平台不是批处理系统。

当用户显式发来新的自然语言输入时，
系统默认应该尊重“最新用户意图”，
而不是执着于“当前回合已经开始了，所以必须做完”。

---

## 6. `/queue` 的存在说明：Hermes 区分“我想打断你”和“我想等你做完再说”

如果 Hermes 只有 interrupt，没有 queue，
那它默认就是把所有新消息都解释成：

- 请立刻停下，转而处理我现在这句

但真实用户并不总是这个意思。

有时候用户想表达的是：

- 你先把这件事做完
- 做完后下一轮再处理这个补充

这就是 `/queue` 的意义。

在 `gateway/run.py` 里，
`/queue <prompt>` 并不会对当前 agent 发送 interrupt，
而是把一个新的 `MessageEvent` 放进：

- `adapter._pending_messages[_quick_key]`

然后立即返回：

- `Queued for the next turn.`

### 6.1 `/queue` 存的是完整 `MessageEvent`，不是纯文本

这一点非常关键。

Hermes 没有只存 `queued_text`，
而是构造并保存完整 `MessageEvent`。

后面 `_dequeue_pending_event(adapter, session_key)` 的 docstring 也明确解释了原因：

- queued follow-up 必须保留 media metadata
- 这样它们重新进入 normal preprocessing path 时
- 不会被降级成一段占位字符串

也就是说，Hermes 不是只在排一段文本，
而是在排：

- 下一轮完整的入站事件

这能保证后续流程还能继续做：

- 图片说明
- 语音转写
- 文件说明
- sender attribution

### 6.2 测试也把 `/queue` 和 interrupt 的边界钉死了

`tests/gateway/test_queue_consumption.py` 里有两组特别关键的测试：

- `test_queue_does_not_set_interrupt_event`
- `test_regular_message_sets_interrupt_event`

它们明确验证：

- `/queue` 的核心意义就是“只进 pending，不触发 interrupt signal”
- 普通新消息则相反，会设置 active session 的 interrupt event

这说明在 Hermes 里，
queue 不是 interrupt 的一个弱版本，
而是另一种语义完全不同的调度动作。

---

## 7. Gateway 只是发信号，真正停不停还要看 `AIAgent.interrupt()`

如果只看 gateway，你会以为 interrupt 不过是：

- 收到新消息
- 调一下 `agent.interrupt(...)`

但顺着 `run_agent.py` 往下看，
会发现 Hermes 在 Agent 内核里同样认真做了这件事。

`AIAgent.interrupt()` 会做几件事：

- `self._interrupt_requested = True`
- 记录 `self._interrupt_message`
- 调 `_set_interrupt(True, self._execution_thread_id)`
- 把中断继续传播给 active child agents

这几步合起来说明：

- interrupt 不是只改一个布尔值
- 它还要把信号传到工具执行线程和子 Agent

也就是说，Hermes 不是把 interrupt 理解成：

- “下次有空再看看有没有新消息”

而是把它当成：

- 一个必须贯穿 agent loop、工具执行、子任务执行的系统级信号

### 7.1 `run_agent.py` 会把 interrupt 原因带回结果

在 `run_conversation()` 收尾阶段，
如果本轮被中断且有 `_interrupt_message`，
Hermes 会把它写进：

- `result["interrupt_message"]`

然后再 `clear_interrupt()`

这一步很关键，
因为 gateway 后面正是靠这份结果决定：

- 当前回合收尾后，下一条要续跑的到底是什么

这等于打通了：

- 网关收到新消息
- agent 中途被中断
- 中断原因回传给网关
- 网关据此发起下一轮

所以 Hermes 的 interrupt 不是一个单点函数，
而是一条完整链路。

### 7.2 测试也验证了 interrupt 会真正打断 loop

`tests/run_agent/test_run_agent.py` 里的

- `test_interrupt_breaks_loop`

直接模拟 `_interruptible_api_call()` 抛出 `InterruptedError`，
最后断言：

- `result["interrupted"] is True`

这说明 Hermes 的 interrupt 不是“只在 UI 上显示一条提示”，
而是真的会改变 Agent Runtime 的执行结果。

---

## 8. 当前回合结束后，Hermes 为什么还要做一次“续跑判断”

真正把这套机制串起来的是 `_run_agent()` 尾部那段逻辑。

那里 Hermes 会检查两件事：

- 本轮是不是被中断了
- adapter 里是不是还有 pending event

如果存在 pending follow-up，
Hermes 不会简单把这轮结果返回然后结束，
而是继续做一层判断。

### 8.1 如果是“正常完成 + queued message”

Hermes 会先尽量把第一轮的正常回答发出去，
然后再把 queued follow-up 作为下一轮输入重新进入 `_run_agent(...)`

这一步体现的是：

- 旧回答是有效完成的
- 所以应该先交付
- 然后再处理排队的下一条消息

### 8.2 如果是“被 interrupt 打断”

Hermes 则会丢弃那种“Operation interrupted.”式的噪音输出，
直接把注意力转到下一条消息。

源码注释说得很直白：

- interrupted response is just noise
- 用户已经知道自己发了新消息

这说明 Hermes 对“是否发送旧结果”不是一刀切，
而是看旧回合到底是：

- 正常完成
- 还是被人为打断

### 8.3 queued follow-up 会重新走完整的 inbound preprocess pipeline

如果 pending 的是完整 `MessageEvent`，
Hermes 会调用：

- `_prepare_inbound_message_text(...)`

把它重新送回和普通入站消息同一条预处理链：

- sender attribution
- image enrichment
- STT
- document notes
- reply context
- `@` 引用展开

这点非常值得强调。

因为它说明 Hermes 不是把 queued message 当成“拼接到字符串末尾的一段补充文本”，
而是认真把它当作：

- 下一轮正式入站事件

这也是为什么 queue 机制在 Hermes 里不是小补丁，
而是 gateway runtime 的正式组成部分。

---

## 9. `_MAX_INTERRUPT_DEPTH = 3`：Hermes 连“连续打断导致递归爆炸”都防了

如果系统允许：

- 当前回合被中断
- 立即递归启动下一回合
- 下一回合又立刻被中断

那很快就会出现一种危险：

- session 在连续 follow-up 中无限递归
- 资源和栈深度不断膨胀

Hermes 显然考虑到了这一点。

在 `gateway/run.py` 里，它专门定义：

- `_MAX_INTERRUPT_DEPTH = 3`

并在续跑路径上判断：

- 如果 `_interrupt_depth` 已达上限
- 就不要继续递归 `_run_agent(...)`
- 而是把消息重新塞回 pending queue

源码注释直接点出目的：

- prevent resource exhaustion

这一步特别像一个成熟运行时才会有的设计。

因为它说明 Hermes 不只是想着“功能要能工作”，
还在想着：

- 当用户连续追发消息
- 当 agent 连续失败
- 当递归续跑不断叠加

系统会不会把自己拖死。

对初学者来说，这是一条很重要的工程课：

- 只要你允许中途接管和自动续跑
- 你就必须顺手设计边界

否则好用的功能，很容易变成新的灾难入口。

---

## 10. 测试如何证明：Hermes 处理的是“会话调度问题”，不是简单消息拼接

把前面的测试放在一起看，你会发现 Hermes 这套 interrupt / queue 机制，验证点并不在“字符串有没有拼对”，而在会话调度边界。

### 10.1 `test_second_message_during_sentinel_queued_not_duplicate`

证明：

- 启动期第二条消息必须排队
- 不能复制出第二颗 agent

### 10.2 `test_stop_during_sentinel_force_cleans_session`

证明：

- 即使 agent 还没创建完成
- `/stop` 也必须能解锁 session

### 10.3 `test_stop_hard_kills_running_agent`

证明：

- `/stop` 不是温柔建议
- 它必须真正 interrupt 当前 agent，并释放 session

### 10.4 `test_stop_clears_pending_messages`

证明：

- 强停后还留着旧 pending message 是危险的
- 因为 stale replay 会把旧语义重新注入下一轮

### 10.5 `test_queue_does_not_set_interrupt_event`

证明：

- queue 的本质就是延后执行
- 不是隐式 interrupt

### 10.6 `test_pending_message_available_after_normal_completion`

证明：

- 正常完成后的 queued message 不应该被静默吞掉
- 它应该进入下一轮正式处理

这些测试合在一起，已经把 Hermes 的真实设计意图说明白了：

- 它解决的不是“多一条消息怎么加到 history”
- 而是“同一个 session 在运行中收到新输入后，如何安全切换执行权”

---

## 11. 读完这一篇记住 5 点

### 11.1 消息平台里的新输入，首先是调度事件，其次才是自然语言内容

不要一上来就想着“这句文本怎么拼进 prompt”。

先问：

- 它是不是应该打断当前回合？
- 还是应该排到下一轮？
- 还是它其实是运行时控制指令？

### 11.2 防重入一定要早于异步准备

Hermes 用 sentinel 抢占 session，
就是因为真正危险的竞态往往发生在：

- agent 还没创建好
- 但第二条消息已经到了

这类 bug 在本地单步调试里很难看到，
上线后却很常见。

### 11.3 queue 和 interrupt 必须是两种不同语义

如果你的系统只有“立即打断”这一种策略，
那用户就没法表达：

- 先做完这件事
- 下一轮再处理我后面补充的内容

真正好用的消息平台 Agent，必须给这两种意图各自的入口。

### 11.4 interrupt 必须是一条贯穿 Runtime 的链路

只在 gateway 层改一个标志位是不够的。

你还得考虑：

- 模型调用怎么停
- 工具执行怎么停
- 子 Agent 怎么停
- 中断原因怎么回传给下一轮

Hermes 这一整套链路，正是在解决这个问题。

### 11.5 任何“自动续跑”机制都必须带边界

只要系统允许：

- 当前回合结束后自动吃掉 pending follow-up

你就必须顺手设计：

- 深度上限
- stale message 清理
- draining 时的丢弃策略

否则你的 Agent 迟早会在边界场景里把自己绕死。

---

## 最后把并发边界收一下

Hermes 没有把消息平台里的新消息简单理解成：

- “再往 transcript 里 append 一条 user message”

它更接近把这件事看成：

- 对同一个 session 当前执行权的重新竞争

因此它在 gateway 里分阶段解决这个问题：

- 用 `_AGENT_PENDING_SENTINEL` 防启动期重入
- 用特殊命令分流处理运行时控制语义
- 用普通 interrupt 响应最新用户意图
- 用 `/queue` 表达“下一轮再处理”
- 用 pending event replay 把 follow-up 重新送回正式入站链路
- 用递归深度上限和 stale 清理守住运行时边界

顺着这些源码看下来，你会发现 Hermes 真正教给初学者的一件事是：

一个能在消息平台里长期运行的 Agent，
本质上不只是“LLM + tools”，
它还必须是一个能处理中断、排队、执行权切换和生命周期收尾的会话调度器。

这也是为什么 Hermes 里的 interrupt / queue 机制看起来麻烦，
但一旦你理解了源码，就会知道这些麻烦几乎都是必要的。
