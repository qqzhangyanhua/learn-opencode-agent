# Performance Cost Stage Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第 32 章现有 `CostOptimizationDashboard` 升级为支持 `复杂度识别 -> 模型路由 -> 预算控制 -> 可观测性` 四阶段切换的工程决策面板。

**Architecture:** 复用现有 `CostOptimizationDashboard.vue` 作为唯一章节入口，不新增平行大型组件。组件内部新增四阶段状态与对应视图；现有基线/优化后成本对比保留并放入预算控制阶段，其他阶段使用组件内轻量辅助数据。章节正文只补操作引导，`check:chapter-experience` 增加第 32 章四阶段回归校验。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、现有 `scripts/check-*.mjs`、Bun

---

## File Structure

### Modify

- `.vitepress/theme/components/CostOptimizationDashboard.vue`
  - 增加四阶段切换、复杂度视图、模型路由视图、预算控制视图、可观测性视图
- `scripts/check-chapter-experience.mjs`
  - 增加第 32 章四阶段回归校验
- `docs/intermediate/32-performance-cost/index.md`
  - 在现有组件前增加操作提示

### Optional Modify

- `.vitepress/theme/components/types.ts`
  - 如需最小阶段类型，可补在此处

### Reference

- `docs/superpowers/specs/2026-04-13-performance-cost-stage-dashboard-design.md`
- `.vitepress/theme/components/CostOptimizationDashboard.vue`
- `docs/intermediate/32-performance-cost/index.md`

---

### Task 1: 建立第 32 章失败校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 给 `CostOptimizationDashboard.vue` 增加新校验要求**

在 `scripts/check-chapter-experience.mjs` 增加这些检查：

- `CostOptimizationDashboard.vue` 必须包含 `function changeStage(`
- 组件源码必须包含：
  - `复杂度识别`
  - `模型路由`
  - `预算控制`
  - `可观测性`
- 第 32 章文档仍包含 `<CostOptimizationDashboard`

- [ ] **Step 2: 先运行校验让它失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示 `CostOptimizationDashboard` 尚未实现阶段切换处理函数。

- [ ] **Step 3: 提交失败基线改动**

```bash
git add scripts/check-chapter-experience.mjs
git commit -m "test(intermediate): require performance cost stage dashboard"
```

---

### Task 2: 给组件补四阶段状态骨架

**Files:**
- Modify: `.vitepress/theme/components/CostOptimizationDashboard.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 在组件内定义四阶段状态**

最小定义：

```ts
type CostStageKey = 'complexity' | 'routing' | 'budget' | 'observability'

const stages = [
  { id: 'complexity', label: '复杂度识别' },
  { id: 'routing', label: '模型路由' },
  { id: 'budget', label: '预算控制' },
  { id: 'observability', label: '可观测性' }
] as const
```

- [ ] **Step 2: 增加阶段切换函数**

实现：

```ts
const activeStage = ref<CostStageKey>('complexity')

function changeStage(stage: CostStageKey) {
  activeStage.value = stage
}
```

- [ ] **Step 3: 在顶部加入阶段切换按钮组**

要求：

- 当前阶段高亮
- 点击不影响现有场景切换能力

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/CostOptimizationDashboard.vue
git commit -m "feat(intermediate): add performance cost stage state"
```

---

### Task 3: 实现前两阶段视图

**Files:**
- Modify: `.vitepress/theme/components/CostOptimizationDashboard.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 实现“复杂度识别”视图**

展示：

- 当前请求属于简单 / 中等 / 复杂
- 复杂度判断依据
- 为什么不是所有请求都值得走最强模型

- [ ] **Step 2: 实现“模型路由”视图**

展示：

- 当前复杂度对应的模型层级
- 预算紧张时的降级路径
- 哪些请求可走便宜模型

- [ ] **Step 3: 补右侧说明**

右侧说明区必须解释：

- 复杂度判断先于模型选择
- 模型选择是显式策略，不是感性决定

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/CostOptimizationDashboard.vue
git commit -m "feat(intermediate): add complexity and routing views"
```

---

### Task 4: 实现后两阶段视图

**Files:**
- Modify: `.vitepress/theme/components/CostOptimizationDashboard.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 将现有条形图对比保留在“预算控制”阶段**

要求：

- 继续保留基线 / 优化后切换
- 继续保留总成本 / 总 token / 节省
- 明确解释 system prompt、历史、工具结果和输出预算如何被控制

- [ ] **Step 2: 实现“可观测性”视图**

展示：

- input / output token
- latency
- retry 次数
- tool truncation
- model route

不需要接真实日志，只展示结构化观测样例。

- [ ] **Step 3: 统一右侧阶段说明区**

右侧说明区在所有阶段都显示：

- 当前关注点
- 风险
- 建议动作

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/CostOptimizationDashboard.vue
git commit -m "feat(intermediate): add budget and observability views"
```

---

### Task 5: 接入第 32 章引导并做最终验证

**Files:**
- Modify: `docs/intermediate/32-performance-cost/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run typecheck`
- Test: `bun run check:chapter-experience`
- Test: `bun run build`

- [ ] **Step 1: 在组件前补操作提示**

在第 32 章现有组件前加一句：

```md
按顺序切换四个阶段，观察性能和成本是在哪一层开始失控的。
```

- [ ] **Step 2: 确认校验要求完整**

校验至少覆盖：

- `CostOptimizationDashboard.vue` 含 `function changeStage(`
- 组件源码包含四个阶段标识
- 第 32 章仍接入 `<CostOptimizationDashboard`

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
git add .vitepress/theme/components/CostOptimizationDashboard.vue docs/intermediate/32-performance-cost/index.md scripts/check-chapter-experience.mjs
git commit -m "feat(intermediate): upgrade performance cost stage dashboard"
```
