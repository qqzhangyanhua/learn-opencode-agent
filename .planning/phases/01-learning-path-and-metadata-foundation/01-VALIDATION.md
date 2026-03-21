---
phase: 1
slug: learning-path-and-metadata-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | other |
| **Config file** | none — current repo relies on build and custom validation scripts |
| **Quick run command** | `bun run typecheck` |
| **Full suite command** | `bun run build:strict` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** 运行该 task 自己声明的 `<automated>` 命令，不再只跑统一的 `bun run typecheck`
- **After every plan wave:** 运行该 wave 的收敛命令，Wave 1 用 `node scripts/check-learning-metadata.mjs && bun run typecheck`，Wave 2/3 用 `bun run build:strict`
- **Before `$gsd-verify-work`:** `bun run build:strict` must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | IA-02, IA-03 | contract typecheck | `bun run typecheck` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | IA-02, IA-03 | metadata validator + typecheck | `node scripts/check-learning-metadata.mjs && bun run typecheck` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | IA-02, IA-03 | seed metadata validation | `node scripts/check-learning-metadata.mjs && bun run typecheck` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 2 | IA-02, DISC-02 | path data validation | `node scripts/check-learning-paths.mjs && bun run typecheck` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 2 | IA-02, IA-03, DISC-02 | full strict build | `bun run build:strict` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 3 | IA-02, IA-03 | entry integration build | `bun run build:strict` | ✅ | ⬜ pending |
| 01-03-02 | 03 | 3 | IA-03, DISC-02 | navigation + landing build | `bun run build:strict` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave Verification Rhythm

| Wave | Plans | Tasks | Required command after each task | Wave close command |
|------|-------|-------|----------------------------------|--------------------|
| 1 | `01-01` | `01-01-01` ~ `01-01-03` | 按 task map 执行；Task 2、Task 3 都必须跑 `node scripts/check-learning-metadata.mjs && bun run typecheck` | `node scripts/check-learning-metadata.mjs && bun run typecheck` |
| 2 | `01-02` | `01-02-01` ~ `01-02-02` | 先跑 `node scripts/check-learning-paths.mjs && bun run typecheck`，再跑 `bun run build:strict` | `bun run build:strict` |
| 3 | `01-03` | `01-03-01` ~ `01-03-02` | 每个 task 都跑 `bun run build:strict` | `bun run build:strict` |

---

## Wave 0 Requirements

- [ ] `scripts/check-learning-metadata.mjs` — 校验核心 frontmatter 字段完整性、枚举值与引用格式
- [ ] `scripts/check-learning-paths.mjs` — 校验路径步骤引用存在、顺序合法、无循环依赖
- [ ] 元数据字段清单文档或 schema 常量 — 至少覆盖 `contentType`、`series`、`learningGoals`、`prerequisites`、`recommendedNext`、`practiceLinks`
- [x] Phase 1 计划中必须明确哪些页面先接入元数据层，避免“先改首页后补真源”
- [x] Phase 1 计划中必须写清 `sectionIndex` 与 `sectionById` 的双导出契约，避免数组式和对象式访问混用
- [x] `PracticePhaseSummary` 字段必须在计划中写实，不允许“执行时再推断”

*当前仓库没有现成的元数据正确性校验基础设施，Wave 0 必须先补。*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 路径页能按目标输出清晰顺序且文案可理解 | DISC-02 | 当前无页面级自动化渲染测试 | 构建后打开首页、路径页、`/practice/`、`/intermediate/`，确认入口顺序与路径定义一致 |
| 理论 / 实践 / 中级篇定位与进入方式表达一致 | IA-03 | 需要人工判断信息架构是否可理解 | 检查首页入口、路径页说明、板块首页说明是否使用统一定位 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
