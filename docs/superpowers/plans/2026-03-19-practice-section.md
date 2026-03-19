# 实践篇模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 VitePress 电子书中新增「AI Agent 实战手册」实践篇，拥有独立首页（终端/Hacker 深色风）、独立侧边栏（23章7阶段）和 5 个新 Vue 组件。

**Architecture:** 单 VitePress 实例，`sidebar` 从平铺数组改为路径键对象，`/practice/` 前缀对应独立侧边栏。实践篇首页通过 `pageClass: practice-page` 隔离橙色暗色主题，章节页继承主书 Cyber Teal。

**Tech Stack:** VitePress 1.5, Vue 3 SFC, TypeScript, Bun

---

## 文件变更地图

| 操作 | 文件 | 说明 |
|------|------|------|
| Modify | `.vitepress/theme/components/types.ts` | 新增 4 个 Props 接口 |
| Create | `.vitepress/theme/components/PracticeTerminalHero.vue` | Hero 终端动画 |
| Create | `.vitepress/theme/components/PracticePhaseGrid.vue` | Phase 卡片网格 |
| Create | `.vitepress/theme/components/PracticeTagCloud.vue` | 技术标签云 |
| Create | `.vitepress/theme/components/ProjectCard.vue` | 章节项目信息卡 |
| Create | `.vitepress/theme/components/RunCommand.vue` | 运行命令展示块 |
| Modify | `.vitepress/theme/index.ts` | 注册 5 个新组件 |
| Modify | `.vitepress/theme/custom.css` | 新增 `.practice-page` CSS 变量 |
| Modify | `.vitepress/config.mts` | sidebar 转对象格式 + practice 侧边栏 + nav 项 |
| Modify | `docs/index.md` | 新增实践篇入口按钮 |
| Create | `docs/practice/index.md` | 实践篇独立首页 |
| Create | `docs/practice/p01-minimal-agent/index.md` | P01 示范章节（完整内容） |
| Create | `docs/practice/p02-multi-turn/index.md` ~ `docs/practice/p23-production/index.md` | P02–P23 占位章节 |

所有路径相对于 `docs/book/`。

---

## Task 1: 扩展 types.ts

**Files:**
- Modify: `.vitepress/theme/components/types.ts`

- [ ] **Step 1: 在 types.ts 末尾追加 4 个新接口**

```ts
// 追加到 .vitepress/theme/components/types.ts 末尾

export interface PracticePhase {
  id: number
  title: string
  subtitle: string
  chapterCount: number
  link: string
}

export interface PracticeTagCloudProps {
  tags: string[]
}

export interface ProjectCardProps {
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  prerequisites: string[]
  tags: string[]
}

export interface RunCommandProps {
  command: string
}
```

- [ ] **Step 2: 确认无 TypeScript 错误**

```bash
cd /Users/zhangyanhua/AI/opencode/docs/book && bun run build 2>&1 | head -30
```

Expected: 无 type error（此时还没有引用新类型，不会报错）

- [ ] **Step 3: Commit**

```bash
git add .vitepress/theme/components/types.ts
git commit -m "feat(practice): add types for practice section components"
```

---

## Task 2: 创建 PracticeTerminalHero.vue

**Files:**
- Create: `.vitepress/theme/components/PracticeTerminalHero.vue`

该组件无 Props，硬编码一段 `bun run p01-minimal-agent.ts` 的执行动画，每 80ms 打印一个字符，行末暂停 600ms，全部打完后延迟 2000ms 重播。

- [ ] **Step 1: 创建组件文件**

```vue
<!-- .vitepress/theme/components/PracticeTerminalHero.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const LINES = [
  { text: '$ bun run p01-minimal-agent.ts', color: '#f97316' },
  { text: '✓ Anthropic SDK initialized', color: '#86efac' },
  { text: '✓ Tool registered: get_weather', color: '#86efac' },
  { text: 'Agent: 我需要查询北京的天气...', color: '#93c5fd' },
  { text: 'Tool call: get_weather({ city: "北京" })', color: '#d1d5db' },
  { text: 'Tool result: { temp: 22, condition: "晴" }', color: '#fbbf24' },
  { text: 'Agent: 北京今天晴，气温 22°C，适合出行。', color: '#93c5fd' },
]

const displayedLines = ref<Array<{ text: string; color: string; done: boolean }>>([])
let timer: ReturnType<typeof setTimeout> | null = null

function sleep(ms: number) {
  return new Promise<void>(resolve => { timer = setTimeout(resolve, ms) })
}

async function animate() {
  displayedLines.value = []
  for (const line of LINES) {
    const entry = { text: '', color: line.color, done: false }
    displayedLines.value.push(entry)
    for (const char of line.text) {
      entry.text += char
      await sleep(55)
    }
    entry.done = true
    await sleep(500)
  }
  await sleep(2000)
  animate()
}

onMounted(() => { animate() })
onUnmounted(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div class="terminal-hero">
    <div class="terminal-titlebar">
      <span class="dot red" />
      <span class="dot yellow" />
      <span class="dot green" />
      <span class="terminal-title">agent-workshop ~ bash</span>
    </div>
    <div class="terminal-body">
      <div
        v-for="(line, i) in displayedLines"
        :key="i"
        class="terminal-line"
        :style="{ color: line.color }"
      >
        {{ line.text }}<span v-if="i === displayedLines.length - 1 && !line.done" class="cursor">▋</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-hero {
  background: #1c1917;
  border: 1px solid #292524;
  border-radius: 10px;
  max-width: 560px;
  margin: 0 auto 28px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  overflow: hidden;
}

.terminal-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #292524;
  border-bottom: 1px solid #3a3330;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot.red    { background: #ef4444; }
.dot.yellow { background: #eab308; }
.dot.green  { background: #22c55e; }

.terminal-title {
  color: #57534e;
  font-size: 11px;
  margin-left: 8px;
}

.terminal-body {
  padding: 16px 20px;
  min-height: 160px;
  line-height: 1.9;
}

.terminal-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
  color: #f97316;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add .vitepress/theme/components/PracticeTerminalHero.vue
git commit -m "feat(practice): add PracticeTerminalHero animation component"
```

