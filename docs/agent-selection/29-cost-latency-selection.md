---
title: 成本与延迟怎么纳入选型
description: 从模型路由、上下文预算、工具调用、搜索缓存、并发和观测角度判断 Agent 成本与延迟策略。
contentType: support
series: support
contentId: agent-selection-cost-latency
shortTitle: 成本延迟选型
summary: 成本和延迟是架构约束，应该在选型时进入模型、检索、搜索和工具设计。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 把成本和延迟纳入 Agent 技术选型
  - 判断哪些层会导致 token、工具和搜索成本膨胀
  - 设计预算、缓存、并发和降级策略
prerequisites:
  - 已了解模型路由选型
  - 已了解可观测性选型
recommendedNext:
  - /agent-selection/16-model-routing-selection
  - /agent-selection/30-fallback-strategy
  - /intermediate/32-performance-cost/
practiceLinks:
  - /practice/p18-model-routing/
  - /practice/p20-observability/
searchTags:
  - 成本控制
  - 延迟
  - Token 预算
  - 模型路由
  - 缓存
navigationLabel: 成本延迟选型
entryMode: bridge
roleDescription: 适合在 Agent 架构评审中评估成本、延迟、预算和性能风险时阅读。
---

<ChapterLearningGuide />

## 成本不是上线后再看

Agent 成本来自多层：

- 模型输入；
- 模型输出；
- 长上下文；
- rerank；
- 搜索 API；
- 网页读取；
- 工具调用；
- 重试和 fallback。

如果选型时不设预算，系统上线后通常会又慢又贵。

## 先画成本路径

一次 Agent 调用的成本路径可能是：

```text
router model
  -> embedding
  -> vector search
  -> rerank
  -> web search
  -> reader
  -> main model
  -> tool retry
  -> fallback model
```

如果只统计最终模型调用，会低估真实成本，也无法知道该优化哪一层。

## 成本与延迟表

| 层 | 成本风险 | 延迟风险 |
| --- | --- | --- |
| 模型 | 强模型滥用 | 推理慢 |
| 上下文 | 无效 token | 输入过长 |
| RAG | rerank 成本 | 多阶段检索 |
| Search | API 调用多 | 网页读取慢 |
| Tools | 重试和超时 | 外部系统慢 |
| Agent Loop | 循环次数不控 | 多轮串行 |

## 三类预算

| 预算 | 控制什么 |
| --- | --- |
| Token 预算 | 上下文、输出、工具结果 |
| Action 预算 | 搜索次数、网页读取数、工具调用数 |
| Time 预算 | 单步超时、总耗时、排队时间 |

只设 token 预算不够。研究型 Agent 往往贵在搜索和读取，工具型 Agent 往往慢在外部系统。

## 预算要绑定任务类型

不同任务应该有不同预算卡：

```text
simple_qa:
  max_tokens: low
  max_actions: 0
  max_time: 5s

research:
  max_searches: 5
  max_pages: 8
  max_time: 90s

tool_execution:
  max_tool_calls: 3
  max_retries: 1
  require_approval: high_risk
```

预算不应该只存在文档里。运行时要能读取预算，并在超过时降级、停止或请求用户确认。

## 设计策略

- 模型路由；
- prompt 和工具 schema 缓存；
- 检索 TopK 限制；
- 工具输出截断；
- 搜索结果缓存；
- 并发读取网页；
- 超时和重试上限；
- 会话预算。

优化不是只压 token。很多延迟来自串行工具和网页读取。

## 优化顺序

成本高或延迟高时，先定位是哪一层：

| 症状 | 先看 |
| --- | --- |
| token 高 | 上下文拼接、工具输出、长历史 |
| 首 token 慢 | 模型选择、输入长度、排队 |
| 总耗时长 | 串行工具、网页读取、重试 |
| 搜索贵 | 搜索次数、reader 次数、缓存 |
| RAG 慢 | TopK、rerank、向量库 filter |
| 多轮失控 | agent loop 上限和停止条件 |

不要一上来换便宜模型。很多系统贵，是因为把无用上下文、重复搜索和工具返回全文都塞进了主模型。

## 选型阶段怎么估算

不用精确到价格，也要估算数量级：

| 场景 | 估算项 |
| --- | --- |
| RAG 问答 | embedding、TopK、rerank、主模型 |
| 联网研究 | 搜索次数、读取网页数、综合轮数 |
| 工具执行 | 工具次数、超时、重试 |
| 代码修复 | 文件读取、编辑轮数、测试次数 |
| 多 Agent | 角色数、对话轮数、协调成本 |

如果估算不出来，说明架构边界还没清楚。

## 延迟要分用户感知

同样是 30 秒，用户感受不同：

| 场景 | 处理 |
| --- | --- |
| 普通问答 | 应该快速返回 |
| 联网研究 | 可以显示进度和来源 |
| 工具执行 | 需要状态、确认和结果通知 |
| 代码修复 | 可以异步执行并展示 diff |

选型时要决定哪些任务必须同步返回，哪些可以异步。复杂 Agent 如果强行同步阻塞，会让用户以为系统卡死。

## 预算边界

每类任务都应该有预算：

| 任务 | 预算 |
| --- | --- |
| 简单问答 | 低 token、低延迟 |
| 知识库问答 | 检索 + 中等模型 |
| 联网研究 | 搜索次数和网页数上限 |
| 工具执行 | 工具超时和重试上限 |
| 自动修复 | 测试次数和会话成本上限 |

超过预算时，要么降级，要么请求用户确认。

## 成本评审表

方案评审时至少写清：

| 项 | 问题 |
| --- | --- |
| 单次预算 | 一次请求最多花多少 token、工具和时间 |
| 会话预算 | 多轮累计如何限制 |
| 缓存策略 | 哪些搜索、读取、schema 可复用 |
| 路由策略 | 什么任务用强模型 |
| 降级策略 | 超预算后怎么处理 |
| 观测指标 | 怎么知道钱花在哪一层 |

没有预算的 Agent 方案，本质上还没有进入生产设计。

## 观测指标

至少记录：

- 每层耗时；
- 每层 token；
- 搜索和工具次数；
- fallback 次数；
- 缓存命中；
- 单次成本；
- 会话累计成本。

没有分层指标，就只能看到“慢”和“贵”，看不到原因。

## 最终判断

```text
简单任务：便宜模型
长上下文：先裁剪和检索
搜索慢：缓存和并发
工具慢：超时和降级
成本高：预算和路由
```

成本与延迟是选型的一部分，不是性能优化阶段才处理的尾巴。
