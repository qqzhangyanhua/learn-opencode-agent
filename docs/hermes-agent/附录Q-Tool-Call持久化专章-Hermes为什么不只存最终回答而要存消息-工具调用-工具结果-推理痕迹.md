# 附录 Q｜Tool Call 持久化专章：Hermes 为什么不只存最终回答，而要存消息、工具调用、工具结果、推理痕迹

## 先看为什么不能只存最终答案

很多人第一次给 Agent 做持久化时，会本能地只存用户消息和最终 assistant 回复。没有工具调用的小聊天 Demo 这么做还能跑，但对 Hermes 这种把 tool use 当成主干能力的 Agent 来说，这样做会立刻失真：你不知道调过哪些工具、并行结果怎么配对、恢复后的 session 还能不能继续沿着原来的协议链往下跑。

也正因为如此，Hermes 在会话账本里存的不是“聊天摘要”，而是一套接近运行时原貌的消息结构：

- `messages`
- `tool_calls`
- `tool_call_id`
- `tool_name`
- `reasoning`
- `reasoning_details`
- `codex_reasoning_items`

这一篇附录就专门回答一个问题：

Hermes 为什么不满足于只存最终回答，而要把工具调用轨迹、工具结果和推理痕迹都按会话消息的一部分正式持久化？

这一篇主要结合这些源码和测试文件来看：

- `hermes_state.py`
- `run_agent.py`
- `gateway/session.py`
- `gateway/run.py`
- `tests/gateway/test_session.py`
- `tests/gateway/test_transcript_offset.py`
- `tests/tools/test_delegate.py`

---

## 1. Hermes 最重要的判断：Agent 的一次有效回复，不只是“最终说了什么”，还包括“中间是怎么做到的”

先把问题想透。

在普通聊天系统里，最终回答往往就是主要产物。

但在 tool-using Agent 里，一次像样的回复通常至少包含三层信息：

- 用户问了什么
- 模型调了哪些工具、拿到了什么结果
- 模型基于这些结果得出了什么回答

如果你只存最后一句 assistant 文本，就相当于把中间最关键的运行时证据链全部扔掉了。

Hermes 明显不接受这种损失。

它在 `hermes_state.py` 的 `messages` 表里专门给消息层保留了这些字段：

- `tool_call_id`
- `tool_calls`
- `tool_name`
- `reasoning`
- `reasoning_details`
- `codex_reasoning_items`

这说明 Hermes 对“会话消息”的理解不是：

- 一段段纯文本对话

而是：

- 一个由文本、工具动作、工具结果、推理痕迹共同组成的运行时轨迹

这点特别重要。只要系统真的依赖工具，“最终回答”就只是表面产物，真正有价值的往往是它背后的调用链和状态链。

---

## 2. `hermes_state.py` 的 schema 已经把这件事写死了：消息不是纯文本行，而是结构化运行时事件

看 `hermes_state.py` 里的 `messages` 表定义：

- `role`
- `content`
- `tool_call_id`
- `tool_calls`
- `tool_name`
- `finish_reason`
- `reasoning`
- `reasoning_details`
- `codex_reasoning_items`

这张表一眼就能看出 Hermes 的立场：

- 它不是在做“聊天记录表”
- 它是在做“可重放的会话事件表”

### 2.1 为什么 `tool_calls` 和 `tool_call_id` 要进入消息层

因为在 OpenAI / Anthropic 风格的多轮 tool use 协议里，工具调用不是外部旁注，而是 assistant message 的正式组成部分。

例如：

- assistant 先发出一个含 `tool_calls` 的消息
- 后面再跟一个或多个 `tool` 角色消息
- 每个 `tool` 消息通过 `tool_call_id` 和前面的调用配对

如果你只把结果写成一句“我查了一下”，其实已经丢了协议级结构。

### 2.2 为什么 `reasoning` 也要进消息层

Hermes 不是只会调工具，它还显式支持带 reasoning 的模型。

所以 assistant message 在 Hermes 里，除了 `content` 外，还可能有：

- `reasoning`
- `reasoning_details`
- `codex_reasoning_items`

这说明 Hermes 从 schema 层就承认：

- assistant 消息不是只有展示给人的那段文本

而可能还带着后续多轮推理恢复需要的结构化痕迹。

---

## 3. `append_message(...)` 说明：Hermes 持久化的不是“一个字符串”，而是整条消息事件

再看 `hermes_state.py` 里的 `append_message(...)`。

这个函数会把：

- `tool_calls`
- `reasoning_details`
- `codex_reasoning_items`

先序列化成 JSON，然后连同：

- `role`
- `content`
- `tool_call_id`
- `tool_name`

一起落进库里。

这意味着 Hermes 根本不是在做：

- 把消息内容转成日志文本存一下

它做的是：

- 把一条运行时消息的结构完整落库

