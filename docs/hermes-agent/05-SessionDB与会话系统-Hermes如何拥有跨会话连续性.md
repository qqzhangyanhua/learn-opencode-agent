# 05｜SessionDB 与会话系统：Hermes 如何拥有跨会话连续性

## 先把连续性这件事说透

很多 Agent 产品在单轮体验上已经做得不错。

它们会调工具，会生成计划，也能在一个上下文窗口里连续工作几十轮。
但只要你开始真正把它当成“长期使用的工作助手”，问题就会立刻暴露出来：

- 上一次聊到哪了？
- 之前那次调试到底做过什么？
- 为什么换个平台后像失忆了一样？
- 为什么有的系统一旦上下文压缩，历史就断层了？
- 为什么“搜索过去对话”常常只是个鸡肋功能？

如果这些问题解决不了，所谓 Agent 就仍然只是“当轮聪明”，而不是“持续可用”。

而在当前 hermes-agent 仓库的代码里，Hermes 恰恰把这件事做成了一套很完整的工程层：
不是简单保存聊天记录，而是围绕 SessionDB、Gateway SessionStore、历史恢复、压缩分叉、检索召回、CLI resume/branch 等能力，构成了一条“会话连续性链路”。

这一章我们就严格基于当前 hermes-agent 仓库的现有代码，拆开这条链路回答一个核心问题：

Hermes 为什么不只是“能保存历史”，而是开始具备了跨会话连续工作的基础设施？

这不是看一个文件就能明白的。
至少要同时看：

- hermes_state.py
- run_agent.py
- gateway/session.py
- gateway/run.py
- cli.py
- tools/session_search_tool.py

把这些拼起来，你才能看到 Hermes 的真实思路：

它把“会话”当成一个正式的一等状态对象，而不是顺手存一下对话文本。

---

## 1. Hermes 先解决的不是聊天记录，而是“可持续会话状态”

打开 hermes_state.py，文件头注释已经把定位说得很清楚：

- SQLite State Store for Hermes Agent
- persistent session storage with FTS5 full-text search
- stores session metadata, full message history, and model configuration
- for CLI and gateway sessions

也就是说，Hermes 这里做的不是一个“聊天导出文件”，而是一个会话状态库。

这点很关键。

因为很多系统一说“记住历史”，做法其实只是：

- 每轮把 user/assistant 消息 append 到 JSONL
- 下次重启时再把 JSONL 读回来
- 最多再做一点关键词搜索

这种方案能工作，但很快会碰到天花板：

- 元数据弱，无法很好管理 session 生命周期
- 跨入口恢复不自然
- 搜索能力差
- 会话压缩、分叉、恢复会越来越难
- 当系统开始支持 CLI、Gateway、多平台、多子代理时，历史很快变成一堆散文件

Hermes 显然不想停在这一步。

所以它在 hermes_state.py 里直接建立了 SessionDB，底层采用 SQLite，并在 schema 层明确区分：

- sessions 表：存会话级元信息
- messages 表：存消息明细
- messages_fts：存全文检索索引

这说明 Hermes 从一开始就把“历史”理解成结构化状态，而不是无结构日志。

---

## 2. SessionDB 的 schema 本身就在回答：Hermes 认为什么才叫“一个会话”

看 hermes_state.py 里的 SCHEMA_SQL。
当前 sessions 表字段包括：

- id
- source
- user_id
- model
- model_config
- system_prompt
- parent_session_id
- started_at
- ended_at
- end_reason
- message_count
- tool_call_count
- input_tokens / output_tokens
- cache_read_tokens / cache_write_tokens
- reasoning_tokens
- billing_provider / billing_base_url / billing_mode
- estimated_cost_usd / actual_cost_usd
- cost_status / cost_source / pricing_version
- title

仅仅这一张表，就已经能看出 Hermes 对“session”理解得非常完整。

它不是只把 session 看成“这一串消息”。
它还认为一个会话至少应该包含：