---

## Task 3: 创建 PracticePhaseGrid.vue

**Files:**
- Create: `.vitepress/theme/components/PracticePhaseGrid.vue`

接收 `phases: PracticePhase[]`，渲染 4 列卡片网格，每格展示阶段名、章节数、进度小方块（橙色填充 = 本阶段，灰色 = 未开始）。

- [ ] **Step 1: 创建组件文件**

```vue
<!-- .vitepress/theme/components/PracticePhaseGrid.vue -->
<script setup lang="ts">
import type { PracticePhase } from './types'

const props = defineProps<{ phases: PracticePhase[] }>()
</script>

<template>
  <div class="phase-grid">
    <a
      v-for="phase in phases"
      :key="phase.id"
      :href="phase.link"
      class="phase-card"
    >
      <div class="phase-id">Phase {{ phase.id }}</div>
      <div class="phase-title">{{ phase.title }}</div>
      <div class="phase-subtitle">{{ phase.subtitle }}</div>
      <div class="phase-dots">
        <span
          v-for="n in phase.chapterCount"
          :key="n"
          class="dot"
        />
      </div>
    </a>
  </div>
</template>

<style scoped>
.phase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin: 24px 0;
}

.phase-card {
  background: #1c1917;
  border: 1px solid #292524;
  border-radius: 8px;
  padding: 16px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s;
  display: block;
}

.phase-card:hover {
  border-color: #ea580c;
  transform: translateY(-2px);
}

.phase-id {
  color: #f97316;
  font-size: 11px;
  font-family: monospace;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.phase-title {
  color: #f5f5f4;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.phase-subtitle {
  color: #78716c;
  font-size: 11px;
  margin-bottom: 10px;
  line-height: 1.5;
}

.phase-dots {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dot {
  width: 18px;
  height: 4px;
  background: #ea580c;
  border-radius: 2px;
  opacity: 0.8;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add .vitepress/theme/components/PracticePhaseGrid.vue
git commit -m "feat(practice): add PracticePhaseGrid component"
```

---

## Task 4: 创建 PracticeTagCloud.vue

**Files:**
- Create: `.vitepress/theme/components/PracticeTagCloud.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<!-- .vitepress/theme/components/PracticeTagCloud.vue -->
<script setup lang="ts">
import type { PracticeTagCloudProps } from './types'

defineProps<PracticeTagCloudProps>()
</script>

<template>
  <div class="tag-cloud">
    <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
  </div>
</template>

<style scoped>
.tag-cloud {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.tag {
  background: #1c1917;
  color: #f97316;
  border: 1px solid #292524;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  transition: border-color 0.15s;
}

.tag:hover {
  border-color: #f97316;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add .vitepress/theme/components/PracticeTagCloud.vue
git commit -m "feat(practice): add PracticeTagCloud component"
```

---

## Task 5: 创建 ProjectCard.vue

**Files:**
- Create: `.vitepress/theme/components/ProjectCard.vue`

每章顶部的项目信息卡，展示可交付物、难度、预计时长、前置章节和技术标签。

- [ ] **Step 1: 创建组件文件**

