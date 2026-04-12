# 06｜CLI 与 Gateway：为什么一个好 Agent 不能只活在终端里

## 先把入口和运行面分开

很多人第一次做 Agent，入口通常只有一个：

终端。

这当然很合理。因为 CLI 最容易搭，调试成本最低，也最适合开发者先把核心循环跑通。

但如果一个 Agent 最终只能活在终端里，它很快就会碰到两个现实问题：

- 你只有坐在那台机器前面时才能用它
- 它很难真正进入你日常工作的消息流和任务流

所以当系统开始认真走向“长期可用”时，接入层就会从“一个输入框”变成“多个统一入口”。

而在当前 hermes-agent 仓库的代码里，Hermes 已经非常明确地把这件事做成了一层正式架构：

- `cli.py` 负责本地终端入口
- `gateway/run.py` 负责消息平台总入口
- `gateway/session.py` 负责把来自不同平台的消息统一变成可恢复、可注入上下文的 session
- `tools/send_message_tool.py` 负责把 Agent 的输出反过来发回别的平台

所以这一章要回答的核心问题是：

Hermes 为什么不把自己限制在一个终端里，而是专门做出 CLI + Gateway 这两条接入链路？这背后到底解决了什么工程问题？

---

## 1. CLI 当然重要，但它只是 Hermes 的一个入口，不是系统本体

很多初学者会不自觉把 CLI 当成整个 Agent。

因为你平时最容易看到的就是：

- 运行 `python cli.py`
- 输入一句话
- 看模型回复

如果再加上工具输出和 `/resume`、`/branch` 这些命令，CLI 看起来已经很完整了。

但 Hermes 的结构恰恰在提醒你一件事：

CLI 很重要，但它只是入口层，不是系统本体。

从仓库结构也能看出来这一点：

- `run_agent.py` 才是核心循环
- `model_tools.py` 才是工具编排层
- `hermes_state.py` 才是会话持久化层
- `cli.py` 只是把这些能力组织成终端交互体验

这件事看起来像废话，其实非常关键。

因为如果你把 CLI 和 Agent 本体绑死，后面一旦想接 Telegram、Discord、Slack，就很容易重做一遍。

而 Hermes 的做法明显不是这样。

它把核心运行时放在 CLI 之外，于是：

- CLI 可以调用同一个 AIAgent
- Gateway 也可以调用同一个 AIAgent
- 同一套工具系统和会话系统可以在不同入口复用

这就是接入层与运行时分离的价值。

---

## 2. Gateway 的出现，说明 Hermes 已经把“消息平台”当成一等运行环境

打开 `gateway/run.py`，文件头的注释写得非常直接：

- 这是 messaging platform integrations 的入口
- 提供 `start_gateway()`
- `GatewayRunner` 管理整个 gateway 生命周期

这不是一个临时 webhook 脚本，而是正式的接入总线。

更重要的是，这个文件一开头做的事情就很说明问题：

- 自动确保 SSL 证书可用
- 先加载 `HERMES_HOME` 作用域下的 `.env`
- 再把 `config.yaml` 中的配置桥接进环境变量
- 对 `terminal`、`auxiliary`、`agent`、`display`、`timezone`、`security` 等配置做统一转换
- 设置 `HERMES_EXEC_ASK=1`，让消息平台上的危险命令走审批链路

这一连串动作说明什么？

说明 Gateway 在 Hermes 里不是“把消息收上来再丢给模型”那么简单。

它其实是在做一件更底层的事：

把消息平台上的一次对话，变成一个完整、可控、带平台语境的 Agent 运行环境。

这和很多简化实现差别很大。

很多 Bot 系统只做到：

1. 收到 Telegram 消息
2. 把文本发给模型
3. 把回复发回去

而 Hermes 的 Gateway 明显在做更多事：

- 平台配置治理
- 会话上下文注入
- 平台差异适配
- 进程生命周期管理
- 危险操作审批
- 后台任务与 cron 结果分发

这说明 Hermes 不是在接“聊天渠道”，而是在接“运行渠道”。

---

## 3. `gateway/session.py` 最重要的价值，是把“消息来源”变成正式上下文

