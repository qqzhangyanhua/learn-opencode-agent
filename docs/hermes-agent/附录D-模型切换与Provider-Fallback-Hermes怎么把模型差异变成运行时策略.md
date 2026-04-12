# 附录 D｜模型切换与 Provider Fallback：Hermes 怎么把模型差异变成运行时策略

## 先把模型差异当成运行时问题

很多刚开始学 Agent 的人，对“换模型”这件事的理解通常都比较简单：

- 把模型名改一下
- API key 换一下
- 如果能继续回答，就算切换成功

如果只是做一个单模型 Demo，这样也许够。

但 Hermes 这种已经进入运行时工程阶段的系统，显然不能这么处理。

因为在真实 Agent 系统里，换模型从来不只是“改个名字”，它同时会牵动：

- provider 身份
- base URL
- api_mode
- prompt caching 是否还能开
- context length 到底是多少
- context compressor 的阈值是否要重算
- fallback 是临时接管，还是永久切换

一旦这些东西没理清，系统表面上看只是“切了个模型”，实际上很可能已经埋下了很多运行时错位：

- 压缩阈值还沿用旧模型
- context window 判断错了
- prompt cache 开关状态不对
- fallback 后下一轮又莫名切回去
- 同一个模型在不同 provider 下被当成同一种能力处理

所以这一篇附录想回答的问题是：

Hermes 为什么把模型切换和 provider fallback 做成一整套运行时策略，而不是一个简单配置项？

这一篇主要结合这些源码和测试文件来看：

- `run_agent.py`
- `agent/model_metadata.py`
- `agent/models_dev.py`
- `agent/context_engine.py`
- `hermes_cli/model_switch.py`
- `tests/run_agent/test_fallback_model.py`
- `tests/run_agent/test_provider_fallback.py`
- `tests/run_agent/test_switch_model_context.py`
- `tests/run_agent/test_compressor_fallback_update.py`
- `tests/agent/test_model_metadata.py`
- `tests/agent/test_models_dev.py`
- `tests/test_ctx_halving_fix.py`

---

## 1. Hermes 最现实的判断：模型切换不是配置动作，而是运行时事件

先看 `run_agent.py`。

Hermes 在初始化 `AIAgent` 时，就明确维护了几组和模型相关的运行时状态：

- `self.model`
- `self.provider`
- `self.base_url`
- `self.api_mode`
- `self.client`
- `self.context_compressor`
- `self._primary_runtime`
- `self._fallback_chain`

光从这些字段就能看出来，Hermes 并不把模型看成一个孤立字符串。

它真正维护的是一整个“模型运行时”。

这点很重要。

因为只要你开始支持：

- OpenRouter
- Anthropic
- OpenAI
- Z.AI
- MiniMax
- Kimi
- 自定义 endpoint

“当前在用哪个模型”这句话就必须展开成更完整的表达：

- 当前模型名是什么
- 它挂在哪个 provider 上
- 它走哪种 API 协议
- 它的客户端怎么初始化
- 它的上下文上限是多少
- 它是否适用当前的缓存与压缩策略

也就是说，Hermes 眼里的模型切换，本质上不是 UI 事件，而是 runtime rebinding。

---

## 2. `switch_model()` 真正切换的，不只是模型名，而是一整套执行现场

看 `run_agent.py` 里的 `switch_model()`，这个函数很值得初学者认真看。

因为它几乎把“为什么模型切换是运行时事件”完整写出来了。

这个函数至少做了下面几件事：

- 根据 provider 和 base URL 重新确定 `api_mode`
- 替换 `model`、`provider`、`base_url`、`api_key`
- 重建新的客户端
- 重新判断 prompt caching 是否应该开启
- 更新 `context_compressor`
- 让 `_cached_system_prompt` 失效
- 更新 `_primary_runtime`
- 重置 fallback 状态

这说明 Hermes 的切换逻辑非常克制，也非常工程化：

它不相信“只要模型名换了，系统就自动知道后面该怎么办”。

相反，它在明确地做一件事：

把所有和模型绑定的运行时对象一起换掉。

