---
title: Agent 降级策略怎么设计
description: 判断模型、检索、搜索、工具、Agent Workflow 和人工兜底各层失败时应该如何降级。
contentType: support
series: support
contentId: agent-selection-fallback-strategy
shortTitle: 降级策略设计
summary: Agent 降级不是简单重试，而是按失败层定位并选择可解释的替代路径。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 设计模型、检索、搜索、工具和流程层的降级策略
  - 区分重试、替换、缓存、拒答和转人工
  - 避免失败后悄悄输出低可信答案
prerequisites:
  - 已了解模型路由和可观测性
  - 已了解组合方案
recommendedNext:
  - /agent-selection/27-observability-trace-replay-eval
  - /agent-selection/29-cost-latency-selection
  - /practice/p20-observability/
practiceLinks:
  - /practice/p18-model-routing/
  - /practice/p20-observability/
searchTags:
  - Agent 降级
  - fallback
  - 重试
  - 转人工
  - 高可用
navigationLabel: 降级策略设计
entryMode: bridge
roleDescription: 适合设计生产 Agent 的失败处理、fallback、拒答和人工兜底策略时阅读。
---

<ChapterLearningGuide />

## 降级先分层

Agent 失败不是一种失败：

```text
Model failed
Retrieval failed
Search failed
Tool failed
Workflow failed
Permission denied
Confidence low
```

不同失败应该有不同降级，不要全部重试。

## 先定义错误分类

降级策略依赖结构化错误：

| 错误类型 | 示例 | 是否重试 |
| --- | --- | --- |
| transient | 网络抖动、临时 5xx | 可以 |
| rate_limit | 速率限制 | 等待或切模型 |
| invalid_input | 参数缺失、格式错 | 让用户补充或修参数 |
| permission_denied | 无权访问 | 不重试 |
| not_found | 知识或记录不存在 | 不盲目重试 |
| unsafe_action | 高风险动作 | 暂停确认 |

如果工具只返回一段自然语言错误，Agent 很难做正确降级。

## 降级表

| 失败层 | 降级 |
| --- | --- |
| 模型不可用 | 同级备选模型或低一级模型 |
| 上下文超限 | 压缩、裁剪、分块 |
| RAG 无结果 | 明确拒答或扩大检索范围 |
| Search 失败 | 使用缓存或说明无法确认实时信息 |
| Tool 超时 | 重试、排队或人工处理 |
| 权限不足 | 明确拒绝 |
| 高风险动作 | 暂停确认 |
| 低置信度 | 转人工或要求补充信息 |

## 错误返回要结构化

工具和检索组件应该返回结构化错误，而不是只返回一句话：

```text
error_type: rate_limit
retryable: true
retry_after: 30s
safe_to_fallback: true
user_visible_message: 当前服务繁忙，可以稍后重试
```

有了这些字段，Agent 才能判断是重试、切模型、要求补充信息，还是直接拒绝。没有结构化错误，降级逻辑只能靠模型猜。

## 降级链要保持语义一致

比如模型 fallback：

```text
primary strong model
  -> same-tier backup
  -> cheaper model with shorter answer
  -> ask user to continue with reduced quality
```

不要从复杂推理任务直接降到只适合分类的小模型，然后输出同样自信的结论。

## 一个 RAG 降级案例

用户问“最新报销制度里差旅补贴是多少”。系统流程应该是：

```text
RAG 检索
  -> 无结果
  -> 扩大 query，但保持权限 filter
  -> 仍无结果
  -> 告知资料不足，建议人工确认
```

错误做法是直接让模型凭常识回答一个金额。资料缺失时，正确降级是拒答或转人工，不是降低标准继续生成。

## 重试不是万能

适合重试：

- 临时网络错误；
- 速率限制后等待；
- 工具短暂不可用；
- 格式输出不合规。

不适合重试：

- 权限不足；
- 资料不存在；
- 用户意图不清；
- SQL 权限越界；
- 高风险操作未确认。

错误类型必须结构化，否则无法判断是否重试。

## Tool 失败要区分副作用

工具失败时要先判断有没有产生副作用：

| 情况 | 处理 |
| --- | --- |
| 请求未发出 | 可以安全重试 |
| 请求超时但状态未知 | 查询状态或人工处理 |
| 已执行但回执失败 | 不要重复执行，先查结果 |
| 执行失败且可回滚 | 记录并回滚 |
| 高风险动作失败 | 暂停，等待人工确认 |

支付、发送、删除、发布这类动作尤其不能盲目重试。否则一次网络超时可能变成重复扣款或重复发送。

## RAG 和 Search 的降级不同

| 层 | 降级策略 |
| --- | --- |
| RAG 无召回 | 扩大 query、降低 filter 前要确认权限不变 |
| RAG 低置信 | 明确说资料不足 |
| Search 失败 | 使用缓存时标注时间 |
| Search 冲突 | 输出冲突，不强行合并 |
| Reader 失败 | 换 reader 或提示来源不可读 |

搜索类降级尤其要说明时效性。不能确认最新信息时，不要假装确认了。

## Fallback 也要评估

降级路径也需要进入评测集：

- 主模型失败时是否切到正确备选；
- RAG 无结果时是否拒答；
- Search 失败时是否说明时效性；
- 权限不足时是否停止；
- 工具超时时是否避免重复副作用；
- 低置信度时是否转人工；
- 降级后用户是否能看到原因。

只评估成功路径，会让系统在异常场景里表现得不可预测。

## 降级要可见

降级后应该记录并在必要时告知用户：

- 使用了缓存；
- 未能确认最新信息；
- 改用了低成本模型；
- 跳过了某个工具；
- 需要人工处理；
- 由于权限不足无法执行。

不要悄悄降级后输出同样自信的答案。

## 人工兜底

转人工不是失败，而是系统能力边界的一部分。

必须转人工：

- 高风险动作；
- 多次失败；
- 低置信度；
- 涉及投诉、资金、法律；
- 用户明确要求人工；
- 系统无法解释依据。

## 最终判断

```text
临时失败：重试
能力不足：降级
资料缺失：拒答
权限不足：拒绝
高风险：确认
低置信：转人工
```

好的降级策略不是让系统永远回答，而是让系统在能力边界内诚实、可控地继续工作。
