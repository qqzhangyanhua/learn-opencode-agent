<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TopologyLink, TopologyNode } from './types'
import TopologyNodeLabel from './TopologyNodeLabel.vue'

type ProductionStageKey = 'entry' | 'session' | 'boundary' | 'recovery'

interface ProductionStageMeta {
  id: ProductionStageKey
  label: '统一入口' | '会话编排' | '执行边界' | '恢复闭环'
  summary: string
  action: string
  focusNodes: string[]
  focusLinks: string[]
  checkpoints: string[]
}

const props = withDefaults(defineProps<{
  title: string
  nodes: TopologyNode[]
  links: TopologyLink[]
  viewBoxWidth: number
  viewBoxHeight: number
  showLegend?: boolean
}>(), {
  showLegend: true
})

const stages: ProductionStageMeta[] = [
  {
    id: 'entry',
    label: '统一入口',
    summary: '先把接入协议、鉴权、限流和事件入口统一起来，后面的会话与执行链才有稳定边界。',
    action: '优先检查请求是不是从统一网关进入，而不是让每个客户端自己直连编排层。',
    focusNodes: ['client', 'gateway'],
    focusLinks: ['client->gateway'],
    checkpoints: ['入口协议一致', '鉴权与限流前置', '错误语义对齐']
  },
  {
    id: 'session',
    label: '会话编排',
    summary: '会话恢复、上下文装配和执行循环必须单独负责，不能把状态逻辑塞进模型调用层。',
    action: '先确认谁在恢复会话、谁在推进任务，再看模型只是执行者还是被迫承担状态机。',
    focusNodes: ['gateway', 'orch', 'db'],
    focusLinks: ['gateway->orch', 'orch->db'],
    checkpoints: ['会话可恢复', '执行循环独立', '状态写回清晰']
  },
  {
    id: 'boundary',
    label: '执行边界',
    summary: 'Provider、工具执行和权限决策要各守其边，模型不能直接越过运行时边界。',
    action: '检查工具调用是否一定经过注册、权限与降级链，而不是在业务代码里散着执行。',
    focusNodes: ['orch', 'llm', 'llm-fb', 'tools'],
    focusLinks: ['orch->llm', 'orch->llm-fb', 'orch->tools'],
    checkpoints: ['主模型与降级链明确', '工具执行经过边界', '失败有止损路径']
  },
  {
    id: 'recovery',
    label: '恢复闭环',
    summary: '生产系统不是只会处理成功路径，还要能观察、降级、重试，并把关键状态带回系统。',
    action: '先看请求失败后能不能解释卡在哪一层，再看监控和恢复动作有没有闭环。',
    focusNodes: ['tools', 'db', 'obs', 'llm', 'llm-fb'],
    focusLinks: ['tools->obs', 'llm->obs', 'orch->db', 'orch->llm-fb'],
    checkpoints: ['链路可追踪', '失败可恢复', '观测和存储同步']
  }
]

const activeStage = ref<ProductionStageKey>('entry')
const selectedId = ref<string | null>(stages[0]?.focusNodes[0] ?? null)
const hoverNodeId = ref<string | null>(null)

const activeStageMeta = computed(
  () => stages.find(stage => stage.id === activeStage.value) ?? stages[0]
)

const selected = computed(() => props.nodes.find(node => node.id === selectedId.value) ?? null)
const activeNodeIds = computed(() => new Set(activeStageMeta.value.focusNodes))
const activeLinkKeys = computed(() => new Set(activeStageMeta.value.focusLinks))
const stageNodes = computed(() =>
  props.nodes.filter(node => activeNodeIds.value.has(node.id))
)

