# 附录 N｜会话持久化边界专章：Hermes 为什么 SessionDB、Gateway Transcript、ACP Session 和 API Responses Store 不是一回事

## 先把几个会话账本分开

很多人第一次看 Hermes 这种多入口 Agent 工程时，看到 `SessionDB`、`SessionStore`、transcript、ACP session、`ResponseStore`，会本能地以为它们只是“同一份会话状态的不同写法”。

这在小 Demo 里问题不大，但 Hermes 已经同时支持 CLI、Gateway、多平台消息入口、ACP 编辑器协议和 OpenAI-compatible API Server，不可能只靠“一份统一历史”解决所有问题。这里至少混着四种不同需求：

- Agent runtime 要正式会话账本
- Gateway 要入口层路由和 transcript 兼容
- ACP 要可恢复的活动编辑器会话
- API Server 要 `previous_response_id` 这类协议状态链

所以这一篇附录想回答的问题是：

Hermes 为什么不把所有“会话状态”都塞进一个存储里，而是明确分出 `SessionDB`、gateway transcript、ACP session、API responses store 这几层边界？

这一篇主要结合这些源码和测试文件来看：

- `hermes_state.py`
- `run_agent.py`
- `gateway/session.py`
- `gateway/run.py`
- `gateway/platforms/api_server.py`
- `acp_adapter/session.py`
- `tests/gateway/test_session.py`

---

## 1. Hermes 最重要的判断：所谓“会话持久化”，其实不是一件事，而是四种不同语义

先把总问题想清楚。

一个 Agent 系统里，“把历史存起来”至少可能对应四种完全不同的目标：

- 让 Agent 下次还能续着聊
- 让系统能搜索历史 session
- 让某个入口协议能够做自己的状态链路
- 让某个平台在迁移期不丢旧 transcript

如果把这些目标都混成“历史消息存储”，架构很快就会开始脏：

- 搜索层会被协议细节污染
- 协议层会被运行时内部状态污染
- 入口层会把自己的兼容负担塞给核心 runtime

Hermes 明显在刻意避免这件事。

它没有试图定义一个万能的“会话对象”，而是把边界拆开：

- `SessionDB` 是共享的、正式的、可搜索的运行时账本
- gateway transcript 是入口层的 transcript 兼容与恢复层
- ACP session 是编辑器入口的活动会话管理层
- `ResponseStore` 是 OpenAI Responses API 协议兼容层

这四层都跟“历史”有关，但它们回答的问题完全不同。

这点特别重要，因为很多人第一次设计 Agent 存储时，只看到“都在存消息”，看不到“为什么存、给谁用”。Hermes 的提醒很直接：决定状态边界的，不是数据长得像不像，而是这份状态服务的是哪一层语义。

---

## 2. `SessionDB` 才是 Hermes 最正式的共享会话账本，但它也不是“所有状态的大杂烩”

先看 `hermes_state.py`。

文件头已经写得很清楚：

- SQLite State Store for Hermes Agent
- stores session metadata, full message history, and model configuration
- for CLI and gateway sessions
- compression-triggered session splitting via `parent_session_id` chains

再看 `SessionDB` 的 schema，你会发现它管的是非常典型的 runtime ledger：

- `sessions` 表
- `messages` 表
- `messages_fts` 全文检索
- `parent_session_id`
- token / cost / model / system prompt 等元信息

这说明 `SessionDB` 在 Hermes 里的定位非常明确：

- 它不是某个平台私有的 history 文件
- 也不是某个协议的 response cache
- 它是共享的正式会话账本

### 2.1 `SessionDB` 关心的是“一个 Agent session 作为运行实体发生了什么”

从字段就能看出来，`SessionDB` 真正想保留的是：

- 这个 session 从哪来
- 用了什么模型
- system prompt 是什么
- 历史消息有哪些
- token / cost 怎么累计
- 它是不是由别的 session 压缩续出来的

这是一种非常典型的“运行时审计账本”思路。

也正因为如此，它支持：

- `search_sessions(...)`
- `get_messages_as_conversation(...)`
- `parent_session_id` 链式追踪

所以你可以把 `SessionDB` 理解成：

- Hermes 跨入口共享的正式会话底座

### 2.2 但 `SessionDB` 仍然不是万能状态容器

`SessionDB` 虽然正式，但它主要解决 runtime 搜索、历史续接和会话审计，并不天然解决 Gateway 的 session key 路由、ACP 的 `cwd` / cancel event、或 OpenAI Responses API 的 `previous_response_id` 协议链。

