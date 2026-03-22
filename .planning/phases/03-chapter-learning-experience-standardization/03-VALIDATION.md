---
phase: 3
slug: chapter-learning-experience-standardization
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
---

# Phase 3 — Validation Strategy

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
| 03-01-01 | 01 | 1 | CHAP-01, CHAP-02 | `bun run build:strict` | ⬜ pending |
| 03-01-02 | 01 | 1 | CHAP-01, CHAP-02 | `bun run build:strict` | ⬜ pending |
| 03-02-01 | 02 | 2 | CHAP-01, CHAP-02 | `bun run build:strict` | ⬜ pending |
| 03-02-02 | 02 | 2 | CHAP-01, CHAP-02 | `bun run build:strict` | ⬜ pending |
| 03-03-01 | 03 | 3 | CHAP-03, CHAP-04 | `bun run build:strict` | ⬜ pending |
| 03-03-02 | 03 | 3 | CHAP-03, CHAP-04 | `bun run build:strict` | ⬜ pending |

## Manual Checks

- 打开 `docs/00-what-is-ai-agent/index.md` 对应页面，确认顶部存在统一学习摘要
- 打开 `docs/practice/p01-minimal-agent/index.md` 对应页面，确认实践页也沿用同一套结构
- 打开 `docs/intermediate/27-planning-mechanism/index.md` 对应页面，确认中级篇也能显示同一套章节学习信息
- 检查首批 7 个章节底部是否都有“下一步 + 行动任务 / 实践入口”
- 检查桌面与移动端下摘要卡、行动卡的布局是否稳定

## Validation Sign-Off

- [x] Phase 1 与 Phase 2 已提供统一 metadata 与入口层，不需要额外 Wave 0 基础设施
- [x] 所有 tasks 都有自动验证
- [x] `nyquist_compliant: true` 已设置

**Approval:** pending