如果只看聊天表面，你会觉得用户无非就是发来一段文本。

但一旦接入多平台，你很快就会发现，文本之外的信息非常重要：

- 这条消息来自 Telegram 还是 Discord？
- 是私聊、群聊、频道还是线程？
- 来自哪个 chat_id？
- 当前用户是谁？
- 是否有 thread_id？
- 当前这个平台能不能安全隐藏用户 ID？
- 未来 cron 任务如果要自动发结果，应该发回哪里？

Hermes 在 `gateway/session.py` 里对这些问题做了非常清晰的建模。

这里有两个很关键的数据结构：

- `SessionSource`
- `SessionContext`

`SessionSource` 描述消息到底从哪里来，字段包括：

- `platform`
- `chat_id`
- `chat_name`
- `chat_type`
- `user_id`
- `user_name`
- `thread_id`
- `chat_topic`

`SessionContext` 则进一步把“当前来源”与“连接中的平台”“home channels”等信息绑在一起。

这意味着 Hermes 的 system prompt 里，模型看到的不是一段无来源文本，而是一个被结构化描述的消息环境。

更重要的是，`build_session_context_prompt()` 明确把这些上下文注入成系统提示的一部分。

它会告诉模型：

- 当前来源是什么
- 是 DM、group、channel 还是 thread
- 是否是多人共享线程
- 哪些平台是当前可连接的
- 在需要主动发送结果时，系统有哪些投递路径

这一步非常关键。

因为一旦 Agent 能跨平台行动，它就不能只理解“用户说了什么”，还必须理解“用户是从哪里说的”。

换句话说，Gateway 不只是 transport，还是语境注入器。

---

## 4. Hermes 不是简单支持“多平台”，而是试图统一多平台背后的 session 语义

初学者做多平台接入时，很容易陷入一个表面目标：

“支持 Telegram、Discord、Slack、WhatsApp。”

这当然是目标之一，但 Hermes 更深一层的目标，其实是：

让不同平台上的对话，尽量落入统一的 session 语义里。

这里的关键不是有多少适配器，而是 Hermes 把不同平台上的消息都统一进了 `gateway/session.py` 和 `hermes_state.py` 这一套会话框架。

也就是说，不同平台的差异并没有直接传到 AIAgent 核心循环里。

AIAgent 更关心的是：

- 当前 session_id 是什么
- 当前 system prompt 里平台上下文是什么
- 当前历史消息是什么
- 当前工具集和回调能力是什么

平台差异主要留在 Gateway 适配层和会话上下文层消化。

这就是一个成熟接入层该做的事：

不要把平台复杂性直接泄漏给核心循环。

否则随着平台越来越多，核心运行时会迅速变脏。

Hermes 的目录分层能明显看出它在努力守住这条边界。

---

## 5. `send_message_tool.py` 说明 Hermes 不只是在“被动接收”，而是在构建跨平台行动面

如果 Gateway 只负责接收消息，那 Hermes 仍然只是一个“多入口聊天系统”。

但 `tools/send_message_tool.py` 的存在说明，它在往前走一步：

让 Agent 具备跨平台主动输出的能力。

这个工具的文件头写得很直接：

- cross-channel messaging
- 支持 Telegram、Discord、Slack 等平台
- 既可 list 目标，也可直接 send

更关键的是，schema 里专门提醒模型：

- 如果用户指定了具体频道或人，先 `list`
- 如果用户只说“发到 telegram”，可以直接发 home channel

这其实已经不是单纯工具调用，而是一种跨平台行动纪律。

往下看实现，你会发现它解决了很多现实细节：

- 目标格式支持 `platform`、`platform:chat_id`、`platform:chat_id:thread_id`
- 支持先把人类友好的频道名解析成真实 ID
- 平台没有 home channel 时会报清晰错误
- 发送成功后还会尝试 mirror 到目标 session
- 错误文本会通过 `_sanitize_error_text()` 做敏感信息脱敏

这说明 Hermes 对“跨平台发消息”的理解不是一个临时能力，而是完整行动链的一部分。

只要这条链路打通，Agent 就不再只是“坐在一个窗口里等你问它”。

它开始具备把结果送到真正工作现场的能力。

