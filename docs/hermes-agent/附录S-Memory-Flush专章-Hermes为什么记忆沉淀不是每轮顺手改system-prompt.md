# 附录 S｜Memory Flush 专章：Hermes 为什么记忆沉淀不是每轮顺手改 system prompt

## 先问记忆沉淀为什么不能顺手改 prompt

很多刚开始做 Agent 的人，一提到“记忆”就很容易把几件事混成一件：

- 模型这轮记住了什么
- 系统把什么写进了长期记忆
- 下轮 system prompt 里到底注入了什么
- 历史被压缩前有没有来得及提炼出值得保存的内容

于是最常见的做法就变成：

- 模型每轮顺手写一点记忆
- 写完立刻把记忆重新拼进 system prompt
- 历史要丢之前也不做单独提炼

这种做法小 Demo 勉强能跑，
但一旦系统开始追求：

- prompt 稳定
- prefix cache 命中
- 历史压缩前提炼
- 内建记忆和外部 memory provider 协同

你很快就会发现，这几件事根本不是同一个层次的问题。

Hermes 在这里的做法非常值得学。

它没有把“记忆”做成一个模糊能力，
而是明确拆成了三层：

- `memory` 工具：负责读写内建记忆存储
- `flush_memories()`：负责在会话边界额外给模型一次“临终整理”机会
- `memory provider`：负责外部长期记忆后端的 recall、sync、prefetch、hook

所以这一篇附录想回答的问题是：

Hermes 为什么不把记忆沉淀做成“每轮顺手改一下 system prompt”，而要单独做 `memory tool`、`memory flush` 和 `memory provider` 三层分工？

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `tools/memory_tool.py`
- `agent/memory_provider.py`
- `agent/memory_manager.py`
- `tests/run_agent/test_run_agent.py`
- `tests/run_agent/test_flush_memories_codex.py`

---

## 1. Hermes 最核心的判断：记忆写入、记忆注入、记忆提炼不是一回事

先看 `tools/memory_tool.py` 文件头。

里面直接把内建记忆讲得很清楚：

- `MEMORY.md` 是 agent 的个人笔记
- `USER.md` 是对用户的了解
- 它们会在 session start 时作为 frozen snapshot 注入 system prompt
- mid-session 写盘会立刻持久化，但不会修改当前 system prompt

这几句其实已经把 Hermes 的判断讲完了：

- 写入记忆，不等于立刻改当前 prompt
- 当前 prompt 里那份记忆，是一个冻结快照
- 实时写入和下一轮注入之间，故意存在边界

这一步特别重要。

因为很多初学者会默认：

- 记忆一旦写下去，下一次 API 调用就该马上看见

但 Hermes 不这么做。

原因很现实：

- 如果每次 memory 写入都重建 system prompt，prefix cache 就会不停失效
- 如果 prompt 前缀不停变化，整个会话成本和延迟都会抖动
- 如果历史压缩前没有单独提炼，很多值得保留的信息会跟着中间上下文一起被丢掉

所以 Hermes 不是把“记忆”看成一个点动作，
而是把它看成一条独立的运行时流水线。

---

## 2. `tools/memory_tool.py` 说明：内建 memory 的职责是稳定写盘，不是实时改 prompt

这一层最容易被误解。

很多人一看到 `memory` 工具，就会以为它的职责是：

- 模型调用一次
- 记忆立刻进入后续每一轮 system prompt

但 `tools/memory_tool.py` 明显不是这么设计的。

### 2.1 内建 memory 是 file-backed store，而且是有边界的 curated memory

文件头写得很清楚：

- `Persistent Curated Memory`
- file-backed
- bounded

这说明 Hermes 不想让 memory 变成无边界的聊天倾倒区。

它强调的是：

- 这是被挑选过、被约束过的长期记忆

而不是：

- 所有对话内容自动永久归档

### 2.2 frozen snapshot 是这层设计的关键

`MemoryStore` 的注释特别值得看。

它维护了两套并行状态：

- `_system_prompt_snapshot`
- `memory_entries / user_entries`

注释写得很明确：

