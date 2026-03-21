<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { PracticePlaygroundRunState } from './practicePlaygroundTypes'

const props = defineProps<{
  canRerun: boolean
  chapterLabel: string
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
const outputPanelRef = ref<HTMLElement | null>(null)
let lastOutputLength = 0

const configSummary = computed(() => props.runState.configSnapshot)
const hasRunnableOutput = computed(() => Boolean(props.runState.outputText.trim()))
const hasDebugContent = computed(() => {
  return props.runState.debugLines.length > 0 || Boolean(props.runState.errorMessage.trim())
})
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
  if (props.runState.durationMs === null) return '尚无'
  return `${props.runState.durationMs} ms`
})

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
  () => [outputCopyStatus.value, debugCopyStatus.value],
  ([outputValue, debugValue]) => {
    const value = outputValue || debugValue
    if (!value) return
    const timer = window.setTimeout(() => {
      outputCopyStatus.value = ''
      debugCopyStatus.value = ''
    }, 1800)
    return () => window.clearTimeout(timer)
  },
)

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
  <section class="result-panel">
    <article class="result-card summary-card">
      <div class="summary-header">
        <h2>请求摘要</h2>
        <span :class="['status-chip', statusMeta.tone]">{{ statusMeta.label }}</span>
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
    </article>

    <article class="result-card output-card">
      <div class="card-header">
        <h2>输出</h2>
        <div class="card-actions">
          <button
            type="button"
            class="ghost-button"
            :disabled="!canRerun || isRunning"
            @click="emit('rerun')"
          >
            {{ isRunning ? '运行中…' : '再次运行' }}
          </button>
          <button
            type="button"
            class="ghost-button"
            :disabled="!hasRunArtifacts"
            @click="emit('clear')"
          >
            清空结果
          </button>
          <button
            type="button"
            class="ghost-button"
            :disabled="!hasRunnableOutput"
            @click="handleCopyOutput"
          >
            复制输出
          </button>
        </div>
      </div>
      <pre ref="outputPanelRef" :class="['output-panel', { empty: !runState.outputText.trim() }]">
        {{ outputSummary }}
      </pre>
      <p v-if="outputCopyStatus" class="copy-status">{{ outputCopyStatus }}</p>
    </article>

    <article class="result-card debug-card">
      <div class="card-header">
        <h2>调试</h2>
        <button
          type="button"
          class="ghost-button"
          :disabled="!hasDebugContent"
          @click="handleCopyDebug"
        >
          复制调试
        </button>
      </div>
      <p v-if="runState.errorMessage" class="error-message">{{ runState.errorMessage }}</p>
      <ul class="debug-list">
        <li
          v-for="entry in debugEntries"
          :key="entry.id"
          :class="['debug-item', entry.tone]"
        >
          {{ entry.line }}
        </li>
      </ul>
      <p v-if="debugCopyStatus" class="copy-status">{{ debugCopyStatus }}</p>
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

.summary-header h2,
.card-header h2 {
  margin: 0;
  font-size: 18px;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
