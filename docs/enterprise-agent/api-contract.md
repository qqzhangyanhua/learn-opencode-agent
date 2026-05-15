---
title: 企业 Agent API 契约设计
description: 定义企业 Agent 最小 HTTP API、请求响应字段、确认接口、会话查询和审计查询边界
contentType: support
series: support
contentId: enterprise-agent-api-contract
shortTitle: API 契约设计
summary: 用最小 API 契约约束企业 Agent 的对话、确认、会话、审计和健康检查接口
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 设计企业 Agent 最小 API 接口集合
  - 明确 chat、confirm、session、audit 和 health 的输入输出
  - 避免接口层泄露权限、工具和审计细节
prerequisites:
  - 读过企业 Agent 运行时状态机
  - 了解 FastAPI 和 Pydantic 的基本使用方式
recommendedNext:
  - /enterprise-agent/design-checklist
practiceLinks:
  - /practice/p23-production
  - /practice/p20-observability
searchTags:
  - 企业 Agent
  - API 契约
  - FastAPI
  - 接口设计
navigationLabel: API 契约设计
entryMode: bridge
roleDescription: 准备实现企业 Agent HTTP 服务、确认接口和审计查询接口的后端工程师
---

# 企业 Agent API 契约设计

企业 Agent 的 API 不应该只是一个 `/chat`。

只要系统涉及澄清、确认、流程状态和审计查询，就需要把接口边界拆清楚。

## 最小接口集合

| 接口 | 用途 |
| --- | --- |
| `POST /chat` | 接收用户输入，推进一次 Agent 回合 |
| `POST /confirm` | 确认或取消高风险工具调用 |
| `GET /sessions/{session_id}` | 查询会话和任务状态 |
| `GET /audit/{trace_id}` | 查询一次执行链路的审计事件 |
| `GET /health` | 健康检查 |

第一版不需要很多接口，但这五个边界要清楚。

## POST /chat

```json
{
  "session_id": "s_123",
  "message": "我下周想休三天，帮我看看怎么请假",
  "client_context": {
    "locale": "zh-CN",
    "channel": "web"
  }
}
```

服务端必须从登录态注入 `user_context`，不要信任客户端传来的用户身份。

```json
{
  "session_id": "s_123",
  "trace_id": "t_456",
  "state": "need_clarification",
  "message": "你想请哪三天？",
  "citations": [],
  "requires_confirmation": false
}
```

`state` 是前端下一步交互的依据，不要让前端靠解析自然语言判断。

## POST /confirm

```json
{
  "confirmation_ticket_id": "ct_789",
  "action": "confirm"
}
```

```json
{
  "session_id": "s_123",
  "trace_id": "t_456",
  "state": "executing_tool",
  "message": "已确认，正在提交请假申请。"
}
```

确认接口只能处理已冻结参数的票据。不能允许客户端重新传一份工具参数。

## GET /sessions/{session_id}

用于恢复页面、排查用户问题或展示当前任务状态。响应至少包含：

```json
{
  "session_id": "s_123",
  "current_state": "waiting_confirmation",
  "pending_task": {
    "task_id": "task_001",
    "missing_fields": [],
    "confirmation_ticket_id": "ct_789"
  }
}
```

普通用户只能查自己的会话。运维和审计角色的查询范围必须单独授权。

## GET /audit/{trace_id}

审计接口面向内部排查和合规，不面向普通用户开放完整细节。响应可以按事件流返回：

```json
{
  "trace_id": "t_456",
  "events": [
    {
      "event_type": "intent_event",
      "summary": "识别为请假流程自动化",
      "risk_level": "high"
    },
    {
      "event_type": "tool_call_event",
      "summary": "调用 submit_leave_request",
      "tool_name": "submit_leave_request"
    }
  ]
}
```

审计接口也有权限。不能因为是日志，就让所有研发都能看。

## GET /health

健康检查只回答服务是否可用，不泄露敏感配置。数据库、向量库和模型供应商状态可以放在内部监控。

## 错误响应

错误响应要结构化：

```json
{
  "trace_id": "t_456",
  "error_code": "PERMISSION_DENIED",
  "message": "你没有权限执行该操作。"
}
```

| 错误码 | 场景 |
| --- | --- |
| PERMISSION_DENIED | 用户无权访问数据或工具 |
| MISSING_REQUIRED_FIELD | 缺少日期、金额、对象等关键字段 |
| TOOL_CONFIRMATION_REQUIRED | 高风险工具需要确认 |
| TOOL_EXECUTION_FAILED | 工具或业务系统调用失败 |
| CITATION_NOT_FOUND | 引用不存在或不在候选集 |
| RISK_POLICY_BLOCKED | 风险策略阻止执行 |

错误文案可以友好，但错误码必须明确。

## 接口设计底线

1. 用户身份由服务端注入；
2. 所有响应都带 `trace_id`；
3. 高风险动作只能通过确认票据继续；
4. 前端根据 `state` 渲染下一步，而不是解析回答文本；
5. 审计接口必须做权限控制；
6. 错误响应必须结构化。

API 契约稳定后，前端、后端、审计和测试才能并行推进。
