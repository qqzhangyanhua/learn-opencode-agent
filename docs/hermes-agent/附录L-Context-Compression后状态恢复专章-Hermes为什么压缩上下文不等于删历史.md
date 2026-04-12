# 附录 L｜Context Compression 后状态恢复专章：Hermes 为什么压缩上下文不等于删历史

## 先把压缩后的恢复边界说清楚

很多人第一次给 Agent 做上下文压缩时，思路通常很直接：

- 对历史消息做个摘要
- 把旧消息删掉
- 再继续聊

如果只是做一个很小的 Demo，这样表面上也能跑。

但真实系统里，context compression 从来不只是“压缩文本”这么简单。

因为一旦你真的把旧上下文丢掉，随之一起丢掉的往往不只是字数，还有很多运行时状态：

- 当前任务列表还在不在
- system prompt 要不要重建
- memory 有没有在压缩前先落盘
- session 数据库里的 lineage 要不要切一条新链
- gateway / CLI 后续持久化到底该写到旧 session 还是新 session
- 压缩后的 token 压力和 warning 状态要不要重算

Hermes 在这件事上的处理非常值得学习智能体的人认真看。

因为它并没有把压缩理解成一次简单的摘要替换，而是把它做成了一次受控的会话重构。

这一篇附录就专门回答一个问题：

Hermes 为什么说“压缩上下文”不等于“删掉历史”，而必须在压缩后专门做状态恢复和会话续接？

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `tools/todo_tool.py`
- `tests/run_agent/test_flush_memories_codex.py`
- `tests/run_agent/test_compression_persistence.py`
- `tests/run_agent/test_context_pressure.py`
- `tests/cli/test_compress_focus.py`
- `tests/gateway/test_session_hygiene.py`

---

## 1. Hermes 最重要的判断：context compression 不是字符串变短，而是运行时状态发生了一次切换

先看 `run_agent.py` 里的 `_compress_context(...)`。

这个函数的签名虽然看起来只是：

- 输入旧 `messages`
- 输出 `compressed_messages`
- 再带一个 `new_system_prompt`

但它真正做的事远不止这些。

从实现顺序就能看出来，这里面至少有五步：

- 压缩前先 flush memory
- 调 `context_compressor.compress(...)`
- 把 todo snapshot 补回去
- 重新 build system prompt
- 在 session DB 里结束旧 session、创建新 session、挂上 parent lineage

这说明 Hermes 对 context compression 的理解不是：

- “我把旧文本删一点”

而是：

- “我正在把当前会话从一条过长的上下文链，迁移成一条新的、更短但仍可工作的会话链”

这个判断非常关键。

因为一旦你承认 compression 是一次会话重构，  
你就会自然意识到：

压缩后的系统要想继续稳定工作，很多状态都必须被明确恢复。

---

## 2. 压缩前先 `flush_memories(...)`，说明 Hermes 不是先删历史，再赌模型不会忘

看 `_compress_context(...)` 的开头，Hermes 第一件事不是压缩，而是：

- `self.flush_memories(messages, min_turns=0)`

这一步非常值得学。

因为它说明 Hermes 很清楚：

上下文一旦被压缩，某些还没沉淀下来的高价值事实就可能永久丢失。

所以它选择在压缩前先给模型最后一次机会，把值得保留的内容写入 memory。

### 2.1 这不是附带动作，而是压缩流程的一部分

很多系统会把 memory flush 理解成一个独立功能。  
Hermes 这里的做法更成熟：

它把 flush 明确塞进 compression pipeline。

也就是说，在 Hermes 眼里：

- 压缩前的记忆沉淀
- 压缩后的上下文收缩

本来就是一套连贯动作。

### 2.2 tests 也在守这条链

`tests/run_agent/test_flush_memories_codex.py` 虽然主线在测 provider 路径和 fallback，  
但它其实也补强了一个事实：

- `flush_memories()` 不是装饰性逻辑
- 它真的会触发 memory tool call
- 而且执行完后会把 flush artifacts 从 messages 里剥掉

