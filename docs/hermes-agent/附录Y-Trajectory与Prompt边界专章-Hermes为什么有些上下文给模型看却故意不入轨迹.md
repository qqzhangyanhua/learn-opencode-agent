# 附录 Y｜Trajectory 与 Prompt 边界专章：Hermes 为什么有些上下文给模型看，却故意不入轨迹

## 先把“看见”和“落盘”分开

很多人做 Agent 时，会默认一个看起来很自然的假设：

- 只要某段内容给模型看过
- 那它就应该被原样写进会话 transcript
- 也应该被原样保存进 trajectory

但 Hermes 明显不是这么做的。

在这个项目里，有不少内容虽然会参与当前 API 调用，
却被故意设计成：

- 不写进 session transcript
- 不写进 trajectories
- 甚至在持久化前还会把当前 user message 改回“干净版本”

如果你不理解这层边界，很容易觉得 Hermes 前后矛盾：

- 前面明明把 recall、plugin context、voice prefix、ephemeral system prompt 都注入给模型了
- 为什么后面又不把这些东西完整保存下来？

这一篇附录就专门回答这个问题：

Hermes 为什么坚持把“给模型看的上下文”和“写进轨迹 / 会话账本的内容”分成两层？

这一篇只回答 persistence / transcript / trajectory 的语义边界。

- recall 和 plugin context 如何注入，细节分别见附录 T、U
- `ephemeral_system_prompt` 为什么存在，见附录 V
- 一次调用前的完整装配顺序，见附录 W

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `agent/trajectory.py`
- `gateway/run.py`
- `tests/run_agent/test_run_agent.py`
- `tests/gateway/test_transcript_offset.py`

---

## 1. Hermes 最核心的判断：给模型看的，不一定就是会话事实

先把问题想透。

在 Hermes 里，模型每次 API 调用前看到的内容，至少包含三种不同性质的东西：

- 真正发生过的会话消息
- 当前回合临时注入的辅助上下文
- 为训练/调试轨迹专门转换过的表示格式

这三种东西如果混成一层，系统很快就会乱掉。

因为它们对应的是三种完全不同的问题：

### 1.1 会话事实

回答的是：

- 用户和 assistant 真实说了什么
- 工具真实怎么调用、怎么返回

### 1.2 运行时辅助上下文

回答的是：

- 为了让这一轮更好推理，临时额外喂了模型什么背景

比如：

- external recall
- plugin `pre_llm_call` context
- voice mode 前缀
- `ephemeral_system_prompt`

### 1.3 轨迹导出格式

回答的是：

- 为了训练或调试，怎样把当前会话改写成适合离线消费的结构

比如：

- `<think>`
- `<tool_call>`
- `<tool_response>`
- ShareGPT 风格的 `from: human/gpt/tool`

Hermes 明显认为：

- 这三层不能混

这就是整篇最关键的前提。

---

## 2. `run_agent.py` 已经把临时注入的边界说透了：API-call-time only，不写回 `messages`

看 `run_agent.py` 里构造 `api_messages` 的那段逻辑。

源码注释已经把结论说得很明确：

- Both are API-call-time only
- the original message in `messages` is never mutated
- nothing leaks into session persistence

这一篇不再重复展开 recall 或 plugin context 各自怎么注入；前文已经拆开讲过。这里你只需要抓住它们对持久化边界的含义：

- 这类内容是给当前 API 调用看的
- 不是正式会话消息的一部分
- 如果把它们直接落成 transcript，就会制造错误的会话事实

---

## 3. `_apply_persist_user_message_override()` 说明：Hermes 甚至会在持久化前主动“洗掉”API 专用前缀

这一步特别能体现 Hermes 的边界意识。

看 `run_agent.py` 的：

- `_apply_persist_user_message_override()`

它的 docstring 写得非常直接：

- Some call paths need an API-only user-message variant
- without letting that synthetic text leak into persisted transcripts
- or resumed session history

