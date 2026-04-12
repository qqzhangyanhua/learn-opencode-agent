# 附录 W｜多层上下文装配顺序专章：Hermes 一次 API 调用前，到底按什么顺序拼上下文

## 先看流水线，不先争论概念

很多人第一次读 Agent 源码时，都会下意识把“上下文”理解成一件很简单的事：

- 把 system prompt 放前面
- 把历史消息接后面
- 把当前用户消息放最后
- 发给模型

如果只是一个很小的聊天 Demo，这样理解没什么问题。

但 Hermes 这种已经进到运行时工程阶段的系统，真正发给模型的上下文远不止这三层。

一次 API 调用前，Hermes 可能同时要处理：

- session 级 cached system prompt
- `ephemeral_system_prompt`
- prefill few-shot
- conversation history
- 当前 user message
- external memory recall
- plugin `pre_llm_call` context
- reasoning 字段兼容
- strict API 清洗
- Anthropic prompt caching 标记

如果你不把这些层次拆开来看，很容易误解很多设计：

- 为什么有些内容会进 system prompt
- 为什么有些内容只能挂在 user message 后面
- 为什么有些东西看起来被“注入”了，却不会写进会话历史
- 为什么 Hermes 那么在意顺序，而不是“反正都给模型看见就行”

所以这一篇附录想回答的问题是：

Hermes 一次 API 调用前，到底按什么顺序拼上下文？每一层为什么必须在那个位置？

这一篇只回答装配顺序本身，不再分别证明每一层为什么存在。

- recall 为什么属于 turn-scoped 注入，详见附录 T
- 插件为什么不能改 system prompt，详见附录 U
- `ephemeral_system_prompt` 为什么是受控 overlay，详见附录 V
- 为什么某些注入内容不给 transcript / trajectory 落盘，详见附录 Y

这一篇主要结合这些源码来看：

- `run_agent.py`

---

## 1. Hermes 最核心的判断：上下文不是一个字符串，而是一条装配流水线

如果只看最终发出的 `api_messages`，你可能会觉得：

- 看起来不就是一组 messages 吗

但 Hermes 真正做的事情，其实更像工厂装配线。

因为它不是把所有内容无脑拼起来，
而是显式区分了两类层次：

### 1.1 session 级稳定层

这类内容的特点是：

- 尽量稳定
- 尽量缓存
- 不希望每轮都变化

典型就是：

- `_cached_system_prompt`

### 1.2 call 级临时层

这类内容的特点是：

- 只对当前调用生效
- 不该随便持久化
- 很多甚至不该进入 system prompt

典型就是：

- `ephemeral_system_prompt`
- prefill messages
- external recall
- plugin context

所以 Hermes 的上下文装配不是：

- 先有一个 prompt，再往里塞点东西

而是：

- 先构建稳定底座
- 再在单次调用时按规则叠加临时层

这就是整篇最重要的总线索。

---

## 2. 第一阶段：先构建 session 级稳定底座，也就是 `_cached_system_prompt`

真正的装配第一步，不是立刻构造 `api_messages`。

而是在 `run_conversation()` 里先决定：

- 这次调用要不要沿用现有 `_cached_system_prompt`
- 还是重新 build 一份

这一步非常关键。

因为 Hermes 不是每次调用都重建 system prompt。

它会优先复用：

- 已缓存的 `_cached_system_prompt`

甚至在 gateway continuation 场景里，还会优先从 session DB 里拿之前存下来的 system prompt snapshot，
避免因为磁盘上的 memory 或配置变化，导致当前会话的 system 前缀漂移。

这说明 Hermes 在上下文装配上先守的是：

- 稳定性优先

### 2.1 `_build_system_prompt()` 明确写了“Layers (in order)”

`run_agent.py` 里 `_build_system_prompt()` 的注释已经把第一阶段的顺序写得很清楚：

1. Agent identity
2. User / gateway system prompt
3. Persistent memory frozen snapshot
4. Skills guidance
5. Context files
6. Current date & time
7. Platform-specific formatting hint

这已经不是普通 Demo 的“一个 system prompt 字符串”，  
而是一套有明确装配顺序的稳定层。

### 2.2 真正的稳定层不只这些注释里的 7 层

如果继续看函数体，你会发现它实际还会再加一些东西：

- tool-aware behavioral guidance
- nous subscription prompt
- tool-use enforcement guidance
- provider/model-specific operational guidance
- built-in `MEMORY.md` / `USER.md` frozen snapshot
- external memory provider 的 static system prompt block
- skills system prompt
- context files prompt
- timestamp / session id / model / provider 信息

也就是说，Hermes 的第一阶段本质上是在做：

- session-scoped stable prompt assembly

这层内容一旦生成，就尽量不在每轮调用里乱动。

