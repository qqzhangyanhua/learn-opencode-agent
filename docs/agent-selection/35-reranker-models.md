---
title: Reranker 模型怎么选
description: 对比 Cohere Rerank、Voyage Rerank、Jina Reranker、BGE Reranker、ColBERT、LLM-as-reranker 和自训练 Reranker 的适用场景。
contentType: support
series: support
contentId: agent-selection-reranker-models
shortTitle: Reranker 模型选型
summary: Reranker 解决候选排序问题，不解决召回漏；选型要看精度、延迟、成本、语言、私有化和候选规模。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 区分 API Reranker、开源 Cross-Encoder、Late Interaction 和 LLM-as-reranker 的边界
  - 判断中文、多语言、代码、企业私有化和高精度 RAG 场景该怎么选 Reranker
  - 避免用 Rerank 掩盖召回、chunk、metadata 和权限问题
prerequisites:
  - 已了解 Embedding 和向量数据库
  - 已了解 Hybrid Retrieval 和 Rerank 的基本作用
recommendedNext:
  - /agent-selection/33-hybrid-retrieval-rerank
  - /agent-selection/20-retrieval-patterns
  - /agent-selection/37-observability-evaluation-tools
practiceLinks:
  - /practice/p09-hybrid-retrieval/
searchTags:
  - Rerank
  - Reranker
  - Cross Encoder
  - RAG
  - Retrieval Evaluation
navigationLabel: Reranker 模型选型
entryMode: bridge
roleDescription: 适合为高精度 RAG、企业知识库、代码库 Agent 和客服知识库选择重排模型时阅读。
---

<ChapterLearningGuide />

> 说明：本文是截至 2026-06 的选型图谱，不是实时排名。模型能力、价格、部署选项和版本会变化，采购或上线前请以官方文档、价格页、版本说明和业务样本评测为准。

## 阅读定位

这篇只解决 Reranker 模型和方案选型，默认你已经知道 Rerank 在检索链路中的位置。如果你还没判断问题是召回漏、排序错、chunk 错还是权限错，先看 [Hybrid Retrieval 和 Rerank 怎么选](/agent-selection/33-hybrid-retrieval-rerank)。

## 这个类别解决什么

Reranker 负责对已经召回的候选结果重新排序。

```text
query
  -> retriever 召回 candidates
  -> reranker 重新打分
  -> 选择更少、更准的 context
  -> LLM 生成答案
```

它解决的是排序质量，不是召回覆盖。

必须先记住一句话：

```text
Reranker 不能召回新文档。
如果正确 chunk 没进候选集，Reranker 救不了。
```

## 主流选择有哪些

| 方案 | 本质 | 强项 | 代价 | 适合场景 | 不适合场景 |
| --- | --- | --- | --- | --- | --- |
| Cohere Rerank | 托管 Rerank API | 企业搜索、多语言、接入简单 | 成本、外部调用、数据合规 | 快速生产、高精度通用 RAG、多语言知识库 | 强私有化、极低延迟 |
| Voyage Rerank | 托管 Rerank API | 检索任务优化，适合和 Voyage Embedding 组合评估 | 成本和供应商绑定 | 专业领域 RAG、代码/法律/金融等候选评估 | 数据不能出域 |
| Jina Reranker | 开源/托管 Reranker | 多语言、开源部署选项、长文档方向可评估 | 版本差异和部署性能要测试 | 多语言、本地化、长文本候选重排 | 不想维护模型服务 |
| BGE Reranker | 开源 Cross-Encoder | 中文和多语言私有化友好，生态常见 | 推理成本高于 Embedding，吞吐要压测 | 中文企业知识库、本地 RAG、私有化 | 超低延迟高并发场景 |
| bge-reranker-v2 系列 | 开源 Reranker 系列 | 中文、多语言和不同尺寸选择 | 需要按业务样本选尺寸 | 本地部署、中文 RAG、成本可控生产 | 没有 GPU/推理资源 |
| ColBERT / Late Interaction | Late Interaction 检索/重排 | 保留 token 级匹配信息，精度和可解释性好 | 存储和系统复杂度高 | 学术检索、高精度搜索、复杂检索系统 | 普通企业 RAG 起步 |
| LLM-as-reranker | 用大模型给候选排序 | 可解释、可处理复杂意图和领域规则 | 成本高、延迟高、稳定性要评估 | 小候选集、高价值任务、复杂判断 | 高频查询、大候选集、低延迟场景 |
| 自训练 Reranker | 用业务标注数据训练 | 最贴近业务分布 | 标注、训练、评估和维护成本高 | 大规模稳定业务、强领域术语、长期产品 | 没有标注样本、需求还在变化 |

## 什么时候需要 Reranker

适合加 Reranker 的情况：

