# 附录 Z｜Gateway Agent Cache 专章：Hermes 为什么在消息平台里宁可缓存整颗 AIAgent，也不愿每条消息重建一次运行时

## 先把缓存整颗 Agent 的原因说透

很多人第一次做消息平台 Agent 时，都会本能写出一套很“干净”的结构：来一条消息，新建一个 agent/runtime，跑完一轮，立刻销毁。

Demo 里这样很常见，因为简单直观，也不需要管理太多状态。但 Hermes 在 gateway 里偏偏没有这样做。它在 `gateway/run.py` 里维护 `_agent_cache`，按 `session_key` 缓存整颗 `AIAgent`，让同一会话后续消息尽量复用同一个运行时骨架。

如果只从“代码整洁”看，这确实有点反直觉：为什么不每条消息都新建 agent？为什么要缓存一个看起来很重的运行时对象？会不会脏状态泄漏？

这一章就专门回答这个问题：

Hermes 为什么在消息平台场景里，宁可缓存整颗 `AIAgent`，也不愿每条消息都把运行时从头重建一次？

这一篇主要结合这些源码和测试文件来看：

- `gateway/run.py`
- `run_agent.py`
- `tests/gateway/test_agent_cache.py`

---

## 1. Hermes 最核心的判断：消息平台不是“一次请求”，而是“持续会话”

先把场景想清楚。

在 CLI 里，你可以把一次执行理解成：

- 我发一个任务
- agent 在当前进程里连续跑若干轮
- 跑完退出

但在 Telegram、Slack、Discord 这种 gateway 入口里，真实情况不是这样。

这里的交互更像：

- 同一个 session 会持续很多轮
- 用户每隔几秒、几分钟、几小时继续发消息
- 但从 Agent 的角度，这些消息仍然属于同一段会话上下文

这意味着一个很关键的工程判断：

- “每条消息都新建 agent”
- 和 “同一会话复用稳定运行时”

本质上不是两种代码风格，
而是两种不同的会话观。

Hermes 选择的是后者。

因为它认为在消息平台里，真正稳定的不是“单条消息”，而是：

- 该 session 对应的 system prompt
- 该 session 对应的工具定义
- 该 session 已冻结的记忆与运行时边界

只要这层稳定结构不变，就没必要每回合都重新造一遍。

---

## 2. `gateway/run.py` 已经把动机写得很直白：缓存 AIAgent 是为了保住 prompt cache

看 `gateway/run.py` 初始化 `_agent_cache` 的地方，注释几乎把答案直接写出来了：

- `Cache AIAgent instances per session to preserve prompt caching.`
- 如果每条消息都创建新的 `AIAgent`
- 就会每轮重建 system prompt（包括 memory）
- 从而打断 prefix cache
- 在支持 prompt caching 的 provider 上，成本可能高到约 `10x`

这段注释最值得认真读的地方在于：Hermes 缓存 agent 不是为了“少写几行代码”，也不是为了“对象复用更优雅”，而是一个非常现实的运行时成本策略。

这里最关键的是这句话：

- `rebuilding the system prompt (including memory) every turn`

它揭示了 Hermes 眼里的真正问题不是“对象重新创建”，
而是：

- 你一旦重建 agent
- 通常就会连 system prompt 一起重建
- 而 system prompt 一旦变化
- 前缀缓存就失效了

这就是为什么 Hermes 缓存的不是一个轻飘飘的 API client，
而是一整颗 `AIAgent`。

因为在 Hermes 的结构里，真正贵的不是“Python 对象实例化”本身，
而是这个实例背后绑定的那层稳定上下文：

- `_cached_system_prompt`
- tool schemas
- memory 参与后的 prompt 前缀
- 平台和 session 相关的运行时配置

Hermes 想保住的，正是这一整层。

---

## 3. 按 `session_key` 缓存，说明 Hermes 缓存的是“会话级运行时骨架”

还是在 `gateway/run.py` 里，`_agent_cache` 的 key 不是用户 ID、不是平台名、也不是模型名，而是：

- `session_key`

value 则是：

- `(AIAgent, config_signature_str)`

这说明 Hermes 的缓存粒度非常明确：

- 不是全局共享一个 agent
- 不是每个平台共享一个 agent
- 而是每个 session 各自拥有一颗稳定的 agent 内核

