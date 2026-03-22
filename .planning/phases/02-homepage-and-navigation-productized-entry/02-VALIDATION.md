---
phase: 2
slug: homepage-and-navigation-productized-entry
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
---

# Phase 2 — Validation Strategy

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
| 02-01-01 | 01 | 1 | IA-01, HOME-01 | `bun run build:strict` | ⬜ pending |
| 02-01-02 | 01 | 1 | IA-01, HOME-01 | `bun run build:strict` | ⬜ pending |
| 02-02-01 | 02 | 2 | HOME-02 | `bun run build:strict` | ⬜ pending |
| 02-02-02 | 02 | 2 | HOME-02, HOME-03 | `bun run build:strict` | ⬜ pending |
| 02-03-01 | 03 | 3 | HOME-03 | `bun run build:strict` | ⬜ pending |
| 02-03-02 | 03 | 3 | HOME-03 | `bun run build:strict` | ⬜ pending |

## Manual Checks

- 打开 `/`，确认首页 30 秒内能识别起步路线
- 打开 `/learning-paths/`，确认它在首页与导航里是明显入口
- 打开 `/practice/`、`/intermediate/`、`/reading-map`，确认都能看见“当前定位 / 下一步”提示
- 检查桌面和移动端下 hero、CTA、入口卡片是否折行异常

## Validation Sign-Off

- [x] Phase 1 已提供统一数据层，Phase 2 不需要额外 Wave 0 基础设施
- [x] 所有 tasks 都有自动验证
- [x] `nyquist_compliant: true` 已设置

**Approval:** pending
