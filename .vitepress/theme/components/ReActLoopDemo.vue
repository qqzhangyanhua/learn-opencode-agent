<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type ReActPhase = 'thought' | 'action' | 'observation' | 'final'

interface ReActStep {
  phase: ReActPhase
  title: string
  description: string
  thought?: string
  action?: string
  actionInput?: string
  observation?: string
  finalAnswer?: string
}

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2500,
})

const steps: ReActStep[] = [
  {
    phase: 'thought',
    title: '1. Thought — 推理阶段',
    description: '模型先写出推理过程，解释为什么需要采取行动',
    thought: '用户问北京今天适合跑步吗？我需要查询北京的实时天气数据才能判断。',
  },
  {
    phase: 'action',
    title: '2. Action — 行动决策',
    description: '基于推理，决定调用哪个工具和传入什么参数',
    action: 'get_weather',
    actionInput: '{"city": "北京"}',
  },
  {
    phase: 'observation',
    title: '3. Observation — 观察结果',
    description: '工具执行后返回的真实数据，作为下一步推理的依据',
    observation: '晴，22°C，东南风 3 级，空气质量良',
  },
  {
    phase: 'thought',
    title: '4. Thought — 再次推理',
    description: '基于观察结果，继续推理下一步行动或得出结论',
    thought: '22°C 晴天，风力不大，空气质量良好，这是非常适合户外运动的天气条件。',
  },
  {
    phase: 'final',
    title: '5. Final Answer — 最终回复',
    description: '推理链完成，给出最终答案',
    finalAnswer: '今天北京非常适合跑步！天气晴朗，温度 22°C 舒适宜人，东南风 3 级不会影响运动，空气质量良好。建议选择早晨或傍晚时段，注意补充水分。',
  },
]

const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: ReActPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentStep = computed(() => steps[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

function addLog(msg: string, phase: ReActPhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= steps.length - 1) {
    stopDemo()
    addLog('ReAct 推理链完成', 'final')
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
  addLog('开始 ReAct 推理链...', 'thought')
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
  <div class="rld-root">
    <div class="rld-header">
      <div class="rld-title-row">
        <span class="rld-indicator" :class="{ running: isRunning }" />
        <span class="rld-title">ReAct 推理链演示</span>
        <span class="rld-badge">P10 · ReAct Loop</span>
      </div>
      <div class="rld-actions">
        <button class="rld-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button class="rld-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="rld-progress-bar">
      <div class="rld-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="rld-body">
      <div class="rld-main">
        <div class="rld-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="idx"
            class="rld-step-dot"
            :class="{
              active: idx === currentStepIndex,
              done: idx < currentStepIndex,
              [step.phase]: true,
            }"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="rld-step-content">
          <div class="rld-step-header">
            <h3 class="rld-step-title" :class="currentStep.phase">{{ currentStep.title }}</h3>
            <p class="rld-step-desc">{{ currentStep.description }}</p>
          </div>

          <div v-if="currentStep.thought" class="rld-content-block thought">
            <div class="rld-content-label">Thought</div>
            <div class="rld-content-text">{{ currentStep.thought }}</div>
          </div>

          <div v-if="currentStep.action" class="rld-content-block action">
            <div class="rld-content-label">Action</div>
            <div class="rld-content-text">{{ currentStep.action }}</div>
          </div>

          <div v-if="currentStep.actionInput" class="rld-content-block action-input">
            <div class="rld-content-label">Action Input</div>
            <pre><code>{{ currentStep.actionInput }}</code></pre>
          </div>

          <div v-if="currentStep.observation" class="rld-content-block observation">
            <div class="rld-content-label">Observation</div>
            <div class="rld-content-text">{{ currentStep.observation }}</div>
          </div>

          <div v-if="currentStep.finalAnswer" class="rld-content-block final">
            <div class="rld-content-label">Final Answer</div>
            <div class="rld-content-text">{{ currentStep.finalAnswer }}</div>
          </div>
        </div>
      </div>

      <aside class="rld-sidebar">
        <section class="rld-block">
          <div class="rld-block-header">执行日志</div>
          <div class="rld-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="rld-log-line" :class="log.phase">
              <span class="rld-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="rld-empty">等待执行...</div>
          </div>
        </section>

        <section class="rld-block rld-phases">
          <div class="rld-block-header">ReAct 核心阶段</div>
          <div class="rld-phase-list">
            <div class="rld-phase-item">
              <div class="rld-phase-icon thought" />
              <div class="rld-phase-text">Thought — 推理</div>
            </div>
            <div class="rld-phase-item">
              <div class="rld-phase-icon action" />
              <div class="rld-phase-text">Action — 行动</div>
            </div>
            <div class="rld-phase-item">
              <div class="rld-phase-icon observation" />
              <div class="rld-phase-text">Observation — 观察</div>
            </div>
            <div class="rld-phase-item">
              <div class="rld-phase-icon final" />
              <div class="rld-phase-text">Final Answer — 回复</div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.rld-root {
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

.rld-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.rld-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.rld-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.rld-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: rld-pulse 1.5s ease-in-out infinite;
}

@keyframes rld-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.rld-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rld-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  font-weight: 500;
}

.rld-actions {
  display: flex;
  gap: 0.5rem;
}

.rld-btn-primary {
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

.rld-btn-primary:hover {
  opacity: 0.9;
}

.rld-btn-primary.active {
  background: #0f766e;
}

.rld-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.rld-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
}

.rld-progress-bar {
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
}

.rld-progress-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.3s ease;
}

