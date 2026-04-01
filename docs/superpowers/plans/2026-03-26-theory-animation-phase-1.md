# Theory Animation Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为理论篇第一批 5 个高优先级章节补齐可复用的交互动画骨架与对应章节动画，并把组件接入 VitePress 文档页面。

**Architecture:** 先抽象一个通用的 `FlowScenarioDemo` 骨架组件，负责时间线/分支/拓扑三类演示的共享渲染与播放控制；再为每个章节创建薄包装组件，只提供 `scenario` 数据。最后把组件注册到主题入口，并将对应 Markdown 插入到 5 个目标章节的合适位置。

**Tech Stack:** Vue 3 `<script setup>`、VitePress 主题异步组件注册、TypeScript、Bun 构建与类型检查。

---

## File Map

- Create: `.vitepress/theme/components/flowScenario.ts`
  - 通用类型定义：`FlowScenario`、`FlowLane`、`FlowStep`、`FlowEdge`
- Create: `.vitepress/theme/components/FlowScenarioDemo.vue`
  - 通用动画骨架：播放控制、步骤高亮、侧边说明面板
- Create: `.vitepress/theme/components/TransactionEffectQueueDemo.vue`
  - 第 10 章事务与副效应时序动画
- Create: `.vitepress/theme/components/ExtensionDecisionFlowDemo.vue`
  - 第 13 章扩展机制选型决策动画
- Create: `.vitepress/theme/components/TaskExecutionPathDemo.vue`
  - 第 3 章主链路执行路径动画
- Create: `.vitepress/theme/components/TestingLayersDemo.vue`
  - 第 15 章质量分层动画
- Create: `.vitepress/theme/components/LocalCloudTopologyDemo.vue`
  - 第 14 章本地与云端拓扑动画
- Modify: `.vitepress/theme/index.ts`
  - 注册新增异步组件
- Modify: `docs/02-agent-core/index.md`
  - 插入 `TaskExecutionPathDemo`
- Modify: `docs/09-data-persistence/index.md`
  - 插入 `TransactionEffectQueueDemo`
- Modify: `docs/12-plugins-extensions/index.md`
  - 插入 `ExtensionDecisionFlowDemo`
- Modify: `docs/13-deployment-infrastructure/index.md`
  - 插入 `LocalCloudTopologyDemo`
- Modify: `docs/14-testing-quality/index.md`
  - 插入 `TestingLayersDemo`

### Task 1: 建立通用 Flow 数据模型

**Files:**
- Create: `.vitepress/theme/components/flowScenario.ts`
- Reference: `.vitepress/theme/components/McpHandshake.vue`
- Reference: `.vitepress/theme/components/PermissionFlow.vue`

- [ ] **Step 1: 定义通用类型**

在 `.vitepress/theme/components/flowScenario.ts` 中定义：

```ts
export type FlowVariant = 'timeline' | 'decision' | 'topology'

export interface FlowLane {
  id: string
  label: string
}

export interface FlowStep {
  id: string
  title: string
  detail: string
  lane: string
  kind?: 'normal' | 'decision' | 'async' | 'commit' | 'warning'
  codeLabel?: string
  emphasis?: string
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
  style?: 'solid' | 'dashed'
}

export interface FlowScenario {
  title: string
  summary: string
  lanes: FlowLane[]
  steps: FlowStep[]
  edges: FlowEdge[]
}
```

- [ ] **Step 2: 检查命名是否与现有组件风格一致**

核对：
- 是否全部使用单引号
- 是否不加分号
- 是否导出名清晰且与组件名一致

- [ ] **Step 3: 运行最小类型检查**

Run: `bun run typecheck`
Expected: 不因 `flowScenario.ts` 新增类型而报错

- [ ] **Step 4: Commit**

```bash
git add .vitepress/theme/components/flowScenario.ts
git commit -m "feat(theme): add shared flow scenario types"
```

### Task 2: 实现通用动画骨架 FlowScenarioDemo