这一步非常值得学习。

因为很多 Agent 项目在这件事上最容易出的问题就是：

- 表面模型切了
- 但 compressor 还拿着旧窗口
- 或 client 还在走旧协议
- 或 system prompt 还是旧状态
- 或 fallback 标记没清，后面行为继续漂

Hermes 的 `switch_model()` 基本是在防这些错位。

---

## 3. Hermes 把 fallback 看成“本轮救场”，而不是“永久改配置”

模型切换和 fallback，看起来都像“换个模型继续跑”，但 Hermes 明显在结构上把两者分开了。

### 3.1 初始化时先建立 fallback chain

在 `run_agent.py` 初始化阶段，Hermes 会把 `fallback_model` 解析成：

- `self._fallback_chain`
- `self._fallback_index`
- `self._fallback_activated`
- `self._fallback_model`

也就是说，它不是只存一个备用模型，而是在维护一个有顺序的 fallback provider 链。

这点在 `tests/run_agent/test_provider_fallback.py` 里很清楚。

这个测试文件验证了很多关键行为：

- 不配置 fallback 时，链应为空
- 兼容旧的单个 dict 配置
- 新的 list 形式会形成有序链
- 非法项会被过滤
- fallback 会随着尝试前进 index
- 前一个 provider 失败时，可以继续跳到下一个

这说明 Hermes 不是把 fallback 当成一个“开或不开”的按钮，而是把它做成一条有推进规则的恢复链路。

### 3.2 fallback 是临时接管，不是永久写回

再看 `switch_model()` 的注释，会看到一个很关键的区别：

- `switch_model()` 会更新 `_primary_runtime`，所以变更会跨回合持续
- `_try_activate_fallback()` 则更像 turn-scoped 的临时接管

这件事很成熟。

因为 fallback 的职责，本来就不是“帮你重新配置系统”，而是：

当主 provider 暂时不可用时，先把这一轮救回来。

这背后其实有两个完全不同的工程语义：

- `switch_model()`：用户明确改变系统主模型
- fallback：运行时为可用性做的临时退路

很多初学者会把这两种事情混成一个逻辑，结果系统状态就会越来越乱。  
Hermes 至少在结构上已经把这两层分开了。

---

## 4. 同一个模型在不同 provider 下，不一定是同一个“上下文事实”

这是这一篇最值得讲透的一点。

看 `agent/model_metadata.py` 和 `agent/models_dev.py`，Hermes 在处理模型元数据时有一个非常现实的判断：

同一个模型名，在不同 provider 下，context window 可能不一样。

`agent/model_metadata.py` 的 `get_model_context_length()` 注释里，直接写了 context length 的解析顺序：

1. 显式配置覆盖
2. 持久化缓存
3. 活跃 endpoint 的 `/models` 元数据
4. 本地服务查询
5. Anthropic 官方 API
6. OpenRouter 元数据
7. models.dev 的 provider-aware lookup
8. 薄硬编码默认值
9. 默认 fallback

这几步本身就很说明问题。

Hermes 明显不相信“模型名里自带所有事实”，而是尽量去问：

- 你现在到底挂在哪个 provider 上
- 这个 endpoint 真实报告的窗口是多少
- 如果 provider 不同，同一模型是不是会有不同限制

`tests/agent/test_models_dev.py` 里有一个非常典型的例子：

- Anthropic 直连下的 `claude-opus-4-6` 是 1M context
- GitHub Copilot 下的 `claude-opus-4.6` 则可能只有 128K

这一下就把问题讲明白了。

如果你把模型能力只绑定在“模型名”上，你就会犯一个很常见的错误：

把 provider 差异当成不存在。

Hermes 在这里明显在守一个更成熟的原则：

模型能力是 provider-aware 的运行时事实，不是单纯字符串事实。

---

## 5. `models.dev` 在 Hermes 里不是“锦上添花”，而是元数据治理层

很多人看 `agent/models_dev.py`，第一反应可能是：

这是不是只是个方便搜索模型目录的地方？

其实不是。

