<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { PracticePlaygroundRunState } from './practicePlaygroundTypes'

const props = defineProps<{
  canRerun: boolean
  chapterLabel: string
  configSavedAtLabel: string
  configSourceLabel: string
  isRunning: boolean
  runState: PracticePlaygroundRunState
  templateLabel: string
}>()
const emit = defineEmits<{
  clear: []
  rerun: []
}>()

const outputCopyStatus = ref('')
const debugCopyStatus = ref('')
const summaryCopyStatus = ref('')
const outputCardRef = ref<HTMLElement | null>(null)
const debugCardRef = ref<HTMLElement | null>(null)
const outputPanelRef = ref<HTMLElement | null>(null)
const debugListRef = ref<HTMLElement | null>(null)
const liveDurationMs = ref<number | null>(null)
const outputExpanded = ref(false)
const debugExpanded = ref(false)
let liveDurationTimer: number | null = null
let lastOutputLength = 0
let lastDebugItemCount = 0

const configSummary = computed(() => props.runState.configSnapshot)
const hasRunnableOutput = computed(() => Boolean(props.runState.outputText.trim()))
const hasDebugContent = computed(() => {
  return props.runState.debugLines.length > 0 || Boolean(props.runState.errorMessage.trim())
})
const hasExpandedPanel = computed(() => outputExpanded.value || debugExpanded.value)
const hasRunArtifacts = computed(() => {
  return props.runState.status !== 'idle'
    || Boolean(props.runState.outputText.trim())
    || props.runState.debugLines.length > 0
    || props.runState.configSnapshot !== null
})
const statusMeta = computed(() => {
  if (props.runState.status === 'running') {
    return {
      label: '运行中',
      tone: 'running',
    }
  }

  if (props.runState.status === 'success') {
    return {
      label: '已完成',
      tone: 'success',
    }
  }

  if (props.runState.status === 'error') {
    return {
      label: '运行失败',
      tone: 'error',
    }
  }

  return {
    label: '未开始',
    tone: 'idle',
  }
})
const outputSummary = computed(() => {
  if (props.runState.outputText.trim()) return props.runState.outputText
  if (props.runState.status === 'error') return '本次运行失败，请查看下方调试信息。'
  if (props.runState.status === 'running') return '请求进行中，等待模型返回…'
  return '尚未运行。先在顶部确认配置，再点击“运行”查看结果。'
})
const debugLines = computed(() => {
  if (props.runState.debugLines.length > 0) return props.runState.debugLines
  if (props.runState.status === 'running') return ['请求已发出，等待返回调试信息。']
  return ['等待运行。发起请求后，这里会显示适配、工具调用和中断原因。']
})
const debugEntries = computed(() =>
  debugLines.value.map((line, index) => ({
    id: `${index}-${line}`,
    line,
    tone: resolveDebugTone(line),
  })),
)
const apiKeyStatusLabel = computed(() => {
  if (!configSummary.value) return '尚未运行'
  return configSummary.value.hasApiKey ? '已配置' : '未配置'
})
const durationLabel = computed(() => {
  if (props.runState.status === 'running' && liveDurationMs.value !== null) {
    return `${liveDurationMs.value} ms（进行中）`
  }
  if (props.runState.durationMs === null) return '尚无'
  return `${props.runState.durationMs} ms`
})
const rerunButtonTitle = computed(() => {
  if (props.isRunning) return '当前请求仍在运行。'
  if (!props.canRerun) return '先补齐配置并修复模板问题后，才能再次运行。'
  return '沿用当前模板再次发起运行。'
})
const clearButtonTitle = computed(() => (
  hasRunArtifacts.value ? '清空当前输出、调试信息和运行摘要。' : '当前没有可清空的运行结果。'
))
const copyOutputButtonTitle = computed(() => (
  hasRunnableOutput.value ? '复制当前输出内容。' : '当前还没有可复制的输出内容。'
))
const copyDebugButtonTitle = computed(() => (
  hasDebugContent.value ? '复制当前调试信息。' : '当前还没有可复制的调试信息。'
))
const scrollOutputButtonTitle = computed(() => (
  hasRunnableOutput.value ? '快速滚动到输出底部。' : '当前还没有可滚动的输出内容。'
))
const scrollDebugButtonTitle = computed(() => (
  hasDebugContent.value ? '快速滚动到调试日志底部。' : '当前还没有可滚动的调试内容。'
))
const canToggleOutputExpanded = computed(() => props.runState.outputText.trim().length > 0)
const canToggleDebugExpanded = computed(() => debugEntries.value.length > 0)
const outputToggleLabel = computed(() => (outputExpanded.value ? '收起输出' : '展开输出'))
const debugToggleLabel = computed(() => (debugExpanded.value ? '收起调试' : '展开调试'))
const outputToggleTitle = computed(() => (
  outputExpanded.value ? '恢复为紧凑输出视图。' : '展开输出区域，便于查看长内容。'
))
const debugToggleTitle = computed(() => (
  debugExpanded.value ? '恢复为紧凑调试视图。' : '展开调试区域，便于查看完整日志。'
))
const outputStatsLabel = computed(() => {
  const trimmed = props.runState.outputText.trim()
  if (!trimmed) return '暂无输出'

  const lineCount = trimmed.split('\n').length
  return `${trimmed.length} 字 / ${lineCount} 行`
})
const debugStatsLabel = computed(() => {
  const totalLines = debugEntries.value.length + (props.runState.errorMessage.trim() ? 1 : 0)
  if (!totalLines) return '暂无调试'
  return `${totalLines} 条日志`
})
const summaryText = computed(() => [
  `章节：${props.chapterLabel}`,
  `模板：${props.templateLabel}`,
  `配置来源：${props.configSourceLabel}`,
  `最近保存：${props.configSavedAtLabel}`,
  `模型：${configSummary.value?.model || '尚未运行'}`,
  `接口地址：${configSummary.value?.baseURL || '尚未运行'}`,
  `密钥状态：${apiKeyStatusLabel.value}`,
  `耗时：${durationLabel.value}`,
].join('\n'))

