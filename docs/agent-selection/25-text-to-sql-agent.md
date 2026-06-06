---
title: Text-to-SQL Agent 怎么选型
description: 从只读查询、权限控制、SQL 生成、结果解释、人工审核和审计角度判断 Text-to-SQL Agent 技术栈。
contentType: support
series: support
contentId: agent-selection-text-to-sql-agent
shortTitle: Text-to-SQL 选型
summary: Text-to-SQL Agent 的核心风险是数据越权和错误查询，默认应该只读、限权、可审计。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 判断 Text-to-SQL Agent 的最小安全技术栈
  - 设计 schema 暴露、权限过滤和 SQL 审核
  - 识别写操作、敏感数据和聚合误导风险
prerequisites:
  - 已了解工具调用和权限边界
  - 了解数据库查询基础
recommendedNext:
  - /agent-selection/26-human-approval
  - /agent-selection/28-security-permission-selection
  - /practice/p19-security/
practiceLinks:
  - /practice/p19-security/
  - /practice/p20-observability/
  - /practice/p21-evaluation/
searchTags:
  - Text-to-SQL
  - 数据库 Agent
  - SQL 安全
  - 权限
  - 审计
navigationLabel: Text-to-SQL 选型
entryMode: bridge
roleDescription: 适合设计数据分析助手、数据库问答和业务查询 Agent 时阅读。
---

<ChapterLearningGuide />

## 默认只读

Text-to-SQL Agent 第一原则：

```text
read-only first
```

不要让模型直接写生产数据库。即使是只读查询，也要限制表、列、行和查询成本。

## Text-to-SQL 不是一个 prompt

生产链路应该拆成：

```text
schema selection
  -> SQL generation
  -> SQL validation
  -> dry run / explain
  -> execution guard
  -> result interpretation
```

如果模型直接拿全库 schema 生成 SQL 并执行，风险会很快失控。

## 最小架构

```text
User Question
  -> Permission Check
  -> Schema Scope
  -> SQL Generation
  -> SQL Validation
  -> Query Execution
  -> Result Explanation
  -> Audit Log
```

权限检查必须在 schema 暴露之前发生。用户无权访问的表和列，不应该进入模型上下文。

## Schema 暴露策略

| 策略 | 适合 | 风险 |
| --- | --- | --- |
| 全 schema | 本地 demo | 生产不可控 |
| 业务域 schema | 固定分析场景 | 需要维护领域映射 |
| 检索相关 schema | 大库问答 | 可能漏表 |
| 手工白名单 | 高风险系统 | 覆盖速度慢 |

默认建议业务域 schema + 白名单。不要把全库结构作为上下文喂给模型。

## 业务口径比 SQL 更难

用户问“本月活跃客户有多少”，SQL 之前要先确定口径：

```text
本月：自然月还是最近 30 天
活跃：登录、下单、支付还是访问
客户：注册用户、付费用户还是企业账户
权限：当前用户能看哪些区域和产品线
```

Text-to-SQL 如果只生成能跑的 SQL，很容易给出业务上错误的答案。生产系统需要维护指标定义、字段说明和样例查询，让模型知道口径，而不是只知道表结构。

## 关键设计

| 设计点 | 建议 |
| --- | --- |
| Schema 暴露 | 只暴露用户可见范围 |
| SQL 类型 | 默认 SELECT-only |
| 查询限制 | limit、timeout、cost guard |
| 敏感字段 | 脱敏或不暴露 |
| 聚合解释 | 标明口径和过滤条件 |
| 审计 | 记录问题、SQL、结果摘要 |

## SQL 校验要程序化

不要只让模型自检 SQL。执行前应该有程序规则：

- 只允许 `SELECT`；
- 禁止多语句；
- 禁止访问黑名单表；
- 禁止敏感列；
- 强制 `LIMIT`；
- 设置 timeout；
- 估算扫描成本；
- 校验租户和行级权限条件。

模型可以解释 SQL，但执行权应该由 SQL validator 和数据库权限共同控制。

## 什么时候需要人工审核

必须人工审核：

- 写操作；
- 高成本查询；
- 大范围导出；
- 敏感字段查询；
- 影响业务决策的报表；
- 用户要求解释异常数据。

如果业务不能接受错误 SQL 造成的后果，就不要让模型自动执行。

## 结果解释也要受控

SQL 跑出结果后，模型还可能误读数据。输出时至少要带：

- 查询口径；
- 时间范围；
- 过滤条件；
- 聚合方式；
- 样本数量；
- 空值处理；
- 数据更新时间。

不要只输出“增长了 20%”。应该说明它基于哪张表、哪个时间段、哪些过滤条件。对于影响业务决策的报表，最好提供 SQL 或可审计的查询摘要。

## 常见失败

| 失败 | 处理 |
| --- | --- |
| 表选错 | schema 描述和样本查询 |
| 条件漏掉 | SQL 解释和确认 |
| 权限越界 | schema scope 过滤 |
| 查询太贵 | cost guard |
| 结果误读 | 输出口径和限制 |

Text-to-SQL 的质量不只看 SQL 能不能跑，还要看结果解释是否符合业务口径。

## 一个安全执行链

更稳的执行链是：

```text
用户问题
  -> 意图和业务域识别
  -> 权限过滤后的 schema
  -> SQL 生成
  -> 静态校验
  -> explain / cost guard
  -> 只读执行
  -> 结果解释
  -> 审计记录
```

任何一步失败，都应该明确返回错误类型。不要在 schema 不足、权限不足或成本过高时让模型猜一个答案。

## Text-to-SQL 安全评审模板

```text
业务场景：
允许查询的数据域：
禁止访问的数据域：
用户身份来源：
Schema 暴露范围：全 schema / 业务域 schema / 检索相关 schema / 手工白名单
SQL 类型限制：SELECT-only / 禁止多语句 / 强制 LIMIT
SQL validator 规则：黑名单表、敏感列、租户条件、timeout、cost guard
人工审核触发：写操作 / 高成本 / 大范围导出 / 敏感字段 / 关键报表
输出必须包含：查询口径、时间范围、过滤条件、数据更新时间、SQL 或查询摘要
审计记录：用户问题、暴露 schema、生成 SQL、校验结果、执行摘要、输出摘要
```

这份模板没有填清楚之前，不要把 Text-to-SQL 接到生产数据库。

## 评估样本

Text-to-SQL 至少要测：

- 正确表选择；
- 正确 join；
- 正确时间范围；
- 权限内字段；
- 聚合口径；
- 空结果解释；
- 高成本查询拦截；
- 注入和越权请求。

只测“能生成 SQL”是不够的。

## 最终判断

```text
只读查询：可做 POC
敏感数据：强权限和脱敏
写操作：默认不开放
高风险查询：人工审核
生产上线：必须审计
```

Text-to-SQL Agent 不是自然语言外壳，而是数据库权限系统的一部分。
