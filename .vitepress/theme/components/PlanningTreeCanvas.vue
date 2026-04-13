<script setup lang="ts">
import type { PlanningTreeNodeSnapshot } from './types'

interface PlanningTreeCanvasProps {
  stageLabel: string
  nodes: PlanningTreeNodeSnapshot[]
}

defineProps<PlanningTreeCanvasProps>()

const statusTextMap = {
  pending: '待处理',
  current: '进行中',
  completed: '已完成',
  blocked: '阻塞'
} as const
</script>

<template>
  <section class="planning-tree-canvas">
    <header>
      <h4>任务树</h4>
      <span>{{ stageLabel }}</span>
    </header>
    <ul>
      <li v-for="node in nodes" :key="node.id" class="planning-tree-node">
        <div class="planning-node-main">
          <strong>{{ node.label }}</strong>
          <em :class="`status-${node.status}`">{{ statusTextMap[node.status] }}</em>
        </div>
        <p v-if="node.parentId" class="planning-node-parent">依赖父节点：{{ node.parentId }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.planning-tree-canvas {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 1rem;
  background: var(--vp-c-bg);
}

header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

h4 {
  margin: 0;
  color: var(--vp-c-text-1);
}

header span {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.45rem;
}

.planning-tree-node {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  background: var(--vp-c-bg-soft);
}

.planning-node-main {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}

strong {
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
}

em {
  font-style: normal;
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
}

.status-pending {
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
}

.status-current {
  color: #155e75;
  background: #cffafe;
}

.status-completed {
  color: #166534;
  background: #dcfce7;
}

.status-blocked {
  color: #991b1b;
  background: #fee2e2;
}

.planning-node-parent {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
</style>
