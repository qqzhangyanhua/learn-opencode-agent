# 附录 O｜Session Search 专章：Hermes 为什么查的是正式会话账本，而不是当前 Transcript 或 Memory

## 先问为什么不能直接查 transcript

很多人第一次看到 Hermes 里的 `session_search`，第一反应通常是“搜一下历史对话”。但只要认真做跨会话回忆，立刻就会碰到几个问题：

- 到底搜哪份历史？当前 transcript 还是全局 session？
- 为什么不用 memory 直接记住？
- 为什么不把原始命中片段直接塞回模型？
- 为什么还要排除 current session 和 parent / child lineage？
- 为什么它要查 `SessionDB`，而不是 gateway 的 transcript 文件？

Hermes 不是把 `session_search` 理解成普通文本检索工具，而是把它当成 Agent 的跨会话 recall 通道。

这一篇附录就专门回答一个问题：

Hermes 为什么让 `session_search` 基于正式会话账本做跨会话检索，而不是去搜当前 transcript、memory，或者直接把历史原文塞回模型？

这一篇主要结合这些源码和测试文件来看：

- `tools/session_search_tool.py`
- `run_agent.py`
- `hermes_state.py`
- `tests/tools/test_session_search.py`
- `tests/agent/test_prompt_builder.py`

---

## 1. Hermes 最重要的判断：`session_search` 不是“找当前上下文里有没有这句话”，而是“做跨会话回忆”

先看 `tests/agent/test_prompt_builder.py` 里对 `SESSION_SEARCH_GUIDANCE` 的断言。

测试写得非常直白：

- guidance 里应该有 `relevant cross-session context exists`
- 不应该提 `recent turns of the current session`

这两句其实已经把 `session_search` 的产品定义说穿了。

Hermes 从一开始就不把它理解成：

- 当前对话内搜索

而是明确把它定义成：

- 当前上下文之外的跨会话 recall

这点很关键，因为很多系统一做“搜索历史”，就会把三种事情混成一件事：

- 搜当前对话
- 搜长期 memory
- 搜过去 session

Hermes 没这么做，它把边界切得很清楚：

- 当前 session 的 recent turns，本来就在上下文里
- 稳定事实应该走 memory
- 过去会话里的细节，才交给 `session_search`

也就是说，`session_search` 从定义上就不是“万能搜索”，而是专门处理“我记得以前做过这件事，但它现在不在当前上下文里”这类问题的 recall 通道。

---

## 2. 为什么 Hermes 不让它查当前 transcript：因为当前 session 根本不是它要解决的问题

看 `run_agent.py` 里执行 `session_search` 的分支，你会发现 `AIAgent` 调它时会显式传入：

- `db=self._session_db`
- `current_session_id=self.session_id`

再看 `tools/session_search_tool.py`，工具内部也明确写着：

- current session is excluded from results

`tests/tools/test_session_search.py` 还专门把这个行为钉死了：

- 如果命中的只有当前 session，结果必须是空
- 如果当前是 child session，它的 parent lineage 也要一起排除
- 如果当前是 root session，命中的 child lineage 也要排除

这说明 Hermes 的判断非常坚决：当前会话链上的内容，不该被 `session_search` 再拿回来。

### 2.1 为什么要排除 current session

因为当前 session 本来就在模型上下文里。

如果再把同一批内容通过 `session_search` 拿回来，你很容易得到三种坏结果：

- 重复信息占上下文
- 模型把“刚刚说过的话”误当成新的外部证据
- 压缩 / delegation 产生的 parent-child session 被重复召回

Hermes 不想让 `session_search` 变成当前上下文的重复扩音器。

### 2.2 为什么连 parent / child lineage 都一起排除

这个细节特别有工程味。

`session_search_tool.py` 里专门有个 `_resolve_to_parent(...)`，会一路沿着：

- `parent_session_id`

往上走，找到 root session。

为什么要这么做？

因为在 Hermes 里：

- context compression 会切出新的 child session
- delegation 也可能产生 child session

如果不把 lineage 一起排除，你就会出现一种很怪的情况：

- 模型明明就在当前会话链里
- 却又通过 `session_search` 把这条链上更早的碎片当成“过去别的 session”召回

这会让 recall 语义变脏。所以 Hermes 把边界收得很死：`session_search` 只负责当前会话链之外的 recall。

---

## 3. 为什么 Hermes 不让 memory 干这件事：因为 session history 不是 durable facts

