# 04｜记忆系统：Hermes 为什么不是每次都失忆的 Agent

## 先问记忆为什么必要

很多 Agent 项目在演示时看起来都很聪明。

它们能调用工具，能规划步骤，能连续做几轮任务。

但只要你把时间拉长一点，很快就会发现一个尴尬问题：

它们大多只是“当前会话里还没忘”，并不是真的“有记忆”。

一旦重开会话，它就像第一次认识你；
一旦上下文被压缩，它就开始丢掉早先形成的判断；
一旦跨平台切换，很多系统甚至连“这个用户是谁”都接不上。

所以这一章我们不再讨论“模型能不能记住前几轮”，而是讨论一个更工程化的问题：

Hermes 到底是怎么把“记忆”做成系统能力，而不是单纯依赖上下文窗口？

这个问题，在当前 hermes-agent 仓库的代码里，不是一个文件能回答完的。

至少要同时看四个层面：

- tools/memory_tool.py
- hermes_state.py
- tools/session_search_tool.py
- run_agent.py 里记忆装配与 system prompt 注入逻辑

只有把这几块拼起来，你才会看明白：

Hermes 所谓“不是每次都失忆”，其实并不是靠一种单一记忆机制，而是把长期事实、用户画像、历史会话检索和会话级 system prompt 快照拆成了不同层，分别治理。

这恰恰是它做得比较成熟的地方。

---

## 1. Hermes 先把“记忆”拆成两类：长期事实 和记忆外的历史检索

先看 tools/memory_tool.py 开头注释。

这里对 memory 的定义非常清楚：

它提供的是 bounded、file-backed、persisted across sessions 的 curated memory。

并且明确只有两个 store：

- MEMORY.md：agent 自己的个人笔记、环境事实、约定、工具 quirks、项目知识
- USER.md：关于用户本人的信息，比如偏好、沟通方式、工作习惯、期待

这一步其实已经很关键了。

因为很多人谈 Agent memory 时，会把所有“过去发生过的东西”都混在一起叫记忆。

但 Hermes 没这么做。

它先做了一个工程上非常重要的拆分：

- 那些稳定、可复用、值得长期注入系统提示的事实，进入 MEMORY.md / USER.md
- 那些只是“过去做过什么”的会话历史，不进 memory，而是交给 session_search 去检索

这个边界在 memory_tool.py 和 prompt_builder.py 里都被反复强调。

比如 prompt_builder.py 的 MEMORY_GUIDANCE 直接写着：

- 要把 durable facts 存进 memory
- 不要把 task progress、session outcomes、temporary TODO state 存进 memory
- 这些应该靠 session_search 从 past transcripts 里回忆

这说明 Hermes 对“记忆”不是无限扩张，而是刻意做了收束。

换句话说，它并不是在做一个什么都往里塞的大桶，而是在做：

- 小而精的长期记忆
- 大而可检索的会话档案

这是后面所有设计成立的前提。

---

## 2. memory_tool.py 真正解决的是“长期可注入事实”而不是聊天记录存档

继续看 memory_tool.py，你会发现 Hermes 的 memory 设计目标和 SessionDB 完全不同。

它不是数据库式存储，也不是 embedding 检索，而是非常克制的文件型 curated memory。

文件注释里写得很明白：

- entry delimiter 是 §
- 限制按字符数，不按 token
- 单一 memory 工具，通过 action 参数管理 add / replace / remove
- behavioral guidance 放在 tool schema 里
- 采用 frozen snapshot pattern

这里最关键的是“frozen snapshot pattern”。

memory_tool.py 第 11 到 14 行就直接说明：

MEMORY.md 和 USER.md 会在 session start 时作为 frozen snapshot 注入 system prompt；
中途写盘会立刻持久化，但不会改变当前 session 的 system prompt；
真正刷新要等下一次 session start。

这件事非常值得仔细讲。

因为很多人一听到“持久记忆”，会本能觉得：

那一写进去，模型下一轮就应该立刻看到。

但 Hermes 刻意不这么做。

原因在 MemoryStore 的注释和 run_agent.py 的 system prompt 缓存逻辑里都能看出来：

它想保住 prefix cache，保持整个 session 的 system prompt 稳定。

也就是说，Hermes 在这里做了一个非常典型的工程取舍：

- 牺牲 mid-session 立刻生效
- 换取整场会话 system prompt 稳定、缓存命中更高、行为更一致

