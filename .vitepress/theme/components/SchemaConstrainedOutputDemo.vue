<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const stages = [
  { title: '定义 Zod Schema', detail: '先把输出结构写成显式约束。', sample: 'z.object({ severity, message, fix })' },
  { title: '传给 parse()', detail: 'SDK 把 Schema 转成模型可理解的约束。', sample: 'response_format = zodResponseFormat(...)' },
  { title: '模型填充字段', detail: '模型输出会被约束到预期字段集合。', sample: '{ "severity": "warning", "message": "...", "fix": "..." }' },
  { title: 'SDK 验证结果', detail: '不符合 Schema 的输出不会进入 parsed。', sample: 'message.parsed 或 message.refusal' },
]

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const active = computed(() => stages[current.value])

onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % stages.length
  }, 1600)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="sc-root">
    <div class="sc-header">
      <div class="sc-title">P26 Schema 约束输出链</div>
      <div class="sc-badge">当前阶段：{{ active.title }}</div>
    </div>

    <div class="sc-stages">
      <div
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="sc-stage"
        :class="{ active: current === index, done: current > index }"
      >
        {{ stage.title }}
      </div>
    </div>

    <div class="sc-card">
      <div class="sc-card-detail">{{ active.detail }}</div>
      <pre class="sc-code">{{ active.sample }}</pre>
    </div>
  </div>
</template>

<style scoped>
.sc-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}
.sc-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.sc-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.sc-badge {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
  font-size: 0.76rem;
  font-weight: 700;
}
.sc-stages {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}
.sc-stage {
  padding: 0.75rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  text-align: center;
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}
.sc-stage.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
}
.sc-stage.done {
  border-color: rgba(13, 148, 136, 0.25);
}
.sc-card {
  margin-top: 1rem;
  padding: 0.95rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}
.sc-card-detail {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
.sc-code {
  margin: 0.75rem 0 0;
  padding: 0.8rem;
  border-radius: 10px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 0.73rem;
  white-space: pre-wrap;
  word-break: break-word;
}
@media (max-width: 768px) {
  .sc-stages {
    grid-template-columns: 1fr;
  }
}
</style>