### 2.1 来源

source 用来区分 cli、telegram、discord 等来源。

这意味着 Hermes 的会话不是某个单一入口的私有产物，而是整个系统的统一对象。
后面 list_sessions_rich()、search_messages()、Gateway 恢复逻辑，都会围绕 source 做过滤。

### 2.2 运行条件

model、model_config、system_prompt 都被持久化。

这说明 Hermes 不只是想记住“说了什么”，还想尽量记住“是在什么条件下说的”。
这是会话可追溯性的核心。

### 2.3 生命周期

started_at、ended_at、end_reason 这些字段表明：
Hermes 认为 session 是有开始、结束和结束原因的正式实体。

这和“永远 append 到一个文件里”完全不是一种系统观。

### 2.4 链式关系

parent_session_id 明确表示，一个 session 可能是另一个 session 的延续、压缩分支或分叉副本。

这点非常重要。
因为一旦系统支持 context compression、branch、subagent、resume 等操作，“一个 session 对应一条线性聊天记录”的假设就不够用了。
Hermes 提前把链路关系建进 schema，后面很多高级能力才站得住。

### 2.5 成本与规模

message_count、tool_call_count、token counts、cost metadata 这些字段说明：
Hermes 把 session 同时当成观测对象。

换句话说，session 不只是给模型恢复上下文，也是给系统自己做运营、调试、性能分析和成本核算用的。

这就是为什么说 Hermes 的 SessionDB 已经不是“聊天记录表”，而是运行时状态数据库。

---

## 3. messages 表和 FTS5 索引，决定了它不只是能存，还能找

继续看 hermes_state.py。
messages 表里存的字段包括：

- session_id
- role
- content
- tool_call_id
- tool_calls
- tool_name
- timestamp
- token_count
- finish_reason
- reasoning
- reasoning_details
- codex_reasoning_items

这里最值得重视的不是 content，而是 Hermes 没有把 message 简化成“谁说了什么”。

它连这些都一起存了下来：

- assistant 发出的 tool_calls
- tool 消息的 tool_name / tool_call_id
- reasoning 相关字段
- finish_reason

这意味着 Hermes 想保留的不是一份“展示给人看的对话稿”，而是尽量完整的推理-调用-结果轨迹。

这会直接带来两个价值：

### 3.1 会话恢复更像“继续工作”而不是“只看聊天文本”

当 CLI 或 Gateway 恢复 conversation history 时，如果只恢复 user/assistant 文本，其实模型会丢掉很多工具调用上下文。

而 Hermes 的 get_messages_as_conversation() 会把：

- role / content
- tool_call_id
- tool_name
- tool_calls
- reasoning
- reasoning_details
- codex_reasoning_items

尽量重新装回 OpenAI conversation format。

也就是说，它恢复的是“模型理解得了的轨迹”，不是“给人看的 transcript 文本”。

### 3.2 搜索可以从消息级而不是文件级进行

FTS_SQL 里创建了 messages_fts 虚表，并通过 insert/delete/update trigger 与 messages 表同步。

这说明 Hermes 的搜索不是靠扫描 JSONL 文件，而是：

- 消息级索引
- 自动同步
- FTS5 查询

这对一个长时间使用的 Agent 系统来说非常关键。

因为一旦历史量大起来，如果没有消息级索引，session_search 就很难真正可用。

---

## 4. WAL + 应用层重试，说明 Hermes 已经按“多入口并发写”去设计会话库

很多人会忽略 hermes_state.py 里前 180 行那些看起来很底层的代码。
但这些其实非常能说明问题。

SessionDB 初始化时做了几件事：

- sqlite3.connect(..., check_same_thread=False, timeout=1.0, isolation_level=None)
- PRAGMA journal_mode=WAL
- PRAGMA foreign_keys=ON

同时，_execute_write() 不是直接写，而是：

