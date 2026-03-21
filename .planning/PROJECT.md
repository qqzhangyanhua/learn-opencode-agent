# AI Agent 产品化学习站

## What This Is

这是一个面向中文开发者的 AI Agent 学习站，基于现有 VitePress 电子书仓库继续演进。它不再只是“章节文档集合”，而是要逐步成为一个更像课程产品的学习入口，让用户能快速选路线、理解当前阶段该学什么，并边学边做项目。

当前仓库已经具备理论篇、实践篇、中级篇、交互演示组件和可运行示例代码，下一步重点不是从零搭内容，而是把这些内容组织成更强的信息架构、学习路径和实践闭环。

## Core Value

让想系统学习 AI Agent 的中文开发者在 30 秒内知道从哪里开始，并能沿着清晰路径持续学下去。

## Requirements

### Validated

- ✓ 用户可以阅读覆盖理论篇、实践篇和中级篇的 AI Agent 中文内容体系 — existing
- ✓ 用户可以通过 VitePress 站点访问章节、阅读地图、术语表和版本说明等辅助页面 — existing
- ✓ 用户可以运行 `practice/*.ts` 示例，边看文档边对照代码实践 — existing
- ✓ 用户可以通过交互式 Vue 组件理解部分核心概念和运行机制 — existing

### Active

- [ ] 重构站点信息架构，让新用户在 30 秒内知道该从哪条路径开始学习
- [ ] 重做首页与导航，使站点从文档仓库观感升级为更产品化的学习入口
- [ ] 为章节建立统一学习结构，包括目标、前置知识、练习和下一步
- [ ] 将实践篇改造成更像课程平台的“跟练体验”，而不只是脚本目录和文章列表
- [ ] 为不同目标用户提供分层学习路线，而不只支持顺序阅读
- [ ] 增强搜索、推荐、路径提示和学习入口设计，降低首次进入的认知负担

### Out of Scope

- 用户登录与云端同步 — v1 聚焦内容产品化与学习路径，不引入账号体系
- 社区评论或讨论区 — 会引入额外运营和交互复杂度，不是当前核心价值
- 题库评分系统 — 当前重点是学习路径与实践闭环，不做评分型教学平台
- AI 助教/问答 — 价值明确但复杂度高，先把静态学习产品体验打磨好
- 视频课程 — 当前资产以文档、代码和交互演示为主
- 付费体系 — 当前阶段先验证内容组织和学习体验
- 多语言支持 — 当前明确服务中文开发者，避免范围膨胀

## Context

- 当前仓库是一个 brownfield 项目，已完成基础内容积累，不是从零开始的新站点
- 技术栈为 VitePress + Vue 组件 + TypeScript + Markdown，适合快速迭代信息架构和前端学习体验
- 现有问题不在“有没有内容”，而在“内容组织是否像产品”
- 当前主要目标用户有三类：
  - 想系统入门 AI Agent 的中文开发者
  - 已经会调用模型，但缺少工程化经验的开发者
  - 想边学边做项目、直接跟练的人
- 当前用户体验短板主要集中在：
  - 只是文档堆叠，学习路径不够强
  - 缺用户进度感、练习反馈和任务闭环
  - 首页和导航不够像真正课程产品
  - 实践篇能看但不够“跟练”
  - 缺搜索、推荐、分层路径和学习入口设计

## Constraints

- **Tech stack**: 继续基于 VitePress、Vue 组件和现有 Markdown 内容体系演进 — 避免推倒重来
- **Product scope**: v1 只做内容产品化和学习路径升级 — 控制复杂度，优先验证核心价值
- **No auth**: 不做登录、云端进度和账号相关能力 — 避免过早引入后端系统
- **Brownfield**: 需要兼容现有章节、实践脚本和导航资产 — 变更必须考虑存量内容迁移成本
- **Audience**: 明确服务中文开发者 — 内容、导航和命名应保持中文优先

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 将项目定位从“电子书仓库”升级为“产品化学习站” | 当前主要问题是内容组织与学习体验，而不是内容缺失 | — Pending |
| v1 先做信息架构、首页、导航、章节结构和实践页体验 | 这是最直接改善学习产品感知的路径 | — Pending |
| 暂不做登录、云端进度、AI 助教和付费能力 | 这些会显著扩大范围，偏离当前核心任务 | — Pending |
| 以不同目标用户的学习路线为核心设计维度 | 用户当前最大的痛点是“不知道从哪里开始” | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-21 after initialization*
