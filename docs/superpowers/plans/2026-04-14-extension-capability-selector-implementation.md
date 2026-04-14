# Extension Capability Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为第 12 章新增“按能力选择扩展方式”的章节级教学组件，让读者先分清 Plugin、Skill、Command、MCP 和编辑器扩展分别适合哪类需求。

**Architecture:** 新增独立组件 `ExtensionCapabilitySelector.vue`，采用“顶部主链 + 左侧能力标签 + 中间推荐方案 + 右侧固定记忆说明”的结构，不复用旧的 `ExtensionDecisionFlowDemo`。正文在 `13.1 扩展体系全景` 处改为新的章节主入口，`check:chapter-experience` 增加第 12 章回归校验。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、Bun、现有 `scripts/check-*.mjs`

---

## File Structure

### Create

- `.vitepress/theme/components/ExtensionCapabilitySelector.vue`
- `docs/superpowers/specs/2026-04-14-extension-capability-selector-design.md`

### Modify

- `.vitepress/theme/index.ts`
- `docs/12-plugins-extensions/index.md`
- `scripts/check-chapter-experience.mjs`

### Reference

- `docs/superpowers/specs/2026-04-14-extension-capability-selector-design.md`
- `.vitepress/theme/components/MultiAgentModeSimulator.vue`
- `.vitepress/theme/components/HttpPermissionGateDemo.vue`
- `docs/12-plugins-extensions/index.md`

---

### Task 1: 建立第 12 章失败校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 增加第 12 章章节体验校验**

新增这些检查：

- 存在 `ExtensionCapabilitySelector.vue`
- 组件必须包含：
  - `function recommendationForCapability(`
  - `function whyNotPlugin(`
  - `function whyNotSkill(`
- 组件必须声明：
  - `这一类为什么首选这个方案`
  - `为什么不是 Plugin`
  - `为什么不是 Skill`
  - `最后进入系统的哪个统一入口`
- 组件必须声明主链阶段：
  - `我想扩展什么能力`
  - `选对应扩展方式`
  - `进入统一边界`
- 第 12 章文档必须接入 `<ExtensionCapabilitySelector`

- [ ] **Step 2: 运行章节体验校验，确认先失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示缺少 `ExtensionCapabilitySelector.vue` 或缺少推荐映射函数。

### Task 2: 实现扩展能力选择器组件

**Files:**
- Create: `.vitepress/theme/components/ExtensionCapabilitySelector.vue`
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 定义能力标签与推荐方案数据**

至少包含：

- 复用提示词
- 固定工作流
- 新工具能力
- 外部系统接入
- 编辑器环境接入

- [ ] **Step 2: 实现推荐与反推荐映射函数**

最少实现：

```ts
function recommendationForCapability(capabilityId: string)
function whyNotPlugin(capabilityId: string)
function whyNotSkill(capabilityId: string)
```

- [ ] **Step 3: 实现左侧标签切换和中间推荐方案卡**

要求：

- 默认高亮一个能力标签
- 切换标签时，中间内容和右侧记忆说明联动变化

- [ ] **Step 4: 实现右侧固定记忆面板**

至少包含：

- 四张说明卡
- 当前推荐方案
- 一句话记忆

- [ ] **Step 5: 注册全局组件**

在 `.vitepress/theme/index.ts` 中注册 `ExtensionCapabilitySelector`

- [ ] **Step 6: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

### Task 3: 接入第 12 章正文并做最终验证

**Files:**
- Modify: `docs/12-plugins-extensions/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`
- Test: `bun run typecheck`
- Test: `bun run build`

- [ ] **Step 1: 在 `13.1 扩展体系全景` 里补一句引导文案**

文案方向：

```md
先不要急着看技术实现，先按“我要扩展什么能力”来选最合适的扩展方式，尤其先分清 Plugin 和 Skill。
```

- [ ] **Step 2: 用 `<ExtensionCapabilitySelector />` 取代当前主教学入口**

要求：

- 新组件作为本章第一主入口
- 原 `ExtensionDecisionFlowDemo` 不再承担这一段的主教学角色

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
