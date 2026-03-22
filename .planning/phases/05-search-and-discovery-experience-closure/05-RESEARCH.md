# Phase 5: 搜索与发现体验收口 - Research

**Researched:** 2026-03-22  
**Domain:** 统一发现入口、站内搜索增强、内容类型识别、推荐关系收口  
**Confidence:** MEDIUM

## Summary

当前仓库已经具备把“发现体验”产品化所需的大部分基础能力：

- `content-meta.ts` 已定义 `contentType`、`searchTags`、`navigationLabel`、`entryMode` 等 metadata 合同
- `content-index.data.ts` 已能聚合全站章节、实践和中级篇的结构化内容索引
- `learning-paths.data.ts` 与 `practice-projects.ts` 已经沉淀了“按目标选路径”和“按项目选跟练”的数据真源
- 首页、学习路径页、阅读地图页、实践篇页都已经具备明确入口感，不再只是普通目录

但 Phase 5 的关键缺口仍然清晰：

- 站内还没有独立的 `/discover` 统一发现中心，用户仍需要在首页、学习路径、阅读地图、实践页之间自行判断起点
- 当前本地搜索只有“搜到页面”的能力，还没有把内容类型、学习路径语义和选择提示暴露给用户
- 章节页和实践页虽然已有推荐关系，但还没有形成一个面向全站发现的统一编排层

**Primary recommendation:** 保留 VitePress 本地搜索引擎，新增一层 discovery 编排数据与独立 `/discover` 页面，把“按目标选路线 + 搜索辅助定位 + 内容类型统一标识 + 下一步推荐关系”收口到同一套体验中。

## Requirements Mapping

| Requirement | Research support |
|-------------|------------------|
| DISC-01 | 需要一个统一发现中心与更可理解的搜索入口，帮助用户找到某个主题对应的章节、实践项目或专题 |
| DISC-03 | 需要把 `contentType` 从内部字段升级为全站一致的前台类型语言，并在搜索/导航入口中显式暴露 |

## Existing Assets To Reuse

- `.vitepress/config.mts`
- `.vitepress/theme/data/content-meta.ts`
- `.vitepress/theme/data/content-index.data.ts`
- `.vitepress/theme/data/learning-paths.data.ts`
- `.vitepress/theme/data/practice-projects.ts`
- `.vitepress/theme/components/HomeStartPanel.vue`
- `.vitepress/theme/components/EntryContextBanner.vue`
- `.vitepress/theme/components/LearningPath.vue`
- `.vitepress/theme/components/PracticeRouteExplorer.vue`
- `.vitepress/theme/components/RelatedPracticeProjects.vue`
- `docs/index.md`
- `docs/learning-paths/index.md`
- `docs/reading-map.md`
- `docs/practice/index.md`
- `docs/intermediate/index.md`

## Search Constraints Observed

### Current Search Setup

- `.vitepress/config.mts` 当前使用 `search.provider = 'local'`
- `vitepress` 版本为 `^1.5.0`

### Local Search Extension Surface

通过本地类型定义可确认：

- `LocalSearchOptions` 支持 `_render`，可以在索引前转换页面内容
- `miniSearch._splitIntoSections` 可自定义页面分段逻辑
- 当前没有在类型层直接暴露“自定义搜索结果组件”的稳定接口

这意味着 Phase 5 更稳的策略不是重写搜索弹层，而是：

- 优先增强索引内容与结果语义
- 通过统一 discovery 数据层补充内容类型、主题和推荐描述
- 在 `/discover` 中提供比搜索弹层更明确的学习入口和兜底发现体验

## Product Gaps Observed

### Discovery Entry

- 首页当前主 CTA 仍以 `学习路径` 为主，不是统一的“开始学习 / 发现中心”
- 顶部导航和根侧边栏没有独立的发现入口
- 学习路径页、阅读地图页、实践页和中级篇页都有入口能力，但缺少单一收口页

### Search Semantics

- 当前 metadata 已有 `searchTags` 和 `navigationLabel`，但还没有被整理成搜索可理解的展示层语义
- 用户搜索“工具”“规划”“记忆”时，结果更像页面列表，不像课程节点
- `contentType` 目前主要服务内部索引，不是用户可稳定感知的前台标签

### Recommendation Closure

- 章节页和实践页已有局部“下一步”“相关实践”能力
- 缺少面向全站的“按目标推荐起点”“按主题聚合内容”“按类型继续浏览”编排层
- 推荐关系分散在不同数据源里，尚未统一为 discovery 视图模型

## Recommended Phase 5 Architecture

### New / strengthened data layer

- `.vitepress/theme/data/discovery-content.ts`：面向发现体验的统一编排层，基于既有 metadata、路径数据和实践项目数据输出：
  - 学习目标路线
  - 内容类型标签
  - 主题聚合
  - 下一步 / 前置 / 相关实践关系

### New UI units

- `DiscoveryTypeBadge.vue`：统一渲染章节 / 实践项目 / 学习路线 / 进阶专题类型标签
- `DiscoveryGoalRoutes.vue`：按目标选择起步路线
- `DiscoveryStartGrid.vue`：推荐起点区，显示“先读 / 先做 / 下一步”
- `DiscoveryTopicHub.vue`：按主题聚合理论、实践和专题内容

### New page

- `docs/discover/index.md`：全站统一发现入口

### Validation

- `scripts/check-discovery-experience.mjs`：校验 discovery 数据层、搜索配置、`/discover` 页面关键区块和导航入口是否存在

## Design Rule

Phase 5 只做“发现中心 + 搜索语义增强 + 内容类型统一 + 推荐关系收口”，不进入登录、真实学习进度、个性化推荐引擎或新的搜索服务替换。
