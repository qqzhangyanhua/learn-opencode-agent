<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

import { toolCallingModes, type ToolCallingModeId, type ToolCallingPhase } from './toolCallingLifecycleScenario'

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2000,
})

const activeModeId = ref<ToolCallingModeId>('success')
const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: ToolCallingPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const activeMode = computed(() => toolCallingModes.find((mode) => mode.id === activeModeId.value) ?? toolCallingModes[0])
const steps = computed(() => activeMode.value.steps)
const currentStep = computed(() => steps.value[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.value.length) * 100)

function addLog(msg: string, phase: ToolCallingPhase) {
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
  addLog(`${step.title}`, step.phase)
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

function selectMode(modeId: ToolCallingModeId) {
  if (activeModeId.value === modeId) return
  activeModeId.value = modeId
  resetDemo()
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
        <button type="button" class="tcl-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button type="button" class="tcl-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="tcl-mode-row" aria-label="工具调用模式">
      <button
        v-for="mode in toolCallingModes"
        :key="mode.id"
        class="tcl-mode-btn"
        :class="{ active: mode.id === activeModeId }"
        type="button"
        @click="selectMode(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>

    <p class="tcl-mode-summary">{{ activeMode.summary }}</p>

    <div class="tcl-progress-bar">
      <div class="tcl-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="tcl-body">
      <div class="tcl-main">
        <div class="tcl-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="`${activeModeId}-${idx}`"
            class="tcl-step-dot"
            :class="{
              active: idx === currentStepIndex,
              done: idx < currentStepIndex,
              [step.phase]: true,
            }"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="tcl-step-content">
          <div class="tcl-step-header">
            <h3 class="tcl-step-title" :class="currentStep.phase">{{ currentStep.title }}</h3>
            <p class="tcl-step-desc">{{ currentStep.description }}</p>
          </div>

          <div v-if="currentStep.code" class="tcl-code-block">
            <div class="tcl-code-label">代码</div>
            <pre><code>{{ currentStep.code }}</code></pre>
          </div>

          <div v-if="currentStep.output" class="tcl-output-block" :class="currentStep.phase">
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
              :key="`${activeModeId}-${step.title}`"
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

<style scoped src="./ToolCallingLifecycle.css"></style>
