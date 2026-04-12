# 附录 A｜上下文压缩与 Prompt 稳定性：为什么 Agent 不是上下文越长越好

## 先打掉一个常见直觉

很多人刚学 Agent 时，都会默认“上下文越长越好”。

这个直觉只对一半。历史越多，连续性可能更强；但成本、噪声、schema 体积和运行时不稳定也会一起上涨。真到极限时，系统还不能只会报错，必须能继续活下去。

Hermes 的答案既不是“无限塞”，也不是“尽量别长”，而是把上下文窗口、Prompt 稳定性、压缩策略、辅助总结模型、会话分叉和缓存命中率一起当成运行时治理问题。

这一篇附录就专门基于当前 hermes-agent 仓库里的相关源码，回答这个问题。

核心会看：

- `run_agent.py`
- `agent/context_compressor.py`
- `agent/model_metadata.py`
- `agent/prompt_caching.py`

---

## 1. Hermes 先回答的不是“怎么压缩”，而是“为什么 Prompt 必须尽量稳定”

很多人一说上下文管理，第一反应就是总结、裁剪、压缩。

但 Hermes 的顺序其实更成熟。

它先解决的是另一个更底层的问题：

为什么 system prompt 不能在每一轮都乱变。

看 `run_agent.py` 里的 `_build_system_prompt()` 注释，写得非常明确：

- system prompt 会缓存到 `self._cached_system_prompt`
- 正常是一个 session 构建一次
- 只有 context compression 之后才重建
- 这样做是为了让 session 内的 system prompt 保持稳定，最大化 prefix cache 命中

这段设计非常关键。

因为很多初学者做 Agent 时，system prompt 会在每一轮都被重新拼接：

- 这轮加一点时间信息
- 那轮加一点状态
- 再下一轮又插一点额外说明

结果就是：

- API 前缀每次都不一样
- prompt cache 命中率很差
- 成本和延迟都上去

Hermes 明显不想这样。

它的判断是：

一个长期运行的 Agent，system prompt 更像一段“冻结的执行前缀”，不是一块“每轮都活蹦乱跳的文案区”。

这个思路和很多 Demo 最大的差别就在这里。

---

## 2. Prompt 稳定性在 Hermes 里，不只是概念，还直接进入了缓存策略

继续看 `agent/prompt_caching.py`，文件头直接写了它在做什么：

- Anthropic prompt caching
- `system_and_3` strategy
- system prompt + 最后 3 个非 system 消息作为 cache breakpoints

这一步把前面那层“system prompt 尽量稳定”的设计，直接落到了成本优化上。

也就是说，Hermes 不是抽象地说“最好稳定”，而是很明确地围绕缓存命中去组织消息前缀。

这一步最有启发的地方在于：Prompt 设计不只是让模型“看懂”，还要让运行时省钱、省延迟、能长期工作。Hermes 把这三件事绑在一起处理，所以这里的关键词不是“提示词写得巧”，而是“提示词适不适合作为稳定前缀”。

---

## 3. 上下文管理的第一步，也不是压缩，而是先知道模型到底能吃多少

在很多简单项目里，context limit 常常被写死成一个经验值。

但 Hermes 在 `agent/model_metadata.py` 里专门维护了一整套模型上下文元数据逻辑。

这个文件最值得注意的几个点是：

- `get_model_context_length(...)`
- `CONTEXT_PROBE_TIERS`
- `MINIMUM_CONTEXT_LENGTH = 64_000`
- 一大批 provider / model family 的 fallback context length

这说明 Hermes 并不是假设所有模型都差不多，而是把“上下文长度”当成必须明确解析的模型属性。

这点非常重要。

因为你只有知道：

- 主模型 context 多大
- 压缩阈值设在哪
- 辅助压缩模型 context 多大

后面谈压缩、预算、告警才有意义。

更关键的是，Hermes 还明确设了一个底线：

`MINIMUM_CONTEXT_LENGTH = 64_000`

这等于在架构层做了一个非常有态度的判断：

太小的上下文，不适合承担 Hermes 这种带工具、多轮、长期任务的 Agent Runtime。

这不是“理论上不能跑”，而是“工程上不值得支持得太深”。