这不是“功能没做完”，而是有意识的设计。

所以 Hermes 的 memory 不是一个随写随改的动态人格区，而是一个“下个会话起生效”的稳定记忆层。

---

## 3. MemoryStore 的核心思想：既要持久化，也要避免把 system prompt 搞成活物

看 tools/memory_tool.py 里的 MemoryStore 类，注释写得很直白：

它同时维护两套平行状态：

- _system_prompt_snapshot：load_from_disk() 时冻结，专门给 system prompt 注入
- memory_entries / user_entries：运行中可变的 live state，由 tool calls 修改并持久化到磁盘

这其实就是 Hermes 对长期记忆最关键的结构设计。

因为如果你只保留 live state，不保留 frozen snapshot，那么一旦中途 memory_tool 被调用，system prompt 的语义基线就变了。

对于依赖 prompt caching 的模型来说，这会产生几个问题：

- prefix cache 命中下降
- 同一 session 前后行为基线不稳定
- 存档出来的 system prompt 和真实调用过程不一致
- 一些“本轮才写入”的信息会突然反向影响这一轮后续判断，增加不可预测性

Hermes 的办法就是：

让 live state 和 injected snapshot 分家。

于是当前会话里：

- 工具响应可以反映最新 live state
- 但系统提示仍然坚持使用会话开始时冻结的快照

这是一种很 Agent 工程化的处理方式。

它承认记忆在运行时会变化，但不让 system prompt 变成一块不停抖动的地板。

---

## 4. 为什么 MEMORY.md 和 USER.md 要分开？因为“知道世界”和“知道用户”不是一回事

MemoryStore 里最容易被忽略、但其实非常重要的一点，是 Hermes 不是把所有长期信息都写进一个文件。

它固定拆成：

- MEMORY.md
- USER.md

而且两者字符预算还不同：

- memory_char_limit 默认 2200
- user_char_limit 默认 1375

run_agent.py 初始化 AIAgent 时，会从 config 的 memory 配置里把这两个预算传给 MemoryStore。

为什么要这样拆？

因为在实际 Agent 使用里，至少存在两种完全不同的长期信息：

### 4.1 环境与约定类知识

比如：

- 某项目的目录结构
- 某用户机器上的稳定约定
- 某工具在这个环境里的特殊行为
- 某仓库里不能碰的文件

这类信息更像 agent 的“世界模型补丁”，所以放 MEMORY.md。

### 4.2 用户画像类知识

比如：

- 用户偏好什么输出风格
- 用户讨厌什么行为
- 用户经常要求文件保存到哪里
- 用户是写公众号还是做后端开发

这类信息更像对“人”的稳定认识，所以放 USER.md。

这个边界非常有价值。

因为如果把这两类信息混在一起，一方面会让注入内容越来越难维护，另一方面也不利于以后做更细粒度的开关。

而现在 run_agent.py 里就已经能看到这种分层：

- self._memory_enabled 控制 MEMORY.md
- self._user_profile_enabled 控制 USER.md

也就是说，Hermes 不只是逻辑上分开了，连注入开关也分开了。

这就是一个长期可维护系统该有的味道。

---

## 5. memory_tool.py 不是简单读写文件，而是把“安全、并发、边界控制”一起做了

如果只看外观，MemoryStore 像是个很朴素的文件存储类。

但细读代码会发现，它其实处理了不少容易被忽视的工程细节。

### 5.1 它会扫描记忆内容，防 prompt injection / exfiltration

memory_tool.py 开头专门定义了一组 _MEMORY_THREAT_PATTERNS。

会拦截的内容包括：

- ignore previous instructions 之类 prompt injection
- you are now... 之类角色劫持
- do not tell the user 之类欺骗性指令
- curl / wget 带 secrets 的 exfiltration 痕迹
- 读取 .env / credentials 一类秘密文件的语句
- authorized_keys、~/.ssh、`HERMES_HOME/.env`（默认是 `~/.hermes/.env`）等高风险 persistence / secret 路径

同时还检查一批 invisible unicode 字符。

只要命中，就拒绝写入 memory。

这点特别重要。

因为 MEMORY.md / USER.md 是会被注入 system prompt 的。

一旦这里允许任意内容落盘，memory 就会从“长期知识”变成“长期污染源”。

