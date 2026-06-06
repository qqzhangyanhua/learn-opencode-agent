---
title: 企业 Copilot 技术栈怎么选
description: 从权限、知识库、业务工具、审计和人机确认判断企业 Copilot 应该采用什么技术组合。
contentType: support
series: support
contentId: agent-selection-enterprise-copilot-stack
shortTitle: 企业 Copilot 选型
summary: 企业 Copilot 的核心不是多智能体，而是权限、知识、工具和审计边界。
difficulty: advanced
estimatedTime: 35 分钟
learningGoals:
  - 判断企业 Copilot 的最小技术栈
  - 区分知识问答、工具执行和流程编排边界
  - 识别企业场景中的权限、审计和上线风险
prerequisites:
  - 已了解 Agent 框架、RAG 和组合方案
  - 已阅读场景选型手册
recommendedNext:
  - /agent-selection/21-enterprise-knowledge-permission
  - /agent-selection/26-human-approval
  - /agent-selection/27-observability-trace-replay-eval
practiceLinks:
  - /practice/p19-security/
  - /practice/p20-observability/
  - /practice/p21-evaluation/
searchTags:
  - 企业 Copilot
  - 权限过滤
  - 审计
  - 工具执行
  - Agent 选型
navigationLabel: 企业 Copilot 选型
entryMode: bridge
roleDescription: 适合设计企业内部助手、流程助手和业务 Copilot 时阅读。
---

<ChapterLearningGuide />

## 先给结论

企业 Copilot 的默认技术栈应该是：

```text
Intent Router
  -> Permission Check
  -> RAG / Tool Router
  -> Human Approval
  -> Audit Log
  -> Evaluation
```

不要先做多 Agent。企业 Copilot 最先出问题的地方通常是权限、工具越权、引用缺失和不可审计。

## 先理解它不是一个聊天入口

企业 Copilot 至少包含三种不同系统能力：

```text
Knowledge Copilot
  -> 读内部知识，回答并引用

Operation Copilot
  -> 查业务系统，必要时执行动作

Workflow Copilot
  -> 跨系统推进流程，暂停、恢复、审批、审计
```

这三类能力可以放在同一个产品入口里，但技术实现不要混成一个链路。知识问答错了，主要修 RAG；业务查询错了，主要修工具和权限；流程跳步了，主要修状态机和审批节点。

## 能力分层

| 层 | 责任 | 不要混在一起 |
| --- | --- | --- |
| Intent Router | 判断用户想问知识、查数据还是执行动作 | 不要让一个 Prompt 同时做全部路由 |
| Permission Check | 判断用户能看什么、能做什么 | 不要生成后再过滤 |
| RAG | 提供内部知识和引用 | 不要负责业务动作 |
| Tools | 执行业务系统动作 | 不要让模型绕过权限系统 |
| Human Approval | 拦截高风险操作 | 不要只靠提示词提醒 |
| Audit | 记录输入、来源、工具和结果 | 不要上线不可回放链路 |

## 典型需求怎么映射技术栈

| 用户需求 | 本质 | 技术组合 | 关键验收 |
| --- | --- | --- | --- |
| “帮我查公司报销制度” | 私有知识问答 | RAG + ACL + Citation | 引用正确、权限正确 |
| “这个客户最近有哪些工单” | 只读业务查询 | Tool Gateway + Permission | 只查授权范围 |
| “帮我生成一份审批单” | 草稿生成 | RAG + Tool draft + Review | 不自动提交 |
| “帮我提交采购申请” | 高风险写操作 | Workflow + Approval + Audit | 确认后执行，可回放 |
| “帮我排查跨系统问题” | 多步调查 | Agent Workflow + Tools + Trace | 每一步有来源和结果 |

这里的关键是把“回答”和“行动”拆开。回答可以走 RAG，行动必须走工具网关；高风险行动还要进入审批和审计。

## 数据流和控制流要分开

企业 Copilot 里有两条线：

```text
数据流：
  用户问题 -> 权限过滤 -> RAG / Tool -> 上下文 -> 答案或结果

控制流：
  意图识别 -> 风险分级 -> 路由 -> 审批 -> 执行 -> 降级
```

很多方案失败，是因为把两条线都交给模型自由决定。模型可以帮助判断意图，但权限、风险分级、审批和工具执行应该由程序控制。

## 三种落地路线

| 路线 | 架构 | 适合 | 代价 |
| --- | --- | --- | --- |
| 知识优先 | RAG + Citation + Permission Filter | 政策、制度、产品文档问答 | 不适合直接办业务 |
| 工具优先 | Intent Router + Tool Gateway + Audit | 查工单、查订单、查库存 | 必须处理工具权限和失败 |
| 流程优先 | Agent Workflow + Human Approval + Trace | 跨系统审批、变更、发布 | 状态和测试成本最高 |

技术选型时先选路线，再选框架。不要因为最终想做流程 Copilot，就让第一版知识问答也背上状态机复杂度。

## 分阶段路线

