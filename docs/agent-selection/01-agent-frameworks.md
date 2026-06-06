---
title: Agent 框架怎么选
description: 比较主流 Agent 框架的工程边界，判断什么时候需要 LangGraph、LangChain、LlamaIndex、AutoGen、CrewAI 或轻量自研 loop。
contentType: support
series: support
contentId: agent-selection-agent-frameworks
shortTitle: Agent 框架选型
summary: 从控制流、状态、工具调用、可观测性和生产约束判断 Agent 框架怎么选。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 判断什么时候需要 Agent Framework
  - 区分 LangChain、LangGraph、LlamaIndex、AutoGen、CrewAI 等框架边界
  - 识别框架过度设计和抽象泄漏风险
prerequisites:
  - 了解工具调用
  - 了解 Agent Loop
  - 了解基础 RAG
recommendedNext:
  - /agent-selection/02-langgraph
  - /agent-selection/05-composition-patterns
  - /agent-selection/06-selection-checklist
practiceLinks:
  - /practice/p10-react-loop/
  - /practice/p11-planning/
  - /practice/p15-multi-agent/
searchTags:
  - Agent Framework
  - LangChain
  - LangGraph
  - AutoGen
  - CrewAI
navigationLabel: Agent 框架选型
entryMode: bridge
roleDescription: 适合在多个 Agent 框架之间做工程取舍时阅读。
---

<ChapterLearningGuide />

## 先判断是否真的需要框架

Agent Framework 解决的是过程控制，不是模型能力本身。只有当任务出现多步执行、状态推进、工具编排、失败恢复、人工确认和审计时，框架才有价值。

如果只是下面这些场景，不要先上框架：

- 单轮分类、总结、改写；
- 简单问答；
- 一次搜索后总结；
- 固定 RAG pipeline；
- 只有一两个工具的轻量调用。

更简单的路线通常是：

```text
普通模型调用
  -> 手写少量工具调用
  -> 轻量 ReAct loop
  -> Agent Framework
  -> 多 Agent 编排
```

## 主流框架对比

| 方案 | 适合 | 优点 | 风险 |
| --- | --- | --- | --- |
| 自研轻量 loop | 简单工具调用、强控制、小团队 | 透明、依赖少、容易调试 | 状态和流程一复杂就会变烂 |
| LangChain | 快速集成模型、工具、中间件和 agent loop | 生态大，上手快 | 抽象层多，生产要限制边界 |
| LangGraph | 长流程、状态机、恢复执行、人机确认 | 显式状态、图编排、可持久化 | 简单任务会过度设计 |
| LlamaIndex | RAG、数据连接器、索引、Query Engine | 数据接入和检索抽象强 | 复杂控制流不是它的主战场 |
| AutoGen | 多 Agent 对话、研究原型、分布式协作 | 适合探索多角色协作 | 容易把业务流程写成角色聊天 |
| CrewAI | 角色、任务、流程型自动化 | 概念直观，适合业务自动化原型 | 拟人化角色过多会稀释责任边界 |
| Semantic Kernel | .NET、Azure、企业插件集成 | 企业集成和函数模式成熟 | 微软生态绑定更明显 |
| OpenAI Agents SDK | OpenAI 栈内 agent、handoff、trace | 原语少，平台集成紧 | provider 锁定强 |
| Claude Tool Use / Managed Agents | Claude-first、MCP、托管工具执行 | 工具边界清楚，适合 Claude 产品化 | 平台能力和迁移成本要评估 |

## 选型顺序

```text
是否只是一次模型调用？
  -> 是：不用 Agent Framework
  -> 否：继续

是否只是固定 RAG 或固定工具链？
  -> 是：pipeline 或轻量 loop
  -> 否：继续

是否需要状态、分支、恢复、人工确认？
  -> 是：LangGraph / 工作流型框架
  -> 否：继续

是否主要复杂在数据接入和检索？
  -> 是：LlamaIndex 优先
  -> 否：继续

是否需要多角色协作实验？
  -> 是：AutoGen / CrewAI
  -> 否：轻量 loop 或平台 Agents SDK
```

## 先看复杂度台阶

框架选型最容易犯的错，是把“未来可能复杂”当成“现在必须上框架”。更稳的做法是按复杂度台阶升级：

| 台阶 | 典型形态 | 退出条件 |
| --- | --- | --- |
| 模型调用 | prompt + response | 需要调用外部能力 |
| 固定 pipeline | RAG、Search、固定工具链 | 需要按结果分支 |
| 轻量 loop | tool call + observe + answer | 需要持久状态和恢复 |
| 状态图 | 节点、边、checkpoint | 需要多团队协作和审计 |
| 多 Agent | 多角色分工 | 单 Agent 已验证仍不够 |

每升一级都要能说清“低一级哪里不够”。如果只是为了显得架构完整，通常就是过度设计。

## 框架不是越强越好

框架带来的不是免费能力，而是新的约束：

- 状态 schema 要设计；
- trace 要接入；
- 工具错误要规范化；
- 任务停止条件要明确；
- 测试样例要覆盖分支；
- 后续迁移要考虑平台锁定。

如果你的团队无法解释每个状态节点为什么存在，就不要把流程画成复杂图。

## 框架准入检查

引入 Agent Framework 前，至少回答：

- 是否有明确状态 schema；
- 是否有工具错误结构；
- 是否有停止条件；
- 是否有 trace 和 replay 需求；
- 是否有分支测试样本；
- 是否需要人工确认；
- 是否能接受框架升级和迁移成本。

如果这些问题答不上来，先用轻量 loop 跑通业务样本。框架应该承载已经清楚的流程，不应该替团队发现流程。

## 推荐策略

| 项目阶段 | 推荐选择 |
| --- | --- |
| 原型验证 | 轻量 loop / LangChain / LlamaIndex |
| RAG 产品 | LlamaIndex + 明确检索评估 |
| 长流程 Agent | LangGraph |
| 多 Agent 实验 | AutoGen / CrewAI |
| 企业 .NET / Azure | Semantic Kernel |
| Claude-first 产品 | Claude Tool Use / Managed Agents / MCP |
| OpenAI-first 产品 | OpenAI Agents SDK |

下一章单独讲 LangGraph，因为它不是“更高级的 LangChain”，而是显式状态机。这个边界搞错，系统会很快失控。
