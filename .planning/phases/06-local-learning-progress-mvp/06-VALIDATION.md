---
phase: 6
slug: local-learning-progress-mvp
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
---

# Phase 6 — Validation Strategy

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
| 06-01-01 | 01 | 1 | PROG-01, PROG-02 | `bun run build:strict` | ⬜ pending |
| 06-01-02 | 01 | 1 | PROG-01, PROG-02 | `bun run build:strict` | ⬜ pending |
| 06-02-01 | 02 | 2 | PROG-01, PROG-02 | `bun run build:strict` | ⬜ pending |
| 06-02-02 | 02 | 2 | PROG-01, PROG-02 | `bun run build:strict` | ⬜ pending |

## Manual Checks

- 打开任一已接入 `ChapterLearningGuide` 的核心章节，确认 guide 区域内可以看到统一进度控件
- 打开任一实践项目页，确认 `PracticeProjectGuide` 中可以设置 `稍后再看 / 从这里继续 / 已完成`
- 在同一页面中连续切换三种状态，确认当前内容始终只有一个状态高亮
- 刷新页面后，确认上一次手动设置的状态仍然保留
- 在浏览器禁用或异常拦截 `localStorage` 的情况下打开页面，确认正文和 guide 组件仍然可读，不出现阻塞性报错
- 检查移动端下进度控件不会破坏 guide 卡片布局，也不会挤压核心学习信息

## Validation Sign-Off

- [x] Phase 1 至 Phase 5 已提供稳定 content metadata、内容页 guide 骨架与统一校验入口，不需要额外 Wave 0 基础设施
- [x] 所有 tasks 都有统一自动验证命令
- [x] `nyquist_compliant: true` 已设置

**Approval:** pending