watch(
  () => props.runState.outputText,
  async (nextValue) => {
    const nextLength = nextValue.length
    const shouldAutoScroll = nextLength > lastOutputLength
    lastOutputLength = nextLength
    if (!shouldAutoScroll) return
    await nextTick()
    if (!outputPanelRef.value) return
    outputPanelRef.value.scrollTop = outputPanelRef.value.scrollHeight
  },
)

watch(
  () => [props.runState.debugLines.length, props.runState.errorMessage] as const,
  async ([debugLineCount, errorMessage]) => {
    const nextDebugItemCount = debugLineCount + (errorMessage.trim() ? 1 : 0)
    const shouldAutoScroll = nextDebugItemCount > lastDebugItemCount
    lastDebugItemCount = nextDebugItemCount
    if (!shouldAutoScroll) return
    await nextTick()
    if (!debugListRef.value) return
    debugListRef.value.scrollTop = debugListRef.value.scrollHeight
  },
)

watch(
  () => [summaryCopyStatus.value, outputCopyStatus.value, debugCopyStatus.value],
  ([summaryValue, outputValue, debugValue]) => {
    const value = summaryValue || outputValue || debugValue
    if (!value) return
    const timer = window.setTimeout(() => {
      summaryCopyStatus.value = ''
      outputCopyStatus.value = ''
      debugCopyStatus.value = ''
    }, 1800)
    return () => window.clearTimeout(timer)
  },
)

