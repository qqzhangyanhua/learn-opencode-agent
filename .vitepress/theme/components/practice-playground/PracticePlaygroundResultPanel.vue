<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { PracticePlaygroundRunState } from './practicePlaygroundTypes'

const props = defineProps<{
  runState: PracticePlaygroundRunState
}>()

const copyStatus = ref('')
const outputPanelRef = ref<HTMLElement | null>(null)
let lastOutputLength = 0

const configSummary = computed(() => props.runState.configSnapshot)
const outputSummary = computed(() => {
  if (props.runState.outputText.trim()) return props.runState.outputText
  if (props.runState.status === 'error') return '本次运行失败，请查看下方调试信息。'
  if (props.runState.status === 'running') return '请求进行中，等待模型返回...'
  return '尚未运行，请先点击上方“运行”。'
})
const debugLines = computed(() => {
  if (props.runState.debugLines.length > 0) return props.runState.debugLines
  return ['等待运行。']
})
const debugEntries = computed(() =>
  debugLines.value.map((line, index) => ({
    id: `${index}-${line}`,
    line,
    tone: resolveDebugTone(line),
  })),
)

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
  () => copyStatus.value,
  (value) => {
    if (!value) return
    const timer = window.setTimeout(() => {
      copyStatus.value = ''
    }, 1800)
    return () => window.clearTimeout(timer)
  },
)

async function handleCopyOutput() {
  const text = outputSummary.value
  if (!text.trim() || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    copyStatus.value = '当前环境不支持复制输出。'
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    copyStatus.value = '输出已复制。'
  } catch {
    copyStatus.value = '复制失败，请手动复制。'
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
        <span class="status-chip">{{ runState.status }}</span>
      </div>

      <dl class="summary-grid">
        <div>
          <dt>model</dt>
          <dd>{{ configSummary?.model || '尚未运行' }}</dd>
        </div>
        <div>
          <dt>baseURL</dt>
          <dd>{{ configSummary?.baseURL || '尚未运行' }}</dd>
        </div>
        <div>
          <dt>hasApiKey</dt>
          <dd>{{ configSummary ? String(configSummary.hasApiKey) : '尚未运行' }}</dd>
        </div>
        <div>
          <dt>durationMs</dt>
          <dd>{{ runState.durationMs === null ? '尚无' : runState.durationMs }}</dd>
        </div>
      </dl>
    </article>

    <article class="result-card output-card">
      <div class="card-header">
        <h2>输出</h2>
        <button type="button" class="ghost-button" @click="handleCopyOutput">复制输出</button>
      </div>
      <pre ref="outputPanelRef" :class="['output-panel', { empty: !runState.outputText.trim() }]">
        {{ outputSummary }}
      </pre>
      <p v-if="copyStatus" class="copy-status">{{ copyStatus }}</p>
    </article>

    <article class="result-card debug-card">
      <div class="card-header">
        <h2>调试</h2>
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
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 14px;
  background: var(--vp-c-bg);
  display: grid;
  gap: 10px;
  min-height: 0;
}

.summary-card {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--vp-c-brand-1) 8%, transparent), transparent 68%),
    var(--vp-c-bg);
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

.status-chip {
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  font-size: 12px;
  text-transform: uppercase;
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
  border-radius: 10px;
  padding: 9px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
}

.output-panel {
  margin: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
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
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
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

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
