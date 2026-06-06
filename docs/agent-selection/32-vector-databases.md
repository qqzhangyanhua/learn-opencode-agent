---
title: 向量数据库怎么选
description: 对比 Milvus、Qdrant、Pinecone、Weaviate、Chroma、pgvector、Elasticsearch、Redis Vector、Faiss、LanceDB 和 Vespa 的适用场景。
contentType: support
series: support
contentId: agent-selection-vector-databases-landscape
shortTitle: 向量数据库图谱
summary: 向量数据库选型要看规模、过滤、多租户、运维、Hybrid、数据主权和迁移成本，Milvus 适合平台级大规模向量检索，不适合小型 RAG Demo。
difficulty: intermediate
estimatedTime: 30 分钟
learningGoals:
  - 了解主流向量数据库和向量索引方案的差异
  - 判断 Milvus、Qdrant、Pinecone、pgvector 等分别适合什么场景
  - 避免用向量数据库解决 chunk、权限、重排和知识治理问题
prerequisites:
  - 了解 RAG 基础概念
  - 了解 Embedding 和向量检索
recommendedNext:
  - /agent-selection/33-hybrid-retrieval-rerank
  - /agent-selection/19-vector-database-selection
  - /agent-selection/21-enterprise-knowledge-permission
practiceLinks:
  - /practice/p07-rag-basics/
  - /practice/p09-hybrid-retrieval/
searchTags:
  - 向量数据库
  - Milvus
  - Qdrant
  - Pinecone
  - pgvector
navigationLabel: 向量数据库图谱
entryMode: bridge
roleDescription: 适合在 Milvus、Qdrant、Pinecone、Weaviate、pgvector、Elasticsearch 等方案之间做工程取舍时阅读。
---

<ChapterLearningGuide />

> 说明：本文是截至 2026-06 的选型图谱，不是实时排名。产品能力、托管区域、价格、开源协议和集成方式会变化，采购或上线前请以官方文档、价格页、版本说明和业务样本评测为准。

## 阅读定位

这篇是向量数据库产品图谱，重点比较具体方案的适用边界。如果你还没确定 metadata filter、多租户、更新删除、迁移和 POC 怎么测，先看 [向量库怎么选](/agent-selection/19-vector-database-selection)。

## 这个类别解决什么

向量数据库负责存储向量、执行相似度检索、支持 metadata filter，并管理 collection、index、更新和删除。

它通常存：

```text
chunk_id
  -> vector
  -> text_ref
  -> metadata
  -> tenant_id
  -> acl
  -> source
  -> version
  -> timestamp
```

它不负责：

- 文档解析；
- chunk 质量；
- Embedding 模型选择；
- 业务权限决策；
- rerank；
- 答案生成；
- 引用审计。

向量库是检索基础设施，不是 RAG 的大脑。

## 主流选择有哪些

