<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

import {
  errorRetryGuardLayers,
  errorRetryModes,
  type ErrorRetryModeId,
  type ErrorRetryPhase,
} from './errorRetryScenario'

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2200,
})

const activeModeId = ref<ErrorRetryModeId>('rate-limit')
const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: ErrorRetryPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const activeMode = computed(() => errorRetryModes.find((mode) => mode.id === activeModeId.value) ?? errorRetryModes[0])
const steps = computed(() => activeMode.value.steps)
const currentStep = computed(() => steps.value[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.value.length) * 100)

function addLog(msg: string, phase: ErrorRetryPhase) {
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
  addLog(`开始${activeMode.value.label}流程...`, currentStep.value.phase)
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

function selectMode(modeId: ErrorRetryModeId) {
  if (activeModeId.value === modeId) return
  activeModeId.value = modeId
  resetDemo()
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
        <button type="button" class="erd-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button type="button" class="erd-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="erd-mode-row" aria-label="错误处理模式">
      <button
        v-for="mode in errorRetryModes"
        :key="mode.id"
        class="erd-mode-btn"
        :class="{ active: mode.id === activeModeId }"
        type="button"
        @click="selectMode(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>

    <p class="erd-mode-summary">{{ activeMode.summary }}</p>

    <div class="erd-progress-bar">
      <div class="erd-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="erd-body">
      <div class="erd-main">
        <div class="erd-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="`${activeModeId}-${idx}`"
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
              v-for="layer in errorRetryGuardLayers"
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

<style scoped src="./ErrorRetryDemo.css"></style>
