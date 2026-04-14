# Testing Fixture Boundary Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为第 14 章新增“测试环境边界演示”章节级教学组件，让读者通过 `Bun Test / Happy DOM / Playwright` 三个运行器快速记住各自托住的验证边界。

**Architecture:** 新增独立组件 `TestingFixtureBoundaryDemo.vue`，采用“顶部主记忆句 + 三标签切换 + 右侧固定记忆面板”的结构，替换当前 `<TestingLayersDemo />` 作为本章第一主入口。正文继续保留原有测试分层内容，但把“fixture 与运行环境”提前成第一记忆点，`check:chapter-experience` 增加第 14 章回归校验。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、Bun、现有 `scripts/check-*.mjs`

---

## File Structure

### Create

- `.vitepress/theme/components/TestingFixtureBoundaryDemo.vue`
- `docs/superpowers/specs/2026-04-14-testing-fixture-boundary-demo-design.md`

### Modify

- `.vitepress/theme/index.ts`
- `docs/14-testing-quality/index.md`
- `scripts/check-chapter-experience.mjs`

### Reference

- `docs/superpowers/specs/2026-04-14-testing-fixture-boundary-demo-design.md`
- `.vitepress/theme/components/CloudLayerResponsibilityDemo.vue`
- `.vitepress/theme/components/ExtensionCapabilitySelector.vue`
- `docs/14-testing-quality/index.md`

---

### Task 1: 建立第 14 章体验校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 增加第 14 章章节体验校验**

新增这些检查：

- 存在 `TestingFixtureBoundaryDemo.vue`
- 组件必须包含：
  - `Agent 项目能稳定测试，不只是因为有 test 文件，更是因为每一层都有对应的运行环境和 fixture。`
  - `托住哪层`
  - `解决什么问题`
  - `没有会坏成什么`
  - `典型入口文件`
  - `Bun Test`
  - `Happy DOM`
  - `Playwright`
- 第 14 章文档必须接入 `<TestingFixtureBoundaryDemo`

- [ ] **Step 2: 运行章节体验校验，确认先失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示缺少 `TestingFixtureBoundaryDemo.vue` 或第 14 章文档尚未接入组件。

### Task 2: 实现测试环境边界组件

**Files:**
- Create: `.vitepress/theme/components/TestingFixtureBoundaryDemo.vue`
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 定义三个运行器状态数据**

至少包含：

- Bun Test
- Happy DOM
- Playwright

每个状态都要有：

- `title`
- `summary`
- `layer`
- `problem`
- `failure`
- `files`
- `warning`

- [ ] **Step 2: 实现顶部主记忆句和标签切换**

要求：

- 顶部固定显示：
  `Agent 项目能稳定测试，不只是因为有 test 文件，更是因为每一层都有对应的运行环境和 fixture。`
- 点击标签时当前状态高亮
- 不自动播放
- 不使用学习进度按钮组

- [ ] **Step 3: 实现中央当前运行器说明区**

要求：

- 每次切换只强调“当前运行器托住哪一层验证”
- 保持文案短句化，不回到大段解释

- [ ] **Step 4: 实现右侧固定记忆面板**

至少包含：

- `托住哪层`
- `解决什么问题`
- `没有会坏成什么`
- `典型入口文件`

底部再补一条随状态变化的“误区提醒”。

- [ ] **Step 5: 注册全局组件**

在 `.vitepress/theme/index.ts` 中注册 `TestingFixtureBoundaryDemo`

- [ ] **Step 6: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

### Task 3: 接入第 14 章正文并做最终验证

**Files:**
- Modify: `docs/14-testing-quality/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`
- Test: `bun run typecheck`
- Test: `bun run build`

- [ ] **Step 1: 在旧分层演示位置补一句引导文案**

文案方向：

```md
先不要急着背测试层名词，先记住 Bun Test、Happy DOM、Playwright 分别托住哪一层验证。
```

- [ ] **Step 2: 用 `<TestingFixtureBoundaryDemo />` 替换当前 `<TestingLayersDemo />`**

要求：

- 新组件作为本章第一主入口
- 旧组件不再承担这一段的主教学角色

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