这背后的思想很重要。Hermes 既不把 Agent 看成“应用级单例”，也不把它看成“每次调用临时拼出来的对象”，而是看成某段会话生命周期里的稳定运行时容器。

这个容器内部冻结的是：

- 当前 session 已确定的 system prompt 快照
- 当前 session 已确定的工具模式
- 当前 session 已确定的平台级上下文边界

而不是所有东西都永远冻结。

所以你可以把 Hermes 这里的缓存理解成：

- 不是缓存“这次回答”
- 也不是缓存“这次 API 请求”
- 而是在缓存“这段会话此刻成立的运行时骨架”

这对学习 Agent 很重要。

很多初学者会把运行时状态粗暴地分成两类：

- 要么全持久化
- 要么全临时

Hermes 给出的工程化答案其实是第三类：

- 有一层状态既不是数据库长期事实
- 也不是单条消息临时变量
- 它属于 session 生命周期里的稳定层

`AIAgent` 缓存就是这层稳定层的承载体。

---

## 4. `_agent_config_signature(...)`：Hermes 到底认为什么变化值得重建 agent

缓存一旦存在，真正难的问题就来了：

- 什么时候还能继续复用？
- 什么时候必须丢弃旧 agent，重建新 agent？

Hermes 没有靠模糊判断，而是专门做了一个：

- `_agent_config_signature(...)`

这个函数的 docstring 说得很明确：

- 当 signature 变化时，丢弃缓存 agent 并重建
- 当 signature 不变时，复用缓存 agent
- 目的是 preserving frozen system prompt and tool schemas for prompt cache hits

也就是说，Hermes 不是“盲目缓存”，
而是在显式区分：

- 哪些变化会影响稳定前缀
- 哪些变化只是本轮调用参数

### 4.1 会进入签名的内容

从源码看，签名里包含：

- `model`
- `api_key` 的完整 `sha256` 指纹
- `base_url`
- `provider`
- `api_mode`
- `enabled_toolsets`
- `ephemeral_prompt`

这组字段非常有代表性。

因为它们几乎都属于：

- 一旦变化，就可能改变系统前缀或工具外形

例如：

- 模型变了，底层调用能力和 prompt/cache 行为可能都变
- provider / base_url / api_mode 变了，运行时路由已经不是同一个环境
- `enabled_toolsets` 变了，tool schema 就变了
- `ephemeral_prompt` 变了，system prompt 的稳定前缀也变了

最值得注意的是 `api_key` 的处理。

Hermes 没有偷懒只取前几个字符，
而是专门对完整 credential 做哈希。

源码注释解释得很清楚：

- 很多 OAuth/JWT token 共享相同前缀
- 如果只比较前缀，可能在认证切换后错误命中缓存

这说明 Hermes 在这里防的不是“理论风险”，
而是实际系统里很常见的 credential 误判问题。

### 4.2 被故意排除在签名之外的内容

更重要的是，Hermes 还明确写了：

- `reasoning_config excluded`
- 因为它是 per-message 设置
- 不影响 system prompt 或 tools

这一句其实比“包含哪些字段”更有教学价值。

它告诉你：

- 不是所有变化都值得重建 agent
- 只有会动到稳定层的变化，才值得付出重建代价

这就是一个非常典型的 Agent 工程思维：

- 先区分稳定层和瞬时层
- 再决定缓存边界和失效条件

如果你做 Agent 时没有这层区分，
最后通常只会得到两种坏结果之一：

- 要么过度重建，成本高得离谱
- 要么过度复用，脏状态开始串台

Hermes 想避免的正是这两个极端。

---

## 5. 复用 cached agent，不等于冻结一切状态

很多人看到“缓存整颗 AIAgent”后，第一个担心就是：那这个 agent 里的所有状态不都被锁死了吗？Hermes 的答案是否定的。

看 `gateway/run.py` 里命中缓存后的逻辑：

- 如果 `_sig` 一致，就取出 cached agent
- 但随后立刻继续设置一系列 per-message state

源码注释也写得很直接：

- callbacks、streaming、reasoning config 都是 per-message state
- 不应该 baked into cached agent constructor

后面实际更新的字段包括：

- `tool_progress_callback`
- `step_callback`
- `stream_delta_callback`
- `interim_assistant_callback`
- `status_callback`

