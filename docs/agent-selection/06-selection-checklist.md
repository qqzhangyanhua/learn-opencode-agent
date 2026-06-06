---
title: 选型检查表
description: 用任务类型、知识来源、实时性、状态复杂度、权限、引用、成本和可观测性检查 Agent 技术栈是否选对。
contentType: support
series: support
contentId: agent-selection-checklist
shortTitle: 选型检查表
summary: 在方案评审前，用检查表判断应该选择轻量模型调用、RAG、搜索工具、Agent Framework 还是组合方案。
difficulty: intermediate
estimatedTime: 20 分钟
learningGoals:
  - 使用检查表判断 Agent 技术栈是否过度设计
  - 按场景快速选择 RAG、Search、Agent Framework 或组合方案
  - 识别上线前必须具备的权限、引用、审计和降级能力
prerequisites:
  - 已阅读智能体选型总览
  - 已了解 Agent 框架、RAG 和搜索工具边界
  - 已了解组合方案
recommendedNext:
  - /agent-selection/07-scenario-playbook
  - /agent-selection/08-poc-evaluation
  - /agent-selection/09-build-vs-buy
  - /practice/p18-model-routing/
practiceLinks:
  - /practice/p18-model-routing/
  - /practice/p19-security/
  - /practice/p20-observability/
  - /practice/p21-evaluation/
searchTags:
  - 选型检查表
  - Agent Framework
  - RAG
  - Search
  - 工程评审
navigationLabel: 选型检查表
entryMode: bridge
roleDescription: 适合在 Agent 项目方案评审、技术选型收口和上线前检查时使用。
---

<ChapterLearningGuide />

## 一句话判断

```text
知识稳定且私有：RAG
信息实时且外部：Search
任务多步且要行动：Agent Framework
三者都需要：分层组合
都不需要：普通模型调用
```

## 使用方式

这张检查表不是为了证明方案复杂，而是为了删掉不必要的层。使用时按顺序做三步：

1. 先判断任务类型；
2. 再判断知识来源；
3. 最后才判断是否需要状态、工具、审计和降级。

如果前两步已经能解决问题，后面的 Agent Framework、多 Agent、长流程编排都先不要加。

## 第一组：任务类型

| 问题 | 如果答案是“是” | 推荐方向 |
| --- | --- | --- |
| 只是分类、总结、改写、抽取吗 | 是 | 普通模型调用 |
| 只是固定知识库问答吗 | 是 | RAG pipeline |
| 只是查最新资料并总结吗 | 是 | Search + LLM |
| 需要调用工具执行动作吗 | 是 | Agent + Tools |
| 需要多步计划、观察、重试吗 | 是 | Agent Framework |
| 需要多个角色分工吗 | 是 | 先验证单 Agent，不够再多 Agent |

## 第二组：知识来源

| 问题 | 推荐 |
| --- | --- |
| 数据来自内部文档、代码库、制度 | RAG |
| 数据来自公开网页、最新文档、新闻 | Search |
| 数据来自用户当前输入 | 普通上下文即可 |
| 数据既有内部知识又有外部实时信息 | RAG + Search |
| 数据涉及权限隔离 | 检索前过滤 |
| 数据需要引用和审计 | 保留 source、chunk、version |

## 第三组：控制流复杂度

| 问题 | 是否需要 Agent Framework |
| --- | --- |
| 是否会分支 | 可能需要 |
| 是否会循环重试 | 可能需要 |
| 是否要暂停等待人工确认 | 需要 |
| 是否要失败后恢复执行 | 需要 |
| 是否要回放每一步 | 需要 |
| 是否只是线性 pipeline | 通常不需要 |

## 第三组补充：行动风险

只要系统会执行动作，就继续问：

| 问题 | 要求 |
| --- | --- |
| 是否修改外部系统 | 工具权限和审计 |
| 是否影响用户、资金、权限 | 人工确认 |
| 是否可能重复执行 | 幂等键和状态查询 |
| 是否需要回滚 | 回滚策略或人工兜底 |
| 是否能解释执行依据 | 引用、计划和审批记录 |

回答型系统和行动型系统的风险不同。只要进入行动，就不能只按问答质量评审。

## 第四组：RAG 上线检查

上线前至少确认：

- 文档解析是否稳定；
- chunk 是否按语义结构切；
- metadata 是否包含 source、version、owner、acl；
- 是否需要 hybrid retrieval；
- 是否需要 rerank；
- 权限过滤是否在检索前完成；
- 答案是否有引用；
- 是否有固定评测集；
- 文档更新和删除是否会反映到索引；
- 是否记录 query、召回、重排、生成输出。

缺任意三项，先别谈“生产 RAG”。

## 第五组：搜索上线检查

上线前至少确认：

- 是否限制可信来源；
- 是否支持时间范围；
- 是否读取网页正文；
- 是否去重；
- 是否检测来源冲突；
- 是否输出引用；
- 是否缓存搜索结果；
- 搜索失败时是否降级；
- 是否记录 query、来源和最终答案。

搜索不是可信度系统。可信度要自己设计。

## 第六组：Agent Framework 上线检查

上线前至少确认：

- 状态 schema 是否清楚；
- 每个节点是否只做一件事；
- 工具错误是否规范化；
- 高风险工具是否需要人工确认；
- 每一步是否可 trace；
- 是否有停止条件；
- 是否能重试或恢复；
- 是否有测试覆盖关键分支；
- 是否能降级为轻量流程。

如果状态说不清，框架越强，系统越乱。

## 第七组：生产工程检查

上线前还要确认：

- 是否有 trace；
- 是否能 replay 关键失败；
- 是否有固定 eval；
- 是否有成本和延迟预算；
- 是否有 fallback；
- 是否有人工兜底；
- 是否有供应商锁定评估；
- 是否有数据删除和日志保留策略。

这些不是优化项，而是生产 Agent 的基本治理能力。

## 场景推荐表

| 场景 | 推荐组合 |
| --- | --- |
| FAQ 问答 | RAG + Citation |
| 企业知识库 | RAG + Permission Filter + Evaluation |
| 代码库助手 | Code-aware RAG + Tools + Trace |
| 最新技术研究 | Search + Reader + Source Verification |
| 自动修 Bug | Agent Framework + Tools + Tests + Human Approval |
| 企业 Copilot | Intent Router + RAG + Tools + Audit |
| 多 Agent 协作 | 先单 Agent，确认职责分裂后再多 Agent |
| 简单内容生成 | LLM only |

## 最终收口

技术选型不是比谁先进，而是比谁能稳定解决当前问题。

好的方案应该能说清楚：

- 为什么需要这一层；
- 这一层输入输出是什么；
- 出错后怎么定位；
- 成本和延迟怎么控制；
- 不用它会坏在哪里；
- 未来怎么降级或迁移。

如果这些说不清，先删掉一层复杂度。

如果检查表已经能收口技术组合，下一步可以看 [场景选型手册](/agent-selection/07-scenario-playbook) 对照业务场景，再用 [POC 与评估标准](/agent-selection/08-poc-evaluation) 定义验证范围。