这个判断其实很成熟。

因为真正做产品时，你迟早要决定：

哪些能力边界之下，系统虽然勉强能跑，但不值得承诺。

---

## 4. Hermes 真正开始压缩之前，会先做一轮 preflight，而不是等 API 报错

这是 Hermes 在这块特别值得学的地方。

看 `run_agent.py` 里进入主循环之前的那段 preflight compression 逻辑，你会发现它不是等请求炸了再补救，而是先预估这次请求是不是已经快超了。

而且这个预估不只算：

- messages
- system prompt

还会把：

- tools schema

一起算进去。

源码注释甚至明确写了：

很多工具时，schema 本身就能吃掉 20K 到 30K 以上 tokens。

这件事特别值得初学者记住。

因为很多人估算上下文时，只看聊天消息，不看工具定义。

结果就是：

- 明明消息不算特别长
- 真到 API 请求时还是突然爆 context

Hermes 在这里说明了一个非常现实的事实：

对 Agent 来说，context 不只是聊天历史，还包括能力面本身。

所以它会在真正发请求前先做一轮预判，如果超过阈值，就先压缩，而不是先撞墙。

这是一个非常典型的“把错误处理前移”的运行时设计。

---

## 5. `ContextCompressor` 最成熟的地方，不是“会总结”，而是它知道哪些东西不能乱压

打开 `agent/context_compressor.py`，文件头就把它的改进点列得很细：

- structured summary template
- iterative summary updates
- token-budget tail protection
- tool output pruning
- richer tool detail

这说明 Hermes 的压缩器不是“把中间聊天扔给小模型总结一下”，而是在做边界化压缩。

看 `compress()` 方法的算法说明，核心步骤大致是：

1. 先 prune 老的 tool results
2. 保护 head messages
3. 用 token budget 保护 tail
4. 只总结中间段
5. 多次压缩时迭代更新 summary
6. 最后再修复 orphaned tool pairs

这里最值得记住的是三点。

### 5.1 保护头部

头部通常包含：

- system prompt
- 会话最早的关键设定

Hermes 默认不去粗暴动这部分。

### 5.2 保护尾部

尾部是离当前任务最近的工作上下文。

Hermes 不是简单按“最后 N 条消息”保护，而是按 token budget 保护最近上下文。

这比死数消息条数更成熟。

### 5.3 中间段才是主要压缩对象

也就是说，Hermes 并不是“把整段历史打碎重写”，而是：

尽量保住头尾，把中间折叠成 handoff summary。

这其实非常像人类交接工作时的做法：

- 身份和规则不变
- 当前现场不丢
- 过程细节折成交接摘要

所以 Hermes 的压缩器真正做的不是“缩短文本”，而是“重构上下文结构”。

---

## 6. Hermes 连压缩摘要本身都在防止“摘要变成新的指令污染”

这也是一个很容易被忽略，但特别聪明的点。

`context_compressor.py` 里有一个 `SUMMARY_PREFIX`，内容非常明确：

- Earlier turns were compacted
- treat it as background reference, not active instructions
- do not answer questions mentioned in the summary
- respond only to the latest user message after the summary

为什么这很重要？

因为压缩摘要本身很容易变成新的 prompt 污染源。

如果你只是给模型一段总结，而不强调它是“背景交接”，模型很可能会：

- 把摘要里的旧任务当成当前任务
- 重复执行已经完成的工作
- 对摘要中的旧问题再次作答

Hermes 明显是意识到这个风险的。

所以它不是只做总结，而是给总结加了一个严格的角色说明：

这是 handoff reference，不是新的 active instruction。

这说明 Hermes 对压缩的理解已经很深了：

上下文压缩不是“保留信息”这么简单，还要防止信息角色错位。

---

## 7. Hermes 的压缩不是只改内存消息，还会连带更新 session 结构

看 `run_agent.py` 里的 `_compress_context()`，你会发现压缩不是一个局部动作，而是一个 session-level 事件。

压缩发生时，它会顺手做很多事情：

- 先 `flush_memories(...)`
- 通知 external memory provider 即将压缩
- 调用 `context_compressor.compress(...)`
- 把 TODO snapshot 再补回去
- `invalidate` 并重建 system prompt
- 在 SessionDB 里结束旧 session，并创建 continuation session
- 通过 `parent_session_id` 把 lineage 连起来

