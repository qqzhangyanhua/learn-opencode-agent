# 附录 R｜Auxiliary Model 专章：Hermes 为什么不让主模型包办摘要、压缩、视觉和副任务

## 先把辅助模型的职责切开

很多人刚开始做 Agent 时，很容易把模型理解成一个“万能大脑”：用户问题让它答，工具结果让它读，长上下文让它自己总结，旧会话让它自己回忆，图片让它自己看，连标题生成这种小事也让它顺手做了。小 Demo 这么堆上去确实能跑，但真实运行时里，这些工作虽然都“像是模型在干活”，其实不是同一种活：

- 当前回合的主任务推理
- 长上下文压缩
- 历史 session 回忆与摘要
- 网页提取后的二次整理
- 视觉理解
- 自动标题生成

这些事情混在一起，主模型就会越来越像一个什么都接的总包工头：

- 成本高
- 延迟高
- 上下文被副任务污染
- 一处 provider 出问题，整条链都受牵连
- 每个功能都要各自处理一遍模型接入、fallback、参数兼容

所以这一篇附录要回答的是：Hermes 为什么专门做出一层 `auxiliary model` 运行时，不让主模型包办摘要、压缩、视觉和各种副任务？

这一篇主要结合这些源码和测试文件来看：

- `agent/auxiliary_client.py`
- `agent/context_compressor.py`
- `tools/session_search_tool.py`
- `agent/title_generator.py`
- `tests/agent/test_auxiliary_named_custom_providers.py`
- `tests/agent/test_minimax_auxiliary_url.py`

---

## 1. Hermes 最核心的判断：主模型负责当前任务决策，辅助模型负责便宜、快、可替换的副任务

先看 `agent/auxiliary_client.py` 文件头。

它开门见山写得很直白：

- 这是一个 `Shared auxiliary client router for side tasks`

后面直接点名了它服务的对象：

- `context compression`
- `session search`
- `web extraction`
- `vision analysis`
- `browser vision`

这句话很关键。Hermes 不是把辅助模型当成“再接一个备用模型”，而是为 side tasks 单独建立一条运行时通道。

这和很多初学者的直觉不一样。

很多人会觉得：

- 反正主模型也能总结
- 反正主模型也能看图
- 反正主模型也能生成标题

那就全都交给主模型好了。

但 Hermes 的判断更成熟：

- 主模型最宝贵的资源，是当前这轮任务的推理预算和上下文注意力
- 副任务应该尽量用更便宜、更快、更容易切换的模型去完成

这不只是为了省钱，更是在做 runtime discipline：把主决策链留给主模型，把预处理、后处理和辅助整理交给 auxiliary model。你可以把它理解成一种运行时分工，主模型像项目负责人，辅助模型像后勤与整理工位。真正好的 Agent，不是让一个模型什么都干，而是让不同类型的模型工作落在合适的位置上。

---

## 2. `agent/auxiliary_client.py` 说明：Hermes 不是到处手写第二个 client，而是专门做了一层副任务路由器

这一层是整篇最值得看的源码。因为 Hermes 很清楚，如果每个副任务模块都自己去：

- 读环境变量
- 选 provider
- 拼 base URL
- 兼容 OpenAI / Anthropic / Codex 差异
- 自己处理 fallback

那系统很快就会散掉。

所以 Hermes 在 `agent/auxiliary_client.py` 里做了一件很工程化的事：把所有 auxiliary 任务的模型解析、provider 路由、参数兼容、fallback 都收敛到一个统一入口。

### 2.1 `_resolve_auto()` 说明 Hermes 真的把 auxiliary 当成正式运行时能力

看 `_resolve_auto()` 的注释和实现，它写得非常明确。

文本类辅助任务的 auto chain 不是随便挑一个模型，而是一整条解析链：

1. 如果主 provider 不是聚合器，就先尝试直接复用主 provider
2. 再走 OpenRouter
3. Nous Portal
4. custom endpoint
5. Codex OAuth
6. direct API-key providers
7. 最后才是没有可用 provider

这一步很值得学，因为它说明 Hermes 对辅助模型的理解不是“我随便找个第二模型”，而是“我需要一套对 side-task 友好的解析顺序”。

尤其 `_resolve_auto()` 里有一句 warning 很有代表性：

- 如果没有可用 auxiliary provider，`Compression, summarization, and memory flush will not work`

