[根目录](../../../CLAUDE.md) > [.vitepress](../) > [theme](../) > **data**

# 数据层模块

> 站点的单一数据源。内容元数据、实践项目、学习路径、动画实验、发现中心路由集中在此，组件只渲染、不内联业务数据。

## 模块职责

- 定义内容类型枚举与 frontmatter 规范，并对外提供规范化函数。
- 聚合全站页面元数据、学习路径、实践项目、动画实验目录与实践↔动画映射。

## 入口与关键文件

- `content-meta.ts`：内容类型枚举（`ContentType` / `ContentSeries` / `LearningDifficulty` / `EntryMode` 等）、实践阶段定义、`normalizeLearningFrontmatter` / `getContentTypeLabel` / `getEntryModeLabel`（被 `config.mts` 直接消费）。
- `content-index.data.ts`：VitePress `.data.ts` 模块，聚合全站页面元数据。
- `learning-paths.data.ts`：学习路径定义（`theory-first` / `practice-first` / `engineering-depth`），供 `check-learning-paths.mjs` 校验 `contentId` 可解析。
- `practice-projects.ts`：28 个实践项目完整元数据（`PracticeProjectDefinition`、`PracticeCourseRoute` 等接口）。
- `practice-source-files.ts`：实践项目源文件路径映射。
- `discovery-content.ts`：发现中心内容路由。
- `animation-lab-experiments.ts`：动画实验目录，重导出 `animation-lab/*` 的 `experiment` + `canvas`，并维护 `practiceLinksByExperimentId` 实验↔实践链接表。

## 子目录

- `animation-lab/`：18 个实验数据文件，每个导出 `xxxCanvas` 与 `xxxExperiment`（agent-loop、tool-permission-gate、error-recovery-loop、context-memory-flow、context-compaction、provider-routing-fallback、multi-agent-dispatch、rag-retrieval-flow、human-approval-gate、structured-output-validation、streaming-interrupt-control、task-planning-queue、file-diff-patch-flow、test-failure-repair、prompt-assembly-pipeline、agent-collaboration-merge、browser-automation-check、safety-boundary-filter、artifact-delivery-review）。
- `practice-motion/`：`index.ts` 维护 `practiceMotionEntries`（实践项目 → 演示组件 → 关联动画实验 ID），类型在 `type.ts`。

## 数据模型

- 类型定义遵循「单独 type.ts」约定：`content-meta.ts` 自身即类型与常量层；`practice-motion/type.ts` 定义 `PracticeMotionEntry`；动画实验类型在 `components/animation-lab/type.ts`。

## 测试与质量

- `scripts/check-learning-metadata.mjs`：校验章节 frontmatter 字段完整性。
- `scripts/check-learning-paths.mjs`：校验学习路径 `contentId` 全站可解析。
- `scripts/check-practice-entries.mjs`：校验实践项目与 `practice/*.ts` 一一对应。
- `scripts/check-animation-lab.mjs` / `check-practice-motion.mjs`：校验动画实验数据/映射一致性。

## 常见问题 (FAQ)

- 新增实践项目：更新 `practice-projects.ts` + `practice-source-files.ts`，并在 `practice/` 建脚本、`docs/practice/` 建页面。
- 新增动画实验：建 `animation-lab/<id>.ts`（导出 canvas + experiment）→ 在 `animation-lab-experiments.ts` 注册 → 更新 `check-animation-lab.mjs` 与侧边栏。
- 关联实践与动画：在 `practice-motion/index.ts` 增 `PracticeMotionEntry`。

## 相关文件清单

- `content-meta.ts`、`content-index.data.ts`、`learning-paths.data.ts`、`practice-projects.ts`、`practice-source-files.ts`、`discovery-content.ts`、`multi-agent-mode-scenarios.ts`、`planning-simulator-scenario.ts`、`animation-lab-experiments.ts`、`animation-lab/*.ts`、`practice-motion/{index,type}.ts`。

## 变更记录 (Changelog)

- **2026-06-06** - 首次生成模块级文档；动画实验记录为 18 个；记录 `practice-motion` 映射模块。
