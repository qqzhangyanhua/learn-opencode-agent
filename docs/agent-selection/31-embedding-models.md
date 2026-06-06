---
title: Embedding 模型怎么选
description: 对比 OpenAI、Cohere、Voyage、BGE、E5、GTE、Jina、Nomic 等 Embedding 模型，判断不同 RAG 和 Agent 场景该怎么选。
contentType: support
series: support
contentId: agent-selection-embedding-models
shortTitle: Embedding 模型选型
summary: Embedding 模型选型要看语言、领域、部署方式、成本、维度、吞吐和评测样本，而不是只看榜单排名。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 了解主流托管和开源 Embedding 模型的差异
  - 判断中文、多语言、代码、私有化和大规模入库场景该怎么选
  - 避免用 Embedding 模型解决 chunk、权限、实时性和重排问题
prerequisites:
  - 了解 RAG 基础概念
  - 了解向量检索的基本含义
recommendedNext:
  - /agent-selection/32-vector-databases
  - /agent-selection/33-hybrid-retrieval-rerank
  - /agent-selection/03-rag-knowledge-selection
practiceLinks:
  - /practice/p07-rag-basics/
  - /practice/p09-hybrid-retrieval/
searchTags:
  - Embedding
  - RAG
  - BGE
  - E5
  - Voyage
navigationLabel: Embedding 模型选型
entryMode: bridge
roleDescription: 适合为企业知识库、代码库 Agent、多语言 RAG 和私有化检索系统选择 Embedding 模型时阅读。
---

<ChapterLearningGuide />

> 说明：本文是截至 2026-06 的选型图谱，不是实时排名。模型能力、价格、部署选项和版本会变化，采购或上线前请以官方文档、价格页、版本说明和业务样本评测为准。

## 阅读定位

这篇只解决 Embedding 模型选型，不解决完整 RAG 架构。Chunk、metadata、权限过滤、Hybrid、Rerank 和评估闭环需要结合后续文章一起设计。

## 这个类别解决什么

Embedding 模型负责把文本、代码或其他内容编码成向量，让系统可以用相似度做语义召回。

它解决的是：

```text
文本或代码
  -> 向量表示
  -> 相似度检索
  -> 候选 chunk
```

它不解决：

- 文档解析；
- chunk 边界；
- 权限过滤；
- 文档版本；
- 实时信息；
- rerank 排序；
- 最终答案是否忠于引用。

如果 chunk、metadata 或权限模型错了，换更贵的 Embedding 模型也救不回来。

## 主流选择有哪些

| 方案 | 本质 | 强项 | 代价 | 适合场景 | 不适合场景 |
| --- | --- | --- | --- | --- | --- |
| OpenAI text-embedding-3-small | 托管 Embedding | 成本低、通用、多语言能力稳定 | 依赖外部服务，合规要评估 | SaaS、通用知识库、成本敏感生产系统 | 数据不能出域、强私有化 |
| OpenAI text-embedding-3-large | 托管 Embedding | 精度更高、通用能力强 | 成本更高，向量维度和存储成本更高 | 高质量通用 RAG、多语言知识库 | 极低成本、大规模离线入库 |
| Cohere Embed | 托管 Embedding | 企业搜索、多语言、检索任务优化 | 成本和供应商绑定 | 企业搜索、多语言 RAG | 强内网部署 |
| Voyage Embeddings | 托管 Embedding | 检索、代码、专业领域模型选择多 | 依赖外部服务，版本选择要评测 | 代码 RAG、法律、金融等专业检索 | 数据不能出域 |
| BGE 系列 | 开源 Embedding | 中文、多语言、本地部署友好 | 需要部署、压测和调优 | 中文知识库、私有化、本地 RAG | 不想维护模型服务 |
| BGE-M3 | 开源多语言 Embedding | 多语言，支持 dense、sparse、多向量思路 | 部署和性能调优成本更高 | 中英混合、私有化、Hybrid 检索 | 极简 Demo |
| E5 系列 | 开源 Embedding | 通用检索稳定，生态成熟 | 中文和领域效果要实测 | 开源通用 RAG、本地部署 | 强中文业务不验证直接上线 |
| GTE 系列 | 开源 Embedding | 中文/英文通用语义检索 | 需要用业务样本 benchmark | 通用知识库、本地部署 | 高精度生产场景不测试直接用 |
| Jina Embeddings | 开源/托管 Embedding | 长文本、多语言、多模态方向能力 | 具体版本差异要验证 | 长文档、多语言、多模态场景 | 简单低成本中文 RAG |
| Nomic Embed | 开源 Embedding | 本地、低成本、通用 | 极高精度场景要评估 | 本地应用、低成本 RAG | 企业高精度问答直接上线 |