const selectedStageSummary = computed(() => {
  if (!selected.value) return '点击左侧节点，查看它在当前阶段承担的职责。'

  const map: Record<ProductionStageKey, Record<string, string>> = {
    entry: {
      client: '客户端负责把不同入口收束到统一协议，否则后面所有状态都会分叉。',
      gateway: '网关负责先挡住错误和越界请求，避免编排层直接暴露在外。'
    },
    session: {
      gateway: '网关把请求交给编排层之前，需要确保参数、身份和流式协议都稳定。',
      orch: '编排层负责恢复会话、推进主循环和拆解执行责任。',
      db: '会话数据库把中间状态带出进程内存，保证恢复和追踪都有落点。'
    },
    boundary: {
      orch: '编排层决定什么时候调用模型、什么时候走工具，而不是把所有判断丢给模型。',
      llm: '主模型负责主要推理，但不应该兼任权限与持久化角色。',
      'llm-fb': '备用模型不是装饰，它决定高负载或失败时系统能否继续服务。',
      tools: '工具执行层是硬边界，任何外部动作都应该在这里被统一收口。'
    },
    recovery: {
      tools: '工具调用结果需要进入观测层，才能知道故障到底出在执行还是依赖。',
      db: '恢复闭环离不开状态回写，否则重试和续跑都只是表面动作。',
      obs: '观测层把成本、延迟、错误位置和重试链串成可解释证据。',
      llm: '主模型告警进入观测层后，才能判断是质量问题还是上游故障。',
      'llm-fb': '备用模型既是容灾手段，也是验证降级策略是否可用的真实证据。'
    }
  }

  return map[activeStage.value][selected.value.id] ?? '这个节点在当前阶段不是主焦点，但仍然参与整体链路。'
})

function linkKey(link: TopologyLink) {
  return `${link.source}->${link.target}`
}

function changeStage(stage: ProductionStageKey) {
  activeStage.value = stage
  const nextFocusId = stages.find(item => item.id === stage)?.focusNodes[0] ?? null
  if (!selectedId.value || !activeNodeIds.value.has(selectedId.value)) {
    selectedId.value = nextFocusId
    return
  }
  if (!activeNodeIds.value.has(selectedId.value)) {
    selectedId.value = nextFocusId
  }
}

function nodeX(node: TopologyNode) {
  return node.x
}

function nodeY(node: TopologyNode) {
  return node.y
}

function isStageLink(link: TopologyLink) {
  return activeLinkKeys.value.has(linkKey(link))
}

function isHighlightedLink(link: TopologyLink) {
  if (selectedId.value && (link.source === selectedId.value || link.target === selectedId.value)) {
    return true
  }
  return isStageLink(link)
}

function nodeStroke(node: TopologyNode) {
  if (selectedId.value === node.id) return '#0d9488'
  if (hoverNodeId.value === node.id) return '#5eead4'
  if (activeNodeIds.value.has(node.id)) return '#14b8a6'
  if (node.status === 'down') return '#ef4444'
  if (node.status === 'degraded') return '#f59e0b'
  return 'var(--vp-c-divider)'
}

function nodeStrokeWidth(node: TopologyNode) {
  if (selectedId.value === node.id) return 2.75
  if (hoverNodeId.value === node.id || activeNodeIds.value.has(node.id)) return 2
  return 1.5
}

function nodeFill(node: TopologyNode) {
  if (selectedId.value === node.id) return 'rgba(13,148,136,0.12)'
  if (activeNodeIds.value.has(node.id)) return 'rgba(20,184,166,0.08)'
  if (node.status === 'down') return 'rgba(239,68,68,0.08)'
  if (node.status === 'degraded') return 'rgba(245,158,11,0.08)'
  return 'var(--vp-c-bg)'
}

function linkStroke(link: TopologyLink) {
  if (selectedId.value && (link.source === selectedId.value || link.target === selectedId.value)) {
    return '#0d9488'
  }
  if (isStageLink(link)) return '#14b8a6'
  if (link.type === 'alert') return '#ef4444'
  if (link.type === 'data') return 'var(--vp-c-brand-1)'
  return 'var(--vp-c-divider)'
}

function linkOpacity(link: TopologyLink) {
  if (selectedId.value && (link.source === selectedId.value || link.target === selectedId.value)) {
    return 1
  }
  if (isStageLink(link)) return 0.95
  return 0.22
}

function nodeOpacity(node: TopologyNode) {
  if (selectedId.value === node.id) return 1
  if (activeNodeIds.value.has(node.id)) return 1
  if (hoverNodeId.value === node.id) return 0.9
  return 0.28
}

function linkDash(link: TopologyLink) {
  if (link.type === 'alert') return '4 2'
  if (link.type === 'control') return '6 3'
  return 'none'
}

function onNodeClick(node: TopologyNode) {
  selectedId.value = node.id
}
</script>

