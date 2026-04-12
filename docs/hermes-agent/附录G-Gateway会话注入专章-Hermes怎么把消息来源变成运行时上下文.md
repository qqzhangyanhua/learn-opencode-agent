# 附录 G｜Gateway 会话注入专章：Hermes 怎么把消息来源变成运行时上下文

## 先看消息来源怎么变成上下文

很多人第一次做消息平台版 Agent，处理入口消息时的思路通常都很直接：

- 收到一条消息
- 取出文本
- 发给模型
- 把模型回复再发回去

如果只是做一个单平台 Bot，这样确实能跑。

但 Hermes 这种已经支持多平台、多线程、多会话策略的系统，显然不能只把消息当成一段文本。

因为在真实运行里，文本之外还有很多同样重要的问题：

- 这条消息来自 Telegram、Discord、Slack 还是本地 CLI
- 是私聊、群聊、频道还是 thread
- 它属于哪个 session
- 当前这个平台有哪些能力限制
- 以后 cron 或后台任务该把结果送回哪里
- 如果上一个 session 因空闲或日切自动重置了，模型要不要知道

所以这一篇附录想回答的问题是：

Hermes 怎么把“消息来源”从一段运输信息，变成 Agent Runtime 里的正式上下文？

这一篇主要结合这些源码和测试文件来看：

- `gateway/session.py`
- `gateway/run.py`
- `tests/gateway/test_session.py`
- `tests/gateway/test_session_reset_notify.py`
- `tests/gateway/test_session_info.py`

---

## 1. Hermes 最重要的判断：来自不同平台的消息，不应该只在 transport 层被区分

先看 `gateway/session.py` 文件头。

这个文件一开头就写得很直接：

- session context tracking
- session storage
- reset policy evaluation
- dynamic system prompt injection

这四句话其实已经说明 Hermes 的整体思路了。

它并不把 Gateway 理解成一个“把消息转发给模型”的总线，  
而是把它理解成一个：

把消息源结构化、会话化、上下文化的运行时前置层。

这点非常关键。

因为一旦系统开始支持多平台，多入口的复杂性就不会只停留在 adapter 层。

对 Hermes 来说，平台差异最终必须落进三类运行时事实：

- 这是哪来的消息
- 它属于哪个会话
- 模型此刻应当如何理解这个入口的限制与投递路径

所以 Hermes 在 Gateway 里真正治理的，不是 transport，而是会话语义。

---

## 2. `SessionSource` 的价值，不是记几个字段，而是把“消息来自哪里”正式建模

看 `gateway/session.py` 里的 `SessionSource`。

它把一条消息的来源拆成了这些字段：

- `platform`
- `chat_id`
- `chat_name`
- `chat_type`
- `user_id`
- `user_name`
- `thread_id`
- `chat_topic`

这一步非常值得学智能体的人认真看。

因为很多系统在做消息入口时，只会保留一个“来源平台 + 文本”。  
但 Hermes 明显在强调：

一条消息真正的来源，不只是平台名，而是一份结构化来源描述。

这意味着 Hermes 后面可以基于这份结构化来源，做很多本来做不了的事：

- 用 `chat_type` 区分 DM / group / channel / thread
- 用 `thread_id` 区分同一群里的不同线程
- 用 `chat_topic` 把频道主题直接告诉模型
- 用 `user_id` / `user_name` 参与 session key 构造
- 用 `chat_id` 为后续回复和定向投递保留锚点

`tests/gateway/test_session.py` 里也专门验证了这些字段的 roundtrip：

- `thread_id` 能不能在 `to_dict / from_dict` 后保留
- `chat_topic` 会不会丢
- 数字型 `chat_id` 会不会被规范成字符串
- 缺失字段时默认值是否一致

这说明 Hermes 没把 `SessionSource` 当临时对象，而是把它当成后续会话系统、投递系统和 prompt 注入系统共同依赖的基础模型。

---

## 3. `build_session_key()` 在 Hermes 里做的，不是拼字符串，而是在定义“什么叫同一个会话”

这篇里最值得细看的函数之一，就是 `build_session_key(...)`。

很多初学者会把 session key 理解成一个工程小细节：

- 随便拼一下平台和用户 ID

但 Hermes 在这里做得明显更认真。

它对不同场景给了不同规则。

### 3.1 DM 逻辑

DM 的规则是：

- 优先用 `chat_id`
- 如果有 `thread_id`，则进一步细分
- 没有 `chat_id` 时，才退到 `thread_id`

这说明 Hermes 很清楚，私聊会话的隔离单位首先是“这段私聊本身”。

### 3.2 Group / Channel / Thread 逻辑

Group 和 channel 的规则更有意思：

- `chat_id` 是父级会话容器
- 是否按用户隔离，要看 `group_sessions_per_user`
- 如果有 `thread_id`，默认线程内共享 session
- 只有显式开启 `thread_sessions_per_user`，线程里才会重新按人拆开

这一步特别有工程味。

因为它说明 Hermes 已经在认真回答一个很现实的问题：

在群聊和线程里，到底什么才算“同一个对话”？