所以 `SessionDB` 是基础层，但不是唯一层。Hermes 的成熟之处就在这里：承认有共享账本，但不强迫所有上层语义都退化成 SQLite 里同一种记录。

---

## 3. `run_agent.py` 说明：真正把 Agent 历史刷进正式账本的，是 `AIAgent` 自己

再看 `run_agent.py`。

`AIAgent.__init__` 里只要拿到了 `session_db`，就会尝试：

- `self._session_db.create_session(...)`

而在运行结束路径里，`_persist_session(...)` 又会做两件事：

- `_save_session_log(messages)`
- `_flush_messages_to_session_db(messages, conversation_history)`

这里最值得学的一点是：

Hermes 让“正式会话持久化”尽量由 `AIAgent` 自己完成。

### 3.1 为什么是 Agent 自己刷 `SessionDB`

因为只有 Agent 本人最清楚：

- 哪些消息是这轮新产生的
- 哪些历史只是传入的 `conversation_history`
- 哪些 assistant 消息带 reasoning
- 哪些 tool call 和 tool response 应该怎样落库

`_flush_messages_to_session_db(...)` 里还有一个很关键的细节：

- `_last_flushed_db_idx`

它用这个游标来避免重复写入，只把真正还没落库的新消息写进 `SessionDB`。

这说明 Hermes 很清楚，正式账本不是谁都能顺手写一笔的。

一旦多个层次都“觉得自己应该补写历史”，就会立刻出现重复写入和状态污染。

### 3.2 `persist_session=False` 也说明不是所有 Agent 调用都应该形成正式会话

`run_agent.py` 里还有一个很容易被忽略但特别重要的开关：

- `persist_session`

像一些 helper flow 或 side question，本来就不是正式会话主线的一部分。

Hermes 对这类情况的处理不是“也写进去吧，反正都是历史”，  
而是允许：

- 不持久化

这再次说明 Hermes 对“会话”这件事不是粗暴按调用次数记录，  
而是有明确语义边界：

- 正式主会话要落账本
- 临时辅助调用不一定要进正式历史

对学习智能体的人来说，这个判断非常关键。

不是所有模型调用都应该被视作“用户会话的一部分”。

---

## 4. `gateway/session.py` 里的 `SessionStore` 不是 `SessionDB` 的重复品，而是消息入口层的会话编排器

再看 `gateway/session.py`。

`SessionStore` 的文件头写得很直接：

- session context tracking
- session storage
- reset policy evaluation
- dynamic system prompt injection

这已经说明它的职责和 `SessionDB` 不一样。

如果说 `SessionDB` 管的是“正式账本”，  
那 `SessionStore` 管的更像是：

- 入口层如何把消息来源映射成当前会话

### 4.1 `SessionStore` 先管理的是 session key 到 session id 的关系

在 Gateway 里，真正先要回答的问题不是“历史写哪”，而是：

- 这条来自 Telegram / Discord / Slack 的消息属于哪个 session？

所以 `SessionStore.get_or_create_session(...)` 真正做的是：

- 根据 `SessionSource` 生成 `session_key`
- 检查 reset policy
- 决定复用旧 session 还是新开一个 session
- 把内存里的当前 key 指向新的 `session_id`

这类逻辑本来就属于入口层，而不属于底层账本。

### 4.2 `SessionStore` 还负责 auto-reset、switch、resume 这些生命周期动作

`SessionStore` 里有一整套动作：

- `_should_reset(...)`
- `reset_session(...)`
- `switch_session(...)`
- `suspend_session(...)`

这些动作讨论的不是“消息怎么存”，而是：

- 当前入口层应该把后续消息续到哪条会话链上

这是一种典型的 session orchestration 角色。

也正因为如此，`SessionStore` 必须同时知道：

- platform
- chat_type
- session_key
- session_id
- 更新时间
- reset reason

这些信息跟 `SessionDB` 的全局历史账本并不在同一层。

---

## 5. Gateway transcript 也不是多余重复，它解决的是兼容、恢复和入口层改写

很多人第一次看到 `SessionStore.append_to_transcript(...)` 和 JSONL transcript，会立刻问：

- 不是已经有 `SessionDB` 了吗，为什么还要 transcript？

Hermes 的答案并不是“历史双写比较保险”这么简单。

它这里至少有三个现实原因。

### 5.1 它要兼容旧的 JSONL transcript 体系

`SessionStore` 里写得很清楚：

- 优先 SQLite
- fallback 到 legacy JSONL

而且 `append_to_transcript(...)` 默认还会：

- 写 SQLite
- 同时写 legacy JSONL

