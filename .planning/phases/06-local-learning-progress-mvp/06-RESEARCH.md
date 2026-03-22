# Phase 6: 本地学习进度 MVP - Research

**Researched:** 2026-03-22  
**Domain:** 本地学习状态记录、章节页与实践页进度控件、内容级互斥状态、本地存储降级  
**Confidence:** MEDIUM

## Summary

当前仓库已经具备做“本地学习进度 MVP”的关键前置能力：

- `content-meta.ts` 与页面 frontmatter 已经为核心章节提供稳定 `contentId`
- `practice-projects.ts` 已经为实践项目提供统一 `projectId`、路径、阶段和元信息真源
- `ChapterLearningGuide.vue` 与 `PracticeProjectGuide.vue` 已经成为内容页前半屏的统一学习骨架
- `practicePlaygroundStorage.ts` 已经提供了可复用的“安全读写 localStorage + 解析失败回退”实现模式
- `build:strict` 已经接入一批结构校验脚本，适合继续纳入新的体验约束

但 Phase 6 的核心缺口仍然明确：

- 用户虽然知道“这一章值不值得学”，但还不能在内容页内标记“稍后再看 / 从这里继续 / 已完成”
- 当前学习站已经有课程化结构，却缺少最小可感知的本地进度层，用户返回站点时仍然只能靠记忆判断学到哪
- 后续如果要做继续学习卡、路径完成率或本地汇总，就缺少统一而稳定的内容级状态底层

**Primary recommendation:** 按已确认的方案 B，把进度能力嵌入 `ChapterLearningGuide` 与 `PracticeProjectGuide`，并把实现边界拆成“store / toggle / guide 接入”三层，只在内容页提供本地三态记录，不扩展到首页、发现页或全站仪表盘。

## Requirements Mapping

| Requirement | Research support |
|-------------|------------------|
| PROG-01 | 需要在章节页与实践页中，以 `contentId` 或稳定项目标识为键保存本地“已完成”状态 |
| PROG-02 | 需要在同一套本地记录模型中支持“稍后再看”与“从这里继续”，并保证三态互斥 |

## Existing Assets To Reuse

- `docs/superpowers/specs/2026-03-22-local-learning-progress-design.md`
- `.vitepress/theme/components/ChapterLearningGuide.vue`
- `.vitepress/theme/components/PracticeProjectGuide.vue`
- `.vitepress/theme/components/types.ts`
- `.vitepress/theme/data/content-meta.ts`
- `.vitepress/theme/data/content-index.data.ts`
- `.vitepress/theme/data/practice-projects.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundStorage.ts`
- `.vitepress/theme/index.ts`
- `package.json`
- `scripts/check-chapter-experience.mjs`
- `scripts/check-practice-course-experience.mjs`

## Product Constraints Confirmed

### In Scope

- 章节页与实践项目页内的本地学习进度控件
- 三种手动状态：`稍后再看`、`从这里继续`、`已完成`
- 单内容互斥状态模型与本地持久化
- `localStorage` 不可用、`contentId` 缺失、JSON 损坏时的优雅降级

### Explicitly Out of Scope

- 首页继续学习卡
- `/discover`、学习路径页、阅读地图页的进度汇总
- 自动记录访问轨迹或阅读百分比
- 路线完成率或个人仪表盘
- 登录、云同步、服务端存储

## Recommended Phase 6 Architecture

### New data layer

- `.vitepress/theme/components/learning-progress/learningProgressStorage.ts`
  - 统一保存 `contentId -> progressRecord`
  - 暴露安全读取、写入、覆盖和查询 API
  - 内部状态使用稳定枚举，如 `saved / active / done`
  - 每次更新记录 `updatedAt`

### New interaction unit

- `.vitepress/theme/components/LearningProgressToggle.vue`
  - 渲染三种互斥状态按钮
  - 高亮当前状态
  - 切换后给出轻量“已保存到本地”反馈
  - `contentId` 缺失时不渲染

### Integration layer

- `ChapterLearningGuide.vue`
  - 从 frontmatter / content metadata 中解析当前内容标识
  - 在 guide 顶部摘要区域接入进度控件

- `PracticeProjectGuide.vue`
  - 直接基于 `projectId` 或映射出的稳定内容标识接入进度控件
  - 保持实践导览与项目运行入口结构不变

### Validation

- `scripts/check-learning-progress.mjs`
  - 校验新 store、组件、脚本注册与 `build:strict` 接线
  - 第二阶段扩展为验证 guide 层已真正接入进度控件

## Design Rule

Phase 6 只做“内容页内的本地学习状态记录能力”，不提前实现任何需要汇总消费层、账号体系或自动追踪的数据产品能力。
