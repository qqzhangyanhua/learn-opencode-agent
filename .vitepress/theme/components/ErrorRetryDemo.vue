<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type ErrorRetryPhase = 'call' | 'error' | 'backoff' | 'retry' | 'tool_error' | 'guard'

interface ErrorRetryStep {
  phase: ErrorRetryPhase
  title: string
  description: string
  code?: string
  output?: string
}

interface GuardLayer {
  phase: ErrorRetryPhase
  name: string
  desc: string
}

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2200,
})

const steps: ErrorRetryStep[] = [
  {
    phase: 'call',
    title: '1. 正常 API 调用中...',
    description: 'Agent 发起 API 请求',
    code: `await client.chat.completions.create({ model: 'gpt-4o', messages })`,
  },
  {
    phase: 'error',
    title: '2. 遭遇 429 限流错误',
    description: 'API 返回 rate_limit_error，需要重试',
    output: `APIError: 429 rate_limit_error\n"Too many requests"`,
  },
  {
    phase: 'backoff',
    title: '3. 指数退避等待',
    description: 'delay = 1000ms * 2^1 + random(500) ≈ 1600ms',
    code: `const delay = baseDelay * 2 ** attempt + Math.random() * jitter\nawait sleep(delay) // 等待 1600ms`,
  },
  {
    phase: 'retry',
    title: '4. 重试成功',
    description: '第 1 次重试，API 正常响应',
    output: `{ "finish_reason": "tool_calls", ... }`,
  },
  {
    phase: 'tool_error',
    title: '5. 工具执行失败',
    description: '工具函数抛出异常，包装为 tool 消息返回给模型',
    code: `// 不让异常冒泡！\nreturn { role: 'tool', content: \`Error: \${e.message}\` }`,
  },
  {
    phase: 'guard',
    title: '6. maxIterations 保护',
    description: '已运行 50 轮迭代，超出限制，主动终止',
    code: `if (iterations >= maxIterations) {\n  throw new Error('Max iterations exceeded')\n}`,
  },
]

const guardLayers: GuardLayer[] = [
  {
    phase: 'error',
    name: 'API 错误层',
    desc: '指数退避 + 区分可重试/不可重试',
  },
  {
    phase: 'tool_error',
    name: '工具错误层',
    desc: '捕获异常 → tool 消息 → 模型自决',
  },
  {
    phase: 'guard',
    name: '循环防护层',
    desc: 'maxIterations 计数 → 超限终止',
  },
]

const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: ErrorRetryPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentStep = computed(() => steps[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

function addLog(msg: string, phase: ErrorRetryPhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= steps.length - 1) {
    stopDemo()
    addLog('错误防护演示完成', 'guard')
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
  addLog('开始错误处理流程...', 'call')
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
  <div class="erd-root">
    <div class="erd-header">
      <div class="erd-title-row">
        <span class="erd-indicator" :class="{ running: isRunning }" />
        <span class="erd-title">错误处理三层防护</span>
        <span class="erd-badge">P4 · Error Handling</span>
      </div>
      <div class="erd-actions">
        <button class="erd-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button class="erd-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="erd-progress-bar">
      <div class="erd-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="erd-body">
      <div class="erd-main">
        <div class="erd-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="step.phase"
            class="erd-step-dot"
            :class="{
              active: idx === currentStepIndex,
              done: idx < currentStepIndex,
              [step.phase]: true,
            }"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="erd-step-content">
          <div class="erd-step-header">
            <h3 class="erd-step-title" :class="currentStep.phase">{{ currentStep.title }}</h3>
            <p class="erd-step-desc">{{ currentStep.description }}</p>
          </div>

          <div v-if="currentStep.code" class="erd-code-block">
            <div class="erd-code-label">代码</div>
            <pre><code>{{ currentStep.code }}</code></pre>
          </div>

          <div v-if="currentStep.output" class="erd-output-block" :class="currentStep.phase">
            <div class="erd-output-label">输出</div>
            <pre><code>{{ currentStep.output }}</code></pre>
          </div>
        </div>
      </div>

      <aside class="erd-sidebar">
        <section class="erd-block">
          <div class="erd-block-header">执行日志</div>
          <div class="erd-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="erd-log-line" :class="log.phase">
              <span class="erd-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="erd-empty">等待执行...</div>
          </div>
        </section>

        <section class="erd-block erd-guards">
          <div class="erd-block-header">防护层说明</div>
          <div class="erd-guard-list">
            <div
              v-for="layer in guardLayers"
              :key="layer.phase"
              class="erd-guard-item"
              :class="{ active: layer.phase === currentStep.phase }"
            >
              <div class="erd-guard-icon" :class="layer.phase" />
              <div class="erd-guard-info">
                <div class="erd-guard-name">{{ layer.name }}</div>
                <div class="erd-guard-desc">{{ layer.desc }}</div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.erd-root {
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

.erd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.erd-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.erd-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.erd-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: erd-pulse 1.5s ease-in-out infinite;
}

@keyframes erd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.erd-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.erd-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-weight: 500;
}

.erd-actions {
  display: flex;
  gap: 0.5rem;
}

.erd-btn-primary {
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

.erd-btn-primary:hover {
  opacity: 0.9;
}

.erd-btn-primary.active {
  background: #0f766e;
}

.erd-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.erd-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
}

.erd-progress-bar {
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
}

.erd-progress-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.3s ease;
}