| 方案 | 本质 | 强项 | 代价 | 适合场景 | 不适合场景 |
| --- | --- | --- | --- | --- | --- |
| Milvus / Zilliz | 分布式向量数据库 | 大规模向量、多索引、多集合、分布式扩展 | 运维复杂，组件多，容量规划要求高 | 千万级/亿级向量、多租户平台、企业级向量检索基础设施 | 小型 RAG、Demo、没有运维团队 |
| Qdrant | 开源向量数据库 | payload filter 强、部署简单、工程体验好 | 极大规模仍需压测和集群规划 | 中大型 RAG、权限过滤、多租户知识库、自托管 | 已有成熟搜索体系且只需轻量向量能力 |
| Pinecone | 托管向量数据库 | 免运维、高可用、快速生产化 | 成本、供应商锁定、数据合规 | SaaS、小团队快速上线、没有运维资源 | 强内网部署、强数据主权、成本敏感 |
| Weaviate | 向量数据库 + schema/object 模型 | schema、hybrid search、多模态能力 | 抽象较多，生态绑定 | 对象化知识库、多模态搜索、schema 驱动检索 | 只需要简单 TopK 向量召回 |
| Chroma | 轻量向量库 | 上手快、本地开发简单 | 生产治理能力有限 | POC、Demo、本地实验、教学项目 | 高并发、权限复杂、企业生产系统 |
| pgvector | PostgreSQL 扩展 | 和业务数据天然结合，事务和 metadata 方便 | 大规模 ANN、高 QPS 要谨慎 | 已有 PostgreSQL、小中规模 RAG、metadata 强依赖 | 亿级向量、高并发专用检索平台 |
| Elasticsearch / OpenSearch Vector | 搜索引擎 + 向量检索 | BM25 + vector hybrid，复用现有搜索体系 | 向量能力不是唯一核心，成本和性能要测 | 关键词检索重要、已有 ES/OpenSearch、需要 Hybrid Retrieval | 纯向量大规模低延迟场景 |
| Redis Vector | 内存数据库 + 向量索引 | 低延迟、缓存友好 | 成本高，大规模长期知识库不合适 | 实时推荐、短期记忆、session 级向量检索 | 长期大规模企业知识库 |
| Faiss | 向量索引库 | 性能强、研究灵活 | 不是完整数据库，没有权限、metadata、服务治理 | 离线检索、算法实验、自研检索服务 | 直接做企业 RAG 生产系统 |
| LanceDB | 嵌入式 / lakehouse 向量存储 | 本地、多模态、数据湖友好 | 企业级服务化成熟度需评估 | 本地 AI 应用、多模态数据集、轻量服务 | 强 SLA 企业检索平台 |
| Vespa | 搜索与推荐 serving 引擎 | 大规模 hybrid ranking、复杂排序 | 学习和运维成本高 | 搜索、推荐、复杂 ranking 系统 | 简单 RAG 问答 |

## Milvus 什么场景下用

Milvus 适合把向量检索当基础设施建设，而不是给一个小 Agent 临时加知识库。

适合 Milvus 的情况：

```text
1. 向量规模很大
   不是几万条，而是千万级、亿级，甚至更高。

2. 需要分布式扩展
   单机向量库已经顶不住，需要分片、扩容和独立存储检索组件。

3. 多业务共用向量检索平台
   多团队、多 collection、多租户共用一套检索基础设施。

4. 需要多种索引策略
   不同业务需要不同索引、召回率、延迟和成本取舍。

5. 有运维团队
   能处理部署、监控、扩容、备份、索引维护和容量规划。
```

不适合 Milvus 的情况：

```text
1. 只是做 RAG Demo
   杀鸡用牛刀。

2. 文档只有几万到几十万条
   pgvector、Qdrant、Chroma 往往更简单。

3. 团队没有数据库运维能力
   Milvus 的复杂度会反噬项目。

4. 主要问题是 chunk、权限、rerank
   换 Milvus 没用。

5. 已经有 PostgreSQL 且规模不大
   pgvector 可能更务实。
```

一句话：Milvus 适合平台级向量检索，不适合小型 RAG 起步。

## Qdrant 什么场景下用

Qdrant 的核心价值是工程简单、过滤能力强、自托管友好。

适合：

- 中大型知识库；
- 需要 payload / metadata filter；
- 企业 RAG 需要租户、权限、版本过滤；
- 团队想自托管，但不想一开始承担 Milvus 级复杂度；
- 需要比较清晰的 API 和部署体验。

不适合：

- 已经有成熟 ES/OpenSearch，且关键词检索是主能力；
- 亿级向量平台级场景但没有压测；
- 完全不想运维。

## Pinecone 什么场景下用

Pinecone 的核心价值是托管生产能力。

适合：

- 小团队快速上线；
- SaaS 产品；
- 没有向量数据库运维团队；
- 高可用、备份、扩容想交给托管服务；
- 数据合规允许外部托管。

不适合：

- 强内网部署；
- 强数据主权；
- 成本极敏感；
- 不接受供应商锁定。

## pgvector 什么场景下用

pgvector 的核心价值是和 PostgreSQL 业务数据天然结合。

适合：