这件事对 Agent 的产品化非常关键。

因为用户真正需要的，常常不是“我能在终端里问到它”，而是“它能不能把结果送回我实际工作的地方”。

---

## 6. Gateway 之所以重要，还因为它让 cron、后台任务、审批这些能力真正落地

如果 Hermes 只有 CLI，很多能力会变得很尴尬。

比如：

- cron 任务到点之后，结果发给谁？
- 后台进程跑完之后，通知到哪里？
- 危险命令审批，谁来点通过或拒绝？
- 线程型讨论里，结果应该回哪个 thread？

这些问题，在纯 CLI 里当然也能勉强处理，但都不够自然。

而 Gateway 的存在，让这些能力突然有了真实落点。

例如在 `gateway/run.py` 里，你能看到它不仅负责接平台，还负责：

- delivery routing
- background process notifications
- approval 回调桥接
- session key / 平台环境注入

这意味着 Hermes 的很多“长期行为”能力，其实是以 Gateway 为真正落地面的。

从这个角度讲，CLI 更像开发台，而 Gateway 更像运行现场。

这也是为什么我会说：

一个好 Agent 不能只活在终端里。

不是因为终端不好，而是因为一旦系统要长期工作、跨时运行、跨渠道行动，它就必须进入消息基础设施。

---

## 7. 对初学者来说，这一层最值得学的不是“支持很多平台”，而是“接入层和核心运行时怎么解耦”

看到这里，初学者最容易学偏的点是：

“原来我要做很多平台适配器。”

其实不是。

这一章更值得你学的，是 Hermes 在架构上的两个判断：

### 7.1 接入层是接入层，Agent 核心循环是核心循环

CLI 和 Gateway 都只是入口。

它们要尽量复用同一个：

- AIAgent
- 工具系统
- 会话存储
- 安全约束

这样你新增入口时，才不会重写半个系统。

### 7.2 平台差异要尽量在边界被消化

不同平台当然不同：

- Telegram 有 topic
- Discord 有 thread 和 mention
- Slack 有 channel
- WhatsApp / Signal 有更严格的身份和隐私问题

但这些差异不应该直接污染你的核心推理循环。

Hermes 用 `SessionSource`、`SessionContext`、platform adapter、delivery router，把差异尽量留在边界层处理。

这就是非常值得抄的设计。

---

## 8. 最后把入口问题收一下

基于当前 hermes-agent 仓库的现有接入层代码，我认为 Hermes 的 CLI 与 Gateway 可以这样概括：

它并不是在维护两个彼此独立的交互壳，而是在同一个 Agent Runtime 之上，分别建立了本地终端入口和消息平台入口，并努力把平台差异收束在边界层。

这个判断主要来自以下源码事实：

- `cli.py` 说明 CLI 负责的是本地交互编排，而不是重写一套独立运行时
- `gateway/run.py` 说明 Gateway 已经承担配置桥接、生命周期管理、审批接入和平台调度职责
- `gateway/session.py` 通过 `SessionSource` 与 `SessionContext` 把消息来源正式建模，并注入 system prompt
- `tools/send_message_tool.py` 说明 Hermes 不只接收消息，还具备跨平台主动投递结果的行动面

如果只看表面，你会以为 Hermes 的 CLI 和 Gateway 只是两个不同入口。

但顺着源码往里看，你会发现它真正完成的是一次架构升级：

- 把 Agent 从“本地对话程序”提升成“多渠道运行系统”
- 把消息来源从普通输入，提升成可注入的结构化上下文
- 把跨平台发送结果，从附加能力，提升成正式行动面
- 把 cron、审批、后台通知等长期能力，找到了真实落点

所以这一章真正想让你记住的不是“Hermes 支持很多平台”，而是：

当你认真做 Agent 时，接入层不是 UI 细节，而是运行时边界的一部分。

所以，如果前面几章的关键词分别是执行闭环、能力治理、状态分层和会话连续性，那么这一章的关键词就是：多入口统一。

下一章我们继续看一个更有意思的话题：

为什么 Hermes 的 Skills 系统，会让它看起来比普通 Agent 更像一个“会成长”的系统。