```text
1. 正确 chunk 已经进了 TopK，但经常排得靠后
2. 向量检索召回了很多相似但无关的候选
3. LLM 上下文预算紧，需要只保留更准的片段
4. 答案质量对引用片段顺序很敏感
5. 企业知识库、客服知识库、法规文档需要更高精度
```

不该先加 Reranker 的情况：

```text
1. 正确文档没进候选集
   -> 先修召回、Hybrid、Query Rewrite

2. chunk 切坏了
   -> 先修 chunk，不要重排破碎片段

3. metadata 或 ACL 错了
   -> 先修过滤，Reranker 不能做权限系统

4. 文档版本错了
   -> 先修 source/version/timestamp

5. 最终生成编造
   -> 先修 citation 和 answer grounding
```

## API Reranker 什么时候用

托管 Reranker 的价值是快速、稳定、少运维。

适合：

- 团队不想维护模型服务；
- 数据可以外发；
- 需要快速验证 Rerank 收益；
- 查询量还没大到成本失控；
- 多语言能力需要稳定基线。

不适合：

- 数据不能出内网；
- 极低延迟；
- 高频大流量；
- 成本对每次查询非常敏感；
- 强定制领域排序规则。

## 开源 Cross-Encoder 什么时候用

开源 Cross-Encoder 适合私有化和成本可控场景。

适合：

- 中文知识库；
- 企业内网；
- 数据合规要求强；
- 可以部署 GPU / 推理服务；
- 希望长期降低 API 成本。

代价：

- 需要模型服务；
- 需要批量推理优化；
- 需要监控延迟和吞吐；
- 需要定期评估模型版本。

## LLM-as-reranker 什么时候用

LLM-as-reranker 不是默认方案，它适合少量、高价值、复杂判断。

适合：

- 候选数量少；
- 每次查询价值高；
- 需要按复杂业务规则排序；
- 需要解释为什么某个候选更相关；
- 普通 Reranker 难以理解任务意图。

不适合：

- 高频客服问答；
- 大量候选重排；
- 严格低延迟；
- 成本敏感；
- 需要稳定打分的一致性评估。

## 怎么选

```text
只是想验证 Rerank 是否有收益？
  -> 先用托管 Rerank API 做 A/B

中文私有化知识库？
  -> BGE Reranker / Jina Reranker 本地部署候选

多语言 SaaS？
  -> Cohere / Voyage / Jina 托管方案进入评测

代码库 RAG？
  -> 先做 Hybrid + 符号索引，再评估代码友好的 Rerank 或 LLM-as-reranker

候选集很大？
  -> 先缩小 candidates，再 rerank；不要让 Reranker 吃几百上千个 chunk

高价值复杂研究任务？
  -> LLM-as-reranker 可以作为第二阶段判断

长期大规模稳定业务？
  -> 考虑自训练 Reranker
```

## 选型指标

| 指标 | 为什么重要 |
| --- | --- |
| TopK 排名提升 | 判断 Rerank 是否真的把正确 chunk 排上来 |
| Recall@K 输入覆盖 | 正确 chunk 不在输入里，Rerank 无意义 |
| MRR / nDCG | 衡量排序质量 |
| 延迟 | 每次查询多一层模型调用 |
| 成本 | 高频场景成本会快速放大 |
| 吞吐 | 本地部署必须压测并发能力 |
| 语言能力 | 中文、多语言、代码场景差异很大 |
| 上下文长度 | 长 chunk 可能被截断或效果下降 |
| 可解释性 | 评审和 debug 是否能解释排序变化 |

## 典型误判

| 误判 | 问题 |
| --- | --- |
| RAG 不准就加 Rerank | 可能根因是召回漏、chunk 错、metadata 错 |
| Reranker 越大越好 | 延迟、成本和吞吐会反噬系统 |
| Rerank 后最终答案变好就算成功 | 要看正确 chunk 排名是否稳定提升 |
| 把几百个 chunk 都交给 Reranker | 成本和延迟爆炸，候选质量也未必好 |
| 用 Reranker 做权限过滤 | 权限必须在检索前或检索时控制 |

## 最小推荐

| 场景 | 推荐 |
| --- | --- |
| POC | 托管 Rerank API 快速验证收益 |
| 中文私有化 | BGE / Jina 本地 Reranker |
| 多语言 SaaS | Cohere / Voyage / Jina 托管方案评测 |
| 企业知识库 | Hybrid + metadata filter + Rerank |
| 代码库 Agent | Hybrid + 符号索引优先，再评估 Rerank |
| 高价值复杂任务 | 小候选集 + LLM-as-reranker |
| 大规模稳定业务 | 自训练 Reranker |

## 最终判断

```text
召回漏：别加 Rerank
排序错：加 Rerank
中文私有化：开源 Reranker
快速验证：托管 Rerank API
复杂判断：LLM-as-reranker
大规模稳定：自训练 Reranker
```

Reranker 是排序层，不是万能补丁。先证明正确候选已经进来了，再谈重排。
