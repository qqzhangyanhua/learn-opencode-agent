# 附录 J｜Memory 与 Skill 和 Session Search 的边界：Hermes 怎么区分事实记忆、历史检索和流程沉淀

## 先把记忆、检索、技能分账

很多刚开始学 Agent 的人，一旦系统里出现“记住东西”的能力，就会下意识地把很多东西都往一个桶里装：

- 用户说过的话，记起来
- 上次做过的任务，记起来
- 解决过的 bug 步骤，记起来
- 某个项目里的习惯，记起来

看起来都叫“记忆”，但如果你真的这么设计，系统很快就会变得很混乱：

- memory 越写越像流水账
- 上下文里塞满一次性任务痕迹
- 真正稳定有价值的事实反而被淹掉
- 某些应该复用的流程没有沉淀成 skill
- 某些只是历史对话的内容，却被错误注入到每一轮 system prompt

Hermes 在这件事上的处理，非常值得学习智能体的人认真看。

因为它没有把“长期化信息”只做成一个通道，而是明确拆成了三条：

- `memory`：存 durable facts
- `session_search`：查 past transcripts
- `skill`：沉淀 reusable workflows

这一篇附录就专门回答一个很关键的问题：

Hermes 怎么区分“应该写进 memory 的事实”、“应该靠 session_search 找回的历史”，以及“应该沉淀成 skill 的流程”？

这一篇主要结合这些源码和测试文件来看：

- `agent/prompt_builder.py`
- `run_agent.py`
- `tools/memory_tool.py`
- `tools/session_search_tool.py`
- `tests/agent/test_prompt_builder.py`
- `tests/tools/test_memory_tool.py`
- `tests/tools/test_session_search.py`
- `tests/run_agent/test_run_agent.py`

---

## 1. Hermes 最重要的判断：不是所有“以后可能有用的信息”都应该进入 memory

先看 `agent/prompt_builder.py` 里的 `MEMORY_GUIDANCE`。

这段 guidance 其实已经把 Hermes 的边界说得非常清楚：

- memory 用来存 durable facts
- 重点是 user preferences、environment details、tool quirks、stable conventions
- 不要把 task progress、session outcomes、completed-work logs、temporary TODO state 存进 memory
- 如果只是过去对话里的内容，应该用 `session_search`
- 如果是“发现了一种以后还会用到的新做法”，应该存成 skill

这几句话特别重要。

因为它们说明 Hermes 一开始就在避免一个非常常见的失败模式：

把 memory 当成“什么都往里塞的长期笔记本”。

Hermes 明显不是这么理解的。

它对 memory 的定义更像是：

当前用户和当前环境里，那些跨会话仍然稳定成立、并且能减少未来纠偏成本的事实。

所以你会发现，Hermes 在这里一开始就把三类东西分开了：

- 稳定事实 -> memory
- 历史细节 -> session_search
- 可复用流程 -> skill

这就是整套边界设计的起点。

---

## 2. `tools/memory_tool.py` 说明 memory 在 Hermes 里不是日志仓库，而是“冻结注入的精简事实层”

打开 `tools/memory_tool.py`，文件头第一段就非常值得看。

它明确写了两种 store：

- `MEMORY.md`
- `USER.md`

并且也直接写了它们的职责：

- `MEMORY.md`：environment facts、project conventions、tool quirks、things learned
- `USER.md`：name、role、preferences、communication style、workflow habits

这已经说明 Hermes 的 memory 不是“对话数据库”，而是 curated memory。

### 2.1 memory 是精简的，不是无限膨胀的

`MemoryStore` 有明确的字符上限：

- `memory_char_limit`
- `user_char_limit`

工具响应里还会返回 usage 百分比。

为什么这点重要？

因为只要 memory 会被注入进 system prompt，它就必须被当成高价值、低噪音的前缀资源来管理。

Hermes 很清楚这一点，所以它从设计上就不鼓励：

- 原始数据堆积
- 会话流水账
- 一次性任务结果

这也是 `MEMORY_SCHEMA` 里反复强调的重点：

- Save durable information
- priority 是 user preferences 和 corrections
- Skip trivial info、raw data dumps、temporary task state

对初学者来说，这里特别值得记住：

一旦某类信息会“自动注入到未来很多轮”，它就不能按普通日志思路去存。

### 2.2 memory 是冻结快照，不是实时漂移上下文