- BEGIN IMMEDIATE
- 应用层重试
- 随机 jitter backoff
- 定期 PASSIVE checkpoint

文件注释写得很直白：
多个 hermes 进程共享同一个 state.db 时，WAL 写锁争用会导致明显卡顿；
SQLite 自带 busy handler 的确定性 sleep 容易造成 convoy effect；
因此 Hermes 采用短 timeout + 应用层随机抖动重试来打散竞争。

这段实现其实透露出一个很强的工程信号：

Hermes 的作者不是把 SessionDB 当成本地单线程玩具，而是明确按下面这种真实使用场景设计的：

- gateway 在跑
- CLI 也可能在跑
- worktree agent / 子进程也可能写入
- 多入口共用一个 state.db

也就是说，会话系统在 Hermes 里已经不是“顺手存点历史”，而是一个多生产者共享基础设施。

这也是它和很多 demo 级 Agent 最大的差别之一。

---

## 5. create_session / end_session / reopen_session：Hermes 把 session 生命周期显式建模了

在 hermes_state.py 中，SessionDB 至少提供了这几个关键方法：

- create_session()
- end_session()
- reopen_session()
- update_system_prompt()
- update_token_counts()
- ensure_session()

这几个方法组合起来，说明 Hermes 不是靠“有消息就算活着，没消息就算结束”这种隐式约定，而是显式维护生命周期。

### 5.1 create_session() 不是只有 ID，还会落 source / model / system_prompt / user_id / parent_session_id

这意味着新 session 从出生开始就具备可追溯上下文。

### 5.2 end_session() 明确写 ended_at 和 end_reason

于是 session 的结束不再是猜测，而是正式事件。
例如：

- new_session
- resumed_other
- branched
- compression

这些 end_reason 会让后续浏览、调试、分析更有语义。

### 5.3 reopen_session() 允许恢复已结束会话

这点尤其体现 Hermes 的会话观：
一个 session 可以结束，但不是“一旦结束永不再见”。
如果用户 /resume 某个旧会话，它可以被 reopen，再次变成活跃对象。

这和传统聊天 App 的概念不同，更像 IDE 里的工作线程：
你可以关闭、切换、恢复。

### 5.4 ensure_session() 是对真实世界故障的兜底

注释里明确说，它用于恢复 create_session() 因瞬时 SQLite lock 失败的情况。
INSERT OR IGNORE 使其在 session 已存在时安全无害。

这种设计看起来不起眼，但很工程化。
因为它承认：
真实系统里，初始化写入不一定永远成功；
不能因为建 session 那一下失败，后面整个历史都丢掉。

---

## 6. append_message() 的重点不只是写消息，而是把会话统计一起维护起来

SessionDB.append_message() 做了三件事：

- 把结构化字段先序列化为 JSON
- 写 messages 表
- 同时更新 sessions.message_count / tool_call_count

如果 tool_calls 存在，就按数量累加 tool_call_count；
否则只增加 message_count。

这说明 Hermes 的 message 写入不是纯日志式 append，而是“消息写入 + 会话指标同步”。

这会带来一个直接好处：
后面 list_sessions_rich()、CLI recent sessions 展示、session_search 结果筛选，都不需要每次重新扫全表统计。

也就是说，SessionDB 不是单纯收集原始数据，还在为“浏览和管理会话”准备聚合视图的基础。

这也是为什么 sessions 表里那些 count 字段看起来很朴素，却很值钱。

---

## 7. get_messages_as_conversation() 是会话连续性的关键枢纽

如果要选一个最能体现 Hermes 会话系统价值的方法，我会选 hermes_state.py 里的 get_messages_as_conversation()。

它的作用不是把数据库里的消息“原样吐出来”，而是把消息恢复成模型下一轮还能继续吃的 conversation format。

它会：

- 读取 role / content / tool_call_id / tool_calls / tool_name
- 反序列化 tool_calls
- 对 assistant 消息恢复 reasoning / reasoning_details / codex_reasoning_items

