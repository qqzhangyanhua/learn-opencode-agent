---
title: 客服和知识库 Agent 怎么选
description: 判断客服、FAQ、产品知识库和内部制度问答应该采用 RAG、转人工、引用和评估策略。
contentType: support
series: support
contentId: agent-selection-customer-support-agent
shortTitle: 客服知识库 Agent
summary: 客服知识库 Agent 的核心是稳定、可追溯和可兜底，不是回答越长越好。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 判断客服和知识库 Agent 的最小技术组合
  - 设计拒答、转人工和低置信度兜底
  - 识别知识版本、引用和评测集的重要性
prerequisites:
  - 已了解 RAG 选型
  - 已了解选型检查表
recommendedNext:
  - /agent-selection/21-enterprise-knowledge-permission
  - /agent-selection/08-poc-evaluation
  - /practice/p21-evaluation/
practiceLinks:
  - /practice/p07-rag-basics/
  - /practice/p09-hybrid-retrieval/
  - /practice/p21-evaluation/
searchTags:
  - 客服 Agent
  - 知识库
  - FAQ
  - 转人工
  - RAG
navigationLabel: 客服知识库 Agent
entryMode: bridge
roleDescription: 适合设计客服问答、FAQ、产品知识库和内部制度问答系统时阅读。
---

<ChapterLearningGuide />

## 先给结论

客服知识库 Agent 的默认组合是：

```text
RAG
  -> Citation
  -> Confidence Check
  -> Escalation
  -> Evaluation
```

不要先上复杂 Agent Framework。大多数客服知识库的问题，先把知识治理、引用和兜底做好就能解决。

## 它和普通 RAG 问答有什么不同

客服场景有三个额外要求：

```text
答案必须稳定
  -> 同类问题不能每天说法不同

答案必须可追溯
  -> 运营能知道引用了哪条规则

答案必须能兜底
  -> 不能回答时要转人工或收集信息
```

所以客服知识库 Agent 的重点不是“模型更会聊天”，而是知识版本、拒答、转人工和运营闭环。

## 场景拆分

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| FAQ 问答 | RAG + 引用 | 规则稳定，必须可追溯 |
| 产品文档问答 | RAG + version | 产品版本会变 |
| 订单状态查询 | Tool calling + 权限 | 来自业务系统，不是知识库 |
| 售后政策判断 | RAG + 规则引用 + 低置信转人工 | 风险高，容易产生承诺 |
| 投诉处理 | 分类 + 转人工 | 情绪和责任边界复杂 |
| 复杂流程办理 | Workflow + 审批 | 需要状态和业务动作 |

客服系统里，知识问答和业务办理要分开。不要让同一个回答链路同时查知识、查订单、改状态。

## 技术架构

```text
Intent Classifier
  -> FAQ / Policy RAG
  -> Order Tool
  -> Escalation Router
  -> Answer Composer
  -> Citation + Ticket Log
```

Intent Classifier 的作用不是炫技，而是把“查政策”“查订单”“投诉转人工”“信息不足追问”分开。不同意图走不同链路，质量才可控。

## 知识库要求

上线前至少要有：

- 文档来源；
- 文档版本；
- 生效时间；
- 负责人；
- 适用范围；
- 删除和更新流程；
- 引用输出。

如果知识库自己都说不清哪条规则最新，模型也不可能稳定回答。

## 知识治理流程

客服知识库需要运营流程：

```text
新增知识
  -> 审核
  -> 生效
  -> 索引
  -> 评测
  -> 线上反馈
  -> 更新或下线
```

RAG 只是读取知识，不能替代知识治理。没有负责人、版本、生效范围和下线机制，模型会把旧规则当新规则回答。

## 置信度不是一个分数

客服场景的低置信度来自多种原因：

| 原因 | 处理 |
| --- | --- |
| 检索不到 | 明确说资料不足，转人工 |
| 多文档冲突 | 引用冲突并转人工 |
| 用户信息缺失 | 追问必要字段 |
| 权限不足 | 不透露内部信息 |
| 高风险诉求 | 转人工 |

不要用一个相似度分数决定是否回答。要结合召回质量、文档版本、意图风险和用户信息完整度。

## 拒答和转人工

必须转人工的情况：

- 检索不到资料；
- 多份资料冲突；
- 用户要求退款、投诉、法律承诺；
- 涉及账号、订单、隐私；
- 用户明确不接受当前答案；
- 低置信度连续出现。

客服 Agent 不应该假装全能。可控拒答比编造答案更可靠。

## 转人工时要带什么上下文

转人工不是简单丢给人工客服。应该带上：

- 用户原问题；
- 已识别意图；
- 已检索文档；
- 引用片段；
- 判断为低置信的原因；
- 用户已提供的信息；
- 建议人工确认的问题。

这样人工客服能接着处理，而不是从头问一遍。

## 评估指标

| 指标 | 为什么重要 |
| --- | --- |
| 引用正确率 | 用户和运营能查错 |
| 拒答正确率 | 避免编造 |
| 转人工率 | 反映知识缺口 |
| 首次解决率 | 衡量业务价值 |
| 版本命中率 | 避免新旧规则混用 |
| 用户修正率 | 发现回答偏差 |

不要只看满意度。满意度可能掩盖错误但流畅的回答。

## POC 样本

| 样本 | 验证 |
| --- | --- |
| 标准 FAQ | 能命中正确知识并引用 |
| 同义问法 | 能召回同一条规则 |
| 新旧政策冲突 | 不混用版本 |
| 订单状态查询 | 不走 RAG，走工具 |
| 投诉和退款 | 转人工或高风险处理 |
| 资料缺失 | 明确拒答，不编造 |
| 越权问题 | 不泄露内部规则 |

客服知识库的 POC 必须包含“不能回答”的样本，否则上线后最容易翻车。

## 什么时候需要 Agent Framework

| 情况 | 是否需要 |
| --- | --- |
| FAQ 问答 | 不需要 |
| 查订单状态 | 通常不需要，tool calling 足够 |
| 多轮收集售后信息 | 可以用轻量状态 |
| 跨系统办理售后流程 | 需要 workflow |
| 高风险退款审批 | 需要 human-in-the-loop |

客服 Agent 最常见的过度设计，是把 FAQ 问答也做成复杂多 Agent。先把知识质量和转人工做好。

## 最终判断

```text
只问知识：RAG + 引用
查用户数据：Tool + 权限
办理业务：Workflow + 审批
资料不足：拒答或转人工
```

客服知识库 Agent 的目标不是“每问必答”，而是“该答的答准，不该答的不乱答”。
