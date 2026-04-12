# 附录 X｜Prompt Cache 专章：Hermes 为什么很多边界设计，最后都指向“前缀稳定”

## 先看总约束，而不是单点技巧

如果你连续读完前面几篇附录，会发现 Hermes 反复在做一些看起来有点“别扭”的设计：

- memory 写盘后不立刻重建 system prompt
- external recall 不并回 system prompt
- plugin context 不开放 `system_prompt` target
- `ephemeral_system_prompt` 单独分层，不进入 `_build_system_prompt()`
- gateway 会尽量复用同一个 `AIAgent`
- continuing session 优先复用已存的 system prompt snapshot

如果只孤立看这些设计，很容易觉得 Hermes 有点过度克制。

但一旦把它们放到同一个目标下，这些选择就突然连起来了。

那个目标就是：

- 让 prompt 前缀尽量稳定
- 让 prompt cache 尽量命中

所以这一篇附录想回答的问题是：

Hermes 为什么很多运行时边界设计，最后都会收束到同一个工程目标上，也就是“前缀稳定”和“缓存命中”？

这一篇是总论。

- recall 的细节放在附录 T
- 插件上下文的权限边界放在附录 U
- 临时 system overlay 的边界放在附录 V
- 装配顺序放在附录 W
- 给模型看但不落盘的语义边界放在附录 Y

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `agent/prompt_caching.py`
- `gateway/run.py`
- `tests/agent/test_prompt_caching.py`
- `tests/run_agent/test_run_agent.py`
- `tests/gateway/test_agent_cache.py`

---

## 1. Hermes 最核心的判断：Prompt Cache 不是性能小技巧，而是运行时架构约束

很多人对 prompt cache 的理解还停留在：

- 命中缓存能省点钱
- 没命中也就是贵一点

Hermes 显然不是这么看。

在这个项目里，prompt cache 更像一种倒逼架构收敛的约束。

因为只要系统真的想吃到：

- Anthropic prompt caching
- 类 OpenAI 的前缀缓存收益

那它就必须回答一个比“怎么打 cache 标记”更前面的问题：

- 哪些前缀内容必须稳定？

也正因为如此，Hermes 才会把很多边界设计都朝同一个方向收紧：

- 不让 mid-session memory 写入改动 cached system prompt
- 不让动态 recall 侵入 system 层
- 不让插件随便改 system prompt
- 不让 gateway 每条消息都新建一个 agent 再重建 prompt

换句话说，Hermes 不是先有缓存实现，再补规则。

更接近事实的说法是：

- 它为了保住缓存收益，反过来塑造了很多运行时边界

---

## 2. `run_agent.py` 里已经把这件事明说了：system prompt 要 stable across turns，才能 maximize prefix cache hits

看 `_build_system_prompt()` 的 docstring。

里面有一句非常关键的话：

- system prompt is stable across all turns in a session, maximizing prefix cache hits

这句话其实就是 Hermes 的官方态度。

它不是说：

- system prompt 稳定一点更优雅

而是说：

- 之所以要稳定，是为了最大化 prefix cache hits

这一下就把“提示词设计”和“运行时成本”连在一起了。

### 2.1 `_cached_system_prompt` 的存在，本身就是缓存导向设计

Hermes 在 agent 实例上明确维护：

- `self._cached_system_prompt`

它不是每次调用临时生成完就丢，
而是：

- session 内尽量复用

这说明 Hermes 不是把 system prompt 当作一段可随意重建的文本，
而是把它当作：

- 会被长期复用的稳定前缀对象

### 2.2 继续会话时优先复用 SQLite 里存的 snapshot，也是为了同一个目标

`run_conversation()` 里的注释写得更直接。

对于 continuing session：

- 如果重建 system prompt
- 会把磁盘上已经变化的 memory 重新带进来
- 模型其实上一轮已经知道这些变化
- 但 prompt 前缀会因此改变
- 从而 breaking the Anthropic prefix cache

这段逻辑特别值得学习。

因为它说明 Hermes 不是机械地认为“磁盘最新状态就一定最好”。

它在做一个更成熟的取舍：

- 当前会话里，前缀一致性比“把磁盘上的最新 memory 立刻重新拼进去”更重要

这就是缓存约束反向塑造架构边界的典型例子。

---

## 3. `gateway/run.py` 更是把缓存收益直接量化了：不复用 agent，会贵到夸张

看 `gateway/run.py` 初始化 agent cache 的注释。

里面几乎把结论直接写出来了：

- Cache AIAgent instances per session to preserve prompt caching
- 如果每条消息都新建 AIAgent
- system prompt（包括 memory）就会每回合重建
- prefix cache 会被打断
- 在 Anthropic 这类支持 prompt caching 的 provider 上，成本可能高约 10 倍

这不是抽象原则了，
这是非常实打实的工程结论。

也就是说，在 Hermes 看来：

- session 级 agent cache 不只是“少做点初始化”
- 它直接关系到 prompt cache 能不能持续命中

这也解释了为什么 gateway 要维护：

- `_agent_cache`

而不是每来一条消息就随手重建一个 agent。

---

## 4. `agent/prompt_caching.py` 说明：真正的缓存实现其实很简单，难的是让前缀配得上这套实现

很多人会以为 prompt caching 最复杂的部分在打标记。

但你看 `agent/prompt_caching.py` 会发现，真正的标记逻辑其实并不复杂。

文件头已经把策略写得很清楚：

- Anthropic prompt caching
- `system_and_3` strategy
- 4 个 cache_control breakpoints
- system prompt + last 3 non-system messages

也就是说，缓存策略本身反而是清楚而克制的：

1. system prompt
2. 最近 3 条非 system 消息

这说明 Hermes 的难点根本不在于：

