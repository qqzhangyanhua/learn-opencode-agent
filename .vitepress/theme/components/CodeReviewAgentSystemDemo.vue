<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const flow = [
  { id: 'diff', label: 'DiffParser', detail: '把 git diff 解析成结构化文件变更' },
  { id: 'orch', label: 'ReviewOrchestrator', detail: '拆成安全审查和质量审查两个子任务' },
  { id: 'workers', label: 'Security + Quality', detail: '并行执行，互不干扰' },
  { id: 'agg', label: 'ReviewAggregator', detail: '去重、排序、合并建议' },
  { id: 'report', label: 'ReportGenerator', detail: '生成最终 Code Review 报告' },
]

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const active = computed(() => flow[current.value])

onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % flow.length
  }, 1700)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="cr-root">
    <div class="cr-header">
      <div class="cr-title">P22 Code Review Agent 总装图</div>
      <div class="cr-subtitle">不是再加一个技巧，而是把前面模块真正串成产品链路。</div>
    </div>

    <div class="cr-pipeline">
      <div
        v-for="(node, index) in flow"
        :key="node.id"
        class="cr-node"
        :class="{ active: current === index }"
      >
        <div class="cr-node-name">{{ node.label }}</div>
      </div>
    </div>

    <div class="cr-detail">
      <div class="cr-detail-title">{{ active.label }}</div>
      <div class="cr-detail-text">{{ active.detail }}</div>
    </div>
  </div>
</template>

<style scoped>
.cr-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.cr-header {
  margin-bottom: 1rem;
}
.cr-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.cr-subtitle {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.cr-pipeline {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
}
.cr-node {
  position: relative;
  padding: 0.85rem 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  text-align: center;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cr-node.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
}
.cr-node-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.cr-detail {
  margin-top: 1rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}
.cr-detail-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.cr-detail-text {
  margin-top: 0.35rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
@media (max-width: 768px) {
  .cr-pipeline {
    grid-template-columns: 1fr;
  }
}
</style>