这句话等于直接告诉你：在 Hermes 里，辅助模型不是可有可无的装饰，它已经是 runtime 的正式依赖能力。

### 2.2 `resolve_provider_client(...)` 把 provider 差异统一收口

`resolve_provider_client(...)` 的注释也很直接：

- 这是 single entry point
- 负责 auth lookup、base URL resolution、provider-specific headers、API format differences

这意味着 `auxiliary_client` 不只是“选模型”，它还在统一处理：

- provider alias
- named custom providers
- custom endpoint
- OpenRouter / Nous / Anthropic
- Codex Responses API 包装
- direct API-key providers
- base URL 规范化

这一步特别适合初学 Agent 的人反复看。很多 Demo 型项目最容易犯的错误，就是一个模块自己写 OpenAI client，一个模块自己写 OpenRouter client，另一个模块再单独兼容 Anthropic，最后整个项目里散着三四套半重复的模型接入逻辑。Hermes 就是在主动避免这件事。

### 2.3 task 级覆盖说明 Hermes 不是“一套 auxiliary 配置吃天下”

文件头还明确说明：

- `auxiliary:` 配置支持 per-task override

例如：

- `auxiliary.vision.provider`
- `auxiliary.compression.model`

这说明 Hermes 不是只抽象出一个笼统的“辅助模型”，而是在允许更细粒度的运行时策略：

- 压缩任务可以偏便宜、偏快
- 视觉任务可以走单独的 vision backend
- 某些任务可以强制指定 provider

也就是说，Hermes 把 auxiliary model 做成了一层 side-task router，而不是一个简单的“副模型配置项”。

---

## 3. `context_compressor.py` 说明：上下文压缩为什么不能让主模型自己给自己做总结

很多人会有一个直觉：

- 都是同一个对话
- 那就让主模型自己总结一下自己不就好了

但 Hermes 明显不这么干。

在 `agent/context_compressor.py` 里，文件头直接写了：

- Uses auxiliary model (cheap/fast) to summarize middle turns

而且代码里是直接：

- `from agent.auxiliary_client import call_llm`
- `_generate_summary(...)` 里用 `call_llm(task="compression", ...)`

这说明 Hermes 的上下文压缩从一开始就是主模型不亲自做，而是交给 auxiliary compression task 做。

### 3.1 这不是偷懒，而是在避免“主模型自我消耗”

如果让主模型自己做压缩，会出现几个问题：

- 它得先吃下那一大段待压缩上下文
- 然后再花自己的高质量推理预算去总结
- 总结完还得继续处理当前用户任务

等于说主模型一边处理业务，一边还兼职做自己的上下文清洁工。

Hermes 不想让主模型陷入这种自我消耗，所以把压缩拆成独立副任务：

- 先做 cheap pre-pass
- 再把中间段交给 auxiliary summarizer
- 最后把压缩后的 checkpoint 回注到主对话里

这本质上是在保护主 loop。

### 3.2 `_serialize_for_summary()` 还说明 Hermes 要让辅助模型“看懂工具轨迹”

很多项目做压缩时，只给 summarizer 喂纯文本聊天。

Hermes 不是。

`_serialize_for_summary()` 里会把这些东西一起打进去：

- assistant content
- tool call name
- tool call arguments
- tool result content

而且对 tool result、assistant content、tool args 都做了裁剪策略。

这说明 Hermes 很清楚，一个 Agent 会话里真正重要的信息不只是自然语言，还包括工具调用、命令、路径、输出和报错；如果 summary 模型看不到这些结构，压缩出来的东西就会失真。

### 3.3 Hermes 把压缩理解成“有损但受控”，而不是“简单删历史”

`context_compressor.py` 文件头还写了两个非常关键的词：

- `cheap pre-pass`
- `lossy summarization`

这两个词特别有工程味。

它承认压缩一定有损，
但 Hermes 要求这个“损”是被控制的：

- 先保护 head / tail
- 先裁剪旧工具输出
- 再把中间段交给辅助模型总结

所以这里的 auxiliary model 不是在做华丽功能，
而是在承担主 runtime 的空间治理工作。

---

## 4. `session_search_tool.py` 说明：旧会话回忆不该把整段 transcript 塞回主模型嘴里

再看 `tools/session_search_tool.py`。

这个文件头已经把主线写得非常清楚：

