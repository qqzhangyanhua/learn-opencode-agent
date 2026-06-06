---
title: Agent 可观测性和评估工具怎么选
description: 对比 LangSmith、Langfuse、Arize Phoenix、Helicone、OpenTelemetry、Braintrust、Ragas、DeepEval、promptfoo 和自研评估体系的适用场景。
contentType: support
series: support
contentId: agent-selection-observability-evaluation-tools
shortTitle: 观测评估工具选型
summary: Agent 生产化不能只看最终答案；Trace、Replay、Eval、成本、延迟、工具调用和权限失败都要进入可观测和评估闭环。
difficulty: advanced
estimatedTime: 30 分钟
learningGoals:
  - 区分 Trace、Monitoring、Replay、RAG Eval、Prompt Regression 和 LLM Judge 的边界
  - 判断 LangSmith、Langfuse、Phoenix、Helicone、Braintrust、Ragas、DeepEval、promptfoo 等工具适合什么场景
  - 建立生产 Agent 的最小观测和评估组合
prerequisites:
  - 已了解 Agent 可观测性选型
  - 已了解 RAG 和工具调用基础
recommendedNext:
  - /agent-selection/27-observability-trace-replay-eval
  - /agent-selection/08-poc-evaluation
  - /agent-selection/30-fallback-strategy
practiceLinks:
  - /practice/p20-observability/
  - /practice/p21-evaluation/
searchTags:
  - Observability
  - Evaluation
  - LangSmith
  - Langfuse
  - Ragas
  - promptfoo
navigationLabel: 观测评估工具选型
entryMode: bridge
roleDescription: 适合为生产 Agent、RAG 系统、工具执行 Agent 和模型路由系统选择 trace、eval、monitoring 工具时阅读。
---

<ChapterLearningGuide />

> 说明：本文是截至 2026-06 的选型图谱，不是实时排名。产品能力、托管区域、价格、开源协议和集成方式会变化，采购或上线前请以官方文档、价格页、版本说明和业务样本评测为准。

## 阅读定位

这篇是可观测和评估工具图谱，重点比较 LangSmith、Langfuse、Phoenix、Helicone、Braintrust、Ragas、DeepEval、promptfoo、OpenTelemetry 等工具。如果你还没设计 trace span、replay 策略、eval 样本和生产指标，先看 [Agent 可观测性怎么选](/agent-selection/27-observability-trace-replay-eval)。

## 这个类别解决什么

Agent 可观测性和评估工具解决的是：系统出错后你能不能知道错在哪里，以及上线前后你能不能证明质量没有退化。

至少要拆成五层：

```text
Trace
  -> 一次请求的模型、工具、检索、重排、生成链路

Replay
  -> 用同一输入和上下文复现一次失败

Evaluation
  -> 用固定样本集评估质量

Monitoring
  -> 线上延迟、成本、错误率、fallback、用户反馈

Audit
  -> 谁访问了什么、调用了什么工具、是否越权
```

只看最终答案是不够的。最终答案错了，你不知道是检索错、排序错、工具错、模型错，还是权限错。

## 主流选择有哪些

| 方案 | 本质 | 强项 | 代价 | 适合场景 | 不适合场景 |
| --- | --- | --- | --- | --- | --- |
| LangSmith | LLM 应用 trace / eval 平台 | 和 LangChain / LangGraph 集成强，trace、dataset、eval 体系完整 | 生态绑定和平台成本要评估 | LangChain / LangGraph 项目、Agent trace、评估集管理 | 完全自研栈且不想绑定平台 |
| Langfuse | 开源 LLM observability 平台 | Trace、prompt、eval、成本观测，自托管友好 | 需要部署和治理 | 自托管观测、企业 LLM 应用、成本和 trace 监控 | 只需要简单 API 网关日志 |
| Arize Phoenix | 开源 observability / eval | RAG eval、embedding、trace 分析友好 | 要接入和维护 | RAG 质量分析、实验和本地观测 | 只想看 billing 和 token |
| Helicone | LLM Gateway / observability | API 请求、成本、延迟、缓存、用户维度观测 | 更偏网关和请求层 | 多模型 API 监控、成本和延迟分析 | 深层 Agent 状态图 debug |
| OpenTelemetry | 标准化 trace / metrics / logs | 企业统一观测体系，跨服务 | 需要自定义 span schema | 企业已有可观测平台、Agent 进入统一 trace | 想开箱即用 LLM eval |
| Braintrust | Eval 和实验平台 | 数据集、实验、评估、回归测试 | 平台成本和流程接入 | Prompt/模型/Agent 版本评估 | 只需要线上 trace |
| Ragas | RAG 评估框架 | faithfulness、context precision、answer relevance 等 RAG 指标 | 指标要结合业务解释，不能盲信 | RAG 离线评估、POC、回归测试 | 工具执行 Agent 评估 |
| DeepEval | LLM 应用测试框架 | 单元测试式 eval、LLM judge、CI 集成 | judge 质量和稳定性要校准 | 自动化评测、CI 回归、Agent 输出测试 | 只看线上监控 |
| promptfoo | Prompt / 模型回归测试 | 配置化测试、多模型对比、CI 友好 | 深层 trace 不是重点 | Prompt 回归、多 provider 对比、红队样本 | 生产 trace 和 replay |
| 自研 trace + eval | 自定义 schema 和评估闭环 | 完全贴合业务，权限和审计可控 | 开发和维护成本高 | 强合规、复杂工具链、企业核心 Agent | 小团队快速原型 |

## 先分清你要观测什么