watch(
  () => [props.runState.status, props.runState.startedAt] as const,
  ([status, startedAt]) => {
    stopLiveDurationTimer()

    if (status !== 'running' || startedAt === null) {
      liveDurationMs.value = null
      return
    }

    const syncLiveDuration = () => {
      liveDurationMs.value = Math.max(0, Date.now() - startedAt)
    }

    syncLiveDuration()
    if (typeof window === 'undefined') return
    liveDurationTimer = window.setInterval(syncLiveDuration, 250)
  },
  { immediate: true },
)

watch(
  () => [props.runState.status, props.runState.requestToken] as const,
  async ([status], [previousStatus, previousToken]) => {
    if (typeof window === 'undefined') return
    if (status !== 'success' && status !== 'error') return
    if (status === previousStatus && props.runState.requestToken === previousToken) return

    await nextTick()

    if (status === 'error') {
      scrollCardIntoView(debugCardRef.value)
      return
    }

    if (hasRunnableOutput.value) {
      scrollCardIntoView(outputCardRef.value)
      return
    }

    if (hasDebugContent.value) {
      scrollCardIntoView(debugCardRef.value)
    }
  },
)

onUnmounted(() => {
  stopLiveDurationTimer()
})

function scrollCardIntoView(target: HTMLElement | null) {
  if (!target) return
  target.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  })
}

function stopLiveDurationTimer() {
  if (typeof window === 'undefined') return
  if (liveDurationTimer !== null) {
    window.clearInterval(liveDurationTimer)
    liveDurationTimer = null
  }
}

function scrollPanelToBottom(target: HTMLElement | null) {
  if (!target) return
  target.scrollTo({
    top: target.scrollHeight,
    behavior: 'smooth',
  })
}

function toggleOutputExpanded() {
  if (!canToggleOutputExpanded.value) return
  outputExpanded.value = !outputExpanded.value
}

function toggleDebugExpanded() {
  if (!canToggleDebugExpanded.value) return
  debugExpanded.value = !debugExpanded.value
}

function handleScrollOutputToBottom() {
  if (!hasRunnableOutput.value) return
  scrollPanelToBottom(outputPanelRef.value)
}

function handleScrollDebugToBottom() {
  if (!hasDebugContent.value) return
  scrollPanelToBottom(debugListRef.value)
}

async function handleCopySummary() {
  const text = summaryText.value.trim()
  if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    summaryCopyStatus.value = '当前环境不支持复制摘要。'
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    summaryCopyStatus.value = '请求摘要已复制。'
  } catch {
    summaryCopyStatus.value = '复制失败，请手动复制。'
  }
}

async function handleCopyOutput() {
  const text = props.runState.outputText.trim()
  if (!text.trim() || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    outputCopyStatus.value = '当前环境不支持复制输出。'
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    outputCopyStatus.value = '输出已复制。'
  } catch {
    outputCopyStatus.value = '复制失败，请手动复制。'
  }
}

async function handleCopyDebug() {
  const lines = [
    props.runState.errorMessage.trim(),
    ...props.runState.debugLines,
  ].filter(Boolean)
  const text = lines.join('\n')

  if (!text.trim() || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    debugCopyStatus.value = '当前环境不支持复制调试信息。'
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    debugCopyStatus.value = '调试信息已复制。'
  } catch {
    debugCopyStatus.value = '复制失败，请手动复制。'
  }
}

function resolveDebugTone(line: string): 'error' | 'warning' | 'trace' | 'neutral' {
  if (/失败|错误|异常/i.test(line)) return 'error'
  if (/取消|中断|阻止|校验/i.test(line)) return 'warning'
  if (/Thought|Action|Observation|Final Answer|系统注入|路由理由|路由判断/i.test(line)) {
    return 'trace'
  }
  return 'neutral'
}
</script>

