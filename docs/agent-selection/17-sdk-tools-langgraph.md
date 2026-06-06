---
title: Agents SDK、Claude Tool Use、LangGraph 怎么取舍
description: 比较平台 Agents SDK、Claude 工具调用、LangGraph 和轻量自研 loop 的适用边界。
contentType: support
series: support
contentId: agent-selection-sdk-tools-langgraph
shortTitle: SDK、Tool Use、LangGraph
summary: 平台 SDK、工具调用和 LangGraph 解决的问题不同：平台集成、工具边界和显式状态不能混为一谈。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 区分平台 Agents SDK、Claude Tool Use 和 LangGraph 的主战场
  - 判断什么时候需要平台集成，什么时候需要显式状态图
  - 识别 provider 锁定和迁移风险
prerequisites:
  - 已了解 Agent 框架选型
  - 已了解 LangGraph 场景判断
recommendedNext:
  - /agent-selection/18-managed-platform-vs-runtime
  - /agent-selection/15-vendor-lock-in
  - /agent-selection/26-human-approval
practiceLinks:
  - /practice/p10-react-loop/
  - /practice/p14-mcp/
  - /practice/p20-observability/
searchTags:
  - Agents SDK
  - Claude Tool Use
  - LangGraph
  - Tool Use
  - Agent Runtime
navigationLabel: SDK、Tool Use、LangGraph
entryMode: bridge
roleDescription: 适合在平台 SDK、模型工具调用和状态图框架之间做取舍时阅读。
---

<ChapterLearningGuide />

## 术语边界

本文中的 Claude Tool Use 指 Claude API 的工具调用能力：模型提出工具调用，应用负责校验、执行和审计。它不是完整托管 Agent Runtime。

如果要把 agent loop、session、workspace 和工具执行环境交给平台，应单独评估 Managed Agents；如果要做工具发现、授权和跨客户端复用，应单独评估 MCP。

## 三者不是同一层

| 方案 | 主要解决 | 不主要解决 |
| --- | --- | --- |
| 平台 Agents SDK | 平台内工具、handoff、trace、运行集成 | 跨平台迁移 |
| Claude API Tool Use | Claude-first 工具调用和工具边界 | 通用工作流状态机 |
| LangGraph | 显式状态、分支、checkpoint、恢复执行 | provider 平台集成 |
| 轻量自研 loop | 小范围工具调用和强控制 | 复杂恢复和可视化编排 |

不要把“能调用工具”误解成“有完整 Agent Runtime”。工具调用只是能力之一。

## 先拆开四个问题

做取舍前，先明确你到底在选什么：

```text
Model API
  -> 怎么调用模型和工具

Agent Runtime
  -> 谁管理 loop、handoff、session、guardrail

Workflow Runtime
  -> 谁管理状态、分支、暂停、恢复

Tool Protocol
  -> 工具如何暴露、发现、授权和执行
```

OpenAI Agents SDK 更偏 Agent Runtime，Claude API Tool Use 更偏模型工具调用边界，LangGraph 更偏 Workflow Runtime，MCP 更偏 Tool Protocol。它们可以组合，不是互斥替代。

## 怎么选

| 场景 | 推荐 |
| --- | --- |
| OpenAI-first 产品 | 平台 Agents SDK |
| Claude-first 且自有 runtime | Claude API Tool Use + MCP |
| 长流程、分支、恢复 | LangGraph |
| 简单工具调用 | 轻量 loop |
| 多 provider 产品 | 自有抽象 + 可替换工具层 |
| 企业高审计流程 | 自有状态和审计 + 框架能力 |

如果业务强绑定某个平台，平台 SDK 可以提高速度。如果业务必须跨模型或跨云，核心状态和工具定义最好不要完全绑定平台。

## 方案对比

