---
phase: 4
slug: practice-course-experience-rework
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
---

# Phase 4 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | other |
| Quick run command | `bun run build:strict` |
| Full suite command | `bun run build:strict` |
| Estimated runtime | ~30 seconds |

## Sampling Rate

- After every task commit: 运行该 task 指定的 `bun run build:strict`
- After every plan wave: 再次运行 `bun run build:strict`
- Before phase completion: `bun run build:strict` 必须为绿

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Automated Command | Status |
|---------|------|------|-------------|-------------------|--------|
| 04-01-01 | 01 | 1 | PRAC-01 | `bun run build:strict` | ⬜ pending |
| 04-01-02 | 01 | 1 | PRAC-01 | `bun run build:strict` | ⬜ pending |
| 04-02-01 | 02 | 2 | PRAC-02 | `bun run build:strict` | ⬜ pending |
| 04-02-02 | 02 | 2 | PRAC-02 | `bun run build:strict` | ⬜ pending |
| 04-03-01 | 03 | 3 | PRAC-03 | `bun run build:strict` | ⬜ pending |
| 04-03-02 | 03 | 3 | PRAC-03 | `bun run build:strict` | ⬜ pending |

## Manual Checks

- 打开 `docs/practice/index.md` 对应页面，确认首页先出现“按目标开始”和“按阶段浏览”
- 打开 `docs/practice/p02-multi-turn/index.md`、`docs/practice/p11-planning/index.md`、`docs/practice/p22-project/index.md`，确认顶部存在统一项目导览
- 打开上述项目页底部，确认存在完成判定、下一步项目和相关理论回链
- 打开 `docs/00-what-is-ai-agent/index.md`、`docs/04-session-management/index.md`、`docs/intermediate/27-planning-mechanism/index.md`，确认存在明确的实践桥接卡片
- 检查移动端下课程卡片、项目导览卡和桥接卡是否折行正常

## Validation Sign-Off

- [x] Phase 1 至 Phase 3 已提供路径、导航和章节基础设施，不需要额外 Wave 0 依赖
- [x] 所有 tasks 都有统一自动验证命令
- [x] `nyquist_compliant: true` 已设置

**Approval:** pending
