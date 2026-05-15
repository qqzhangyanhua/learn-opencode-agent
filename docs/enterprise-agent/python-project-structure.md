---
title: Python 项目结构与技术选型
description: 用 Python 落地企业 Agent 时的目录结构、模块边界和基础技术选型建议
contentType: support
series: support
contentId: enterprise-agent-python-project-structure
shortTitle: Python 项目结构
summary: 将企业 Agent 参考架构映射成 Python 项目的目录设计、模块职责和依赖规则
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 理解企业 Agent Python 项目的目录拆分方式
  - 区分 API、应用编排、领域能力、基础设施和审计模块的职责
  - 建立一套克制、可测试、可演进的 Python 技术选型基线
prerequisites:
  - 读过企业 Agent 参考架构蓝图
  - 了解 Python Web 服务和企业内部系统集成的基本形态
recommendedNext:
  - /enterprise-agent/data-model-and-schema
practiceLinks:
  - /practice/p23-production
  - /intermediate/30-production-architecture
searchTags:
  - 企业 Agent
  - Python
  - 项目结构
  - 技术选型
navigationLabel: Python 项目结构
entryMode: bridge
roleDescription: 准备用 Python 实现企业 Agent 服务的后端工程师和架构负责人
---

# Python 项目结构与技术选型

如果企业 Agent 进入实现阶段，第一件事不是写 Prompt，而是把项目边界分清楚。

Python 很适合做企业 Agent 的后端：生态完整，接模型、向量库、数据库、工作流和内部系统都方便。

但目录不能按“模型调用代码”“Prompt 代码”“工具代码”随便堆。企业 Agent 要按职责分层。

## 技术选型基线

这套选型以稳定、可测试、容易接企业系统为目标。

| 层级 | 建议选型 | 说明 |
| --- | --- | --- |
| Web 框架 | FastAPI | 适合 HTTP API、SSE、OpenAPI 和依赖注入 |
| 数据校验 | Pydantic | 定义请求、工具参数、计划结构和审计事件 |
| 数据库访问 | SQLAlchemy / asyncpg | 连接 PostgreSQL，承接结构化业务数据和审计表 |
| 向量检索 | Milvus 或 pgvector | Milvus 适合独立知识库，pgvector 适合轻量集成 |
| 任务执行 | Celery / Dramatiq / 后台任务 | 处理异步审计、长流程和重试任务 |
| 配置管理 | pydantic-settings | 管理模型、数据库、工具开关和环境配置 |
| 测试 | pytest | 覆盖意图、权限、工具和编排链路 |

选型不要一开始就追求平台化。先把身份、权限、工具、状态和审计做稳。

## 推荐目录结构

```text
enterprise_agent/
  app/                         # FastAPI 入口层，只处理 HTTP、依赖注入和 schema
    main.py                    # 应用启动入口，注册路由和中间件
    api/                       # chat、health 等 API route
    schemas/                   # 请求响应 DTO，不放业务规则
  core/                        # 配置、错误、日志、安全等通用基础能力
  domain/                      # 纯业务规则层，不依赖 FastAPI、数据库或模型 SDK
    intent/                    # 意图识别：目标、能力、缺失字段、风险等级
    planning/                  # 任务计划、状态推进、澄清恢复
    policy/                    # 权限、scope、风险等级和可执行性判断
    answer/                    # 答案组织、引用校验、输出粒度控制
  services/                    # 应用编排层，串起 domain、tools、infrastructure
    agent_service.py           # 一次用户请求的主编排入口
    retrieval_service.py       # 知识检索应用服务
    data_query_service.py      # 结构化数据查询应用服务
    workflow_service.py        # 流程草稿、提交、状态恢复
    audit_service.py           # 审计事件写入与查询
  tools/                       # Agent 可调用工具层，统一声明风险和权限
    registry.py                # 工具注册表和执行前校验
    base.py                    # ToolSpec、ToolContext 等基础类型
    policy_tools.py            # 制度检索、引用查询等知识工具
    data_tools.py              # 个人数据、业务状态查询工具
    workflow_tools.py          # 草稿、提交、撤回等流程工具
  infrastructure/              # 外部系统适配层，只处理技术细节
    db/                        # PostgreSQL 连接、model、repository
    vector/                    # Milvus / pgvector client 和 retriever
    llm/                       # 模型 client、模型路由、重试和限流
    workflow/                  # OA / HR / 工单系统 client
    audit/                     # 审计存储实现
  tests/                       # 测试按层组织，优先覆盖 domain 和 tools
    domain/
    services/
    tools/
    api/
```

目录结构的重点不是名字，而是依赖方向清楚。

API 层可以依赖 service，service 可以依赖 domain 和 infrastructure，但 domain 不应该反过来依赖 FastAPI、数据库连接或具体模型 SDK。

## 分层职责

| 目录 | 职责 | 不应该放什么 |
| --- | --- | --- |
| app | HTTP 入口、依赖注入、请求响应 schema | 业务判断、工具执行细节 |
| core | 配置、错误、日志、安全公共能力 | 具体业务流程 |
| domain | 意图、计划、风险、权限、回答规则 | 数据库 client、HTTP client |
| services | 编排应用流程，连接 domain、tools、infrastructure | 复杂权限规则本身 |
| tools | 工具注册、工具参数、工具风险声明 | 绕过权限的直接系统调用 |
| infrastructure | 数据库、向量库、模型、OA 等外部系统适配 | 业务决策 |
| tests | 单元测试和集成测试 | 生产代码 |

这样拆分后，权限和风险规则能被单独测试，工具也不会直接散落在 API handler 里。

## 核心调用链

一次用户请求可以按这条链路走：

```text
API Route
  -> AgentService
  -> Intent Classifier
  -> Permission / Risk Policy
  -> Planner
  -> Tool Registry
  -> Infrastructure Adapter
  -> Answer Composer
  -> Audit Writer
```

这条链路里有三个强制控制点：

| 控制点 | 位置 | 作用 |
| --- | --- | --- |
| 权限校验 | policy + tool registry | 决定当前用户能不能查、能不能做 |
| 风险判断 | risk policy + planner | 决定是否需要澄清或 HITL |
| 审计写入 | audit service | 记录意图、检索、工具调用、确认和回答 |

不要让 LLM 直接调用 infrastructure。所有外部系统访问都要经过工具注册和权限策略。

## 工具注册方式

工具应该被注册成结构化能力，而不是普通函数列表。

```python
class ToolSpec(BaseModel):
    name: str
    description: str
    risk_level: Literal["low", "medium", "high"]
    required_scopes: list[str]
    requires_confirmation: bool
    idempotency_required: bool
```

工具执行前至少检查三件事：

1. 当前用户是否具备 `required_scopes`；
2. 高风险工具是否已有确认票据；
3. 写操作是否提供幂等键。

这些规则要在工具层执行，不要只依赖 Planner 提醒。

## 最小可落地版本

第一版可以只保留这些模块：

| 模块 | 最小职责 |
| --- | --- |
| app | 暴露 chat API 和 health check |
| domain.intent | 输出目标、能力、缺失字段和风险等级 |
| domain.policy | 做用户权限和工具风险判断 |
| services.agent_service | 串起意图、工具、回答和审计 |
| tools.registry | 统一注册可调用工具 |
| infrastructure.llm | 封装模型调用和模型路由 |
| infrastructure.audit | 写入审计事件 |

先把这条链路跑通，再接更多业务系统。

如果一开始就把平台、多租户、复杂工作流都做进去，项目很容易变成空架构。