<template>
  <section :class="['result-panel', { expanded: hasExpandedPanel }]">
    <article class="result-card summary-card">
      <div class="summary-header">
        <h2>请求摘要</h2>
        <div class="summary-actions">
          <button
            type="button"
            class="ghost-button"
            @click="handleCopySummary"
          >
            复制摘要
          </button>
          <span :class="['status-chip', statusMeta.tone]">{{ statusMeta.label }}</span>
        </div>
      </div>

      <dl class="summary-grid">
        <div>
          <dt>章节</dt>
          <dd>{{ chapterLabel }}</dd>
        </div>
        <div>
          <dt>模板</dt>
          <dd>{{ templateLabel }}</dd>
        </div>
        <div>
          <dt>配置来源</dt>
          <dd>{{ configSourceLabel }}</dd>
        </div>
        <div>
          <dt>最近保存</dt>
          <dd>{{ configSavedAtLabel }}</dd>
        </div>
        <div>
          <dt>模型</dt>
          <dd>{{ configSummary?.model || '尚未运行' }}</dd>
        </div>
        <div>
          <dt>接口地址</dt>
          <dd>{{ configSummary?.baseURL || '尚未运行' }}</dd>
        </div>
        <div>
          <dt>密钥状态</dt>
          <dd>{{ apiKeyStatusLabel }}</dd>
        </div>
        <div>
          <dt>耗时</dt>
          <dd>{{ durationLabel }}</dd>
        </div>
      </dl>
      <p v-if="summaryCopyStatus" class="copy-status" role="status" aria-live="polite">{{ summaryCopyStatus }}</p>
    </article>

    <article ref="outputCardRef" class="result-card output-card">
      <div class="card-header">
        <div class="card-title">
          <h2>输出</h2>
          <span class="card-meta">{{ outputStatsLabel }}</span>
        </div>
        <div class="card-actions">
          <button
            type="button"
            class="ghost-button"
            :title="rerunButtonTitle"
            :disabled="!canRerun || isRunning"
            @click="emit('rerun')"
          >
            {{ isRunning ? '运行中…' : '再次运行' }}
          </button>
          <button
            type="button"
            class="ghost-button"
            :title="clearButtonTitle"
            :disabled="!hasRunArtifacts"
            @click="emit('clear')"
          >
            清空结果
          </button>
          <button
            type="button"
            class="ghost-button"
            :title="outputToggleTitle"
            :disabled="!canToggleOutputExpanded"
            @click="toggleOutputExpanded"
          >
            {{ outputToggleLabel }}
          </button>
          <button
            type="button"
            class="ghost-button"
            :title="scrollOutputButtonTitle"
            :disabled="!hasRunnableOutput"
            @click="handleScrollOutputToBottom"
          >
            回到底部
          </button>
          <button
            type="button"
            class="ghost-button"
            :title="copyOutputButtonTitle"
            :disabled="!hasRunnableOutput"
            @click="handleCopyOutput"
          >
            复制输出
          </button>
        </div>
      </div>
      <pre ref="outputPanelRef" :class="['output-panel', { empty: !runState.outputText.trim(), expanded: outputExpanded }]">
        {{ outputSummary }}
      </pre>
      <p v-if="outputCopyStatus" class="copy-status" role="status" aria-live="polite">{{ outputCopyStatus }}</p>
    </article>

    <article ref="debugCardRef" class="result-card debug-card">
      <div class="card-header">
        <div class="card-title">
          <h2>调试</h2>
          <span class="card-meta">{{ debugStatsLabel }}</span>
        </div>
        <div class="card-actions">
          <button
            type="button"
            class="ghost-button"
            :title="debugToggleTitle"
            :disabled="!canToggleDebugExpanded"
            @click="toggleDebugExpanded"
          >
            {{ debugToggleLabel }}
          </button>
          <button
            type="button"
            class="ghost-button"
            :title="scrollDebugButtonTitle"
            :disabled="!hasDebugContent"
            @click="handleScrollDebugToBottom"
          >
            回到底部
          </button>
          <button
            type="button"
            class="ghost-button"
            :title="copyDebugButtonTitle"
            :disabled="!hasDebugContent"
            @click="handleCopyDebug"
          >
            复制调试
          </button>
        </div>
      </div>
      <p v-if="runState.errorMessage" class="error-message">{{ runState.errorMessage }}</p>
      <ul ref="debugListRef" :class="['debug-list', { expanded: debugExpanded }]">
        <li
          v-for="entry in debugEntries"
          :key="entry.id"
          :class="['debug-item', entry.tone]"
        >
          {{ entry.line }}
        </li>
      </ul>
      <p v-if="debugCopyStatus" class="copy-status" role="status" aria-live="polite">{{ debugCopyStatus }}</p>
    </article>
  </section>