- `_system_prompt_snapshot` 在 `load_from_disk()` 时冻结
- mid-session 不会改
- live state 会被工具调用修改，并立刻持久化到磁盘

后面的 `format_for_system_prompt()` 又把这个原则再说了一遍：

- 返回的是 load time 捕获的 frozen snapshot
- 不是 live state
- 这样才能保持 system prompt stable，保住 prefix cache

这一步是 Hermes 记忆设计里最工程化的地方之一。

因为它承认了一件很多 Demo 不愿承认的现实：

- “记忆是实时变化的” 和 “system prompt 要稳定” 这两个目标本来就冲突

Hermes 的解法不是假装这个冲突不存在，
而是直接把它拆开：

- live state 负责真实持久化
- frozen snapshot 负责当前 session 的 prompt 稳定

### 2.3 为什么写盘后不立刻改 system prompt

原因其实非常简单：

- 当前 session 里的主模型，往往就是刚刚写下这些记忆的那个模型

如果你在 mid-session 立刻把记忆重新拼进 system prompt，
本质上是在做一件收益不大、代价很高的事：

- 把模型刚刚自己写下来的东西，再塞回它的 prompt 前缀

这既浪费，
又会让前缀缓存失效。

Hermes 显然认为不值得。

---

## 3. `run_agent.py` 的 `flush_memories()` 说明：真正需要“临时提炼”的时机，是上下文即将丢失的时候

如果内建 `memory` 工具不负责“每轮总结一下该记什么”，
那 Hermes 靠什么避免重要信息在压缩或重置前丢掉？

答案就是：

- `flush_memories()`

这个函数在 `run_agent.py` 里非常值得初学者认真看。

它的 docstring 开头就写得很明确：

- Give the model one turn to persist memories before context is lost

这句话一下就把它和普通 `memory` tool 的区别讲明白了。

`flush_memories()` 不是日常记忆接口，
而是会话边界上的一次额外提炼动作。

### 3.1 触发时机不是每轮，而是边界事件

`flush_memories()` 的注释和调用点说明，它主要发生在这些时机：

- context compression 前
- session reset 前
- CLI exit 前

也就是说，Hermes 的思路不是：

- 每轮都逼模型复盘并写记忆

而是：

- 在上下文马上要被裁掉、会话马上要结束时，给模型一次专门整理机会

这非常合理。

因为真正容易丢的是：

- 即将被压缩掉的中段历史
- 即将被 session 边界切断的对话上下文

所以 flush 的职责很明确：

- 在丢失前做一次提炼

### 3.2 flush 不是偷偷改对话，而是显式插入一个临时 user message

`flush_memories()` 里会构造一条临时消息：

- `[System: The session is being compressed. Save anything worth remembering ...]`

然后把它作为一条 user message append 到 messages 里。

这一步很有意思。

Hermes 没有走“内部静默处理”的路子，
而是明确告诉模型：

- 现在进入的是一次 memory flush 场景
- 优先保存用户偏好、纠正、重复模式
- 少记任务细节

这等于把 flush 变成一次受约束的专门提问。

### 3.3 flush 只开放 `memory` 工具，不开放整套工具面

再看实现细节。

`flush_memories()` 会先从 `self.tools` 里只找出：

- `memory_tool_def`

然后用它单独发起一次调用。

这很关键。

因为 Hermes 明显不希望 flush 时模型又开始：

- 搜网页
- 读文件
- 跑终端
- 发起其他 side effects

flush 的目标很单纯：

- 只做记忆提炼和记忆写入

这是一个非常干净的边界。

### 3.4 flush 结束后，所有临时痕迹都会被剥离

`flush_memories()` 的 `finally` 里会把 flush 相关 artifacts 清掉：

- 通过 `_flush_sentinel` 回溯并删除

而 `tests/run_agent/test_run_agent.py` 里还有专门测试保证：

- `_flush_sentinel` 不会泄漏到实际 API messages 里

这一步特别值得学。

因为它说明 Hermes 很在意：

- flush 是运行时内部动作
- 它不是正式会话内容的一部分
- 它不应该污染用户看到的对话轨迹

---

