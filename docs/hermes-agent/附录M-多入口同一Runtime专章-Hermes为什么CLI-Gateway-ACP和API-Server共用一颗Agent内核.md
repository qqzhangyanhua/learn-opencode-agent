# 附录 M｜多入口同一 Runtime 专章：Hermes 为什么 CLI、Gateway、ACP 和 API Server 共用一颗 Agent 内核

## 先把多入口共内核这件事看清

很多人第一次看 Hermes 这种工程化 Agent 项目时，都会先按入口去脑补架构：

- CLI 一套 Agent
- Gateway 一套 Agent
- ACP 一套 Agent
- API Server 再来一套 Agent

因为这些入口的 transport、协议和交互方式确实都不一样。

但 Hermes 的判断是，差异主要在入口壳，而不是思考内核：

- transport 可以不同
- session 注入方式可以不同
- 默认 toolset 可以不同
- 但真正负责“思考、调工具、维护对话状态”的 runtime 尽量还是同一个

这一篇附录就专门回答一个很关键的问题：

Hermes 为什么没有为 CLI、Gateway、ACP、API Server 各写一套 Agent，而是尽量把它们都收束到同一个 `AIAgent` 内核？

这一篇主要结合这些源码来看：

- `cli.py`
- `gateway/run.py`
- `gateway/platforms/api_server.py`
- `acp_adapter/session.py`
- `acp_adapter/entry.py`
- `acp_adapter/server.py`
- `hermes_cli/platforms.py`

---

## 1. Hermes 的关键判断：入口多样，不等于 runtime 应该分叉

先把这个问题想透。

一个 Agent 系统里，真正复杂、真正昂贵、也最容易漂移的，其实不是“收消息”这一步，而是下面这些运行时语义：

- system prompt 怎么构建
- tool definitions 怎么发现与过滤
- memory / session / skills 怎么接进来
- tool loop 怎么跑
- context compression 怎么做
- provider fallback 怎么切
- session state 怎么延续

如果为每个入口各写一套 runtime，最后维护的就不会是“一个 Agent 在多个入口运行”，而会变成“几套长得相似、但逐渐漂移的 Agent 分支”。

Hermes 刻意避免这件事。它把差异尽量压在入口层：

- transport 不同
- 平台 metadata 不同
- 默认 toolset 不同
- session/context 注入方式不同
- 回调和输出通道不同

但只要进入真正执行用户任务的阶段，核心仍然尽量回到同一个 `AIAgent`。多入口系统最容易失控的地方，不是入口不够多，而是每加一个入口就顺手长出一套新的 runtime 语义。

---

## 2. `cli.py` 说明了一件事：CLI 不是“另一种 Agent”，而是统一内核外面的一层终端外壳

看 `cli.py` 里创建主 Agent 的那段代码，你会看到最终还是：

- `self.agent = AIAgent(...)`

但 CLI 会在创建时注入很多终端相关的东西：

- `platform="cli"`
- `enabled_toolsets=self.enabled_toolsets`
- `session_db=self._session_db`
- `clarify_callback`
- `reasoning_callback`
- `thinking_callback`
- `tool_progress_callback`
- `stream_delta_callback`

这段实现的价值在于它把边界划得很清楚：

### 2.1 CLI 负责的是交互体验，不是重写 Agent 语义

CLI 需要处理很多终端特有的问题，比如：

- 用户怎么输入
- 输出怎么流式显示
- 工具进度怎么在终端里呈现
- clarify / thinking 这类中间态怎么反馈给人

这些都是真问题，但它们属于“交互层问题”，不是“Agent loop 应该另写一套”的理由。

### 2.2 CLI 差异通过参数和 callback 注入，而不是通过分叉 runtime 实现

Hermes 在这里没有写一个 `CLIAgent`，也没有复制 conversation loop、tool 解析和 memory 逻辑，而是把 CLI 的差异收敛成：

- `platform`
- `enabled_toolsets`
- 一组 callback
- 一组 provider/runtime 参数

这就是很典型的“同一个内核，不同的入口壳”。如果入口差异主要体现在输入输出和人机交互上，优先做 adapter 和 callback，不要急着复制一整套 Agent。

---

## 3. `gateway/run.py` 更能看出 Hermes 的架构克制：Gateway 负责消息适配和会话管理，不负责重写核心思考循环

Gateway 看起来比 CLI 复杂得多，因为它要面对：

- Telegram / Discord / Slack / WhatsApp 等不同平台
- 不同消息来源的 session 管理
- 不同平台的 metadata
- 自动 reset、resume、channel 绑定 skill、上下文注入

但即便这样，真正执行用户任务时，它依然回到：

- `agent = AIAgent(...)`

而且在主会话路径里，`gateway/run.py` 还会按 session cache 复用 Agent。只有缓存失效或配置变化时，才重新构造新的 `AIAgent`。

这说明 Gateway 真正做的是两类事：

### 3.1 入口层工作：把“消息来源”变成“可运行的上下文”

例如在 `gateway/run.py` 里，你能看到它先做：

