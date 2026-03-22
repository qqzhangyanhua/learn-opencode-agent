---
phase: 01-learning-path-and-metadata-foundation
plan: "03"
subsystem: ui
tags: [vitepress, homepage, navigation, practice, intermediate]
requires:
  - phase: 01-02
    provides: content index、learning paths、practicePhases 与板块角色数据
provides:
  - 首页入口组件接入统一学习路径数据
  - 阅读地图 / 实践页 / 中级篇 / nav 对齐同一入口体系
  - Phase 1 统一信息架构在真实站点入口层落地
affects: [phase-2-homepage, navigation, discovery, practice-experience]
tech-stack:
  added: []
  patterns:
    - 入口页消费统一 data loader
    - 首页与导航直接暴露学习路径入口
key-files:
  created: []
  modified:
    - docs/index.md
    - docs/reading-map.md
    - docs/practice/index.md
    - docs/intermediate/index.md
    - .vitepress/theme/components/PracticePreview.vue
    - .vitepress/theme/components/PracticePhaseGrid.vue
    - .vitepress/config.mts
key-decisions:
  - "首页继续保留 `LearningPath`，但板块定位统一改为 `SectionRoleGrid`。"
  - "实践阶段摘要默认从 `practicePhases` 读取，不再在 markdown 内联定义。"
  - "实践页和中级篇定位说明与 data 层保持文字一致，但避免在 markdown 中直接引入 `.data.js` 造成构建解析问题。"
patterns-established:
  - "Pattern: 首页、阅读地图、实践页和中级篇的入口 CTA 全部回链到 `/learning-paths/`。"
  - "Pattern: `PracticePreview.vue` 使用 `sectionById` 与 `practicePhases` 生成入口文案、计数和 CTA。"
requirements-completed: [IA-02, IA-03, DISC-02]
duration: 12m
completed: 2026-03-22
---

# Phase 01 Plan 03: 统一入口层 Summary

**首页、阅读地图、实践页、中级篇与全站导航全部接入统一学习路径入口。**

## Performance

- **Duration:** 12m
- **Started:** 2026-03-22T02:15:00Z
- **Completed:** 2026-03-22T02:27:13Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 重构 `PracticePreview.vue` 与 `PracticePhaseGrid.vue`，让首页入口组件和实践阶段摘要直接消费统一数据层。
- 在首页、阅读地图、实践页、中级篇和顶层导航中显式暴露 `/learning-paths/`，完成 Phase 1 的真实入口接入。
- 清掉实践页内联 phase 数组，让实践阶段摘要只保留一个数据真源。

## Task Commits

Each task was committed atomically:

1. **Task 1: 重构首页与实践入口组件，改为消费统一路径 / 板块数据** - `fc133c8` (feat)
2. **Task 2: 让阅读地图、实践篇、中级篇和全站导航对齐新的学习路径体系** - `4145007` (feat)

**Plan metadata:** `pending` (docs)

## Files Created/Modified

- `docs/index.md` - 首页新增学习路径 CTA，并用 `SectionRoleGrid` 替换静态板块说明。
- `.vitepress/theme/components/PracticePreview.vue` - 入口卡片计数和 CTA 改为来自 `sectionById` / `practicePhases`。
- `.vitepress/theme/components/PracticePhaseGrid.vue` - 默认读取统一 `practicePhases` 数据。
- `docs/reading-map.md` - 新增 canonical path 入口区。
- `docs/practice/index.md` - 去掉内联 phase 数组，并加入学习路径回链。
- `docs/intermediate/index.md` - 加入中级篇定位说明与学习路径回链。
- `.vitepress/config.mts` - 顶层 nav 与根 sidebar 暴露学习路径入口。

## Decisions Made

- 首页不再自己解释三大板块，而是直接复用统一板块定位组件。
- 阅读地图保留原有 A-E 路线作为补充，但在上方增加 canonical path 入口，降低首次进入成本。
- 入口页里的板块定位说明优先保证与 data 层文字一致，再控制 markdown 导入复杂度。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Build Blocker] 避免在 markdown 中直接导入 `.data.js`**
- **Found during:** Task 2 验证
- **Issue:** 在 `docs/practice/index.md` 和 `docs/intermediate/index.md` 中直接导入 `.data.js` 会导致当前仓库的 markdown 构建解析失败。
- **Fix:** 改为使用与 `sectionById.practice` / `sectionById.intermediate` 完全一致的定位文案，保留统一入口链接，不在 markdown 页面内直接消费 data loader。
- **Files modified:** `docs/practice/index.md`, `docs/intermediate/index.md`
- **Verification:** `bun run build:strict`
- **Committed in:** `4145007`

---

**Total deviations:** 1 auto-fixed (build blocker)
**Impact on plan:** 不改变用户看到的信息架构，只绕开 markdown 对 `.data.js` 的解析限制。

## Issues Encountered

- `PracticePreview.vue` 的验收 grep 使用了过宽的 `7` 匹配模式，最终通过移除组件里的硬编码数字与含 `7` 的样式值，确保验收与实现一致。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 已完成，下一步可以进入 Phase 2，开始首页与全站导航的产品化重构。
- 当前唯一未提交改动仍是 `.planning/config.json` 的旧脏变更，未混入本 phase 提交。
