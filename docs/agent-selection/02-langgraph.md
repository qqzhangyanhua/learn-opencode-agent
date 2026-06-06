---
title: LangGraph 适合什么场景
description: 从状态图、多步骤执行、人机确认、恢复执行和审计角度判断什么时候应该使用 LangGraph。
contentType: support
series: support
contentId: agent-selection-langgraph
shortTitle: LangGraph 场景判断
summary: LangGraph 的价值是显式状态和可恢复流程，不是把简单问答包装成复杂图。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 理解 LangGraph 的状态机本质
  - 判断什么时候 LangGraph 是必要编排层
  - 识别把简单任务图化的过度设计
prerequisites:
  - 了解 Agent Framework 基础选型
  - 了解工具调用和 ReAct Loop
  - 了解多步骤任务执行
recommendedNext:
  - /agent-selection/03-rag-knowledge-selection
  - /agent-selection/05-composition-patterns
  - /agent-selection/06-selection-checklist
practiceLinks:
  - /practice/p10-react-loop/
  - /practice/p11-planning/
  - /practice/p28-human-in-loop/
searchTags:
  - LangGraph
  - 状态机
  - Human-in-the-Loop
  - Checkpoint
  - Agent 编排
navigationLabel: LangGraph 场景判断
entryMode: bridge
roleDescription: 适合判断长流程 Agent 是否需要显式状态图和可恢复执行时阅读。
---

<ChapterLearningGuide />

## LangGraph 的核心不是“更高级”

LangGraph 的价值可以压成一句话：

```text
显式状态 + 图结构 + 条件路由 + 持久化 + 恢复执行
```

它适合的不是所有 Agent，而是那些必须把过程摊开、记录、暂停、恢复和审计的 Agent。

## 什么时候值得用

| 场景 | 为什么 LangGraph 有价值 |
| --- | --- |
| 多阶段任务 | 每一步有明确输入、输出和状态变化 |
| 分支流程 | 不同观察结果进入不同节点 |
| 重试与修复 | 失败后回到指定节点，而不是重跑全部流程 |
| Human-in-the-Loop | 高风险操作前暂停，等待人工确认 |
| 长任务恢复 | 任务中断后从 checkpoint 继续 |
| 多 Agent 工作流 | 每个角色或阶段边界明确 |
| 审计和回放 | 能解释每一步为什么执行 |

典型任务：

```text
plan -> search -> inspect -> edit -> test -> fix -> review -> deliver
```

这种流程如果用一段 Prompt 硬撑，迟早会丢状态、重复动作或跳过关键步骤。

## 什么时候别用

| 场景 | 更简单的选择 |
| --- | --- |
| 单轮问答 | 普通模型调用 |
| 搜索后总结 | Search + LLM |
| 固定知识库问答 | RAG pipeline |
| 少量工具调用 | 手写 tool loop |
| 没有状态 schema | 先设计数据结构 |
| 团队没有 trace 和测试 | 先补可观测性 |

如果你画不出状态图，就别用图框架。图不是装饰，它是系统的数据结构。

## 判断标准

问五个问题：

1. 任务是否会分支？
2. 中间状态是否必须保存？
3. 失败后是否要从某一步恢复？
4. 是否需要人工确认？
5. 是否需要回放和审计？

如果只有一个问题是“是”，不一定要用 LangGraph。至少三个是“是”，LangGraph 才开始有明显收益。

## 一个适合 LangGraph 的例子

代码修复 Agent 通常适合状态图，因为它天然有多阶段和恢复点：

```text
collect_context
  -> propose_patch
  -> apply_patch
  -> run_tests
  -> fix_or_review
  -> final_response
```

如果 `run_tests` 失败，流程应该回到 `fix_or_review`，而不是从头搜索一次。每一步都要记录输入、输出、错误和重试次数，这样才能回放为什么改了某个文件。

这种流程的核心不是节点多，而是状态有生命周期：计划、补丁、测试结果和最终回复都必须被保存。

## LangGraph 和 LangChain 的区别

| 维度 | LangChain | LangGraph |
| --- | --- | --- |
| 核心定位 | 集成模型、工具、链和 agent | 状态图与流程编排 |
| 控制流 | 更偏线性或 agent loop | 显式节点、边、条件路由 |
| 状态 | 可以有，但不是核心表达 | 状态是核心数据结构 |
| 恢复执行 | 需要额外设计 | 更适合 checkpoint 和恢复 |
| 适用任务 | 原型、工具集成、中等复杂 Agent | 长流程、可审计、可恢复 Agent |

## 最小状态设计

LangGraph 项目真正难的不是画图，而是定义状态。

状态里应该放：

- 用户目标；
- 当前计划；
- 工具调用结果；
- 检索和搜索来源；
- 人工确认结果；
- 错误和重试次数；
- 最终输出和引用。

状态里不应该放：

- 无边界的原始上下文；
- 不可序列化对象；
- 只为某个节点临时存在的数据；
- 没有生命周期的调试字段。

## 状态 schema 常见错误

| 错误 | 后果 |
| --- | --- |
| 把所有上下文塞进一个 messages | 节点边界失效，难以恢复 |
| 状态字段没有 owner | 不知道哪个节点能修改 |
| 错误只存自然语言 | 无法结构化重试和降级 |
| checkpoint 不含工具结果 | 回放时必须重新调用外部系统 |
| 审批结果不入状态 | 恢复执行时无法判断是否批准 |

状态 schema 一旦混乱，LangGraph 只会把混乱显式化。先设计数据，再画图。

## 工程建议

| 建议 | 原因 |
| --- | --- |
| 先画状态流，再写节点 | 数据结构错了，图只会放大错误 |
| 节点只做一件事 | 节点太大，图就失去意义 |
| 每个节点记录输入输出 | 方便回放和评估 |
| 高风险工具前加人工确认 | 不要让模型直接执行危险动作 |
| 每个分支都写测试样例 | 图最容易在边界分支出错 |

## 最后判断

LangGraph 不是默认选择。它是当系统复杂到必须显式管理状态时，才值得引入的工具。

```text
简单任务：别用
固定流程：谨慎用
长流程 + 分支 + 恢复 + 审计：值得用
```

如果判断下来还不需要 LangGraph，下一步应该回到知识来源和实时性判断：内部稳定知识看 [RAG 选型](/agent-selection/03-rag-knowledge-selection)，外部实时信息看 [搜索工具选型](/agent-selection/04-search-tools)。