```vue
<!-- .vitepress/theme/components/ProjectCard.vue -->
<script setup lang="ts">
import type { ProjectCardProps } from './types'

const props = defineProps<ProjectCardProps>()

const difficultyLabel: Record<ProjectCardProps['difficulty'], string> = {
  beginner:     '入门',
  intermediate: '进阶',
  advanced:     '高阶',
}

const difficultyColor: Record<ProjectCardProps['difficulty'], string> = {
  beginner:     '#22c55e',
  intermediate: '#f97316',
  advanced:     '#ef4444',
}
</script>

<template>
  <div class="project-card">
    <div class="project-card-header">
      <div class="project-title">{{ title }}</div>
      <div class="project-meta">
        <span class="difficulty" :style="{ color: difficultyColor[difficulty] }">
          ● {{ difficultyLabel[difficulty] }}
        </span>
        <span class="duration">⏱ {{ duration }}</span>
      </div>
    </div>
    <div v-if="prerequisites.length" class="project-row">
      <span class="label">前置：</span>
      <span v-for="p in prerequisites" :key="p" class="prereq">{{ p }}</span>
    </div>
    <div v-if="tags.length" class="project-row">
      <span class="label">技术：</span>
      <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 10px;
  padding: 16px 20px;
  margin: 0 0 28px;
  background: var(--vp-c-bg-soft);
}

.project-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.project-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--vp-c-text-1);
}

.project-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  white-space: nowrap;
}

.difficulty {
  font-weight: 500;
}

.duration {
  color: var(--vp-c-text-2);
}

.project-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.prereq, .tag {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: monospace;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add .vitepress/theme/components/ProjectCard.vue
git commit -m "feat(practice): add ProjectCard component for chapter headers"
```

---

## Task 6: 创建 RunCommand.vue

**Files:**
- Create: `.vitepress/theme/components/RunCommand.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<!-- .vitepress/theme/components/RunCommand.vue -->
<script setup lang="ts">
import type { RunCommandProps } from './types'
import { ref } from 'vue'

const props = defineProps<RunCommandProps>()

const copied = ref(false)

function copy() {
  navigator.clipboard.writeText(props.command).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  })
}
</script>

<template>
  <div class="run-command">
    <span class="prompt">$</span>
    <code class="command-text">{{ command }}</code>
    <button class="copy-btn" @click="copy">
      {{ copied ? '已复制' : '复制' }}
    </button>
  </div>
</template>

<style scoped>
.run-command {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1c1917;
  border: 1px solid #292524;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 20px 0;
  font-family: monospace;
}

.prompt {
  color: #f97316;
  font-size: 14px;
  user-select: none;
}

.command-text {
  flex: 1;
  color: #f5f5f4;
  font-size: 14px;
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.copy-btn {
  background: #292524;
  color: #a8a29e;
  border: 1px solid #44403c;
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.copy-btn:hover {
  color: #f97316;
  border-color: #f97316;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add .vitepress/theme/components/RunCommand.vue
git commit -m "feat(practice): add RunCommand component with copy button"
```

---

## Task 7: 注册 5 个新组件

**Files:**
- Modify: `.vitepress/theme/index.ts`

- [ ] **Step 1: 在 index.ts 中添加 5 个 import 和 app.component 注册**

在现有最后一个 import（`TaskDelegationDemo`）之后追加：

```ts
import PracticeTerminalHero from './components/PracticeTerminalHero.vue'
import PracticePhaseGrid from './components/PracticePhaseGrid.vue'
import PracticeTagCloud from './components/PracticeTagCloud.vue'
import ProjectCard from './components/ProjectCard.vue'
import RunCommand from './components/RunCommand.vue'
```

在 `enhanceApp` 的最后一行 `app.component('TaskDelegationDemo', ...)` 之后追加：

```ts
app.component('PracticeTerminalHero', PracticeTerminalHero)
app.component('PracticePhaseGrid', PracticePhaseGrid)
app.component('PracticeTagCloud', PracticeTagCloud)
app.component('ProjectCard', ProjectCard)
app.component('RunCommand', RunCommand)
```

- [ ] **Step 2: Commit**

```bash
git add .vitepress/theme/index.ts
git commit -m "feat(practice): register 5 new practice section components"
```

---

## Task 8: 更新 custom.css

**Files:**
- Modify: `.vitepress/theme/custom.css`

- [ ] **Step 1: 在 custom.css 末尾追加 `.practice-page` 主题覆盖**

```css
/* ===== 实践篇首页主题 (practice-page) ===== */
.practice-page {
  --vp-c-brand-1: #ea580c;
  --vp-c-brand-2: #f97316;
  --vp-c-brand-3: #c2410c;
  --vp-c-brand-soft: rgba(234, 88, 12, 0.12);
  --vp-home-hero-name-color: #f97316;
  --vp-home-hero-name-background: none;
  --vp-c-bg: #0c0a09;
  --vp-c-bg-soft: #1c1917;
  --vp-c-bg-mute: #292524;
  --vp-c-text-1: #f5f5f4;
  --vp-c-text-2: #a8a29e;
  --vp-c-text-3: #78716c;
  --vp-c-divider: #292524;
}

.practice-page .VPHero {
  background-image:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(234, 88, 12, 0.08) 0%, transparent 60%),
    linear-gradient(rgba(249, 115, 22, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(249, 115, 22, 0.04) 1px, transparent 1px);
  background-size: auto, 32px 32px, 32px 32px;
}

.practice-page .VPHero::after {
  background: linear-gradient(90deg, #ea580c, #f97316);
}

.practice-page .VPButton.brand {
  background: #ea580c;
  border-color: #ea580c;
  font-family: monospace;
}

.practice-page .VPButton.brand:hover {
  background: #c2410c;
  border-color: #c2410c;
  box-shadow: 0 4px 16px rgba(234, 88, 12, 0.35);
}
```

