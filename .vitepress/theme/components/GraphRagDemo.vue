<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type GraphNodeType = 'person' | 'project' | 'department' | 'tech'

interface GraphNode {
  id: string
  label: string
  type: GraphNodeType
  x: number
  y: number
}

interface GraphEdge {
  from: string
  to: string
  relation: string
}

type GraphNodeStatus = 'unvisited' | 'current' | 'visited' | 'target'

const props = withDefaults(defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
  startNodeId: string
  query: string
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 1500,
})

interface NodeState extends GraphNode {
  status: GraphNodeStatus
}

interface EdgeState extends GraphEdge {
  active: boolean
}

const nodeStates = ref<NodeState[]>(
  props.nodes.map(node => ({ ...node, status: 'unvisited' as GraphNodeStatus }))
)
const edgeStates = ref<EdgeState[]>(
  props.edges.map(edge => ({ ...edge, active: false }))
)

const currentHop = ref(0)
const visitedQueue = ref<string[]>([])
const toVisitQueue = ref<string[]>([props.startNodeId])
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; type: 'info' | 'success' | 'hop' }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentNodeId = computed(() => {
  const current = nodeStates.value.find(n => n.status === 'current')
  return current?.id || null
})

function getNodeById(id: string): NodeState | undefined {
  return nodeStates.value.find(n => n.id === id)
}

function getNodeLabel(id: string): string {
  return getNodeById(id)?.label || id
}

function addLog(msg: string, type: 'info' | 'success' | 'hop') {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, type })
  if (executionLog.value.length > 12) executionLog.value.pop()
}

function getNeighbors(nodeId: string): string[] {
  return props.edges
    .filter(e => e.from === nodeId)
    .map(e => e.to)
}

function activateEdge(from: string, to: string) {
  const edge = edgeStates.value.find(e => e.from === from && e.to === to)
  if (edge) edge.active = true
}

function nextStep() {
  if (toVisitQueue.value.length === 0) {
    stopDemo()
    addLog('图遍历完成', 'success')
    return
  }

  // 取出队首节点
  const nodeId = toVisitQueue.value.shift()!
  const node = getNodeById(nodeId)
  if (!node) return

  // 标记为当前访问
  nodeStates.value.forEach(n => {
    if (n.status === 'current') n.status = 'visited'
  })
  node.status = 'current'
  addLog(`第${currentHop.value}跳: 访问 ${node.label}`, 'hop')

  // 获取邻居节点
  const neighbors = getNeighbors(nodeId)
  neighbors.forEach(neighborId => {
    const neighbor = getNodeById(neighborId)
    if (!neighbor) return

    // 激活边
    activateEdge(nodeId, neighborId)

    // 如果邻居未访问且不在队列中，加入队列
    if (neighbor.status === 'unvisited' && !toVisitQueue.value.includes(neighborId)) {
      toVisitQueue.value.push(neighborId)
      addLog(`  发现: ${neighbor.label}`, 'info')
    }
  })

  // 标记为已访问
  setTimeout(() => {
    if (node.status === 'current') {
      node.status = 'visited'
      visitedQueue.value.push(nodeId)
    }
  }, props.playSpeed * 0.6)

  currentHop.value++
}

function startDemo() {
  if (isRunning.value) return
  isRunning.value = true
  resetState()
  addLog(`开始从 ${getNodeLabel(props.startNodeId)} 遍历图...`, 'info')
  addLog(`查询: ${props.query}`, 'info')
  timer = setInterval(nextStep, props.playSpeed)
}

