<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type StreamingMode = 'non-streaming' | 'streaming'
type StreamingPhase = 'idle' | 'text' | 'tool-call' | 'completed'

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 50, // 每个字符的延迟（毫秒）
})

const fullText = `好的，我来帮你查询北京的天气。

[工具调用: get_weather(city="北京")]

根据查询结果，北京今天天气晴朗，气温 22°C，东南风 3 级，非常适合户外活动。建议你可以去公园散步或者进行其他户外运动。`

const mode = ref<StreamingMode>('non-streaming')
const currentText = ref('')
const isRunning = ref(false)
const phase = ref<StreamingPhase>('idle')
const chunkCount = ref(0)
const startTime = ref(0)
const elapsedTime = ref(0)

let timer: ReturnType<typeof setInterval> | null = null
let charIndex = 0

const executionLog = ref<{ time: string; msg: string; type: 'info' | 'success' | 'warning' }[]>([])

function addLog(msg: string, type: 'info' | 'success' | 'warning') {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, type })
  if (executionLog.value.length > 10) executionLog.value.pop()
}

function simulateNonStreaming() {
  if (isRunning.value) return

  isRunning.value = true
  mode.value = 'non-streaming'
  currentText.value = ''
  phase.value = 'idle'
  chunkCount.value = 0
  executionLog.value = []
  startTime.value = Date.now()

  addLog('发送请求...', 'info')
  addLog('等待模型生成完整响应...', 'warning')

  // 模拟 5 秒等待
  setTimeout(() => {
    currentText.value = fullText
    phase.value = 'completed'
    elapsedTime.value = Date.now() - startTime.value
    chunkCount.value = 1
    addLog('收到完整响应', 'success')
    isRunning.value = false
  }, 5000)
}

function simulateStreaming() {
  if (isRunning.value) return

  isRunning.value = true
  mode.value = 'streaming'
  currentText.value = ''
  phase.value = 'text'
  chunkCount.value = 0
  charIndex = 0
  executionLog.value = []
  startTime.value = Date.now()

  addLog('发送请求（流式模式）...', 'info')
  addLog('开始接收 token 流...', 'success')

  timer = setInterval(() => {
    if (charIndex >= fullText.length) {
      stopDemo()
      phase.value = 'completed'
      elapsedTime.value = Date.now() - startTime.value
      addLog('流式输出完成', 'success')
      return
    }

    const char = fullText[charIndex]
    currentText.value += char
    charIndex++
    chunkCount.value++

    // 检测工具调用阶段
    if (currentText.value.includes('[工具调用:') && !currentText.value.includes(']', currentText.value.indexOf('[工具调用:'))) {
      if (phase.value !== 'tool-call') {
        phase.value = 'tool-call'
        addLog('检测到工具调用，暂停文本流...', 'warning')
      }
    } else if (phase.value === 'tool-call' && currentText.value.includes(']', currentText.value.indexOf('[工具调用:'))) {
      phase.value = 'text'
      addLog('工具调用完成，继续文本流...', 'success')
    }

    // 每 20 个字符记录一次日志
    if (charIndex % 20 === 0) {
      addLog(`已接收 ${charIndex} 个字符`, 'info')
    }
  }, props.playSpeed)
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
  phase.value = 'idle'
  chunkCount.value = 0
  elapsedTime.value = 0
  executionLog.value = []
  charIndex = 0
}

onUnmounted(() => stopDemo())

if (props.autoPlay) simulateStreaming()

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'idle': return '待机'
    case 'text': return '流式文本'
    case 'tool-call': return '工具调用'
    case 'completed': return '已完成'
  }
})

const phaseColor = computed(() => {
  switch (phase.value) {
    case 'idle': return 'gray'
    case 'text': return 'green'
    case 'tool-call': return 'yellow'
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
        <button class="sod-btn-primary" @click="simulateNonStreaming" :disabled="isRunning">
          非流式（5秒等待）
        </button>
        <button class="sod-btn-primary" @click="simulateStreaming" :disabled="isRunning">
          流式输出
        </button>
        <button class="sod-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="sod-stats">
      <div class="sod-stat-item">
        <div class="sod-stat-label">模式</div>
        <div class="sod-stat-value">{{ mode === 'non-streaming' ? '非流式' : '流式' }}</div>
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
          <span v-if="isRunning && mode === 'streaming'" class="sod-cursor">▊</span>
        </div>
        <div class="sod-output-content">
          <div v-if="currentText.length === 0" class="sod-empty">等待输出...</div>
          <pre v-else>{{ currentText }}</pre>
        </div>
      </div>

      <aside class="sod-sidebar">
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
              <div class="sod-comp-label">非流式</div>
              <div class="sod-comp-desc">等待 5 秒后一次性显示全部内容</div>
            </div>
            <div class="sod-comp-item">
              <div class="sod-comp-label">流式</div>
              <div class="sod-comp-desc">立即开始逐字符显示，用户感知延迟更低</div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sod-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
}

.sod-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.sod-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.sod-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.sod-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.sod-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sod-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.sod-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sod-btn-primary {
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

.sod-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.sod-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sod-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.sod-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
}

.sod-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.sod-stat-item {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
}

.sod-stat-label {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.25rem;
}

.sod-stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sod-stat-value.phase-green { color: #10b981; }
.sod-stat-value.phase-yellow { color: #f59e0b; }
.sod-stat-value.phase-blue { color: #3b82f6; }
.sod-stat-value.phase-gray { color: var(--vp-c-text-3); }

.sod-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
}

.sod-output {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sod-output-header {
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sod-cursor {
  color: var(--vp-c-brand-1);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.sod-output-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.6;
}

.sod-output-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--vp-c-text-1);
}

.sod-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sod-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sod-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.sod-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sod-log-line {
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.sod-log-line.info { color: var(--vp-c-brand-1); }
.sod-log-line.success { color: #10b981; }
.sod-log-line.warning { color: #f59e0b; }

.sod-log-ts {
  color: var(--vp-c-text-3);
  margin-right: 0.4rem;
}

.sod-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

.sod-comparison {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sod-comp-item {
  padding: 0.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
}

.sod-comp-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.25rem;
}

.sod-comp-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .sod-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .sod-body {
    grid-template-columns: 1fr;
  }

  .sod-actions {
    width: 100%;
  }

  .sod-btn-primary,
  .sod-btn-ghost {
    flex: 1;
  }
}
</style>
