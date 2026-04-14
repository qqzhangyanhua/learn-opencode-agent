# Multi-Agent Mode Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为第 26 章新增可切换“主从 / 辩论 / 流水线”三种模式的章节级交互模拟器，替换当前单一消息流回放入口。

**Architecture:** 保留现有 `MultiAgentWorkflowDetailed.vue` 作为旧的底层消息流组件，新建 `MultiAgentModeSimulator.vue` 承载章节级模式切换与阶段切换。结构化场景数据放到独立 data 文件中，组件只负责状态编排和呈现；章节正文与体验校验同步更新，确保后续不会退回成静态说明。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、现有 `scripts/check-*.mjs` 校验脚本、Bun

---

## File Structure

### Create

- `.vitepress/theme/data/multi-agent-mode-scenarios.ts`
  - 第 26 章的三种协作模式与分阶段场景数据
- `.vitepress/theme/components/MultiAgentModeSimulator.vue`
  - 章节级交互主组件，负责模式切换、阶段切换、角色结构区、过程区、说明区和底部阶段条

### Modify

- `.vitepress/theme/components/types.ts`
  - 新增第 26 章模拟器所需的数据类型和 props 类型
- `.vitepress/theme/index.ts`
  - 注册 `MultiAgentModeSimulator`
- `docs/intermediate/26-multi-agent-collaboration/index.md`
  - 用新模拟器替换当前 `MultiAgentWorkflowDetailed` 入口
- `scripts/check-chapter-experience.mjs`
  - 扩展第 26 章体验校验，保证新组件已接入且具备模式切换/阶段切换基础能力

### Reference

- `docs/superpowers/specs/2026-04-13-multi-agent-mode-simulator-design.md`
- `.vitepress/theme/components/MultiAgentWorkflowDetailed.vue`
- `.vitepress/theme/components/PlanningFlowSimulator.vue`
- `.vitepress/theme/components/PlanningStageBar.vue`
- `docs/intermediate/26-multi-agent-collaboration/index.md`

---

### Task 1: 建立场景数据类型与校验基线

**Files:**
- Modify: `.vitepress/theme/components/types.ts`
- Create: `.vitepress/theme/data/multi-agent-mode-scenarios.ts`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 在 `types.ts` 里列出需要的新类型**

先补第 26 章专用类型：

```ts
export type MultiAgentModeKey = 'orchestrator' | 'debate' | 'pipeline'

export interface MultiAgentModeAgent {
  id: string
  name: string
  role: string
  summary: string
}

export interface MultiAgentModeEvent {
  id: string
  from: string
  to?: string
  type: 'task' | 'result' | 'debate' | 'artifact' | 'decision'
  content: string
  metadata?: Record<string, string | number>
}

export interface MultiAgentModeStage {
  id: string
  label: string
  headline: string
  insight: string
  risk: string
  events: MultiAgentModeEvent[]
}

export interface MultiAgentModeScenario {
  id: MultiAgentModeKey
  label: string
  summary: string
  agents: MultiAgentModeAgent[]
  stages: MultiAgentModeStage[]
}

export interface MultiAgentModeSimulatorProps {
  initialModeId?: MultiAgentModeKey
}
```

- [ ] **Step 2: 先让章节体验校验提出“第 26 章必须使用新组件”的失败要求**

在 `scripts/check-chapter-experience.mjs` 增加这些校验点：

- 第 26 章必须包含 `<MultiAgentModeSimulator`
- `MultiAgentModeSimulator.vue` 文件必须存在
- 组件源码必须包含模式切换处理函数
- 组件源码必须包含阶段切换处理函数

运行：

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少报出 `MultiAgentModeSimulator` 尚未创建和第 26 章尚未接入。

- [ ] **Step 3: 创建场景数据文件**

在 `.vitepress/theme/data/multi-agent-mode-scenarios.ts` 写出三种模式的结构化数据：

```ts
export const multiAgentModeScenarios = [
  {
    id: 'orchestrator',
    label: '主从模式',
    stages: [...]
  },
  {
    id: 'debate',
    label: '辩论模式',
    stages: [...]
  },
  {
    id: 'pipeline',
    label: '流水线模式',
    stages: [...]
  }
] satisfies MultiAgentModeScenario[]
```

要求：

- 每种模式 4 个阶段
- 每个阶段至少 2 条事件
- 事件文案与正文术语一致，不新造术语

- [ ] **Step 4: 运行类型检查**

Run:

```bash
bun run typecheck
```

Expected: 允许因为主组件还不存在而失败，但类型导出本身不能写错。

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/types.ts .vitepress/theme/data/multi-agent-mode-scenarios.ts scripts/check-chapter-experience.mjs
git commit -m "feat(intermediate): add multi-agent mode simulator data contract"
```

---

### Task 2: 搭建模拟器骨架并注册主题组件

**Files:**
- Create: `.vitepress/theme/components/MultiAgentModeSimulator.vue`
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 先在主题入口写失败引用**

在 `.vitepress/theme/index.ts` 注册异步组件：

```ts
['MultiAgentModeSimulator', asyncComponent(() => import('./components/MultiAgentModeSimulator.vue'))]
```

运行：

```bash
bun run typecheck
```

Expected: FAIL，提示 `MultiAgentModeSimulator.vue` 不存在。

- [ ] **Step 2: 创建最小主组件壳子**

先只写最小可编译版本：

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { multiAgentModeScenarios } from '../data/multi-agent-mode-scenarios'
import type { MultiAgentModeSimulatorProps } from './types'

const props = withDefaults(defineProps<MultiAgentModeSimulatorProps>(), {
  initialModeId: 'orchestrator'
})

const activeModeId = ref(props.initialModeId)
const activeStageIndex = ref(0)
const activeScenario = computed(...)
const activeStage = computed(...)
</script>
```