### 2.3 `ephemeral_system_prompt` 故意不进这一步

这里源码只需要你记住一句：

- 稳定底座先 build，临时 system overlay 后补

为什么 Hermes 要保留这条 overlay、它和插件/recall 的权限差别是什么，附录 V 已经单独展开，这里不再重复证明。

---

## 3. 第二阶段开始前，Hermes 先确定“这轮 messages 主体”是什么

有了稳定底座之后，Hermes 才开始准备当前调用的消息主体。

这一步从：

- `messages = list(conversation_history) if conversation_history else []`

开始。

也就是说，当前 API 调用的消息主体，一开始是：

- 过往 `conversation_history`

然后 Hermes 会把当前用户消息 append 进去：

- `messages.append({"role": "user", "content": user_message})`

并记录：

- `current_turn_user_idx`

这一点很重要。

因为后面所有“只注入当前回合 user message”的逻辑，
都依赖这个索引。

换句话说，Hermes 不是模糊地“在某个用户消息后面加东西”，  
而是明确知道：

- 哪一条才是当前 turn 的 user message

这让后续装配可以非常精确。

---

## 4. 第三阶段：在真正进入 tool loop 前，先准备本轮的临时上下文缓存

在进入主循环之前，Hermes 会先把这一轮需要的临时上下文准备好。

这里至少有两块：

### 4.1 plugin `pre_llm_call` context

Hermes 会先调用：

- `invoke_hook("pre_llm_call", ...)`

然后把返回的：

- `{"context": "..."}`
- 或 plain string

汇总成：

- `_plugin_user_context`

这一步发生在进入主 tool loop 之前，而且只做一次。

说明 Hermes 对插件上下文的定位是：

- 这是本轮的前置上下文
- 不是每次迭代都重新拉一遍

### 4.2 external memory provider prefetch

紧接着，Hermes 还会做：

- `_ext_prefetch_cache = self._memory_manager.prefetch_all(_query) or ""`

源码注释也写得很清楚：

- prefetch once before the tool loop
- 整个 turn 复用
- 避免每次 tool call 都重新 prefetch

这一步特别能体现 Hermes 的工程感。

因为它知道：

- recall 是昂贵的
- 而一个 turn 里可能有很多次模型迭代

所以 recall 的正确位置不是“每次都查”，
而是：

- 这一轮先查一次
- 然后缓存下来供整个循环复用

---

## 5. 第四阶段：开始构造 `api_messages`，但这时仍然不会先放 system

这一步很多人容易想错。

直觉上好像应该先把 system message 放进去，
然后再拼历史。

Hermes 不是这么写的。

它会先遍历 `messages`，把非 system 的会话主体一条条转成 `api_messages`。

这一步里，它会顺手做几件事：

- 复制每条消息，避免污染原始 `messages`
- 对 assistant 消息补 `reasoning_content`
- 去掉内部字段，比如 `reasoning`、`finish_reason`
- 必要时做 strict API 清洗

也就是说，Hermes 先装的是：

- 会话主体层

而不是一开始就把最终 system 放在最前面。

这让它可以先把“当前 user message 要不要加额外上下文”处理完。

---

## 6. 第五阶段：只在“当前 turn 的 user message”上叠加 recall 和 plugin context

这是整条流水线里最值得看的地方之一。

当遍历到：

- `idx == current_turn_user_idx`
- 并且 `role == "user"`

时，Hermes 会构造 `_injections`。

注入源有两个：

- `_ext_prefetch_cache`
- `_plugin_user_context`

### 6.1 external recall 会先包成 `<memory-context>`

如果 `_ext_prefetch_cache` 不为空，
Hermes 不会直接把它裸拼上去，
而是先：

- `build_memory_context_block(_ext_prefetch_cache)`

也就是包成 fenced memory context。

### 6.2 plugin context 直接作为同层 augmentation 追加

如果 `_plugin_user_context` 存在，
也会 append 到 `_injections` 里。

最终，如果 `_injections` 非空，
Hermes 才会做：

- `api_msg["content"] = 原 user 内容 + 注入块`

这说明一个非常关键的顺序原则：

- recall 和 plugin context 不是独立消息
- 它们是当前 turn user message 的 augmentation

也就是说，Hermes 认为这两类信息应该被模型理解成：

- 与当前 user request 同场出现的辅助背景

而不是：

- 独立的系统规则
- 或独立的新会话消息

### 6.3 为什么这一步必须发生在当前 user message 层，而不是 history 层

因为它们的语义本来就是：

- 只服务这一次请求

如果把它们塞进 history，
你会制造一种假象：

- 这些内容曾经真的在对话里出现过

如果把它们塞进 system，
又会把动态参考错误抬升成长期前提。

Hermes 选择的当前位置恰好最合理：

- 挂在当前 user message 后面

---