这说明 transcript 的存在首先是迁移与兼容需求，不是架构手滑。

### 5.2 它要防止迁移期间出现“SQLite 历史比 JSONL 短，导致上下文被悄悄截断”

`load_transcript(...)` 这段实现特别值得看。

它不是盲目优先 SQLite，而是：

- 同时加载 DB messages
- 同时加载 JSONL messages
- 返回消息更多的那个来源

旁边的注释把背景讲得很清楚：

- 有些旧 session 在迁移到 SQLite 后，早期完整历史还在 JSONL
- 而 SQLite 里可能只有迁移后的最近几条

如果这时候只信 SQLite，模型下次加载上下文时就会突然只看到最近 1 到 4 条消息，整段会话会被静默截断。

`tests/gateway/test_session.py` 也专门守了这个回归：

- JSONL 更长时必须返回 JSONL
- SQLite 更长时必须返回 SQLite
- 一样长时优先 SQLite，因为字段更丰富

这说明 gateway transcript 的职责不是“再存一份差不多的历史”，而是在入口层保证 transcript 的恢复语义不被迁移过程破坏。

### 5.3 它还要支持入口层对 transcript 的重写

Gateway 里有很多操作并不是简单 append：

- `/retry`
- `/undo`
- `/compress`

这些场景会用到：

- `rewrite_transcript(...)`

尤其是压缩路径里，`gateway/run.py` 还专门写了注释：

- `_compress_context` 会结束旧 session，并创建一个新的 `session_id`
- 旧历史保留在 SQLite 里
- 压缩后的消息写进新 session 的 transcript

这一步非常关键。

因为它说明 transcript 不只是“数据库镜像”，  
它还是入口层当前可回放对话的那条工作副本。

也就是说：

- `SessionDB` 更像正式账本
- gateway transcript 更像当前入口会话的可回放文本历史和兼容缓冲层

---

## 6. `gateway/run.py` 还明确防止 Agent 和 Gateway 双重写库，这进一步说明两层职责本来就不同

再看 `gateway/run.py`。

在把本轮新消息写回 transcript 时，代码里有一段非常关键的注释：

- agent 已经通过 `_flush_messages_to_session_db()` 持久化到 SQLite
- gateway 这里要 `skip_db=True`
- 否则会触发 duplicate-write bug

这件事特别值得学。

因为它说明 Hermes 很清楚：

- 正式 SQLite 持久化主要归 Agent
- gateway transcript 追加主要是入口层工作

两层都能碰到“消息”，  
不代表两层都应该往同一个正式账本里各写一次。

这也是为什么 `append_to_transcript(...)` 会有：

- `skip_db`

这个参数看起来像小修补，其实恰恰暴露了 Hermes 对边界的理解：

- transcript 层和正式账本层是相关但不同的职责

如果它们真是同一层，就不会需要这种显式分流。

---

## 7. ACP Session 管的不是“历史文件”，而是编辑器入口里的活动运行时

再看 `acp_adapter/session.py`。

文件头写得很明确：

- maps ACP sessions to Hermes `AIAgent` instances
- sessions are held in-memory for fast access and persisted to shared `SessionDB`

这句话已经把 ACP session 的定位讲透了：

- 它首先是活动运行时管理器
- 其次才把状态落到共享账本

### 7.1 ACP session 比普通 transcript 多了运行时状态

`SessionState` 里存的不只是 history：

- `agent`
- `cwd`
- `model`
- `history`
- `cancel_event`

这和 `SessionDB` 或 gateway transcript 完全不是一个层次。

因为编辑器场景下，你不仅要知道“以前聊了什么”，还要知道：

- 当前这个 session 绑定哪个工作目录
- 当前是否还有活动 agent 实例
- 是否需要取消正在运行的任务

这些明显是运行时状态，不适合直接退化成一份消息历史。

### 7.2 ACP 持久化到 `SessionDB`，是为了恢复和共享搜索；但 ACP session 本身仍然是入口层运行体

`SessionManager._persist(...)` 会：

- 确保 session row 存在
- 把 `cwd`、provider 等信息塞进 `model_config`
- 清空旧消息再重写当前 history

`_restore(...)` 则会：

- 从 `SessionDB` 读 session row
- 恢复 `cwd`
- 加载历史消息
- 重新 `_make_agent(...)`
- 重新绑定 task cwd override

这说明 ACP session 的真正语义是：

- 一个可在编辑器里被恢复出来继续工作的活动 Agent 会话

数据库只是它的恢复介质之一。

所以别把“ACP 会落 `SessionDB`”误解成：

- ACP session 就等于 `SessionDB` 里的一行

