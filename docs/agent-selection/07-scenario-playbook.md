---
title: 场景选型手册
description: 按企业 Copilot、代码库助手、研究型 Agent、客服知识库和自动化执行等典型场景判断技术组合。
contentType: support
series: support
contentId: agent-selection-scenario-playbook
shortTitle: 场景选型手册
summary: 把 Agent Framework、RAG、Search、工具调用和审计能力映射到常见业务场景。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 按业务场景快速判断技术组合
  - 识别不同场景的核心风险和最小可行方案
  - 避免把所有 Agent 项目都套成同一种架构
prerequisites:
  - 已了解 Agent 框架、RAG 和搜索工具边界
  - 已了解组合方案和选型检查表
recommendedNext:
  - /agent-selection/08-poc-evaluation
  - /agent-selection/09-build-vs-buy
  - /practice/p20-observability/
practiceLinks:
  - /practice/p09-hybrid-retrieval/
  - /practice/p14-mcp/
  - /practice/p18-model-routing/
  - /practice/p20-observability/
searchTags:
  - 场景选型
  - 企业 Copilot
  - 代码库 Agent
  - 研究型 Agent
  - 客服知识库
navigationLabel: 场景选型手册
entryMode: bridge
roleDescription: 适合把抽象技术选型映射到具体业务场景时阅读。
---

<ChapterLearningGuide />

## 先按场景选，不要按框架选

同样叫 Agent，不同场景的核心矛盾完全不同：

```text
企业 Copilot：权限、审计、工具边界
代码库助手：代码结构、符号检索、可验证修改
研究型 Agent：搜索、来源可信度、冲突处理
客服知识库：稳定回答、引用、兜底转人工
自动化执行：状态、确认、失败恢复
```

先把场景说清楚，技术组合通常就会收敛。

## 场景推荐表

| 场景 | 推荐组合 | 最小可行方案 | 主要风险 |
| --- | --- | --- | --- |
| 企业 Copilot | Intent Router + RAG + Tools + Audit | RAG + 权限过滤 + 引用 | 权限泄露、工具越权、审计缺失 |
| 代码库助手 | Code-aware RAG + Tools + Tests + Trace | 文件/符号检索 + 只读问答 | 代码结构被普通 chunk 破坏 |
| 研究型 Agent | Search + Reader + Source Verification | 搜索 + 正文读取 + 引用 | 来源漂移、事实冲突、过期信息 |
| 客服知识库 | RAG + Citation + Escalation | FAQ RAG + 不知道就转人工 | 编造答案、版本混用 |
| 自动化执行 | Agent Workflow + Tools + Human Approval | 轻量 tool loop + 审批点 | 高风险动作无人确认 |
| 数据分析助手 | Text-to-SQL + Permission + Review | 只读 SQL + 查询解释 | 数据越权、SQL 误查 |
| 多 Agent 协作 | Single Agent baseline + Role Split | 先单 Agent 跑通 | 角色聊天替代业务流程 |

## 怎么使用这张表

先选主场景，再看是否混合第二场景。不要反过来先堆技术。

例如“企业 Copilot 能查制度，也能查订单状态”，主场景是企业 Copilot，第二场景是工具查询。第一版应该先做身份、权限、RAG 引用和只读订单工具，而不是直接上多 Agent 编排。

如果一个需求同时命中三类以上场景，通常说明范围太大。先拆成 POC：问答、查询、执行、研究分别验证，不要一次性做成全能助手。

## 企业 Copilot

企业 Copilot 的重点不是“模型多聪明”，而是它能不能在权限边界内稳定工作。

优先设计：

- 用户身份和权限；
- 检索前过滤；
- 工具调用白名单；
- 高风险动作确认；
- 审计日志和引用。

不要一开始就追求多 Agent。大多数企业 Copilot 的第一版，应该先把意图识别、RAG、工具执行和审计链路做稳。

## 代码库助手

代码库助手最容易犯的错，是把代码当普通文档切片。

优先设计：

- 文件路径、模块边界和符号名；
- import / export 关系；
- 测试文件与实现文件的关联；
- 修改前后的 diff；
- 测试和回滚策略。

如果只是问答，可以先做 code-aware RAG。如果要自动改代码，就必须把工具执行、测试和人工确认纳入流程。

## 研究型 Agent

研究型 Agent 的主要信息来自外部网页，所以重点是搜索链路，而不是私有知识库。

优先设计：

- 查询拆解；
- 来源域名限制；
- 正文读取；
- 时间过滤；
- 冲突检测；
- 引用输出。

这类系统不要把搜索结果直接当答案。搜索只提供候选来源，答案需要经过读取、筛选和合成。

## 客服知识库

客服知识库的目标是稳定和可追溯，不是每次都生成漂亮长答案。

优先设计：

- FAQ 和制度文档的版本管理；
- RAG 引用；
- 没有资料时明确拒答；
- 低置信度转人工；
- 热点问题评测集。

如果资料不全，先补知识治理。不要用 Prompt 掩盖知识库缺口。

## 自动化执行

自动化执行类 Agent 的关键问题是“能不能做动作”，不是“能不能回答”。

优先设计：

- 工具权限；
- 状态 schema；
- 停止条件；
- 重试和恢复；
- 人工确认点；
- 操作审计。

只要涉及删除、支付、发送、发布、修改生产数据，都应该默认需要人工确认。

## 场景 POC 的最小样本

每个场景都应该有自己的 POC 样本：

| 场景 | 样本重点 |
| --- | --- |
| 企业 Copilot | 权限内问答、越权拒绝、引用正确 |
| 代码库助手 | 符号定位、相关测试、错误修改拒绝 |
| 研究型 Agent | 官方来源、冲突来源、过期信息 |
| 客服知识库 | 热点问题、无资料拒答、转人工 |
| 自动化执行 | 高风险确认、工具失败、审计记录 |
| 数据分析助手 | 只读 SQL、口径解释、敏感字段拦截 |

样本集能暴露真正的选型边界。没有样本，只靠场景名称很容易选错技术组合。

## 最小判断句

```text
只问答：先看 RAG 或 Search
要行动：再看 Agent Framework
要高风险行动：必须加权限、确认和审计
要跨内部和外部知识：RAG 与 Search 分层
```

场景选型的目的不是给每个项目套模板，而是快速找出最小可行技术组合。