## 7. 第六阶段：等会话主体准备好后，才把最终 `effective_system` 放到最前面

当 `api_messages` 主体已经准备好之后，
Hermes 才开始构造最终的 system 层。

顺序是：

1. `effective_system = active_system_prompt or ""`
2. 如果有 `ephemeral_system_prompt`，就 append 上去
3. 如果最终非空，再把 system message prepend 到 `api_messages` 前面

也就是说，最终 system 层其实是：

- cached stable system prompt
- 再叠一层 ephemeral overlay

这一步再次说明 Hermes 的 system 不是一次 build 完事，
而是：

- 先 build stable base
- 再在 call-time 合成 effective system

---

## 8. 第七阶段：prefill messages 会插在 system 后、history 前

这一步也很容易被忽略。

Hermes 对 `prefill_messages` 的处理不是：

- 把它们混进 `messages`

而是明确在 API-call-time 插入。

源码写得很清楚：

- prefill messages right after the system prompt
- but before conversation history

具体做法是：

- 如果有 system，则 `sys_offset = 1`
- 然后把每条 prefill 插到 system 后面

这说明 Hermes 对 prefill 的理解是：

- 它既不是稳定 system 层
- 也不是用户真实历史
- 它是本轮调用的 few-shot priming 层

这个位置非常讲究。

因为如果放到太前面，它会和 system 混层；
放到太后面，它又会看起来像真实历史消息。

Hermes 把它放在：

- system 后、history 前

本质上是在告诉模型：

- 这是调用前提供的示例上下文，不是已经发生过的真实对话主线

---

## 9. 第八阶段：最后再做 provider 级后处理，比如 Anthropic prompt caching 标记

等消息整体顺序都定了之后，
Hermes 还会再做一些 provider-specific 的后处理。

例如：

- `apply_anthropic_cache_control(api_messages, ...)`

注意这里的顺序也很值得学。

Hermes 是在：

- system
- prefill
- history
- 当前 user augmentation

这些结构都排好以后，
才去打 cache control 标记。

这说明 provider 级优化不是上下文装配的主体，
而是装配完成后的最后一层协议处理。

不要把这两件事混在一起。

---

## 10. 把整条流水线压缩成一句话，Hermes 的真实拼接顺序到底是什么

如果把上面这些步骤压缩成一个更容易记忆的顺序，
Hermes 一次 API 调用前大致是在做下面这条流水线：

### 10.1 先准备 session 级稳定底座

- 复用或构建 `_cached_system_prompt`

### 10.2 再准备本轮消息主体

- 载入 `conversation_history`
- append 当前 user message

### 10.3 再准备本轮临时上下文缓存

- 收集 `pre_llm_call` plugin context
- 做 external memory prefetch

### 10.4 再构造 `api_messages` 主体

- 遍历 history + 当前 user
- 清洗内部字段
- 只在当前 user message 上叠加 recall 和 plugin context

### 10.5 再把 system 层 prepend 上去

- `effective_system = cached system + ephemeral system`

### 10.6 再插入 prefill few-shot

- 位置在 system 后、history 前

### 10.7 最后做 provider-specific 后处理

- 比如 Anthropic cache control

这条顺序不是随便写的，
而是 Hermes 整套上下文边界设计的外化结果。

---

## 11. 把顺序压成 4 句

### 11.1 先分“稳定层”和“临时层”，再谈上下文拼接

不要一上来就想：

- 我把哪些消息放前面放后面

更重要的是先问：

- 哪些内容应该 session 级稳定
- 哪些内容只属于这次调用

### 11.2 动态参考信息最好挂在当前 user turn，而不是抬升成 system

recall、plugin context 这种东西，
更适合做当前请求的 augmentation，
而不是长期规则。

### 11.3 few-shot prefill 既不是 system，也不是 history

它应该有自己明确的位置：

- system 后
- history 前

### 11.4 provider-specific 优化应该放在最后

先把语义层装好，
再做协议层标记和 provider 兼容。

不要反过来。

---

## 用一句话收尾

Hermes 一次 API 调用前，并不是简单把：

- system
- history
- user

拼起来就结束。

它真正做的是一条多阶段装配流水线：

- 先构建并冻结 session 级稳定底座
- 再准备当前回合的消息主体
- 再拉取 plugin 和 memory recall 这类临时上下文
- 再只对当前 user message 做 augmentation
- 再叠加 `ephemeral_system_prompt`
- 再插 prefill
- 最后做 provider-specific 后处理

对学习 Agent 的人来说，这一层特别值得反复看。

因为很多系统做不好上下文，不是因为“模型不够强”，  
而是因为：

- 根本没把上下文当成一条有层次、有顺序、有边界的装配流水线

Hermes 在这里给出的答案很清楚：

- 上下文不是堆料
- 上下文是装配