## 4. `flush_memories()` 为什么优先走 auxiliary，而不是抢主模型的一次正式回合

这一点和前一篇附录 R 是连起来的。

`run_agent.py` 里的 `flush_memories()` 会优先：

- `from agent.auxiliary_client import call_llm`
- `call_llm(task="flush_memories", ...)`

源码旁边的注释也很直接：

- 用 auxiliary client 更便宜
- 还能避免 Codex Responses API 兼容问题

这说明 Hermes 对 flush 的判断非常清楚：

- 它虽然重要，但本质上仍然是 side-task

也就是说：

- flush 不是用户当前主问题的一部分
- 它更像是一段会话 housekeeping

把它放到 auxiliary pipeline 里，正合适。

### 4.1 测试文件明确把这件事当成正式约束

`tests/run_agent/test_flush_memories_codex.py` 很能说明 Hermes 的态度。

里面专门验证了几件事：

- flush 可用 auxiliary 时必须优先走 auxiliary
- flush 在没有 auxiliary 时，要按不同 `api_mode` 走对的 fallback
- Codex 模式下不能错误调用 `chat.completions`
- timeout 要从 `auxiliary.flush_memories.timeout` 读取，而不是硬编码
- flush 返回的 memory tool call 必须真正执行
- flush 结束后不能把临时 artifacts 留在 messages 里

这代表 Hermes 不是把 flush 当成一个“顺手补的小功能”，  
而是把它做成了一条有明确兼容策略的正式运行时路径。

### 4.2 这也说明“记忆提炼”不是主模型的日常职责

如果 Hermes 认为记忆提炼属于主模型主线，
它完全可以直接用当前 `self.client` 再来一次。

但它没有优先这样做。

这背后的思路很值得抄：

- 真正昂贵的主模型回合，应该留给当前用户任务
- flush 这种边界提炼动作，更适合交给专门的辅助链路

---

## 5. Hermes 不是只靠 flush，还用 turn-based nudge 和 background review 控制“什么时候值得记”

很多系统一说记忆，就只有两个极端：

- 要么每轮都写
- 要么完全靠模型自觉

Hermes 没有走这两个极端。

### 5.1 turn-based nudge：不是每轮都提醒，而是隔一段时间检查一次

看 `run_agent.py` 里和记忆相关的状态：

- `self._memory_nudge_interval`
- `self._memory_flush_min_turns`
- `self._turns_since_memory`

在 `run_conversation()` 开始处，会按用户回合累加：

- `_turns_since_memory += 1`

到达阈值才触发：

- `_should_review_memory = True`

这说明 Hermes 不想让记忆机制变成每轮打断主任务的噪音。

它更像是在做节奏控制：

- 对话过了几轮，再检查一次有没有值得沉淀的东西

### 5.2 background review：把“要不要记”也做成后台副流程

`_spawn_background_review(...)` 更能说明问题。

它会 fork 一个 review agent，
给它一段专门 prompt，让它判断：

- 有没有用户偏好、工作方式、行为期待值得写入 memory
- 如果没有，就什么都不做

这一步很成熟。

因为 Hermes 不是让主对话每次都停下来复盘记忆，
而是把这件事挪到后台。

这意味着：

- 主对话继续走主线
- 记忆沉淀在后台慢慢做

这和“每轮都顺手改 prompt”完全不是一个思路。

---

## 6. `memory provider` 和 `memory tool` 的边界也被 Hermes 切得很清楚

如果只看到 `memory_tool.py`，很容易误以为 Hermes 的记忆系统就只有：

- 写 `MEMORY.md`
- 写 `USER.md`

但 `agent/memory_provider.py` 和 `agent/memory_manager.py` 会告诉你，
Hermes 的记忆架构其实更分层。

### 6.1 `memory provider` 代表的是外部长期记忆后端

`agent/memory_provider.py` 文件头列出了 provider 生命周期：

- `initialize()`
- `system_prompt_block()`
- `prefetch(query)`
- `sync_turn(user, asst)`
- `get_tool_schemas()`
- `handle_tool_call()`
- `shutdown()`

还有一批 hook：

