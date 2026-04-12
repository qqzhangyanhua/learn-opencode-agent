# 附录 U｜Plugin Hook 注入边界专章：Hermes 为什么不开放 system prompt 给插件随便改

## 先把插件权限边界讲明白

很多人给 Agent 加插件系统时，最自然的想法通常是：

- 插件既然能参与运行时
- 那就让插件顺手改 system prompt
- 想加 guardrail 就加 guardrail
- 想加 recall 就加 recall
- 想加人格提示、语气偏好、临时规则，也都往 system prompt 里拼

这种设计一开始看起来很自由。

但只要系统稍微复杂一点，你马上就会遇到几个问题：

- 每个插件都能改 prompt，谁对 system prompt 拥有最终控制权？
- 多个插件都在拼动态上下文，prompt 前缀还稳不稳？
- 插件返回的是“长期规则”还是“当前回合上下文”？
- 这些动态内容该不该持久化进会话账本？

Hermes 在这里的态度非常明确：

- 插件可以参与 LLM 调用前的上下文构造
- 但插件不能把自己产出的动态内容直接并进持久 system prompt

它专门给插件留了一条受控通道：

- `pre_llm_call`

这条 hook 返回的 context 最终会被：

- 注入到当前 turn 的 user message

而不是：

- 改写 cached system prompt

所以这一篇附录想回答的问题是：

Hermes 为什么宁可把插件上下文统一塞到 user message 临时注入层，也不开放 system prompt 给插件随便改？

这一篇只回答插件 hook 的所有权问题。

- recall 为什么也走临时注入，但要额外做 memory fencing，详见附录 T
- `ephemeral_system_prompt` 为什么不是给插件留的后门，详见附录 V
- 上下文装配顺序本身，详见附录 W
- 注入了却不落盘的持久化边界，详见附录 Y

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `hermes_cli/plugins.py`
- `tests/hermes_cli/test_plugins.py`
- `tests/tools/test_voice_cli_integration.py`
- `tests/gateway/test_agent_cache.py`

---

## 1. Hermes 最核心的判断：插件提供的是“回合级上下文”，不是“内核级提示词所有权”

先把一件事想明白。

在 Hermes 这种已经进入运行时工程阶段的 Agent 里，
system prompt 不是一个大家都能随便拼字串的公共草稿纸。

它承载的是一整套系统级约束：

- agent identity
- tool guidance
- built-in memory frozen snapshot
- 外部 memory provider 的静态说明
- 平台级规则

这些东西之所以能稳定工作，前提就是：

- system prompt 的所有权必须清楚

Hermes 对这件事的回答非常直接。

在 `run_agent.py` 的注释里，它几乎把原则写成白话了：

- The system prompt is Hermes's territory

这句话特别重要。

因为它说明 Hermes 不是反对插件参与上下文，
而是反对插件去抢系统前缀的主导权。

换句话说，Hermes 的边界不是：

- 插件不能影响模型

而是：

- 插件可以提供当前回合上下文
- 但不能篡改内核稳定层

---

## 2. `pre_llm_call` 的设计已经说明：插件被允许参与“这一轮”，而不是永久改写“整场会话”

看 `run_agent.py` 里 `pre_llm_call` 这一段。

注释写得非常明确：

- Fired once per turn before the tool-calling loop
- 插件可以返回 `{"context": "..."}`
- 或者直接返回 plain string

这几句其实已经定义了插件上下文的本质：

- 它是 once per turn 的
- 它是当前回合前置补充
- 它不是会话级永久改造

后面代码也印证了这一点。

Hermes 会在每轮开始时：

- `invoke_hook("pre_llm_call", ...)`

传进去的参数也都是 turn-scoped 的：

- `session_id`
- `user_message`
- `conversation_history`
- `is_first_turn`
- `model`
- `platform`
- `sender_id`

这说明 Hermes 把 plugin hook 理解成：

- 让插件基于当前回合做判断

而不是：

- 让插件趁机永久修改核心 prompt

---

## 3. `hermes_cli/plugins.py` 里已经把规则写死了：插件 context 永远进 user message，不进 system prompt

如果说 `run_agent.py` 是实际执行位置，
那 `hermes_cli/plugins.py` 就是在插件框架层把这条规则正式写死了。

看 `PluginManager.invoke_hook(...)` 的注释：

- 对于 `pre_llm_call`
- callback 可以返回 dict 或 plain string
- Context is ALWAYS injected into the user message, never the system prompt
- 这样做是为了 preserving prompt cache prefix
- all injected context is ephemeral
- never persisted to session DB

这段注释其实就是 Hermes 对插件注入边界的正式宪法。

它已经把四件事说清楚了：

1. 插件可以返回上下文
2. 这段上下文只能去 user message
3. 这样做是为了保住 prompt cache prefix
4. 这段上下文是临时的，不持久化

这点非常值得初学 Agent 的人记住。

因为很多人做插件系统时，最容易忽略的不是“怎么调用插件”，  
而是：

- 插件产出的内容应该落在哪一层上下文里

Hermes 在这里是有明确答案的。

---

## 4. `run_agent.py` 的真正注入路径说明：插件上下文被明确限制在当前 user turn 的临时补充层

再看 `run_agent.py` 里的 API message 构造逻辑。

Hermes 会把插件 `pre_llm_call` 产出的内容收敛成：