这说明 Hermes 不是“为了压缩，顺手发一个提示”，  
而是认真在压缩前做一次可执行的状态保全。

所以对学习智能体的人来说，这里的原则很重要：

如果 compression 会丢历史，就该先问一句：

- 有没有什么值得在删之前正式沉淀下来？

Hermes 的答案就是 memory flush。

---

## 3. 压缩后补回 `todo_snapshot`，说明 Hermes 保的是“还没做完的工作状态”，不是全量历史

继续看 `_compress_context(...)`，压缩完消息之后，Hermes 并没有直接结束，而是马上做了：

- `todo_snapshot = self._todo_store.format_for_injection()`
- 如果有内容，就 append 到 compressed messages

这一段特别有工程味。

因为它说明 Hermes 在 context compression 后，最在意的不是把所有历史都留住，  
而是把“当前还能继续工作的状态”留住。

### 3.1 `TodoStore.format_for_injection()` 本质上是在提炼 active state

看 `tools/todo_tool.py` 里的实现，你会发现这个方法不会把全部 todo 都注回去。

它只会保留：

- `pending`
- `in_progress`

也就是说：

- 已完成的
- 已取消的

不会继续注入。

这一步很值得学。

因为它说明 Hermes 并不是在做“todo 历史回放”，  
而是在做：

- 压缩后仍然影响后续行动的任务状态恢复

这是一种非常典型的 runtime thinking。

### 3.2 为什么不是靠历史摘要顺便保住 todo

很多初学者可能会想：

- 反正都做了摘要，todo 干嘛不让摘要顺手概括一下？

Hermes 没这么做，是因为这两类信息语义完全不同：

- 摘要是给模型理解过去发生过什么
- todo snapshot 是告诉模型现在还有哪些事情没做完

一个是历史叙述，一个是当前状态。

这两者混在一起，模型很容易重新做已完成工作，或者忘掉真正未完成的事项。

所以 Hermes 选择单独补回 active todo state。

这其实就是在告诉我们：

Compression 后最该恢复的，不是“信息最多”的东西，  
而是“对接下来最有行动约束力”的东西。

---

## 4. Hermes 会在压缩后重建 system prompt，因为压缩不是中途 patch，而是一次新的会话前缀建立

`_compress_context(...)` 里还有一个非常关键的动作：

- `self._invalidate_system_prompt()`
- `new_system_prompt = self._build_system_prompt(system_message)`
- `self._cached_system_prompt = new_system_prompt`

这一步说明 Hermes 的 system prompt 不是随消息历史自动漂移的，  
而是一次次明确构建出来的前缀。

所以 compression 后，既然会话结构已经变了，就必须显式重建一次。

### 4.1 为什么这里必须重建

因为 Hermes 的 system prompt 本来就带着很多会话级约束：

- frozen memory snapshot
- skills index
- context files
- 当前时间和平台提示

而在 compression 之后，当前会话已经不再是原来的那个原始消息链。

这时候如果继续沿用旧的 cached system prompt，  
就可能出现两类问题：

- prompt 和压缩后的消息态不再对应
- session DB 里记录的 system prompt 也会落后

所以 Hermes 选择：

- 压缩后不 patch 局部
- 而是直接重建一份新的稳定前缀

这和附录 B 里那条 Prompt Builder 流水线完全一致。

Hermes 的思路一直都很稳定：

- system prompt 要么稳定缓存
- 要么在重大上下文重构之后整体重建

而不是每轮都偷偷改一点。

---

## 5. SQLite session 会被切成新 session，并保留 `parent_session_id`，说明 Hermes 把 compression 当成会话续篇，而不是原地覆盖

这可能是 `_compress_context(...)` 里最值得学的一段。

在有 `self._session_db` 的情况下，Hermes 会：