不对。

更准确地说是：

- ACP session 是入口层运行体
- `SessionDB` 是它可恢复、可搜索、可跨进程续接的共享底座

---

## 8. `ResponseStore` 解决的是 OpenAI Responses API 协议兼容，不是 Hermes 通用会话账本

最后看 `gateway/platforms/api_server.py`。

这里的 `ResponseStore` 特别容易让人误解，因为它也在存：

- response
- conversation history
- instructions

而且还支持：

- `previous_response_id`
- `conversation` 名称映射

看起来很像另一套 session system。

但文件头已经把它说得很清楚：

- SQLite-backed LRU store for Responses API state

注意这几个字：

- for Responses API state

这就说明它首先是协议兼容层。

### 8.1 `ResponseStore` 存的是“协议里的上一个响应对象”，不是运行时正式账本

在 `_handle_responses(...)` 里，请求可以带：

- `previous_response_id`

这时 API server 就会去 `ResponseStore.get(...)`，拿出之前存下来的：

- `response`
- `conversation_history`
- `instructions`

然后继续把这条链接下去。

这套机制的目标非常明确：

- 让 OpenAI Responses API 风格的客户端能够无缝使用 Hermes

它关心的是：

- 协议返回对象要不要能 GET 回来
- `previous_response_id` 能不能继续链
- `conversation` 名称能不能映射到最新 response

这和 `SessionDB` 关心的全局 session 搜索、会话 lineage、token 统计，根本不是一个问题。

### 8.2 API Server 其实同时用了两层状态，这恰好说明边界必须拆开

更有意思的是，`APIServerAdapter` 一边持有：

- `self._response_store = ResponseStore()`

另一边又懒加载：

- `self._session_db`

并且 `_create_agent(...)` 时会把：

- `session_db=self._ensure_session_db()`

传给 `AIAgent`。

这就很说明问题了。

如果 `ResponseStore` 已经等于完整会话存储，就根本不需要再给 Agent 接 `SessionDB`。

Hermes 之所以两套都保留，正是因为它们服务的是两种不同语义：

- `ResponseStore` 负责 API 协议链
- `SessionDB` 负责 Hermes 运行时正式会话链

这是一种很值得学习的分层克制。

---

## 9. 读完这一篇记住 4 点

把这几层看完，最值得记住的是下面四条。

### 9.1 不要按“都在存消息”来划边界，要按“谁在使用这份状态”来划边界

同样是一段历史：

- runtime 在意可搜索、可续接、可审计
- gateway 在意路由和 transcript 恢复
- ACP 在意活动 session 能不能还原
- API 协议在意 response 链能不能续上

数据像不像不是重点，服务对象才是重点。

### 9.2 共享账本可以只有一个，但入口层和协议层仍然应该保留自己的状态外壳

Hermes 不是没有共享底座。

它有 `SessionDB`。

但它也没有因此强迫：

- Gateway reset policy
- ACP `cwd` / cancel state
- Responses API chaining

都降级成同一种 SQLite 记录。

这就是工程上很成熟的“共用底座，不混语义”。

### 9.3 让最懂消息语义的那一层负责正式持久化

Hermes 里真正写正式会话账本的是 `AIAgent`，  
因为它最清楚：

- 哪些是新消息
- 哪些是历史回放
- 哪些字段要带 reasoning / tool metadata

这类边界如果放错层，重复写入和历史污染几乎是必然的。

### 9.4 兼容层不是脏东西，只要你清楚它为什么存在

很多人看到 JSONL transcript 或 response cache，会本能觉得“不够优雅”。

但 Hermes 的处理很现实：

- JSONL 解决迁移兼容和恢复防截断
- `ResponseStore` 解决协议兼容

只要边界清楚，这些层不是负担，反而是系统能平稳演进的关键缓冲带。

---

## 最后把持久化边界收住

Hermes 在会话持久化这件事上的成熟，不在于它有多少存储，而在于它没有把所有“历史”混成一个抽象。

它清楚地区分了：

- `SessionDB`：共享的正式会话账本
- gateway transcript：入口层 transcript 与兼容恢复层
- ACP session：编辑器入口的活动运行时会话
- `ResponseStore`：OpenAI Responses API 的协议状态链

它们彼此相关，但绝不是一回事。

这一篇最大的启发可以浓缩成一句话：

真正难的从来不是“把消息存下来”，而是分清哪些状态属于核心 runtime、哪些属于入口编排、哪些属于协议兼容。只有这条边界分清了，Agent 才不会在入口越来越多之后把整套会话系统缠成一团。