### 3.1 计数逻辑也说明 Hermes 很在意工具调用的“事件性”

`append_message(...)` 里还会根据 `tool_calls` 预先计算：

- `num_tool_calls`

然后更新：

- `message_count`
- `tool_call_count`

这一步特别有工程味。

因为它说明 Hermes 不只是想“以后能显示出来”，  
而是明确把工具调用当成会话统计和审计的一部分。

也就是说，在 Hermes 看来：

- tool use 不是 assistant 内容里的附属细节
- 而是会话运行的正式一等事件

---

## 4. `get_messages_as_conversation(...)` 更说明问题：这些结构不是为了归档，而是为了把会话重新喂回 Agent

如果 `tool_calls`、`tool_call_id`、`reasoning_details` 只是为了调试留个档，那其实没必要这么认真地恢复它们。

但 `hermes_state.py` 的 `get_messages_as_conversation(...)` 明显不是这么想的。

它在从数据库恢复消息时，会重新组装成 OpenAI conversation format，并且显式还原：

- `tool_call_id`
- `tool_name`
- `tool_calls`
- `reasoning`
- `reasoning_details`
- `codex_reasoning_items`

这说明 Hermes 存这些字段，不只是为了以后人类查日志，  
更是为了：

- 以后把这段会话重新作为 conversation history 喂给模型

### 4.1 为什么这件事很关键

因为在多轮 tool use Agent 里，下一轮模型并不是只需要看“上次最后怎么说”，  
它经常还需要知道：

- 上次 assistant 发过哪些 tool calls
- 对应工具回了什么
- 那轮 assistant 最终是基于哪些结果继续回答的

如果这些协议结构丢了，恢复出来的 history 就会从：

- 可继续运行的真实会话

退化成：

- 只适合人类阅读的聊天摘要

Hermes 显然更看重前者。

---

## 5. `run_agent.py` 里真正刷库时，也是在按“消息协议结构”写，而不是按“展示文本”写

再看 `run_agent.py` 的 `_flush_messages_to_session_db(...)`。

这里的持久化逻辑非常能说明 Hermes 的思路。

它对每条消息都会提取：

- `role`
- `content`
- `tool_name`
- `tool_calls`
- `tool_call_id`
- `finish_reason`
- `reasoning`
- `reasoning_details`
- `codex_reasoning_items`

然后再调用：

- `self._session_db.append_message(...)`

这说明 `AIAgent` 真正持久化的是自己内部仍然保持协议结构的消息，而不是渲染后的最终自然语言结果。

### 5.1 `_last_flushed_db_idx` 也说明 Hermes 不是按“这一轮输出文本”持久化

`_flush_messages_to_session_db(...)` 不是每轮简单覆盖，而是通过：

- `_last_flushed_db_idx`

只把新产生的结构化消息事件刷进去。

这再次说明 Hermes 心里真正的持久化单位是：

- message event stream

而不是：

- final answer snapshot

---

## 6. 为什么只存最终回答会直接破坏 `/resume`、`/retry`、`/undo` 这些真实能力

很多人会说“最终回答已经说明结果了，为什么还要保存这么多中间细节？”答案很简单：一旦你不存这些细节，很多看起来像“会话恢复”的能力其实都会失真。

### 6.1 `/resume` 恢复出来的就不再是原会话，而是残缺摘要

CLI 和 gateway 的 `/resume` 最终都会依赖：

- `get_messages_as_conversation(...)`

来恢复历史。

如果你库里只有 user / assistant 最终文本，没有 tool call 结构，那恢复出来的并不是：

- 原来那段真实可续跑的会话

而只是：

- 一个删掉了中间执行证据链的扁平版故事

### 6.2 `/retry`、`/undo`、重写 transcript 时更容易损坏语义

`gateway/session.py` 的 `rewrite_transcript(...)` 在重写数据库时，会专门把 assistant message 的：

- `reasoning`
- `reasoning_details`
- `codex_reasoning_items`

也一并写回去。

`tests/gateway/test_session.py` 还专门测了这点：

- 先写入带三种 reasoning 字段的 assistant message
- 再经过 `rewrite_transcript(...)`
- 重新读取后，这三种字段仍然必须存在

这说明 Hermes 明显在防一种非常真实的问题：

- 你以为只是“改写历史”
- 结果把后续运行仍然需要的结构化语义洗掉了

所以它才坚持在 transcript rewrite 时保住这些字段。

---

## 7. Gateway 的 `history_offset` 回归测试也在提醒你：一旦消息结构复杂化，就不能再按“文本行数”想问题

`tests/gateway/test_transcript_offset.py` 特别值得看。

这个回归测试守的是一个很典型的问题：

- raw transcript history 里有 `session_meta`
- agent 真正看到的 history 会先把 `session_meta` 和 `system` 过滤掉
- 如果 gateway 还用 `len(history)` 去切 `agent_messages`
- 就会把真实新消息切错

