---
title: 从零设计企业 Agent 阅读指南
description: 按目标、角色和问题类型选择企业 Agent 专栏的阅读路径
contentType: support
series: support
contentId: enterprise-agent-reading-guide
shortTitle: 企业 Agent 阅读指南
summary: 帮助企业内部开发者、AI 工程师和架构负责人按目标阅读从零设计企业 Agent 专栏
difficulty: beginner
estimatedTime: 10 分钟
learningGoals:
  - 根据自己的角色选择最短阅读路径
  - 理解 E00-E17 的模块关系
  - 快速定位权限、知识库、个人数据、流程自动化和生产化专题
prerequisites:
  - 了解 AI Agent 基本概念
recommendedNext:
  - /enterprise-agent/e00-enterprise-agent-constraints
  - /enterprise-agent/design-checklist
practiceLinks:
  - /practice/p19-security
  - /practice/p23-production
searchTags:
  - 企业 Agent
  - 阅读指南
  - IMS Copilot
navigationLabel: 阅读指南
entryMode: bridge
roleDescription: 想快速判断该从哪一篇开始读的读者
---

# 从零设计企业 Agent 阅读指南

这套专栏不是按单点技术堆出来的，而是按一个企业 Agent 项目的生命周期组织：

先判断企业 Agent 和普通 Chatbot 的差异，再做意图识别和混合查询，接着落到四类能力，最后收口到生产化。

## 如果你是企业内部开发者

推荐路径：

1. [E00：企业 Agent 的四个本质约束](/enterprise-agent/e00-enterprise-agent-constraints)
2. [E05：企业知识库不是普通 RAG](/enterprise-agent/e05-enterprise-knowledge-base)
3. [E08：个人数据查询的上下文设计](/enterprise-agent/e08-personal-data-context)
4. [E11：Human-in-the-Loop 节点设计](/enterprise-agent/e11-human-in-the-loop-design)
5. [E14：企业 Agent 的观测与审计](/enterprise-agent/e14-observability-and-audit)

这条路线关注“怎么在自己公司安全落地”。

## 如果你是通用 AI 工程师

推荐路径：

1. [E01：从 Chatbot 到 Enterprise Agent](/enterprise-agent/e01-chatbot-to-enterprise-agent)
2. [E02：企业 Agent 的意图分层](/enterprise-agent/e02-intent-layering)
3. [E03：混合查询的拆解策略](/enterprise-agent/e03-hybrid-query-decomposition)
4. [E10：从意图到可执行步骤](/enterprise-agent/e10-intent-to-executable-steps)
5. [E15：成本、性能与模型路由](/enterprise-agent/e15-cost-performance-model-routing)

这条路线关注“方法论怎么迁移到别的行业”。

## 如果你负责架构或平台化

推荐路径：

1. [E00：企业 Agent 的四个本质约束](/enterprise-agent/e00-enterprise-agent-constraints)
2. [E06：权限过滤与引用溯源](/enterprise-agent/e06-permission-filtering-and-citation)
3. [E12：高风险工具调用的确认机制](/enterprise-agent/e12-high-risk-tool-confirmation)
4. [E13：流程状态、回滚与补偿](/enterprise-agent/e13-workflow-state-rollback-compensation)
5. [E16：从项目到平台](/enterprise-agent/e16-project-to-platform-evolution)
6. [架构蓝图](/enterprise-agent/architecture-blueprint)
7. [Python 项目结构](/enterprise-agent/python-project-structure)
8. [数据模型与 Schema](/enterprise-agent/data-model-and-schema)
9. [运行时状态机](/enterprise-agent/runtime-state-machine)
10. [API 契约设计](/enterprise-agent/api-contract)
11. [风险矩阵](/enterprise-agent/risk-matrix)
12. [设计检查表](/enterprise-agent/design-checklist)

这条路线关注“哪些能力应该沉淀成平台能力”。

## 按问题查

| 你关心的问题 | 建议阅读 |
| --- | --- |
| 企业 Agent 和 Chatbot 到底差在哪 | [E01](/enterprise-agent/e01-chatbot-to-enterprise-agent) |
| 用户一句话里混了多个需求怎么办 | [E02](/enterprise-agent/e02-intent-layering) / [E04](/enterprise-agent/e04-clarification-design) |
| RAG 为什么不能直接上线 | [E05](/enterprise-agent/e05-enterprise-knowledge-base) / [E06](/enterprise-agent/e06-permission-filtering-and-citation) |
| Text-to-SQL 怎么控风险 | [E07](/enterprise-agent/e07-text-to-sql-risk-control) |
| 查询个人数据怎么防泄露 | [E08](/enterprise-agent/e08-personal-data-context) |
| 操作引导怎么做得有用 | [E09](/enterprise-agent/e09-operation-guide-is-not-document-qa) |
| 自动提交流程前怎么确认 | [E11](/enterprise-agent/e11-human-in-the-loop-design) / [E12](/enterprise-agent/e12-high-risk-tool-confirmation) |
| 流程失败后怎么恢复 | [E13](/enterprise-agent/e13-workflow-state-rollback-compensation) |
| 上线后怎么追问题 | [E14](/enterprise-agent/e14-observability-and-audit) |
| 怎么控制成本和延迟 | [E15](/enterprise-agent/e15-cost-performance-model-routing) |
| 项目方案怎么写 | [实施模板](/enterprise-agent/implementation-template) |
| 上线风险怎么评估 | [风险矩阵](/enterprise-agent/risk-matrix) |
| 整体架构怎么画 | [架构蓝图](/enterprise-agent/architecture-blueprint) |
| Python 目录怎么设计 | [Python 项目结构](/enterprise-agent/python-project-structure) |
| 核心对象怎么定义 | [数据模型与 Schema](/enterprise-agent/data-model-and-schema) |
| 执行状态怎么流转 | [运行时状态机](/enterprise-agent/runtime-state-machine) |
| API 接口怎么设计 | [API 契约设计](/enterprise-agent/api-contract) |
