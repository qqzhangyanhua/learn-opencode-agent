# Planning Dynamic Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `docs/intermediate/27-planning-mechanism/index.md` 升级为用户可选择、可回放、可重规划的动态流程型章节试点。

**Architecture:** 保留现有第 27 章 frontmatter、导览组件与行动面板，新增一套聚焦 Planning 流程模拟的主题组件树和场景数据文件。章节正文从“单个演示组件 + 解释性正文”升级为“6 屏流程模拟器 + 收束说明 + 原有理论文字辅助”，并用现有校验脚本扩展保证第 27 章已接入试点组件。

**Tech Stack:** VitePress, Vue 3 SFC, TypeScript, existing `scripts/check-*.mjs`, Bun

---

## File Structure

### Create

- `.vitepress/theme/data/planning-simulator-scenario.ts`
  - 第 27 章试点场景数据源，定义任务目标、阶段、节点状态、每步决策选项、反馈文案、重规划分支和总结文案
- `.vitepress/theme/components/PlanningMissionCard.vue`
  - 第 1 屏任务挑战卡
- `.vitepress/theme/components/PlanningDecisionPanel.vue`
  - 左侧决策面板，承载每步 2-3 个选项
- `.vitepress/theme/components/PlanningTreeCanvas.vue`
  - 中部任务树和状态变化可视区
- `.vitepress/theme/components/PlanningFeedbackPanel.vue`
  - 右侧系统反馈和术语解释
- `.vitepress/theme/components/PlanningStageBar.vue`
  - 底部阶段条
- `.vitepress/theme/components/PlanningReplaySummary.vue`
  - 第 6 屏路径回放与复刻提示
- `.vitepress/theme/components/PlanningFlowSimulator.vue`
  - 章节主组件，编排 6 屏和内部状态

### Modify

- `.vitepress/theme/components/types.ts`
  - 新增试点组件 props、场景数据和状态类型
- `.vitepress/theme/index.ts`
  - 注册 `PlanningFlowSimulator`
- `docs/intermediate/27-planning-mechanism/index.md`
  - 用新模拟器替换或上移现有 `PlanningTreeDemo`，按试点章节结构重组页面
- `scripts/check-chapter-experience.mjs`
  - 扩展对第 27 章试点组件接入的校验

### Reference

- `docs/superpowers/specs/2026-04-13-planning-dynamic-chapter-design.md`
- `.vitepress/theme/components/PlanningTreeDemo.vue`
- `.vitepress/theme/components/ChapterLearningGuide.vue`
- `.vitepress/theme/components/ChapterActionPanel.vue`
- `practice/p11-planning.ts`

---

### Task 1: 建立场景数据与类型契约

**Files:**
- Create: `.vitepress/theme/data/planning-simulator-scenario.ts`
- Modify: `.vitepress/theme/components/types.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 写出需要的类型列表**

在 `.vitepress/theme/components/types.ts` 旁先明确这些类型：

```ts
type PlanningStageKey = 'goal' | 'outline' | 'decompose' | 'execute' | 'review' | 'replan'
type PlanningNodeStatus = 'idle' | 'planned' | 'running' | 'blocked' | 'failed' | 'done' | 'replanned'

interface PlanningChoice {
  id: string
  label: string
  consequenceKey: string
}

interface PlanningStepState {
  screen: 1 | 2 | 3 | 4 | 5 | 6
  stage: PlanningStageKey
  title: string
  prompt: string
  choices: PlanningChoice[]
}
```

- [ ] **Step 2: 先在 `types.ts` 中写失败的类型导出**

把以上类型与以下 props 接口加入：

```ts
export interface PlanningFlowSimulatorProps {
  scenarioId?: string
}
```

然后运行：

```bash
bun run typecheck
```

Expected: FAIL，提示新组件/数据文件尚未存在或引用缺失。

- [ ] **Step 3: 创建场景数据文件**

在 `.vitepress/theme/data/planning-simulator-scenario.ts` 写出单一试点场景：

```ts
export const planningScenario = {
  id: 'doc-assistant',
  missionTitle: '做一个支持上传、搜索、权限控制的文档助手',
  screens: [
    { screen: 1, stage: 'goal', ... },
    { screen: 2, stage: 'outline', ... },
    { screen: 3, stage: 'decompose', ... },
    { screen: 4, stage: 'execute', ... },
    { screen: 5, stage: 'replan', ... },
    { screen: 6, stage: 'review', ... }
  ]
}
```

要求：
- 每屏只有一个关键问题
- 第 5 屏必须包含重规划分支
- 第 6 屏必须提供“最小可复刻模块”总结字段

- [ ] **Step 4: 重新运行类型检查**

Run:

```bash
bun run typecheck
```

Expected: 通过或仅剩组件尚未实现导致的错误被消除。

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/types.ts .vitepress/theme/data/planning-simulator-scenario.ts
git commit -m "feat(planning): add simulator scenario data contract"
```