这说明 Hermes 缓存的并不是“一切”，
而是明确只缓存：

- 那些应该跨 turn 保持稳定的部分

同时它仍允许每轮覆盖：

- 当前消息对应的 callback
- 当前消息对应的 streaming 行为
- 当前消息对应的 reasoning 配置

这点非常重要，因为它直接回答了一个最容易把人搞混的问题：“可复用运行时”和“不可变运行时”不是一回事。Hermes 更准确的做法是：冻结稳定骨架，更新回合局部状态。

---

## 6. `run_agent.py` 的 system prompt 缓存，是 gateway agent cache 的底层前提

如果你继续往下追，会发现 gateway 里这套设计并不是孤立的。

`run_agent.py` 本身就已经在强调：

- system prompt 应该 cached per session for prefix caching

源码注释写得非常明确：

- 第一次调用时构建 system prompt
- 后续调用复用
- 只有 context compression 等事件才会失效并重建

更关键的是，注释还专门提到一种消息平台场景：

- continuing session 时，如果每条消息都 fresh-create 一个 `AIAgent`
- 就应该优先从 session DB 读取上一次保存的 system prompt
- 而不是重新 build

原因也写得很清楚：

- 重新 build 会把磁盘里已经变化的 memory 再次读进来
- 但这些变化模型可能其实已经“知道了”
- 这样会导致 system prompt 漂移
- 从而打断 Anthropic prefix cache

这一步可以看成 gateway agent cache 的一个旁证。

也就是说，Hermes 在两个层面都在做同一件事：

### 6.1 在 `AIAgent` 内部

- 尽量冻结 system prompt

### 6.2 在 gateway 外层

- 尽量连承载这个 frozen prompt 的 agent 实例一起复用

这两层叠起来，才构成 Hermes 真正的 prompt-stable runtime。

---

## 7. `_evict_cached_agent(...)`：缓存不是永远正确，而是要被生命周期治理

一个成熟系统不能只有“怎么缓存”，还必须回答：

- 什么时候必须失效

Hermes 也正是这么做的。

`gateway/run.py` 里专门有：

- `_evict_cached_agent(session_key)`

docstring 很短，但已经点明了几个典型场景：

- `/new`
- `/model`
- 以及其他会让当前 session 稳定层变化的操作

继续看调用点，会发现 Hermes 对缓存生命周期是认真治理的。

### 7.1 reset / fresh start 时会驱逐

在 reset 旧 session 的流程里，Hermes 会先尝试：

- flush memory
- 关闭旧 agent 持有的工具资源

比如注释里明确提到：

- terminal sandboxes
- browser daemons
- background processes

然后才执行 `_evict_cached_agent(session_key)`。

这说明 Hermes 不是把缓存当作“一个普通 Python 引用”，
而是把它当作可能握着外部资源的运行时实体。

所以失效时不只是删字典项，
还要考虑：

- 资源释放
- 生命周期收尾

### 7.2 branch / switch session 时会驱逐

在创建 branch 并切换 session 的逻辑里，
Hermes 也会显式驱逐原 session_key 下的 cached agent。

因为这时虽然平台会话入口还是同一条线，
但底层已经切到一个新的 session lineage 了。

如果还继续复用旧 agent，
你复用的就不是缓存，
而是错误的上下文身份。

### 7.3 fallback 成功后有时也会驱逐

在消息处理后半段，Hermes 还会检查：

- 当前 cached agent 的 `model`
- 是否已经因为 fallback 跑到了非默认模型

如果这是一次成功 fallback，
而且不是用户显式 `/model` 切换，
Hermes 会驱逐缓存，
让下一条消息重新尝试主模型。

这里特别能看出 Hermes 的细腻之处：

- 失败场景不盲目驱逐，避免反复重建和重复初始化
- 成功 fallback 后才按策略重置缓存，让后续流量回到主线路径

这说明 Hermes 的缓存策略不是“命中就一直用”，
而是会跟着运行时治理策略一起调整。

---

## 8. 测试怎么证明：Hermes 缓存的是运行时骨架，而不是冻结一切

这一章如果只看实现，很容易变成“作者说了算”。

但 Hermes 在 `tests/gateway/test_agent_cache.py` 里，其实已经把这个设计意图测试化了。

### 8.1 驱逐是按 session 隔离的