不要把这个表当排名。Embedding 模型必须用自己的问题、自己的文档和自己的语言测。

## 怎么选

```text
中文知识库？
  -> BGE / BGE-M3 / GTE / OpenAI / Cohere 都可以进候选。
     用中文业务样本实测，不要只看英文榜单。

中英混合？
  -> 优先多语言 Embedding。
     不要让中英文进入两个不可对齐的向量空间。

代码库 Agent？
  -> 不要只靠普通文本 Embedding。
     要结合符号索引、文件路径、调用关系和测试关系。

私有化部署？
  -> BGE / E5 / GTE / Jina / Nomic 优先。

快速生产，不想维护模型服务？
  -> OpenAI / Cohere / Voyage 这类托管模型优先。

大规模入库，成本敏感？
  -> 先选低成本模型，再用 Hybrid + Rerank 补精度。

高精度问答？
  -> Embedding 只是第一阶段召回，通常还要 Reranker。
```

## 关键指标

| 指标 | 含义 | 工程影响 |
| --- | --- | --- |
| 维度 | 向量长度 | 影响存储、索引大小和检索成本 |
| 上下文长度 | 单次可编码文本长度 | 影响 chunk 策略 |
| 多语言能力 | 不同语言是否能对齐到同一语义空间 | 影响中英混合知识库 |
| 领域能力 | 是否适合代码、法律、金融、医学等资料 | 影响垂直知识库召回 |
| 吞吐 | 单位时间可编码多少文本 | 影响入库速度和更新成本 |
| 成本 | 调用或部署成本 | 影响大规模索引和重建 |
| 可部署性 | 托管还是本地 | 影响合规、运维和延迟 |
| 版本稳定性 | 模型升级是否改变向量空间 | 影响索引重建 |

Embedding 模型一换，旧向量通常不能直接混用。生产系统要记录 `embedding_model`、`dimension`、`version` 和构建时间。

## 不同场景的推荐方向

| 场景 | 推荐方向 | 不要先做什么 |
| --- | --- | --- |
| POC / Demo | OpenAI small、Chroma 默认模型、BGE 小模型 | 不要一开始自建复杂模型服务 |
| 中文企业知识库 | BGE / BGE-M3 / GTE / OpenAI，多模型实测 | 不要只看英文 benchmark |
| 多语言知识库 | 多语言 Embedding | 不要按语言拆成互不兼容的索引 |
| 代码库 RAG | 代码友好 Embedding + 符号索引 | 不要只按普通文档切 chunk |
| 强私有化 | 开源 Embedding 本地部署 | 不要把敏感资料发给外部服务 |
| 大规模低成本 | 低成本 Embedding + Hybrid + Rerank | 不要直接用最贵模型全量入库 |
| 高准确问答 | 强 Embedding + Rerank + 固定评测集 | 不要只优化最终答案 prompt |

## 典型误判

| 误判 | 问题 |
| --- | --- |
| Embedding 越大越好 | 更大意味着更高存储、成本和延迟，不一定更适合业务样本 |
| 换 Embedding 就能解决 RAG 不准 | chunk、metadata、权限、版本错了，换模型没用 |
| 只看榜单 | 榜单样本和你的业务问题通常不是一回事 |
| 中文模型一定适合所有中文业务 | 法规、客服、代码、产品文档的分布完全不同 |
| 代码库 RAG 只靠 Embedding | 代码需要符号、路径、调用图和测试关系 |
| 托管模型一定省事 | 数据合规、调用成本和供应商锁定要单独评估 |

## 最小推荐

| 阶段 | 推荐 |
| --- | --- |
| 本地试验 | BGE / E5 / GTE 小模型，或托管 small 模型 |
| 通用 SaaS | OpenAI / Cohere / Voyage 这类托管模型 |
| 企业内网 | BGE / BGE-M3 / E5 / GTE 本地部署 |
| 代码库 Agent | 代码友好 Embedding + 符号索引 + Hybrid |
| 高精度生产 | Embedding + BM25 + Rerank + 固定评测集 |

## 最终判断

```text
中文：用业务样本测
多语言：选多语言模型
代码：Embedding 只是辅助
私有化：开源模型优先
大规模：成本和重建优先
高精度：Embedding + Rerank
```

Embedding 模型是召回入口，不是 RAG 质量的全部。真正的工程质量来自 chunk、metadata、权限、Hybrid、Rerank 和评估闭环。