- 会不会打 `cache_control`

而在于：

- system prompt 能不能尽量稳定
- 最近消息的结构能不能尽量协议化、可复用

换句话说，缓存实现很薄，
但为了让这层“薄实现”真正发挥收益，
Hermes 才需要前面那一整套厚边界设计。

### 4.1 测试文件也在强调“最多 4 个 breakpoints”和不同格式兼容

`tests/agent/test_prompt_caching.py` 里验证了很多细节：

- 空消息不崩
- 返回 deep copy，不污染原始 messages
- system message 会拿到 marker
- 只给最后 3 条非 system 消息打标
- TTL 可以切换成 `1h`
- 总 breakpoints 数不会超过 4
- tool message 在 native Anthropic 和 OpenRouter 路径上的处理不同

这些测试都说明：

- cache_control 注入本身是一个清晰的小模块

所以更值得学习的反而不是这几十行代码，
而是 Hermes 为了让这几十行真正有意义，如何治理整条上下文装配链。

---

## 5. 为什么 memory、recall、plugin context 那些看似分散的规则，本质上都在保护同一个东西

前几篇附录已经分别把这些边界拆开讲过：

- built-in memory 为什么要 frozen snapshot
- recall 为什么只做 API-call-time 临时注入
- plugin context 为什么只进 user message
- `ephemeral_system_prompt` 为什么单独分层

这一篇不重复证明每一条，只做一次总收束：

- 它们看起来分散，实际上都在保护同一件事
- 不要让 system 前缀在 session 内频繁变化

换句话说，这些边界不是各自为政的局部技巧，而是同一个缓存目标向不同模块施加的纪律。

---

## 6. Hermes 甚至连一些你想不到的小地方，都在避免“让前缀无谓变化”

这个项目里有些很细小的实现，看起来和 prompt cache 没什么关系，
其实也在守同一个原则。

### 6.1 确定性的 tool call id

看 `run_agent.py` 的 `_deterministic_call_id(...)` 注释。

它直接写了：

- random UUIDs would make every API call's prefix unique
- breaking OpenAI's prompt cache

这特别有代表性。

因为它说明 Hermes 连 tool call id 这种细节都意识到：

- 只要 prefix 里混进随机性，缓存就会被破坏

所以它宁可用：

- 基于函数名、参数、index 算出来的 deterministic id

也不愿意随手生成随机 UUID。

这就是一个非常典型的“缓存约束渗透到低层实现细节”的例子。

### 6.2 Qwen portal 的 system message cache marker 处理

`run_agent.py` 里 `_qwen_prepare_chat_messages(...)` 也会专门：

- normalize content
- 在 system message 的最后一个 part 上加 `cache_control`

这说明即便不同 provider 的消息格式不同，
Hermes 关心的还是同一件事：

- 能不能把系统前缀正确变成 provider 可缓存的形态

---

## 7. 测试文件实际上也在从不同角度重复验证“前缀冻结”

### 7.1 `tests/run_agent/test_run_agent.py`

这里有一组专门测试 system prompt stability 的逻辑。

它验证了：

- continuing session 且 DB 有 stored prompt 时，应优先复用 stored prompt
- first turn 没 history 时，才 fresh build

这本质上是在验证：

- 优先复用现成稳定前缀，而不是动不动重建

### 7.2 `tests/gateway/test_agent_cache.py`

这里又验证了：

- cached agent 的 system prompt 跨 turn 保持同一个对象
- reasoning config 的变化不应导致 system prompt cache 失效

这说明在 Hermes 里，
很多 per-message 变化都不应该轻易上升成：

- 需要推翻 `_cached_system_prompt`

### 7.3 `tests/tools/test_voice_cli_integration.py`

这个测试虽然表面上讲的是 voice mode，
但它背后验证的仍然是：

- voice instruction 应该走 user-side prefix
- 不要改 system prompt
- 因为改 system prompt 会 break prompt cache

这等于从交互层再次印证了同一原则。

---

## 8. 最后只记 4 条

### 8.1 Prompt Cache 会反向决定你的上下文架构

不是“先自由设计上下文，最后顺手做缓存”。

更真实的顺序往往是：

- 想吃到缓存收益
- 就必须先把上下文边界设计对

### 8.2 稳定前缀比“永远最新”更重要

在一个活跃 session 里，
并不是所有“最新状态”都应该立刻进 system prompt。

很多时候，前缀稳定性更值钱。

### 8.3 随机性是缓存的大敌

不仅是 prompt 文本会破坏缓存，
连 prefix 里混进随机 id、随机顺序、随机格式变化，也会破坏缓存。

### 8.4 真正成熟的 Agent，会把缓存收益变成边界纪律

当一个系统开始认真看待 prompt cache，
它就会自然长出一套纪律：

- 什么能进稳定层
- 什么只能做临时层
- 什么不能持久化
- 什么必须 deterministic

Hermes 正是这种系统。

---

## 把总论收住

Hermes 对 prompt cache 的态度，不是“支持一下 Anthropic 的某个特性”这么简单。

它真正做的是：

- 把前缀稳定性提升成运行时设计目标

也正因为如此，你才会在 Hermes 里看到那么多看似分散、其实同源的边界设计：

- frozen memory snapshot
- stored system prompt reuse
- session 级 agent cache
- plugin context 只进 user message
- recall 不进 system 层
- `ephemeral_system_prompt` 单独分层
- deterministic tool call id

对学习 Agent 的人来说，这一层非常值得记住。

因为很多系统最后贵、慢、飘，不是因为模型差，
而是因为：

- 前缀根本不稳定
- 缓存无从命中
- 上下文边界也因此越做越乱

Hermes 在这里给出的答案很明确：

- 缓存不是附属优化
- 缓存是架构纪律