这个文件在 Hermes 里的价值，远不止“查名字”，而是给模型运行时提供一层更可靠的元数据来源。

这个模块做了几件很关键的事：

- 维护 Hermes provider 到 models.dev provider 的映射
- 拉取并缓存 provider / model 元数据
- 按 provider + model 查询 context window
- 暴露 capabilities、family、cost、modalities 等结构化信息
- 支持内存缓存、磁盘缓存、网络刷新三层回退

这意味着 Hermes 在构建模型运行时时，不再只依赖某个 provider 自己的一份返回值，而是在主动建立“统一元数据层”。

`tests/agent/test_models_dev.py` 也正是在验证这层是否可靠：

- exact match 能不能命中
- 大小写差异能不能处理
- 不映射的 provider 是否正确返回空
- 0 context 的条目是否被过滤
- 网络失败时能不能回退到旧缓存
- 内存缓存是否会优先命中

这类测试的意义在于：

Hermes 没把模型目录当展示信息，而是当运行时决策依据。

只要某个上下文长度、能力标签、provider 映射会影响切换或压缩策略，它就不该停留在“查资料”层，而应该进入“受测试保护的元数据层”。

---

## 6. 模型一变，context compressor 也必须跟着变

如果你前面已经看过上下文压缩那篇附录，这里会更容易理解 Hermes 为什么专门测这件事。

在 `agent/context_engine.py` 里，`update_model()` 的注释写得很直接：

- 用户切换模型时要调用
- fallback 激活时也要调用
- 默认行为是更新 `context_length`，并按 `threshold_percent` 重算阈值

这说明在 Hermes 里，压缩器不是一个和模型解耦的小工具。  
它本身就是模型运行时的一部分。

这在测试里也有非常明确的体现。

### 6.1 `test_switch_model_context.py`

这个文件验证的是：

- `switch_model()` 时，`config_context_length` 这个用户覆盖值不能丢
- 新模型上下文长度解析时，要继续带着这个 override
- compressor 的 model 也要同步更新

这很重要。

因为用户一旦显式配置了 context length，本质上就是在告诉系统：

“我比自动探测更知道这里应该是多少。”

这种 override 在切模型时如果丢掉，后面的压缩和预算都会立刻漂移。

### 6.2 `test_compressor_fallback_update.py`

这个文件则在测另一件事：

当 `_try_activate_fallback()` 成功后，compressor 是否同步切到 fallback 模型。

测试里关心的字段包括：

- `model`
- `base_url`
- `api_key`
- `provider`
- `context_length`
- `threshold_tokens`

这相当于在验证一个很关键的运行时契约：

fallback 不是只把 `self.model` 改了，而是要让所有依赖该模型窗口的组件一起更新。

否则系统就会出现最危险的一种假一致：

- 表面模型换了
- 实际预算还是旧的

---

## 7. Hermes 连“max_tokens”和“context_length”都刻意分开，不允许概念混着用

很多 Agent 项目里，一个很常见的 bug 就是把这两个概念混掉：

- `max_tokens`
- `context_length`

看 `tests/test_ctx_halving_fix.py`，Hermes 对这个问题是非常敏感的。

这个测试文件专门在验证：

- 某些错误其实是在说“输出 token 上限太大”
- 而不是“输入上下文已经超窗”
- 这时系统应该做的是临时下调 `_ephemeral_max_output_tokens`
- 而不是错误地把 `context_length` 再砍半

这件事为什么重要？

因为如果你把两者混成一回事，系统会做出非常奇怪的恢复动作：

- 明明只是这次输出预算超了
- 结果你却把整个上下文窗口当成缩小了
- 后面压缩和预算计算都会越来越偏

Hermes 通过这组测试，实际上是在保护一个更细的运行时语义：

- `context_length` 是输入 + 输出共享的大窗口
- `max_tokens` 是单次回复的输出上限

它们相关，但不是同一个东西。

一个成熟的 Agent Runtime，必须在这种概念层面也足够精细。

---

## 8. `hermes_cli/model_switch.py` 说明 Hermes 在入口层就开始治理模型差异

