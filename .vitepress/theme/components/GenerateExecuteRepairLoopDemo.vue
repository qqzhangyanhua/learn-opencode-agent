<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const stages = [
  { title: '生成代码', detail: '先产出一个可执行版本。', log: 'function sum(a, b) { return a + c }' },
  { title: '执行代码', detail: '把生成结果交给沙箱子进程运行。', log: 'node /tmp/agent-run.js' },
  { title: '获取错误', detail: 'stderr 原样返回给模型。', log: 'ReferenceError: c is not defined' },
  { title: '修正重试', detail: '模型根据真实错误修正实现。', log: 'function sum(a, b) { return a + b }' },
  { title: '成功完成', detail: 'stdout 正常返回，循环收敛。', log: '3' },
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
  <div class="ge-root">
    <div class="ge-title">P27 Generate → Execute → Repair</div>
    <div class="ge-loop">
      <div
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="ge-stage"
        :class="{ active: current === index }"
      >
        {{ stage.title }}
      </div>
    </div>
    <div class="ge-card">
      <div class="ge-card-title">{{ active.title }}</div>
      <div class="ge-card-detail">{{ active.detail }}</div>
      <pre class="ge-code">{{ active.log }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ge-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.ge-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}
.ge-loop {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.55rem;
}
.ge-stage {
  padding: 0.7rem 0.5rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  text-align: center;
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}
.ge-stage.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
}
.ge-card {
  margin-top: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  padding: 0.95rem;
}
.ge-card-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.ge-card-detail {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}
.ge-code {
  margin: 0.8rem 0 0;
  padding: 0.75rem;
  border-radius: 10px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 0.72rem;
  white-space: pre-wrap;
  word-break: break-word;
}
@media (max-width: 768px) {
  .ge-loop {
    grid-template-columns: 1fr;
  }
}
</style>
