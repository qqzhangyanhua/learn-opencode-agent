---
phase: 01-learning-path-and-metadata-foundation
plan: "01"
subsystem: infra
tags: [vitepress, metadata, frontmatter, learning-path, validation]
requires: []
provides:
  - 统一的学习元数据 TypeScript 合同
  - 构建前 learning metadata 校验脚本
  - 7 个可被后续路径聚合引用的 seed content 节点
affects: [homepage, learning-paths, practice-index, intermediate-index]
tech-stack:
  added: []
  patterns:
    - frontmatter 作为学习内容真源
    - 构建前脚本校验 frontmatter 完整性
    - 主题层与脚本层共享单一 metadata 合同
key-files:
  created:
    - .vitepress/theme/data/content-meta.ts
    - scripts/check-learning-metadata.mjs
  modified:
    - .vitepress/theme/components/types.ts
    - package.json
    - docs/00-what-is-ai-agent/index.md
    - docs/01-agent-basics/index.md
    - docs/03-tool-system/index.md
    - docs/04-session-management/index.md
    - docs/practice/p01-minimal-agent/index.md
    - docs/practice/p10-react-loop/index.md
    - docs/intermediate/27-planning-mechanism/index.md
key-decisions:
  - "将学习 metadata 合同集中到 `.vitepress/theme/data/content-meta.ts`，避免组件类型和校验脚本各自维护一份字段定义。"
  - "校验脚本直接读取 content-meta.ts 中的常量数组，确保字段名与枚举值只有一个真源。"
  - "首批 7 个页面统一写入固定 contentId、entryMode 与推荐跳转关系，作为后续路径聚合的稳定引用点。"
patterns-established:
  - "Pattern: 所有进入学习路径的数据字段都先写入章节 frontmatter，再由后续 data loader 聚合。"
  - "Pattern: build:strict 在构建前执行内容校验脚本，尽早拦截缺字段和非法枚举。"
requirements-completed: [IA-02, IA-03]
duration: 6m 11s
completed: 2026-03-22
---

# Phase 01 Plan 01: 学习元数据合同与 Seed 节点 Summary

**统一学习 metadata 合同、构建期校验脚本与 7 个可聚合 content 节点。**

## Performance

- **Duration:** 6m 11s
- **Started:** 2026-03-22T01:40:22Z
- **Completed:** 2026-03-22T01:46:33Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- 建立 `.vitepress/theme/data/content-meta.ts` 作为 Phase 1 的唯一学习元数据合同，定义内容类型、路径类型、板块摘要与必填字段清单。
- 新增 `scripts/check-learning-metadata.mjs`，并把 `check:learning-metadata` 接入 `build:strict`，把 frontmatter 结构错误前置到构建前。
- 为 4 个理论页、2 个实践页和 1 个中级页补齐统一 frontmatter，固定后续计划将依赖的 `contentId`、`entryMode` 与推荐跳转关系。

## Task Commits

Each task was committed atomically:

1. **Task 1: 固定学习元数据合同与下游组件类型** - `dde72bf` (feat)
2. **Task 2: 建立 Wave 0 metadata 校验脚本并接入构建命令** - `a46e962` (feat)
3. **Task 3: 为 7 个核心页面补齐可聚合的 frontmatter seed 数据** - `ef40961` (feat)

**Plan metadata:** `pending` (docs)

## Files Created/Modified

- `.vitepress/theme/data/content-meta.ts` - 学习内容、路径、板块与实践阶段的共享合同，以及必填字段和规范化辅助函数。
- `.vitepress/theme/components/types.ts` - 让后续展示组件直接复用 metadata 合同，避免重复定义学习路径与板块结构。
- `scripts/check-learning-metadata.mjs` - 在构建前校验 seed 页面和声明 `contentType` 的页面是否满足字段完整性、枚举和值格式要求。
- `package.json` - 新增 `check:learning-metadata` 并将其接入 `build:strict`。
- `docs/00-what-is-ai-agent/index.md` - 接入理论篇 seed metadata，固定 `book-00-agent-intro` 节点。
- `docs/01-agent-basics/index.md` - 接入理论篇 seed metadata，固定 `book-01-agent-basics` 节点。
- `docs/03-tool-system/index.md` - 接入理论篇 seed metadata，固定 `book-03-tool-system` 节点。
- `docs/04-session-management/index.md` - 接入理论篇 seed metadata，固定 `book-04-session-management` 节点。
- `docs/practice/p01-minimal-agent/index.md` - 接入实践篇 seed metadata，固定 `practice-p01-minimal-agent` 节点。
- `docs/practice/p10-react-loop/index.md` - 接入实践篇 seed metadata，固定 `practice-p10-react-loop` 节点。
- `docs/intermediate/27-planning-mechanism/index.md` - 接入中级篇 seed metadata，固定 `intermediate-27-planning-mechanism` 节点。

## Decisions Made

- 统一用 `content-meta.ts` 承载学习路径相关类型与字段顺序，后续 loader、组件和脚本都基于这份合同扩展。
- 校验脚本不复制字段枚举，而是读取合同文件中的常量定义，降低后续字段扩展时的漂移风险。
- `recommendedNext` 与 `practiceLinks` 在这批 seed 页面先保持同一组路径值，优先保证下一计划可以稳定引用和聚合。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Contract Drift] 修正理论篇 seed 页面错误的 `contentId` 前缀**
- **Found during:** Plan metadata 收尾与 Wave 2 预检查
- **Issue:** 4 个理论页把 `contentId` 写成了 `theory/book/book-*`，与 `01-01-PLAN.md` 约定的精确 ID `book-*` 不一致，会导致 `01-02` 的学习路径引用失配。
- **Fix:** 将 4 个理论页的 `contentId` 统一改回 `book-00-agent-intro`、`book-01-agent-basics`、`book-03-tool-system`、`book-04-session-management`。
- **Files modified:** `docs/00-what-is-ai-agent/index.md`, `docs/01-agent-basics/index.md`, `docs/03-tool-system/index.md`, `docs/04-session-management/index.md`
- **Verification:** `node scripts/check-learning-metadata.mjs`, `bun run typecheck`
- **Committed in:** pending (plan metadata commit)

---

**Total deviations:** 1 auto-fixed (contract drift)
**Impact on plan:** 只修正 metadata 标识精度，不改变计划范围；修复后才能安全进入 `01-02`。

## Issues Encountered

- Task 2 完成时，校验脚本按预期对 7 个 seed 页面报缺字段错误；在 Task 3 补齐 frontmatter 后，`check-learning-metadata.mjs` 收敛为绿色。
- 并行执行时多次出现短暂 `.git/index.lock` 竞争，改为顺序暂存/提交后已消除，不影响代码结果。
- Task 3 提交后，工作区里又出现了 4 个理论页 `contentId` 被改写为带前缀形式的未提交变更；这些变更不在本计划提交中，已保留为工作区外部改动，避免误覆盖并行执行结果。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 已具备统一的 metadata 合同、构建前校验入口和 7 个稳定内容节点，下一计划可以直接实现 `content index`、`section index` 与 `learning paths` 聚合层。
- 无功能性 blocker；后续只需基于这些 `contentId` 和板块类型继续搭建 data loader 与学习路径页。

## Self-Check: PASSED

- FOUND: `.planning/phases/01-learning-path-and-metadata-foundation/01-01-SUMMARY.md`
- FOUND: `dde72bf`
- FOUND: `a46e962`
- FOUND: `ef40961`