- [ ] **Step 2: Commit**

```bash
git add .vitepress/theme/custom.css
git commit -m "feat(practice): add practice-page dark orange theme to custom.css"
```

---

## Task 9: 改造 config.mts

**Files:**
- Modify: `.vitepress/config.mts`

这是最关键的一步：将现有平铺 `sidebar` 数组改为路径键对象，同时新增 practice 侧边栏和导航项。

- [ ] **Step 1: 将 `sidebar: [...]` 改为 `sidebar: { '/practice/': [...], '/': [...] }`**

将 `config.mts` 中的 `sidebar` 整块替换为：

```ts
sidebar: {
  '/practice/': [
    { text: '← 返回理论篇', link: '/' },
    { text: '课程介绍', link: '/practice/' },
    {
      text: 'Phase 1 — Agent 基础',
      collapsed: false,
      items: [
        { text: 'P1：最小 Agent — 工具调用核心机制', link: '/practice/p01-minimal-agent/' },
        { text: 'P2：多轮对话与上下文管理', link: '/practice/p02-multi-turn/' },
        { text: 'P3：流式输出与实时反馈', link: '/practice/p03-streaming/' },
        { text: 'P4：错误处理与重试策略', link: '/practice/p04-error-handling/' },
      ]
    },
    {
      text: 'Phase 2 — 记忆与知识系统',
      collapsed: false,
      items: [
        { text: 'P5：记忆系统架构', link: '/practice/p05-memory-arch/' },
        { text: 'P6：记忆增强检索', link: '/practice/p06-memory-retrieval/' },
        { text: 'P7：RAG 基础', link: '/practice/p07-rag-basics/' },
        { text: 'P8：GraphRAG', link: '/practice/p08-graphrag/' },
        { text: 'P9：混合检索策略', link: '/practice/p09-hybrid-retrieval/' },
      ]
    },
    {
      text: 'Phase 3 — 推理与规划',
      collapsed: false,
      items: [
        { text: 'P10：ReAct Loop 实现', link: '/practice/p10-react-loop/' },
        { text: 'P11：Planning 机制', link: '/practice/p11-planning/' },
        { text: 'P12：Reflection 模式', link: '/practice/p12-reflection/' },
      ]
    },
    {
      text: 'Phase 4 — 感知扩展',
      collapsed: false,
      items: [
        { text: 'P13：多模态智能体', link: '/practice/p13-multimodal/' },
        { text: 'P14：MCP 协议接入', link: '/practice/p14-mcp/' },
      ]
    },
    {
      text: 'Phase 5 — 多 Agent 协作',
      collapsed: false,
      items: [
        { text: 'P15：多 Agent 编排模式', link: '/practice/p15-multi-agent/' },
        { text: 'P16：子 Agent 与任务分解', link: '/practice/p16-subagent/' },
        { text: 'P17：Agent 间通信与状态共享', link: '/practice/p17-agent-comm/' },
      ]
    },
    {
      text: 'Phase 6 — 生产化',
      collapsed: false,
      items: [
        { text: 'P18：多模型路由与成本控制', link: '/practice/p18-model-routing/' },
        { text: 'P19：Agent 安全与防注入', link: '/practice/p19-security/' },
        { text: 'P20：可观测性与调试', link: '/practice/p20-observability/' },
        { text: 'P21：评估与基准测试', link: '/practice/p21-evaluation/' },
      ]
    },
    {
      text: 'Phase 7 — 综合实战',
      collapsed: false,
      items: [
        { text: 'P22：完整项目实战 — Code Review Agent', link: '/practice/p22-project/' },
        { text: 'P23：生产部署清单', link: '/practice/p23-production/' },
      ]
    },
  ],
  '/': [
    { text: '阅读地图', link: '/reading-map' },
    { text: '版本说明', link: '/version-notes' },
    { text: '术语表', link: '/glossary' },
    {
      text: '第一部分：AI Agent 基础',
      collapsed: false,
      items: [
        { text: '第1章：什么是 AI Agent', link: '/00-what-is-ai-agent/' },
        { text: '第2章：AI Agent 的核心组件', link: '/01-agent-basics/' },
      ]
    },
    {
      text: '第二部分：OpenCode 项目架构',
      collapsed: false,
      items: [
        { text: '第3章：OpenCode 项目介绍', link: '/02-agent-core/' },
      ]
    },
    {
      text: '第三部分：Agent 核心机制',
      collapsed: false,
      items: [
        { text: '第4章：工具系统', link: '/03-tool-system/' },
        { text: '第5章：会话管理', link: '/04-session-management/' },
        { text: '第6章：多模型支持', link: '/05-provider-system/' },
        { text: '第7章：MCP 协议集成', link: '/06-mcp-integration/' },
      ]
    },
    {
      text: '第四部分：OpenCode 深入主题',
      collapsed: false,
      items: [
        { text: '第8章：TUI 终端界面', link: '/07-tui-interface/' },
        { text: '第9章：HTTP API 服务器', link: '/08-http-api-server/' },
        { text: '第10章：数据持久化', link: '/09-data-persistence/' },
        { text: '第11章：多端 UI 开发', link: '/10-multi-platform-ui/' },
        { text: '第12章：代码智能', link: '/11-code-intelligence/' },
        { text: '第13章：插件与扩展', link: '/12-plugins-extensions/' },
        { text: '第14章：部署与基础设施', link: '/13-deployment-infrastructure/' },
        { text: '第15章：测试与质量保证', link: '/14-testing-quality/' },
        { text: '第16章：高级主题与最佳实践', link: '/15-advanced-topics/' },
      ]
    },
    {
      text: '第五部分：oh-my-openagent 插件系统',
      collapsed: false,
      items: [
        { text: '第17章：为什么需要多个 Agent？', link: '/oh-prelude/' },
        { text: '第18章：插件系统概述', link: '/16-plugin-overview/' },
        { text: '第19章：配置系统实战', link: '/oh-config/' },
        { text: '第20章：多模型编排系统', link: '/17-multi-model-orchestration/' },
        { text: '第21章：Hooks 三层架构', link: '/18-hooks-architecture/' },
        { text: '第22章：工具扩展系统', link: '/19-tool-extension/' },
        { text: '第23章：一条消息的完整旅程', link: '/oh-flow/' },
        { text: '第24章：实战案例与最佳实践', link: '/20-best-practices/' },
      ]
    },
  ],
},
```