---

### Task 2: 搭建流程模拟器骨架组件

**Files:**
- Create: `.vitepress/theme/components/PlanningMissionCard.vue`
- Create: `.vitepress/theme/components/PlanningDecisionPanel.vue`
- Create: `.vitepress/theme/components/PlanningTreeCanvas.vue`
- Create: `.vitepress/theme/components/PlanningFeedbackPanel.vue`
- Create: `.vitepress/theme/components/PlanningStageBar.vue`
- Create: `.vitepress/theme/components/PlanningReplaySummary.vue`
- Create: `.vitepress/theme/components/PlanningFlowSimulator.vue`
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 先写主组件的失败引用**

在 `.vitepress/theme/index.ts` 新增异步组件注册：

```ts
['PlanningFlowSimulator', asyncComponent(() => import('./components/PlanningFlowSimulator.vue'))]
```

然后运行：

```bash
bun run typecheck
```

Expected: FAIL，提示 `PlanningFlowSimulator.vue` 缺失。

- [ ] **Step 2: 创建最小主组件**

在 `.vitepress/theme/components/PlanningFlowSimulator.vue` 先写最小占位：

```vue
<script setup lang="ts">
import { planningScenario } from '../data/planning-simulator-scenario'
</script>

<template>
  <section class="planning-flow-simulator">
    <h2>{{ planningScenario.missionTitle }}</h2>
  </section>
</template>
```

- [ ] **Step 3: 为 6 个子组件分别写最小壳子**

每个组件先只暴露单一职责：
- `PlanningMissionCard.vue`：渲染任务卡
- `PlanningDecisionPanel.vue`：渲染按钮组选项
- `PlanningTreeCanvas.vue`：渲染任务树节点
- `PlanningFeedbackPanel.vue`：渲染解释信息
- `PlanningStageBar.vue`：渲染阶段导航
- `PlanningReplaySummary.vue`：渲染总结

每个组件先只接受最小 props，不要提前加复杂逻辑。

- [ ] **Step 4: 在主组件里拼出四栏骨架**

主组件完成这些状态与布局：

```ts
const currentScreen = ref(1)
const selectedPath = ref<string[]>([])
const currentStep = computed(() => planningScenario.screens.find(...))

function choose(choiceId: string) {
  selectedPath.value.push(choiceId)
  currentScreen.value += 1
}
```

布局必须具备：
- 顶部任务区
- 左侧决策面板
- 中部任务树区
- 右侧反馈区
- 底部阶段条

- [ ] **Step 5: 让第 6 屏显示回放摘要**

到最后一屏时切换到 `PlanningReplaySummary`，展示：
- 用户选择路径
- 重规划是否发生
- 最小 Planning 机制模块

- [ ] **Step 6: 运行类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add .vitepress/theme/index.ts .vitepress/theme/components/Planning*.vue
git commit -m "feat(planning): scaffold interactive flow simulator"
```

---

### Task 3: 补全任务树状态变化与重规划反馈

**Files:**
- Modify: `.vitepress/theme/components/PlanningFlowSimulator.vue`
- Modify: `.vitepress/theme/components/PlanningTreeCanvas.vue`
- Modify: `.vitepress/theme/components/PlanningFeedbackPanel.vue`
- Modify: `.vitepress/theme/data/planning-simulator-scenario.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 先定义会失败的状态映射**

把任务树的每屏状态快照设计成明确数据：

```ts
interface PlanningTreeSnapshot {
  screen: number
  nodes: Array<{ id: string; label: string; status: PlanningNodeStatus; parentId?: string }>
}
```

在场景数据中先补上 6 屏所需快照，再运行：

```bash
bun run typecheck
```

Expected: FAIL 或提示组件尚未消费这些字段。

- [ ] **Step 2: 让 `PlanningTreeCanvas` 真正按快照渲染**

实现规则：
- 用状态色区分 `planned / running / blocked / failed / done / replanned`
- 第 5 屏必须看到旧路径收缩、新路径出现
- 避免自动播放；以用户选择驱动变化

- [ ] **Step 3: 让 `PlanningFeedbackPanel` 根据分支切换解释文案**

实现：

```ts
const feedback = computed(() => resolveFeedback(currentScreen.value, selectedPath.value))
```

要求：
- 每次选择后解释“刚刚发生了什么”
- 必须点名关键术语，例如“高层规划”“任务粒度”“重规划”

- [ ] **Step 4: 让主组件记录用户路径**

实现：
- `selectedPath`
- `didReplan`
- `selectedGranularity`

这些字段既服务第 5 屏，也服务第 6 屏总结。

