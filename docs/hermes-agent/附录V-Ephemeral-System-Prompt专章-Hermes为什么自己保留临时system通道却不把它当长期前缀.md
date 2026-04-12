# 附录 V｜Ephemeral System Prompt 专章：Hermes 为什么自己保留临时 system 通道，却不把它当长期前缀

## 先把这条白名单通道说透

前一篇附录我们已经讲过：

- Hermes 不让插件随便改 system prompt

这时候很多人会自然追问一句：

- 那为什么 Hermes 自己又保留了 `ephemeral_system_prompt` 这条通道？

这不是自相矛盾吗？

表面看，好像是。

但只要回到源码，你会发现 Hermes 在这里其实区分得非常清楚：

- 哪些东西可以作为核心稳定前缀长期缓存
- 哪些东西只是这次运行时临时叠加的 system 层指令
- 哪些动态上下文根本不应该进入 system 层

`ephemeral_system_prompt` 就是 Hermes 自己保留的一条：

- 受控的
- API-call-time 的
- 不写入轨迹
- 不当作长期前缀缓存基底

的 system 通道。

所以这一篇附录想回答的问题是：

Hermes 为什么一边严格限制插件和 recall 乱改 system prompt，一边又自己保留 `ephemeral_system_prompt` 这条临时 system 通道？

这一篇只回答内核为什么保留一条受控的临时 system overlay。

- 插件为什么不能借机拿到同样权限，详见附录 U
- recall 为什么不该借这条通道上升成长期前提，详见附录 T
- 这条通道在实际装配顺序里排在哪，详见附录 W
- 为什么它参与执行却不写进 trajectory，详见附录 Y

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `gateway/platforms/api_server.py`
- `gateway/run.py`
- `tests/gateway/test_api_server.py`
- `tests/tools/test_voice_cli_integration.py`

---

## 1. Hermes 最核心的判断：不是所有“system 层内容”都该进入长期缓存前缀

很多人一谈到 system prompt，就会把它当成一个单一对象：

- 要么都属于 system prompt
- 要么都不属于

Hermes 的处理明显更细。

它实际上把 system 层内容分成了至少三类：

### 1.1 核心稳定前缀

这是 `_build_system_prompt()` 真正负责构建的那一层。

里面包括：

- agent identity
- tool guidance
- built-in memory frozen snapshot
- 静态平台提示
- 外部 memory provider 的 static block

这层的特点是：

- 尽量稳定
- 会被缓存
- 只在少数事件后重建

### 1.2 临时 system 叠加层

这就是 `ephemeral_system_prompt`。

它的特点是：

- 本轮执行时生效
- 叠加在 cached system prompt 之上
- 不进入长期轨迹语义

### 1.3 不该进 system 层的动态上下文

比如：

- plugin `pre_llm_call` context
- external memory recall
- voice mode 这种临时交互偏好

这些内容 Hermes 会尽量放到：

- user message augmentation

而不是 system 层。

这就是为什么 Hermes 看起来既“保留临时 system 通道”，
又“强力限制别人乱改 system prompt”。

因为它根本不是把所有动态内容混成一层。

---

## 2. `run_agent.py` 的构造方式说明：`ephemeral_system_prompt` 不是 `_build_system_prompt()` 的一部分

这一点非常关键。

看 `run_agent.py` 初始化参数的 docstring，
`ephemeral_system_prompt` 的定义写得很清楚：

- System prompt used during agent execution
- but NOT saved to trajectories

再看 `_build_system_prompt()` 附近的注释，
Hermes 又专门强调了一次：

- `ephemeral_system_prompt` is NOT included here
- it's injected at API-call time only

这两句话合在一起，已经把它和真正 cached system prompt 的边界讲透了：

- 它是 system 层内容
- 但它不属于那个被缓存、被持久看作“会话稳定前缀”的 system prompt 本体

也就是说，Hermes 并没有把 `ephemeral_system_prompt` 偷偷塞进核心 prompt builder。

它是在显式维护两层结构：

- `_cached_system_prompt`
- `ephemeral_system_prompt`

这很成熟。

因为很多项目会偷懒地直接：

- 把所有 system 内容拼成一个字符串

这样短期看简单，
长期就会越来越分不清：

- 哪些是内核固定层
- 哪些只是本轮临时叠加层

Hermes 没这么做。

---

## 3. 真正注入发生在 API-call-time：`effective_system = cached + ephemeral`

`run_agent.py` 里真正把这两层合起来的地方，写得很直白。

