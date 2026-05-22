<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

import { streamingOutputModes, type StreamingModeId, type StreamingPhase } from './streamingOutputScenario'

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 50, // 每个字符的延迟（毫秒）
})

const activeModeId = ref<StreamingModeId>('streaming')
const currentText = ref('')
const toolBuffer = ref('')
const isRunning = ref(false)
const phase = ref<StreamingPhase>('idle')
const chunkCount = ref(0)
const startTime = ref(0)
const elapsedTime = ref(0)

const executionLog = ref<{ time: string; msg: string; type: 'info' | 'success' | 'warning' }[]>([])
let timer: ReturnType<typeof setTimeout> | null = null
let eventIndex = 0

const activeMode = computed(() => streamingOutputModes.find((mode) => mode.id === activeModeId.value) ?? streamingOutputModes[0])

function addLog(msg: string, type: 'info' | 'success' | 'warning') {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, type })
  if (executionLog.value.length > 10) executionLog.value.pop()
}

function runMode(modeId = activeModeId.value) {
  if (isRunning.value) return
  activeModeId.value = modeId
  isRunning.value = true
  currentText.value = ''
  toolBuffer.value = ''
  phase.value = 'idle'
  chunkCount.value = 0
  eventIndex = 0
  elapsedTime.value = 0
  executionLog.value = []
  startTime.value = Date.now()
  addLog(`开始${activeMode.value.label}场景`, 'info')
  scheduleNextEvent()
}

function scheduleNextEvent() {
  timer = setTimeout(() => {
    const event = activeMode.value.events[eventIndex]
    if (!event) {
      stopDemo()
      phase.value = 'completed'
      elapsedTime.value = Date.now() - startTime.value
      addLog('场景播放完成', 'success')
      return
    }

    currentText.value += event.output
    toolBuffer.value = event.buffer ?? toolBuffer.value
    phase.value = event.phase
    chunkCount.value = event.chunkCount ?? eventIndex + 1
    addLog(event.log, event.logType)
    eventIndex++
    scheduleNextEvent()
  }, activeMode.value.isStreaming ? props.playSpeed * 12 : 900)
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
  currentText.value = ''
  toolBuffer.value = ''
  phase.value = 'idle'
  chunkCount.value = 0
  elapsedTime.value = 0
  executionLog.value = []
  eventIndex = 0
}

function selectMode(modeId: StreamingModeId) {
  if (activeModeId.value === modeId) return
  activeModeId.value = modeId
  resetDemo()
}

onUnmounted(() => stopDemo())

if (props.autoPlay) runMode()

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'idle': return '待机'
    case 'text': return '流式文本'
    case 'tool-call': return '工具调用'
    case 'error': return '错误处理'
    case 'completed': return '已完成'
  }
})

const phaseColor = computed(() => {
  switch (phase.value) {
    case 'idle': return 'gray'
    case 'text': return 'green'
    case 'tool-call': return 'yellow'
    case 'error': return 'red'
    case 'completed': return 'blue'
  }
})
</script>

<template>
  <div class="sod-root">
    <div class="sod-header">
      <div class="sod-title-row">
        <span class="sod-indicator" :class="{ running: isRunning }" />
        <span class="sod-title">流式输出对比演示</span>
        <span class="sod-badge">P3 · Streaming</span>
      </div>
      <div class="sod-actions">
        <button type="button" class="sod-btn-primary" @click="runMode()" :disabled="isRunning">
          {{ isRunning ? '播放中' : '开始演示' }}
        </button>
        <button type="button" class="sod-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="sod-mode-row" aria-label="流式输出模式">
      <button
        v-for="item in streamingOutputModes"
        :key="item.id"
        class="sod-mode-btn"
        :class="{ active: item.id === activeModeId }"
        type="button"
        @click="selectMode(item.id)"
      >
        {{ item.label }}
      </button>
    </div>

    <p class="sod-mode-summary">{{ activeMode.summary }}</p>

    <div class="sod-stats">
      <div class="sod-stat-item">
        <div class="sod-stat-label">模式</div>
        <div class="sod-stat-value">{{ activeMode.label }}</div>
      </div>
      <div class="sod-stat-item">
        <div class="sod-stat-label">阶段</div>
        <div class="sod-stat-value" :class="`phase-${phaseColor}`">{{ phaseLabel }}</div>
      </div>
      <div class="sod-stat-item">
        <div class="sod-stat-label">Chunk 数</div>
        <div class="sod-stat-value">{{ chunkCount }}</div>
      </div>
      <div class="sod-stat-item">
        <div class="sod-stat-label">耗时</div>
        <div class="sod-stat-value">{{ elapsedTime > 0 ? `${elapsedTime}ms` : '-' }}</div>
      </div>
    </div>

    <div class="sod-body">
      <div class="sod-output">
        <div class="sod-output-header">
          <span>输出内容</span>
          <span v-if="isRunning && activeMode.isStreaming" class="sod-cursor">▊</span>
        </div>
        <div class="sod-output-content">
          <div v-if="currentText.length === 0" class="sod-empty">等待输出...</div>
          <pre v-else>{{ currentText }}</pre>
        </div>
      </div>

      <aside class="sod-sidebar">
        <section v-if="toolBuffer" class="sod-block">
          <div class="sod-block-header">Tool Call Buffer</div>
          <pre class="sod-buffer">{{ toolBuffer }}</pre>
        </section>

        <section class="sod-block">
          <div class="sod-block-header">执行日志</div>
          <div class="sod-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="sod-log-line" :class="log.type">
              <span class="sod-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="sod-empty">等待执行...</div>
          </div>
        </section>

        <section class="sod-block">
          <div class="sod-block-header">对比说明</div>
          <div class="sod-comparison">
            <div class="sod-comp-item">
              <div class="sod-comp-label">文本流</div>
              <div class="sod-comp-desc">可以边到边展示，降低用户感知延迟</div>
            </div>
            <div class="sod-comp-item">
              <div class="sod-comp-label">工具参数</div>
              <div class="sod-comp-desc">必须累积完整 JSON 后再解析执行</div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped src="./StreamingOutputDemo.css"></style>