- [ ] **Step 2: 在 nav 数组中，在「首页」和「阅读地图」之间插入实践篇项**

```ts
// nav 从：
{ text: '首页', link: '/' },
{ text: '阅读地图', link: '/reading-map' },

// 改为：
{ text: '首页', link: '/' },
{ text: '实践篇', link: '/practice/', activeMatch: '/practice/' },
{ text: '阅读地图', link: '/reading-map' },
```

- [ ] **Step 3: 验证构建无错误**

```bash
cd /Users/zhangyanhua/AI/opencode/docs/book && bun run build 2>&1 | tail -20
```

Expected: `build complete` 或 `✓ building client`，无 sidebar 相关错误

- [ ] **Step 4: Commit**

```bash
git add .vitepress/config.mts
git commit -m "feat(practice): convert sidebar to multi-path object, add practice nav"
```

---

## Task 10: 更新主书首页入口

**Files:**
- Modify: `docs/index.md`

- [ ] **Step 1: 在 hero.actions 中插入实践篇入口按钮**

在现有 `actions` 列表中，在「阅读地图」按钮之前插入：

```yaml
- theme: alt
  text: 动手实践篇 →
  link: /practice/
```

完整 actions 应为：

```yaml
actions:
  - theme: brand
    text: 开始阅读
    link: /00-what-is-ai-agent/index
  - theme: brand
    text: Star 支持本书
    link: https://github.com/qqzhangyanhua/learn-opencode-agent
  - theme: alt
    text: 动手实践篇 →
    link: /practice/
  - theme: alt
    text: 阅读地图
    link: /reading-map
  - theme: alt
    text: 查看 OpenCode 源码
    link: https://github.com/anomalyco/opencode/tree/dev
```

- [ ] **Step 2: Commit**

```bash
git add docs/index.md
git commit -m "feat(practice): add practice section entry button on main homepage"
```

---

## Task 11: 创建实践篇首页

**Files:**
- Create: `docs/practice/index.md`

- [ ] **Step 1: 创建 practice 目录和 index.md**

```bash
mkdir -p /Users/zhangyanhua/AI/opencode/docs/book/docs/practice
```