模板先只输出：

- 顶部标题
- 模式切换按钮
- 当前阶段标题
- 底部阶段按钮

- [ ] **Step 3: 写模式切换函数**

实现：

```ts
function changeMode(modeId: MultiAgentModeKey) {
  activeModeId.value = modeId
  activeStageIndex.value = 0
}
```

要求：

- 切换模式必须回到该模式第一阶段
- 不保留上一模式的阶段索引

- [ ] **Step 4: 写阶段切换函数**

实现：

```ts
function changeStage(index: number) {
  if (!activeScenario.value) return
  if (index < 0 || index >= activeScenario.value.stages.length) return
  activeStageIndex.value = index
}
```

- [ ] **Step 5: 运行类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add .vitepress/theme/components/MultiAgentModeSimulator.vue .vitepress/theme/index.ts
git commit -m "feat(intermediate): scaffold multi-agent mode simulator"
```

---

### Task 3: 完整实现章节级交互布局

**Files:**
- Modify: `.vitepress/theme/components/MultiAgentModeSimulator.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 写角色结构区**

在主组件中加入角色卡片列表，展示：

- 名称
- 角色
- 一句话职责摘要

要求：

- 角色颜色在同一模式内稳定
- 主从 / 辩论 / 流水线三种模式视觉上能一眼区分人数和分工结构

- [ ] **Step 2: 写过程展示区**

过程区根据 `activeStage.events` 渲染事件流：

- `task` / `result` 用消息卡
- `debate` 用对抗型卡片
- `artifact` 用产物卡
- `decision` 用收束卡

不要引入复杂自动播放，先做稳定切屏。

- [ ] **Step 3: 写说明区**

说明区固定输出：

- 当前阶段名
- `headline`
- `insight`
- `risk`

同时区分：

- 收益信息块
- 风险信息块

- [ ] **Step 4: 写底部阶段条**

底部阶段条使用可点击按钮，不用纯 `span`。要求：

- 当前阶段高亮
- 已浏览阶段可弱高亮
- 窄屏下能换行，不挤成竖排

- [ ] **Step 5: 补轻量过渡**

只补最小必要动画：

- 模式切换：淡入 + 轻微位移
- 阶段切换：说明区和过程区淡切

不做自动轮播，不做重粒子动画。

- [ ] **Step 6: 运行类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add .vitepress/theme/components/MultiAgentModeSimulator.vue
git commit -m "feat(intermediate): complete multi-agent mode simulator interactions"
```

---

### Task 4: 接入第 26 章正文并移除旧入口

**Files:**
- Modify: `docs/intermediate/26-multi-agent-collaboration/index.md`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 用新组件替换现有章节入口**

在“核心概念与主链路”部分，把当前：

```md
<MultiAgentWorkflowDetailed ... />
```

替换为：

```md
先切换三种模式，再点击底部阶段，看它们在结构、风险和结果回流方式上的差异。

<MultiAgentModeSimulator />
```

- [ ] **Step 2: 确认正文术语与组件术语一致**

检查这几个词是否完全一致：

- 主从模式
- 辩论模式
- 流水线模式
- 协调者 / 执行者 / 裁判 / 上下游

如果正文里已有叫法不同，只做最小同步，不重写整章。

- [ ] **Step 3: 运行章节体验校验**

Run:

```bash
bun run check:chapter-experience
```

Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add docs/intermediate/26-multi-agent-collaboration/index.md
git commit -m "feat(docs): add multi-agent mode simulator to chapter 26"
```

---

### Task 5: 做最终验证并收口

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run typecheck`
- Test: `bun run check:chapter-experience`
- Test: `bun run build`

- [ ] **Step 1: 让章节体验校验覆盖新交互能力**

确保 `scripts/check-chapter-experience.mjs` 至少检查：

- `MultiAgentModeSimulator.vue` 存在
- 组件包含 `function changeMode(`
- 组件包含 `function changeStage(`
- 第 26 章包含 `<MultiAgentModeSimulator`

- [ ] **Step 2: 跑完整类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 3: 跑章节体验校验**

Run:

```bash
bun run check:chapter-experience
```

Expected: PASS

- [ ] **Step 4: 跑构建**

Run:

```bash
bun run build
```

Expected: PASS，VitePress 构建完成。

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/MultiAgentModeSimulator.vue .vitepress/theme/components/types.ts .vitepress/theme/data/multi-agent-mode-scenarios.ts .vitepress/theme/index.ts docs/intermediate/26-multi-agent-collaboration/index.md scripts/check-chapter-experience.mjs
git commit -m "feat(intermediate): add interactive multi-agent mode simulator"
```
