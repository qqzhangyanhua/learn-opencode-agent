---
title: 向量库怎么选
description: 从数据规模、过滤能力、多租户、运维成本、混合检索和迁移风险判断向量数据库怎么选。
contentType: support
series: support
contentId: agent-selection-vector-database
shortTitle: 向量库选型
summary: 向量库选型的关键不是品牌，而是过滤、治理、运维和迁移边界。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 判断不同规模和治理要求下的向量库选择
  - 理解 metadata filter、多租户和 hybrid 能力的重要性
  - 避免把向量库当成 RAG 的唯一核心
prerequisites:
  - 已了解 RAG 知识与检索选型
  - 了解向量检索基本概念
recommendedNext:
  - /agent-selection/20-retrieval-patterns
  - /agent-selection/21-enterprise-knowledge-permission
  - /practice/p09-hybrid-retrieval/
practiceLinks:
  - /practice/p07-rag-basics/
  - /practice/p09-hybrid-retrieval/
searchTags:
  - 向量数据库
  - Vector DB
  - RAG
  - Metadata Filter
  - Hybrid Retrieval
navigationLabel: 向量库选型
entryMode: bridge
roleDescription: 适合为知识库、代码库和企业 RAG 选择向量存储时阅读。
---

<ChapterLearningGuide />

## 不要先问品牌

向量库只是 RAG 链路的一层。先问：

- 数据有多大；
- 是否多租户；
- 权限是否依赖 metadata；
- 是否需要 hybrid；
- 是否要自托管；
- 是否能接受迁移成本。

如果 parser、chunk 和 metadata 设计错了，换向量库也救不回来。

## 向量库负责什么

向量库通常负责：

```text
向量存储
  -> 相似度搜索
  -> metadata filter
  -> collection / index 管理
  -> 更新和删除
```

它不负责文档解析、chunk 质量、权限模型、答案引用和生成评估。这些要在 RAG pipeline 里单独设计。

## 选型维度

| 维度 | 为什么重要 |
| --- | --- |
| 过滤能力 | 权限、版本、租户都依赖 filter |
| 写入更新 | 文档更新、删除和重建索引 |
| 多租户 | 企业知识库的隔离边界 |
| hybrid | 处理型号、编号、错误码、专有名词 |
| 运维 | 高可用、备份、扩容、监控 |
| 迁移 | schema 和 embedding 升级成本 |

## 先看数据形态

不同知识库对向量库的要求不一样：

| 数据形态 | 选型重点 |
| --- | --- |
| FAQ 和短文档 | 简单写入、低运维 |
| 产品手册 | metadata、版本、引用 |
| 企业制度 | 权限过滤、删除更新 |
| 客服知识库 | 高频更新、灰度发布 |
| 代码库 | 符号索引、路径过滤、hybrid |
| 多租户 SaaS | 隔离、备份、配额 |

如果数据每天变化，写入和删除比峰值检索性能更重要。如果数据涉及权限，filter 能力比 benchmark 分数更重要。

## 原型和生产的差别

| 维度 | 原型 | 生产 |
| --- | --- | --- |
| 数据量 | 小 | 持续增长 |
| 删除 | 可重建 | 必须可追踪 |
| 权限 | 可忽略 | 必须 filter |
| 评估 | 人工看几条 | 固定评测集 |
| 运维 | 本地即可 | 备份、监控、扩容 |
| 迁移 | 无所谓 | schema 和版本要记录 |

原型选简单，生产选治理能力。

## filter 是企业 RAG 的底线

企业场景里，向量查询通常不是：

```text
query_vector -> top_k
```

而是：

```text
query_vector
  + tenant_id
  + user_acl
  + document_status
  + version
  + sensitivity
  -> top_k
```

如果向量库的 metadata filter 表达能力弱，后面就只能在召回后过滤。这会带来越权召回、TopK 不稳定和 trace 泄露问题。

## 推荐路线

| 场景 | 推荐方向 |
| --- | --- |
| 本地原型 | Chroma / LanceDB |
| 轻量嵌入式 | LanceDB |
| 中小生产自托管 | Qdrant / Weaviate |
| 大规模分布式 | Milvus |
| 托管生产 | Pinecone 等托管服务 |
| 已有搜索体系 | Elasticsearch / OpenSearch + vector |

具体产品会变化，但判断维度不会变。

## 企业场景优先级

企业 RAG 里，优先级通常是：

```text
metadata filter
  -> 多租户隔离
  -> 更新删除流程
  -> hybrid 支持
  -> 运维和备份
  -> 性能优化
```

不要为了跑 benchmark 牺牲权限过滤。速度快但会泄露数据的向量库不能上线。

## POC 要测什么

向量库 POC 不要只测“能不能搜到相似文本”。至少要测：

- 带 metadata filter 的召回质量；
- 更新一篇文档后的可见时间；
- 删除一篇文档后的不可召回时间；
- 多租户隔离；
- hybrid 查询；
- 索引重建时间；
- 备份和恢复；
- embedding 版本升级。

如果 POC 样本只有几十条公开文档，测不出生产里真正会出问题的权限、更新和迁移能力。

## 迁移风险

向量库迁移痛点通常不是向量本身，而是：

- collection schema；
- metadata 命名；
- filter 表达式；
- 索引参数；
- embedding 模型版本；
- 文档 ID 和 chunk ID；
- 删除和更新语义。

从第一天就要保存原始文档、chunk、metadata 和 embedding 版本。否则后面无法重建索引。

## 常见错误

| 错误 | 后果 |
| --- | --- |
| 只按性能榜单选 | 忽略权限、删除和运维 |
| metadata 设计太少 | 后续无法按租户、版本、权限过滤 |
| 不保存 chunk 原文 | embedding 升级时无法重建 |
| 生产和原型共用策略 | 数据增长后无法治理 |
| 向量库承担业务权限 | 权限逻辑分散且难审计 |

向量库应该服从 RAG 数据模型，而不是让 RAG 数据模型被某个产品的默认 schema 反向决定。

## 最终判断

```text
原型：简单优先
企业：filter 优先
大规模：运维优先
已有搜索：hybrid 优先
长期系统：可重建和可迁移优先
```

向量库不是 RAG 的大脑。它只是检索基础设施，真正的质量来自数据治理和评估。