`tools/memory_tool.py` 最值得学的一点，是 `format_for_system_prompt(...)` 的设计。

这个函数明确说明：

- 它返回的是 load 时捕获的 frozen snapshot
- mid-session writes 不会影响当前 session 的 system prompt
- 这样做是为了保持 system prompt 稳定，保住 prefix cache

`tests/tools/test_memory_tool.py` 也专门验证了：

- load 后捕获快照
- 中途再 add 新 entry
- `format_for_system_prompt("memory")` 仍然只返回启动时的那份内容

这一步非常成熟。

因为它说明 Hermes 不只是在讨论“该记什么”，还在认真处理：

记忆进入 prompt 之后，对运行时稳定性的影响。

换句话说，Hermes 不是“有 memory 就实时更新 prompt”，  
而是“memory 先落盘，下一次 session 再作为稳定前缀注入”。

这使得 memory 更像一层长期事实配置，而不是会话内动态 scratchpad。

---

## 3. Hermes 之所以单独做 `session_search`，就是为了不让 memory 退化成“历史对话垃圾桶”

很多系统在做“长程记忆”时，最容易犯的错就是：

把历史对话细节也塞进 memory。

Hermes 显然很清楚这会出问题，所以单独做了 `tools/session_search_tool.py`。

这个文件头写得很直接：

- Searches past session transcripts in SQLite via FTS5
- then summarizes the top matching sessions
- returns focused summaries rather than raw transcripts
- keeps the main model's context window clean

这说明 Hermes 对 `session_search` 的理解不是“记忆”，而是 recall。

也就是：

- 过去的会话细节不常驻
- 需要时再检索
- 检索后再摘要
- 摘要结果只为当前问题服务

这和 memory 的设计刚好相反。

### 3.1 `session_search` 处理的是过去发生过什么

看 `session_search(...)` 和 `_summarize_session(...)` 的逻辑，你会发现这条链路解决的是：

- 过去用户问过什么
- 当时做过哪些动作
- 结果是什么
- 有哪些关键命令、路径、错误或决定

这类信息本质上是历史记录。

它们非常有用，但并不意味着它们应该长期常驻在 system prompt 里。

所以 Hermes 选择：

- 平时不注入
- 需要回忆时用 FTS5 搜
- 再用便宜模型摘要出和当前 query 相关的部分

这是一种典型的“检索式回忆”，而不是“常驻式记忆”。

### 3.2 tests 也在守这个边界

`tests/tools/test_session_search.py` 里有几条很值得注意：

- 没有 DB 时必须报错
- current session 不能被检索回来
- 当前 session 的 parent / child lineage 也要被排除

这说明 Hermes 不是把 `session_search` 当成当前上下文的重复拷贝工具，  
而是把它当成对“别的历史会话”的回忆通道。

这一点很关键。

因为它意味着：

- 当前对话已经在模型上下文里，就不要再拿 `session_search` 回来污染一遍
- `session_search` 真正处理的是跨 session 的历史补充

所以从设计上看，`session_search` 是 memory 的替代，而不是 memory 的补丁。

它替代的是：

- 那些你原本想往 memory 里硬塞的历史会话内容

---

## 4. Skill 处理的则不是“事实”和“历史”，而是“以后还会重复用到的做法”

再回到 `MEMORY_GUIDANCE` 和 `MEMORY_SCHEMA`，你会发现 Hermes 反复强调一句话：

如果你发现了一种新的做法、解决了以后还会遇到的问题，  
那应该把它保存成 skill。

这句话特别值得拆开看。

因为它说明 Hermes 认为“可复用流程”既不是 memory，也不是 session history。

为什么？

因为这类信息既不只是一个事实，也不只是过去发生过什么。  
它更像一种以后还会重复使用的方法包。

比如：

- 某类 bug 的排查 SOP
- 某个平台接入的一套固定步骤
- 某种写作或前端任务的稳定工作流

这些内容如果放进 memory，会出现两个问题：

- 太长
- 太 procedural，不像稳定事实

如果只靠 `session_search`，又会出现另一个问题：

- 每次都得重新从历史任务里翻找和摘要

所以 Hermes 给它单独开了一条通道：

- 写成 skill
- 作为按需加载的能力包
- 以后再遇到类似问题时直接复用

这就是为什么 `SKILLS_GUIDANCE` 会明确说：

- 完成复杂任务后可以沉淀成 skill
- skill 过时了要及时 patch

