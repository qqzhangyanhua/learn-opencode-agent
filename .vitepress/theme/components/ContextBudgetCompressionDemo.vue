<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const phase = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const leftMessages = computed(() => {
  if (phase.value === 0) return ['u1/a1', 'u2/a2', 'u3/a3', 'u4/a4', 'u5/a5']
  if (phase.value === 1) return ['u1/a1', 'u2/a2', 'u3/a3', 'u4/a4', 'u5/a5', 'u6/a6', 'u7/a7']
  return ['u4/a4', 'u5/a5', 'u6/a6', 'u7/a7']
})

const rightMessages = computed(() => {
  if (phase.value < 2) return ['u1/a1', 'u2/a2', 'u3/a3', 'u4/a4', 'u5/a5', 'u6/a6', 'u7/a7']
  return ['摘要(u1-u3)', 'u4/a4', 'u5/a5', 'u6/a6', 'u7/a7']
})

onMounted(() => {
  timer = setInterval(() => {
    phase.value = (phase.value + 1) % 3
  }, 1800)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="cb-root">
    <div class="cb-header">
      <div class="cb-title">P25 长上下文治理</div>
      <div class="cb-subtitle">滑动窗口是在丢历史，渐进摘要是在压缩历史。</div>
    </div>

    <div class="cb-panels">
      <div class="cb-panel">
        <div class="cb-panel-title">滑动窗口</div>
        <div class="cb-msgs">
          <div v-for="msg in leftMessages" :key="msg" class="cb-msg">{{ msg }}</div>
        </div>
        <div class="cb-note danger">超出预算后，最早的上下文直接消失。</div>
      </div>

      <div class="cb-panel">
        <div class="cb-panel-title">渐进式摘要</div>
        <div class="cb-msgs">
          <div v-for="msg in rightMessages" :key="msg" class="cb-msg" :class="{ summary: msg.startsWith('摘要') }">{{ msg }}</div>
        </div>
        <div class="cb-note ok">超出预算后，把早期消息压成摘要继续保留。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cb-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}
.cb-header {
  margin-bottom: 1rem;
}
.cb-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.cb-subtitle {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.cb-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.cb-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 0.95rem;
  background: var(--vp-c-bg);
}
.cb-panel-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.75rem;
}
.cb-msgs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.cb-msg {
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}
.cb-msg.summary {
  border-color: #0d9488;
  color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
}
.cb-note {
  margin-top: 0.8rem;
  font-size: 0.76rem;
  line-height: 1.6;
}
.cb-note.danger {
  color: #b45309;
}
.cb-note.ok {
  color: #0d9488;
}
@media (max-width: 768px) {
  .cb-panels {
    grid-template-columns: 1fr;
  }
}
</style>