源码注释里写得很清楚：
恢复 reasoning fields 是为了让会 replay reasoning 的 provider 在多轮对话中拿到 coherent multi-turn reasoning context。

这句话特别重要。

因为很多 Agent 系统会做一件很偷懒的事：
存的时候很复杂，恢复的时候只保留纯文本。

这样虽然“看起来恢复了历史”，但其实模型已经失去了很多结构信号。

Hermes 没这么做。
它试图把会话恢复到尽量接近运行时原貌的状态。

这意味着它真正追求的是：

不是“用户翻得到历史”，
而是“系统自己能在历史之上继续工作”。

这才是跨会话连续性的核心。

---

## 8. search_messages() 和 list_sessions_rich()：Hermes 不只会恢复，还会管理和检索

### 8.1 list_sessions_rich() 说明它想把 session 做成可浏览对象

hermes_state.py 里的 list_sessions_rich() 会返回：

- id
- source
- model
- title
- started_at
- ended_at
- message_count
- preview
- last_active

而 preview 不是单独冗余存表，而是通过 correlated subquery 从第一条 user message 截取出来。
last_active 也通过消息时间计算。

这说明 Hermes 对 session 的理解已经接近一个真正的“工作记录对象”：
你可以列出它、浏览它、看标题、看预览、看最后活跃时间。

CLI 里的 _list_recent_sessions() / _show_recent_sessions() 正是在消费这个 richer view。

### 8.2 search_messages() 则说明它把历史当成“可检索知识库”

search_messages() 会：

- 先用 _sanitize_fts5_query() 清洗用户输入
- 支持简单关键词、短语、布尔查询、前缀匹配
- 可按 source_filter / exclude_sources / role_filter 过滤
- 返回 snippet
- 再为每个匹配项补充前后消息 context

这里最值得称赞的是 _sanitize_fts5_query()。
它专门处理：

- 不配对引号
- FTS5 特殊字符
- dangling boolean operators
- dotted / hyphenated term（如 chat-send、P2.2、my-app.config.ts）

这说明 Hermes 很清楚：
“让用户搜历史”不是把输入塞进 MATCH 就完了，FTS5 自身语法就足够把产品做坏。

所以它先把搜索输入做了工程级清洗，再把命中结果包装成对模型和用户都更容易消费的结构。

这就是一个成熟 recall 系统该做的事。

---

## 9. session_search_tool.py 让“过去的会话”从日志变成可调用记忆

如果说 search_messages() 是底层检索能力，那么 tools/session_search_tool.py 就是把它变成 Agent 可用的上层 recall 工具。

文件头注释已经把流程写清楚：

1. FTS5 找匹配消息
2. 按 session 分组，取 top N unique sessions
3. 加载对应 session 对话
4. 截断到大约 100k chars
5. 用便宜快速模型做 focused summarization
6. 返回按 session 组织的摘要

这意味着 Hermes 对跨会话连续性并不是只做了“数据库可搜”。
它还做了一个更符合 Agent 使用方式的桥接层：

把长历史先检索，再总结，再回注给当前模型。

这是非常关键的一步。

因为 session 历史通常很长，不能直接把原文全塞回主模型。
如果没有 summarization bridge，session_search 很容易变成：

- 要么太贵
- 要么太长
- 要么检索结果碎片化
- 要么主模型自己还得花很多 token 重新整理

Hermes 在这里采取的是典型的两级架构：

- SQLite + FTS5 负责高效找
- 辅助模型负责压缩回忆
- 主模型只接收整理后的 recall 结果

这就是为什么 session_search 在 Hermes 里不是“搜索功能”，而更像“长时记忆召回接口”。

同时，prompt_builder.py 里的 SESSION_SEARCH_GUIDANCE 还明确告诉模型：
当用户提到过去对话或疑似存在跨会话上下文时，要先用 session_search，再决定后续动作。