- `end_session(self.session_id, "compression")`
- 记住 old session id
- 生成新的 `self.session_id`
- `create_session(..., parent_session_id=old_session_id)`
- `update_system_prompt(self.session_id, new_system_prompt)`

这一步非常成熟。

因为它说明 Hermes 不把 compression 理解成：

- 在原 session 里把历史静默改写掉

而是理解成：

- 结束一段过长的上下文链
- 开启一段压缩后的 continuation session

### 5.1 为什么这比原地覆盖更合理

因为 compression 本质上就是一种信息变换。

一旦你把旧会话原地覆盖成摘要版，你就会丢掉很多追踪能力：

- 这段摘要是从哪一段历史压出来的
- 旧 session 到哪里结束
- 新 session 从哪里开始
- 后续搜索或调试时，能不能看出压缩边界

Hermes 保留 `parent_session_id`，其实就是在保一条 lineage。

这使得系统以后还能知道：

- 当前 session 是上一段会话压缩后的续篇

这一步对学习智能体的人很有启发。

因为它提醒我们：

当 runtime 做了信息变形，不要假装什么都没发生。  
最好把这个变形过程也建模出来。

### 5.2 title 续号和 system prompt 更新，也说明这是“新续篇”不是“老记录”

`_compress_context(...)` 里还会：

- 给 continuation session 自动编号 title
- 给新 session 更新 system prompt

这进一步说明 Hermes 不是做一条数据库小补丁，  
而是在正式创建一段压缩后的新会话生命线。

---

## 6. 压缩后的持久化如果不跟着改，会直接丢数据，这就是为什么 Hermes 要连 `history_offset` 和 `_last_flushed_db_idx` 一起处理

这一层特别容易被忽视，但其实最能体现 Hermes 的工程成熟度。

### 6.1 `_last_flushed_db_idx = 0` 不是小细节，而是新 session 的写入游标重置

在 `_compress_context(...)` 里，Hermes 明确做了：

- `self._last_flushed_db_idx = 0`

这意味着：

- 新 session 从一条全新的消息写入游标开始

如果不这样做，后面的 flush 逻辑就可能继续沿用旧 session 的偏移量，  
结果把压缩后的消息全跳过去。

### 6.2 tests 已经把这个 bug 钉死了

`tests/run_agent/test_compression_persistence.py` 讲得非常清楚：

旧 bug 的链条是：

- 原来有 200 条 history
- 压缩后只剩 30 条
- 但 flush 还拿旧 history 长度去算 offset
- 最终 `messages[200:]` 为空
- 压缩后的上下文根本没写进新 session

这组测试非常值得看。

因为它说明 context compression 一旦做成真实系统能力，  
后续最容易坏掉的地方往往不是“摘要质量”，而是：

- 压缩后新旧 session 的持久化边界

也就是说，compression 的工程难点不只在 LLM，总有一半在状态对齐上。

### 6.3 gateway 侧也要知道“session 被切了”

同一个测试文件还验证了 gateway 侧的逻辑：

- 如果 `agent.session_id != original_session_id`
- 那 `history_offset` 必须变成 0

这说明 Hermes 很清楚：

一旦 compression 触发 session split，外层系统也必须知道“现在已经不是原来的那条消息流了”。

否则 gateway 还按旧 offset 写 transcript，一样会把压缩后的摘要和尾部上下文漏掉。

这一步很值得学习。

因为它再次说明：

Compression 不是 agent 内部私事，而是会影响整条 runtime persistence pipeline。

---

## 7. 压缩后 token 压力和 warning 状态也要重算，说明 Hermes 把 compression 当成一次新的运行起点

再看 `_compress_context(...)` 后半段，你会看到 Hermes 还会做这些事：

- 重新估算 `_compressed_est`
- 更新 `last_prompt_tokens`
- 更新 `last_completion_tokens`
- 视情况重置 `_context_pressure_warned_at`

这说明 Hermes 不是“压完就完”，  
而是把压缩后的结果当成新的 context baseline。

### 7.1 为什么 `_context_pressure_warned_at` 要重算