```md
---
layout: home
title: AI Agent 实战手册
description: 23 个项目，每章一个可运行的 TypeScript Agent，从工具调用到生产部署全覆盖
pageClass: practice-page
---

<script setup>
import PracticeTerminalHero from '../../.vitepress/theme/components/PracticeTerminalHero.vue'
import PracticePhaseGrid from '../../.vitepress/theme/components/PracticePhaseGrid.vue'
import PracticeTagCloud from '../../.vitepress/theme/components/PracticeTagCloud.vue'
</script>

<div class="practice-hero-section">

<PracticeTerminalHero />

# AI Agent 实战手册

**23 个项目 · 每章可运行 · Anthropic SDK + TypeScript**

<div class="practice-actions">
  <a href="/practice/p01-minimal-agent/" class="btn-primary">▶ bun run p01</a>
  <a href="#phases" class="btn-secondary">课程大纲</a>
  <a href="/" class="btn-secondary">← 返回理论篇</a>
</div>

</div>

## 课程阶段 {#phases}

<PracticePhaseGrid :phases="[
  { id: 1, title: 'Agent 基础', subtitle: '工具调用 / 多轮对话 / 流式输出 / 错误处理', chapterCount: 4, link: '/practice/p01-minimal-agent/' },
  { id: 2, title: '记忆与知识', subtitle: '记忆系统 / 记忆增强检索 / RAG / GraphRAG', chapterCount: 5, link: '/practice/p05-memory-arch/' },
  { id: 3, title: '推理与规划', subtitle: 'ReAct Loop / Planning / Reflection', chapterCount: 3, link: '/practice/p10-react-loop/' },
  { id: 4, title: '感知扩展', subtitle: '多模态智能体 / MCP 协议接入', chapterCount: 2, link: '/practice/p13-multimodal/' },
  { id: 5, title: '多 Agent 协作', subtitle: '编排模式 / 子 Agent / 通信协议', chapterCount: 3, link: '/practice/p15-multi-agent/' },
  { id: 6, title: '生产化', subtitle: '模型路由 / 安全 / 可观测性 / 评估', chapterCount: 4, link: '/practice/p18-model-routing/' },
  { id: 7, title: '综合实战', subtitle: 'Code Review Agent 完整项目 / 部署清单', chapterCount: 2, link: '/practice/p22-project/' },
]" />

## 技术覆盖

<PracticeTagCloud :tags="[
  'Anthropic SDK', 'Tool Calling', 'Streaming', 'Multi-turn',
  'Memory System', 'RAG', 'GraphRAG', 'Hybrid Retrieval',
  'ReAct', 'Planning', 'Reflection', 'Multimodal',
  'MCP', 'Multi-Agent', 'Cost Control', 'Security',
  'Observability', 'Evaluation', 'Production Deploy',
]" />

<style scoped>
.practice-hero-section {
  text-align: center;
  padding: 60px 24px 40px;
}

.practice-hero-section h1 {
  font-size: 2.4em;
  font-weight: 700;
  color: #f5f5f4;
  margin: 16px 0 8px;
  letter-spacing: -0.02em;
}

.practice-hero-section p {
  color: #a8a29e;
  font-size: 15px;
  margin-bottom: 28px;
}

.practice-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

.btn-primary {
  background: #ea580c;
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.2s, transform 0.2s;
}

.btn-primary:hover {
  background: #c2410c;
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  color: #a8a29e;
  border: 1px solid #44403c;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}

.btn-secondary:hover {
  border-color: #f97316;
  color: #f97316;
}
</style>
```

- [ ] **Step 2: 验证页面可访问**

```bash
cd /Users/zhangyanhua/AI/opencode/docs/book && bun run dev
# 打开 http://localhost:5173/practice/ 确认页面渲染正常后，Ctrl+C 停止服务器
```

- [ ] **Step 3: Commit**

```bash
git add docs/practice/index.md
git commit -m "feat(practice): add practice section homepage with terminal hero"
```

---

## Task 12: 创建 P01 示范章节

**Files:**
- Create: `docs/practice/p01-minimal-agent/index.md`

P01 是所有后续章节的模板参考，内容需完整。

- [ ] **Step 1: 创建目录和 index.md**

```bash
mkdir -p /Users/zhangyanhua/AI/opencode/docs/book/docs/practice/p01-minimal-agent
```