</template>

<style scoped>
.result-panel {
  display: grid;
  gap: 12px;
  height: 100%;
  grid-template-rows: auto minmax(220px, 0.95fr) minmax(220px, 1.05fr);
}

.result-panel.expanded {
  height: auto;
  grid-template-rows: auto auto auto;
}

.result-card {
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-divider));
  border-radius: 16px;
  padding: 14px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  display: grid;
  gap: 10px;
  min-height: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.summary-card {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--vp-c-brand-1) 12%, transparent), transparent 68%),
    color-mix(in srgb, var(--vp-c-bg) 94%, white);
}

.summary-header,
.card-header {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.card-header {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: -2px -2px 0;
  padding: 2px 2px 8px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg) 96%, white), transparent);
}

.summary-header h2,
.card-header h2 {
  margin: 0;
  font-size: 18px;
}

.card-title {
  display: grid;
  gap: 4px;
}

.card-meta {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-chip {
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  font-size: 12px;
}

.status-chip.idle {
  color: var(--vp-c-text-2);
}

.status-chip.running {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 40%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-bg));
  color: var(--vp-c-brand-1);
}

.status-chip.success {
  border-color: color-mix(in srgb, #16a34a 38%, var(--vp-c-divider));
  background: color-mix(in srgb, #16a34a 10%, var(--vp-c-bg));
  color: #166534;
}

.status-chip.error {
  border-color: color-mix(in srgb, #ef4444 38%, var(--vp-c-divider));
  background: color-mix(in srgb, #ef4444 10%, var(--vp-c-bg));
  color: #b42318;
}

.summary-grid {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-grid div {
  min-width: 0;
}

.summary-grid dt {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.summary-grid dd {
  margin: 6px 0 0;
  word-break: break-word;
}

.ghost-button {
  border-radius: 12px;
  padding: 9px 12px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  cursor: pointer;
  font-weight: 600;
}

.ghost-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.output-panel {
  margin: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: auto;
  border-radius: 14px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg-soft) 88%, white);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1.6;
}

.output-panel.empty {
  color: var(--vp-c-text-2);
}

.output-panel.expanded {
  height: auto;
  max-height: min(70vh, 960px);
}

.copy-status {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.error-message {
  margin: 0;
  border-radius: 12px;
  padding: 12px 14px;
  background: color-mix(in srgb, #ef4444 10%, var(--vp-c-bg));
  color: #b42318;
}

.debug-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
  max-height: 100%;
  overflow: auto;
  color: var(--vp-c-text-2);
}

.debug-list.expanded {
  max-height: min(70vh, 960px);
}

.debug-item {
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg-soft) 88%, white);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.debug-item.error {
  border-color: color-mix(in srgb, #ef4444 40%, var(--vp-c-divider));
  background: color-mix(in srgb, #ef4444 8%, var(--vp-c-bg));
  color: #b42318;
}

.debug-item.warning {
  border-color: color-mix(in srgb, #f59e0b 40%, var(--vp-c-divider));
  background: color-mix(in srgb, #f59e0b 10%, var(--vp-c-bg));
  color: #92400e;
}

.debug-item.trace {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 35%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-bg));
  color: var(--vp-c-text-1);
}

@media (max-width: 700px) {
  .result-panel {
    grid-template-rows: auto auto auto;
  }

  .result-card {
    padding: 12px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
