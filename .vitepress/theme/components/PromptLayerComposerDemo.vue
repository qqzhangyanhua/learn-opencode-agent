<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const layers = [
  { title: '角色定义', detail: '你是谁，服务谁，擅长什么。', example: '你是 TypeScript 代码审查专家。' },
  { title: '行为约束', detail: '哪些边界不能跨，缺信息时怎么回应。', example: '只评审代码质量，不评论业务策略。' },
  { title: '输出格式', detail: '结果怎么组织，便于稳定消费。', example: '按 critical / warning / suggestion 分组。' },
]

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const composedPrompt = computed(() => layers.slice(0, current.value + 1).map(layer => layer.example).join('\n'))

onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % layers.length
  }, 1700)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="pl-root">
    <div class="pl-title">P24 Prompt 三层拼装</div>
    <div class="pl-body">
      <div class="pl-layers">
        <div
          v-for="(layer, index) in layers"
          :key="layer.title"
          class="pl-layer"
          :class="{ active: current === index, done: current > index }"
        >
          <div class="pl-layer-title">{{ layer.title }}</div>
          <div class="pl-layer-detail">{{ layer.detail }}</div>
        </div>
      </div>
      <div class="pl-output">
        <div class="pl-output-title">组合后的 System Prompt</div>
        <pre class="pl-code">{{ composedPrompt }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pl-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.pl-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}
.pl-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.pl-layers {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.pl-layer,
.pl-output {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}
.pl-layer {
  padding: 0.9rem;
}
.pl-layer.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
}
.pl-layer.done {
  border-color: rgba(13, 148, 136, 0.25);
}
.pl-layer-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.pl-layer-detail {
  margin-top: 0.3rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}
.pl-output {
  padding: 0.95rem;
}
.pl-output-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.pl-code {
  margin: 0.7rem 0 0;
  padding: 0.8rem;
  border-radius: 10px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 0.73rem;
  white-space: pre-wrap;
  word-break: break-word;
}
@media (max-width: 768px) {
  .pl-body {
    grid-template-columns: 1fr;
  }
}
</style>