- 已经使用 PostgreSQL；
- 小中规模 RAG；
- 业务 metadata 和关系数据很重要；
- 希望少引入一个新系统；
- QPS 和向量规模可控。

不适合：

- 亿级向量；
- 极高并发低延迟；
- 需要独立向量检索平台；
- 团队误以为 PostgreSQL 扩展可以无脑替代专用向量库。

## Elasticsearch / OpenSearch 什么时候用

如果系统已经有搜索基础设施，先评估 ES/OpenSearch 的 vector + BM25，而不是急着再引入一个向量库。

适合：

- 关键词检索很重要；
- 文档里有错误码、型号、函数名、条款编号；
- 已经有 ES/OpenSearch 运维经验；
- 需要 Hybrid Retrieval；
- 想复用现有搜索索引和权限体系。

不适合：

- 纯向量大规模低延迟场景；
- 没有搜索运维经验；
- 只是为了 RAG Demo 临时搭一套搜索集群。

## 怎么选

```text
只是 POC？
  -> Chroma / pgvector / Qdrant local

已有 PostgreSQL，数据量不大？
  -> pgvector

需要强 metadata filter / ACL？
  -> Qdrant / Weaviate / Milvus，先验证 filter 性能

已有 Elasticsearch / OpenSearch？
  -> 先评估 ES/OpenSearch vector + BM25 hybrid

亿级向量、多租户平台？
  -> Milvus / Zilliz / Pinecone / Vespa

团队不想运维？
  -> Pinecone / Zilliz Cloud / Weaviate Cloud

数据不能出内网？
  -> 自托管 Qdrant / Milvus / Weaviate / pgvector

需要极低延迟短期记忆？
  -> Redis Vector

只是算法实验？
  -> Faiss
```

## 选型时看哪些指标

| 指标 | 为什么重要 |
| --- | --- |
| 数据规模 | 决定单机、嵌入式、托管还是分布式 |
| QPS 和延迟 | 决定索引策略和服务架构 |
| metadata filter | 权限、租户、版本和来源都依赖它 |
| 更新删除 | 企业知识库会持续变更 |
| 多租户 | SaaS 和企业内部系统必须隔离 |
| Hybrid 能力 | 影响 BM25 + vector 的组合成本 |
| 运维复杂度 | 决定团队能不能长期维护 |
| 迁移成本 | schema、filter 表达式、索引参数都会锁定 |
| 数据合规 | 决定能不能使用托管服务 |

## 典型误判

| 误判 | 问题 |
| --- | --- |
| 大厂或热门产品一定适合 | 你的数据规模、权限、团队能力才是关键 |
| Milvus 更高级所以默认选 Milvus | 小型 RAG 会被运维复杂度拖死 |
| Chroma 跑通 Demo 就能生产 | Demo 能搜到，不代表能做权限、备份和高可用 |
| pgvector 可以无脑替代向量库 | 小中规模可以，大规模和高 QPS 要实测 |
| 向量库解决 RAG 不准 | 很多问题在 parser、chunk、metadata、rerank |
| 召回后过滤权限就行 | 无权内容已经进入候选和 trace，风险已经发生 |

## 最小推荐

| 场景 | 推荐 |
| --- | --- |
| 本地 Demo | Chroma / LanceDB |
| 已有 PostgreSQL 的小中规模 RAG | pgvector |
| 自托管中大型企业 RAG | Qdrant / Weaviate |
| 平台级大规模向量检索 | Milvus / Zilliz / Vespa |
| 快速生产且不想运维 | Pinecone / Zilliz Cloud / Weaviate Cloud |
| 已有搜索体系且需要 Hybrid | Elasticsearch / OpenSearch Vector |
| 短期记忆和低延迟缓存 | Redis Vector |
| 算法实验和离线索引 | Faiss |

## 最终判断

```text
Demo：Chroma / LanceDB
已有 PG：pgvector
强过滤：Qdrant
托管生产：Pinecone
大规模平台：Milvus
已有搜索：Elasticsearch / OpenSearch
算法实验：Faiss
```

不要从品牌开始选。先看规模、权限、过滤、运维和迁移成本。
