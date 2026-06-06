---
title: Hybrid Retrieval 和 Rerank 怎么选
description: 对比 Dense Retrieval、BM25、Hybrid Retrieval、Rerank、Query Rewrite、Multi-query、Context Compression、GraphRAG 和 Long Context 的适用场景。
contentType: support
series: support
contentId: agent-selection-hybrid-retrieval-rerank
shortTitle: Hybrid 与 Rerank 选型
summary: Hybrid 解决召回互补，Rerank 解决候选排序，GraphRAG 解决关系密集问题，Long Context 解决少量长文档整体阅读，不能混用。
difficulty: advanced
estimatedTime: 30 分钟
learningGoals:
  - 区分 Dense、Sparse、Hybrid、Rerank、GraphRAG 和 Long Context 的边界
  - 判断错误码、函数名、政策编号、自然语言问题等场景该用什么检索组合
  - 避免用 Rerank 解决召回漏、用 Long Context 解决权限、用 GraphRAG 掩盖 parser 问题
prerequisites:
  - 了解 RAG 基础概念
  - 了解 Embedding 和向量数据库
recommendedNext:
  - /agent-selection/20-retrieval-patterns
  - /agent-selection/21-enterprise-knowledge-permission
  - /agent-selection/22-code-rag-structure
practiceLinks:
  - /practice/p08-graphrag/
  - /practice/p09-hybrid-retrieval/
searchTags:
  - Hybrid Retrieval
  - Rerank
  - BM25
  - GraphRAG
  - Long Context
navigationLabel: Hybrid 与 Rerank
entryMode: bridge
roleDescription: 适合为企业知识库、代码库 Agent、客服知识库和研究型 Agent 设计检索链路时阅读。
---

<ChapterLearningGuide />

> 说明：本文是截至 2026-06 的选型图谱，不是实时排名。检索组件、模型能力、价格和部署选项会变化，采购或上线前请以官方文档、版本说明和业务样本评测为准。

## 阅读定位

这篇是检索组件图谱，重点解释 Dense、BM25、Hybrid、Rerank、Query Rewrite、GraphRAG、Long Context 等组件的边界。如果你正在定位一个 RAG 失败样本，想按 parser、chunk、召回、排序、权限、生成逐层归因，先看 [Hybrid、Rerank、GraphRAG、Long Context 怎么选](/agent-selection/20-retrieval-patterns)。

## 这个类别解决什么

检索链路不是只有向量搜索。一个生产 RAG 通常至少要考虑：

```text
Query
  -> Query Rewrite
  -> Dense Retrieval
  -> Sparse Retrieval / BM25
  -> Candidate Merge
  -> Metadata Filter
  -> Rerank
  -> Context Compression
  -> Generation
```

不同组件解决不同问题。混在一起，系统会越来越贵，但错误仍然定位不出来。

## 主流选择有哪些

| 方案 | 解决什么 | 强项 | 缺点 | 适合场景 |
| --- | --- | --- | --- | --- |
| Dense Retrieval | 语义相似召回 | 同义表达、自然语言问题 | 对精确词、编号、代码符号不稳定 | 普通知识问答 |
| BM25 / Sparse Retrieval | 关键词召回 | 错误码、函数名、专有名词、条款编号 | 语义泛化弱 | 技术文档、代码、法规、产品手册 |
| Hybrid Retrieval | Dense + Sparse 合并 | 同时兼顾语义和关键词 | 合并策略、权重、去重复杂 | 企业知识库、代码库、客服知识库 |
| Rerank | 对候选结果重新排序 | 提高 TopK 质量 | 不能召回没被召回的文档，增加延迟 | 高精度 RAG |
| Query Rewrite | 改写用户问题 | 提高召回表达 | 可能改错意图 | 用户问题口语化、上下文依赖强 |
| Multi-query Retrieval | 多问题扩展召回 | 覆盖更多表达方式 | 成本和噪音增加 | 复杂研究型问题 |
| Context Compression | 压缩上下文 | 降低 token，提高相关性 | 可能丢信息 | TopK 很长、上下文预算紧 |
| GraphRAG | 图谱关系检索 | 实体关系、多跳问题、全局总结 | 构建和维护成本高 | 组织、人物、系统依赖、知识图谱场景 |
| Long Context | 直接塞更多上下文 | 简化少量长文档分析 | 成本高、延迟高、权限风险仍在 | 小规模资料、临时分析、低频任务 |

## Dense Retrieval 什么时候够用

Dense Retrieval 适合自然语言语义匹配。

适合：

- 用户用不同说法问同一个意思；
- FAQ 和产品文档问答；
- 概念解释；
- 语义相似的段落召回。

不适合单独使用：

- 错误码；
- API 名；
- 函数名；
- 订单号；
- 政策编号；
- 版本号；
- 人名、组织名等精确实体。

如果用户会搜 `ERR_CONN_RESET`、`useSession`、`GB/T 35273`，只靠 Dense Retrieval 会不稳。

## BM25 什么时候必须有

BM25 / Sparse Retrieval 适合精确词匹配。

必须优先考虑 BM25 的场景：

```text
1. 技术文档
   API 名、错误码、类名、配置项很多。

2. 代码库 Agent
   文件名、函数名、变量名、路径都很重要。

3. 法规和制度
   条款编号、地区、年份、政策名很重要。

4. 客服知识库
   产品型号、订单状态、业务术语很多。

5. 企业知识库
   部门、系统名、项目名、缩写经常出现。
```