```md
---
title: P1：最小 Agent — 工具调用核心机制
description: 用 80 行 TypeScript 构建你的第一个可运行 Agent，理解工具调用的完整生命周期
---

<ProjectCard
  title="你将构建：一个可以查询天气的最小 Agent"
  difficulty="beginner"
  duration="45 min"
  :prerequisites="[]"
  :tags="['Anthropic SDK', 'Tool Calling', 'TypeScript']"
/>

## 背景与目标

大多数人第一次用 LLM API，都是这样写的：

```ts
const response = await client.messages.create({
  model: 'claude-opus-4-6',
  messages: [{ role: 'user', content: '北京今天天气怎么样？' }]
})
```

模型会回答"我无法获取实时天气"——因为它没有工具。

**Agent 和普通 LLM 调用的本质区别**就在这里：Agent 有工具，模型可以主动调用它们。

本章目标：用最少的代码，跑通工具调用的完整链路：

```
用户输入 → 模型思考 → 决定调用工具 → 执行工具 → 模型整合结果 → 最终回复
```

## 核心概念：工具调用生命周期

一次工具调用经历 4 个阶段：

1. **声明**：告诉模型有哪些工具、每个工具的参数 Schema
2. **决策**：模型根据用户问题，决定是否调用工具（以及调用哪个、传什么参数）
3. **执行**：你的代码接收到 `tool_use` 块，调用真实函数并返回结果
4. **整合**：把工具结果放回对话，模型生成最终回复

## 动手实现

<RunCommand command="bun run p01-minimal-agent.ts" />

### 第一步：声明工具

```ts
// p01-minimal-agent.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// 工具声明：告诉模型这个工具做什么、需要什么参数
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: '查询指定城市的当前天气',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，如"北京"、"上海"'
        }
      },
      required: ['city']
    }
  }
]
```

### 第二步：模拟工具实现

```ts
// 真实项目中这里调用天气 API，这里用模拟数据
function get_weather(city: string): string {
  const data: Record<string, string> = {
    '北京': '晴，22°C，东南风 3 级',
    '上海': '多云，18°C，东风 2 级',
    '广州': '小雨，26°C，南风 2 级',
  }
  return data[city] ?? `暂无 ${city} 的天气数据`
}
```

### 第三步：Agent 循环

```ts
async function runAgent(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage }
  ]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      tools,
      messages,
    })

    // 将模型回复加入对话历史
    messages.push({ role: 'assistant', content: response.content })

    // 检查停止原因
    if (response.stop_reason === 'end_turn') {
      // 模型已生成最终文本回复，退出循环
      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
      console.log('Agent:', text)
      break
    }

    if (response.stop_reason === 'tool_use') {
      // 模型要调用工具，逐个执行并收集结果
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        console.log(`Tool call: ${block.name}(${JSON.stringify(block.input)})`)

        let result: string
        if (block.name === 'get_weather') {
          const input = block.input as { city: string }
          result = get_weather(input.city)
        } else {
          result = `Unknown tool: ${block.name}`
        }

        console.log(`Tool result: ${result}`)

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }

      // 把工具结果推回对话，继续循环让模型整合
      messages.push({ role: 'user', content: toolResults })
    }
  }
}

// 运行
runAgent('北京今天天气怎么样？适合出去跑步吗？')
```

### 运行结果

```
Tool call: get_weather({"city":"北京"})
Tool result: 晴，22°C，东南风 3 级
Agent: 北京今天天气晴朗，气温 22°C，有东南风 3 级。非常适合出去跑步！
      建议穿一件薄外套，做好防晒准备。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `tools` 声明 | JSON Schema 格式，模型靠这个理解工具能力 |
| `stop_reason: 'tool_use'` | 模型需要调用工具时的停止信号 |
| `tool_use` block | 包含工具名、参数、调用 ID |
| `tool_result` block | 你返回给模型的工具执行结果 |
| Agent 循环 | `while(true)` 直到 `end_turn`，这就是最小 Agent 循环 |

## 常见问题

**Q: 模型一定会调用工具吗？**
不一定。如果问题可以直接回答（如"1+1等于几"），模型会跳过工具调用，直接返回 `end_turn`。

**Q: 可以声明多个工具吗？**
可以，`tools` 数组可以放任意数量。模型会根据问题自行选择调用哪个（甚至同时调用多个）。

**Q: 工具执行出错了怎么办？**
在 `tool_result` 的 `content` 里返回错误信息，模型会据此调整回复。详见 P4：错误处理。

## 小结与延伸

你刚才实现的 `while(true)` 循环，就是 Agent 的核心 —— 一个**感知-思考-行动**的循环体。

接下来：
- **P2**：如何在多轮对话中保持上下文，不让 Token 无限增长
- **P10**：用同样的循环实现完整的 ReAct 推理模式

<StarCTA />
```

- [ ] **Step 2: Commit**

```bash
git add docs/practice/p01-minimal-agent/index.md
git commit -m "feat(practice): add P01 minimal agent chapter with full content"
```

---

## Task 13: 创建 P02–P23 占位章节

**Files:**
- Create: `docs/practice/p02-multi-turn/index.md` 至 `docs/practice/p23-production/index.md`

每个占位文件使用统一的"施工中"模板，保证侧边栏链接不 404。

- [ ] **Step 1: 批量创建 22 个占位章节**

```bash
cd /Users/zhangyanhua/AI/opencode/docs/book