function stopDemo() {
  isRunning.value = false
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function resetState() {
  nodeStates.value = props.nodes.map(node => ({
    ...node,
    status: node.id === props.startNodeId ? 'unvisited' : 'unvisited'
  }))
  edgeStates.value = props.edges.map(edge => ({ ...edge, active: false }))
  currentHop.value = 0
  visitedQueue.value = []
  toVisitQueue.value = [props.startNodeId]
  executionLog.value = []
}

function resetDemo() {
  stopDemo()
  resetState()
}

onUnmounted(() => stopDemo())

if (props.autoPlay) startDemo()

// SVG 视图框尺寸
const viewBoxWidth = 600
const viewBoxHeight = 400
</script>

<template>
  <div class="grd-root">
    <div class="grd-header">
      <div class="grd-title-row">
        <span class="grd-indicator" :class="{ running: isRunning }" />
        <span class="grd-title">知识图谱 BFS 遍历</span>
        <span class="grd-badge">P8 · GraphRAG</span>
      </div>
      <div class="grd-actions">
        <button class="grd-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始遍历' }}
        </button>
        <button class="grd-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="grd-query-box">
      <span class="grd-query-label">查询:</span>
      <span class="grd-query-text">{{ query }}</span>
    </div>

    <div class="grd-body">
      <div class="grd-graph">
        <svg :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`" class="grd-svg">
          <!-- 边 -->
          <g class="grd-edges">
            <g v-for="edge in edgeStates" :key="`${edge.from}-${edge.to}`">
              <line
                :x1="getNodeById(edge.from)?.x"
                :y1="getNodeById(edge.from)?.y"
                :x2="getNodeById(edge.to)?.x"
                :y2="getNodeById(edge.to)?.y"
                class="grd-edge"
                :class="{ active: edge.active }"
              />
              <text
                :x="((getNodeById(edge.from)?.x || 0) + (getNodeById(edge.to)?.x || 0)) / 2"
                :y="((getNodeById(edge.from)?.y || 0) + (getNodeById(edge.to)?.y || 0)) / 2 - 5"
                class="grd-edge-label"
                :class="{ active: edge.active }"
              >
                {{ edge.relation }}
              </text>
            </g>
          </g>

          <!-- 节点 -->
          <g class="grd-nodes">
            <g v-for="node in nodeStates" :key="node.id">
              <circle
                :cx="node.x"
                :cy="node.y"
                :r="30"
                class="grd-node"
                :class="[node.status, node.type]"
              />
              <text
                :x="node.x"
                :y="node.y + 5"
                class="grd-node-label"
                :class="node.status"
              >
                {{ node.label }}
              </text>
            </g>
          </g>
        </svg>
      </div>

      <aside class="grd-sidebar">
        <section class="grd-block">
          <div class="grd-block-header">当前跳数</div>
          <div class="grd-hop-display">{{ currentHop }}</div>
        </section>

        <section class="grd-block">
          <div class="grd-block-header">待访问队列</div>
          <div v-if="toVisitQueue.length === 0" class="grd-empty">队列为空</div>
          <div v-for="id in toVisitQueue" :key="id" class="grd-queue-item">
            {{ getNodeLabel(id) }}
          </div>
        </section>

        <section class="grd-block">
          <div class="grd-block-header">已访问节点</div>
          <div v-if="visitedQueue.length === 0" class="grd-empty">无</div>
          <div v-for="id in visitedQueue" :key="id" class="grd-queue-item visited">
            {{ getNodeLabel(id) }}
          </div>
        </section>

        <section class="grd-block grd-log">
          <div class="grd-block-header">遍历日志</div>
          <div class="grd-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="grd-log-line" :class="log.type">
              <span class="grd-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="grd-empty">等待遍历...</div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.grd-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
}

.grd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.grd-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.grd-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.grd-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.grd-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.grd-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.grd-actions {
  display: flex;
  gap: 0.5rem;
}

.grd-btn-primary {
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.grd-btn-primary:hover {
  opacity: 0.9;
}

.grd-btn-primary.active {
  background: #0f766e;
}

.grd-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.grd-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
}

.grd-query-box {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.grd-query-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.grd-query-text {
  font-size: 0.9375rem;
  color: var(--vp-c-text-1);
  font-style: italic;
}

.grd-body {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 1.25rem;
  min-height: 450px;
}

.grd-graph {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  overflow: hidden;
}

.grd-svg {
  width: 100%;
  height: 100%;
}

.grd-edge {
  stroke: var(--vp-c-divider);
  stroke-width: 2;
  transition: stroke 0.3s, stroke-width 0.3s;
}

.grd-edge.active {
  stroke: var(--vp-c-brand-1);
  stroke-width: 3;
}

.grd-edge-label {
  font-size: 10px;
  fill: var(--vp-c-text-3);
  text-anchor: middle;
  transition: fill 0.3s, font-weight 0.3s;
}

.grd-edge-label.active {
  fill: var(--vp-c-brand-1);
  font-weight: 600;
}

.grd-node {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 2;
  transition: all 0.3s;
}

.grd-node.unvisited {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
}

.grd-node.current {
  fill: var(--vp-c-brand-1);
  stroke: var(--vp-c-brand-1);
  stroke-width: 3;
  filter: drop-shadow(0 0 8px var(--vp-c-brand-1));
}

.grd-node.visited {
  fill: #10b981;
  stroke: #10b981;
}

.grd-node.target {
  fill: #f59e0b;
  stroke: #f59e0b;
}

.grd-node-label {
  font-size: 12px;
  fill: var(--vp-c-text-1);
  text-anchor: middle;
  font-weight: 500;
  transition: fill 0.3s, font-weight 0.3s;
  pointer-events: none;
}

.grd-node-label.current,
.grd-node-label.visited,
.grd-node-label.target {
  fill: #fff;
  font-weight: 600;
}

.grd-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.grd-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.grd-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.grd-hop-display {
  font-size: 2rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  text-align: center;
  padding: 0.5rem;
}

.grd-queue-item {
  font-size: 0.8125rem;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  border-left: 3px solid var(--vp-c-brand-1);
}

.grd-queue-item.visited {
  border-left-color: #10b981;
  opacity: 0.7;
}

.grd-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

.grd-log {
  flex: 1;
}

.grd-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.grd-log-line {
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.grd-log-line.hop { color: var(--vp-c-brand-1); font-weight: 600; }
.grd-log-line.success { color: #10b981; }
.grd-log-line.info { color: var(--vp-c-text-2); }

.grd-log-ts {
  color: var(--vp-c-text-3);
  margin-right: 0.4rem;
}

@media (max-width: 768px) {
  .grd-body {
    grid-template-columns: 1fr;
  }

  .grd-graph {
    min-height: 350px;
  }
}
</style>