| 方案 | 抽象层级 | 你获得什么 | 你要自己补什么 |
| --- | --- | --- | --- |
| 直接模型 API | 最低 | 最大控制权 | loop、tool dispatch、trace、session |
| Claude API Tool Use | 模型工具层 | 工具调用和 server/client tool 边界 | 跨 provider runtime、复杂状态 |
| OpenAI Agents SDK | Agent runtime | agent loop、tools、handoff、guardrails、sessions、tracing | 非 OpenAI 栈迁移策略 |
| LangGraph | Workflow runtime | durable execution、streaming、human-in-the-loop、persistence | 模型和工具集成选择 |
| 自研 runtime | 自定义 | 完整控制 | 研发和维护成本 |

如果只是“模型需要调用一个查询工具”，直接 tool calling 或轻量 loop 足够。如果任务要跨多个角色、工具和会话，并且希望 runtime 管理 turns 和 trace，SDK 更合适。如果任务要暂停、恢复、回放和状态迁移，才考虑 LangGraph。

## 关键判断

问五个问题：

1. 是否必须使用某个平台的托管能力？
2. 是否需要显式状态和恢复执行？
3. 工具定义是否需要跨 provider 复用？
4. trace 是否需要进入自有观测系统？
5. 未来是否可能换模型或换平台？

答案决定你是在选 SDK、工具调用、状态图，还是自有 runtime。

## 两个典型误判

第一个误判是“有工具调用就需要 SDK”。如果只是让模型查询一个只读 API，轻量 tool wrapper 足够。SDK 的价值在于会话、handoff、guardrails、trace 等 runtime 能力。

第二个误判是“有多步流程就需要 LangGraph”。如果流程是固定 pipeline，比如“检索 -> 生成 -> 引用”，普通 pipeline 更简单。LangGraph 适合有分支、暂停、恢复和回放的流程。

判断重点不是功能名字，而是谁管理状态、谁执行工具、谁承担审计。

## 组合模式

| 组合 | 适合 |
| --- | --- |
| Claude API Tool Use + MCP | Claude-first，工具生态要统一 |
| OpenAI Agents SDK + MCP | OpenAI-first，需要 agent loop 和外部工具 |
| LangGraph + 任意模型工具调用 | 长流程、状态强、provider 可替换 |
| 自研 runtime + MCP | 强控制、多客户端复用工具 |
| SDK 原型 -> 自有 runtime | 先验证需求，再降低锁定 |

真正要保护的是业务状态、权限和审计，不是表面上的框架选择。

## 控制边界怎么放

生产系统可以把能力分层放置：

| 边界 | 建议 |
| --- | --- |
| 模型选择 | 可用平台 SDK，但保留路由策略 |
| 工具 schema | 尽量平台无关，便于复用 |
| 业务状态 | 放在自有系统 |
| 审批状态 | 放在自有系统 |
| trace | 至少能导出关键 span |
| 评测样本 | 自有，不绑定平台 |

这样即使用平台 SDK，也不会让平台成为唯一控制面。

## 不要做什么

- 不要为了工具调用引入复杂图框架；
- 不要为了平台集成牺牲关键业务状态；
- 不要把高风险审批藏在模型 Prompt 里；
- 不要把 trace 只留在不可导出的控制台；
- 不要让工具 schema 只存在某个 provider 的私有格式里。

## 选型输出应该包含什么

评审材料至少写清：

- 主模型和 provider；
- 工具调用方式；
- runtime 由谁管理；
- 状态保存在哪里；
- trace 能否导出；
- 高风险动作怎么审批；
- 未来迁移路径；
- 第一版不用哪些能力。

如果材料只写“使用某 SDK 构建 Agent”，还不足以进入实现。

## 最终判断

```text
平台产品：优先 SDK
模型工具调用：优先 Tool Use / 轻量 loop
复杂状态：优先 LangGraph
小任务：轻量 loop
高迁移要求：自有边界
```

选型重点不是谁更高级，而是谁控制了状态、工具、权限和观测边界。
