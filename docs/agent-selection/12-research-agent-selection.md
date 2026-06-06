---
title: 研究型 Agent 怎么选
description: 判断研究型 Agent 应该如何组合 Search、Reader、RAG、来源验证和引用输出。
contentType: support
series: support
contentId: agent-selection-research-agent
shortTitle: 研究型 Agent 选型
summary: 研究型 Agent 的核心是搜索、读取、验证和引用，不是把网页资料直接塞进 RAG。
difficulty: intermediate
estimatedTime: 35 分钟
learningGoals:
  - 区分 Search、Reader、RAG 在研究型任务中的角色
  - 设计多来源验证和冲突处理流程
  - 判断什么时候需要临时索引或长期知识库
prerequisites:
  - 已了解搜索工具选型
  - 已了解 RAG 与 Search 的边界
recommendedNext:
  - /agent-selection/24-browser-crawl-search
  - /agent-selection/27-observability-trace-replay-eval
  - /practice/p14-mcp/
practiceLinks:
  - /practice/p14-mcp/
  - /practice/p20-observability/
searchTags:
  - 研究型 Agent
  - Search
  - Reader
  - 引用
  - 来源验证
navigationLabel: 研究型 Agent 选型
entryMode: bridge
roleDescription: 适合设计联网研究、资料收集、竞品分析和技术调研 Agent 时阅读。
---

<ChapterLearningGuide />

## 研究型 Agent 的主链路

```text
问题拆解
  -> 查询生成
  -> 搜索候选
  -> 来源筛选
  -> 网页读取
  -> 冲突检测
  -> 综合输出 + 引用
```

搜索结果不是答案。Reader 读到的正文也不是最终结论。研究型 Agent 的价值在于筛选、交叉验证和解释冲突。

## 先区分三种研究任务

| 任务 | 技术组合 | 输出重点 |
| --- | --- | --- |
| 查事实 | Search + Reader + Citation | 当前结论和来源时间 |
| 做调研 | Search + Reader + Synthesis | 多来源观点和差异 |
| 建资料库 | Crawl / Import + RAG + Version | 可复用知识和更新流程 |

如果只是一次性查资料，不需要把网页全部入库。如果团队每周都研究同一主题，才值得把高质量来源沉淀成 RAG。

## 研究型 Agent 的三种深度

| 深度 | 目标 | 技术栈 | 输出 |
| --- | --- | --- | --- |
| 快速查证 | 回答一个当前事实 | Search + Reader | 简短答案 + 引用 |
| 多来源调研 | 比较多个观点或方案 | Query Planner + Search + Reader + Conflict Check | 结构化报告 |
| 持续研究 | 长期跟踪一个主题 | Crawl + RAG + Eval + Update Policy | 可复用知识库 |

深度越高，越需要缓存、去重、来源评分和评估。不要用同一条链路处理所有研究任务。

## Search、Reader、RAG 怎么分工

| 能力 | 作用 | 不适合 |
| --- | --- | --- |
| Search | 找候选来源 | 直接生成最终答案 |
| Reader | 抽取网页正文 | 判断来源可信度 |
| RAG | 管理稳定知识 | 高频变化网页 |
| Rerank | 重新排序候选内容 | 代替事实验证 |
| Synthesizer | 合并结论和引用 | 编造缺失事实 |

如果资料只用于一次研究，通常不需要长期 RAG。可以用临时上下文或临时索引。

## 方案对比

| 方案 | 链路 | 优点 | 风险 |
| --- | --- | --- | --- |
| Search-only | 搜索结果摘要 | 快，成本低 | 容易只看片段，引用不稳 |
| Search + Reader | 搜索后读取正文 | 质量明显更稳 | 延迟和网页失败增加 |
| Search + Reader + Rerank | 候选来源重排后阅读 | 适合资料多的问题 | 仍要处理来源冲突 |
| 临时研究索引 | 把本次资料建临时索引 | 适合长报告 | 不适合实时事实 |
| 长期 RAG | 固定来源定期入库 | 可复用、可评估 | 更新和版本治理成本高 |

