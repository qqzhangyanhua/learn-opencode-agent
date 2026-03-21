---
title: 中级篇导读
description: 面向掌握基础 Agent 理论后想进入工程专题的读者，介绍首批八篇专题的阅读路径与回链关系，突显热门专题与工程进阶的价值。
---

# 中级篇导读

中级篇是理论篇与实践篇之后的工程深化入口：它不是额外追加的专题栏目，而是当你已经看懂基础架构、也开始自己动手实现后，用来处理稳定性、协作、安全、成本这些真实工程问题的下一站。

## 适合谁读

- 已完成前两大部分，看懂 Agent 核心组件、工具系统、会话循环与基础 Prompt，接下来希望拿出一套工程判断而不是零碎试错；
- 当前项目面临 RAG 稳定性、协同 Agent、Planning 或上下文工程的纠结，需要一种可复用的检验顺序与回链指引；
- 关注生产、成本、安全等面向落地的维度，需要从源码与实践篇中抽取支撑数据并承接中级专题的工程视角。

## 推荐前置路径

进入中级篇前，不需要把全书全部看完，但至少建议满足下面三条路径中的一条：

- 已读完理论篇第 1-4 章，能描述最小 Agent 闭环、工具调用与会话管理
- 已跑通实践篇 `P1-P4`，对最小可运行 Agent 有基本手感
- 正在处理某个明确工程问题，例如 RAG 稳定性、多智能体协作、上线安全或成本控制

## 先从这里开始

### 推荐入口

1. [RAG 五大翻车场景](/intermediate/25-rag-failure-patterns/) —— 先锁住 Retrieval + RAG 的工业稳定性，配合 P7-P9 的基础章节完成现象到根因再到策略的循环。
2. [多智能体协作](/intermediate/26-multi-agent-collaboration/) —— 在 RAG 之后接入多 Agent 编排与通信，把 P15-P17 的分工与状态管理落到开放性协作场景中。
3. [Planning 机制](/intermediate/27-planning-mechanism/) —— 先读计划再执行，让 P10 的 ReAct Loop 与 P11 Planning 的即时决策得到多阶段筹划支撑。
4. [上下文工程实战](/intermediate/28-context-engineering/) —— 把第 5 章会话管理与 P6 记忆检索的抽象模型变成可工程化的上下文策略。
5. [System Prompt 设计指南](/intermediate/29-system-prompt-design/) —— 说明书式的 Prompt 设计继续扎根在第 2 章核心组件与第 16 章综合实践思路。
6. [生产架构](/intermediate/30-production-architecture/) —— 向下回链 HTTP API、数据持久、部署与 P23 生产清单，用工程架构保证 Demo 能上线。
7. [安全与边界](/intermediate/31-safety-boundaries/) —— 与第 4 章工具系统、P19 安全、以及第 16 章的权限防线并行，使高危调用拥有可审计的边界。
8. [性能与成本优化](/intermediate/32-performance-cost/) —— 结合多模型支持、数据持久化、路由与可观测性策略，形成可量化的性能/成本管理图谱。

### 为什么这么排顺序

先从 RAG、多智能体、Planning 这三角（稳定性、协作、计划）切入，快速从「模型会做」转到「系统能做」；然后补满上下文与 Prompt 这两条线，最后闭环到生产、安全、成本这类真正决定落地成败的工程考量。

## 回链关系

| 中级篇章节 | 对应现有理论／实践篇 | 说明 |
| --- | --- | --- |
| [RAG 五大翻车场景](/intermediate/25-rag-failure-patterns/) | [P7：RAG 基础](/practice/p07-rag-basics/) / [P8：GraphRAG](/practice/p08-graphrag/) / [P9：混合检索策略](/practice/p09-hybrid-retrieval/) | 将 RAG 的稳定性与答案准确性问题与基本检索策略对应，延续原始抓取、验证与融合链路。 |
| [多智能体协作](/intermediate/26-multi-agent-collaboration/) | [P15：多 Agent 编排](/practice/p15-multi-agent/) / [P16：子 Agent 与任务分解](/practice/p16-subagent/) / [P17：Agent 间通信与状态共享](/practice/p17-agent-comm/) / [第16章：高级主题与最佳实践](/15-advanced-topics/) | 高亮多 Agent 协作中的指令、状态与通信机制，补全理论篇中的“分工”与“通信”技巧。 |
| [Planning 机制](/intermediate/27-planning-mechanism/) | [P10：ReAct Loop 实现](/practice/p10-react-loop/) / [P11：Planning 机制](/practice/p11-planning/) | 直接承接 ReAct 与 Planning 的结构，扩充为多阶段计划与执行评估。 |
| [上下文工程实战](/intermediate/28-context-engineering/) | [第5章：会话管理](/04-session-management/) / [P6：记忆增强检索](/practice/p06-memory-retrieval/) | 给予高频上下文结构与记忆策略的工程实践版本，将抽象章节中的管理体系具体化。 |
| [System Prompt 设计指南](/intermediate/29-system-prompt-design/) | [第2章：AI Agent 的核心组件](/01-agent-basics/) / [第16章：高级主题与最佳实践](/15-advanced-topics/) | 说明 Prompt 作为 Agent 核心说明书，其设计思路需要在核心组件与高级实践之间平衡。 |
| [生产架构](/intermediate/30-production-architecture/) | [第9章：HTTP API 服务器](/08-http-api-server/) / [第10章：数据持久化](/09-data-persistence/) / [第14章：部署与基础设施](/13-deployment-infrastructure/) / [P23：生产部署清单](/practice/p23-production/) | 连接部署基础设施与实际生产线，强调架构边界与依赖管理。 |
| [安全与边界](/intermediate/31-safety-boundaries/) | [第4章：工具系统](/03-tool-system/) / [第16章：高级主题与最佳实践](/15-advanced-topics/) / [P19：Agent 安全与防注入](/practice/p19-security/) | 探讨安全边界的策略如何建立在已有工具系统与污染防线的基础上。 |
| [性能与成本优化](/intermediate/32-performance-cost/) | [第6章：多模型支持](/05-provider-system/) / [第10章：数据持久化](/09-data-persistence/) / [P18：多模型路由与成本控制](/practice/p18-model-routing/) / [P20：可观测性与调试](/practice/p20-observability/) | 重新解读性能与成本管理，强调模型路由、缓存与可观测性的全链路设计。 |

## 阅读建议

- **从 RAG / 多智能体 / Planning 开始**：先从经典的稳定性、协作、计划三角展开，借助已有章节 P7-P11 的理论基础，快速锁定最常见的工程瓶颈再逐项打磨。不要跳过回链章节的源码、示例，确保每个问题都能追溯到实践篇的真实代码。 
- **从生产 / 安全 / 成本开始**：如果当前挑战聚焦落地质量，从生产架构与安全边界出发，回链到部署、工具与成本管理章节，将中级篇作为架构决策的检查表。 
- 推荐结合“上下文工程”与“System Prompt”两章的内容，补齐“上下文 + 指令”这两条线。 
- 每篇内容都附带源码映射与教学示例，阅读时可根据项目背景在源码与教学路径之间切换。