- [ ] **Step 5: 运行类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add .vitepress/theme/components/PlanningFlowSimulator.vue .vitepress/theme/components/PlanningTreeCanvas.vue .vitepress/theme/components/PlanningFeedbackPanel.vue .vitepress/theme/data/planning-simulator-scenario.ts
git commit -m "feat(planning): add branching state transitions and replan feedback"
```

---

### Task 4: 把第 27 章升级为试点章节

**Files:**
- Modify: `docs/intermediate/27-planning-mechanism/index.md`
- Reference: `.vitepress/theme/components/ChapterLearningGuide.vue`
- Reference: `.vitepress/theme/components/ChapterActionPanel.vue`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 先写会失败的接入标记**

在 `docs/intermediate/27-planning-mechanism/index.md` 中插入：

```md
<PlanningFlowSimulator />
```

并保留原有：
- `<ChapterLearningGuide />`
- `<ChapterActionPanel />`

然后运行：

```bash
bun run check:chapter-experience
```

Expected: 可能 FAIL，因为脚本尚未要求新组件，或章节结构尚未完整。

- [ ] **Step 2: 按试点章节结构重组正文**

目标：
- 保留 frontmatter
- 保留导览与行动面板
- 在正文早段引入试点模拟器，位置应早于原有大段理论阐述
- 将原有 `PlanningTreeDemo` 下调为辅助对照，或删除以避免双重心智模型

建议结构：

```md
<ChapterLearningGuide />

## 这篇解决什么问题

<PlanningFlowSimulator />

## 把刚才的体验映射回 Planning 机制

...保留并压缩原有理论说明...

<ChapterActionPanel ... />
```

- [ ] **Step 3: 压缩重复解释**

检查并删除这些重复：
- 模拟器已经讲过的“先规划 vs 直接执行”
- 模拟器已经讲过的“任务拆粗/拆细”
- 模拟器已经讲过的“重规划为什么重要”

保留：
- 更高层的工程判断
- 与 ReAct / Adaptive Planning 的关系
- 教学代码映射

- [ ] **Step 4: 跑章节体验校验**

Run:

```bash
bun run check:chapter-experience
```

Expected: PASS 或仅剩脚本规则待更新。

- [ ] **Step 5: 提交**

```bash
git add docs/intermediate/27-planning-mechanism/index.md
git commit -m "feat(planning): integrate dynamic simulator into chapter 27"
```

---

### Task 5: 扩展校验脚本，锁住试点接入

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 先写会失败的校验条件**

在 `scripts/check-chapter-experience.mjs` 中为第 27 章增加规则：

```js
if (relativePath === 'docs/intermediate/27-planning-mechanism/index.md' &&
    !pageContent.includes('<PlanningFlowSimulator')) {
  issues.push('第27章尚未接入 PlanningFlowSimulator 试点组件')
}
```

然后运行：

```bash
bun run check:chapter-experience
```

Expected: 若组件未正确接入则 FAIL。

- [ ] **Step 2: 补充主题入口校验**

增加：

```js
if (!themeIndex.includes('PlanningFlowSimulator')) {
  issues.push('主题入口尚未注册 PlanningFlowSimulator')
}
```

- [ ] **Step 3: 再跑一次校验**

Run:

```bash
bun run check:chapter-experience
```

Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add scripts/check-chapter-experience.mjs
git commit -m "test(planning): enforce simulator integration checks"
```

---

### Task 6: 做完整验证并收尾

**Files:**
- Modify: none unless verification fails
- Test: `bun run typecheck`, `bun run check:chapter-experience`, `bun run build:strict`

- [ ] **Step 1: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 2: 跑章节体验校验**

Run:

```bash
bun run check:chapter-experience
```

Expected: PASS

- [ ] **Step 3: 跑严格构建**

Run:

```bash
bun run build:strict
```

Expected: PASS，并且第 27 章页面可以正常构建

- [ ] **Step 4: 人工抽查第 27 章**

检查：
- 6 屏流程是否能完整走通
- 第 5 屏重规划是否一眼可见
- 第 6 屏总结是否明确给出复刻提示
- 页面没有退化成信息墙

- [ ] **Step 5: 最终提交**

```bash
git add .vitepress/theme/components .vitepress/theme/data .vitepress/theme/index.ts docs/intermediate/27-planning-mechanism/index.md scripts/check-chapter-experience.mjs
git commit -m "feat(planning): ship dynamic chapter 27 simulator"
```

---

## Notes for Executor

- 不要把试点做成全站通用框架，先为第 27 章做成立即可
- 不要在第一版引入复杂拖拽、自由输入或无限分支
- 每屏只有一个关键决策，保持教学节奏
- 优先保证“看得懂 + 记得住”，再追求花哨视觉
- 若 `PlanningTreeDemo` 与新模拟器心智模型冲突，优先保留新模拟器

## Verification Summary

最低验证标准：

- 第 27 章存在新的 `PlanningFlowSimulator`
- 模拟器包含任务挑战、拆解、执行、重规划、总结 6 屏
- 用户选择能驱动任务树和反馈变化
- 第 27 章仍通过现有章节体验校验与严格构建
