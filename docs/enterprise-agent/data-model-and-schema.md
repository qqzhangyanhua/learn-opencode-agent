---
title: 企业 Agent 数据模型与 Schema
description: 定义企业 Agent 实现前必须统一的用户上下文、意图、计划、工具、确认、引用、审计和响应模型
contentType: support
series: support
contentId: enterprise-agent-data-model-and-schema
shortTitle: 数据模型与 Schema
summary: 用一组稳定的 Pydantic 模型约束企业 Agent 内部对象，避免实现时到处传散乱 dict
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 识别企业 Agent 最小核心数据对象
  - 用 Schema 固定权限、计划、工具、引用和审计字段
  - 避免实现阶段出现字段含义不一致和上下文丢失
prerequisites:
  - 读过 Python 项目结构与技术选型
  - 了解企业 Agent 的权限、工具和审计边界
recommendedNext:
  - /enterprise-agent/runtime-state-machine
practiceLinks:
  - /practice/p26-structured-output
  - /practice/p20-observability
searchTags:
  - 企业 Agent
  - 数据模型
  - Schema
  - Pydantic
navigationLabel: 数据模型与 Schema
entryMode: bridge
roleDescription: 准备开始实现企业 Agent 内部对象和接口契约的后端工程师
---

# 企业 Agent 数据模型与 Schema

企业 Agent 项目进入实现前，必须先统一数据模型。

不要让不同模块随手传 `dict`。字段一旦散掉，权限上下文、工具参数、审计链路和引用来源都会变得不可追踪。

## 最小核心对象

| 对象 | 用途 |
| --- | --- |
| UserContext | 当前用户是谁，能访问什么范围 |
| AgentRequest | 一次用户输入和会话上下文 |
| IntentResult | 意图识别、能力需求、缺失字段和风险 |
| PlanStep | 可执行步骤、依赖和失败策略 |
| ToolSpec | 工具声明、风险等级和权限要求 |
| ToolCall | 一次实际工具调用 |
| ConfirmationTicket | 高风险动作的确认票据 |
| Citation | 回答引用来源 |
| AuditEvent | 审计事件 |
| AgentResponse | 返回给用户的统一响应 |

这些对象是模块之间的契约。实现可以调整，但语义不能随意漂移。

## 用户与请求

```python
from typing import Literal
from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]
Capability = Literal["policy_qa", "personal_data", "operation_guide", "workflow"]

class UserContext(BaseModel):
    user_id: str
    roles: list[str] = Field(default_factory=list)
    org_scope: list[str] = Field(default_factory=list)
    locale: str = "zh-CN"

class AgentRequest(BaseModel):
    session_id: str
    trace_id: str
    message: str
    user_context: UserContext
```

`UserContext` 必须来自可信登录态或网关，不从用户自然语言里提取。

## 意图与计划

```python
class IntentResult(BaseModel):
    goal: str
    capabilities: list[Capability]
    missing_fields: list[str] = Field(default_factory=list)
    risk_level: RiskLevel
    next_action: Literal["answer", "query", "clarify", "confirm", "execute"]

class PlanStep(BaseModel):
    step_id: str
    action: Literal["retrieve", "query_data", "guide", "call_tool", "answer"]
    required_inputs: list[str] = Field(default_factory=list)
    depends_on: list[str] = Field(default_factory=list)
    risk_level: RiskLevel
    on_failure: Literal["stop", "retry", "clarify", "handoff"]
```

计划步骤要能被状态机恢复。不要只保存自然语言计划。

## 工具与确认

```python
class ToolSpec(BaseModel):
    name: str
    description: str
    risk_level: RiskLevel
    required_scopes: list[str]
    requires_confirmation: bool = False
    idempotency_required: bool = False

class ToolCall(BaseModel):
    tool_name: str
    arguments: dict[str, str | int | float | bool | list[str]]
    risk_level: RiskLevel
    idempotency_key: str | None = None

class ConfirmationTicket(BaseModel):
    ticket_id: str
    trace_id: str
    tool_call: ToolCall
    confirmed_by: str
    status: Literal["pending", "confirmed", "cancelled", "expired"]
```

确认票据必须冻结工具参数。用户确认的是具体动作，不是“继续执行”这句话。

## 引用、审计和响应

```python
class Citation(BaseModel):
    source_id: str
    title: str
    version: str | None = None
    chunk_id: str | None = None
    url: str | None = None

class AuditEvent(BaseModel):
    trace_id: str
    session_id: str
    user_id: str
    event_type: str
    summary: str
    tool_name: str | None = None
    risk_level: RiskLevel | None = None

class AgentResponse(BaseModel):
    session_id: str
    trace_id: str
    message: str
    citations: list[Citation] = Field(default_factory=list)
    requires_confirmation: bool = False
    confirmation_ticket_id: str | None = None
```

回答可以没有引用，但必须明确原因。不能把“无来源的猜测”伪装成制度结论。

## 设计底线

| 底线 | 原因 |
| --- | --- |
| 所有请求带 `trace_id` | 审计链路需要统一追踪 |
| 工具调用带 `risk_level` | 执行前必须知道风险等级 |
| 高风险工具带确认票据 | 防止静默写入业务系统 |
| 引用有 `source_id` 和版本 | 能追到答案依据 |
| 计划步骤有失败策略 | 状态恢复不能靠人工猜 |

数据模型不是文档装饰。它决定系统能不能被测试、审计和长期维护。