`test_evict_does_not_affect_other_sessions`

验证的是：

- 驱逐 `session-A`
- 不应该影响 `session-B`

这说明缓存管理的边界单位确实是 session，
不是某个全局 agent 池。

### 8.2 `reasoning_config` 可以原地更新，不需要失效

`test_reasoning_config_updates_in_place`

这个测试特别关键。

它先创建一个 `AIAgent`，
然后模拟多次修改 `reasoning_config`，
接着验证：

- `agent.reasoning_config` 可以变化
- 但 `_cached_system_prompt` 不应因此失效

测试最后直接断言：

- 前后 prompt 是同一个对象

这几乎就是在给“稳定层 / 瞬时层分离”做单元测试。

### 8.3 system prompt 在 cache reuse 下必须保持冻结

`test_system_prompt_frozen_across_cache_reuse`

这个测试更直接：

- 第一次构建 prompt
- 手动挂到 `_cached_system_prompt`
- 第二次 turn 继续取
- 必须还是同一个对象

也就是说，Hermes 不是只在概念上说“保持前缀稳定”，
而是明确把“对象级别不变”作为验证目标。

### 8.4 callback 可以跨消息更新

`test_callbacks_update_without_cache_eviction`

这里验证的是：

- cached agent 上的 callback 可以换
- 不需要为此驱逐整个 agent

这进一步说明 Hermes 的缓存语义不是：

- 这个实例一旦进入缓存就完全不可碰

而是：

- 可以改 turn-local state
- 不能随便改稳定前缀层

这一组测试放在一起看，Hermes 想表达的意思已经非常清楚：

- 缓存的不是“静态死对象”
- 也不是“所有状态都共享”
- 而是“一个带稳定骨架、可换局部参数的运行时容器”

---

## 9. 读完这一篇记住 4 点

如果你是第一次系统性学习 Agent，这一章其实能提炼出 4 条非常值钱的工程原则。

### 9.1 不要把 Agent 只理解成“一次 LLM 调用的包装器”

真正能工作的 Agent，尤其是多轮会话型 Agent，
更像一个带生命周期的运行时。

它有：

- 稳定层
- 瞬时层
- 失效条件
- 资源回收逻辑

不是每条消息都“new 一个对象”就算设计完成了。

### 9.2 缓存之前，先想清楚你要保住的到底是什么

Hermes 缓存的目标不是对象本身，
而是：

- frozen system prompt
- tool schemas
- prompt cache 命中条件

如果你没有先定义“稳定层”，
缓存就只能变成碰运气。

### 9.3 不要把所有动态参数都塞进重建路径

Hermes 把 `reasoning_config`、callbacks、streaming 这类 turn-local state 留在每轮更新，
而不是动不动就重建整个 agent。

这背后的方法论是：

- 会影响前缀稳定层的变化，才进失效判断
- 只是本轮行为差异的变化，就原地更新

这会直接决定你的系统是不是又贵又脆。

### 9.4 生命周期治理和缓存命中同样重要

缓存不是越久越好。

只要发生：

- session reset
- session branch
- model switch
- 非预期 fallback 漂移

就必须敢于失效、重建、释放资源。

真正成熟的 Agent 运行时，从来不是“只会缓存”，
而是“知道什么时候该缓存，什么时候该丢掉”。

---

## 最后把网关缓存收住

Hermes 在 gateway 里缓存整颗 `AIAgent`，
表面看像是在做一个对象复用优化，
但顺着源码往下看，你会发现它真正要保住的是：

- session 级稳定 system prompt
- 稳定的 tool schemas
- 可命中的 prompt cache 前缀
- 与会话生命周期一致的运行时骨架

同时，它又没有把 cached agent 误做成“所有状态永远不变”的黑盒。

它非常明确地区分了两类东西：

- 会影响稳定前缀的配置
- 只影响当前消息的局部状态

前者进入 `_agent_config_signature(...)`，决定是否重建；
后者按消息原地更新，不破坏缓存命中。

所以这章最值得带走的，不是“也去写一个 agent cache”，而是更底层的认识：

一个真正进入工程现实的 Agent Runtime，必须先学会区分什么是会话级稳定层，什么是回合级瞬时层。Hermes 的 gateway agent cache，本质上就是这条原则在源码里的落地版本。