也就是说，Hermes 不是只提供工具，还把“何时应该回忆历史”写进了系统行为规范里。

---

## 10. run_agent.py 中的 _flush_messages_to_session_db()，解决的是“增量持久化而不重复写”

跨会话连续性不只取决于能不能恢复，还取决于你平时是不是可靠地把过程写下来了。

run_agent.py 里的 _flush_messages_to_session_db() 正是在解决这个问题。

它的注释非常明确：
使用 _last_flushed_db_idx 跟踪哪些消息已经写入过，从而防止重复写入 bug。

这里的关键动作包括：

- 若 create_session() 启动时失败，先用 ensure_session() 兜底
- 计算 conversation_history 长度和 _last_flushed_db_idx
- 只从真正未 flush 的位置开始写
- 对 assistant/tool 等消息保留 tool_calls、reasoning 等结构字段
- flush 完后更新 _last_flushed_db_idx

这说明 Hermes 很清楚一个现实问题：

在真实 agent loop 中，消息可能会从多个 exit path、异常路径、gateway 包装层被重复接触。
如果没有一个“已经落库到哪里”的游标，很容易出现：

- 一条消息重复写多次
- message_count 失真
- session_search 命中重复内容
- 恢复时历史膨胀

Hermes 用 _last_flushed_db_idx 把这个问题做成了明确状态机。

这是一个很典型但很值钱的 Agent 基础设施细节。
因为真正把系统从 demo 推向可长期使用，往往就靠这些“并不性感”的去重与增量持久化机制。

---

## 11. context compression 不是简单缩短上下文，而是“切分出新的 session lineage”

run_agent.py 第 6178 行附近有一段特别重要的逻辑。
当 context compression 发生时，Hermes 并不是继续在原 session 上硬写，而是：

- 读取 old_title
- end_session(old_session_id, "compression")
- 生成新的 session_id
- create_session(..., parent_session_id=old_session_id)
- 把压缩后新 system prompt 写入新 session
- 重置 _last_flushed_db_idx

这段逻辑非常值得重视。

因为很多 Agent 系统做上下文压缩时，会直接在当前会话里把旧消息丢掉，然后接着往下聊。
这样虽然省事，但会带来几个严重问题：

- 原始长历史和压缩后历史混在一起
- 无法解释“为什么这里之前的细节不见了”
- 搜索和恢复时很难理解断层
- 标题、统计、生命周期都变得含糊

Hermes 的处理方式更成熟：

压缩不是“偷偷删历史”，而是“产生一个新的 continuation session”。
并且通过 parent_session_id 把它和旧 session 连起来。

这说明在 Hermes 的世界里，压缩属于会话演化，而不是覆盖。

这对跨会话连续性特别重要。
因为一旦系统把 session lineage 建好，后续就能做很多高级能力：

- 连续编号标题
- lineage 浏览
- 排除当前 lineage 的 recent sessions
- 更合理的 recall 范围控制

也就是说，Hermes 不是把压缩当成上下文黑魔法，而是把它正式纳入 session lifecycle。

---

## 12. CLI 的 /resume 和 /branch，体现了“会话像工作线程一样可切换、可分叉”

看 cli.py。
这里非常清楚地实现了两种高级会话操作：

- /resume
- /branch

### 12.1 /resume：会话切换而不是简单打开历史

_handle_resume_command() 的流程是：

- 解析用户输入的 session_id_or_title
- 调 _resolve_session_by_name_or_id()
- 用 SessionDB.get_session() 取元数据
- end 当前 session，reason 为 resumed_other
- 切换 self.session_id
- get_messages_as_conversation() 恢复历史
- reopen_session(target_id)
- 同步 agent.session_id、reset_session_state()
- 把 _last_flushed_db_idx 设置为当前历史长度
- invalidate system prompt

这段实现很说明问题。

Hermes 的 /resume 不是“看旧记录”，而是真正把当前工作上下文切换到另一个 session 上。