chapters=(
  "p02-multi-turn:P2：多轮对话与上下文管理:如何在多轮对话中管理消息历史和 Token 预算，实现有记忆的 Agent"
  "p03-streaming:P3：流式输出与实时反馈:用 SSE 实现逐 token 打印，让 Agent 回复不再让用户干等"
  "p04-error-handling:P4：错误处理与重试策略:指数退避、工具调用失败降级、让 Agent 在不稳定环境中可靠运行"
  "p05-memory-arch:P5：记忆系统架构:短期/工作/长期记忆三层模型设计，从零实现 Agent 的记忆系统"
  "p06-memory-retrieval:P6：记忆增强检索:MemoryBank 设计——让 Agent 从历史对话中精准检索相关记忆"
  "p07-rag-basics:P7：RAG 基础:向量化、分块策略、语义检索，构建让 Agent 能读文档的知识库"
  "p08-graphrag:P8：GraphRAG:知识图谱构建与图检索增强，处理实体关系复杂的知识场景"
  "p09-hybrid-retrieval:P9：混合检索策略:关键词 + 向量 + 图谱三路融合，兼顾精确匹配与语义理解"
  "p10-react-loop:P10：ReAct Loop 实现:从零实现 Reason-Act 循环，让 Agent 边想边做"
  "p11-planning:P11：Planning 机制:Plan-and-Execute 与 Hierarchical Planning，先规划后执行"
  "p12-reflection:P12：Reflection 模式:让 Agent 自我评估输出质量，迭代修正直到满意"
  "p13-multimodal:P13：多模态智能体:图像理解、PDF 解析、截图分析，超越文本的 Agent"
  "p14-mcp:P14：MCP 协议接入:连接标准化工具服务器，让 Agent 接入外部能力生态"
  "p15-multi-agent:P15：多 Agent 编排模式:Orchestrator-Worker 架构设计，任务拆解与并行执行"
  "p16-subagent:P16：子 Agent 与任务分解:父 Agent 如何创建和管理子 Agent，处理复杂长任务"
  "p17-agent-comm:P17：Agent 间通信与状态共享:多 Agent 协作中的消息传递、状态同步与冲突解决"
  "p18-model-routing:P18：多模型路由与成本控制:按任务复杂度路由模型，Token 预算管理与成本优化"
  "p19-security:P19：Agent 安全与防注入:Prompt 注入攻击原理与防御，工具权限边界设计"
  "p20-observability:P20：可观测性与调试:Trace 链路追踪、结构化日志、Agent 行为可视化"
  "p21-evaluation:P21：评估与基准测试:如何量化 Agent 能力，设计评估数据集与自动化测试"
  "p22-project:P22：完整项目实战 — Code Review Agent:从零构建生产级 Code Review Agent，综合运用前 21 章技术"
  "p23-production:P23：生产部署清单:上线前必查的 23 项，从环境变量到监控告警"
)

for item in "${chapters[@]}"; do
  IFS=':' read -r slug title desc <<< "$item"
  mkdir -p "docs/practice/$slug"
  cat > "docs/practice/$slug/index.md" << MDEOF
---
title: $title
description: $desc
---

<ProjectCard
  title="章节建设中"
  difficulty="intermediate"
  duration="即将上线"
  :prerequisites="[]"
  :tags="[]"
/>

> 本章内容正在撰写中，敬请期待。

<StarCTA />
MDEOF
done
```

- [ ] **Step 2: 验证所有目录创建成功**

```bash
ls /Users/zhangyanhua/AI/opencode/docs/book/docs/practice/ | wc -l
```

Expected: 24（index.md + p01 + p02~p23 共 24 个条目）

- [ ] **Step 3: 验证构建通过**

```bash
cd /Users/zhangyanhua/AI/opencode/docs/book && bun run build 2>&1 | tail -10
```

Expected: 构建成功，无 404 或链接断开错误

- [ ] **Step 4: Commit**

```bash
git add docs/practice/
git commit -m "feat(practice): add P02-P23 stub chapters and complete directory structure"
```

---

## Task 14: 最终验证

- [ ] **Step 1: 启动开发服务器，全流程检查**

```bash
cd /Users/zhangyanhua/AI/opencode/docs/book && bun run dev
```

打开浏览器依次检查：
- `http://localhost:5173/` — 主书首页是否有「动手实践篇 →」按钮
- `http://localhost:5173/practice/` — 实践篇首页，确认暗色橙色主题、终端动画、Phase 网格正常
- `http://localhost:5173/practice/p01-minimal-agent/` — P01 完整章节，确认 ProjectCard、RunCommand 组件正常
- `http://localhost:5173/practice/p02-multi-turn/` — 占位章节，确认侧边栏显示正确
- `http://localhost:5173/00-what-is-ai-agent/` — 主书任意页，确认 Cyber Teal 主题未受影响

- [ ] **Step 2: 生产构建验证**

```bash
cd /Users/zhangyanhua/AI/opencode/docs/book && bun run build
```

Expected: 构建成功，输出 `.vitepress/dist/`

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat(practice): complete practice section implementation

- 5 new Vue components: PracticeTerminalHero, PracticePhaseGrid, PracticeTagCloud, ProjectCard, RunCommand
- Multi-path sidebar with /practice/ isolation
- Dark orange theme via .practice-page CSS variables
- 23-chapter structure (P01 full content + P02-P23 stubs)
- Main homepage entry button and nav integration"
```

---

## 完成标准

- [ ] 主书首页有「动手实践篇 →」入口
- [ ] `/practice/` 首页加载，显示终端动画和 Phase 网格
- [ ] 实践篇首页为暗色橙色主题，主书其他页面仍为 Cyber Teal
- [ ] `/practice/p01-minimal-agent/` 显示完整章节内容
- [ ] P02–P23 侧边栏链接均可访问（不 404）
- [ ] `bun run build` 无错误通过
