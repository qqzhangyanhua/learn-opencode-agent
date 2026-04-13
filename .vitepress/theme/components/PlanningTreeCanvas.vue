<script setup lang="ts">
import { computed } from 'vue'
import type { PlanningTreeNodeSnapshot } from './types'

interface PlanningTreeCanvasProps {
  stageLabel: string
  nodes: PlanningTreeNodeSnapshot[]
}

const props = defineProps<PlanningTreeCanvasProps>()

const statusMetaMap = {
  pending: { label: '待处理', className: 'status-pending' },
  current: { label: '进行中', className: 'status-current' },
  completed: { label: '已完成', className: 'status-completed' },
  blocked: { label: '阻塞', className: 'status-blocked' }
} as const

const treeRows = computed(() => {
  const nodeMap = new Map(props.nodes.map(node => [node.id, node]))

  return props.nodes.map(node => {
    let depth = 0
    let parent = node.parentId ? nodeMap.get(node.parentId) : undefined
    while (parent) {
      depth += 1
      parent = parent.parentId ? nodeMap.get(parent.parentId) : undefined
    }

    return {
      ...node,
      depth,
      parentLabel: node.parentId ? nodeMap.get(node.parentId)?.label : undefined
    }
  })
})
</script>

<template>
  <section class="planning-tree-canvas">
    <header>
      <h4>任务树</h4>
      <span>{{ props.stageLabel }}</span>
    </header>
    <p class="planning-tree-legend">
      <i class="status-current"></i> 当前推进
      <i class="status-blocked"></i> 阻塞路径
      <i class="status-completed"></i> 已完成
      <i class="status-pending"></i> 待执行
    </p>
    <ul>
      <li
        v-for="node in treeRows"
        :key="node.id"
        class="planning-tree-node"
        :class="statusMetaMap[node.status].className"
        :style="{ '--node-depth': `${node.depth}` }"
      >
        <div class="planning-node-main">
          <strong>{{ node.label }}</strong>
          <em>{{ statusMetaMap[node.status].label }}</em>
        </div>
        <p v-if="node.parentLabel" class="planning-node-parent">来源节点：{{ node.parentLabel }}</p>
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
  gap: 0.5rem;
}

.planning-tree-node {
  border: 1px solid color-mix(in srgb, var(--vp-c-divider) 88%, transparent);
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  background: var(--vp-c-bg-soft);
  border-left-width: 4px;
  margin-left: calc(var(--node-depth) * 14px);
}

.planning-node-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: start;
}

strong {
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  min-width: 0;
  line-height: 1.5;
}

em {
  font-style: normal;
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  color: inherit;
  white-space: nowrap;
}

.planning-tree-legend {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin: 0 0 0.75rem;
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
}

.planning-tree-legend i {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  margin-right: 0.25rem;
}

.status-pending,
.status-pending em,
.planning-tree-legend .status-pending {
  color: var(--vp-c-text-2);
  border-left-color: #64748b;
  background: color-mix(in srgb, #64748b 10%, var(--vp-c-bg-soft));
}

.status-current,
.status-current em,
.planning-tree-legend .status-current {
  color: #155e75;
  border-left-color: #0891b2;
  background: #ecfeff;
}

.status-completed,
.status-completed em,
.planning-tree-legend .status-completed {
  color: #166534;
  border-left-color: #16a34a;
  background: #f0fdf4;
}

.status-blocked,
.status-blocked em,
.planning-tree-legend .status-blocked {
  color: #991b1b;
  border-left-color: #dc2626;
  background: #fff1f2;
}

.planning-node-parent {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
</style>