- `build_session_context(...)`
- `build_session_context_prompt(...)`

如果 session 因为 idle / suspended / daily reset 被自动重置，它还会在注入 prompt 前额外补上一段系统说明，告诉 Agent 这是一个新的会话而不是历史续聊。

也就是说，Gateway 的职责是识别消息来源、绑定 session、补平台上下文和 auto-reset 说明。这些都是入口适配职责，不是重写 Agent loop 的理由。

### 3.2 运行时工作：仍然交回统一 `AIAgent`

到了真正执行阶段，Gateway 并不自己实现一套消息循环，而是把这些条件整理好后交给：

- `AIAgent.run_conversation(...)`

更有意思的是，Gateway 里的其他变体能力也沿用同一个类：

- 后台任务路径里也是 `AIAgent(...)`
- `/btw` 这种 side question 也还是 `AIAgent(...)`

区别只体现在配置：

- 有的会禁用工具
- 有的会 `skip_memory`
- 有的会 `persist_session=False`
- 有的会把 `session_db` 置空

也就是说，Hermes 连“正式对话”和“旁路问题”都优先复用同一个 runtime 内核，只是换一组运行参数。

这说明 Hermes 不希望“多一种执行场景，就多一种 Agent 实现”，而是尽量让场景差异进入参数层，把行为语义留在同一个核心循环里。

---

## 4. API Server 在 Hermes 里也不是独立 Agent，而是 Gateway 体系里的一个平台适配器

很多人看到 API Server，会下意识觉得这一定是另一套系统。

但 `gateway/platforms/api_server.py` 一开头就写得很清楚：

- 它是 OpenAI-compatible API server platform adapter

也就是说，在 Hermes 的理解里，API Server 首先不是“第二套 runtime”，而是“另一种平台入口”。

这意味着 HTTP 请求只是另一种消息输入，OpenAI Chat Completions / Responses 只是另一种协议外壳，API Server 仍然被纳入 gateway 的 platform 体系。

前面在 `gateway/run.py` 里也能看到：

- `Platform.API_SERVER` 会走 `gateway.platforms.api_server.APIServerAdapter`

这背后的工程判断很稳：不要因为 transport 从终端或 IM 变成 HTTP，就误以为需要重造一颗 Agent 内核。HTTP 只是 transport，真正应该复用的是：

- prompt builder
- tool/runtime discipline
- memory / session / compression 语义
- provider routing

这里最值得记住的一句是：协议差异不必然推出 runtime 差异。先问这是不同的输入通道，还是不同的 Agent 认知模型；Hermes 的答案明显偏向前者。

---

## 5. `acp_adapter/session.py` 和 `acp_adapter/entry.py` 说明：编辑器协议也是 transport 适配，不是另一套思考引擎

ACP 这一层特别值得看，因为它最容易让人误以为“这是编辑器版 Hermes，所以应该单独长一套 Agent”。

但 `acp_adapter/session.py` 里真正创建 session agent 时，仍然是：

- `agent = AIAgent(**kwargs)`

只是这里的参数换成了 ACP 语境：

- `platform="acp"`
- `enabled_toolsets=["hermes-acp"]`
- `quiet_mode=True`
- `session_id=session_id`

同时它还会通过 `resolve_runtime_provider(...)` 统一拿到：

- `provider`
- `api_mode`
- `base_url`
- `api_key`
- `command`
- `args`

这说明 ACP 和 CLI / Gateway 在 provider 解析上也尽量共用同一套运行时选择逻辑，而不是另外写一套“编辑器专用 provider 规则”。

### 5.1 ACP 真正特殊的，是 transport 约束

`acp_adapter/entry.py` 写得更直白：

- stdout 要保留给 ACP JSON-RPC
- 日志走 stderr

`acp_adapter/session.py` 也因此在创建 `AIAgent` 后，把：

- `agent._print_fn = _acp_stderr_print`

也就是说，ACP 的特殊性不在于 Agent 思考方式不同，  
而在于：

- 输出通道受协议约束
- 编辑器会话需要映射 cwd
- tool surface 默认应该更贴近 ACP 场景

这些仍然是“入口和协议层差异”，而不是“另起一套 Agent loop”的理由。

### 5.2 `acp_adapter/server.py` 还补了一层证据：即使 ACP 动态注册 MCP server，刷新的是同一个 agent 的 tool surface

在 `acp_adapter/server.py` 里，ACP 会话如果收到 MCP servers 配置，会调用：

- `register_mcp_servers(...)`

随后它不是新造一类 Agent，而是直接对当前 `state.agent` 做：

- 读取 `enabled_toolsets`
- 重新 `get_tool_definitions(...)`
- 刷新 `state.agent.tools`
- 必要时 `_invalidate_system_prompt()`

这一段非常关键。

因为它说明 Hermes 连“ACP 会话里动态长出新工具”这种事，  
都优先理解成：

- 同一个 Agent 的工具表刷新

而不是：

- 切换到一个新的 ACP Runtime

这就是统一 runtime 架构真正的力量。

