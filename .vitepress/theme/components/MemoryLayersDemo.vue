<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type MemoryPhase = 'short' | 'working' | 'long' | 'inject' | 'complete'

interface MemoryStep {
  phase: MemoryPhase
  title: string
  description: string
  code?: string
  output?: string
}

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2000,
})

const steps: MemoryStep[] = [
  {
    phase: 'short',
    title: '1. 短期记忆 — messages 数组',
    description: '每轮对话后追加消息，保存在内存 messages[] 中，仅限当前会话',
    code: `messages.push({ role: 'user', content: userInput })
messages.push({ role: 'assistant', content: reply })
// 长度：4 条 → 6 条 → 8 条...`,
  },
  {
    phase: 'working',
    title: '2. 工作记忆 — 任务执行状态',
    description: '追踪当前任务进度、已完成步骤、临时变量，任务结束后清空',
    code: `const state = {
  taskId: 'code-review-001',
  completedSteps: ['parse', 'lint'],
  pendingSteps: ['test', 'report'],
  tempVars: { fileCount: 12 }
}`,
  },
  {
    phase: 'long',
    title: '3. 长期记忆 — 磁盘持久化',
    description: '跨会话保存关键信息，存储在磁盘文件中，下次启动自动加载',
    code: `// 写入磁盘
await fs.writeFile('memory.json', JSON.stringify({
  user_name: '张三',
  preferred_language: 'TypeScript',
  last_session: new Date().toISOString()
}))`,
  },
  {
    phase: 'inject',
    title: '4. 记忆注入 — 系统提示',
    description: '会话开始时，把长期记忆拼入 system prompt，模型就能"记住"用户',
    code: `const systemPrompt = \`你是 AI 助手。

[已知用户信息]
- 姓名：\${memory.user_name}
- 偏好语言：\${memory.preferred_language}

请在对话中自然利用这些信息。\``,
  },
  {
    phase: 'complete',
    title: '5. 三层记忆协同工作',
    description: '短期记忆管理对话流、工作记忆跟踪任务状态、长期记忆跨会话保留关键信息',
    output: `会话开始：注入长期记忆到 system prompt
对话进行：短期记忆追加消息历史
任务执行：工作记忆追踪步骤状态
会话结束：提取重要信息写入长期记忆`,
  },
]

const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: MemoryPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentStep = computed(() => steps[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

function addLog(msg: string, phase: MemoryPhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= steps.length - 1) {
    stopDemo()
    addLog('三层记忆协同完成', 'complete')
    return
  }

  currentStepIndex.value++
  const step = currentStep.value
  addLog(step.title, step.phase)
}

function startDemo() {
  if (isRunning.value) return
  isRunning.value = true
  currentStepIndex.value = 0
  executionLog.value = []
  addLog('开始记忆架构演示...', 'short')
  timer = setInterval(nextStep, props.playSpeed)
}

function stopDemo() {
  isRunning.value = false
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function resetDemo() {
  stopDemo()
  currentStepIndex.value = 0
  executionLog.value = []
}

onUnmounted(() => stopDemo())

if (props.autoPlay) startDemo()
</script>

<template>
  <div class="mld-root">
    <div class="mld-header">
      <div class="mld-title-row">
        <span class="mld-indicator" :class="{ running: isRunning }" />
        <span class="mld-title">三层记忆架构</span>
        <span class="mld-badge">P5 · Memory Architecture</span>
      </div>
      <div class="mld-actions">
        <button class="mld-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button class="mld-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="mld-progress-bar">
      <div class="mld-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="mld-body">
      <div class="mld-main">
        <div class="mld-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="step.phase"
            class="mld-step-dot"
            :class="{
              active: idx === currentStepIndex,
              done: idx < currentStepIndex,
              [step.phase]: true
            }"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="mld-step-content">
          <div class="mld-step-header">
            <h3 class="mld-step-title">{{ currentStep.title }}</h3>
            <p class="mld-step-desc">{{ currentStep.description }}</p>
          </div>

          <div v-if="currentStep.code" class="mld-code-block">
            <div class="mld-code-label">代码</div>
            <pre><code>{{ currentStep.code }}</code></pre>
          </div>

          <div v-if="currentStep.output" class="mld-output-block" :class="currentStep.phase">
            <div class="mld-output-label">输出</div>
            <pre><code>{{ currentStep.output }}</code></pre>
          </div>
        </div>
      </div>

      <aside class="mld-sidebar">
        <section class="mld-block">
          <div class="mld-block-header">执行日志</div>
          <div class="mld-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="mld-log-line" :class="log.phase">
              <span class="mld-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="mld-empty">等待执行...</div>
          </div>
        </section>

        <section class="mld-block mld-phases">
          <div class="mld-block-header">三层记忆说明</div>
          <div class="mld-phase-list">
            <div
              v-for="step in steps"
              :key="step.phase"
              class="mld-phase-item"
              :class="{ active: step.phase === currentStep.phase }"
            >
              <div class="mld-phase-icon" :class="step.phase" />
              <div class="mld-phase-text">{{ step.title }}</div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.mld-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
  max-width: 100%;
  overflow: hidden;
}

