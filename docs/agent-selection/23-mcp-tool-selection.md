---
title: MCP 工具怎么选
description: 判断什么时候应该用 MCP 暴露工具、资源和外部系统，以及如何评估 MCP Server 的权限和质量。
contentType: support
series: support
contentId: agent-selection-mcp-tools
shortTitle: MCP 工具选型
summary: MCP 适合统一工具接入协议，但每个 server 的权限、认证、错误处理和审计仍然要单独评估。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 判断哪些能力适合通过 MCP 暴露
  - 评估 MCP Server 的权限、认证和审计风险
  - 区分工具、资源和普通 API 接入边界
prerequisites:
  - 了解 MCP 基础概念
  - 已了解工具执行和安全边界
recommendedNext:
  - /agent-selection/25-text-to-sql-agent
  - /agent-selection/26-human-approval
  - /practice/p14-mcp/
practiceLinks:
  - /practice/p14-mcp/
  - /practice/p19-security/
  - /practice/p20-observability/
searchTags:
  - MCP
  - 工具调用
  - Tool Server
  - 权限
  - Agent 工具
navigationLabel: MCP 工具选型
entryMode: bridge
roleDescription: 适合给 Agent 接入数据库、文件、搜索、业务系统和外部工具时阅读。
---

<ChapterLearningGuide />

## MCP 解决什么

MCP 解决的是工具和资源接入协议统一，不自动解决工具质量和权限安全。

从 Agent 开发视角看，MCP 把“模型要用的外部能力”拆成几个明确原语：

| 原语 | 用途 | 例子 |
| --- | --- | --- |
| Tools | 让模型触发动作或查询 | 搜索、查数据库、读文件 |
| Resources | 给模型读取上下文资料 | 数据库 schema、文档、配置 |
| Prompts | 提供可复用提示模板 | SQL 生成 few-shot、工具使用说明 |
| Elicitation | 向用户要补充信息或确认 | 缺参数、审批高风险动作 |

这比“把所有能力写成一个万能 API”更容易治理。

适合 MCP 的能力：

- 搜索；
- 文件和知识库读取；
- 数据库只读查询；
- 业务系统查询；
- 内部工具封装；
- 开发环境能力。

不适合直接开放的能力：

- 无审批删除；
- 无权限写生产数据；
- 无审计发送外部消息；
- 无限制执行 shell；
- 返回敏感数据的全量查询。

## MCP Server 不是业务后门

一个 MCP Server 应该像正式后端服务一样设计：

```text
Authentication
  -> Authorization
  -> Input Schema
  -> Execution
  -> Structured Error
  -> Audit Log
```

不要让 MCP 绕过原有业务系统权限。Agent 只是新的调用方，不应该拿到比用户更大的能力。

## 评估一个 MCP Server

| 问题 | 为什么重要 |
| --- | --- |
| 需要什么认证 | 决定是否能越权 |
| 工具权限是否最小化 | 决定风险面 |
| 参数 schema 是否清楚 | 决定模型能否正确调用 |
| 错误是否结构化 | 决定能否重试和降级 |
| 是否有审计日志 | 决定能否追责 |
| 是否能限制范围 | 决定是否可上线 |

不要因为 MCP 接入方便，就把高风险能力直接暴露给模型。

## Server 分级

不是所有 MCP Server 风险都一样：

| 等级 | 例子 | 准入要求 |
| --- | --- | --- |
| 低风险只读 | 读本地文档、查公开资料 | 明确范围、结构化返回 |
| 中风险查询 | 查内部订单、查数据库只读 | 身份透传、权限过滤、审计 |
| 高风险写入 | 发邮件、建工单、改状态 | 人工确认、参数校验、回滚 |
| 极高风险执行 | shell、生产数据批量修改 | 默认禁用或强审批 |

选 MCP 工具时先分级，再决定是否允许模型自动调用。不要把所有 server 放进同一个工具列表。

## Tools、Resources、Prompts 怎么分工

| 需求 | 建议 |
| --- | --- |
| 查询订单状态 | Tool |
| 暴露数据库 schema | Resource |
| 约束 SQL 写法 | Prompt |
| 缺少查询时间范围 | Elicitation |
| 执行退款 | Tool + Approval |

很多 MCP 设计失败，是因为把静态上下文做成 tool，把需要确认的动作做成普通 tool，把提示规则硬编码进客户端。

## 工具设计原则

- 名称明确；
- 参数少而清楚；
- 返回结构化；
- 错误显式；
- 默认只读；
- 写操作需要确认；
- 支持超时；
- 支持权限检查。

工具越像稳定 API，Agent 越容易正确使用。

一个好工具描述应该回答三件事：

1. 什么时候用；
2. 参数怎么填；
3. 返回结果代表什么。

工具描述不是给人看的注释，它会直接影响模型是否正确调用工具。

## 认证和部署边界

MCP Server 部署时要明确：

- server 运行在哪里；
- 使用谁的凭证；
- 是否透传用户身份；
- 是否能限制工作目录或数据域；
- 是否有超时和并发限制；
- 日志是否包含敏感参数；
- 谁能安装和启用 server。

本地开发 server 和生产 server 不能按同一标准处理。生产环境里，MCP Server 就是新的后端入口。

## MCP 与普通 API

| 选择 | 适合 |
| --- | --- |
| MCP | 多 Agent 客户端复用、工具生态统一 |
| 普通 API | 单系统内部调用、强业务控制 |
| SDK | 平台内深度集成 |
| 手写 tool wrapper | 少量简单工具 |

MCP 不是必须项。如果只有一个内部服务、一个 Agent 客户端，普通 API wrapper 可能更简单。

## 工具评测样本

每个 MCP Server 至少准备几类样本：

| 样本 | 验证 |
| --- | --- |
| 正常查询 | 工具名和参数是否正确 |
| 参数缺失 | 是否触发补充信息 |
| 权限不足 | 是否拒绝而不是重试 |
| 工具超时 | 是否降级 |
| 高风险动作 | 是否进入审批 |
| 恶意输入 | 是否被参数校验拦住 |

MCP 接入成功只是第一步。能否被模型稳定、受控地调用，才是生产选型重点。

## 生产准入清单

- 是否有 server 版本；
- 是否声明 capabilities；
- 工具 schema 是否稳定；
- 错误是否结构化；
- 是否支持超时；
- 是否有权限检查；
- 是否有审计日志；
- 高风险工具是否触发确认；
- 是否有工具调用评测样本。

没有这些，MCP 只是接入成功，不是生产可用。

## 最终判断

```text
多工具生态：MCP
单系统内部：API wrapper
高风险写操作：审批 + 审计
只读查询：适合先接入
权限不清：不要暴露
```

MCP 的价值是协议统一，生产价值来自权限、审计和工具设计。
