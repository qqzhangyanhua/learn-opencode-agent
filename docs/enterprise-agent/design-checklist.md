---
title: 企业 Agent 设计检查表
description: 用一张检查表审视企业 Agent 是否具备权限、数据、流程、审计和生产化边界
contentType: support
series: support
contentId: enterprise-agent-design-checklist
shortTitle: 企业 Agent 设计检查表
summary: 将从零设计企业 Agent 专栏压缩成可执行的项目评审清单
difficulty: intermediate
estimatedTime: 15 分钟
learningGoals:
  - 用检查表评审企业 Agent 方案完整性
  - 快速发现权限、数据、工具、流程和审计缺口
  - 把 IMS Copilot 的经验迁移到自己的企业 Agent 项目
prerequisites:
  - 读过 E00 或了解企业 Agent 的基本约束
recommendedNext:
  - /enterprise-agent/e17-ims-copilot-retrospective
practiceLinks:
  - /practice/p19-security
  - /practice/p20-observability
searchTags:
  - 企业 Agent
  - 设计检查表
  - 架构评审
  - 安全边界
navigationLabel: 设计检查表
entryMode: bridge
roleDescription: 准备评审或落地企业 Agent 项目的架构师、工程负责人和开发者
---

# 企业 Agent 设计检查表

这张表用来评审一个企业 Agent 方案是否具备上线基础。

它不检查“模型够不够聪明”，而检查系统边界是否清楚。

## 1. 任务边界

| 检查项 | 通过标准 |
| --- | --- |
| 是否定义了目标用户 | 能说清楚是员工、主管、HR、财务还是其他角色 |
| 是否定义了核心任务 | 能列出最常见的 5-10 个用户任务 |
| 是否区分问答、查询、引导、自动化 | 不把所有需求都塞进一个聊天入口 |
| 是否定义不做什么 | 高风险或无权限场景有明确拒绝策略 |

## 2. 权限与数据

| 检查项 | 通过标准 |
| --- | --- |
| 用户身份是否来自可信上下文 | 不依赖模型理解“我是谁” |
| 数据查询是否强制带用户或组织范围 | 查询层必须注入过滤条件 |
| 数据库是否有二次保护 | RLS 或等价机制限制行级可见性 |
| 知识库是否有元数据权限 | 文档 chunk 带角色、地区、部门、版本 |
| 是否控制回答粒度 | 不同角色看到不同明细程度 |

## 3. 知识库与引用

| 检查项 | 通过标准 |
| --- | --- |
| 文档是否按业务语义切分 | 不只按固定长度切 chunk |
| 是否处理版本和生效时间 | 过期制度不会参与回答 |
| 检索是否在权限过滤后发生 | 无权内容不会进入 LLM 上下文 |
| 答案是否带引用 | 能追到文档、章节、版本和 chunk |
| 引用是否经过校验 | 引用必须来自本次允许候选集 |

## 4. 工具与流程

| 检查项 | 通过标准 |
| --- | --- |
| 工具是否分风险等级 | 只读、草稿、写入分开处理 |
| 写操作是否必须确认 | 提交、撤回、审批前进入 Human-in-the-Loop（HITL） |
| 确认票据是否冻结参数 | 用户确认的内容不能被悄悄修改 |
| 是否有幂等键 | 重试不会重复创建业务流程 |
| 是否定义补偿策略 | 知道哪些动作可撤回、可补偿、不可逆 |

## 5. 规划与状态

| 检查项 | 通过标准 |
| --- | --- |
| Planner 是否输出结构化步骤 | 每步有输入、输出、依赖和失败处理 |
| 缺字段是否进入澄清 | 不让模型猜日期、金额、对象等关键字段 |
| 澄清后是否能恢复任务 | 用户补充信息后继续原计划 |
| 流程状态是否持久化 | 能知道任务在草稿、确认、提交还是失败状态 |

## 6. 生产化

| 检查项 | 通过标准 |
| --- | --- |
| 是否有 trace_id / session_id | 能串起完整执行链路 |
| 是否记录检索和引用 | 能解释答案依据 |
| 是否记录工具调用和确认 | 能追踪真实副作用 |
| 是否有模型路由策略 | 不同任务用不同模型 |
| 是否有降级策略 | 模型或工具失败时能安全停止或降级 |

## 最小上线线

如果只能选最关键的上线前检查，至少要过这六条：

1. 用户身份来自可信登录态；
2. 检索和 SQL 查询都在执行前做权限过滤；
3. 高风险写操作必须 Human-in-the-Loop（HITL）；
4. 所有工具调用都有审计记录；
5. 流程写入有幂等键；
6. 答案能追溯到数据源或明确说明无法确定。

少任何一条，都不建议把 Agent 接到真实企业系统。

## 下一步可用模板

如果检查表发现项目边界还不清楚，可以继续使用这三份材料：

- [企业 Agent 实施模板](/enterprise-agent/implementation-template)：先把目标用户、核心任务、数据源、工具和权限写清楚。
- [企业 Agent 风险矩阵](/enterprise-agent/risk-matrix)：再判断哪些能力可以自动执行，哪些必须确认、审计或停止。
- [企业 Agent 参考架构蓝图](/enterprise-agent/architecture-blueprint)：最后把入口、意图、编排、权限、工具、数据和审计画成项目级架构。
- [Python 项目结构与技术选型](/enterprise-agent/python-project-structure)：如果已经确定用 Python，实现前先收敛目录结构、模块边界和基础选型。
- [企业 Agent 数据模型与 Schema](/enterprise-agent/data-model-and-schema)：实现前统一用户上下文、计划、工具、引用和审计对象。
- [企业 Agent 运行时状态机](/enterprise-agent/runtime-state-machine)：明确澄清、确认、执行、失败和取消的状态流转。
- [企业 Agent API 契约设计](/enterprise-agent/api-contract)：把对话、确认、会话、审计和健康检查接口定下来。