Hermes 显然意识到了这个风险，所以把 memory 当成高敏感输入层来防守，而不是普通文本文件。

### 5.2 它有并发写保护

MemoryStore 的 _file_lock() 用单独的 .lock 文件做 fcntl 排它锁。

而真正写文件时，又不是直接 open("w")，而是：

- 先写 temp file
- flush + fsync
- 最后 os.replace 原子替换

源码注释专门解释过：

旧实现如果直接用 open("w")，会在拿锁前先 truncate 文件，读者线程就可能瞬间读到空文件。

而 atomic rename 可以让读者永远只看到“旧完整文件”或“新完整文件”。

这件事说明 Hermes 对 memory 的理解不是“偶尔记一下就行”，而是把它当成跨 session、跨进程会被反复访问的正式状态文件。

### 5.3 它有容量预算，不允许无穷增长

add() / replace() 都会检查字符预算。

超过限制时不会硬写，而是明确返回：

- 当前使用量
- 新内容长度
- 为什么超限
- 提醒先 replace 或 remove

这说明 Hermes 的 memory 不是数据库，而是系统提示的一部分。

既然最终要注入 prompt，那它就必须被严格限流。

这个设计非常理性。

---

## 6. run_agent.py 里真正把 memory 变成“会话起点条件”

光有 memory_tool.py 还不够。

它只能说明“记忆能存”。
真正让记忆变成 Agent 行为前提的，是 run_agent.py 的 AIAgent 初始化过程。

看 run_agent.py 第 1021 行附近。

这里很清楚地做了几件事：

- 初始化 self._memory_store = None
- 初始化 self._memory_enabled = False
- 初始化 self._user_profile_enabled = False
- 如果 not skip_memory，则读取 agent config 里的 memory 配置
- 如果 memory_enabled 或 user_profile_enabled 为真，就实例化 MemoryStore
- 然后立即 self._memory_store.load_from_disk()

这说明 Hermes 的 built-in memory 不是在模型回答过程中临时去查的，而是在 agent 启动时就读进来，并冻结出一份本 session 使用的快照。

注意，这里还有一个很值得重视的参数：skip_memory。

也就是说，Hermes 从内核层面承认：

并不是每个 agent 实例都该带着长期记忆。

比如：

- 某些 flush agent
- 某些子 agent
- 某些专门的后台执行上下文

这些运行体可以显式跳过 memory。

这说明 Hermes 不是把“记忆”粗暴当成全局必开，而是把它视作一个可以按 agent 角色裁剪的层。

---

## 7. _build_system_prompt() 才是记忆真正进入智能体内核的地方

继续往下看 run_agent.py 第 2694 行之后的 _build_system_prompt()。

这里是本章必须看的核心代码之一。

源码注释直接列出了 system prompt 的装配顺序：

1. Agent identity
2. user / gateway system prompt
3. persistent memory (frozen snapshot)
4. skills guidance
5. context files
6. current date & time
7. platform hint

这里第三层就是 persistent memory。

具体实现也很清楚：

如果 self._memory_store 存在：

- 当 self._memory_enabled 为真时，注入 self._memory_store.format_for_system_prompt("memory")
- 当 self._user_profile_enabled 为真时，注入 self._memory_store.format_for_system_prompt("user")

而 format_for_system_prompt() 在 MemoryStore 里返回的是冻结快照，不是 live state。

这里你就能看出 Hermes 的完整闭环了：

- AIAgent 初始化时 load_from_disk()
- MemoryStore 捕获冻结快照
- _build_system_prompt() 把这份冻结快照注入 system prompt
- 当前 session 中途如果调用 memory 工具，只改 live state 和磁盘，不改这一轮的 system prompt
- 下一个 session 再重新 load，得到新快照

这就是一个非常明确、可预测的长期记忆生效模型。

不是“可能生效”，也不是“模型自己悟出来”，而是非常工程化地规定了：

长期记忆只在 session 边界刷新。

---

## 8. prompt_builder.py 里的 guidance 说明：Hermes 不只是“有 memory tool”，而是把 memory 使用准则也制度化了

看 agent/prompt_builder.py，里面有三段和记忆强相关的常量：

- MEMORY_GUIDANCE
- SESSION_SEARCH_GUIDANCE
- SKILLS_GUIDANCE

其中前两个和本章最相关。

### 8.1 MEMORY_GUIDANCE 规定什么值得存