- 当前 turn 的临时上下文
- 进入 user message augmentation 层
- 不进入 cached system prompt

这里最关键的不是“它和 recall 在同一层”，而是：

- 插件从设计上就没有拿到 system prompt 的写权限

为什么这比“开放插件改 prompt”更稳？

- 多个插件不会争抢最上层提示词所有权
- 每轮启停不同插件时，不会直接把前缀打漂
- 动态上下文和长期规则的边界更清楚
- 持久化时也更容易判断哪些只是瞬时材料

至于 recall 为什么也走临时注入、为什么还要额外做 fencing，这一层细节前文不重复展开，直接看附录 T。

---

## 5. `ephemeral_system_prompt` 和 plugin context 的区别，正好说明 Hermes 不是“完全禁止动态 system prompt”

这里有一个很容易误解的点。

有人可能会说：

- 可是 Hermes 不是也支持 `ephemeral_system_prompt` 吗？
- 那为什么插件就不能改 system prompt？

这个问题很好。

答案是：

- Hermes 不是反对一切动态 system prompt
- 它反对的是“不受控的插件任意改 system prompt”

### 5.1 `ephemeral_system_prompt` 是内核明确保留的受控入口

在 `run_agent.py` 里，最终 system message 组装时会做一件事：

- `effective_system = active_system_prompt`
- 如果有 `self.ephemeral_system_prompt`，再把它受控地 append 上去

这说明 `ephemeral_system_prompt` 是 Hermes 自己留给上层入口的白名单机制。

它不是插件自由写入，
而是内核认可的一种受控变体。

### 5.2 插件 context 没有这种权限

同一段代码旁边的注释已经把这点说透了：

- Plugin context from `pre_llm_call` hooks is injected into the user message
- NOT the system prompt
- 这是 intentional
- system prompt modifications break the prompt cache prefix

也就是说，Hermes 清楚地区分了两种动态性：

- 受核心运行时控制的 `ephemeral_system_prompt`
- 不受完全信任的插件 hook context

前者可以进入 system 层，
后者只能留在 user augmentation 层。

这就是权限边界。

---

## 6. `tests/hermes_cli/test_plugins.py` 也在强化同一件事：所有 `pre_llm_call` context 最终都路由到 user message，没有 `system_prompt` target

测试文件对这件事说得更直接。

`tests/hermes_cli/test_plugins.py` 里有一组专门测试 `pre_llm_call` 返回格式和路由逻辑。

它验证了这些行为：

- 插件返回 `{"context": "..."}` 会被收集
- 插件返回 plain string 也会被收集
- 多个插件的 context 会一起收集
- 最终 routing logic 里，所有结果都合并进 user message context string

其中有一句测试注释特别值得引用：

- There is no system_prompt target

这句话把 Hermes 的立场讲得不能更清楚了。

它不是“现在暂时没做 system_prompt target”，
而是：

- 整个路由设计就不打算开放这个 target

这是一种主动收缩自由度，换取运行时稳定性的做法。

---

## 7. `tests/tools/test_voice_cli_integration.py` 说明：连语音模式这种交互层附加指令，Hermes 也坚持不去改稳定 prompt

这个测试的价值，不在于再证明一次“动态上下文该落到哪一层”，而在于补出一条更一般的治理原则：

- 只要是交互层临时偏好，就优先走 user-side augmentation

voice mode 只是这个原则的一个旁证。

它说明 Hermes 对插件并不是特殊针对，而是在统一收紧所有会让 system 前缀漂移的入口。

---

## 8. 把结论压成 4 句

### 8.1 插件不应该拥有 system prompt 的所有权

插件可以贡献能力，
但不应该与内核争抢最上层提示词控制权。

否则系统很快会变成：

- 谁先加载谁说了算
- 谁后拼接谁覆盖别人

### 8.2 动态插件上下文更适合落在当前回合，而不是整个会话前缀

像 guardrail、recall、当前场景说明、交互偏好这类信息，
更像是：

- turn-scoped augmentation

而不是：

- session-scoped identity

### 8.3 自由度越大的地方，越需要硬边界

插件系统最容易失控，
所以最该被框死的恰恰是：

- 注入位置
- 持久化边界
- prompt 所有权

Hermes 通过“不开放 system_prompt target”把这条边界守住了。

### 8.4 Prompt cache 不是优化细节，而是架构约束

很多人会把“别改 system prompt”理解成一种性能小技巧。

Hermes 给出的更成熟答案是：

- 这不是小技巧
- 这是决定插件该落在哪一层上下文的架构约束

---

## 把结论收拢

Hermes 对 plugin hook 的处理，很像是在给可扩展性装护栏：

- 插件可以在 `pre_llm_call` 参与当前回合
- 可以返回 recall、guardrail、场景补充等 context
- 这些内容会被临时注入到当前 user message
- 但不会进入 cached system prompt，也不会持久化进 session DB

这背后的核心原则非常值得学习：

- 插件可以扩展 Agent
- 但不能破坏 Agent 内核对 prompt 边界的治理

对学习 Agent 的人来说，这一点很关键。

因为很多系统做着做着会发现，
真正难的从来不是“怎么让插件跑起来”，  
而是：

- 怎么让插件跑起来之后，系统仍然稳定、可缓存、可解释

Hermes 在这里给出的答案很硬，也很清楚：

- 动态插件上下文，去 user message
- 稳定系统前缀，留给 Hermes 自己
