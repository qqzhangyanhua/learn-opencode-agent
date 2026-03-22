---
phase: 5
slug: search-and-discovery-experience-closure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
---

# Phase 5 — Validation Strategy

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
| 05-01-01 | 01 | 1 | DISC-01, DISC-03 | `bun run build:strict` | ⬜ pending |
| 05-01-02 | 01 | 1 | DISC-01, DISC-03 | `bun run build:strict` | ⬜ pending |
| 05-02-01 | 02 | 2 | DISC-01 | `bun run build:strict` | ⬜ pending |
| 05-02-02 | 02 | 2 | DISC-01, DISC-03 | `bun run build:strict` | ⬜ pending |

## Manual Checks

- 打开首页，确认主入口里可以明显看到“发现 / 开始学习”并能进入 `/discover`
- 打开 `/discover`，确认首屏先出现“按目标选路线”，搜索只是辅助而不是唯一主轴
- 在 `/discover` 中选择任一路线，确认当前页内能看到明确的“先读什么 / 先做什么 / 下一步”
- 使用站内搜索搜索 `工具`、`规划`、`记忆` 等主题，确认结果文案至少能区分内容类型和学习语义
- 打开 `docs/learning-paths/index.md`、`docs/reading-map.md`、`docs/practice/index.md`、`docs/intermediate/index.md` 对应页面，确认都能回到 `/discover`
- 检查移动端下 `/discover` 路线卡、推荐卡和主题聚合卡的布局是否稳定

## Validation Sign-Off

- [x] Phase 1 至 Phase 4 已提供 metadata、入口页、章节闭环和实践真源，不需要额外 Wave 0 基础设施
- [x] 所有 tasks 都有统一自动验证命令
- [x] `nyquist_compliant: true` 已设置

**Approval:** pending