MEMORY_GUIDANCE 明确告诉模型：

- 用 memory 保存 durable facts
- 优先保存能减少未来用户重复纠正的信息
- 用户偏好和 recurring corrections 比任务细节更重要
- 不要把任务进度、会话结果、临时 TODO 写进 memory

这段提示的意义不只是“教模型用工具”，而是在给 memory 做数据治理。

因为最容易毁掉一个持久记忆系统的，不是不会写，而是什么都写。

Hermes 很明显知道这一点，所以它不是只提供 memory_tool，而是把“什么该记、什么不该记”写进了系统提示层。

### 8.2 SESSION_SEARCH_GUIDANCE 规定什么不该塞进 memory

SESSION_SEARCH_GUIDANCE 则补上另一半：

如果用户提到过去聊过的东西，或者你怀疑存在跨会话上下文，先用 session_search 去回忆，而不是让用户重复。

这说明 Hermes 从提示层就明确鼓励一种分工：

- memory 负责 durable facts
- session_search 负责 recall transcripts

这正是前面说的“长期事实”和“历史记录检索”分治。

---

## 9. Hermes 不是只有 file-backed memory，它还有一层更大的“会话档案记忆”：SessionDB

如果说 MEMORY.md / USER.md 是小而精的长期知识层，那么 hermes_state.py 里的 SessionDB，就是 Hermes 的会话档案层。

文件开头注释写得很清楚：

它是 SQLite state store，替代 per-session JSONL；
支持 persistent session storage；
有 FTS5 full-text search；
同时存 session metadata、full message history、model configuration；
服务于 CLI 和 gateway session。

Schema 也非常完整：

sessions 表存：

- id
- source
- user_id
- model
- system_prompt
- parent_session_id
- 时间、token、cost、title 等元信息

messages 表存：

- session_id
- role
- content
- tool_call_id
- tool_calls
- tool_name
- timestamp
- token_count
- reasoning 等

然后再用 FTS5 virtual table messages_fts 给 content 建全文检索。

这意味着 Hermes 对“历史”的处理完全不是 memory 文件那种模式。

它不是挑几条重要事实，而是把完整会话流落进数据库，并允许之后按全文检索召回。

这层东西，才是 session_search 真正依赖的底层。

---

## 10. SessionDB 的重点不是“存下来”，而是让跨会话 recall 变成低成本能力

很多系统也会保存日志，但保存日志不等于能回忆。

Hermes 的 SessionDB 真正重要的地方，在于它不是被动存档，而是主动为 recall 设计。

最明显的证据有三个。

### 10.1 它从 schema 起就为检索准备了 FTS5

messages_fts 不是后补的功能，而是初始化 schema 时就创建的虚拟表，并通过 insert / delete / update trigger 保持和 messages 表同步。

也就是说，全文检索在 Hermes 里不是“额外插件”，而是 session state 的一等能力。

### 10.2 它保留 parent_session_id，支持压缩链和子会话链

sessions 表里有 parent_session_id。

这很关键，因为 Hermes 会发生两类“一个逻辑会话拆成多个物理 session”的情况：

- context compression 产生父子 session
- delegation / subagent 产生 parent-child session

如果没有 parent_session_id，历史检索很快就会碎片化。

而 session_search_tool.py 里也明确利用了这个字段，把 child session 继续向上 resolve 到 root parent，避免用户的一个完整任务被检索结果拆成一堆碎片。

### 10.3 它对并发写入做了非常认真地处理

hermes_state.py 里 SessionDB 用的是：

- WAL 模式
- 短超时 + 应用层 jitter retry
- BEGIN IMMEDIATE
- 定期 passive WAL checkpoint

源码注释明确说，这是为了解决 gateway、CLI、worktree agents 多进程/多线程共享一个 state.db 时的写锁 convoy 问题。

换句话说，SessionDB 不是“本地单进程玩具数据库”，而是真正按多运行体共用状态来设计的。

这才让 session_search 有现实可用性。

---

## 11. session_search_tool.py 解决的不是“把数据库结果返回给模型”，而是“把历史转成可消费回忆”

现在来看 tools/session_search_tool.py。

这个工具的注释非常好，因为它把完整流程写出来了：

1. FTS5 搜索匹配消息
2. 按 session 分组，取 top N unique sessions
3. 加载对应会话并截断到约 100k chars
4. 用一个便宜/快速模型做 focused summarization
5. 返回每个 session 的摘要，而不是原始 transcript

