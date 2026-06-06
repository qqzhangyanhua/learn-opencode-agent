---
title: 组合方案
description: 说明 LLM only、Search-only、RAG-only、Agent + Tools、Agent + RAG、Agent + Search、Agent + RAG + Search 等组合怎么选。
contentType: support
series: support
contentId: agent-selection-composition-patterns
shortTitle: 组合方案
summary: 真实系统通常不是三选一，而是按控制流、知识来源、实时性和运维约束进行分层组合。
difficulty: advanced
estimatedTime: 30 分钟
learningGoals:
  - 掌握 Agent Framework、RAG、Search Tools 的常见组合模式
  - 判断不同业务场景应该使用轻量方案还是完整 Agent 技术栈
  - 理解组合方案中的成本、延迟、权限和可观测性取舍
prerequisites:
  - 已了解 Agent 框架选型
  - 已了解 RAG 选型
  - 已了解搜索工具选型
recommendedNext:
  - /agent-selection/06-selection-checklist
  - /practice/p18-model-routing/
  - /practice/p20-observability/
practiceLinks:
  - /practice/p09-hybrid-retrieval/
  - /practice/p14-mcp/
  - /practice/p18-model-routing/
  - /practice/p20-observability/
searchTags:
  - Agent 技术栈
  - RAG
  - Search
  - Tool Calling
  - 组合方案
navigationLabel: 组合方案
entryMode: bridge
roleDescription: 适合把框架、RAG、搜索、工具和审计组合成完整系统前阅读。
---

<ChapterLearningGuide />

## 不要把所有东西都接上

真实系统不是能力越多越好。每接一层能力，都会增加成本、延迟和失败点。

```text
普通 LLM 调用
  -> Search-only
  -> RAG-only
  -> Agent + Tools
  -> Agent + RAG
  -> Agent + Search
  -> Agent + RAG + Search
  -> 多 Agent + RAG + Search + Human-in-the-Loop
```

从轻到重演进，而不是一步到位。

## 先分清三条线

组合方案要先分清三条线：

| 线 | 解决什么 | 常见误区 |
| --- | --- | --- |
| 知识线 | 模型看什么资料 | 把 Search 和 RAG 混成一个来源 |
| 控制线 | 谁决定下一步 | 把所有分支塞进 Prompt |
| 执行线 | 谁调用工具 | 让模型绕过权限和审计 |

RAG 和 Search 是上下文来源，Agent Framework 是控制流，Tools 是执行能力。三者不是同一层，不能互相替代。

## LLM only

适合：

- 分类；
- 总结；
- 改写；
- 结构化抽取；
- 输入上下文已经足够的问题。

不要接 RAG 或搜索来解决不存在的信息缺口。没有外部知识需求，就不要增加外部知识层。

## Search-only

适合：

- 查最新官方文档；
- 查版本变化；
- 查开放网页事实；
- 做轻量研究总结。

典型链路：

```text
用户问题 -> 查询改写 -> 搜索 -> 来源筛选 -> 读取正文 -> 总结并引用
```

风险：来源质量、结果漂移、引用不稳定。

## RAG-only

适合：

- 企业知识库；
- 产品文档问答；
- 代码库检索；
- 制度和流程问答；
- 需要权限过滤和引用溯源的问题。

典型链路：

```text
用户问题 -> 检索内部知识库 -> rerank -> 组装上下文 -> 回答 + 引用
```

风险：chunk 错、metadata 缺失、权限过滤后置、索引漂移。

## 什么时候该升级组合

升级组合要基于明确失败：

| 当前方案 | 失败现象 | 升级 |
| --- | --- | --- |
| LLM only | 缺内部资料 | RAG |
| LLM only | 缺最新外部信息 | Search |
| RAG-only | 需要执行动作 | Agent + Tools |
| Search-only | 需要内部权限知识 | RAG + Search |
| Agent + Tools | 动作需要知识依据 | Agent + RAG |
| 轻量 loop | 需要暂停恢复 | Workflow / LangGraph |

