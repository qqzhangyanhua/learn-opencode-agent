# Security Boundary Protocol Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第 31 章现有 `SecurityBoundaryDemo` 升级为支持 `风险分级 -> 最小权限 -> 确认机制 -> 运行时校验` 四阶段切换的安全协议状态机。

**Architecture:** 复用现有 `SecurityBoundaryDemo.vue` 作为唯一章节入口，不新增平行大型组件。组件内部新增阶段状态、权限基线展示、确认状态展示和运行时 verdict 解释；章节正文只补操作引导，`check:chapter-experience` 增加第 31 章四阶段校验，确保后续不会退回成单纯规则命中检查器。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、现有 `scripts/check-*.mjs`、Bun

---

## File Structure

### Modify

- `.vitepress/theme/components/SecurityBoundaryDemo.vue`
  - 新增四阶段切换、权限基线区、确认机制区、运行时校验区
- `scripts/check-chapter-experience.mjs`
  - 增加第 31 章四阶段状态机回归校验
- `docs/intermediate/31-safety-boundaries/index.md`
  - 在现有组件前增加操作提示
- `.vitepress/theme/components/types.ts`
  - 如有必要，补最小阶段或权限类型

### Reference

- `docs/superpowers/specs/2026-04-13-security-boundary-protocol-simulator-design.md`
- `.vitepress/theme/components/SecurityBoundaryDemo.vue`
- `.vitepress/theme/components/ContextEngineeringExtended.vue`
- `docs/intermediate/31-safety-boundaries/index.md`

---

### Task 1: 建立第 31 章失败校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 给 `SecurityBoundaryDemo.vue` 增加新校验要求**

在 `scripts/check-chapter-experience.mjs` 补这些检查：

- `SecurityBoundaryDemo.vue` 必须包含 `function changeStage(`
- 组件源码必须包含：
  - `风险分级`
  - `最小权限`
  - `确认机制`
  - `运行时校验`
- 第 31 章文档仍包含 `<SecurityBoundaryDemo`

- [ ] **Step 2: 先运行校验让它失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示 `SecurityBoundaryDemo` 尚未实现阶段切换处理函数。

- [ ] **Step 3: 提交失败基线改动**

```bash
git add scripts/check-chapter-experience.mjs
git commit -m "test(intermediate): require security protocol stage simulator"
```

---

### Task 2: 给组件补四阶段状态骨架

**Files:**
- Modify: `.vitepress/theme/components/SecurityBoundaryDemo.vue`
- Optional Modify: `.vitepress/theme/components/types.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 增加阶段状态定义**

在组件内最小定义：

```ts
type SecurityStageKey = 'risk' | 'permission' | 'approval' | 'runtime'

const stages = [
  { id: 'risk', label: '风险分级' },
  { id: 'permission', label: '最小权限' },
  { id: 'approval', label: '确认机制' },
  { id: 'runtime', label: '运行时校验' }
] as const
```

- [ ] **Step 2: 增加切换函数**

实现：

```ts
const activeStage = ref<SecurityStageKey>('risk')

function changeStage(stage: SecurityStageKey) {
  activeStage.value = stage
}
```

- [ ] **Step 3: 顶部加入阶段切换按钮**

要求：

- 当前阶段高亮
- 可在不执行“安全检查”按钮的情况下自由切换阶段

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/SecurityBoundaryDemo.vue .vitepress/theme/components/types.ts
git commit -m "feat(intermediate): add security protocol stage state"
```

---

### Task 3: 实现风险分级与最小权限视图

**Files:**
- Modify: `.vitepress/theme/components/SecurityBoundaryDemo.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 为风险分级阶段补展示**

显示：

- 当前请求对应的风险等级
- 命中的风险因子
- 为什么这类请求会进入更高强度的后续检查

- [ ] **Step 2: 为最小权限阶段补权限基线区**

展示：

- 当前角色默认允许的操作
- 当前角色默认禁止的操作
- 当前目录 / 资源范围基线

可使用组件内静态映射，不新增复杂数据源。

- [ ] **Step 3: 补右侧阶段说明**

右侧说明区必须解释：

- 风险不是按工具名分，而是按后果分
- 权限不是默认给满，而是默认收紧

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/SecurityBoundaryDemo.vue
git commit -m "feat(intermediate): add risk and permission views"
```

---

### Task 4: 实现确认机制与运行时校验视图

**Files:**
- Modify: `.vitepress/theme/components/SecurityBoundaryDemo.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 增加“需要确认”的中间态展示**

要求：

- 不只是 allow / block
- 至少能显示：
  - 无需确认
  - 等待批准
  - 已拒绝
  - 已批准

- [ ] **Step 2: 为确认机制阶段补协议说明**

展示：

- 当前动作是否触发人工确认
- 为什么要等待批准
- 未批准前执行为什么必须挂起

- [ ] **Step 3: 为运行时校验阶段补最终边界展示**

显示：

- 规则命中结果
- 路径/范围是否越界
- 工具是否可执行
- 最终 verdict：allow / block / require approval / degrade

- [ ] **Step 4: 让最终 verdict 能回溯前面三阶段**

要求：

- 当前 verdict 不能像黑盒结果
- 用户必须能看出它来自风险、权限、确认、运行时四层叠加

- [ ] **Step 5: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add .vitepress/theme/components/SecurityBoundaryDemo.vue
git commit -m "feat(intermediate): add approval and runtime validation views"
```

---

### Task 5: 接入第 31 章引导并做最终验证

**Files:**
- Modify: `docs/intermediate/31-safety-boundaries/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run typecheck`
- Test: `bun run check:chapter-experience`
- Test: `bun run build`

- [ ] **Step 1: 在组件前补操作提示**

在第 31 章当前组件前加一句：

```md
先切换四个安全阶段，再观察同一个请求是怎样被逐层收口的。
```

- [ ] **Step 2: 确认回归校验完整**

校验至少覆盖：

- `SecurityBoundaryDemo.vue` 含 `function changeStage(`
- 组件源码包含四阶段标识
- 第 31 章仍接入 `<SecurityBoundaryDemo`

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
git add .vitepress/theme/components/SecurityBoundaryDemo.vue docs/intermediate/31-safety-boundaries/index.md scripts/check-chapter-experience.mjs .vitepress/theme/components/types.ts
git commit -m "feat(intermediate): upgrade security boundary protocol simulator"
```
