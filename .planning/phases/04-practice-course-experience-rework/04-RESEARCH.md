# Phase 4: 实践篇课程化重构 - Research

**Researched:** 2026-03-22  
**Domain:** 实践首页课程入口、实践项目结构统一、理论与实践关联  
**Confidence:** MEDIUM

## Summary

当前仓库已经具备把实践篇课程化所需的基础条件：

- `learning-paths.data.ts` 中已有 7 个实践阶段定义
- 23 个实践项目页几乎都已经有 `ProjectCard`、`RunCommand` 和相对一致的正文结构
- 首页、导航和入口页已经能把用户送到实践篇

但 Phase 4 的核心缺口仍然明显：

- `docs/practice/index.md` 信息量很大，却仍偏向“运行索引 + 长表格”，课程入口决策不够强
- 23 个实践项目页里，只有 `P1` 和 `P10` 具备统一学习组件；其余页面缺少学习目标、完成标准和明确下一步
- 当前没有统一的“实践项目注册表”，导致阶段页、项目页和理论桥接关系不能共享同一份数据
- 理论页与实践页之间的跳转仍偏零散，缺少显式的“看完马上练”组件

**Primary recommendation:** 引入统一的实践项目元数据注册表，由它驱动实践首页的选课入口、项目页的课程骨架，以及关键理论页的实践桥接卡片。

## Requirements Mapping

| Requirement | Research support |
|-------------|------------------|
| PRAC-01 | 实践首页需要按目标和阶段组织项目，而不是只展示文档目录和命令表 |
| PRAC-02 | 每个项目页需要统一显示学习目标、前置、运行入口、完成判定 |
| PRAC-03 | 关键理论页和项目页需要共享“相关实践/相关理论”关系，而不是各自手写 |

## Existing Assets To Reuse

- `.vitepress/theme/data/learning-paths.data.ts`
- `.vitepress/theme/data/content-index.data.ts`
- `.vitepress/theme/components/ProjectCard.vue`
- `.vitepress/theme/components/RunCommand.vue`
- `.vitepress/theme/components/ChapterLearningGuide.vue`
- `.vitepress/theme/components/ChapterActionPanel.vue`
- `docs/practice/index.md`
- `docs/practice/p01-minimal-agent/index.md`
- `docs/practice/p10-react-loop/index.md`
- `docs/practice/p22-project/index.md`
- `docs/practice/p23-production/index.md`
- `docs/00-what-is-ai-agent/index.md`
- `docs/03-tool-system/index.md`
- `docs/04-session-management/index.md`
- `docs/intermediate/27-planning-mechanism/index.md`

## Product Gaps Observed

### Practice Index

- 首屏 CTA 太多，但“推荐从哪开始”不够聚焦
- 阶段卡信息较轻，无法直接判断每阶段代表项目和完成收益
- 运行索引和长表格权重过高，像说明页，不像课程平台入口

### Practice Project Pages

- 只有 `P1` 和 `P10` 接入统一学习组件，其余 21 页还是“标题 + ProjectCard + 正文”
- 前置要求、运行命令、示例文件和完成判断散落在正文中，没有统一区块
- 项目页缺少稳定的“上一章 / 下一章 / 相关理论”导航

### Theory / Practice Bridge

- 关键理论页已经有部分 `practiceLinks`，但没有视觉上更明确的“对应实践项目”结构
- 项目页没有反向显示“这章对应哪些理论判断”
- 没有自动校验保证实践首页、项目页和桥接页的一致性

## Recommended Phase 4 Architecture

### New / strengthened data layer

- `.vitepress/theme/data/practice-projects.ts`：23 个项目的统一注册表

### New UI units

- `PracticeRouteExplorer.vue`：按目标选入口
- `PracticeProjectSyllabus.vue`：按阶段浏览课程
- `PracticeProjectGuide.vue`：项目页顶部课程导览
- `PracticeProjectActionPanel.vue`：项目页底部完成闭环
- `RelatedPracticeProjects.vue`：理论页 / 中级页的实践桥接卡片

### Validation

- `scripts/check-practice-course-experience.mjs`：校验实践首页是否接入课程组件、23 个项目页是否接入统一导览/行动组件、关键桥接页是否接入相关实践卡片

## Design Rule

Phase 4 只做“实践篇课程入口 + 项目页课程骨架 + 理论实践桥接”，不进入真实进度系统、用户状态或题库评分。