在准备 `api_messages` 时，Hermes 会做：

- `effective_system = active_system_prompt or ""`
- 如果 `self.ephemeral_system_prompt` 存在，就 append 上去

然后才把：

- `{"role": "system", "content": effective_system}`

插到本轮 API 请求里。

这里最值得注意的是两个词：

- `effective`
- `API-call-time`

这意味着 Hermes 对 `ephemeral_system_prompt` 的理解不是：

- 会话永久前提

而是：

- 本次请求真正生效的 system 组合结果

它更像一个运行时 overlay。

### 3.1 为什么要在这一层才合成

因为只有到这一层，Hermes 才知道当前这次调用的完整现场：

- cached system prompt 是什么
- 这次有没有临时系统要求
- 这次有没有 prefill
- 这次 user message 上附加了什么 context

也就是说，`ephemeral_system_prompt` 不该太早落盘，也不该太早固化，
它本来就是调用现场的一部分。

---

## 4. 这条通道为什么存在：Hermes 需要一个“受控的临时 system 入口”

如果 Hermes 已经这么强调稳定性，
那它为什么还要保留这条入口？

答案其实很简单：

- 有些 system 层要求确实是临时的，但又必须放在 system 层才合理

典型场景包括：

- API server 客户端传入的 `system` 消息
- OpenAI Responses 风格的 `instructions`
- gateway 侧拼出来的平台级临时上下文
- 某些上层运行器想在不修改核心 prompt builder 的前提下，临时覆盖行为

这些东西如果一律降级成 user-message augmentation，
有时语义就不对了。

因为它们本来就是：

- 针对这次调用的 system-level instruction

Hermes 需要支持这种需求，
但又不想让它们污染核心稳定前缀。

于是 `ephemeral_system_prompt` 就成了最合适的折中：

- 允许 system-level 临时叠加
- 但不让这层内容侵入长期构建层

---

## 5. `gateway/platforms/api_server.py` 说明：客户端传入的 `system` 和 `instructions`，在 Hermes 里都被降格成临时 overlay，而不是核心 system prompt

这一点非常值得学习。

看 `gateway/platforms/api_server.py`。

### 5.1 Chat Completions 里的 `system` 消息，不会直接进入历史，而是先抽成 `ephemeral_system_prompt`

在 `/v1/chat/completions` 的适配逻辑里，Hermes 会先遍历 `messages`：

- 把 `role == "system"` 的消息提取出来
- 多条 system message 会拼接
- user / assistant 才进入 `conversation_messages`

后面再把这段 system 内容作为：

- `ephemeral_system_prompt`

传给 `_run_agent(...)`。

这一步非常关键。

因为它说明 Hermes 对外部传入的 system message 的理解不是：

- 正式会话历史的一部分

而是：

- 这次调用的临时 system overlay

### 5.2 `/v1/responses` 里的 `instructions` 字段也是同一个去向

再看同文件另一段逻辑。

`instructions` 字段会被直接映射成：

- `ephemeral_system_prompt = instructions`

然后再传给 agent。

这说明 Hermes 在 API 兼容层上其实做了一个很统一的折叠：

- 外部世界叫 `system`
- 或叫 `instructions`
- 到 Hermes 运行时里，都会先落成同一种东西：
  - `ephemeral_system_prompt`

这一步非常工程化。

因为它让不同 API 风格的“临时 system 指令”统一收口到同一条通道。

### 5.3 测试也明确在验证这条映射

`tests/gateway/test_api_server.py` 里专门有测试检查：

- client 的 system message 会被传成 `ephemeral_system_prompt`
- `instructions` 字段会映射成 `ephemeral_system_prompt`
- 多条 system message 会被拼接后传入

这说明这不是 incidental behavior，
而是 Hermes 明确承诺的接口语义。

---

## 6. `gateway/run.py` 又补了一层边界：system messages 不进入 agent history，gateway 自己也只把临时 overlay 重新拼给 agent

如果只看 API server，可能还会觉得：

- 也许只是 HTTP 接口层这么做

但 `gateway/run.py` 会告诉你，这其实是 Hermes 在多入口 runtime 上的一致原则。

### 6.1 gateway 会组合平台上下文和 runner 自己的 ephemeral prompt

在 gateway 侧，Hermes 会做：

- `combined_ephemeral = context_prompt or ""`
- 再和 `self._ephemeral_system_prompt` 拼起来

然后把结果作为：

- `ephemeral_system_prompt=combined_ephemeral or None`

