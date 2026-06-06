---
title: 企业知识库权限过滤怎么设计
description: 说明企业 RAG 中检索前过滤、租户隔离、文档 ACL、引用脱敏和审计应该如何设计。
contentType: support
series: support
contentId: agent-selection-enterprise-knowledge-permission
shortTitle: 知识权限设计
summary: 企业知识库权限必须在检索前生效，生成后过滤无法防止泄露。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 理解检索前权限过滤为什么是企业 RAG 底线
  - 设计文档、chunk、租户和用户权限 metadata
  - 识别引用、脱敏和审计中的泄露风险
prerequisites:
  - 已了解 RAG 选型
  - 已了解企业 Copilot 选型
recommendedNext:
  - /agent-selection/10-enterprise-copilot-stack
  - /agent-selection/28-security-permission-selection
  - /practice/p19-security/
practiceLinks:
  - /practice/p07-rag-basics/
  - /practice/p19-security/
  - /practice/p20-observability/
searchTags:
  - 企业知识库
  - 权限过滤
  - ACL
  - RAG 安全
  - 多租户
navigationLabel: 知识权限设计
entryMode: bridge
roleDescription: 适合设计企业 RAG、多租户知识库和权限隔离检索系统时阅读。
---

<ChapterLearningGuide />

## 核心原则

```text
先过滤，再检索，再生成
```

不能先检索全量知识，再让模型“不要说出来”。只要未授权内容进入上下文，就已经泄露。

## 权限模型先于索引模型

企业 RAG 设计顺序应该是：

```text
用户身份
  -> 组织 / 角色 / 项目 / 数据域
  -> 文档 ACL
  -> chunk metadata
  -> 检索 filter
  -> 引用和 trace 脱敏
```

如果先建索引再补权限，后面通常会发现 metadata 不够用，只能重建索引。

## 权限数据结构

每个 chunk 至少要带：

- tenant_id；
- document_id；
- source；
- version；
- owner；
- department；
- acl；
- sensitivity；
- valid_from / valid_to；
- deletion_status。

权限不是额外字段，它是检索数据结构的一部分。

## 权限变化必须能生效

企业权限不是静态的。员工会转岗，项目会关闭，文档会撤回，合同会过期。权限系统至少要处理：

- 用户角色变化；
- 组织架构变化；
- 文档 ACL 更新；
- 文档删除和撤回；
- 敏感级别调整；
- 临时授权过期。

如果权限变化后旧 chunk 仍然能被召回，系统就会持续泄露。权限更新要么实时进入 filter，要么有明确的索引刷新和删除机制。

## ACL 粒度怎么选

| 粒度 | 适合 | 风险 |
| --- | --- | --- |
| 文档级 | 制度、产品手册、FAQ | 文档内混合权限时不够 |
| chunk 级 | 大文档、章节权限不同 | metadata 更复杂 |
| 字段级 | 表格、客户数据、合同 | 检索和脱敏成本高 |
| 动态策略 | 项目、地域、岗位变化快 | 需要权限服务实时计算 |

不要默认文档级 ACL 足够。很多企业文档标题可见，但内容某些章节不可见。

## 一个错误设计

常见错误链路是：

```text
全量文档进入向量库
  -> 检索 TopK
  -> 代码过滤无权限 chunk
  -> 剩余 chunk 交给模型
```

这个设计看似没有把无权限内容交给用户，但问题已经发生：无权限 chunk 进入过召回结果、日志和调试 trace。过滤后 TopK 也可能只剩一两条，导致模型回答不稳定。

正确做法是让权限条件进入向量库和关键词搜索查询，让无权限 chunk 从第一步就不可见。

## 检索前过滤

检索请求应先计算用户可访问范围：

```text
user identity
  -> roles / groups
  -> accessible document scope
  -> vector / keyword filter
  -> retrieval
```

filter 表达式必须进入向量库或搜索引擎查询，不要在召回后用代码过滤 TopK。

## 引用必须二次校验

即使检索前过滤正确，最终引用也要校验：

- 引用链接当前用户是否能打开；
- 引用标题是否泄露项目名；
- 引用摘要是否包含敏感字段；
- 引用原文是否已经过期；
- trace 中是否保存了完整敏感内容。

很多泄露不是出现在答案正文，而是出现在引用、调试面板、导出报告和错误日志里。

## 为什么召回后过滤不够

召回后过滤会带来两个问题：

1. 未授权 chunk 已经进入系统上下文或 trace；
2. 过滤后 TopK 可能变空，导致回答质量和调试都不稳定。

正确做法是把 ACL 变成检索条件，让未授权内容从一开始就不可召回。

## 多租户隔离

多租户有两种路线：

| 路线 | 适合 | 风险 |
| --- | --- | --- |
| 物理隔离 collection | 租户少、隔离要求高 | 运维复杂 |
| 逻辑隔离 metadata | 租户多、规模大 | filter 错误风险高 |

无论哪种路线，都要有权限测试样本，专门验证越权召回。

## 权限测试样本

上线前至少准备这些样本：

| 样本 | 期望 |
| --- | --- |
| A 用户查询 B 部门文档 | 无召回 |
| 项目成员查询已撤回文档 | 无召回 |
| 有标题权限但无正文权限 | 不返回正文 |
| 跨租户查询同名文档 | 只返回本租户 |
| 权限变更后再次查询 | 按新权限生效 |
| trace 导出 | 敏感内容脱敏 |

企业 RAG 的权限测试应该是固定回归集，不是上线前人工随便试几次。

## 引用和脱敏

引用也可能泄露信息。需要检查：

- source 名称是否包含敏感项目；
- chunk 原文是否需要脱敏；
- 引用链接是否可被当前用户访问；
- 摘要是否暴露未授权事实；
- trace 是否包含敏感上下文。

不要只保护最终答案。trace、日志、引用和调试界面都要纳入权限边界。

## 上线检查

- 是否有越权召回测试；
- 是否有删除回收机制；
- 是否能处理用户权限变更；
- 是否记录每次检索 filter；
- 是否能解释某条 chunk 为什么可见；
- 是否有敏感数据脱敏；
- 是否审计引用和 trace。

企业 RAG 的第一指标不是召回率，而是“不该看的永远召不出来”。
