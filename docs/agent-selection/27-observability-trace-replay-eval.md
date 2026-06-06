---
title: Agent 可观测性怎么选
description: 从 Trace、Replay、Eval、日志、指标和告警判断 Agent 生产可观测性应该怎么设计。
contentType: support
series: support
contentId: agent-selection-observability-trace-replay-eval
shortTitle: 可观测性选型
summary: Agent 可观测性的核心是能解释、能回放、能评估，而不是只看最终回答。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 区分 Trace、Replay、Eval、指标和日志的作用
  - 判断不同阶段需要哪些可观测性能力
  - 设计能定位检索、搜索、工具和模型问题的记录结构
prerequisites:
  - 已了解组合方案
  - 已了解 POC 与评估标准
recommendedNext:
  - /agent-selection/29-cost-latency-selection
  - /agent-selection/30-fallback-strategy
  - /practice/p20-observability/
practiceLinks:
  - /practice/p20-observability/
  - /practice/p21-evaluation/
searchTags:
  - Agent 可观测性
  - Trace
  - Replay
  - Eval
  - 调试
navigationLabel: 可观测性选型
entryMode: bridge
roleDescription: 适合为生产 Agent 设计 trace、回放、评估和调试体系时阅读。
---

<ChapterLearningGuide />

## 只看最终答案不够

Agent 出错时，问题可能来自：

- 意图识别；
- 检索；
- 搜索；
- 工具调用；
- 模型生成；
- 状态路由；
- 权限过滤。

如果没有 trace，只能猜。

## 开发人员需要的不是“日志更多”

Agent 可观测性要回答四个问题：

```text
为什么这么做？
  -> 决策 trace

看到了什么？
  -> 上下文和来源 trace

调用了什么？
  -> 工具和参数 trace

结果如何？
  -> eval 和用户反馈
```

普通服务日志只能告诉你哪里报错；Agent trace 要告诉你为什么走到了那一步。

## 能力分层

| 能力 | 作用 |
| --- | --- |
| Trace | 记录每一步输入输出 |
| Replay | 用同一输入重放问题 |
| Eval | 用样本集持续评估 |
| Metrics | 看成本、延迟、成功率 |
| Logs | 排查系统错误 |
| Alerts | 发现异常和退化 |

这几类能力不要混成一个日志文件。

## Trace 数据模型

建议把一次 Agent 运行拆成这些 span：

| Span | 记录 |
| --- | --- |
| intent | 用户目标、分类结果、置信度 |
| retrieval | query、filter、chunks、scores |
| search | 搜索词、来源、时间、读取状态 |
| tool | 工具名、参数、结果、错误 |
| model | 模型、输入摘要、输出、usage |
| decision | 路由、fallback、审批原因 |
| final | 答案、引用、成本、延迟 |

span 粒度太粗，定位不了问题；粒度太细，又会增加存储和脱敏成本。

最小 trace schema 可以先这样写：

```text
run_id:
span_id:
parent_id:
span_type: intent / retrieval / search / tool / model / decision / final
start_time:
end_time:
input_summary:
output_summary:
error_type:
cost:
latency:
redaction_level:
```

先保存结构化摘要，再决定哪些原文需要短期受控保存。

## Trace 要能串起因果

一个好的 trace 不只是日志列表，而是能回答：

```text
用户目标是什么
  -> 系统选择了什么路径
  -> 看到了哪些资料
  -> 调用了哪些工具
  -> 为什么降级或拒绝
  -> 最终答案依据是什么
```

每个 span 都应该有 run id、parent id、时间、输入摘要、输出摘要和错误类型。否则排查时只能看到碎片，无法还原决策链路。

## Trace 应该记录什么

至少记录：

- 用户问题；
- 意图分类；
- 检索 query 和 filter；
- 召回 chunks；
- 搜索来源；
- 工具调用参数；
- 工具返回；
- 模型输入输出；
- fallback 原因；
- 最终引用。

敏感信息要脱敏，但不能把调试所需的结构全删掉。

## 脱敏不要破坏调试

可观测性和安全要一起设计。常见做法是保存两层信息：

| 信息 | 保存方式 |
| --- | --- |
| 原始敏感内容 | 受控存储、短保留期 |
| 调试摘要 | 脱敏、长期保留 |
| 文档引用 | 保存 ID、版本、权限范围 |
| 工具参数 | 敏感字段 hash 或 mask |
| 模型输入 | 保存结构和来源，不保存完整密文 |

如果把所有上下文都删掉，trace 失去调试价值；如果全部明文保存，又会变成新的泄露面。

## Replay 要可控

Replay 不是简单“再跑一遍”。要区分：

| Replay 类型 | 用途 |
| --- | --- |
| 固定输入重放 | 验证 prompt 或路由修复 |
| 固定检索结果重放 | 排除向量库漂移 |
| 固定工具结果重放 | 排除外部系统变化 |
| 全链路重放 | 验证当前生产行为 |

研究型 Agent 和搜索型 Agent 的结果会随时间变化。如果不保存当时来源，就无法复盘当时为什么答错。

## Replay 的价值

Replay 用来回答：

- 当时模型看到了什么；
- 哪个来源导致错误；
- 哪个工具返回异常；
- fallback 是否触发；
- 权限 filter 是否正确；
- 修复后同样样本是否通过。

没有 replay，线上事故只能靠截图和猜测复盘。

## 什么时候必须能 Replay

这些场景应该优先支持 replay：

- 用户投诉答案错误；
- 工具执行产生副作用；
- 权限或安全告警；
- 模型或检索版本变更；
- 线上质量突然下降；
- 高价值客户失败案例。

Replay 的目标不是复刻每一次随机输出，而是固定关键输入和外部结果，让团队能验证修复是否真的生效。

## Eval 要分层

| Eval | 样本 |
| --- | --- |
| RAG eval | query、期望 chunk、答案引用 |
| Tool eval | 用户目标、期望工具和参数 |
| Workflow eval | 状态路径和审批点 |
| Safety eval | 注入、越权、高风险动作 |
| Cost eval | token、工具次数、延迟上限 |

不要只评“最终答案像不像”。如果工具选错但答案编得通顺，最终答案评估会把问题掩盖掉。

最小 eval 样本可以先这样写：

```text
样本 ID：
用户问题：
期望路径：
期望工具和参数：
期望检索来源：
期望答案要点：
拒答条件：
权限要求：
成本上限：
延迟上限：
人工判定标准：
```

没有样本结构，eval 工具只是漂亮仪表盘。

## Eval 的位置

Eval 不是上线后才做。它应该从 POC 开始：

```text
POC 样本
  -> 回归样本
  -> 线上失败样本
  -> 定期评估
```

每次修 Prompt、换模型、改检索、换工具，都应该跑关键评测集。

## 观测能力分阶段建设

| 阶段 | 最小能力 |
| --- | --- |
| POC | 保存样本、最终答案、人工判断 |
| 内测 | trace 检索、工具、模型 span |
| 上线 | metrics、告警、成本延迟监控 |
| 生产迭代 | replay、回归 eval、失败样本沉淀 |

不要等系统出事故再补可观测性。没有早期样本和 trace，后面很难知道质量是提升还是退化。

## 最终判断

```text
调试问题：Trace
复盘事故：Replay
持续质量：Eval
成本延迟：Metrics
系统错误：Logs
生产异常：Alerts
```

Agent 可观测性不是锦上添花，它决定系统能不能长期维护。