这个问题其实在附录 J 里已经铺过一层，但在 `session_search` 身上特别值得再强调一次。

看 `tools/session_search_tool.py` 文件头，第一句就写得很清楚：

- Long-Term Conversation Recall

注意它说的是：

- conversation recall

不是：

- durable memory

这意味着 Hermes 很清楚区分了两类完全不同的信息：

- `memory` 里放的是稳定事实
- `session_search` 里找的是过去发生过什么

### 3.1 为什么过去会话细节不该进入 memory

因为这类信息虽然也可能“以后有用”，但它通常不稳定，也不该常驻：

- 某次具体排查怎么做的
- 某次报错原文是什么
- 某个项目上周讨论到哪
- 某次修复最后结论是什么

这些都很像历史记录，不像稳定事实。

如果你把它们全塞进 memory，很快就会出现：

- memory 像流水账
- system prompt 越来越脏
- 真正稳定的用户偏好和环境约束被淹掉

Hermes 之所以单独做 `session_search`，本质上就是在保护 memory。

### 3.2 `session_search` 解决的是“按需回忆”，不是“常驻注入”

这里的判断可以直接记住：稳定的长期事实才长期注入，过去会话细节按需检索；`session_search` 正是这条路线的正式实现。

---

## 4. 为什么 Hermes 不直接搜 gateway transcript：因为 `session_search` 的目标是跨入口统一 recall

很多人看到 gateway 里也有 transcript，会自然地问：

- 那为什么 `session_search` 不直接去搜 transcript 文件？

答案其实很简单：transcript 是入口层工件，`session_search` 要查的是跨入口统一的正式会话账本。

看 `run_agent.py` 的调用方式就知道，`session_search` 拿到的是：

- `self._session_db`

不是 transcript path。

再看 `tools/session_search_tool.py` 内部调用的也是：

- `db.search_messages(...)`
- `db.get_session(...)`
- `db.get_messages_as_conversation(...)`

这意味着 `session_search` 从一开始就是建在 `SessionDB` 这层之上的。

### 4.1 为什么必须建在 `SessionDB` 上

因为 Hermes 希望它成为一个：

- CLI、Gateway、ACP 等入口都能共享的 recall 通道

如果你把它建在某个入口自己的 transcript 之上，就会立刻丢掉两个很重要的能力：

- 跨入口统一搜索
- parent session lineage 解析

而 `SessionDB` 恰好具备这些能力：

- 统一 `sessions` / `messages` 结构
- `parent_session_id`
- FTS5 搜索
- source / title / model / timestamp 元信息

所以 `session_search` 查 `SessionDB`，不是为了“数据库更高级”，而是因为它更符合正式跨会话 recall 这个工具语义。

### 4.2 transcript 更像恢复副本，不像正式 recall 索引

gateway transcript 更适合做的是：

- 当前入口恢复历史
- 兼容旧 JSONL
- `/retry`、`/undo`、`/compress` 之类入口层改写

但 `session_search` 不是在做“入口层回放”，  
它是在做：

- 面向整个 Hermes runtime 的历史召回

这两层当然不应该混。

---

## 5. `session_search` 也不是“原文检索返回器”，它是“先搜、再筛、再摘要”的 recall pipeline

打开 `tools/session_search_tool.py`，文件头把整个流程写得非常清楚：

1. FTS5 search finds matching messages
2. groups by session
3. loads each session conversation
4. sends to auxiliary model for summarization
5. returns per-session summaries

这说明 Hermes 从一开始就不是想做“命中几段原文就直接返回给主模型”的工具，它真正要的是对过去会话做 focused recall。

### 5.1 第一步：用 FTS5 找命中

工具先通过：

- `db.search_messages(...)`

做 message 级别搜索。

而且它还会：

- 支持 role filter
- 排除 `_HIDDEN_SESSION_SOURCES = ("tool",)`
- 先拿 50 条 match，再按 session 去重

这说明 Hermes 不是简单“搜到几条就给几条”，而是先把 message-level 命中当成找到相关 session 的入口。

### 5.2 第二步：把命中上卷到 session 级别

随后工具会按 session 分组，并且只保留 top N unique sessions。

这一层很重要，因为用户要回忆的通常不是“某一句话在哪出现过”，而是“上次那整件事我们是怎么做的”。所以 Hermes 不停留在 message hit，而是上卷到 session recall。

### 5.3 第三步：不是直接返回全文，而是先截取、再摘要

工具在拿到整段 session conversation 后，还会做两步：