BM25 的问题是语义泛化弱。所以它通常不是替代向量检索，而是和向量检索组合。

## 什么时候必须 Hybrid

Hybrid Retrieval 的价值是让 Dense 和 Sparse 互补。

```text
用户会搜错误码、函数名、订单号、政策编号？
  -> BM25 必须有

用户会用自然语言描述问题？
  -> Dense 必须有

文档既有专业术语，又有语义问答？
  -> Hybrid

代码库 RAG？
  -> Hybrid 基本是底线

企业知识库？
  -> Hybrid + metadata filter + rerank 通常更稳
```

典型融合方式：

| 方式 | 特点 | 风险 |
| --- | --- | --- |
| 分数加权 | 直观，容易实现 | Dense 分数和 BM25 分数尺度不同，不能直接相加 |
| Reciprocal Rank Fusion | 稳健，常用于多路召回合并 | 需要保留各路排名 |
| 规则提升 | 对标题、路径、精确词命中加权 | 规则太多会变成手工调参地狱 |
| 学习排序 | 可用训练数据学习融合 | 需要足够标注样本 |

不要把向量分数和 BM25 分数直接相加。分数尺度不同，结果会失真。

## Rerank 什么时候用

Rerank 适合排序问题，不适合召回问题。

适合 Rerank：

```text
正确文档已经进入候选集，但排序靠后
  -> 用 Rerank

TopK 里混入大量相似但无关内容
  -> 用 Rerank

需要更高答案精度
  -> 用 Rerank

想减少塞进 LLM 的上下文
  -> Rerank 后只取高质量片段
```

不要误用：

```text
Rerank 不能召回新文档。
如果正确文档没进候选集，Rerank 救不了。
```

Rerank 的代价：

- 多一次模型或 reranker 调用；
- 延迟上升；
- 成本上升；
- 需要保存重排前后的候选列表；
- 可能牺牲来源多样性。

## Query Rewrite 什么时候用

Query Rewrite 适合用户问题太口语、太省略、依赖上下文的场景。

适合：

- 多轮对话里的省略问题；
- 用户问“这个怎么处理”，需要补全指代；
- 用户表达和文档术语差异很大；
- 需要加入时间、地区、系统名等过滤条件。

风险：

- 改错用户意图；
- 增加延迟；
- 把原本应该拒答的问题改成可检索问题；
- 改写后丢失关键约束。

Query Rewrite 要保留原始 query 和改写 query，方便 debug。

## GraphRAG 什么时候值得上

GraphRAG 适合关系密集问题，不适合普通 FAQ。

适合：

- 实体关系密集；
- 跨文档汇总；
- 组织、人物、项目、事件之间有关联；
- 需要全局视角；
- 用户问题经常涉及多跳关系。

不适合：

- 小型 FAQ；
- 高频更新文档；
- 关系抽取质量不稳定；
- 没有跨文档问题样本；
- 没有图谱维护能力。

GraphRAG 的关键不是“有没有图数据库”，而是实体和关系抽取是否可靠。实体抽错，图只会把噪声组织得更像真的。

## Long Context 什么时候用

Long Context 适合少量长文档整体阅读，不适合作为企业知识库默认替代品。

适合：

- 少量长文档；
- 低频分析任务；
- 权限边界简单；
- 用户需要整体阅读和总结；
- 成本和延迟可接受。

不适合：

- 多租户权限复杂；
- 文档很多；
- 高频查询；
- 需要稳定引用；
- 需要可重复评估；
- 需要低成本低延迟。

长上下文扩大容量，但不会自动提升事实可靠性。把无权资料塞进长上下文，就是更贵的泄露。

## 失败现象怎么定位

| 失败现象 | 优先检查 | 不要先做什么 |
| --- | --- | --- |
| 错误码找不到 | BM25 / keyword recall | 不要只换 Embedding |
| 同义问题找不到 | Dense Retrieval / Query Rewrite | 不要只加关键词 |
| 正确文档在 TopK 但排很后 | Rerank | 不要扩大 chunk |
| TopK 全是噪音 | chunk / metadata / Query Rewrite | 不要盲目加 TopK |
| 权限外文档被召回 | metadata filter / ACL | 不要生成后过滤 |
| 文档过期 | version / timestamp filter | 不要换 Rerank 模型 |
| 答案引用错 | citation binding | 不要只调 prompt |
| 多文档关系答不出来 | 实体和关系建模 | 不要直接上更大 TopK |
| 少量长文档读不完整 | Long Context 或分段阅读 | 不要建复杂向量库 |

## 最小推荐

| 场景 | 推荐 |
| --- | --- |
| 普通 FAQ | Dense Retrieval 起步，必要时加 Rerank |
| 技术文档 | Hybrid Retrieval |
| 代码库 Agent | Hybrid + 符号索引 + 路径 metadata |
| 企业知识库 | Hybrid + metadata filter + Rerank + Citation |
| 客服知识库 | Hybrid + 版本过滤 + 人工转接策略 |
| 研究型 Agent | Search + Reader + Multi-query + 引用检查 |
| 关系密集资料 | GraphRAG，但先验证实体关系质量 |
| 少量长资料 | Long Context，注意成本和权限 |

## 最终判断

```text
语义问题：Dense
精确词：BM25
两者都有：Hybrid
排不准：Rerank
问法差异大：Query Rewrite
关系密集：GraphRAG
少量长文档：Long Context
权限复杂：Metadata Filter
```

先定位失败发生在哪一层，再加组件。否则只是把系统变重。