它甚至还特意 reopen 目标 session，说明 resume 的语义就是：
把旧 session 重新激活。

也正因为 get_messages_as_conversation() 恢复的是模型可消费结构，所以 /resume 后不是只对人可见，而是 agent 自己也能继续干活。

### 12.2 /branch：复制历史并建立父子关系

_handle_branch_command() 则做了另一件很 Agent 化的事：

- 给新分支生成 session_id
- 结束旧 session，reason 为 branched
- create_session(new_session_id, parent_session_id=parent_session_id)
- 把 conversation_history 逐条 append 到新 session
- 为分支设置 title
- 切换到新 session

这就把“探索另一路方案”从口头概念变成了正式机制。

很多时候用户并不是要从零开新对话，而是想：

- 基于当前上下文试另一种解法
- 保留原路线
- 对比两种实现

/branch 恰恰就是支持这种工作流。

而 parent_session_id 在这里再次发挥作用：
会话不是孤岛，而是可以演化出树状关系。

---

## 13. CLI recent sessions 设计说明 Hermes 已经在做“可导航会话界面”

cli.py 里的 _list_recent_sessions() 和 _show_recent_sessions() 也很有意思。

它们不是简单打印 session_id，而是展示：

- title
- preview
- last active
- id

并提示用户：
Use /resume `<session id or title>` to continue where you left off.

这说明 Hermes 已经不把 session 当底层存储细节，而是在 CLI 交互层把它升级成用户可导航对象。

这和很多命令行 Agent 的差别在于：
后者常常只会维护一个当前对话缓冲区，重启就断，或者把“历史”交给外部文件自行管理。

Hermes 明显想把“会话管理”做成产品能力本身。

这也是为什么 list_sessions_rich() 那些 title/preview/last_active 字段并不鸡肋。
它们支撑的是“可恢复的工作台体验”。

---

## 14. Gateway SessionStore 不是重复造轮子，而是在 SQLite 之上补齐平台态映射和兼容层

如果只看 hermes_state.py，可能会以为 SessionDB 已经够了。
但 Gateway 侧还有一个 gateway/session.py 里的 SessionStore。

它的定位不是替代 SessionDB，而是补上一层平台会话管理：

- 维护 session_key -> SessionEntry 映射
- 按 platform / chat_type / user 分组策略生成 session key
- 处理 session reset policy
- 兼容 legacy JSONL transcript
- 在 SQLite 不可用时可 fallback

SessionStore.__init__() 的注释写得很清楚：
Uses SQLite (via SessionDB) for session metadata and message transcripts.
Falls back to legacy JSONL files if SQLite is unavailable.

这说明 Hermes 的 Gateway 层做的是“业务态会话编排”，而不是重新发明数据库。

为什么需要这一层？

因为 gateway 世界里，真正要管理的不只是 session_id，还有：

- 这条消息来自哪个平台
- 是私聊还是群聊
- 是否 per-user group session
- 是否 thread-scoped
- 什么时候该因 idle/daily policy 自动 reset

这些问题本质上属于平台态，不是纯 SQLite schema 能独立解决的。

所以 Hermes 做了一个非常合理的分层：

- SessionDB：统一持久化与检索底座
- SessionStore：Gateway 的平台映射与生命周期编排层

这就是好架构的味道。

---

## 15. Gateway 为什么还保留 JSONL？因为 Hermes 在做平滑迁移，而不是一次性推翻

gateway/session.py 里有几个方法特别值得注意：

- get_transcript_path()
- append_to_transcript()
- rewrite_transcript()
- load_transcript()

从代码可以看出，Gateway 现在采用的是“双轨制”：

- 首选 SQLite
- 同时继续维护 legacy JSONL transcript

比如 append_to_transcript() 会写 JSONL；
rewrite_transcript() 在可能时重写 DB，也会覆盖 JSONL；
load_transcript() 则会：

