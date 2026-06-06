---
title: 模型路由怎么选
description: 判断小模型、大模型、长上下文模型、fallback 和预算策略应该如何组合。
contentType: support
series: support
contentId: agent-selection-model-routing
shortTitle: 模型路由选型
summary: 模型路由的目标是按任务复杂度、上下文需求、风险等级和预算选择合适模型。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 判断什么时候使用小模型、大模型或长上下文模型
  - 设计 fallback、预算和延迟策略
  - 避免把模型 ID 写死在业务代码里
prerequisites:
  - 了解模型调用和成本控制
  - 已阅读组合方案
recommendedNext:
  - /agent-selection/29-cost-latency-selection
  - /agent-selection/30-fallback-strategy
  - /practice/p18-model-routing/
practiceLinks:
  - /practice/p18-model-routing/
  - /practice/p20-observability/
searchTags:
  - 模型路由
  - fallback
  - 长上下文
  - 成本控制
  - 延迟
navigationLabel: 模型路由选型
entryMode: bridge
roleDescription: 适合设计多模型路由、成本控制和降级策略时阅读。
---

<ChapterLearningGuide />

## 不要硬编码模型

生产系统里，模型选择应该是策略，不应该散落在业务代码里。

```text
Task Classifier
  -> Model Tier
  -> Budget Check
  -> Fallback Chain
  -> Usage Log
```

模型路由不是为了永远选最强模型，而是为了让简单任务便宜、复杂任务可靠、失败时有兜底。

## 路由器输入输出

模型路由器不应该只接收一个 prompt 字符串。它至少需要这些输入：

```text
task_type
risk_level
context_tokens
tool_count
latency_budget
cost_budget
required_capabilities
```

输出也不应该只是 model id，而应该包含：

```text
primary_model
fallback_chain
max_output_tokens
timeout
reason
budget_policy
```

这样 trace 里才能解释“为什么这次用了强模型”“为什么降级了”“为什么限制输出长度”。

## 路由维度

| 维度 | 影响 |
| --- | --- |
| 任务复杂度 | 决定小模型还是大模型 |
| 上下文长度 | 决定是否需要长上下文 |
| 风险等级 | 决定是否需要更强推理和人工确认 |
| 延迟要求 | 决定是否允许多轮推理 |
| 成本预算 | 决定是否降级或截断 |
| 工具调用 | 决定是否需要更稳定的 tool use 能力 |

## 路由不是模型猜模型

第一版路由器可以先用规则，不必一开始就用模型判断所有事情：

```text
if task_type == "classify": fast
if risk_level == "high": strong + approval
if context_tokens > budget: compress first
if latency_budget < 2s: no multi-step research
```

模型路由本身也会出错。高风险、成本和权限相关决策最好由程序规则兜底，模型只提供辅助分类。

## 三层模型池

| 层 | 用途 | 典型任务 |
| --- | --- | --- |
| Fast / Cheap | 低成本、低延迟 | 分类、路由、格式化、短摘要 |
| Standard | 默认主力 | 普通问答、RAG 生成、工具参数生成 |
| Strong / Reasoning | 高质量和复杂推理 | 多步规划、代码分析、高风险决策 |

不要把模型层级和具体供应商型号绑死。型号会变化，路由策略应该保持稳定。

## 推荐策略

| 场景 | 推荐 |
| --- | --- |
| 分类、改写、抽取 | 小模型 |
| 普通问答和总结 | 中等模型 |
| 复杂推理和规划 | 强模型 |
| 长文档整体分析 | 长上下文模型或分块处理 |
| 高风险工具决策 | 强模型 + 人工确认 |
| 批处理任务 | 低成本模型 + 质量抽检 |

不要因为模型上下文长，就把所有资料都塞进去。长上下文解决容量问题，不解决噪声问题。

## 任务分类要可观测

路由结果应该进入 trace：

| 字段 | 用途 |
| --- | --- |
| task_type | 解释为什么选某层模型 |
| risk_level | 判断是否需要强模型和审批 |
| context_tokens | 判断是否超预算 |
| route_reason | 方便复盘错误路由 |
| fallback_reason | 解释质量或延迟变化 |
| cost_estimate | 控制会话预算 |

如果用户投诉“这次回答变差了”，trace 应该能看出是任务被错分、模型降级、上下文被裁剪，还是 provider fallback。

## 长上下文不是默认答案

遇到长输入时，优先级应该是：

```text
裁剪无关内容
  -> RAG 选择性注入
  -> 历史摘要
  -> 分块处理
  -> 长上下文模型
```

如果问题只需要文档里的两段证据，用长上下文全量塞入只会增加成本、延迟和注意力噪声。

## Fallback 设计

fallback 不是简单从贵到便宜。要按失败类型区分：

| 失败 | fallback |
| --- | --- |
| 速率限制 | 切同能力备选模型 |
| 临时不可用 | 切备用 provider 或低一级模型 |
| 上下文超限 | 压缩、裁剪、分块 |
| 输出不合规 | 重新约束格式或改用更稳模型 |
| 成本超限 | 降级模型或要求用户确认 |

所有 fallback 都要记录原因，否则后面无法判断质量下降来自哪里。

## 路由评估样本

模型路由要单独评估：

- 简单任务是否走 Fast；
- 复杂推理是否走 Strong；
- 高风险工具是否触发审批；
- 长输入是否先压缩或检索；
- 超预算是否降级；
- provider 失败是否切换到同级备选；
- fallback 后是否告知或记录质量变化。

路由错了，后面的模型再强也可能用错地方。

## 路由规则示例

| 条件 | 决策 |
| --- | --- |
| `task_type = classify` | Fast 模型 |
| `tool_count > 3` | Standard 起步，失败再 Strong |
| `risk_level = high` | Strong + 人工确认 |
| `context_tokens > budget` | 先压缩，不直接切长上下文 |
| `latency_budget < 2s` | 禁止多轮研究链路 |
| `cost_budget exceeded` | 降级或要求用户确认 |

规则不需要一开始很复杂，但要集中管理。散落在业务代码里的 `if model == ...` 很快会失控。

## 观测指标

模型路由至少记录：

- 使用模型；
- 输入和输出 token；
- 延迟；
- fallback 原因；
- 工具调用成功率；
- 用户重试或修正；
- 单次成本和会话成本。

没有这些记录，模型路由会变成不可解释的黑盒。

## 最终判断

```text
简单任务：小模型
复杂任务：强模型
长输入：先压缩和检索，再考虑长上下文
模型失败：fallback
成本失控：预算策略
高风险：人工确认
```

模型路由是生产 Agent 的基础设施，不是后期优化项。