.erd-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
  overflow-x: auto;
}

.erd-main {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.erd-step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}

.erd-step-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 1rem;
  right: 1rem;
  height: 2px;
  background: var(--vp-c-divider);
  z-index: 0;
}

.erd-step-dot {
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

.erd-step-dot.active.call      { background: #3b82f6; border-color: #3b82f6; color: #fff; transform: scale(1.15); }
.erd-step-dot.active.error     { background: #ef4444; border-color: #ef4444; color: #fff; transform: scale(1.15); }
.erd-step-dot.active.backoff   { background: #f59e0b; border-color: #f59e0b; color: #fff; transform: scale(1.15); }
.erd-step-dot.active.retry     { background: #10b981; border-color: #10b981; color: #fff; transform: scale(1.15); }
.erd-step-dot.active.tool_error { background: #f97316; border-color: #f97316; color: #fff; transform: scale(1.15); }
.erd-step-dot.active.guard     { background: #8b5cf6; border-color: #8b5cf6; color: #fff; transform: scale(1.15); }

.erd-step-dot.done {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

.erd-step-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.erd-step-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.erd-step-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  transition: color 0.3s;
}

.erd-step-title.call       { color: #3b82f6; }
.erd-step-title.error      { color: #ef4444; }
.erd-step-title.backoff    { color: #f59e0b; }
.erd-step-title.retry      { color: #10b981; }
.erd-step-title.tool_error { color: #f97316; }
.erd-step-title.guard      { color: #8b5cf6; }

.erd-step-desc {
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.6;
}

.erd-code-block,
.erd-output-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.erd-code-label,
.erd-output-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.erd-code-block pre,
.erd-output-block pre {
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

.erd-output-block.call       { border-left: 3px solid #3b82f6; }
.erd-output-block.error      { border-left: 3px solid #ef4444; }
.erd-output-block.backoff    { border-left: 3px solid #f59e0b; }
.erd-output-block.retry      { border-left: 3px solid #10b981; }
.erd-output-block.tool_error { border-left: 3px solid #f97316; }
.erd-output-block.guard      { border-left: 3px solid #8b5cf6; }

.erd-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.erd-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.erd-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.erd-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.erd-log-line {
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.erd-log-line.call       { color: #3b82f6; }
.erd-log-line.error      { color: #ef4444; }
.erd-log-line.backoff    { color: #f59e0b; }
.erd-log-line.retry      { color: #10b981; }
.erd-log-line.tool_error { color: #f97316; }
.erd-log-line.guard      { color: #8b5cf6; }

.erd-log-ts {
  color: var(--vp-c-text-3);
  margin-right: 0.4rem;
}

.erd-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

.erd-guards {
  flex: 1;
}

.erd-guard-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.erd-guard-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  transition: all 0.2s;
}

.erd-guard-item.active {
  background: rgba(13, 148, 136, 0.08);
  border-left: 3px solid var(--vp-c-brand-1);
}

.erd-guard-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.erd-guard-icon.error      { background: #ef4444; }
.erd-guard-icon.tool_error { background: #f97316; }
.erd-guard-icon.guard      { background: #8b5cf6; }

.erd-guard-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.erd-guard-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.erd-guard-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

@media (max-width: 768px) {
  .erd-body {
    grid-template-columns: 1fr;
  }

  .erd-step-indicator {
    padding: 0 0.5rem;
  }

  .erd-step-indicator::before {
    left: 0.5rem;
    right: 0.5rem;
  }

  .erd-step-dot {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
}
</style>