| 目标 | 优先工具方向 | 不要先做什么 |
| --- | --- | --- |
| 看 token、成本、延迟 | Helicone / Langfuse / 自研网关日志 | 不要先做复杂 eval |
| 看 Agent 每一步做了什么 | LangSmith / Langfuse / OpenTelemetry | 不要只存最终答案 |
| 看 RAG 检索质量 | Phoenix / Ragas / 自研检索评测 | 不要只看生成答案 |
| 做 prompt 回归测试 | promptfoo / Braintrust / DeepEval | 不要靠人工随便试几条 |
| 做生产审计 | OpenTelemetry / 自研 audit log | 不要把敏感 trace 原样外发 |
| 做 LangGraph debug | LangSmith | 不要只打印日志 |

## Trace 工具什么时候用

Trace 工具要记录一次请求的因果链：

```text
user input
  -> route
  -> retrieval
  -> rerank
  -> model call
  -> tool call
  -> approval
  -> final answer
```

至少记录：

- model；
- prompt version；
- input token / output token；
- retriever query；
- retrieved chunk IDs；
- rerank 前后排名；
- tool name；
- tool args；
- tool result summary；
- latency；
- cost；
- stop reason；
- fallback reason。

不记录这些，失败后只能猜。

## RAG Eval 工具什么时候用

RAG 评估必须分层。

| 层 | 指标 | 说明 |
| --- | --- | --- |
| Retrieval | Recall@K、MRR、nDCG | 正确 chunk 是否召回并排前面 |
| Context | Context Precision、Context Relevance | 放进上下文的内容是否有用 |
| Generation | Faithfulness、Answer Relevance | 答案是否基于上下文 |
| Citation | Citation Accuracy | 引用是否支持答案 |
| Permission | Violation Rate | 是否召回或输出无权内容 |

Ragas、Phoenix、DeepEval 可以帮助做这些评估，但指标不是结论。企业 RAG 最后仍然要有业务样本和人工校准。

## Prompt Regression 什么时候用

Prompt Regression 适合防止版本升级后质量回退。

适合：

- prompt 改动频繁；
- 多模型对比；
- 模型升级；
- provider 切换；
- guardrail 样本回归；
- RAG query rewrite 回归。

常见工具：

- promptfoo；
- Braintrust；
- DeepEval；
- 自研 YAML / JSON 样本集。

关键不是工具，而是样本集。没有样本，eval 平台只是漂亮 UI。

## Monitoring 什么时候用

线上监控要看趋势，不是只看单次 trace。

至少监控：

- P50 / P95 / P99 延迟；
- 单次请求成本；
- 模型调用成功率；
- 工具调用成功率；
- 检索无结果率；
- fallback 触发率；
- 人工确认率；
- 拒答率；
- 用户反馈；
- 权限拦截次数。

如果成本上涨、延迟上涨、fallback 上涨，但最终答案看起来还行，系统已经在退化。

## 怎么选

```text
LangChain / LangGraph 项目？
  -> LangSmith 优先评估

想自托管 LLM observability？
  -> Langfuse / Phoenix

主要看 API 成本和延迟？
  -> Helicone / Langfuse / 自研网关日志

重点是 RAG 评估？
  -> Ragas / Phoenix / DeepEval + 自研样本集

重点是 Prompt 回归测试？
  -> promptfoo / Braintrust / DeepEval

企业已有统一观测平台？
  -> OpenTelemetry + 自研 span schema

强合规和权限审计？
  -> 自研 audit log，不要只依赖第三方 trace 平台
```

## 观测评估选型记录模板

```text
项目类型：RAG / 工具执行 Agent / LangGraph / 多模型网关 / 高风险流程
必须观测：trace / replay / eval / monitoring / audit
数据能否外发：
是否需要自托管：
是否已有 OpenTelemetry：
是否需要 CI eval：
是否需要 prompt 回归：
是否需要 RAG 指标：
是否需要成本和延迟看板：
候选工具：
选择理由：
不选的工具：
生产缺口：
```

工具选择必须落到数据边界、样本集和集成成本，不能只看仪表盘截图。

## 典型误判

| 误判 | 问题 |
| --- | --- |
| 有日志就等于可观测 | 日志没有因果链，debug 仍然靠猜 |
| 有 trace 就等于有 eval | trace 解释单次请求，eval 衡量样本集质量 |
| LLM judge 分数就是质量 | judge 要校准，不能替代业务验收 |
| RAG eval 只看最终答案 | 检索、排序、引用、权限要分开评估 |
| 第三方 trace 可直接存敏感上下文 | 企业场景要脱敏、采样和权限控制 |
| prompt 改完人工试几条就上线 | 没有回归样本，迟早引入退化 |

## 最小推荐

| 阶段 | 推荐 |
| --- | --- |
| POC | 固定样本集 + 手工 trace 表 + promptfoo / DeepEval |
| RAG 原型 | Ragas / Phoenix + retrieval trace |
| LangGraph 项目 | LangSmith |
| 自托管生产 | Langfuse / Phoenix + 自研审计 |
| 多模型网关 | Helicone / Langfuse / 自研 gateway metrics |
| 企业核心系统 | OpenTelemetry + 自研 span schema + audit log |
| 高风险 Agent | Trace + Replay + Eval + Approval audit 全部必须有 |

## 最终判断

```text
看链路：Trace
复现失败：Replay
防止退化：Eval
看线上趋势：Monitoring
查责任：Audit
RAG 质量：Retrieval + Generation 分层评估
```

生产 Agent 没有观测和评估，就是黑盒。黑盒不能上线高风险场景。