Hermes 在这里的判断很成熟：

历史记录不等于经验资产。  
真正成熟的 Agent，要把经验从“发生过一次”进一步提升为“可反复调用的流程”。

---

## 5. `run_agent.py` 把这三条通道正式装进了 system prompt 纪律里

如果你只看单个工具文件，可能还感觉这是几个松散的好想法。  
但 `run_agent.py` 会让你看到，它们其实已经被 Hermes 接成了统一运行时规则。

看 `_build_system_prompt()` 这段逻辑：

- 有 `memory` 工具时，注入 `MEMORY_GUIDANCE`
- 有 `session_search` 工具时，注入 `SESSION_SEARCH_GUIDANCE`
- 有 `skill_manage` 工具时，注入 `SKILLS_GUIDANCE`

这一步说明 Hermes 不是只做了三个工具，  
而是把三类长期化机制都正式纳入了 agent behavior contract。

也就是说，Hermes 在 system prompt 里明确告诉模型：

- 哪类东西值得长期记住
- 哪类东西应该先去历史会话里找
- 哪类东西应该沉淀成 skill

`tests/run_agent/test_run_agent.py` 也在守这个行为：

- memory tool 加载时，system prompt 必须包含 `MEMORY_GUIDANCE`
- 没有 memory tool 时，不应该平白出现那段 guidance

这说明 Hermes 不是把“记忆哲学”写在 README 里，而是真的把它变成 runtime 行为纪律。

---

## 6. 对学习智能体的人来说，这三条通道最值得记住的判断标准

如果你想学 Hermes 这一套，最实用的不是死记文件名，而是记住它的判断标准。

### 6.1 这是一个稳定事实吗

如果答案是“是”，而且它能减少未来用户重复纠偏，那更像 memory。

典型例子：

- 用户偏好
- 项目约定
- 环境事实
- 工具 quirks

### 6.2 这是某次历史会话里发生过的细节吗

如果答案是“是”，那更像 `session_search`。

典型例子：

- 上次为了修某个 bug 跑过什么命令
- 某次会话里讨论过什么方案
- 之前在哪个 session 里给过一个路径、链接或报错信息

### 6.3 这是以后会反复复用的方法吗

如果答案是“是”，那更像 skill。

典型例子：

- 调试套路
- 接入流程
- 写作模板流程
- 某类平台任务的 SOP

### 6.4 这条信息会不会污染未来所有轮的前缀

如果它不值得未来很多轮都自动看到，就不要放进 memory。

这条判断非常重要。

因为 Hermes 的 memory 是会进 system prompt 的，而且还是 frozen snapshot。  
所以只有高价值、低波动的事实，才配进去。

---

## 7. 这套边界设计背后，其实是在控制三种不同的“长期化成本”

再往深一层看，你会发现 Hermes 之所以把这三条通道拆开，  
本质上是在控制三种完全不同的成本。

### 7.1 memory 控制的是前缀污染成本

因为 memory 会进入未来 session 的 system prompt，  
所以它必须非常克制。

### 7.2 session_search 控制的是历史召回成本

因为过去会话很多，不可能都常驻，  
所以它用检索 + 摘要按需回忆。

### 7.3 skill 控制的是经验复用成本

因为某些流程如果每次都靠回忆旧会话重新总结，成本太高，  
所以它把这些流程升级成正式 skill。

这三种成本控制住了，Agent 才会越来越稳。

否则系统通常只会走向两个极端：

- 要么什么都常驻，prompt 越来越乱
- 要么什么都不沉淀，每次都重新想一遍

Hermes 之所以成熟，就在于它没有选这两个极端。

---

## 最后把三本账收住

如果把这一篇压缩成一句话，那就是：

Hermes 不是只有一个“记忆系统”，而是把长期化信息拆成了三类完全不同的东西。

在 Hermes 里：

- `memory` 存的是跨会话稳定成立的事实
- `session_search` 找的是过去会话里的历史细节
- `skill` 沉淀的是以后还能复用的方法流程

也正因为它把这三条通道拆开了，Hermes 才能同时做到：

- 未来 prompt 不被日志污染
- 历史细节需要时还能找回来
- 有价值的经验能升级成正式能力包

对学习智能体的人来说，这一层非常值得抄。

因为它提醒我们：

真正成熟的 Agent 不是“什么都记住”，  
而是“知道什么该记成事实，什么该留给检索，什么该升级成流程资产”。