这说明 Hermes 很清楚：

- 有些当前回合送给模型的 user message，已经不是“原始用户输入”

最典型的例子就是：

- voice mode 前缀

模型调用时可能看到的是：

- `[Voice input ...] Hello there`

但持久化前，Hermes 会把它改回：

- `Hello there`

也就是说，Hermes 不是“顺手少存一点东西”，
而是在刻意维护一个原则：

- transcript 里应该尽量保存用户真正说的话
- 而不是为模型临时加工过的话

### 3.1 测试也专门验证了这一点

`tests/run_agent/test_run_agent.py` 里有一组专门的测试：

- `Synthetic API-only user prefixes should never leak into transcripts`

测试里构造了一个带 voice prefix 的 user message，
然后验证：

- `_persist_session()` 之后，保存下来的内容已经被改回干净版本

这说明这不是 incidental behavior，
而是 Hermes 明确守住的持久化边界。

---

## 4. `ephemeral_system_prompt` 也属于同一类：会参与执行，但不会写进 trajectories

再看 `run_agent.py` 初始化参数说明和启动输出。

关于 `ephemeral_system_prompt`，注释和提示都写得很明确：

- used during agent execution
- but NOT saved to trajectories

启动时 Hermes 甚至会直接打印：

- `Ephemeral system prompt ... (not saved to trajectories)`

这一步很有代表性。

因为它说明 Hermes 不是偶然漏掉了它，
而是从设计上就不把它当成 trajectory 的正式组成部分。

理由也很清楚：

- 这是一段运行器临时 overlay
- 它不等于稳定的 agent identity
- 也不等于真实对话历史

如果把它直接写进 trajectories，
你导出的数据里就会混入很多：

- API server 临时 instructions
- gateway 的平台上下文
- 本轮覆盖性人格提示

这些内容对离线训练和会话还原都可能造成误导。

所以 Hermes 的选择是：

- 给模型看
- 但不把它伪装成长期轨迹事实

---

## 5. trajectory 导出本身就是一种“转换格式”，不是原样转存 transcript

看 `run_agent.py` 的：

- `_convert_to_trajectory_format(...)`

这一段非常值得认真看。

因为它直接证明了 trajectory 从来就不是“把 messages 原样 dump 出去”。

### 5.1 trajectory 会生成自己的 synthetic system message

函数一开始就构造了一段专门的 system message：

- 介绍 function-calling 规则
- 用 `<tools>` 包住工具定义
- 描述 `<tool_call>` / `<tool_response>` 格式

这段内容不是原始会话里的 system prompt，
而是为了轨迹消费方专门生成的训练格式前言。

这一步已经说明 trajectory 是：

- 转换后的导出格式

而不是：

- 原始 prompt 的镜像

### 5.2 trajectory 会把 reasoning 改写成 `<think>`

在 assistant turn 转换里，Hermes 会：

- 把 `reasoning` 包进 `<think>`
- 把 `<REASONING_SCRATCHPAD>` 转成 `<think>`
- 即使没有 reasoning，也补一个空 `<think>`，保持格式一致

这说明 trajectory 关注的是：

- 训练数据或离线分析所需的一致格式

而不是：

- “和在线 API 请求一模一样”

### 5.3 trajectory 会把 tool call / tool response 重写成 XML 风格块

同一段代码里，tool call 会被转成：

- `<tool_call> ... </tool_call>`

tool result 会被转成：

- `<tool_response> ... </tool_response>`

这也再次说明：

- trajectory 是为了离线消费而重构过的表示

所以从一开始你就不能要求：

- “所有在线上下文都该原样进 trajectory”

Hermes 根本不是这么定义 trajectory 的。

---

## 6. session transcript 也不是“所有在线消息材料的大杂烩”

再看 gateway 这一侧的持久化逻辑。

`gateway/run.py` 在把 agent 新产出的消息写回 transcript 时，
有一个很明确的过滤：