---

## 6. `hermes_cli/platforms.py` 把平台差异压成 metadata：不同平台主要通过 `platform` 和默认 `toolset` 进入 runtime

再看 `hermes_cli/platforms.py`，你会发现 Hermes 对平台的抽象其实很克制。

`PLATFORMS` 里每个平台核心就两件事：

- `label`
- `default_toolset`

例如：

- `cli` 对应 `hermes-cli`
- `api_server` 对应 `hermes-api-server`

这件事看起来小，但其实非常能说明问题。

Hermes 没把平台抽象成“不同 Agent 子类目录”，而是优先抽象成：

- 平台标识
- 默认能力包

于是平台差异进入 runtime 的方式就变得很清楚：

- `platform="cli"` / `"acp"` / `"telegram"` / `"api_server"`
- `enabled_toolsets=[...]`

这会直接影响：

- 默认暴露哪些工具
- system prompt 里应该带什么平台语境
- session / callback / UI 行为如何接线

但核心执行循环仍然不需要重写。

这套设计非常适合学习智能体的人参考。

因为它给了一个很实用的分层方式：

- 能力差异先放到 toolset
- 入口差异先放到 platform metadata
- 核心 loop 尽量保持唯一

---

## 7. 这样做带来的收益，不只是“代码少一点”，而是整个 Agent 工程更稳

Hermes 让多入口共用同一颗内核，收益远不只是少写几百行代码，主要体现在四个方面。

### 7.1 行为一致

只要底层还是同一个 `AIAgent`，很多核心语义天然就更一致：

- tool use 方式一致
- memory 行为一致
- prompt builder 行为一致
- context compression 语义一致

这会显著降低“这个入口能做、那个入口不会做”的漂移。

### 7.2 测试边界更清楚

如果每个入口都有一套 Agent runtime，你最终会很难判断：

- 这是入口层 bug
- 还是 Agent 内核 bug

统一 runtime 以后，很多测试可以明确拆成：

- runtime 测试
- adapter / transport 测试

这会让问题定位清楚很多。

### 7.3 新能力扩散更快

当你新增一个 runtime 级能力，比如：

- prompt builder 改进
- tool loop 改进
- memory / compression 策略改进

只要入口没有显式关闭，这些能力理论上都能同时惠及多个入口。

这就是“共享内核”真正的复利。

### 7.4 入口层可以专注于自己真正该做的事

CLI 专注：

- 终端体验
- streaming
- callback 呈现

Gateway 专注：

- adapter 生命周期
- 会话管理
- 上下文注入

ACP 专注：

- JSON-RPC 协议
- stdout / stderr 边界
- 编辑器工作目录映射

API Server 专注：

- HTTP 接口与 OpenAI 兼容协议

这样每层都更像自己该做的那部分，而不是把 runtime 逻辑到处复制一遍。

---

## 8. 读完这一篇记住 4 点

看完这一章，我认为最值得记住的是下面四条。

### 8.1 先区分“入口差异”还是“认知差异”

不要一看到 CLI、HTTP、IM、Editor 就本能地写四个 Agent。

先问：

- 差异主要发生在 transport / UI / session 注入层
- 还是真的发生在核心推理与工具循环层

如果是前者，优先做适配器。

### 8.2 能用参数化解决的差异，不要急着用分叉 runtime 解决

Hermes 大量依赖这些变量来表达差异：

- `platform`
- `enabled_toolsets`
- callbacks
- runtime/provider 参数
- `skip_memory` / `persist_session` 之类开关

这说明很多场景差异，本质上是配置差异，不是架构分裂的理由。

### 8.3 把 adapter 层和 runtime 层拆开，系统才不容易失控

入口系统越多，越应该守住这条边界：

- adapter 负责接入世界
- runtime 负责让 Agent 真正运行

这条边界一旦混掉，后面每加一个入口，维护成本都会指数上升。

### 8.4 “共用内核”不是为了优雅，而是为了长期可维护

很多人把这种设计理解成工程洁癖，其实更像是一种长期生存策略：

- 能力统一
- 测试统一
- 演化统一
- 排障统一

这才是多入口 Agent 能持续长大的前提。

---

## 最后把多入口结构收一下

Hermes 在多入口问题上的做法，本质上是在坚持一件很朴素但很少人真正守住的事：

- 不把 transport 差异误判成 runtime 差异

所以你会看到：

- CLI 最终落到 `AIAgent`
- Gateway 真正执行时仍然落到 `AIAgent`
- ACP session 里还是 `AIAgent`
- API Server 也只是 gateway 体系里的一个 platform adapter

平台不同，协议不同，默认 toolset 不同，输出通道不同，  
但核心 Agent loop、prompt discipline、tool semantics、session runtime 尽量还是同一套。

对想做自己智能体系统的人来说，这一章可以浓缩成一句话：如果你希望一个 Agent 真的能跨终端、跨聊天平台、跨编辑器、跨 API 存活，那你最该保护的不是某个入口，而是那颗被所有入口共同调用的 runtime 内核。
