<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

import { reActLoopModes, type ReActModeId, type ReActPhase } from './reActLoopScenario'

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2500,
})

const activeModeId = ref<ReActModeId>('success')
const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: ReActPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const activeMode = computed(() => reActLoopModes.find((mode) => mode.id === activeModeId.value) ?? reActLoopModes[0])
const steps = computed(() => activeMode.value.steps)
const currentStep = computed(() => steps.value[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.value.length) * 100)

function addLog(msg: string, phase: ReActPhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= steps.value.length - 1) {
    stopDemo()
    addLog(activeMode.value.completionLog, currentStep.value.phase)
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
  addLog(`开始${activeMode.value.label}轨迹...`, currentStep.value.phase)
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

function selectMode(modeId: ReActModeId) {
  if (activeModeId.value === modeId) return
  activeModeId.value = modeId
  resetDemo()
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
        <button type="button" class="rld-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button type="button" class="rld-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="rld-mode-row" aria-label="ReAct 轨迹模式">
      <button
        v-for="mode in reActLoopModes"
        :key="mode.id"
        class="rld-mode-btn"
        :class="{ active: mode.id === activeModeId }"
        type="button"
        @click="selectMode(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>

    <p class="rld-mode-summary">{{ activeMode.summary }}</p>

    <div class="rld-progress-bar">
      <div class="rld-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="rld-body">
      <div class="rld-main">
        <div class="rld-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="`${activeModeId}-${idx}`"
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
              <div class="rld-phase-icon parser" />
              <div class="rld-phase-text">Parser / Guard — 拦截</div>
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

<style scoped src="./ReActLoopDemo.css"></style>