- `_truncate_around_matches(...)`
- `_summarize_session(...)`

第一步把很长的会话切到和 query 更相关的窗口附近。  
第二步再交给 auxiliary model，生成围绕当前 query 的事实型 recap。

这背后的判断很成熟：用户需要的是有用回忆，不是海量原文；主模型上下文很贵，不应该被历史全文灌爆；“历史存在过”不等于“应该原样重新注入”。所以 Hermes 返回的是每个 session 一段 focused summary，而不是全量 transcript dump。

---

## 6. 为什么 Hermes 还做“recent sessions mode”：因为 recall 不总是从关键词开始

再看 `session_search(...)` 开头的一段逻辑：

- 如果 query 为空，不走 LLM summarization
- 直接 `_list_recent_sessions(...)`

这一步很值得学，因为真实用户并不总会直接给出一个好 query。

很多时候用户说的是：

- 我们最近在做什么来着
- 上次讨论到哪了
- 最近处理过哪些 session

这种时候，问题不是“搜某个关键词”，而是：

- 先浏览一下最近的正式会话

Hermes 所以专门给了一个 recent mode。

而且这个模式有几个非常清楚的边界：

- 不调用 LLM
- 直接列 metadata
- 过滤 hidden sources
- 排除 current session root
- 跳过 child / delegation sessions

这说明 Hermes 连“浏览最近历史”都不是按 transcript 文件列表去做，而是按正式 session 视角去做；这和它面向正式会话账本、而不是入口层消息碎片的定位完全一致。

---

## 7. Agent Loop 接管它，不是为了特殊待遇，而是因为它天然依赖当前 Agent 的正式 session 位置

`session_search` 在 Hermes 里并不走普通 registry dispatch，这一点在附录 K 已经讲过。

但放到这篇里，它的原因会显得更清楚。

看 `run_agent.py` 里执行 `session_search` 的代码，你会发现它必须拿到：

- `self._session_db`
- `self.session_id`

这两个东西缺一不可。

### 7.1 没有 `self._session_db`，它根本不知道该查哪份正式账本

所以 `run_agent.py` 一上来就判断：

- 如果没有 `self._session_db`，直接返回 `Session database not available`

### 7.2 没有 `self.session_id`，它就没法排除当前会话链

而 current lineage exclusion 恰恰是 `session_search` 语义正确性的核心之一。

所以这不是一个只靠参数就能完整表达的工具。

它必须依赖当前 Agent 所处的正式运行时位置。

这也再次说明：`session_search` 表面上是 tool，本质上已经深深嵌在 runtime 的会话语义里。

---

## 8. 读完这一篇记住 4 点

看完 `session_search` 这一套设计，最值得记住的是下面四条。

### 8.1 历史 recall 和长期 memory 一定要拆开

过去发生过什么，不等于稳定事实。

如果不拆：

- memory 会变脏
- prompt 会膨胀
- recall 也会越来越不准

### 8.2 跨会话 recall 应该查正式账本，而不是查某个入口自己的副本

只要系统有多个入口，就不要把 recall 建在某个入口的局部历史上。

不然你得到的就不是统一记忆，而是局部碎片。

### 8.3 召回历史时，返回“相关 recap”通常比返回“原文全集”更有用

FTS5 命中只是入口，不是终点。

真正有价值的是：

- 找到相关 session
- 围绕当前 query 把发生过什么浓缩出来

这才是主模型真正需要的 recall 结果。

### 8.4 当前会话链必须排除，否则 recall 会把上下文边界搞乱

如果一个 recall 工具连当前 session lineage 都会召回，  
那它很快就会退化成：

- 重复灌上下文
- 误导模型以为发现了新的外部证据

Hermes 在这里的克制非常值得抄。

---

## 最后把检索边界收一下

Hermes 的 `session_search` 表面看像一个搜索工具，实际上更像一个被严格约束过的跨会话 recall runtime。

它做的不是：

- 搜当前 transcript
- 把 memory 当搜索库
- 把历史原文大段塞回模型

而是：

- 基于 `SessionDB` 这份正式会话账本做 FTS5 检索
- 排除当前 session 及其 lineage
- 把命中上卷到 session 级别
- 再生成面向当前 query 的 focused summary

对想做自己智能体系统的人来说，这一章最大的启发其实可以浓缩成一句话：

真正好的历史回忆机制，不是“尽量把过去全找出来”，而是只在跨会话时触发，只查正式账本，只把当前问题真正需要的那部分历史干净地拿回来。