这几步意味着 Hermes 的 session_search 不是简单 DB search API，而是一个 recall pipeline。

这点非常重要。

因为对主模型来说，最没用的通常不是“没有历史”，而是“历史太原始”。

如果每次回忆都直接塞回整段 transcript：

- token 成本高
- 噪音大
- 主模型还得重新做总结工作
- 很容易把当前上下文污染得很重

Hermes 的办法是：

先在数据库里找，再用 auxiliary model 把找到的历史压成 focused summary。

这说明 Hermes 把 session_search 设计成“长期记忆的检索接口”，而不是“给你看数据库原文”。

---

## 12. session_search_tool.py 里有三个很成熟的工程处理

这个文件里至少有三处细节，能看出 Hermes 已经遇到过真实使用场景，而不是停留在 demo 阶段。

### 12.1 recent sessions 模式和 keyword search 模式分开

如果 query 为空，session_search() 不会强行走 LLM summarization，而是直接返回最近 session 的 metadata。

也就是：

- titles
- preview
- timestamp
- message_count

这很合理。

因为“最近我们做了什么”这种问题，本来就没必要每次都起 summarizer。

### 12.2 它会排除当前会话 lineage

session_search() 会解析 current_session_id，并通过 _resolve_to_parent() 一路向上找 root parent。

之后在搜索结果里跳过当前会话及其 lineage。

原因也很简单：

当前会话本来就已经在上下文里，再搜回来只会重复污染。

这说明 Hermes 对 recall 的目标不是“越多越好”，而是“补当前上下文没有的”。

### 12.3 summarization 失败时，它不会把结果 silently drop

在 _summarize_session() 或并行 summarization 失败时，session_search_tool.py 不会直接空掉结果，而是回退成 raw preview。

源码注释写得也很直白：

这样 matched sessions 不会因为 summarizer 不可用而被静默丢掉。

这是非常实用的失败降级策略。

也说明 Hermes 的 recall 设计目标是：

优先保证“有东西可回忆”，再追求“回忆得优雅”。

---

## 13. session_search 之所以能工作，还因为它借用了 model_tools.py 的 async bridging

还有一个很容易忽略但很重要的点。

session_search_tool.py 在并行 summarization 时，没有自己乱搞 event loop，而是从 model_tools import _run_async。

源码注释还专门解释：

旧模式如果用 asyncio.run() + ThreadPoolExecutor，会和缓存的 AsyncOpenAI / httpx client 的事件循环归属冲突，在 gateway mode 里导致死锁。

所以这里直接使用 model_tools.py 那套跨 CLI / gateway / worker-thread 的 event loop 管理。

这件事非常说明 Hermes 的整体架构是连起来的。

记忆系统不是一个孤岛。

它要想在真实多入口环境下稳定运行，必须借助工具层的 async 运行时治理。

也就是说，Hermes 的“会回忆”并不只是 memory_tool 的功劳，而是 SessionDB、session_search_tool 和 model_tools async bridge 联合作用的结果。

---

## 14. Hermes 其实有两层长期状态：内建 memory + 外部 memory provider

再回到 run_agent.py 第 1048 行之后，你会发现 Hermes 其实还多做了一层：memory provider plugin。

这里的逻辑是：

- 先读取 memory.provider 配置
- 可自动迁移旧 Honcho 配置
- 用 MemoryManager 装载一个外部 provider
- 初始化 provider 时传 session_id、platform、hermes_home、agent_context
- 如果有 user_id，也会传进去做 per-user scoping
- 还能传 active profile name 做 per-profile scoping
- 然后把外部 memory provider 的 tool schemas 注入到 self.tools

这说明 Hermes 当前不是只有内建 MEMORY.md / USER.md 这一套。

它还允许外挂一个 provider 型记忆系统，并把它与 built-in memory 并存。

而且在 _build_system_prompt() 里，也会尝试：

self._memory_manager.build_system_prompt()

把外部 memory provider 生成的 system prompt block 一并注入。

这非常关键。

因为它说明 Hermes 的内核已经把“记忆”抽象成两层：

- built-in curated memory
- optional external provider memory

前者偏稳定、小、可控；
后者偏可扩展、可插件化。