**Files:**
- Create: `.vitepress/theme/components/FlowScenarioDemo.vue`
- Reference: `.vitepress/theme/components/McpHandshake.vue`
- Reference: `.vitepress/theme/components/AgentDispatchDemo.vue`
- Reference: `.vitepress/theme/components/PermissionFlow.vue`
- Reference: `.vitepress/theme/components/flowScenario.ts`

- [ ] **Step 1: 先写组件接口**

在组件中声明：

```ts
const props = withDefaults(defineProps<{
  scenario: FlowScenario
  variant?: FlowVariant
  autoplay?: boolean
  intervalMs?: number
}>(), {
  variant: 'timeline',
  autoplay: true,
  intervalMs: 1400,
})
```

- [ ] **Step 2: 写最小状态机**

实现：
- `activeIndex`
- `activeStep`
- `visibleStepIds`
- `next()`
- `prev()`
- `restart()`
- `play()`
- `stop()`

要求：
- 默认自动播放
- 支持重新播放
- 播放到最后自动停止

- [ ] **Step 3: 写最小模板**

模板至少包含：
- 头部标题和摘要
- 左侧 lane + step 主区域
- 右侧当前步骤说明
- 底部控制按钮与进度状态

第一版不要实现复杂 SVG 连线，只做步骤卡片高亮。

- [ ] **Step 4: 写样式**

复用现有风格：
- 外层容器和 footer 参考 `McpHandshake.vue`
- 按钮和卡片交互参考 `AgentDispatchDemo.vue`
- 决策态样式参考 `PermissionFlow.vue`

样式约束：
- 适配窄屏
- 不引入全局污染
- 使用 `scoped`

- [ ] **Step 5: 用一个内联假数据自测渲染**

在组件本地临时写一个最小 `scenario` 进行渲染验证，确认：
- 首屏能显示第一个步骤
- `下一步` 能推进
- `重新播放` 能复位

- [ ] **Step 6: 运行类型检查**

Run: `bun run typecheck`
Expected: `FlowScenarioDemo.vue` 无类型错误

- [ ] **Step 7: Commit**

```bash
git add .vitepress/theme/components/FlowScenarioDemo.vue .vitepress/theme/components/flowScenario.ts
git commit -m "feat(theme): add reusable flow scenario demo"
```

### Task 3: 实现第 10 章事务与副效应动画

**Files:**
- Create: `.vitepress/theme/components/TransactionEffectQueueDemo.vue`
- Reference: `.vitepress/theme/components/FlowScenarioDemo.vue`
- Modify: `docs/09-data-persistence/index.md`

- [ ] **Step 1: 编写 `transactionEffectScenario` 数据**

场景必须包含 4 条 lane：
- `请求`
- `数据库事务`
- `副效应队列`
- `客户端`

步骤至少包含：
- 收到写入请求
- 事务内写库
- 登记副效应
- 事务提交
- 执行副效应
- 客户端收到更新

- [ ] **Step 2: 创建薄包装组件**

组件只做两件事：
- 导入 `FlowScenarioDemo`
- 传入 `scenario` 与合适的 `variant='timeline'`

- [ ] **Step 3: 在文档中插入动画说明与组件**

在 `docs/09-data-persistence/index.md` 的 `## 10.6 Database 命名空间：事务与副效应分离` 后插入：

```md
**时序动画：** 观察一次消息写入如何先进入事务，再登记副效应，并在提交后统一触发通知，重点看为什么“先通知后落库”会出问题。

<TransactionEffectQueueDemo />
```

- [ ] **Step 4: 运行严格构建**

Run: `bun run build:strict`
Expected: 文档能正常编译，组件正常注册前可以先预期失败于“组件未注册”

- [ ] **Step 5: Commit**

```bash
git add .vitepress/theme/components/TransactionEffectQueueDemo.vue docs/09-data-persistence/index.md
git commit -m "feat(docs): add transaction effect queue demo"
```

### Task 4: 实现第 13 章扩展机制决策动画

**Files:**
- Create: `.vitepress/theme/components/ExtensionDecisionFlowDemo.vue`
- Reference: `.vitepress/theme/components/FlowScenarioDemo.vue`
- Modify: `docs/12-plugins-extensions/index.md`