默认建议从 Search + Reader 开始。只有当资料量超过上下文、需要多轮追问或需要复用时，再考虑临时索引或长期 RAG。

## Query Planner 怎么设计

研究任务通常不能只搜用户原话。Query Planner 要把问题拆成：

```text
概念澄清查询
官方来源查询
对比来源查询
反例或风险查询
最新时间范围查询
```

例如“LangGraph 适合生产 Agent 吗”不应该只搜这句话，还应该拆成：官方文档、durable execution、人机确认、生产案例、替代方案、限制和迁移成本。

## 来源评分

| 维度 | 高分 | 低分 |
| --- | --- | --- |
| 权威性 | 官方文档、标准、原始公告 | 二手转载、营销软文 |
| 时效性 | 有明确更新时间 | 无日期或旧日期 |
| 可验证性 | 有原文和数据 | 只有观点 |
| 相关性 | 直接回答问题 | 只命中关键词 |
| 独立性 | 多个独立来源支持 | 互相转载 |

来源评分不需要复杂模型，先用规则也可以。关键是不要让模型把所有网页当同等可信。

## 什么时候需要 RAG

| 情况 | 选择 |
| --- | --- |
| 查最新资料 | Search + Reader |
| 一次性研究 | Search + Reader + 临时缓存 |
| 反复研究同一领域 | 建立主题知识库 |
| 内部资料和外部资料结合 | RAG + Search 分层 |
| 需要长期复用结论 | RAG + version + citation |

不要把实时网页离线塞进旧索引，然后假装它还是最新。

## 冲突处理比总结更重要

研究型 Agent 要显式处理冲突：

| 冲突 | 处理 |
| --- | --- |
| 时间冲突 | 优先更新来源，并标注旧来源 |
| 来源冲突 | 区分官方、媒体、论坛、二手转载 |
| 口径冲突 | 分别列出口径，不强行合并 |
| 数据冲突 | 给出范围和不确定性 |
| 无法验证 | 明确说不能确认 |

面向开发人员的研究报告，宁可短一点，也要把“不确定在哪里”说清楚。

## 来源验证

研究型 Agent 至少要记录：

- 来源 URL；
- 发布或更新时间；
- 作者或机构；
- 读取时间；
- 关键原文片段；
- 与其他来源的冲突点。

对技术文档、法规、价格、版本、新闻这类问题，时间信息不是附加字段，而是事实的一部分。

## 最小落地架构

```text
Query Planner
  -> Search Provider
  -> Domain / Time Filter
  -> Reader
  -> Source Store
  -> Conflict Detector
  -> Synthesizer
  -> Citation Renderer
```

其中 Source Store 不一定是长期知识库。它可以只是本次任务的临时来源表，用来保存 URL、标题、时间、正文摘要和引用片段。

## 报告结构

面向技术选型的研究报告建议固定格式：

```text
结论
适用场景
不适用场景
方案对比
关键证据和引用
冲突或不确定点
建议下一步验证
```

固定格式能降低“看起来很长但没有结论”的问题，也方便做自动评估。

## POC 样本

| 样本 | 验证 |
| --- | --- |
| 查最新官方 API 变化 | 时间过滤和官方来源优先 |
| 比较两个框架 | 多来源对比和结论收束 |
| 搜索结果互相冲突 | 冲突标注，不强行合并 |
| 页面不可读 | Reader fallback |
| 用户要求无来源结论 | 拒绝或标注低可信 |

研究型 Agent 质量的核心指标不是“搜到多少”，而是“结论是否有证据链”。

## 输出要求

好的研究输出应该包含：

- 结论；
- 支持来源；
- 不确定点；
- 冲突来源；
- 过期风险；
- 下一步验证建议。

如果所有来源都不可靠，正确输出是“不足以判断”，不是强行总结。

## 最终判断

```text
实时事实：Search
网页正文：Reader
稳定复用：RAG
多来源不一致：冲突检测
面向用户输出：引用必须保留
```

研究型 Agent 的成败不在于搜得多，而在于能不能说明为什么相信这些来源。