- 先尝试从 SQLite 的 get_messages_as_conversation() 加载
- 再读取 legacy JSONL
- 最终优先返回消息数量更多的那个来源

这一段注释其实很精彩。
源码明确解释了一个真实迁移问题：

某些 session 在 SQLite 层引入前就已经存在；
如果后续某一轮只把“新消息”写进 SQLite，而旧历史仍只在 JSONL，中途恢复时若盲信 SQLite，就会只看到很少几条消息，导致上下文被悄悄截断。

因此 load_transcript() 会优先选择“消息更多的来源”，从而避免 silent truncation。

这说明 Hermes 的迁移策略很务实：

不是“既然有 SQLite 了，老 JSONL 全扔掉”；
而是承认历史兼容期会存在双源不一致，并通过更长来源优先策略保住连续性。

这非常工程化，也非常难得。

---

## 16. gateway/run.py 里对 transcript 的处理，说明 Hermes 很在意“谁已经写过、哪里还要补写”

看 gateway/run.py 第 3135 行附近。
这里在 agent 返回后，会判断 new_messages，并明确写道：

- agent 已通过 _flush_messages_to_session_db() 把消息持久化到 SQLite
- gateway 这里跳过 DB 写入，避免 duplicate-write bug
- 但仍继续写 JSONL，作为 backward compatibility 和 backup

然后 append_to_transcript(..., skip_db=agent_persisted)

这段逻辑和 run_agent.py 的 _last_flushed_db_idx 形成配合。

它说明 Hermes 不是简单地“每一层都顺手写一遍”，而是很认真地管理写入责任边界：

- Agent 内核负责 SQLite 主写入
- Gateway 外层负责 JSONL 兼容写入
- 并通过 skip_db / history_offset 等机制避免重复

对于跨会话连续性来说，这种写入边界管理很重要。
否则数据一旦重复或缺失，后面的 resume、search、session_search 全都会受影响。

Hermes 在这里明显已经吃过这类亏，所以代码里充满了明确的防重复和兼容注释。

这恰恰说明系统在往成熟方向走。

---

## 17. Session continuity 在 Hermes 里不是“只记文字”，而是会保留 system prompt 快照与成本轨迹

有些读者会觉得，session 系统最重要的不就是消息历史吗？
为什么 Hermes 还要存 system_prompt、token counts、cost status 这些？

原因其实很简单：

真正可持续的会话连续性，不是只让模型“想起说过什么”，还要让系统自己能回答：

- 当时是在什么 prompt 条件下运行的？
- 为什么这个 session 后面行为变化了？
- 压缩后是否生成了 continuation session？
- 这次 recall 的成本和规模如何？

尤其 system_prompt snapshot 这件事，非常关键。

因为 Hermes 的系统提示不是静态模板，而是由：

- identity
- persona / context files
- skills 索引
- memory snapshot
- platform context

拼装出来的。

如果 session 不把当时的 system_prompt 存下来，那么很多历史行为只能“猜”。
一旦用户问“上次为什么它那样回答”，系统就少了一个重要证据面。

所以 Hermes 存 system_prompt，不是浪费空间，而是在给会话可审计性留抓手。

---

## 18. parent_session_id 的价值，远不止 compression 和 branch

前面我们已经看到 parent_session_id 用在：

- compression continuation
- CLI branch

但它的价值其实更大。

比如 session_search_tool.py 里浏览 recent sessions 时，会尝试排除当前 session lineage；
cli recent sessions 默认也会排除 child sessions；
list_sessions_rich() 默认不含 children，除非 include_children=True。

这些行为背后都说明 Hermes 已经意识到一个问题：

如果把子会话、压缩续会话、分叉会话、委托会话全混在一个平面列表里，用户会话视图会迅速变得混乱。

因此 parent_session_id 不只是存个关系而已，它还是“整理会话视图”的关键索引。

也就是说，Hermes 的 session 设计已经从“能记录链路”进一步走向“能利用链路优化交互体验”。