`tests/run_agent/test_context_pressure.py` 里专门验证了两种情况：

- 如果压缩后已经掉到安全线以下，warning flag 应该清零
- 如果压缩后仍然没有掉到足够低，就不该清零

这组测试特别有代表性。

因为它说明 Hermes 的 warning 不是装饰 UI，  
而是和当前会话真实压力状态绑定的运行时信号。

而一旦 compression 改变了上下文体积，这个信号当然也要跟着刷新。

### 7.2 repeated compression warning 也说明 Hermes 在认真面对“压缩不是免费操作”

`_compress_context(...)` 里还有一个判断：

- 如果 compression count >= 2
- 就提醒 accuracy may degrade

这也很成熟。

因为它说明 Hermes 不把 compression 神化成无损过程，  
而是明确告诉你：

- 一次压缩是为了续命
- 多次压缩会逐渐损耗质量

这也是为什么 Hermes 会建议在反复压缩后考虑 `/new`。

---

## 8. `/compress <focus>` 和 gateway hygiene 进一步说明 Hermes 压缩的是“接下来还重要的东西”，不是平均裁剪历史

Hermes 在 compression 上还有两个很值得学的补充设计。

### 8.1 `/compress <focus>` 说明压缩可以是有主题的

`tests/cli/test_compress_focus.py` 里可以看到：

- `/compress database schema`
- 会把 `focus_topic="database schema"` 传给 `_compress_context(...)`

这意味着 Hermes 的压缩不是纯 token 层面的机械裁剪，  
而是允许用户告诉系统：

- 接下来最重要的保留重点是什么

这很像真实工作里的“带着问题去做摘要”，而不是平均分配注意力。

### 8.2 gateway hygiene 说明压缩不是用户手动功能，而是 runtime 自愈机制

`tests/gateway/test_session_hygiene.py` 又补了一层：

- gateway 会在 transcript 过大时自动触发 compression
- threshold 用的就是模型 context length × compression threshold

这说明 Hermes 已经把 compression 从“用户偶尔手动点一下的功能”，  
升级成了运行时卫生系统的一部分。

也就是说，Hermes 不是等上下文炸了才求救，  
而是在系统层面主动做上下文维护。

---

## 9. 对学习智能体的人来说，这一层最值得记住的五个原则

看完 Hermes 这整套实现，可以提炼出几个非常通用的原则。

### 9.1 压缩前先做价值沉淀

会丢上下文之前，先把值得长期保留的事实 flush 到 memory。

### 9.2 压缩后补回 active state，而不是企图保全所有历史

Hermes 补的是 todo snapshot，而不是全量重播旧历史。

### 9.3 把 compression 视为新会话续篇，而不是原地改写

用新 session、parent lineage、new system prompt 去承接压缩后的 continuation。

### 9.4 压缩会影响整条 persistence pipeline

SQLite flush cursor、gateway history offset、session transcript 都必须一起改。

### 9.5 压缩后的运行状态必须重新计量

token 压力、warning tier、compression count 这些都不能沿用压缩前的判断。

---

## 最后把恢复逻辑收住

如果把这一篇压缩成一句话，那就是：

Hermes 的 context compression 从来不是“把旧消息缩短一点”，而是一次受控的会话续接与状态重建。

在 Hermes 里，压缩之后真正被恢复和重建的至少包括：

- 压缩前可沉淀的 memory
- 压缩后仍然有效的 todo state
- 新的 stable system prompt
- 带 `parent_session_id` 的 continuation session
- 重置后的持久化游标和 transcript offset
- 重新计算的 context pressure 状态

也正因为它把这些都做了，Hermes 才能把 compression 从一个“摘要技巧”做成真正可运行的 runtime 机制。

对学习智能体的人来说，这层非常值得抄。

因为它提醒我们：

真正成熟的上下文压缩，不是删历史，  
而是删掉不必要的文本后，还要把系统继续工作的状态严肃地补回来。