这个问题没有标准答案，但 Hermes 给出了一个很成熟、很符合实际体验的默认：

- 普通群聊，默认按人隔离，避免互相串上下文
- thread 里，默认共享，贴近“围绕同一话题协作”的真实体验

`tests/gateway/test_session.py` 里有大量测试都在守这件事：

- Telegram DM 不同 `chat_id` 必须是不同 session
- Discord group 默认按用户隔离
- 关闭隔离后，同群用户共用 session
- Telegram 群线程默认共享 session
- 显式开启 `thread_sessions_per_user` 后，线程内可以按用户拆开
- Discord thread 默认共享 session

这些测试的价值非常大。

因为它们在固定的不是一个 key 格式，而是：

Hermes 对“会话边界”这件事的产品判断。

---

## 4. `SessionStore` 管的不是一份聊天索引，而是一套会话生命周期

继续看 `SessionStore`，你会发现它做的事情远不只是“存个 session_id”。

`SessionEntry` 里除了基础的：

- `session_key`
- `session_id`
- `created_at`
- `updated_at`

还会记录：

- `origin`
- `display_name`
- `platform`
- `chat_type`
- token 统计
- `last_prompt_tokens`
- `was_auto_reset`
- `auto_reset_reason`
- `reset_had_activity`
- `memory_flushed`
- `suspended`

这说明 Hermes 其实已经把 session 看成一个有状态生命周期对象，而不是一个简单映射表。

### 4.1 reset policy 是会话系统的一部分

`SessionStore._should_reset(...)` 和 `_is_session_expired(...)` 都在做同一类事情：

- 看当前 reset policy
- 判断是 idle reset、daily reset 还是不重置
- 如果 session 还有后台进程，则不能算过期

这说明在 Hermes 里，session 不是永远续着，也不是每次都新开。

它是一个被策略管理的生命周期实体。

`tests/gateway/test_session_reset_notify.py` 里也专门验证了：

- `_should_reset()` 返回的不是 bool，而是 `"idle"` 或 `"daily"` 这样的具体原因
- 新 session 会把 `was_auto_reset`、`auto_reset_reason`、`reset_had_activity` 带上

这一步特别成熟。

因为它说明 Hermes 并不满足于“系统自己悄悄重开一个 session”，而是想把“为什么重开”这件事也做成显式可感知状态。

### 4.2 `has_any_sessions()` 说明 Hermes 已经考虑到“历史 session 不该被内存映射误导”

`tests/gateway/test_session.py` 里关于 `has_any_sessions()` 的测试也很值得看。

它专门在守一个比较隐蔽的问题：

- 内存里的 `_entries` 只看到当前 key 对应的 entry
- 但 SQLite 里可能已经有很多历史 session 记录

所以 Hermes 选择用数据库的 `session_count()` 来判断“是不是第一次使用”，而不是只看内存字典长度。

这类细节其实特别说明系统成熟度。

因为它代表 Hermes 已经不再按“当前对象里有几个 entry”这种表面视角来思考，而是在按：

用户历史上究竟有没有经历过会话

这样的真实语义来思考。

---

## 5. `build_session_context_prompt()` 最关键的价值，是把消息来源翻译成模型能理解的运行时描述

如果说前面几层还偏数据建模，那么 `build_session_context_prompt(...)` 就是 Gateway 会话注入真正落到模型身上的地方。

这个函数会把 `SessionContext` 翻成一段结构化提示，告诉模型：

- 当前来源是什么
- 当前用户是谁
- 是否是多用户 thread
- 哪些平台已经连接
- 有哪些 home channels
- 计划任务有哪些默认投递路径
- 某些平台有哪些能力限制

这一步非常关键。

因为模型并不能直接理解 Python 对象。  
Gateway 必须把这些对象翻译成可执行提示的一部分。

### 5.1 平台限制不是靠模型自己猜

这个函数里专门对 Slack、Discord 注入 platform notes：

- 你不能搜索频道历史
- 你不能 pin 消息
- 你不能管理角色或频道

这说明 Hermes 没把“平台限制”留给模型自己猜。

它在明确告诉模型：

你在这个入口里能做什么，不能做什么。

`tests/gateway/test_session.py` 里也专门验证了：

- Discord prompt 里是否出现 “cannot search”
- Slack prompt 里是否出现 “pin” 等限制说明

这说明 Hermes 对这层上下文是当契约来维护的。

### 5.2 多用户 thread 的语义也会进 prompt

这个函数还有一个很成熟的设计：

如果当前是非 DM 且带 `thread_id` 的共享线程，它不会把某个固定用户写死在 system prompt 里，  
而是明确写：

- 这是 multi-user thread
- 消息会带 `[sender name]` 前缀
- 多个用户可能参与

这点非常重要。

因为如果在共享线程里把“当前用户”钉死，prompt cache 和会话语义都会被破坏。

Hermes 在这里其实是在同时保护两件事：

- 会话语义正确
- prompt 前缀稳定

这就是 Runtime 级思维。

### 5.3 `chat_topic` 也会被注进来

`chat_topic` 看起来是一个小字段，但 Hermes 也专门把它注入 prompt。