- [ ] **Step 1: 编写 `extensionDecisionScenario` 数据**

关键节点必须覆盖：
- 是否需要运行逻辑
- 是否需要教模型工作流
- 是否只是固定模板
- 是否接外部系统

结果节点必须覆盖：
- `Plugin`
- `Skill`
- `Command`
- `MCP`
- `编辑器扩展`

- [ ] **Step 2: 创建薄包装组件**

使用 `variant='decision'`。

- [ ] **Step 3: 在文档中插入组件**

在 `docs/12-plugins-extensions/index.md` 的 `## 13.1 扩展体系全景` 后插入：

```md
**决策动画：** 从“我想扩展什么能力”出发，沿着需求分支走一遍，快速判断应该写 Plugin、Skill、Command、MCP 还是编辑器扩展。

<ExtensionDecisionFlowDemo />
```

- [ ] **Step 4: 运行类型检查**

Run: `bun run typecheck`
Expected: 组件类型通过

- [ ] **Step 5: Commit**

```bash
git add .vitepress/theme/components/ExtensionDecisionFlowDemo.vue docs/12-plugins-extensions/index.md
git commit -m "feat(docs): add extension decision flow demo"
```

### Task 5: 实现第 3 章主链路执行路径动画

**Files:**
- Create: `.vitepress/theme/components/TaskExecutionPathDemo.vue`
- Reference: `.vitepress/theme/components/FlowScenarioDemo.vue`
- Modify: `docs/02-agent-core/index.md`

- [ ] **Step 1: 编写 `taskExecutionScenario` 数据**

至少覆盖：
- 用户输入任务
- 入口初始化
- 进入共享服务边界
- 创建或获取会话
- System Prompt 装配
- 主执行循环
- 工具执行
- 消息持久化与回流

- [ ] **Step 2: 创建薄包装组件**

使用 `variant='timeline'`。

- [ ] **Step 3: 在文档中插入组件**

在 `docs/02-agent-core/index.md` 的 `## 3.4 一次任务的完整代码路径` 后插入：

```md
**主链路动画：** 用一次真实任务把入口初始化、会话创建、Prompt 装配、主执行循环、工具执行与消息回流串起来。

<TaskExecutionPathDemo />
```

- [ ] **Step 4: 运行类型检查**

Run: `bun run typecheck`
Expected: 组件类型通过

- [ ] **Step 5: Commit**

```bash
git add .vitepress/theme/components/TaskExecutionPathDemo.vue docs/02-agent-core/index.md
git commit -m "feat(docs): add task execution path demo"
```

### Task 6: 实现第 15 章质量分层动画

**Files:**
- Create: `.vitepress/theme/components/TestingLayersDemo.vue`
- Reference: `.vitepress/theme/components/FlowScenarioDemo.vue`
- Modify: `docs/14-testing-quality/index.md`

- [ ] **Step 1: 编写 `testingLayersScenario` 数据**

必须覆盖 lane：
- `变更输入`
- `静态门槛`
- `核心运行时`
- `前端状态`
- `真实流程`

必须覆盖步骤：
- 代码变更
- typecheck / 脚本校验
- runtime fixture 测试
- 前端单元测试
- Playwright E2E
- 质量收口

- [ ] **Step 2: 创建薄包装组件**

优先使用 `variant='topology'` 或 `variant='timeline'`，选一种最少改样式的实现。

- [ ] **Step 3: 在文档中插入组件**

在 `docs/14-testing-quality/index.md` 的 `## 15.1 核心运行时测试` 前插入：

```md
**分层演示：** 一次代码变更会经过哪些质量关口，分别由 runtime test、前端单测、E2E、typecheck 与脚本校验覆盖什么问题。

<TestingLayersDemo />
```

- [ ] **Step 4: 运行严格构建**

Run: `bun run build:strict`
Expected: 文档和组件编译通过

- [ ] **Step 5: Commit**