这组测试里最有代表性的案例是：

- history 里有 `session_meta`
- agent_messages 里保留了 `tool_calls` 和 `tool` 消息
- 如果按 raw history 长度切片，会把新的 user message 丢掉

这说明 Hermes 处理的根本不是“简单聊天记录”。

它处理的是一种带这些结构的消息流：

- `session_meta`
- assistant with `tool_calls`
- `tool` messages with `tool_call_id`
- 普通 assistant text

一旦消息长成这样，你就必须按协议结构来理解持久化和恢复，  
而不能退回“每轮两行对话”那种想法。

这也是为什么 Hermes 坚持保存 tool call 结构，而不是只保留最终文本。

---

## 8. `tool_call_id` 的价值，不只是“多存一个字段”，而是保证并行工具调用还能对得上结果

看 `tests/tools/test_delegate.py` 里关于 parallel tool calls 的测试。

那里有一个非常典型的场景：

- assistant 一次发出三个 tool calls
- 后面跟三个 `tool` 角色消息
- 每个结果靠 `tool_call_id` 配对回对应调用

测试明确要求：

- 三个工具结果都必须正确归到自己的调用上

这件事非常关键。

因为在真正的 Agent runtime 里，tool call 不一定总是串行单发。

只要存在：

- 并行工具调用
- 同名工具多次调用

你就不能再靠“第一个结果对应第一个调用”这种脆弱假设活着。

### 8.1 `tool_call_id` 是结果配对的唯一可靠锚点

如果你只存最终回答，或者只存工具名字，不存 `tool_call_id`，  
后面很多事情都会出问题：

- 回放时不知道哪个结果对应哪个调用
- 轨迹分析无法判断哪次调用失败了
- 并行同名调用无法正确归因

Hermes 保留 `tool_call_id`，本质上是在保住：

- 工具调用和工具结果之间的正式关联关系

这也是 tool-using Agent 能不能被可靠恢复与分析的关键。

---

## 9. Hermes 还把这些结构用于 trajectory / observability，而不只是会话恢复

再看 `run_agent.py` 里转换 trajectory 的逻辑。

当 assistant message 带 `tool_calls` 时，Hermes 会把：

- tool call
- 后续 tool response

一起整理进 trajectory 格式。

而 `tests/tools/test_delegate.py` 也说明，Hermes 会从这些结构里提取：

- `tool_trace`
- `status`
- `args_bytes`
- `result_bytes`

这说明消息层保存 tool call 结构，还有一个非常现实的收益：

- 后续可以做调试、审计、trace、训练样本、问题定位

如果你只存最终回答，这些能力基本都会直接消失。

所以对 Hermes 来说，这些字段不只是“为恢复服务”，  
也同时服务于：

- observability
- traceability
- trajectory export

---

## 10. 读完这一篇记住 5 点

看完这套设计，我认为最值得记住的是下面五条。

### 10.1 Tool-using Agent 的会话，不是纯文本聊天记录

真正的持久化单位应该是：

- 协议化消息事件

而不是：

- 最终展示给人的那段自然语言

### 10.2 只存最终回答，短期看省事，长期会直接破坏恢复、回放和调试

尤其是当系统开始有：

- `/resume`
- `/retry`
- `/undo`
- `session_search`
- trace / observability

这些能力时，丢掉中间结构基本等于把它们的地基拆掉。

### 10.3 `tool_call_id` 是工具结果配对的关键锚点

尤其在并行调用和同名多次调用场景里，  
没有 `tool_call_id`，很多轨迹都会变得不可还原。

### 10.4 reasoning 不是“可有可无的附注”，而是某些模型多轮连贯性的组成部分

Hermes 连 `reasoning_details` 和 `codex_reasoning_items` 都认真保住，  
说明它已经把这件事当成运行时正确性的一部分，而不是调试彩蛋。

### 10.5 持久化时应该优先保留协议结构，再在显示层做简化

展示给人的 recap 可以很简洁，  
但底层账本最好尽量接近真实运行结构。

这才是后续能力可扩展的前提。

---

## 最后把轨迹账本收一下

Hermes 在 Tool Call 持久化上的成熟，不在于它“多存了几个字段”，而在于它始终把会话理解成一条结构化运行轨迹，而不是一串最终回答。

所以它会认真保存：

- assistant 的 `tool_calls`
- tool result 的 `tool_call_id` 和 `tool_name`
- assistant 的 `reasoning`、`reasoning_details`、`codex_reasoning_items`

并且在恢复、重写 transcript、trajectory 导出、trace 分析时继续使用这些结构。

对想做自己智能体系统的人来说，这一章最大的启发可以浓缩成一句话：

如果你的 Agent 真会用工具，那“最终答案”只是表层结果。真正应该被认真持久化的，是让这个答案成立的消息协议链和执行证据链。
