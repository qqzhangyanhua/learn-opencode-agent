# Context Engineering Stage Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第 28 章现有的 `ContextEngineeringExtended` 升级为支持 `选 / 排 / 压 / 拼` 四阶段切换的章节级上下文工程模拟器。

**Architecture:** 复用现有 `ContextEngineeringExtended.vue` 作为唯一入口，不新增平行大组件。在组件内部新增阶段状态、阶段说明、压缩展示和最终 messages 组装预览；如需演示辅助文案，使用最小本地映射数据，不重构全站 schema。最后用 `check:chapter-experience` 补回归校验，确保第 28 章不再只是静态候选选择器。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、现有 `scripts/check-*.mjs`、Bun

---

## File Structure

### Modify

- `.vitepress/theme/components/ContextEngineeringExtended.vue`
  - 增加四阶段切换、排序视图、压缩视图、messages 组装视图和阶段说明区
- `scripts/check-chapter-experience.mjs`
  - 增加第 28 章四阶段模拟器回归校验
- `docs/intermediate/28-context-engineering/index.md`
  - 在现有组件入口前补一句操作引导
- `.vitepress/theme/components/types.ts`
  - 如有必要，为第 28 章补最小阶段类型

### Optional Create

- `.vitepress/theme/data/context-engineering-stage-copy.ts`
  - 若组件内文案映射过长，则抽成轻量数据文件

### Reference

- `docs/superpowers/specs/2026-04-13-context-engineering-stage-simulator-design.md`
- `.vitepress/theme/components/ContextEngineeringExtended.vue`
- `.vitepress/theme/components/PlanningFlowSimulator.vue`
- `docs/intermediate/28-context-engineering/index.md`

---

### Task 1: 建立四阶段校验失败基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 给第 28 章组件增加新校验要求**

在 `scripts/check-chapter-experience.mjs` 增加这些检查：

- `ContextEngineeringExtended.vue` 必须包含 `function changeStage(`
- 组件源码必须包含四阶段标识：`选`、`排`、`压`、`拼`
- 第 28 章文档仍然保留 `<ContextEngineeringExtended`

- [ ] **Step 2: 先运行校验让它失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示第 28 章组件尚未实现阶段切换处理函数。

- [ ] **Step 3: 提交失败基线改动**

```bash
git add scripts/check-chapter-experience.mjs
git commit -m "test(intermediate): require context engineering stage simulator"
```

---

### Task 2: 给组件补四阶段状态骨架

**Files:**
- Modify: `.vitepress/theme/components/ContextEngineeringExtended.vue`
- Optional Modify: `.vitepress/theme/components/types.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 定义阶段状态**

如果不单独抽类型，先在组件内部最小定义：

```ts
type ContextStageKey = 'select' | 'arrange' | 'compress' | 'assemble'

const stages = [
  { id: 'select', label: '选' },
  { id: 'arrange', label: '排' },
  { id: 'compress', label: '压' },
  { id: 'assemble', label: '拼' }
] as const
```

- [ ] **Step 2: 增加当前阶段状态与切换函数**

实现：

```ts
const activeStage = ref<ContextStageKey>('select')

function changeStage(stage: ContextStageKey) {
  activeStage.value = stage
}
```

- [ ] **Step 3: 在顶部加入四阶段按钮**

模板新增：

- 阶段按钮组
- 当前阶段说明标题

要求：

- 当前阶段高亮
- 按钮必须可点击

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/ContextEngineeringExtended.vue .vitepress/theme/components/types.ts
git commit -m "feat(intermediate): add context engineering stage state"
```

---

### Task 3: 实现“选”和“排”两个阶段视图

**Files:**
- Modify: `.vitepress/theme/components/ContextEngineeringExtended.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 保持“选”阶段沿用现有候选选择器**

要求：

- 左侧仍显示候选列表
- 已选项仍参与预算统计
- 右侧新增“为什么这一步重要”的说明块

- [ ] **Step 2: 为“排”阶段增加已选项顺序视图**

实现一个基于当前 `sortBy` 和已选项的排序结果列表：

```ts
const arrangedItems = computed(() => ...)
```

展示：

- 排序后的条目顺序
- 每项在最终上下文里的建议位置

- [ ] **Step 3: 补“排”阶段说明**

右侧说明区展示：

- 为什么顺序影响模型注意力
- 哪些内容应该靠前
- 当前阶段最容易犯的错

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/ContextEngineeringExtended.vue
git commit -m "feat(intermediate): add selection and arrangement views"
```

---

### Task 4: 实现“压”和“拼”两个阶段视图

**Files:**
- Modify: `.vitepress/theme/components/ContextEngineeringExtended.vue`
- Optional Create: `.vitepress/theme/data/context-engineering-stage-copy.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 为“压”阶段准备压缩展示数据**

可选做法：

- 直接在组件内写一个基于候选项类型的压缩映射
- 或抽成单独 data 文件

每个条目至少给出三种形态：

- 原文
- 摘要
- 关键事实

- [ ] **Step 2: 实现“压”阶段展示**

显示：

- 当前条目原始 tokens
- 压缩后 tokens
- 当前保留形态

目标：让用户看见“不是删掉，而是降维保留”。

- [ ] **Step 3: 实现“拼”阶段的 messages 预览**

新增一个最终上下文组装预览：

- `system prompt`
- 历史对话
- 检索资料
- 工具结果
- 当前用户问题

可用伪 `messages` 列表呈现，不执行真实拼装。

- [ ] **Step 4: 补“拼”阶段说明**

强调：

- 为什么 system 要在前
- 为什么当前问题通常在末尾收束
- 为什么需要预留输出预算

- [ ] **Step 5: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add .vitepress/theme/components/ContextEngineeringExtended.vue .vitepress/theme/data/context-engineering-stage-copy.ts
git commit -m "feat(intermediate): add compression and assembly views"
```

---

### Task 5: 接入第 28 章文档引导并做最终验证

**Files:**
- Modify: `docs/intermediate/28-context-engineering/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run typecheck`
- Test: `bun run check:chapter-experience`
- Test: `bun run build`

- [ ] **Step 1: 在组件前加操作提示**

在第 28 章现有组件上方加一句：

```md
先依次切换“选 / 排 / 压 / 拼”，再观察同一组候选上下文在不同阶段是怎样变化的。
```

- [ ] **Step 2: 确认校验要求完整**

校验至少覆盖：

- `ContextEngineeringExtended.vue` 含 `function changeStage(`
- 组件源码含 `选 / 排 / 压 / 拼`
- 第 28 章仍接入 `<ContextEngineeringExtended`

- [ ] **Step 3: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 4: 跑章节体验校验**

Run:

```bash
bun run check:chapter-experience
```

Expected: PASS

- [ ] **Step 5: 跑构建**

Run:

```bash
bun run build
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add .vitepress/theme/components/ContextEngineeringExtended.vue docs/intermediate/28-context-engineering/index.md scripts/check-chapter-experience.mjs .vitepress/theme/components/types.ts .vitepress/theme/data/context-engineering-stage-copy.ts
git commit -m "feat(intermediate): upgrade context engineering stage simulator"
```