`tests/gateway/test_session.py` 里就有针对 Discord channel topic 的测试：

- 主题存在时，要进入 prompt
- 不存在时，不该平白多出这一行

这件事的意义在于：

Hermes 不是只让模型知道“这是哪个频道”，还尽量让模型知道“这个频道是干什么的”。

这会直接影响模型对上下文氛围和输出方式的判断。

---

## 6. 在 `gateway/run.py` 里，会话注入不是附加功能，而是 agent 创建前的必经步骤

再看 `gateway/run.py` 的实际运行路径，就更清楚这一点了。

消息处理过程中，Hermes 会按这个顺序做几件关键事：

1. `session_store.get_or_create_session(source)`
2. `build_session_context(source, self.config, session_entry)`
3. `_set_session_env(context)`
4. `build_session_context_prompt(context, redact_pii=...)`
5. 如果发生 auto-reset，再拼一个 system note
6. 把 `context_prompt` 和用户配置的 ephemeral prompt 合并
7. 最后以 `ephemeral_system_prompt=combined_ephemeral` 创建 `AIAgent`

这条链路非常值得认真看。

因为它说明：

Gateway 会话注入不是在模型回复之后做补充，也不是 adapter 的某个旁支逻辑。

它是 Agent 运行前的正式装配步骤。

也就是说，Hermes 在 gateway 模式下其实是在做一件很明确的事：

每条消息进入模型前，先把它重新组装成“带来源语义的运行时输入”。

这就是为什么 Hermes 的 gateway 不是“多平台聊天壳”，而是“多平台运行时入口”。

---

## 7. auto-reset notice 这件事，特别能体现 Hermes 的会话观

`gateway/run.py` 里有一段很值得讲的逻辑：

如果 `session_entry.was_auto_reset` 为真，Hermes 会在 context prompt 前面再拼一段 system note。

例如：

- 因空闲自动过期
- 因 daily schedule 自动重置
- 因 suspended 状态重开

这一步为什么很重要？

因为它说明 Hermes 不想让模型误以为：

- 这是上一段会话自然延续出来的下一条消息

相反，它想明确告诉模型：

- 现在是一个 fresh conversation
- 之前的上下文已经断开

这件事看起来只是体验细节，其实非常关键。

因为一旦 session 自动重置而模型不知情，就很容易出现：

- 模型还在假设自己记得上次讨论
- 结果实际 session 已经是新的

Hermes 通过这段 system note，把“会话生命周期变化”显式地同步给模型。

这就是为什么它更像一个 Runtime，而不是一个消息转发器。

---

## 8. 对学习智能体的人来说，这一篇最值得提炼的是四个原则

### 8.1 消息来源必须被结构化，而不是只保留文本

平台、chat_id、thread_id、chat_topic、user 信息，这些都不是 transport 噪音。  
它们本身就是运行时上下文。

### 8.2 会话 key 的设计，本质上是在定义“什么算同一段对话”

这是产品问题，也是运行时问题。

Hermes 用 `build_session_key()` 明确把这件事做成了可测试契约。

### 8.3 平台限制和投递路径应该进入 prompt，而不是靠模型猜

Slack 不能 search，Discord 不能管理频道，计划任务可以投到 origin 或 home channel。  
这些都应该被系统显式注入。

### 8.4 会话生命周期变化要同步给模型

auto-reset、fresh conversation、shared thread 这些信息，如果模型不知道，会话语义就会错位。

Hermes 在这件事上做得很清楚。

---

## 9. 最后把注入路径收一下

基于当前 hermes-agent 仓库里的这些源码和测试，我认为 Hermes 对 Gateway 会话注入的理解，可以概括成一句话：

它不是把多平台消息转成一段文本发给模型，而是先把消息来源、会话边界、平台限制、投递路径和生命周期状态装配成一段运行时上下文，再交给 Agent。

这个判断，主要来自这些非常具体的源码事实：

- `gateway/session.py` 通过 `SessionSource`、`SessionContext`、`SessionEntry` 把来源、会话和生命周期正式建模
- `build_session_key()` 明确区分 DM、group、thread 的会话边界，并把这些规则写成可测试契约
- `SessionStore` 不只是映射 session_id，还管理 reset policy、auto-reset reason、token 状态和历史 session 语义
- `build_session_context_prompt()` 会把平台限制、connected platforms、home channels、delivery options、channel topic 和 shared-thread 提示注进模型上下文
- `gateway/run.py` 会在创建 `AIAgent` 前，把这些信息组装成 `ephemeral_system_prompt`
- auto-reset 时还会额外注入 fresh-conversation note，避免模型误以为上下文还连续
- `tests/gateway/test_session.py`、`test_session_reset_notify.py`、`test_session_info.py` 则把这些会话语义和注入行为固定了下来

所以，如果你在学智能体，这一篇最该记住的一句话就是：

真正成熟的多平台 Agent，不是“能接很多消息入口”，而是能把每个入口背后的来源语义，稳定地翻译成一段模型真正能理解、也真正会影响运行时决策的会话上下文。