<template>
  <div class="pad-root">
    <div class="pad-header">
      <div class="pad-title-row">
        <span class="pad-title">{{ title }}</span>
        <span class="pad-badge">Ch30 · Production</span>
      </div>
      <div class="pad-hint">
        先按阶段切，再点节点看职责，能更快记住生产链路的边界。
      </div>
    </div>

    <div class="pad-stage-tabs" role="tablist" aria-label="生产架构阶段切换">
      <button
        v-for="stage in stages"
        :key="stage.id"
        type="button"
        class="pad-stage-btn"
        :class="{ active: activeStage === stage.id }"
        :aria-selected="activeStage === stage.id"
        @click="changeStage(stage.id)"
      >
        {{ stage.label }}
      </button>
    </div>

    <div class="pad-body">
      <div class="pad-canvas-wrap">
        <svg :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`" class="pad-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--vp-c-divider)" />
            </marker>
            <marker id="arrowhead-brand" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#0d9488" />
            </marker>
            <marker id="arrowhead-stage" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#14b8a6" />
            </marker>
            <marker id="arrowhead-alert" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>

          <line
            v-for="(link, index) in links"
            :key="`link-${index}`"
            :x1="nodeX(nodes.find(node => node.id === link.source)!)"
            :y1="nodeY(nodes.find(node => node.id === link.source)!)"
            :x2="nodeX(nodes.find(node => node.id === link.target)!)"
            :y2="nodeY(nodes.find(node => node.id === link.target)!)"
            :stroke="linkStroke(link)"
            :stroke-opacity="linkOpacity(link)"
            :stroke-dasharray="linkDash(link)"
            stroke-width="1.5"
            :marker-end="
              selectedId && (link.source === selectedId || link.target === selectedId)
                ? 'url(#arrowhead-brand)'
                : isStageLink(link)
                  ? 'url(#arrowhead-stage)'
                  : link.type === 'alert'
                    ? 'url(#arrowhead-alert)'
                    : 'url(#arrowhead)'
            "
            class="pad-link"
          />

          <g
            v-for="node in nodes"
            :key="node.id"
            :transform="`translate(${nodeX(node)}, ${nodeY(node)})`"
            :style="{ opacity: nodeOpacity(node) }"
            class="pad-node"
            @click="onNodeClick(node)"
            @mouseenter="hoverNodeId = node.id"
            @mouseleave="hoverNodeId = null"
          >
            <rect
              :x="-node.width / 2"
              :y="-node.height / 2"
              :width="node.width"
              :height="node.height"
              :fill="nodeFill(node)"
              :stroke="nodeStroke(node)"
              :stroke-width="nodeStrokeWidth(node)"
              rx="6"
              class="pad-node-rect"
            />
            <TopologyNodeLabel
              :label="node.label"
              :status="node.status"
              :x="0"
              :y="0"
            />
          </g>
        </svg>

        <div v-if="showLegend" class="pad-legend">
          <span class="pad-legend-item"><span class="pad-legend-line solid"></span>数据流</span>
          <span class="pad-legend-item"><span class="pad-legend-line stage"></span>当前阶段主链</span>
          <span class="pad-legend-item"><span class="pad-legend-line dashed"></span>控制</span>
          <span class="pad-legend-item"><span class="pad-legend-line alert"></span>告警</span>
          <span class="pad-legend-item"><span class="pad-legend-dot healthy"></span>健康</span>
          <span class="pad-legend-item"><span class="pad-legend-dot degraded"></span>降级</span>
          <span class="pad-legend-item"><span class="pad-legend-dot down"></span>宕机</span>
        </div>
      </div>

      <div class="pad-sidebar">
        <div class="pad-panel">
          <div class="pad-panel-label">当前阶段</div>
          <div class="pad-panel-title">{{ activeStageMeta.label }}</div>
          <p class="pad-panel-copy">{{ activeStageMeta.summary }}</p>
          <div class="pad-panel-action">{{ activeStageMeta.action }}</div>
        </div>

        <div class="pad-panel">
          <div class="pad-panel-label">阶段检查点</div>
          <div class="pad-chip-list">
            <span
              v-for="item in activeStageMeta.checkpoints"
              :key="item"
              class="pad-chip"
            >
              {{ item }}
            </span>
          </div>
        </div>

        <div class="pad-panel">
          <div class="pad-panel-label">阶段焦点节点</div>
          <div class="pad-node-list">
            <button
              v-for="node in stageNodes"
              :key="node.id"
              type="button"
              class="pad-node-btn"
              :class="{ active: selectedId === node.id }"
              @click="selectedId = node.id"
            >
              <span>{{ node.label }}</span>
              <small>{{ node.role }}</small>
            </button>
          </div>
        </div>

        <div class="pad-panel">
          <div class="pad-panel-label">节点解读</div>
          <div class="pad-detail-card">
            <div v-if="selected" class="pad-detail-head">
              <strong>{{ selected.label }}</strong>
              <span class="pad-status-dot" :class="selected.status">{{ selected.status }}</span>
            </div>
            <div v-if="selected" class="pad-detail-role">{{ selected.role }}</div>
            <p class="pad-detail-copy">{{ selectedStageSummary }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pad-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 1.25rem;
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pad-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.pad-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.pad-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.pad-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.pad-hint {
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
  max-width: 32rem;
}

.pad-stage-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.625rem;
}

.pad-stage-btn {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 12px;
  padding: 0.75rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.pad-stage-btn:hover {
  border-color: rgba(20, 184, 166, 0.5);
  color: var(--vp-c-text-1);
}

.pad-stage-btn.active {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(13, 148, 136, 0.08));
  border-color: rgba(13, 148, 136, 0.45);
  color: #0f766e;
  transform: translateY(-1px);
}

.pad-body {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.95fr);
  gap: 1rem;
  align-items: start;
}

.pad-canvas-wrap {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  overflow: hidden;
}

.pad-svg {
  width: 100%;
  display: block;
}

.pad-node {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.pad-node-rect {
  transition: stroke 0.2s ease, stroke-width 0.2s ease, fill 0.2s ease;
}

.pad-link {
  transition: stroke-opacity 0.25s ease, stroke 0.25s ease;
}

.pad-legend {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-wrap: wrap;
  padding: 0.875rem 1rem 1rem;
  border-top: 1px solid var(--vp-c-divider);
}

.pad-legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: var(--vp-c-text-2);
}

.pad-legend-line {
  display: inline-block;
  width: 24px;
  height: 2px;
}

.pad-legend-line.solid {
  background: var(--vp-c-brand-1);
}

.pad-legend-line.stage {
  background: #14b8a6;
}

.pad-legend-line.dashed {
  background: repeating-linear-gradient(
    90deg,
    var(--vp-c-divider) 0,
    var(--vp-c-divider) 4px,
    transparent 4px,
    transparent 7px
  );
}

.pad-legend-line.alert {
  background: repeating-linear-gradient(90deg, #ef4444 0, #ef4444 4px, transparent 4px, transparent 7px);
}

.pad-legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.pad-legend-dot.healthy {
  background: #10b981;
}

.pad-legend-dot.degraded {
  background: #f59e0b;
}

.pad-legend-dot.down {
  background: #ef4444;
}

.pad-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.pad-panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.pad-panel-label {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.pad-panel-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.pad-panel-copy,
.pad-detail-copy {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.pad-panel-action {
  border-left: 3px solid rgba(20, 184, 166, 0.35);
  padding-left: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.pad-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pad-chip {
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgba(20, 184, 166, 0.09);
  color: #0f766e;
  font-size: 0.75rem;
  font-weight: 600;
}

.pad-node-list {
  display: grid;
  gap: 0.625rem;
}

.pad-node-btn {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 0.8rem 0.875rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.pad-node-btn span {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.pad-node-btn small {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.pad-node-btn:hover {
  border-color: rgba(20, 184, 166, 0.45);
}

.pad-node-btn.active {
  border-color: rgba(13, 148, 136, 0.5);
  background: rgba(20, 184, 166, 0.08);
  transform: translateY(-1px);
}

.pad-detail-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pad-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.pad-detail-head strong {
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}

.pad-detail-role {
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
}

.pad-status-dot {
  font-size: 0.6875rem;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.pad-status-dot.healthy {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.pad-status-dot.degraded {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.pad-status-dot.down {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

@media (max-width: 960px) {
  .pad-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .pad-root {
    padding: 1rem;
  }

  .pad-stage-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pad-hint {
    max-width: none;
  }
}
</style>