- `on_pre_compress(messages)`
- `on_memory_write(action, target, content)`
- `on_delegation(task, result, ...)`

这说明 external memory provider 关心的根本不是“替代 memory tool”，
而是：

- recall
- sync
- pre-compress extraction
- delegation observation

换句话说，它代表的是：

- 一个更广义的长期记忆后端

### 6.2 `MemoryManager` 负责把 built-in 和 external provider 编排起来

`agent/memory_manager.py` 的文件头也很直接：

- orchestrates the built-in memory provider plus at most ONE external plugin memory provider

这句话很关键。

因为它说明 Hermes 的态度不是：

- 有了外部 provider，就把内建 memory 废掉

而是：

- 内建 memory 永远存在
- 外部 provider 是 additive
- 但同时只允许一个 external provider，避免 schema 膨胀和后端冲突

这一步非常工程化。

### 6.3 built-in 写入和 external provider 之间有 bridge

看 `run_agent.py` 的 agent-level `memory` tool 执行逻辑。

当内建 `memory` 工具发生：

- `add`
- `replace`

时，Hermes 会调用：

- `self._memory_manager.on_memory_write(...)`

而 `MemoryManager.on_memory_write(...)` 又会：

- 跳过 builtin provider
- 把这次写入通知给 external providers

这说明 Hermes 明确区分了：

- built-in memory write 是一个事实
- external provider 要不要同步，是另一层事

这比“全都混在一个 store 里”清楚得多。

### 6.4 prefetch context 也不会去改 cached system prompt

`memory_manager.py` 里还有一个特别重要的函数：

- `build_memory_context_block(raw_context)`

它会把 provider recall 到的内容包成：

- `<memory-context> ... </memory-context>`

并明确标注：

- 这是 recalled memory context
- 不是新的 user input

这类 prefetched context 是 API-call time 注入，
不是直接改 cached system prompt。

这和 built-in memory 的 frozen snapshot 逻辑是同一路思路：

- 要动态注入的上下文，用临时块处理
- 要保持稳定的 prompt 前缀，不随便重建

---

## 7. 对学习智能体的人，这一层最值得记住的 4 条原则

### 7.1 “写入记忆” 不等于 “立刻改 prompt”

这是最关键的一条。

如果系统依赖 prefix cache 或 prompt 稳定，
那 live memory state 和当前 session 的 prompt snapshot 最好分开。

### 7.2 真正需要专门提炼的时刻，是上下文即将丢失的时候

不要每轮都让模型复盘。

更成熟的做法是像 Hermes 一样，在：

- compression 前
- reset 前
- session end 前

做一次专门的 `flush_memories()`。

### 7.3 memory tool、memory flush、memory provider 必须分层

它们分别回答的是三个不同问题：

- 记忆怎么写
- 什么时候临时提炼
- 外部长期记忆后端怎么协同

把这三层混成一层，系统很快就会乱。

### 7.4 动态 recall 最好走临时注入块，不要频繁改 system prompt

需要实时变化的上下文，
比如 provider 的 recall 结果，
更适合在 API call 时临时注入。

这样才能同时兼顾：

- 动态性
- 边界清晰
- prompt cache 稳定

---

## 最后把 flush 边界收一下

Hermes 对“记忆”这件事的处理，很像一个成熟运行时在做职责切分：

- `memory tool` 负责稳定、受控地写入内建长期记忆
- `flush_memories()` 负责在上下文即将丢失时做一次专项提炼
- `memory provider` 负责 recall、sync、prefetch 和外部后端协同

而真正贯穿这三层的总原则只有一句：

- 不要为了追求“实时记忆”，把当前 session 的 system prompt 搞得不停变化

对学习 Agent 的人来说，这一点非常重要。

因为很多系统最后不是“不会记”，  
而是：

- 记忆写入、记忆注入、记忆提炼混在一起
- 结果 prompt 不稳定、上下文边界混乱、记忆后端也越来越难维护

Hermes 在这里给出的答案很克制：

- 把记忆当成一条流水线，而不是一个魔法能力
- 把会话内稳定性放在第一位
- 把真正需要额外提炼的时刻，留给专门的 flush 流程