如果说 `run_agent.py` 负责真正的 runtime swap，那么 `hermes_cli/model_switch.py` 负责的就是：

把用户模糊的输入，整理成一个足够可靠的切换请求。

这个模块做的事情包括：

- 解析 `/model` 的 flags
- 处理短别名，如 `sonnet`、`gpt5`、`gemini`
- 做 provider resolution
- 规范化模型名
- 查 models.dev 目录与 capabilities
- 生成结构化的切换结果

这说明 Hermes 其实从入口层就在处理一个很现实的问题：

用户说的“我要换模型”，往往并不是一个完整、严谨、可直接执行的 runtime 描述。

用户可能只说：

- `sonnet`
- `gpt`
- `glm`
- `--provider anthropic`

但系统真正需要的是：

- 规范化后的模型 ID
- provider 身份
- base URL
- api_mode
- credentials
- 对应 capabilities

这件事很值得初学者注意。

很多系统把“模型切换”做成一个表面交互功能，但没有把背后的规范化和解析流程做完整。  
Hermes 的写法说明，真正的模型切换治理，是从输入解析层就开始的。

---

## 9. 对学习智能体的人来说，这一篇最值得提炼的是四个原则

### 9.1 不要把“模型”理解成一个字符串，要把它理解成一组绑定状态

在真实系统里，模型至少和这些东西绑定：

- provider
- endpoint
- client
- api_mode
- context window
- caching 策略
- 压缩预算

只改模型名而不改其他状态，通常就是 bug 的起点。

### 9.2 fallback 和手动 switch 是两种不同语义

一个是系统为了可用性做的临时退路。  
一个是用户对主运行时的明确变更。

这两个动作如果不分开，系统状态会很快变脏。

### 9.3 上下文长度一定要 provider-aware

同一个模型，在不同平台和 provider 上，窗口不一定一样。

Hermes 用 `model_metadata + models.dev + tests` 反复在守这件事。

这非常值得抄。

### 9.4 模型差异最终要落到运行时策略，而不是停留在知识层

知道某模型“更强”没什么用。  
真正重要的是：

- 压缩阈值怎么调
- prompt cache 能不能开
- 输出上限怎么控
- fallback 能不能接手

这些才是 Agent Runtime 真正关心的模型差异。

---

## 10. 最后把路由策略收住

基于当前 hermes-agent 仓库里的这些源码和测试，我认为 Hermes 对“模型切换与 provider fallback”这件事的理解，可以概括成一句话：

它不是在维护一个可切换的模型列表，而是在维护一套会随着 provider、上下文窗口、客户端协议、压缩预算和缓存策略一起变化的模型运行时。

这个判断，主要来自这些非常具体的源码事实：

- `run_agent.py` 初始化时就建立了 `_fallback_chain`、`_fallback_index`、`_primary_runtime` 这些运行时结构
- `switch_model()` 会同步替换模型、provider、client、prompt caching、compressor 和 cached system prompt，而不是只改模型名
- `_try_activate_fallback()` 把 fallback 做成有顺序的恢复链路，而不是单点备用模型
- `agent/model_metadata.py` 的 `get_model_context_length()` 明确按配置覆盖、缓存、endpoint、provider-aware registry、默认值等多层顺序解析上下文长度
- `agent/models_dev.py` 为 Hermes 提供了 provider-aware 的统一元数据层，并带有缓存与失败回退
- `agent/context_engine.py` 的 `update_model()` 说明模型切换和 fallback 都必须联动压缩器
- `tests/run_agent/test_provider_fallback.py`、`test_fallback_model.py`、`test_switch_model_context.py`、`test_compressor_fallback_update.py` 把这些运行时契约都固定下来
- `tests/test_ctx_halving_fix.py` 进一步证明 Hermes 连 `max_tokens` 和 `context_length` 都刻意分开治理，不允许恢复逻辑把两者混为一谈

所以，如果你在学智能体，这一篇最该记住的一句话就是：

真正成熟的 Agent，不是“支持很多模型”，而是能把不同模型和 provider 的差异，稳定地翻译成一套可运行、可切换、可回退、可测试的运行时策略。
