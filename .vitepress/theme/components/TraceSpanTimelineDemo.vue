<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface TraceStep {
  lane: string
  title: string
  detail: string
  duration: number
}

const steps: TraceStep[] = [
  { lane: 'Agent', title: 'agent_turn', detail: '接收用户请求并创建根 Span', duration: 40 },
  { lane: 'LLM', title: 'llm_call', detail: '模型推理，消耗 320 input / 180 output tokens', duration: 820 },
  { lane: 'Tool', title: 'tool:search_docs', detail: '查询知识库，返回 4 条命中', duration: 96 },
  { lane: 'Tool', title: 'tool:summarize', detail: '压缩检索结果，减少上下文占用', duration: 58 },
  { lane: 'LLM', title: 'llm_call', detail: '综合工具结果并生成最终回复', duration: 540 },
]

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const visibleSteps = computed(() => steps.slice(0, current.value + 1))
const totalDuration = computed(() => visibleSteps.value.reduce((sum, step) => sum + step.duration, 0))
const toolCount = computed(() => visibleSteps.value.filter(step => step.lane === 'Tool').length)

onMounted(() => {
  timer = setInterval(() => {
    current.value = current.value >= steps.length - 1 ? 0 : current.value + 1
  }, 1500)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="tt-root">
    <div class="tt-header">
      <div>
        <div class="tt-title">P20 Trace / Log / Metric 联动</div>
        <div class="tt-subtitle">同一次 Agent 交互，在链路、日志和指标里分别长什么样。</div>
      </div>
      <div class="tt-kpis">
        <div class="tt-kpi">
          <span class="tt-kpi-num">{{ totalDuration }}ms</span>
          <span class="tt-kpi-label">当前累计时延</span>
        </div>
        <div class="tt-kpi">
          <span class="tt-kpi-num">{{ toolCount }}</span>
          <span class="tt-kpi-label">工具 Span 数</span>
        </div>
      </div>
    </div>

    <div class="tt-body">
      <div class="tt-timeline">
        <div v-for="(step, index) in visibleSteps" :key="`${step.title}-${index}`" class="tt-step">
          <div class="tt-lane">{{ step.lane }}</div>
          <div class="tt-dot" />
          <div class="tt-content">
            <div class="tt-step-title">{{ step.title }}</div>
            <div class="tt-step-detail">{{ step.detail }}</div>
          </div>
          <div class="tt-duration">{{ step.duration }}ms</div>
        </div>
      </div>

      <div class="tt-side">
        <div class="tt-card">
          <div class="tt-card-title">结构化日志</div>
          <pre class="tt-log">{"level":"info","span":"{{ visibleSteps.at(-1)?.title ?? 'agent_turn' }}","duration_ms":{{ visibleSteps.at(-1)?.duration ?? 0 }}}</pre>
        </div>
        <div class="tt-card">
          <div class="tt-card-title">指标视角</div>
          <div class="tt-metric-row"><span>P50 延迟</span><strong>640ms</strong></div>
          <div class="tt-metric-row"><span>P95 延迟</span><strong>1210ms</strong></div>
          <div class="tt-metric-row"><span>工具成功率</span><strong>98.5%</strong></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tt-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.tt-header,
.tt-body {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}
.tt-header {
  align-items: flex-start;
  margin-bottom: 1rem;
}
.tt-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.tt-subtitle {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.tt-kpis {
  display: flex;
  gap: 0.75rem;
}
.tt-kpi {
  min-width: 116px;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}
.tt-kpi-num {
  display: block;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.tt-kpi-label {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}
.tt-body {
  align-items: stretch;
}
.tt-timeline {
  flex: 1;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 0.9rem;
  background: var(--vp-c-bg);
}
.tt-step {
  display: grid;
  grid-template-columns: 64px 14px 1fr 64px;
  gap: 0.8rem;
  align-items: start;
  padding: 0.65rem 0;
}
.tt-step + .tt-step {
  border-top: 1px solid var(--vp-c-divider);
}
.tt-lane,
.tt-duration {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.tt-dot {
  width: 10px;
  height: 10px;
  margin-top: 0.3rem;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.12);
}
.tt-step-title {
  font-weight: 700;
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}
.tt-step-detail {
  margin-top: 0.2rem;
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}
.tt-side {
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.tt-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  padding: 0.9rem;
}
.tt-card-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.6rem;
}
.tt-log {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}
.tt-metric-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
}
.tt-metric-row + .tt-metric-row {
  margin-top: 0.45rem;
}
@media (max-width: 768px) {
  .tt-header,
  .tt-body {
    flex-direction: column;
  }
  .tt-side {
    width: auto;
  }
}
</style>
