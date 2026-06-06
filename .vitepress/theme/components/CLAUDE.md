[根目录](../../../CLAUDE.md) > [.vitepress](../) > [theme](../) > **components**

# 主题组件模块

> Vue 3 SFC 渲染组件与交互演示组件，配数据驱动的场景编排逻辑。全部组件在 `.vitepress/theme/index.ts` 全局注册后供 Markdown 内容直接使用。

## 模块职责

- 提供电子书站点的全部自定义渲染单元：首页面板、章节体验组件、发现中心、实践篇组件、理论/中级篇交互演示、动画实验室渲染。
- 演示组件的可测试编排逻辑下沉到同名 `*Scenario.ts`，组件本身只负责视图与交互。

## 入口与启动

- 注册入口：`.vitepress/theme/index.ts`（同步 19 个 + 异步 67 个 + 额外 2 个 `PracticeProjectSourceFiles` / `PlanningFlowSimulator`）。
- 组件在 Markdown 中以标签直接调用，无需手动 import。

## 对外接口（组件分类，约 95 个 `.vue`）

- 首页/导航：`HomeStartPanel`、`HomeExploreLinks`、`HomeSeriesStrip`、`LearningPath`、`RuntimeLifecycleDiagram`、`SourceSnapshotCard`、`StarCTA`。
- 章节体验：`EntryContextBanner`、`ChapterLearningGuide`、`ChapterActionPanel`、`LearningProgressToggle`。
- 发现中心：`DiscoveryTypeBadge`、`DiscoveryGoalRoutes`、`DiscoveryStartGrid`、`DiscoveryTopicHub`。
- 实践篇：`PracticeTerminalHero`、`PracticePhaseGrid`、`PracticeTagCloud`、`PracticeRouteExplorer`、`PracticeProjectSyllabus`、`PracticeProjectGuide`、`PracticeProjectActionPanel`、`PracticeProjectSourceFiles`、`RelatedPracticeProjects`、`ProjectCard`、`RunCommand`。
- 交互演示（理论/中级/扩展篇）：`ReActLoop`、`PermissionFlow`、`McpHandshake`、`ContextCompaction`、`ProviderFallback`、`RagPipelineDemo`、`GraphRagDemo`、`PlanningFlowSimulator`、`MultiAgentModeSimulator`、`SecurityBoundaryDemo`、`CostOptimizationDashboard` 等数十个 `*Demo` / `*Simulator`。
- 动画实验室渲染：`animation-lab/AnimationLabIndex.vue`、`SystemMotionPlayer.vue`、`FlowExperimentCanvas.vue`、`TracePanel.vue`。
- 动画组件：`animations/css/*.vue`、`animations/lottie/*.vue`、`animations/core/*`。

## 关键依赖与配置

- Props 类型集中在 `components/types.ts`；动画实验室子组件类型在 `components/animation-lab/type.ts`。
- 数据来源全部指向 `.vitepress/theme/data/`，组件不内联业务数据。
- Lottie 动画依赖 `lottie-web`。

## 数据模型

- 场景数据结构由 `types.ts` 与 `animation-lab/type.ts` 定义；动画实验消费 `data/animation-lab/*` 导出的 `experiment` / `canvas`。

## 测试与质量

- 单测覆盖编排逻辑：`flowPlayback.test.ts`、`flowScenarioPresenter.test.ts`、`*Scenario.test.ts`（taskExecution / testingLayers / localCloudTopology / tuiProviderFlow / pluginLifecycle / toolExecutionLifecycle / sessionLoopLifecycle 等）、`reActLoopScenario.test.ts`、`streamingOutputScenario.test.ts`、`securityBoundary*.test.ts`、`errorRetryScenario.test.ts`、`graphRagVisitTimer.test.ts`。
- 使用约定：组件使用规范由 `scripts/check-chapter-experience.mjs`、`check-practice-course-experience.mjs`、`check-discovery-experience.mjs`、`check-homepage-entry.mjs`、`check-learning-progress.mjs`、`check-animation-lab.mjs` 校验。

## 常见问题 (FAQ)

- 新组件未生效？检查是否在 `.vitepress/theme/index.ts` 注册。
- 单文件超 500 行？拆子组件或把编排逻辑下沉到同名 `*Scenario.ts`。
- 类型放哪里？通用组件用 `types.ts`，动画实验室用 `animation-lab/type.ts`，禁止 `any`。

## 相关文件清单

- `index.ts`（上一级 theme）、`types.ts`、`animation-lab/type.ts`、`flowScenario.ts`、`flowPlayback.ts`、`*Scenario.ts`、`learning-progress/learningProgressStorage.ts`、`hybridRetrievalData.ts`。

## 变更记录 (Changelog)

- **2026-06-06** - 首次生成模块级文档；记录组件分类、注册入口与单测分布。