这一步很重要。
因为很多系统即使底层记录了 parent/child，也没把它转化成上层产品能力。
Hermes 已经开始这么做了。

---

## 19. SessionDB + Memory 是互补关系，不是替代关系

这一章顺带要澄清一个常见误解：
会话系统强了，是不是就不需要 memory？

答案是否定的。

从当前 Hermes 代码看，二者职责划分非常清楚：

- MEMORY.md / USER.md：存稳定、精炼、值得长期注入 system prompt 的 durable facts
- SessionDB：存完整会话过程、消息轨迹、元数据、检索索引
- session_search：在需要时从 SessionDB 做 recall

prompt_builder.py 里的 MEMORY_GUIDANCE 也明确写着：
不要把 task progress、session outcomes、temporary TODO state 存进 memory；
这些应该交给 session_search 从 past transcripts 回忆。

这说明 Hermes 不是拿一个机制包打天下，而是：

- Memory 负责“长期稳定人格与用户认知”
- SessionDB 负责“历史工作记录与可检索上下文”

这正是一个成熟 Agent 应该有的分层。

如果没有 SessionDB，memory 很快会被迫装太多临时任务信息；
如果没有 memory，SessionDB 又会变成每次都要重新搜索的冷存档。

Hermes 的做法是两者协同。

---

## 20. 为什么说 Hermes 已经开始具备“跨会话连续工作”的基础设施

如果把这一章的关键点收束起来，你会发现 Hermes 的优势不在某一个孤立功能，而在于它把连续性做成了一条完整链路：

1. SessionDB 用结构化 schema 定义 session，而不是只存聊天文本
2. messages + FTS5 让历史可以被消息级检索
3. get_messages_as_conversation() 让历史可恢复为模型可继续工作的轨迹
4. _flush_messages_to_session_db() 解决增量持久化和重复写问题
5. compression 会生成新的 continuation session，而不是偷删历史
6. parent_session_id 把会话演化关系建成 lineage
7. CLI 提供 /resume 与 /branch，把 session 变成可切换、可分叉工作线程
8. Gateway SessionStore 把平台态会话编排接到统一持久化层上
9. JSONL fallback 与“双源择长”机制保证迁移期连续性不被悄悄破坏
10. session_search_tool 把长历史从冷存档变成 Agent 可调用 recall

把这些放在一起看，Hermes 已经不再是“当前轮很聪明”的那类 Agent。

它正在形成一种更像操作系统里的工作上下文管理能力：

- 会话能被创建、结束、恢复
- 会话能被压缩延续
- 会话能被分叉
- 会话能被搜索
- 会话能跨入口继续
- 会话还能被总结为 recall 重新送回当前任务

这就是“跨会话连续性”真正有价值的地方。

不是让用户觉得“它好像记得我”，
而是让系统真正有能力在时间维度上持续工作。

---

## 这一章的结论

如果只把 Hermes 看成一个会调用工具的对话 Agent，你会低估它。

因为在当前 hermes-agent 仓库的代码里，它已经明确把 session 做成了一套运行时基础设施：

- 底层有 SQLite + FTS5 的结构化状态库
- 中层有 Gateway SessionStore 做平台态映射与兼容
- 上层有 CLI 的 resume / branch / recent sessions
- recall 层有 session_search 把历史变成可消费摘要
- 生命周期层有 compression continuation、end/reopen、parent lineage

这套设计最重要的意义在于：
Hermes 不再把“对话历史”看成一串被动文本，而是看成 Agent 持续工作的上下文资产。

这也是为什么它比很多只会“开一轮、忘一轮”的 Agent 更接近真正可用的工程系统。

下一章如果继续往上走，一个自然的问题就是：
这些会话和能力，为什么能同时在 CLI 和 Gateway 两种世界里运转，而且还能保持尽量一致的体验？

那就要进入 Hermes 的多入口交互层了。