不要因为“以后可能需要”提前组合所有能力。先让当前失败样本证明下一层确实必要。

## Agent + Tools

适合：

- 需要执行动作；
- 需要调用多个系统；
- 需要根据工具结果继续决策；
- 需要失败重试和人工确认。

典型链路：

```text
用户目标 -> Agent 计划 -> 工具调用 -> 观察结果 -> 下一步行动 -> 输出
```

如果没有“行动”，只是“回答”，通常不需要 Agent Framework。

## Agent + RAG

适合：

- 企业 Copilot；
- 代码库助手；
- 内部流程助手；
- 需要边查内部知识边执行工具的系统。

关键设计：

- RAG 只负责知识；
- Agent 负责判断何时检索、如何使用结果、是否继续调用工具；
- 权限过滤必须在检索前完成；
- 检索结果要进入 trace。

## Agent + Search

适合：

- 联网研究 Agent；
- 最新技术资料分析；
- 竞品或市场资料收集；
- 需要多来源验证的开放世界任务。

关键设计：

- Agent 负责拆查询和验证来源；
- Search 负责候选来源；
- Reader 负责正文抽取；
- Synthesizer 负责合并冲突和引用输出。

## Agent + RAG + Search

适合：

- 同时依赖内部知识和外部实时信息；
- 需要行动、检索、搜索、验证、引用；
- 需要审计和恢复的复杂系统。

典型链路：

```text
用户目标
  -> Agent 拆解任务
  -> RAG 查内部知识
  -> Search 查外部实时资料
  -> 工具执行
  -> 冲突检测
  -> 人工确认
  -> 输出和引用
```

这是重方案。只有当业务真的需要，才值得上。

## 重方案的失败路径

`Agent + RAG + Search + Tools` 最常见的问题不是单点能力不够，而是边界混乱：

- 内部资料和外部网页冲突时没有优先级；
- 工具执行没有绑定引用依据；
- 搜索失败后仍然输出确定结论；
- RAG 权限和工具权限分开设计，导致越权；
- trace 只记录最终答案，看不到哪一层错了；
- 成本和延迟来自多层串行调用，却没有预算。

重方案上线前必须先定义每一层失败时怎么降级，否则系统会在异常场景里不可控。

## 企业级组合

企业 Agent 通常需要：

```text
Intent Router
  -> Permission Check
  -> RAG / Search / Tool Router
  -> Agent Workflow
  -> Human Approval
  -> Audit Log
  -> Evaluation
```

这里最重要的是边界，而不是框架名。

| 层 | 责任 |
| --- | --- |
| Intent Router | 判断任务类型和风险等级 |
| Permission Check | 判断用户能看什么、能做什么 |
| RAG | 提供内部知识和引用 |
| Search | 提供实时外部信息 |
| Tools | 执行业务动作 |
| Agent Workflow | 管理状态、分支、恢复和确认 |
| Audit | 记录每一步输入输出 |
| Evaluation | 持续评估质量和成本 |

## 组合原则

- 能不用 Agent，就不用 Agent。
- 能不用搜索，就不用搜索。
- 能不用多 Agent，就不用多 Agent。
- RAG 和 Search 要分层，不要混成一个来源。
- 工具执行要有权限和审计。
- 每一层都要能单独测试和降级。

## 组合评审表

评审时逐层写清：

| 层 | 是否需要 | 不用会怎样 | 失败怎么处理 |
| --- | --- | --- | --- |
| RAG | 是/否 | 缺内部知识 | 拒答或转人工 |
| Search | 是/否 | 无法确认实时信息 | 使用缓存并标注时间 |
| Tools | 是/否 | 无法执行动作 | 提供人工操作指引 |
| Workflow | 是/否 | 无法恢复长流程 | 降级为单轮确认 |
| Human Approval | 是/否 | 高风险动作不可控 | 阻断执行 |

如果某一层写不出“不用会怎样”，它大概率不是第一版必需能力。

方案定下来之前，最后用 [选型检查表](/agent-selection/06-selection-checklist) 逐项确认任务类型、知识来源、权限、引用、成本和可观测性。
