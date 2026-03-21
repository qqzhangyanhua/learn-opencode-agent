<script setup lang="ts">
import { computed } from 'vue'
import type {
  PracticePlaygroundChapter,
  PracticePlaygroundRunState,
} from './practicePlaygroundTypes'

const props = defineProps<{
  chapter: PracticePlaygroundChapter
  runState: PracticePlaygroundRunState
}>()

const configSummary = computed(() => props.runState.configSnapshot)
const outputSummary = computed(() => {
  if (props.runState.outputText.trim()) return props.runState.outputText
  if (props.runState.status === 'error') return '本次运行失败，请查看下方调试信息。'
  if (props.runState.status === 'running') return '请求进行中，等待模型返回...'
  return '尚未运行，请先点击“一键运行”。'
})
const debugLines = computed(() => {
  if (props.runState.debugLines.length > 0) return props.runState.debugLines
  return ['等待运行。']
})

function getStatusLabel(status: PracticePlaygroundRunState['status']): string {
  if (status === 'running') return '运行中'
  if (status === 'success') return '已完成'
  if (status === 'error') return '运行失败'
  return '未开始'
}
</script>

<template>
  <section class="playground-output">
    <article class="output-card">
      <h2>请求配置摘要</h2>
      <dl class="summary-grid">
        <div>
          <dt>当前章节</dt>
          <dd>{{ chapter.number }} · {{ chapter.title }}</dd>
        </div>
        <div>
          <dt>baseURL</dt>
          <dd>{{ configSummary?.baseURL || '尚未运行' }}</dd>
        </div>
        <div>
          <dt>model</dt>
          <dd>{{ configSummary?.model || '尚未运行' }}</dd>
        </div>
        <div>
          <dt>API Key</dt>
          <dd>{{ configSummary ? (configSummary.hasApiKey ? '已填写' : '未填写') : '尚未运行' }}</dd>
        </div>
        <div>
          <dt>运行状态</dt>
          <dd>{{ getStatusLabel(runState.status) }}</dd>
        </div>
        <div>
          <dt>耗时</dt>
          <dd>{{ runState.durationMs === null ? '尚无' : `${runState.durationMs} ms` }}</dd>
        </div>
      </dl>
    </article>

    <article class="output-card">
      <h2>运行输出</h2>
      <pre class="output-panel">{{ outputSummary }}</pre>
    </article>

    <article class="output-card">
      <h2>调试信息</h2>
      <p v-if="runState.errorMessage" class="error-message">{{ runState.errorMessage }}</p>
      <ul class="debug-list">
        <li v-for="line in debugLines" :key="line">{{ line }}</li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.playground-output {
  display: grid;
  gap: 12px;
}

.output-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
}

.output-card h2 {
  margin: 0 0 12px;
  font-size: 18px;
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
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.summary-grid dd {
  margin: 6px 0 0;
  word-break: break-word;
}

.output-panel {
  margin: 0;
  padding: 14px;
  border-radius: 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--vp-font-family-mono);
  line-height: 1.6;
}

.debug-list {
  margin: 0;
  padding-left: 18px;
  color: var(--vp-c-text-2);
  display: grid;
  gap: 6px;
}

.error-message {
  margin: 0 0 12px;
  color: var(--vp-c-danger-1);
}

@media (max-width: 700px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