这说明什么？

说明 Hermes 不把压缩看成“消息数组变短一点”，而是看成：

当前会话已经跨过一个上下文边界，需要正式生成新的 continuation。

这个设计非常像成熟 runtime。

因为它意味着：

- 历史不是偷偷被删掉
- 旧 session 仍然存在
- 新 session 是压缩后的继续
- lineage 可追踪

这对学习智能体的人非常重要。

你会发现，一个真正长期运行的 Agent，很多时候不能靠“悄悄修改上下文”解决问题，而要把上下文跃迁做成正式事件。

---

## 8. Hermes 甚至考虑了一个很多项目都没想到的问题：辅助压缩模型自己会不会装不下

再看 `run_agent.py` 里的 `_check_compression_model_feasibility()`，你会发现 Hermes 还额外检查了一件事：

负责做压缩总结的 auxiliary model，它自己的 context window 是否小于主模型的 compression threshold。

这个检查特别有现实意义。

因为很多项目都会默认：

- 主模型上下文很大
- 那我找个便宜一点的小模型来总结就行

但问题是，如果“小模型”的上下文本身就装不下要总结的那一段内容，压缩会：

- 直接失败
- 或者产出严重截断的 summary

Hermes 不等用户撞上这个坑，而是在 session start 时就主动发 warning，还给出修复建议：

- 换更大的 compression model
- 或者把 compression threshold 调低

这说明它对压缩的理解不是“有个总结模型就行”，而是：

压缩链路本身也是有容量约束的。

这就是很典型的工程现实。

---

## 9. 这部分源码对学习智能体的人，最值得提炼的不是“怎么写一个压缩器”，而是这四个原则

### 9.1 先稳 Prompt，再谈长上下文

如果 system prompt 每轮都乱变，哪怕你上下文再长，成本和噪声也会越来越失控。

Hermes 是先守 prompt stability，再谈压缩。

### 9.2 上下文预算要按“整个请求”算，不是只算聊天记录

要把：

- system prompt
- 消息历史
- tool schemas

一起算进去。

这点对 Agent 特别关键。

### 9.3 压缩不是删历史，而是重组历史

Hermes 保护头部、保护尾部、总结中间，还把压缩做成 continuation session。

这是一种“结构化保真”，不是简单截断。

### 9.4 压缩链路本身也要被治理

压缩模型有没有足够上下文？
连续压缩几次后质量会不会下降？
tool call / tool result 会不会被切断？

Hermes 都在处理这些问题。

这说明压缩不是一个小功能，而是 Agent Runtime 的关键生存机制。

---

## 10. 最后把压缩边界收住

基于当前 hermes-agent 仓库里的相关源码，Hermes 的上下文压缩机制可以概括成一句话：

它不是在上下文快爆时临时做摘要，而是在围绕稳定 system prompt、预算预估、结构化压缩、session continuation 和缓存命中率，搭一整套长期运行所需的上下文治理层。

支撑这个判断的关键源码事实是：

- `run_agent.py` 用 `self._cached_system_prompt` 把 system prompt 稳定到 session 级，只在压缩后重建
- `agent/prompt_caching.py` 把稳定前缀直接转成缓存策略，降低多轮对话成本
- `agent/model_metadata.py` 负责解析上下文长度、设定最小上下文基线，并为压缩阈值提供前提
- `run_agent.py` 会在真正进主循环前做 preflight compression，并把 tools schema 也算进 token 预算
- `agent/context_compressor.py` 不是简单总结历史，而是先修剪 tool output、保护头尾、只压中段，并清理 tool pair 边界
- `_compress_context()` 会把压缩升级为正式 session 事件，生成 continuation session，而不是偷偷覆盖原历史
- `_check_compression_model_feasibility()` 还会检查辅助压缩模型自己是否装得下待压缩内容

这一篇最该带走的一句话是：

Agent 不是上下文越长越好，而是上下文越需要治理。真正成熟的系统，不是靠“永远别压缩”活着，而是靠“知道什么时候该压、压哪里、压完怎么继续稳定工作”活着。