.rld-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
}

.rld-main {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.rld-step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}

.rld-step-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 1rem;
  right: 1rem;
  height: 2px;
  background: var(--vp-c-divider);
  z-index: 0;
}

.rld-step-dot {
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

.rld-step-dot.active.thought { background: #8b5cf6; border-color: #8b5cf6; color: #fff; transform: scale(1.15); }
.rld-step-dot.active.action { background: #3b82f6; border-color: #3b82f6; color: #fff; transform: scale(1.15); }
.rld-step-dot.active.observation { background: #10b981; border-color: #10b981; color: #fff; transform: scale(1.15); }
.rld-step-dot.active.final { background: #0d9488; border-color: #0d9488; color: #fff; transform: scale(1.15); }

.rld-step-dot.done {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

.rld-step-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rld-step-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rld-step-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  transition: color 0.3s;
}

.rld-step-title.thought { color: #8b5cf6; }
.rld-step-title.action { color: #3b82f6; }
.rld-step-title.observation { color: #10b981; }
.rld-step-title.final { color: #0d9488; }

.rld-step-desc {
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.6;
}

.rld-content-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.rld-content-block.thought { border-left: 3px solid #8b5cf6; }
.rld-content-block.action { border-left: 3px solid #3b82f6; }
.rld-content-block.action-input { border-left: 3px solid #3b82f6; }
.rld-content-block.observation { border-left: 3px solid #10b981; }
.rld-content-block.final { border-left: 3px solid #0d9488; }

.rld-content-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.rld-content-text {
  padding: 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.rld-content-block pre {
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

.rld-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rld-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rld-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.rld-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.rld-log-line {
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.rld-log-line.thought { color: #8b5cf6; }
.rld-log-line.action { color: #3b82f6; }
.rld-log-line.observation { color: #10b981; }
.rld-log-line.final { color: #0d9488; }

.rld-log-ts {
  color: var(--vp-c-text-3);
  margin-right: 0.4rem;
}

.rld-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

.rld-phases {
  flex: 1;
}

.rld-phase-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rld-phase-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
}

.rld-phase-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rld-phase-icon.thought { background: #8b5cf6; }
.rld-phase-icon.action { background: #3b82f6; }
.rld-phase-icon.observation { background: #10b981; }
.rld-phase-icon.final { background: #0d9488; }

.rld-phase-text {
  font-size: 0.8125rem;
  color: var(--vp-c-text-1);
}

@media (max-width: 768px) {
  .rld-body {
    grid-template-columns: 1fr;
  }

  .rld-step-indicator {
    padding: 0 0.5rem;
  }

  .rld-step-indicator::before {
    left: 0.5rem;
    right: 0.5rem;
  }

  .rld-step-dot {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
}
</style>
