# Phase 2: 首页与导航产品化入口 - Research

**Researched:** 2026-03-22  
**Domain:** 首页信息架构、导航入口设计、VitePress 站点产品化入口层  
**Confidence:** MEDIUM

## Summary

Phase 1 已经把学习路径、板块角色、实践阶段摘要沉淀为 build-time 数据层，现在 Phase 2 不需要重新研究“内容怎么建模”，而是要解决“这些数据怎样在首页和导航里真正帮助用户起步”。

当前站点还残留明显的文档仓库特征：

- 首页虽然已经加入学习路径与板块定位，但首屏仍偏“说明页”
- 顶层导航仍然偏内容树，不够突出“从哪里开始”
- `docs/practice/index.md`、`docs/intermediate/index.md`、`docs/reading-map.md` 虽然已有回链，但“当前位置 + 下一步”的产品感仍然偏弱

Phase 2 的最佳方向不是大规模引入新框架或重构全站布局，而是：

1. 继续复用 Phase 1 的统一数据源
2. 用少量主题组件把首页与入口页变成更强的产品入口
3. 把导航和侧边栏从“章节列表”拉回“学习入口”

**Primary recommendation:** 保持 VitePress 现有结构，新增少量首页 / 入口组件，统一消费 `content-index.data.ts` 与 `learning-paths.data.ts`，并在导航层显式强化“学习路径 / 实践篇 / 中级篇 / 阅读地图”四类入口。

## Requirements Mapping

| Requirement | Research support |
|-------------|------------------|
| IA-01 | 首页需要显式角色分流与起步路线，而不是只给按钮和长段落说明 |
| HOME-01 | 首屏需要面向不同目标 / 人群的起步卡片或分流区 |
| HOME-02 | nav 与 sidebar 应把学习路径、实践入口、辅助页提升为一等入口 |
| HOME-03 | 关键入口页需要持续告诉用户“当前所在板块 + 下一步去哪” |

## Existing Assets To Reuse

- `.vitepress/theme/data/content-index.data.ts`
- `.vitepress/theme/data/learning-paths.data.ts`
- `.vitepress/theme/components/LearningPath.vue`
- `.vitepress/theme/components/SectionRoleGrid.vue`
- `.vitepress/theme/components/PracticePreview.vue`
- `.vitepress/theme/components/PracticePhaseGrid.vue`
- `.vitepress/theme/custom.css`

## Product Gaps Observed

### Homepage

- Hero 行为仍然偏“文档首页”
- 缺少真正的“我属于哪类用户 / 应该从哪开始”的显式分流
- `LearningPath` 已经能显示路径，但首页缺一个更短平快的决策层

### Navigation

- 顶层 nav 虽然已有 `学习路径`，但整体仍偏资讯导航
- 根 sidebar 仍然以章节树为主，新用户不够容易扫出“从哪开始”

### Entry Pages

- `/practice/`、`/intermediate/`、`/reading-map` 已有一定说明，但缺统一入口提示组件
- 入口页之间的关系还不够“产品化”

## Recommended Phase 2 Architecture

### New / strengthened UI units

- `HomeStartPanel.vue`：首页首屏下方的起步分流卡片
- `EntryContextBanner.vue`：入口页的“你现在在哪 / 推荐下一步”统一提示
- `SectionEntryLinks.vue` 或等价结构：板块 landing page 的清晰回链区

### Pages to update

- `docs/index.md`
- `docs/reading-map.md`
- `docs/practice/index.md`
- `docs/intermediate/index.md`
- `.vitepress/config.mts`

### Design rule

Phase 2 只改“入口层”和“导航层”，不改章节页正文结构，不把章节模板标准化工作提前到本 phase。