.mld-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.mld-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.mld-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.mld-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: mld-pulse 1.5s ease-in-out infinite;
}

@keyframes mld-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.mld-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.mld-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.mld-actions {
  display: flex;
  gap: 0.5rem;
}

.mld-btn-primary {
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.mld-btn-primary:hover {
  opacity: 0.9;
}

.mld-btn-primary.active {
  background: #0f766e;
}

.mld-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.mld-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
}

.mld-progress-bar {
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
}

.mld-progress-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.3s ease;
}

.mld-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
}

.mld-main {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.mld-step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}

.mld-step-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 1rem;
  right: 1rem;
  height: 2px;
  background: var(--vp-c-divider);
  z-index: 0;
}

.mld-step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  border: 2px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  position: relative;
  z-index: 1;
  transition: all 0.3s;
}

.mld-step-dot.active {
  border-color: currentColor;
  color: #fff;
  transform: scale(1.15);
}

.mld-step-dot.active.short  { background: #3b82f6; border-color: #3b82f6; }
.mld-step-dot.active.working { background: #f59e0b; border-color: #f59e0b; }
.mld-step-dot.active.long   { background: #10b981; border-color: #10b981; }
.mld-step-dot.active.inject { background: #8b5cf6; border-color: #8b5cf6; }
.mld-step-dot.active.complete { background: #0d9488; border-color: #0d9488; }

.mld-step-dot.done {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

.mld-step-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mld-step-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mld-step-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.mld-step-desc {
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.6;
}

.mld-code-block,
.mld-output-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.mld-code-label,
.mld-output-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.mld-code-block pre,
.mld-output-block pre {
  margin: 0;
  padding: 0.75rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  overflow-x: auto;
  max-width: 100%;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.mld-output-block.short   { border-left: 3px solid #3b82f6; }
.mld-output-block.working { border-left: 3px solid #f59e0b; }
.mld-output-block.long    { border-left: 3px solid #10b981; }
.mld-output-block.inject  { border-left: 3px solid #8b5cf6; }
.mld-output-block.complete { border-left: 3px solid #0d9488; }

.mld-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mld-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mld-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.mld-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.mld-log-line {
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.mld-log-line.short   { color: #3b82f6; }
.mld-log-line.working { color: #f59e0b; }
.mld-log-line.long    { color: #10b981; }
.mld-log-line.inject  { color: #8b5cf6; }
.mld-log-line.complete { color: #0d9488; }

.mld-log-ts {
  color: var(--vp-c-text-3);
  margin-right: 0.4rem;
}

.mld-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

.mld-phases {
  flex: 1;
}

.mld-phase-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mld-phase-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  transition: all 0.2s;
}

.mld-phase-item.active {
  background: rgba(13, 148, 136, 0.1);
  border-left: 3px solid var(--vp-c-brand-1);
}

.mld-phase-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mld-phase-icon.short   { background: #3b82f6; }
.mld-phase-icon.working { background: #f59e0b; }
.mld-phase-icon.long    { background: #10b981; }
.mld-phase-icon.inject  { background: #8b5cf6; }
.mld-phase-icon.complete { background: #0d9488; }

.mld-phase-text {
  font-size: 0.8125rem;
  color: var(--vp-c-text-1);
}

@media (max-width: 768px) {
  .mld-body {
    grid-template-columns: 1fr;
  }

  .mld-step-indicator {
    padding: 0 0.5rem;
  }

  .mld-step-indicator::before {
    left: 0.5rem;
    right: 0.5rem;
  }

  .mld-step-dot {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
}
</style>