这也使得 Hermes 的记忆系统不只是“够用”，而是具备继续演进的接口。

---

## 15. 所以 Hermes 为什么不像每次都失忆？因为它把不同类型的“过去”放进了不同容器

把前面几块代码合起来看，Hermes 其实不是在做一个统一大 memory，而是在做多层过去状态管理。

大致可以分成四层：

### 第 1 层：当前会话上下文

这当然是模型窗口内的 messages，本章不展开。

### 第 2 层：冻结的 built-in persistent memory

来自 MEMORY.md 和 USER.md。

特点是：

- 小而精
- durable facts only
- 在 session start 冻结
- 作为 system prompt 一部分稳定注入

### 第 3 层：可检索的会话档案

来自 SessionDB。

特点是：

- 全量消息历史
- FTS5 检索
- 支持 parent-child lineage
- 不直接全量注入，而是按需 search + summarize

### 第 4 层：外部 memory provider

来自 MemoryManager / provider plugin。

特点是：

- 可扩展
- 可按 user / profile / platform 做作用域
- 可以额外暴露工具 schema 和 prompt block

正是因为 Hermes 把“过去”拆成了这几层，所以它不会陷入两个常见极端：

- 要么什么都不记，每次像失忆
- 要么什么都塞进 prompt，最后又贵又乱

它做的是一种更像真实系统的分层状态管理。

---

## 16. 这一章真正重要的结论：Hermes 的记忆系统，本质上不是“记住更多”，而是“记住该记的，用对召回方式”

如果只从表面看，你会以为 Hermes 的优势是：

- 有 memory 工具
- 有 session_search
- 有 SQLite
- 有 USER.md / MEMORY.md

但真正更重要的不是这些组件本身，而是它们之间的分工。

Hermes 很清楚以下几件事：

- 不是所有过去的信息都适合直接注入 system prompt
- 不是所有长期状态都应该存成数据库记录
- 不是所有会话历史都值得转成 permanent memory
- 不是所有记忆都需要 mid-session 立即生效

于是它做出的系统设计是：

- 用小容量、人工治理的 memory 保存 durable facts
- 用 USER.md 专门承载用户画像
- 用 frozen snapshot 保护 prompt stability 和 prefix cache
- 用 SessionDB 存全量会话历史
- 用 session_search 在需要时检索并摘要历史
- 用 memory provider 插件给未来更复杂记忆形态留接口

所以，Hermes 看起来“不容易失忆”，并不是因为它有一个更大的脑子。

而是因为它比很多 Agent 系统更早承认：

长期状态不是一个功能点，而是一整套分层治理问题。

---

## 把记忆这一层收住

严格基于当前 hermes-agent 仓库的现有源码，我认为 Hermes 的记忆系统可以概括为：

它并没有把“记忆”实现成一个无限膨胀的大上下文，而是把长期事实、用户画像、完整会话档案、检索式回忆和外部 provider 能力拆成不同层，并分别用最合适的机制处理。

这个判断主要来自以下源码事实：

- tools/memory_tool.py 把长期 memory 固定拆成 MEMORY.md 与 USER.md，并用字符预算、内容扫描、原子写入和文件锁保证可控与安全
- MemoryStore 同时维护 frozen system-prompt snapshot 与 live mutable state，使 mid-session 写入可持久化但不破坏当前 session 的 prompt 稳定性
- run_agent.py 在 AIAgent 初始化时按配置加载 MemoryStore，并在 _build_system_prompt() 中把 frozen snapshot 注入 system prompt
- agent/prompt_builder.py 明确规定 durable facts 才该进入 memory，而任务过程和历史结果应交给 session_search
- hermes_state.py 的 SessionDB 用 SQLite + FTS5 + parent_session_id 构成完整会话档案层，为跨会话 recall 提供底座
- tools/session_search_tool.py 不是直接返回数据库命中，而是通过 FTS 检索、去重、parent resolve、focused summarization，把历史转成可消费的回忆结果
- run_agent.py 还支持 external memory provider plugin，并允许其同时注入工具 schema 与额外 system prompt block

所以，如果上一章的关键词是“能力治理”，这一章的关键词就是：状态分层。

Hermes 不是试图让 Agent 记住一切，而是把“什么该长期记、什么该随时检索、什么该只留在当前会话里”这三件事分开了。

这正是一个真正可持续演进的 Agent 记忆系统该有的样子。
