# LSP Edit Diagnostic Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为第 11 章新增“edit 触发 LSP 拉起与诊断产出”的章节级教学组件，让读者先记住 `touchFile -> getClients -> didChange -> publishDiagnostics` 这条主链。

**Architecture:** 新增独立组件 `LspEditDiagnosticFlowDemo.vue`，沿用近期章节的“顶部主链 + 中间单链推进 + 右侧记忆面板”结构，不复用老式 `FlowScenarioDemo`。正文在 `12.4 getClients` 前补引导并插入组件，`check:chapter-experience` 增加第 11 章回归校验。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、Bun、现有 `scripts/check-*.mjs`

---

## File Structure

### Create

- `.vitepress/theme/components/LspEditDiagnosticFlowDemo.vue`
- `docs/superpowers/specs/2026-04-14-lsp-edit-diagnostic-flow-design.md`

### Modify

- `.vitepress/theme/index.ts`
- `docs/11-code-intelligence/index.md`
- `scripts/check-chapter-experience.mjs`

### Reference

- `docs/superpowers/specs/2026-04-14-lsp-edit-diagnostic-flow-design.md`
- `.vitepress/theme/components/McpHandshake.vue`
- `.vitepress/theme/components/HttpPermissionGateDemo.vue`
- `docs/11-code-intelligence/index.md`

---

### Task 1: 建立第 11 章失败校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 增加第 11 章章节体验校验**

新增这些检查：

- 存在 `LspEditDiagnosticFlowDemo.vue`
- 组件必须包含 `function flowStageLabel(`
- 组件必须声明：
  - `谁负责把文件变更交给 LSP`
  - `getClients() 真正在解决什么问题`
  - `为什么不是启动时就拉起所有语言服务器`
  - `诊断出来后怎么进入后续修复链`
- 组件必须声明主链阶段：
  - `edit 写文件`
  - `touchFile`
  - `getClients`
  - `启动/复用客户端`
  - `didChange`
  - `publishDiagnostics`
- 第 11 章文档必须接入 `<LspEditDiagnosticFlowDemo`

- [ ] **Step 2: 运行章节体验校验，确认先失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示缺少 `LspEditDiagnosticFlowDemo.vue` 或缺少 `flowStageLabel`。

### Task 2: 实现 LSP 拉起主链组件

**Files:**
- Create: `.vitepress/theme/components/LspEditDiagnosticFlowDemo.vue`
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 定义主链阶段与记忆字段**

最小定义：

```ts
type FlowStageId = 'edit' | 'touch' | 'clients' | 'spawn' | 'change' | 'diagnostics'
type FlowLabelKey = 'owner' | 'clients' | 'lazy' | 'repair'
```

- [ ] **Step 2: 定义单链时间线数据**

要求：

- 起点是 `edit foo.ts`
- 终点是 `publishDiagnostics`
- 每一步都有短说明

- [ ] **Step 3: 实现主链点击切换与自动播放**

要求：

- 点击顶部阶段按钮切换说明
- 自动播放按 edit -> touchFile -> getClients -> 启动/复用 -> didChange -> publishDiagnostics 推进

- [ ] **Step 4: 实现右侧固定说明面板**

至少包含：

- 四张记忆卡
- 当前主链位置
- 当前阶段说明
- 一句话记忆

- [ ] **Step 5: 注册全局组件**

在 `.vitepress/theme/index.ts` 中注册 `LspEditDiagnosticFlowDemo`

- [ ] **Step 6: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

### Task 3: 接入第 11 章正文并做最终验证

**Files:**
- Modify: `docs/11-code-intelligence/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`
- Test: `bun run typecheck`
- Test: `bun run build`

- [ ] **Step 1: 在 `12.4` 前补一句引导文案**

文案方向：

```md
先记住这条主链：AI 改完文件后，不是直接“自动修复”，而是先通过 touchFile 和 getClients 把对应语言服务器拉起来，再由 didChange 触发诊断。
```

- [ ] **Step 2: 在 `12.4 getClients` 段前接入 `<LspEditDiagnosticFlowDemo />`**

- [ ] **Step 3: 运行最终验证**

Run:

```bash
bun run check:chapter-experience
bun run typecheck
bun run build
```

Expected:

- `check:chapter-experience` PASS
- `typecheck` PASS
- `build` PASS
