# System Prompt Assembly Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第 29 章现有 `PromptDesignStudio` 升级为“左侧编辑器 + 右侧源码装配链侧栏”的教学组件，让用户更容易记住 `system.ts -> instruction.ts -> prompt.ts -> llm.ts` 这条运行时装配主链。

**Architecture:** 保留现有 `PromptDesignStudio.vue` 作为唯一章节入口，不新增平行大型组件。左侧继续承担模板与 section 编辑，右侧重构为源码装配链、当前映射、职责解释、最终发模预览和 Prompt 诊断；正文只补操作提示，`check:chapter-experience` 增加第 29 章装配链回归校验。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、现有 `scripts/check-*.mjs`、Bun

---

## File Structure

### Modify

- `.vitepress/theme/components/PromptDesignStudio.vue`
  - 重构右侧为源码装配链侧栏，增加 section -> source layer 映射
- `docs/intermediate/29-system-prompt-design/index.md`
  - 在组件前增加操作提示
- `scripts/check-chapter-experience.mjs`
  - 增加第 29 章装配链回归校验

### Reference

- `docs/superpowers/specs/2026-04-14-system-prompt-assembly-sidebar-design.md`
- `.vitepress/theme/components/PromptDesignStudio.vue`
- `.vitepress/theme/components/PromptLintPanel.vue`
- `docs/intermediate/29-system-prompt-design/index.md`

---

### Task 1: 建立第 29 章失败校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 增加第 29 章装配链校验要求**

新增这些检查：

- `PromptDesignStudio.vue` 必须包含 `function layerForSection(`
- 组件源码必须包含：
  - `system.ts`
  - `instruction.ts`
  - `prompt.ts`
  - `llm.ts`
- 第 29 章文档必须接入 `<PromptDesignStudio`

- [ ] **Step 2: 运行章节体验校验，确认先失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示 `PromptDesignStudio` 尚未实现源码装配映射处理函数。

### Task 2: 给组件补源码装配链状态骨架

**Files:**
- Modify: `.vitepress/theme/components/PromptDesignStudio.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 增加源码层类型与元数据**

最小定义：

```ts
type PromptSourceLayer = 'system' | 'instruction' | 'prompt' | 'llm'
```

以及每层的：

- 文件名
- 职责
- 风险提示

- [ ] **Step 2: 增加 section 到源码层的映射函数**

例如：

```ts
function layerForSection(sectionId: string): PromptSourceLayer
```

- [ ] **Step 3: 增加当前高亮层的计算属性**

默认状态从 `system.ts` 开始。

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

### Task 3: 重构右侧为装配链侧栏

**Files:**
- Modify: `.vitepress/theme/components/PromptDesignStudio.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 把右侧顶部改成源码装配链**

要求：

- 固定显示 `system.ts -> instruction.ts -> prompt.ts -> llm.ts`
- 当前层高亮
- 层与层之间保持连续链感

- [ ] **Step 2: 增加“当前映射”和“为什么在这一层”卡片**

点击左侧 section 时，右侧说明：

- 当前内容更接近哪一层
- 该层负责什么
- 如果放错层会有什么问题

- [ ] **Step 3: 保留预览，但降级为最终发模结果卡片**

要求：

- 明确标注这是最终进入 `llm.ts` 的组装结果
- 不再占右侧主位

- [ ] **Step 4: 保留 PromptLintPanel 作为辅助诊断**

要求：

- 诊断仍可点击回到左侧 section
- 当命中安全缺失时，解释仍与装配链主题一致

- [ ] **Step 5: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

### Task 4: 接入章节提示并做最终验证

**Files:**
- Modify: `docs/intermediate/29-system-prompt-design/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`
- Test: `bun run typecheck`
- Test: `bun run build`

- [ ] **Step 1: 在组件前补一句操作提示**

文案方向：

```md
点击左侧不同 section，观察它在运行时更接近 system.ts、instruction.ts、prompt.ts 还是 llm.ts。
```

- [ ] **Step 2: 确认章节体验校验要求完整**

至少覆盖：

- `PromptDesignStudio.vue` 含映射处理函数
- 组件源码包含四个源码层标识
- 第 29 章接入 `<PromptDesignStudio`

- [ ] **Step 3: 跑最终验证**

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
