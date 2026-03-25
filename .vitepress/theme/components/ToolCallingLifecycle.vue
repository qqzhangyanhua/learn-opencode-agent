<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type ToolCallingPhase = 'declare' | 'decide' | 'execute' | 'integrate'

interface ToolCallingStep {
  phase: ToolCallingPhase
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

const steps: ToolCallingStep[] = [
  {
    phase: 'declare',
    title: '1. 声明工具',
    description: '告诉模型有哪些工具、每个工具的参数 Schema',
    code: `const tools = [{
  type: 'function',
  function: {
    name: 'get_weather',
    description: '查询指定城市的当前天气',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  }
}]`,
  },
  {
    phase: 'decide',
    title: '2. 模型决策',
    description: '模型根据用户问题，决定是否调用工具',
    code: `// 用户: "北京今天天气怎么样？"
// 模型思考...`,
    output: `{
  "tool_calls": [{
    "function": {
      "name": "get_weather",
      "arguments": "{\\"city\\":\\"北京\\"}"
    }
  }]
}`,
  },
  {
    phase: 'execute',
    title: '3. 执行工具',
    description: '你的代码接收到 tool_calls，调用真实函数并返回结果',
    code: `function get_weather(city: string) {
  // 模拟 API 调用
  return \`\${city}今天晴，25°C\`
}

const result = get_weather("北京")`,
    output: `"北京今天晴，25°C"`,
  },
  {
    phase: 'integrate',
    title: '4. 整合结果',
    description: '把工具结果放回对话，模型生成最终回复',
    code: `messages.push({
  role: 'tool',
  content: result
})

// 模型再次调用...`,
    output: `"北京今天天气不错，晴天，气温25°C，适合外出活动。"`,
  },
]

const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: ToolCallingPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentStep = computed(() => steps[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

function addLog(msg: string, phase: ToolCallingPhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= steps.length - 1) {
    stopDemo()
    addLog('工具调用完成', 'integrate')
    return
  }

  currentStepIndex.value++
  const step = currentStep.value
  addLog(`${step.title}`, step.phase)
}

function startDemo() {
  if (isRunning.value) return
  isRunning.value = true
  currentStepIndex.value = 0
  executionLog.value = []
  addLog('开始工具调用流程...', 'declare')
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
  <div class="tcl-root">
    <div class="tcl-header">
      <div class="tcl-title-row">
        <span class="tcl-indicator" :class="{ running: isRunning }" />
        <span class="tcl-title">工具调用生命周期</span>
        <span class="tcl-badge">P1 · Tool Calling</span>
      </div>
      <div class="tcl-actions">
        <button class="tcl-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button class="tcl-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="tcl-progress-bar">
      <div class="tcl-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="tcl-body">
      <div class="tcl-main">
        <div class="tcl-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="step.phase"
            class="tcl-step-dot"
            :class="{
              active: idx === currentStepIndex,
              done: idx < currentStepIndex
            }"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="tcl-step-content">
          <div class="tcl-step-header">
            <h3 class="tcl-step-title">{{ currentStep.title }}</h3>
            <p class="tcl-step-desc">{{ currentStep.description }}</p>
          </div>

          <div v-if="currentStep.code" class="tcl-code-block">
            <div class="tcl-code-label">代码</div>
            <pre><code>{{ currentStep.code }}</code></pre>
          </div>

          <div v-if="currentStep.output" class="tcl-output-block">
            <div class="tcl-output-label">输出</div>
            <pre><code>{{ currentStep.output }}</code></pre>
          </div>
        </div>
      </div>

      <aside class="tcl-sidebar">
        <section class="tcl-block">
          <div class="tcl-block-header">执行日志</div>
          <div class="tcl-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="tcl-log-line" :class="log.phase">
              <span class="tcl-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="tcl-empty">等待执行...</div>
          </div>
        </section>

        <section class="tcl-block tcl-phases">
          <div class="tcl-block-header">阶段说明</div>
          <div class="tcl-phase-list">
            <div
              v-for="step in steps"
              :key="step.phase"
              class="tcl-phase-item"
              :class="{ active: step.phase === currentStep.phase }"
            >
              <div class="tcl-phase-icon" :class="step.phase" />
              <div class="tcl-phase-text">{{ step.title }}</div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.tcl-root {
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

.tcl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tcl-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.tcl-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.tcl-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.tcl-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.tcl-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.tcl-actions {
  display: flex;
  gap: 0.5rem;
}

.tcl-btn-primary {
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

.tcl-btn-primary:hover {
  opacity: 0.9;
}

.tcl-btn-primary.active {
  background: #0f766e;
}

.tcl-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.tcl-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
}

.tcl-progress-bar {
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
}

.tcl-progress-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.3s ease;
}

.tcl-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
}

.tcl-main {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.tcl-step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}

.tcl-step-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 1rem;
  right: 1rem;
  height: 2px;
  background: var(--vp-c-divider);
  z-index: 0;
}

.tcl-step-dot {
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

.tcl-step-dot.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
  transform: scale(1.15);
}

.tcl-step-dot.done {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

.tcl-step-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tcl-step-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tcl-step-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.tcl-step-desc {
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.6;
}

.tcl-code-block,
.tcl-output-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.tcl-code-label,
.tcl-output-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.tcl-code-block pre,
.tcl-output-block pre {
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

.tcl-output-block {
  border-left: 3px solid var(--vp-c-brand-1);
}

.tcl-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tcl-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tcl-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.tcl-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tcl-log-line {
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.tcl-log-line.declare { color: #3b82f6; }
.tcl-log-line.decide { color: #8b5cf6; }
.tcl-log-line.execute { color: #f59e0b; }
.tcl-log-line.integrate { color: #10b981; }

.tcl-log-ts {
  color: var(--vp-c-text-3);
  margin-right: 0.4rem;
}

.tcl-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

.tcl-phases {
  flex: 1;
}

.tcl-phase-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tcl-phase-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  transition: all 0.2s;
}

.tcl-phase-item.active {
  background: rgba(13, 148, 136, 0.1);
  border-left: 3px solid var(--vp-c-brand-1);
}

.tcl-phase-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tcl-phase-icon.declare { background: #3b82f6; }
.tcl-phase-icon.decide { background: #8b5cf6; }
.tcl-phase-icon.execute { background: #f59e0b; }
.tcl-phase-icon.integrate { background: #10b981; }

.tcl-phase-text {
  font-size: 0.8125rem;
  color: var(--vp-c-text-1);
}

@media (max-width: 768px) {
  .tcl-body {
    grid-template-columns: 1fr;
  }

  .tcl-step-indicator {
    padding: 0 0.5rem;
  }

  .tcl-step-indicator::before {
    left: 0.5rem;
    right: 0.5rem;
  }

  .tcl-step-dot {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
}
</style>