- Skip system messages -- they're rebuilt each run

这句话非常关键。

因为它说明对 Hermes 来说，transcript 更接近：

- 会话事实账本

而不是：

- 每次 API 请求所有材料的完整转储

也正因为如此，像下面这些东西天然不适合直接进入 transcript：

- system messages
- session_meta
- API-call-time 注入的 recall / plugin context

### 6.1 `tests/gateway/test_transcript_offset.py` 也在强调同一件事

这个测试文件反复验证：

- `session_meta` 会在传给 agent 前被过滤掉
- `system` messages 也会被过滤掉
- transcript/history 和真正喂给 agent 的 `agent_history` 不是一回事

这再次说明 Hermes 的持久化观念非常明确：

- 有些东西属于运行时材料
- 有些东西才属于正式对话历史

两者不能混。

---

## 7. 为什么 Hermes 要这么麻烦：因为 transcript、trajectory、runtime context 面向的是三个不同消费者

这背后真正的原因其实很朴素。

Hermes 之所以不把所有内容都塞进一个地方，
是因为这三条链路服务的对象根本不同。

### 7.1 runtime context 面向的是“当前这次模型调用”

它追求的是：

- 当前推理效果
- 当前 provider 兼容
- 当前回合上下文完整性

所以它可以接受：

- recall
- plugin context
- ephemeral overlay

这种临时材料。

### 7.2 session transcript 面向的是“会话恢复与产品账本”

它追求的是：

- 真实对话历史
- 可 resume
- 可 retry
- 可 branch

所以它不该混进太多：

- 临时注入的辅助背景
- 运行器特有的瞬时指令

### 7.3 trajectory 面向的是“训练/调试/离线分析”

它追求的是：

- 格式一致
- 明确 tool/use 样式
- 明确 reasoning 样式

所以它会主动把在线消息重写成另一套更适合离线消费的格式。

一旦你把这三种消费者混成一个，
系统就会同时失去：

- 在线推理边界
- 会话账本语义
- 轨迹导出一致性

Hermes 正是在避免这种混乱。

---

## 8. 读完这一篇记住 4 个边界

### 8.1 “给模型看过” 不等于 “应该持久化”

这是最重要的一条。

很多运行时辅助材料只服务当前回合，
并不适合进入正式历史。

### 8.2 transcript 应该尽量保存“真实会话事实”

不要把为模型临时加工过的前缀、上下文块、运行器提示，
伪装成用户真的说过的话。

### 8.3 trajectory 可以是转换格式，但要清楚它不等于原始对话镜像

只要你明白 trajectory 面向的是训练/分析，
就会理解为什么 Hermes 会主动生成：

- synthetic system
- `<think>`
- `<tool_call>`
- `<tool_response>`

### 8.4 一个成熟 Agent 往往需要三套边界，而不是一套“统一日志”

你至少要分清：

- runtime 注入材料
- session 会话账本
- trajectory 导出格式

---

## 最后一句话

Hermes 在“给模型看什么”和“写进轨迹 / transcript 什么”之间，划了一条非常明确的边界：

- recall、plugin context、voice prefix、ephemeral system 这类材料，可以参与当前 API 调用
- 但不必、也不该自动进入 session transcript 或 trajectories

同时，Hermes 又没有把 trajectory 设计成 transcript 的镜像，
而是明确把它变成一种离线友好的转换格式。

这背后的核心思想其实很成熟：

- 在线运行时追求的是当前推理效果
- transcript 追求的是真实会话账本
- trajectory 追求的是离线消费一致性

对学习 Agent 的人来说，这一点非常值得记住。

因为很多系统后面越来越难维护，不是因为功能不够多，
而是因为：

- runtime context
- session history
- training trajectory

从第一天起就没分开。

Hermes 在这里给出的答案很清楚：

- 不同消费者，应该看到不同层次的真相
