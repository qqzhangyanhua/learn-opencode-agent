---
phase: 01-learning-path-and-metadata-foundation
plan: "02"
subsystem: ui
tags: [vitepress, data-loader, learning-path, navigation, information-architecture]
requires:
  - phase: 01-01
    provides: 统一 learning metadata 合同、seed contentId 与 metadata 校验脚本
provides:
  - build-time 内容索引与板块角色聚合
  - 目标导向学习路径数据层与路径校验脚本
  - `/learning-paths/` 总览页与板块角色卡片
affects: [homepage, reading-map, practice-index, section-navigation]
tech-stack:
  added: []
  patterns:
    - VitePress `.data.ts` loader 聚合内容节点
    - 路径定义与板块角色由统一数据层驱动
    - 构建前脚本校验 learning path 引用与顺序
key-files:
  created:
    - .vitepress/theme/data/content-index.data.ts
    - .vitepress/theme/data/learning-paths.data.ts
    - .vitepress/theme/components/SectionRoleGrid.vue
    - docs/learning-paths/index.md
    - scripts/check-learning-paths.mjs
  modified:
    - .vitepress/theme/components/LearningPath.vue
    - package.json
    - docs/practice/playground/IMPROVEMENTS.md
key-decisions:
  - "将 `content-index.data.ts` 做成唯一的内容聚合入口，统一输出 `contentNodes`、`contentById`、`sectionIndex`、`sectionById`。"
  - "将 `learning-paths.data.ts` 做成合法 VitePress data loader，并通过 `data` 导出供组件消费。"
  - "把 `/learning-paths/` 设计成目标选择入口，而不是章节树镜像。"
patterns-established:
  - "Pattern: 组件通过 `import { data } from '../data/*.data.js'` 消费聚合数据，不再内嵌课程数组。"
  - "Pattern: `check-learning-paths.mjs` 在构建前验证 pathId、step 顺序、contentId 引用和板块 key 一致性。"
requirements-completed: [IA-02, DISC-02]
duration: 18m
completed: 2026-03-22
---

# Phase 01 Plan 02: 学习路径数据层与总览入口 Summary

**build-time 内容索引、目标导向学习路径数据层，以及 `/learning-paths/` 学习入口页。**

## Performance

- **Duration:** 18m
- **Started:** 2026-03-22T01:56:00Z
- **Completed:** 2026-03-22T02:14:33Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 建立 `.vitepress/theme/data/content-index.data.ts`，把 seed frontmatter 聚合为 `contentNodes`、`contentById`、`sectionIndex` 和 `sectionById`。
- 新增 `.vitepress/theme/data/learning-paths.data.ts` 与 `scripts/check-learning-paths.mjs`，固定三条学习路径、七个实践阶段摘要，并在构建前校验引用与顺序。
- 重构 `LearningPath.vue`、新增 `SectionRoleGrid.vue`、交付 `docs/learning-paths/index.md`，让学习路径入口页真正由统一数据层驱动。

## Task Commits

Each task was committed atomically:

1. **Task 1: 实现 build-time 内容索引、路径定义和路径校验** - `cb3a065` (feat)
2. **Task 2: 交付学习路径总览页与可复用展示组件** - `9eb7a92` (feat)

**Plan metadata:** `pending` (docs)

## Files Created/Modified

- `.vitepress/theme/data/content-index.data.ts` - 从 Markdown frontmatter 聚合内容节点、板块入口和对象式索引。
- `.vitepress/theme/data/learning-paths.data.ts` - 定义三条学习路径、路径索引与七个实践阶段摘要。
- `scripts/check-learning-paths.mjs` - 在构建前校验路径顺序、contentId 引用与 section key 一致性。
- `.vitepress/theme/components/LearningPath.vue` - 移除手写阶段数组，改为消费学习路径数据层。
- `.vitepress/theme/components/SectionRoleGrid.vue` - 展示理论篇 / 实践篇 / 中级篇的角色和入口方式。
- `docs/learning-paths/index.md` - 新增学习路径总览页。
- `package.json` - 将 `check:learning-paths` 接入 `build:strict`。
- `docs/practice/playground/IMPROVEMENTS.md` - 清理阻塞 `check:content` 的历史占位文案。

## Decisions Made

- `content-index.data.ts` 负责聚合真实内容节点，`learning-paths.data.ts` 只负责路径和阶段定义，两者职责分离。
- `SectionRoleGrid.vue` 使用 loader 已产出的 `sectionById`，避免在展示层再重建 keyed map。
- 学习路径页直接按目标输出“适合谁 / 起点 / 顺序 / 收获”，满足“30 秒知道从哪开始学”的产品目标。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Build Blocker] 清理历史占位文案以恢复 `build:strict`**
- **Found during:** Task 2 验证
- **Issue:** `docs/practice/playground/IMPROVEMENTS.md` 中残留“需要补充”文案，被 `check-content.mjs` 识别为未收口内容，导致 `build:strict` 无法通过。
- **Fix:** 将占位措辞改成明确的技术债表述，不改变功能范围。
- **Files modified:** `docs/practice/playground/IMPROVEMENTS.md`
- **Verification:** `bun run build:strict`
- **Committed in:** `9eb7a92`

---

**Total deviations:** 1 auto-fixed (build blocker)
**Impact on plan:** 不改变 01-02 范围，只移除构建阻塞，保证标准验证链可通过。

## Issues Encountered

- `learning-paths.data.ts` 初版仅做命名导出，VitePress 将 `.data.ts` 识别为 data loader 后要求默认导出带 `load()` 的对象；改成标准 loader 形态后构建恢复正常。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `01-03` 可以直接复用 `contentById`、`sectionIndex`、`learningPaths` 和 `practicePhases`，继续把首页与导航入口接到统一数据层。
- 当前唯一未提交改动是 `.planning/config.json` 的旧脏变更，未混入本计划提交。