- 先用 FTS5 搜 past session
- 再用 cheap/fast model 做 focused summary
- 返回 focused summaries，而不是 raw transcripts
- 这样可以保持当前 session context window clean

这几句几乎就是一套完整设计思想。很多人第一次做“历史会话回忆”时，会很自然地想：

- 搜到相关会话
- 把整段历史 transcript 塞给当前主模型
- 让它自己读

这样表面上最直接，但实际上很笨重，因为主模型会被迫：

- 重新读很长的旧对话
- 从中自己抽取重点
- 再把重点和当前问题重新拼起来

Hermes 明显不想把主模型的上下文预算浪费在这里。

### 4.1 先检索，再摘要，而不是先塞回主对话

`session_search_tool.py` 的流程是：

1. FTS5 找匹配消息
2. 按 session 分组
3. 加载会话内容并截断
4. 用 `_summarize_session(...)` 交给辅助模型总结
5. 返回每个 session 的 focused recap

而 `_summarize_session(...)` 里又是：

- `async_call_llm(task="session_search", ...)`

这里非常值得学习。Hermes 不是把“检索”理解成把旧材料原样塞回上下文，而是先找到证据，再用 side-task summarizer 压成可回忆对象，最后把简化结果交给主模型。这正是成熟 Agent 的做法。

### 4.2 辅助模型在这里承担的是“回忆整理器”，不是主推理器

注意 `session_search` 的辅助模型职责并不是替主模型回答当前问题。

它做的只是：

- 帮主模型把旧会话整理成一段足够干净、足够聚焦的回忆摘要

这背后的边界很清楚：检索与摘要属于 recall pipeline，当前问题怎么判断、怎么决策，仍然是主模型的事。所以 auxiliary model 不是另一个总控大脑，而是专门承担某一段副流程。

---

## 5. `title_generator.py` 和 vision 路由说明：连标题生成、看图这类副工作也不该污染主 loop

如果说压缩和 session recall 还算“看起来比较重”的副任务，那 `agent/title_generator.py` 会把 Hermes 的思路再往前推一步：它连自动标题生成都不愿意占用主模型。

### 5.1 标题生成就是典型副任务，不值得占主模型注意力

看 `generate_title(...)` 的注释：

- Uses the auxiliary LLM client (cheapest/fastest available model)

实际调用也是：

- `call_llm(task="compression", ...)`

也就是说，Hermes 认为连这种小型文本整理任务都应该：

- 尽量走最便宜、最快的辅助链路

而不是让主模型在完成首次回复后再顺手多做一次标题抽取。

这一步很能体现 Hermes 的纪律性。很多系统会觉得“这点事顺手做了就行”，但 Hermes 的想法更清楚：只要它不是主回答的一部分，就尽量别污染主 loop。

### 5.2 vision 也被纳入 auxiliary router，而不是混进主对话 client

`agent/auxiliary_client.py` 里除了 text auxiliary，还专门有：

- `resolve_vision_provider_client(...)`

vision 的 auto order 也是单独定义的。

这说明 Hermes 连“看图”都不愿意把它做成一种模糊能力。相反，它明确把 vision 当成一类独立副任务来路由：

- 有自己的 provider 解析
- 有自己的 backend 选择
- 有自己的 fallback 路径

这一步非常重要。

因为视觉任务和普通文本任务在工程上本来就经常不是同一条能力链：

- 支持的 provider 不一样
- 默认模型不一样
- API 协议不一样
- 成本和延迟特征也不一样

Hermes 没有把这些差异糊成“一切都叫聊天模型”，而是用 auxiliary router 把它们单独收进来。

---

## 6. Hermes 真正获得的收益，不只是省钱，而是让主 runtime 更干净、更稳

如果只把这一层理解成成本优化，其实还是浅了。

Hermes 把 auxiliary model 体系做出来，真正拿到的是几种更本质的工程收益。

### 6.1 主模型上下文更干净

副任务先在外面完成：

- 压缩先变 checkpoint
- 历史检索先变 focused summary
- 标题先独立抽取
- 图片先独立分析

主模型拿到的就不再是原始杂料，而是整理过的结果。

### 6.2 副任务更容易降级和失败隔离

`call_llm()` / `async_call_llm()` 里明确处理了：

- provider 解析
- `max_tokens` / `max_completion_tokens` 差异
- payment error fallback
- connection error fallback