传给新建的 `AIAgent`。

这说明 gateway 自己也遵守同一条纪律：

- 运行器层临时上下文，走 ephemeral system overlay
- 不去改 agent 的核心 prompt builder

### 6.2 恢复历史时还会主动跳过 `system` 消息

再看 `gateway/run.py` 里处理 agent history 的代码，
有一句非常关键的注释：

- Skip system messages -- the agent rebuilds its own system prompt

这句话非常能说明 Hermes 的立场。

它等于直接说：

- system 不是 transcript history 的一部分
- agent 会自己重建核心 system prompt
- 外层传入的临时 system 只需要重新作为 overlay 传入，不需要混进历史

这和前面 API server 的映射逻辑完全闭环。

---

## 7. 为什么 Hermes 允许这条通道，却仍然严格限制它的使用范围

这里最容易误解的点是：

- 既然有 `ephemeral_system_prompt`，是不是以后什么动态东西都可以塞进来？

Hermes 的答案显然是否定的。

从源码和测试一起看，它对这条通道的态度其实非常克制。

### 7.1 它只留给“上层运行器明确要表达的临时 system 要求”

比如：

- API client 显式给的 system / instructions
- gateway 组合的平台上下文
- 运行器级的临时人格或风格提示

也就是说，它更像是：

- trusted runtime overlay

而不是：

- 所有动态内容的垃圾桶

### 7.2 插件、recall、voice-mode 这类上下文仍然被限制在别的层

这一点从周边测试也能看出来。

例如 `tests/tools/test_voice_cli_integration.py` 明确强调：

- voice mode 的提示不要改 system prompt
- 也不要改 `agent.ephemeral_system_prompt`

这里最值得记住的不是 voice mode 本身，而是 Hermes 的分工：

- 交互层临时提示，尽量走 user-side augmentation
- 只有确实属于 system 语义的 overlay，才走 `ephemeral_system_prompt`

至于这些层在一次 API 调用前怎么排队，不在这一篇重复展开，直接看附录 W。

### 7.3 它甚至会提醒用户：这东西不进 trajectory

初始化时如果 `ephemeral_system_prompt` 存在，Hermes 还会打印一条提示：

- `Ephemeral system prompt ... (not saved to trajectories)`

这一步其实很有味道。

它是在主动提醒开发者：

- 你现在用的是临时 system 层，不是正式持久层

这个提示本身就是边界教育。

---

## 8. 读到这里记住 4 点

### 8.1 system 层也可以有“稳定层”和“临时层”

不要把 system prompt 想成一整块不可分对象。

Hermes 的做法说明：

- 核心稳定前缀
- 临时 system overlay

可以分开建模。

### 8.2 临时 system 通道必须是受控白名单，而不是开放扩展口

`ephemeral_system_prompt` 之所以成立，
不是因为 Hermes 放松了边界，
而是因为它把这条边界收得更清楚：

- 只有内核和可信入口能用
- 插件和 recall 不能借道越权

### 8.3 外部接口传来的 system / instructions，最好先转换成内部统一语义

Hermes 把不同 API 风格的：

- system messages
- instructions

统一折叠成：

- `ephemeral_system_prompt`

这非常值得学。

因为它能让适配层和核心运行时之间保持一致语义。

### 8.4 “不持久化” 本身就是设计的一部分

有些东西不是“不小心没存”，
而是应该明确设计成：

- 只在这次调用生效
- 不进入轨迹
- 不进入长期历史

`ephemeral_system_prompt` 就是这种东西。

---

## 最后把边界收住

Hermes 保留 `ephemeral_system_prompt`，并不代表它放弃了对 system prompt 的治理。

恰恰相反，
这说明它把 system 层分得更细了：

- 核心稳定前缀由 `_build_system_prompt()` 负责
- 临时 system overlay 由 `ephemeral_system_prompt` 承担
- 插件 context、recall、voice-mode 这类动态内容仍被限制在其他层

所以这条通道真正解决的问题不是“让谁都能改 system prompt”，
而是：

- 给可信运行器保留一个受控、短生命周期、不持久化的 system 叠加入口

对学习 Agent 的人来说，这一点很重要。

因为很多系统做到后面会发现，
自己真正缺的不是“更多提示词能力”，  
而是：

- 哪些东西该长期稳定
- 哪些东西该临时叠加
- 哪些东西根本不该进 system 层

Hermes 在这里给出的答案很清楚：

- 可以有临时 system 通道
- 但它必须是受控的、短命的、边界明确的
