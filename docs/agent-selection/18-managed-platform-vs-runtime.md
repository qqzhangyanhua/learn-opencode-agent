---
title: 托管 Agent 平台还是自建 Runtime
description: 从交付速度、控制权、状态管理、工具治理、观测和迁移成本判断是否使用托管 Agent 平台。
contentType: support
series: support
contentId: agent-selection-managed-platform-vs-runtime
shortTitle: 托管平台 vs Runtime
summary: 托管平台适合快速交付，自建 Runtime 适合强控制、强审计和长期演进。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 判断托管平台和自建 Runtime 的边界
  - 识别状态、工具、权限和 trace 的控制权风险
  - 设计混合路线：平台能力加自有控制层
prerequisites:
  - 已了解 Build vs Buy
  - 已了解供应商锁定评估
recommendedNext:
  - /agent-selection/15-vendor-lock-in
  - /agent-selection/27-observability-trace-replay-eval
  - /agent-selection/30-fallback-strategy
practiceLinks:
  - /practice/p18-model-routing/
  - /practice/p20-observability/
  - /practice/p21-evaluation/
searchTags:
  - 托管 Agent
  - Agent Runtime
  - Build vs Buy
  - 平台选型
navigationLabel: 托管平台 vs Runtime
entryMode: bridge
roleDescription: 适合决定 Agent 运行层是采购、托管还是自建时阅读。
---

<ChapterLearningGuide />

## 两条路线

```text
托管平台：快、集成好、运维少
自建 Runtime：慢、控制强、可迁移
```

真正的选择通常不是二选一，而是哪些能力用平台，哪些边界自己控制。

## Runtime 到底管什么

Agent Runtime 至少可能负责：

- 会话；
- 工具调用；
- agent loop；
- handoff；
- guardrails；
- 状态持久化；
- 人工确认；
- trace；
- retry 和 fallback。

托管平台通常把这些能力打包；自建 Runtime 则需要你自己决定每一项怎么实现。

## 对比表

| 维度 | 托管平台 | 自建 Runtime |
| --- | --- | --- |
| 交付速度 | 快 | 慢 |
| 状态控制 | 受平台限制 | 可自定义 |
| 工具治理 | 依赖平台能力 | 可接入自有权限 |
| Trace | 平台内好用 | 可进入自有观测 |
| 迁移成本 | 高 | 低到中 |
| 运维成本 | 低 | 高 |
| 合规控制 | 需要评估 | 可定制 |

## 先拆控制权

不要把“托管还是自建”当成整体选择。更实用的问题是每一层控制权放在哪里：

| 层 | 可以托管 | 建议自控 |
| --- | --- | --- |
| 模型调用 | provider、模型 API | 路由策略、fallback 策略 |
| 对话界面 | 低风险原型 | 企业身份和权限 |
| 工具执行 | 沙盒工具、低风险动作 | 工具网关、高风险审批 |
| 状态存储 | 临时 demo 状态 | 业务状态、审批状态 |
| Trace | 平台调试视图 | 可导出的审计和回放数据 |
| Eval | 平台评分能力 | 自有样本集和通过标准 |

如果平台只承载能力，迁移成本可控；如果平台承载业务状态、权限和审计，退出成本会迅速升高。

## 混合控制面

一个更稳的生产架构通常是：

```text
自有控制面
  -> identity / permission
  -> tool gateway
  -> business state
  -> eval dataset

外部能力面
  -> model
  -> search
  -> vector db
  -> hosted tracing
```

控制面决定业务安全，能力面决定交付效率。

## 一个常见演进路径

很多团队第一版可以从托管平台开始，但要提前留下边界：

```text
阶段 1：托管平台做 POC
  -> 验证任务价值、样本集、用户体验

阶段 2：抽出工具网关和权限
  -> 高风险动作进入自有审批

阶段 3：抽出状态和 trace
  -> 关键流程可回放、可审计

阶段 4：平台变成能力供应商
  -> 模型、搜索、追踪服务可替换
```

这个路线的重点不是一开始就自研所有组件，而是不要让第一版原型把长期控制面锁死。

## 适合托管平台

- 原型验证；
- 标准业务场景；
- 平台生态内产品；
- 团队缺少运行时工程能力；
- 对迁移要求不高；
- 工具动作风险低。

托管平台的价值是缩短交付路径，不是替代业务边界设计。

## 适合自建 Runtime

- 强权限隔离；
- 高风险工具执行；
- 需要自定义状态；
- 需要完整审计和回放；
- 多 provider 路由；
- 长期平台化建设；
- 数据合规要求强。

自建 Runtime 不等于所有组件都自己写。模型、向量库、搜索和网页读取仍然可以用成熟服务。

## 迁移成本怎么估

评估托管平台时，可以问一个很具体的问题：如果三个月后要迁出，需要导出什么？

- prompt 和 policy；
- 工具 schema；
- 会话状态；
- 审批状态；
- trace 和工具调用记录；
- 评测样本和评分结果；
- 用户反馈；
- 文档索引和 metadata。

能导出不等于迁移容易，但不能导出就几乎不可治理。尤其是 trace、审批和 eval，一旦只存在平台内部，后续排错、复盘和模型替换都会受制于平台。

## 混合路线

常见的稳妥做法：

```text
自有业务状态
  -> 自有权限和工具网关
  -> 可替换模型和搜索服务
  -> 平台 trace 或自有 trace
  -> 自有评测集
```

把平台作为能力供应商，而不是让平台成为唯一控制面。

## 常见错误

| 错误 | 问题 |
| --- | --- |
| 为了快把权限放进平台黑盒 | 后续很难接企业权限体系 |
| 只评估 demo 效果 | 忽略状态、审计和迁移 |
| 自建等于全部自研 | 浪费在非核心能力上 |
| 平台 trace 不可导出 | 生产事故无法独立复盘 |
| 业务状态和模型状态混在一起 | 流程恢复和数据治理困难 |

托管平台适合加速交付，但不应该替代业务系统的核心控制边界。

## 最终判断

```text
短期验证：托管平台
标准场景：托管或 SaaS
强控制：自建 Runtime
高审计：自有状态和 trace
长期平台：自建控制层 + 外部能力
```

托管平台可以让你快，但自有 Runtime 决定你能不能长期改、查、迁和控。