这说明某个辅助 provider 挂掉时，Hermes 可以先尝试把副任务切到别的 provider，而不是直接让主对话一起瘫掉。

### 6.3 side-task 可以按任务类型独立调优

因为有 task 级配置，
Hermes 可以自然支持这种策略：

- compression 用超便宜快模型
- session_search 用稳定摘要模型
- vision 用专门的多模态 backend

这比“全系统只认一个主模型”成熟很多。

### 6.4 每个消费者都不用再复制一套接入逻辑

`auxiliary_client.py` 注释里写得很明确：

- Every auxiliary LLM consumer should use these instead of manually constructing clients

这句话本质上是在建立工程边界：模块只关心自己要做什么副任务，provider 差异、auth、fallback、URL 规范化交给统一路由层。这比每个模块都偷偷造一套 client 健壮得多。

---

## 7. 测试文件也在证明：Hermes 把 auxiliary 路由当成正式基础设施，而不是几个随手写的小功能

很多系统把“辅助模型”做到后面，会变成一种没人敢碰的边角逻辑。Hermes 没有这样，测试文件已经很能说明它的态度。

### 7.1 `test_auxiliary_named_custom_providers.py` 证明 auxiliary router 支持正式的 provider 解析

这个测试文件验证了很多关键行为：

- `main` alias 能否解析成真实主 provider
- named custom providers 能否直接接入 auxiliary router
- direct provider 的 model normalization 是否正确
- vision auto-routing 是否复用相同的 provider-aware 规则

这说明 Hermes 根本不是把辅助模型硬编码成永远 OpenRouter、永远一个固定模型；它真的把 auxiliary 路由做成了一套和主运行时同等级别的 provider 解析能力。

### 7.2 `test_minimax_auxiliary_url.py` 证明副任务路由也要做 provider normalization

这个测试验证 `_to_openai_base_url()` 会把：

- MiniMax 的 `/anthropic`

改写成：

- OpenAI SDK 能正确访问的 `/v1`

这件事很小，但特别说明问题：副任务不是“随便找个便宜模型调一下”，它同样要面对真实 provider 差异，也同样需要工程级兼容层。这也是为什么 Hermes 要做 `auxiliary_client`，而不是在每个功能文件里随手写一段请求代码。

---

## 8. 读完这一篇记住 4 点

### 8.1 主模型不应该承担所有“跟模型有关的活”

“能做”不等于“应该做”。

主模型应该优先负责：

- 当前任务理解
- 工具决策
- 最终回答

而不是顺便再去当：

- 压缩器
- 回忆整理器
- 标题生成器
- 视觉预处理器

### 8.2 辅助模型不是备用胎，而是 side-task runtime

很多人理解 auxiliary model 时，容易把它想成：

- 主模型不行了，我再换个模型

Hermes 更成熟的做法是：

- 不同任务天然就该由不同成本结构和能力结构的模型承担

这是一种运行时分工，不只是故障转移。

### 8.3 检索、压缩、摘要最好先在外围完成，再把结果交给主 loop

不要让主模型直接吞：

- 整段旧 transcript
- 超长中间历史
- 大块工具输出

更稳的做法是：

- 先检索
- 先压缩
- 先摘要
- 再把整理结果交给主模型

### 8.4 provider 路由是基础设施，不是功能细节

一旦系统有多个任务类型、多个 provider、多个 endpoint，
provider 解析、fallback、URL 规范化、API mode 兼容就必须收口。

否则你最后写的不是 Agent，
而是一堆分散在各个模块里的临时 client 脚本。

---

## 最后把副模型职责收住

Hermes 的 `auxiliary model` 设计，本质上是在守住一个很重要的边界：

- 主模型负责当前任务主线
- 辅助模型负责压缩、摘要、视觉、标题、检索整理这类副流程

这让 Hermes 获得的并不只是“更便宜”。

它真正得到的是：

- 更干净的主上下文
- 更稳定的副任务执行链
- 更容易 fallback 的 provider 路由
- 更清楚的运行时职责边界

对初学 Agent 的人来说，这一层非常值得抄。很多系统不是死在“模型不够强”，而是死在“什么都想让同一个模型顺手做”。Hermes 在这里给出的答案很朴素，也很成熟：把主脑和后勤分开，把主 loop 和 side-task 分开，把一次回答真正昂贵的推理预算留给最值得它做的事情。