```bash
git add .vitepress/theme/components/TestingLayersDemo.vue docs/14-testing-quality/index.md
git commit -m "feat(docs): add testing layers demo"
```

### Task 7: 实现第 14 章本地与云端拓扑动画

**Files:**
- Create: `.vitepress/theme/components/LocalCloudTopologyDemo.vue`
- Reference: `.vitepress/theme/components/FlowScenarioDemo.vue`
- Modify: `docs/13-deployment-infrastructure/index.md`

- [ ] **Step 1: 编写 `localCloudTopologyScenario` 数据**

必须覆盖 lane：
- 本地产品面
- 共享核心
- 云端产品面
- 基础设施

必须覆盖节点：
- 本地 `opencode / app / desktop`
- 本地 server
- `packages/function`
- `packages/console`
- `sst.config.ts / infra`

- [ ] **Step 2: 创建薄包装组件**

使用 `variant='topology'`。

- [ ] **Step 3: 在文档中插入组件**

在 `docs/13-deployment-infrastructure/index.md` 的 `## 14.1 本地运行时与开发环境` 后插入：

```md
**架构动画：** 从“本地产品面”切换到“云端产品面”，看清 `packages/opencode`、`packages/function`、`packages/console` 与 `infra/` 的真实边界。

<LocalCloudTopologyDemo />
```

- [ ] **Step 4: 运行类型检查**

Run: `bun run typecheck`
Expected: 组件类型通过

- [ ] **Step 5: Commit**

```bash
git add .vitepress/theme/components/LocalCloudTopologyDemo.vue docs/13-deployment-infrastructure/index.md
git commit -m "feat(docs): add local cloud topology demo"
```

### Task 8: 注册所有新增组件并做全量验证

**Files:**
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`
- Test: `bun run build:strict`

- [ ] **Step 1: 在主题入口注册新增异步组件**

在 `.vitepress/theme/index.ts` 的 `asyncGlobalComponents` 中新增：

```ts
['TransactionEffectQueueDemo', asyncComponent(() => import('./components/TransactionEffectQueueDemo.vue'))],
['ExtensionDecisionFlowDemo', asyncComponent(() => import('./components/ExtensionDecisionFlowDemo.vue'))],
['TaskExecutionPathDemo', asyncComponent(() => import('./components/TaskExecutionPathDemo.vue'))],
['TestingLayersDemo', asyncComponent(() => import('./components/TestingLayersDemo.vue'))],
['LocalCloudTopologyDemo', asyncComponent(() => import('./components/LocalCloudTopologyDemo.vue'))],
```

- [ ] **Step 2: 运行类型检查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: 运行严格构建**

Run: `bun run build:strict`
Expected: PASS

- [ ] **Step 4: 手动检查渲染结果**

Run: `bun run dev`
Expected:
- 5 个章节页面能正常打开
- 动画容器不溢出
- 按钮可点击
- 窄屏下不出现严重布局错位

- [ ] **Step 5: Commit**

```bash
git add .vitepress/theme/index.ts .vitepress/theme/components docs/02-agent-core/index.md docs/09-data-persistence/index.md docs/12-plugins-extensions/index.md docs/13-deployment-infrastructure/index.md docs/14-testing-quality/index.md
git commit -m "feat(docs): add phase 1 theory animations"
```

## Verification Checklist

- [ ] `FlowScenarioDemo` 支持自动播放、手动切换、重新播放
- [ ] 5 个场景组件均为“薄包装”，没有重复实现播放逻辑
- [ ] `.vitepress/theme/index.ts` 已完成注册
- [ ] 5 个目标章节均已插入动画说明与组件标签
- [ ] `bun run typecheck` 通过
- [ ] `bun run build:strict` 通过
- [ ] 至少人工检查 1 次窄屏显示

## Execution Notes

- 第一版先不做复杂 SVG 连线，避免把时间耗在视觉细节上
- 所有组件注释和文档文案使用中文
- 保持现有 VitePress 主题风格，不引入独立设计系统
- 若 `variant='decision'` 与 `variant='topology'` 在第一版成本过高，可先统一走 `timeline` 样式，后续再细化
