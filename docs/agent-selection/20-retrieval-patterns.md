---
title: Hybrid、Rerank、GraphRAG、Long Context 怎么选
description: 判断混合检索、重排、GraphRAG 和长上下文 RAG 各自适合什么问题。
contentType: support
series: support
contentId: agent-selection-retrieval-patterns
shortTitle: 检索模式选型
summary: 不同检索增强方案解决不同缺口：召回、排序、关系推理和上下文容量不能混用。
difficulty: advanced
estimatedTime: 30 分钟
learningGoals:
  - 区分 Hybrid Retrieval、Rerank、GraphRAG 和 Long Context 的作用
  - 判断什么时候应该升级检索链路
  - 避免用重方案掩盖 chunk、metadata 和评估问题
prerequisites:
  - 已了解 RAG 选型
  - 已了解向量库选型
recommendedNext:
  - /agent-selection/21-enterprise-knowledge-permission
  - /agent-selection/22-code-rag-structure
  - /practice/p09-hybrid-retrieval/
practiceLinks:
  - /practice/p08-graphrag/
  - /practice/p09-hybrid-retrieval/
searchTags:
  - Hybrid Retrieval
  - Rerank
  - GraphRAG
  - Long Context
  - RAG
navigationLabel: 检索模式选型
entryMode: bridge
roleDescription: 适合优化 RAG 召回、排序、关系推理和长文档问答时阅读。
---

<ChapterLearningGuide />

## 先定位问题

| 问题 | 优先方案 |
| --- | --- |
| 关键词、编号、错误码找不到 | Hybrid Retrieval |
| 召回到了但排序不稳 | Rerank |
| 需要跨实体和关系推理 | GraphRAG |
| 少量长文档整体理解 | Long Context |
| 权限过滤复杂 | Metadata filter，不是 rerank |
| chunk 破坏语义 | 先修 chunk |

不要直接上 GraphRAG 或长上下文。先确认基础检索到底坏在哪里。

## 先做失败样本归因

每个 RAG 失败样本先标注根因：

| 根因 | 现象 | 修复方向 |
| --- | --- | --- |
| 解析失败 | 表格、PDF、代码结构丢失 | parser |
| chunk 错 | 关键上下文被切断 | chunk 策略 |
| 召回漏 | 正确文档没进 TopK | hybrid / query rewrite |
| 排序错 | 正确文档在后面 | rerank |
| 权限错 | 召回了不该看的内容 | metadata filter |
| 生成错 | 资料正确但回答编造 | prompt / citation |

只有当根因定位清楚，才知道该加 hybrid、rerank，还是先修数据。

## 不同问题不要混用方案

检索增强方案不是互相替代：

| 误用 | 问题 |
| --- | --- |
| 用 rerank 解决召回漏 | 正确文档没进候选，重排无效 |
| 用 Long Context 解决权限 | 无权资料进入上下文就是泄露 |
| 用 GraphRAG 解决 parser 差 | 图会放大错误实体和关系 |
| 用 hybrid 解决生成编造 | 资料正确但生成错，需要引用和评估 |
| 用更大 TopK 解决 chunk 错 | 只会带来更多噪声 |

先定位缺口，再选升级方案。否则系统会越来越重，问题仍然存在。

## Hybrid Retrieval

适合：

- 型号；
- 版本号；
- API 名；
- 类名函数名；
- 错误码；
- 人名和组织名。

Hybrid 的价值是让语义召回和关键词召回互补。它不能自动解决权限、冲突和引用问题。

典型融合方式有三种：

| 方式 | 特点 |
| --- | --- |
| 分数加权 | 简单，但分数尺度要归一化 |
| Reciprocal Rank Fusion | 稳健，适合多个检索器合并 |
| 规则提升 | 对标题、路径、精确词命中加权 |

不要把向量分数和 BM25 分数直接相加。分数尺度不同，结果会失真。

## Rerank

适合：

- TopK 候选多；
- 向量召回相关但排序不准；
- 精度要求高；
- 可以接受额外延迟和成本。

Rerank 是排序层，不是召回层。召回不到的内容，rerank 没法救。

Rerank 的工程代价：

- 多一次模型或 reranker 调用；
- 延迟上升；
- 成本上升；
- 需要保存重排前后的候选，方便 debug。

如果 TopK 里没有正确答案，先修召回，不要加 rerank。

## Rerank 的验收方式

Rerank 要用排序指标验收，而不是只看最终答案：

- 正确 chunk 是否进入 rerank 输入；
- rerank 后正确 chunk 排名是否上升；
- 延迟增加是否可接受；
- 成本是否进入预算；
- 是否保存重排前后列表；
- 是否存在把多样来源排掉的问题。

如果 rerank 后答案变好，但 trace 里看不出为什么变好，后续调参会很困难。

## GraphRAG

适合：

- 实体关系密集；
- 跨文档汇总；
- 组织、人物、项目、事件之间有关联；
- 需要全局视角。

不适合：

- 小型 FAQ；
- 高频更新文档；
- 关系抽取质量不稳定；
- 没有评估集的项目。

GraphRAG 构建贵、更新难、调试复杂。没有关系密度就不要上。

GraphRAG 的关键不是“图数据库”，而是实体和关系抽取是否可靠：

```text
文档
  -> 实体抽取
  -> 关系抽取
  -> 图构建
  -> 社区或子图检索
  -> 生成总结
```

如果实体抽取质量差，图结构只会放大噪声。

## GraphRAG 的准入条件

上 GraphRAG 前至少确认：

- 资料里实体和关系密度高；
- 关系抽取能稳定复核；
- 更新频率不高；
- 有跨文档问题样本；
- 有人工可解释的实体/关系定义；
- 能接受构建和维护成本。

如果只是 FAQ 或产品手册，普通 hybrid + rerank 通常更直接。

## Long Context

适合：

- 少量长文档；
- 需要整体阅读；
- 权限边界简单；
- 成本和延迟可接受。

不适合：

- 多租户权限复杂；
- 文档很多；
- 高频查询；
- 需要稳定引用和评估。

长上下文扩大容量，但不会自动提升注意力和事实可靠性。

长上下文适合“少量长资料整体阅读”，不适合“海量资料权限检索”。后者仍然需要 RAG。

## Long Context 的风险

长上下文不等于所有信息都会被正确使用。常见风险：

- 输入很长但模型忽略中间内容；
- 引用位置不稳定；
- 成本和延迟高；
- 多文档冲突被混合；
- 权限边界难控制；
- 更新后无法解释使用了哪一版资料。

长上下文适合把少量资料完整交给模型阅读，不适合作为企业知识库的默认替代品。

## 升级顺序

```text
修 parser 和 chunk
  -> 补 metadata
  -> 加 hybrid
  -> 加 rerank
  -> 评估 GraphRAG 或 Long Context
```

如果前两步没做好，后面的方案都是在放大复杂度。

## 最终判断

```text
找不到：hybrid
排不准：rerank
关系复杂：GraphRAG
文档少但长：Long Context
权限复杂：metadata filter
```

检索模式选型要从失败样本出发，不要从技术热度出发。