| 阶段 | 目标 | 能力 | 不做什么 |
| --- | --- | --- | --- |
| V0 | 验证知识价值 | RAG、引用、拒答 | 不接业务系统 |
| V1 | 接入只读查询 | Tool Gateway、权限、trace | 不开放写操作 |
| V2 | 生成业务草稿 | 草稿工具、人工 review | 不自动提交 |
| V3 | 执行受控动作 | 审批、审计、回滚 | 不让模型绕过工作流 |
| V4 | 跨系统流程 | 状态机、恢复、评估 | 不做黑盒多 Agent |

这条路线的好处是每一步都有清晰风险边界。企业 Copilot 最怕一步到位：RAG、业务工具、写操作、多 Agent 全上，最后任何错误都定位不了。

## 最小可行版本

第一版只做三件事：

- 内部知识问答；
- 只读业务查询；
- 明确引用和权限过滤。

等这三件事稳定后，再加入写操作、跨系统流程和复杂状态编排。

一个合理的第一版链路：

```text
用户问题
  -> 意图分类：知识问答 / 只读查询 / 高风险动作
  -> 权限计算：可见知识范围 / 可用工具范围
  -> RAG 或只读工具
  -> 生成回答 + 引用 / 查询结果解释
  -> trace 记录
```

这个版本不应该支持“自动提交”“自动删除”“自动审批”。这些动作要等权限、审计、确认和回滚能力齐了以后再开放。

## 什么时候需要 Agent Framework

| 情况 | 选择 |
| --- | --- |
| 只是知识问答 | RAG pipeline |
| 查询一个业务系统 | Tool calling + 权限校验 |
| 多系统串联执行 | Agent Workflow |
| 需要暂停等待审批 | LangGraph 或工作流引擎 |
| 需要失败恢复和回放 | 显式状态 + checkpoint |

如果流程不能画成状态图，不要先上 LangGraph。先把输入、输出、权限和工具边界说清楚。

判断是否需要显式工作流，可以看动作是否满足下面三个条件：

1. 中间状态需要保存；
2. 用户或审批人会暂停流程；
3. 失败后不能从头重跑，必须从某一步恢复。

如果只有“查资料 -> 回答”，那是 RAG。如果是“查制度 -> 查用户数据 -> 生成变更单 -> 等经理确认 -> 调接口提交”，才是工作流 Agent。

## 权限是第一设计对象

企业 Copilot 至少要区分：

- 用户能看哪些知识；
- 用户能查哪些业务数据；
- 用户能执行哪些动作；
- 哪些动作需要审批；
- 哪些输出需要脱敏；
- 哪些日志需要保留。

权限过滤必须发生在检索和工具执行之前。生成后过滤已经太晚。

## 工具网关怎么设计

不要让模型直接调用业务系统 API。中间应该有一个工具网关：

```text
LLM tool call
  -> tool gateway
  -> user identity
  -> permission check
  -> parameter validation
  -> risk classification
  -> execute or require approval
  -> audit record
```

工具网关要把业务系统的复杂接口封装成模型能稳定使用的小工具。比如不要暴露 `POST /api/v1/workflow/actions/execute` 这种泛接口，而是暴露 `create_purchase_request_draft`、`get_customer_ticket_summary` 这类边界清楚的工具。

## POC 样本应该覆盖什么

| 样本 | 目的 |
| --- | --- |
| 有权限制度问答 | 验证 RAG 和引用 |
| 无权限制度问答 | 验证检索前过滤 |
| 只读业务查询 | 验证工具和身份透传 |
| 写操作请求 | 验证不会直接执行 |
| 高风险审批请求 | 验证暂停和确认 |
| 文档冲突问题 | 验证版本和拒答 |
| 工具超时 | 验证降级和 trace |

POC 里必须有失败样本。只测成功路径，无法证明企业 Copilot 能上线。

## 技术选型输出应该长什么样

方案评审时，不要只写“使用 LangGraph + RAG”。应该写成下面这种结构：

| 模块 | 决策 | 说明 |
| --- | --- | --- |
| 意图路由 | 规则 + 小模型分类 | 先区分问答、查询、执行 |
| 知识库 | RAG + 检索前 ACL | 内部制度和产品文档必须引用 |
| 工具网关 | 自有服务封装 | 模型不能直连业务系统 token |
| 状态编排 | 第一版不用图框架 | 只读问答和查询不需要恢复执行 |
| 高风险动作 | 人工确认 | 写操作进入下一阶段 |
| 观测 | trace + 评测集 | 记录 query、chunk、tool、answer |

这样的输出能让团队知道每一层为什么存在，也能知道第一版不做什么。

## 上线前检查

- 是否有用户身份和租户边界；
- 是否有检索前权限过滤；
- 是否有工具白名单；
- 高风险工具是否需要确认；
- 每次回答是否有引用；
- 每次工具调用是否有 trace；
- 是否能回放一次完整会话；
- 是否有拒答和转人工策略。

企业 Copilot 不是聊天机器人加几个工具。它是权限系统、知识系统、工具系统和审计系统的组合。
