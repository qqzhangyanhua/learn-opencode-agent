<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ContextCandidate } from './types'

type ContextStageKey = 'select' | 'arrange' | 'compress' | 'assemble'

interface StageMeta {
  id: ContextStageKey
  label: '选' | '排' | '压' | '拼'
  title: string
  summary: string
  risk: string
}

const props = defineProps<{ candidates: ContextCandidate[]; tokenBudget?: number }>()

const selectedIds = ref<Set<string>>(new Set())
const filterType = ref<string>('all')
const sortBy = ref<'relevance' | 'recency' | 'tokens'>('relevance')
const activeStage = ref<ContextStageKey>('select')

const stages: StageMeta[] = [
  {
    id: 'select',
    label: '选',
    title: '先过滤值得进入窗口的内容',
    summary: '不是所有相关内容都值得进上下文，第一步要先缩小候选集合。',
    risk: '把“可能相关”全部塞进去，只会让高价值信息被噪声淹没。'
  },
  {
    id: 'arrange',
    label: '排',
    title: '进入窗口后还要重新排顺序',
    summary: '上下文不是无序集合，system、历史、资料和当前问题的顺序会影响模型注意力。',
    risk: '如果把次要材料排到前面，模型会先消耗注意力在错误的位置。'
  },
  {
    id: 'compress',
    label: '压',
    title: '放不下时要保留能继续决策的信息',
    summary: '压缩不是简单截断，而是把原文降维成摘要或关键事实。',
    risk: '粗暴截断会丢掉后续判断必须依赖的事实，导致模型答偏。'
  },
  {
    id: 'assemble',
    label: '拼',
    title: '最后把信息组装成可提交的 messages',
    summary: '上下文工程的终点不是“选中了什么”，而是“最终如何进入请求体”。',
    risk: '没有预算意识地乱拼内容，最容易在生成前就把窗口挤爆。'
  }
]

const typeOptions = computed(() => {
  const types = new Set(props.candidates.map(candidate => candidate.type))
  return ['all', ...types]
})

const filteredCandidates = computed(() => {
  let list = props.candidates
  if (filterType.value !== 'all') {
    list = list.filter(candidate => candidate.type === filterType.value)
  }

  return [...list].sort((a, b) => {
    if (sortBy.value === 'relevance') return b.relevanceScore - a.relevanceScore
    if (sortBy.value === 'recency') return b.recencyScore - a.recencyScore
    return a.tokens - b.tokens
  })
})

const selectedItems = computed(() => props.candidates.filter(candidate => selectedIds.value.has(candidate.id)))

const workingItems = computed(() => {
  if (selectedItems.value.length > 0) return selectedItems.value
  return filteredCandidates.value.slice(0, 4)
})

const arrangedItems = computed(() => {
  const systemItem = workingItems.value.find(item => item.id === 'sys')
  const currentItem = workingItems.value.find(item => item.id === 'cur')
  const historyItems = workingItems.value.filter(item => item.type === 'conversation' && item.id !== 'sys')
  const referenceItems = workingItems.value.filter(item =>
    ['file', 'document', 'memory'].includes(item.type) && item.id !== 'cur'
  )
  const toolItems = workingItems.value.filter(item => item.type === 'tool_result')
  const remainingItems = workingItems.value.filter(
    item => ![systemItem?.id, currentItem?.id, ...historyItems.map(entry => entry.id), ...referenceItems.map(entry => entry.id), ...toolItems.map(entry => entry.id)].includes(item.id)
  )

  const ordered = [
    ...(systemItem ? [systemItem] : []),
    ...historyItems.sort((a, b) => b.recencyScore - a.recencyScore),
    ...referenceItems.sort((a, b) => b.relevanceScore - a.relevanceScore),
    ...toolItems.sort((a, b) => b.recencyScore - a.recencyScore),
    ...(currentItem ? [currentItem] : []),
    ...remainingItems
  ]

  return ordered.map((item, index) => ({
    ...item,
    position: index + 1,
    placement: placementLabel(item, ordered.length, index)
  }))
})

const compressedItems = computed(() =>
  arrangedItems.value.map(item => {
    const rawTokens = item.tokens
    const summaryTokens = Math.max(48, Math.round(item.tokens * 0.45))
    const factTokens = Math.max(22, Math.round(item.tokens * 0.18))

    return {
      ...item,
      rawTokens,
      summaryTokens,
      factTokens,
      rawText: item.preview ?? `${item.label} 原文片段保留完整内容`,
      summaryText: summarizePreview(item),
      factText: factPreview(item)
    }
  })
)

const assembledMessages = computed(() => {
  const systemItem = arrangedItems.value.find(item => item.id === 'sys')
  const historyItems = arrangedItems.value.filter(item => item.type === 'conversation' && item.id !== 'sys')
  const referenceItems = compressedItems.value.filter(item => ['file', 'document', 'memory'].includes(item.type))
  const toolItems = compressedItems.value.filter(item => item.type === 'tool_result')
  const currentItem = arrangedItems.value.find(item => item.id === 'cur')

  return [
    ...(systemItem
      ? [
          {
            role: 'system',
            title: 'system prompt',
            content: systemItem.preview ?? systemItem.label
          }
        ]
      : []),
    ...historyItems.map(item => ({
      role: 'history',
      title: item.label,
      content: item.preview ?? '保留最近对话原文'
    })),
    ...referenceItems.map(item => ({
      role: 'reference',
      title: item.label,
      content: item.summaryText
    })),
    ...toolItems.map(item => ({
      role: 'tool',
      title: item.label,
      content: item.summaryText
    })),
    ...(currentItem
      ? [
          {
            role: 'user',
            title: '当前问题',
            content: `基于以上信息，继续处理：${currentItem.label}`
          }
        ]
      : [])
  ]
})

const totalSelectedTokens = computed(() => workingItems.value.reduce((sum, item) => sum + item.tokens, 0))

const compressedTokenTotal = computed(() =>
  compressedItems.value.reduce((sum, item) => sum + item.summaryTokens, 0)
)

const budgetUsed = computed(() => (props.tokenBudget ? Math.min(1, totalSelectedTokens.value / props.tokenBudget) : 0))

const budgetClass = computed(() => {
  const ratio = budgetUsed.value
  if (ratio > 0.9) return 'danger'
  if (ratio > 0.7) return 'warning'
  return 'brand'
})

const activeStageMeta = computed(() => stages.find(stage => stage.id === activeStage.value) ?? stages[0])

function toggleSelect(id: string) {
  const nextSelected = new Set(selectedIds.value)
  if (nextSelected.has(id)) nextSelected.delete(id)
  else nextSelected.add(id)
  selectedIds.value = nextSelected
}

function changeStage(stage: ContextStageKey) {
  activeStage.value = stage
}

function relevanceBar(score: number) {
  return `${Math.round(score * 100)}%`
}

function typeColor(type: string) {
  const colors: Record<string, string> = {
    file: '#0d9488',
    memory: '#8b5cf6',
    tool_result: '#f59e0b',
    conversation: '#3b82f6',
    document: '#ec4899'
  }

  return colors[type] ?? '#6b7280'
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    file: '文件',
    memory: '记忆',
    tool_result: '工具结果',
    conversation: '对话',
    document: '文档'
  }

  return labels[type] ?? type
}

function placementLabel(item: ContextCandidate, total: number, index: number) {
  if (item.id === 'sys') return '系统指令开头'
  if (item.id === 'cur' || index === total - 1) return '当前问题收尾'
  if (item.type === 'conversation') return '历史上下文前段'
  if (item.type === 'tool_result') return '工具结果中后段'
  return '参考资料中段'
}

function summarizePreview(item: ContextCandidate) {
  const base = item.preview ?? item.label
  if (item.type === 'conversation') return `摘要：保留最近轮次结论与待办，不展开全部原文。`
  if (item.type === 'tool_result') return `摘要：仅保留工具输出里的关键 diff 和结论。`
  if (item.type === 'memory') return `摘要：保留长期偏好，去掉过程性细节。`
  return `摘要：${base.slice(0, 18)}...，提炼成可辅助判断的短说明。`
}

function factPreview(item: ContextCandidate) {
  if (item.type === 'conversation') return '关键事实：最近 5 轮已确认认证模块需要补类型和测试。'
  if (item.type === 'tool_result') return '关键事实：上次 diff 已新增 login 异步方法。'
  if (item.type === 'memory') return '关键事实：用户偏好函数式风格。'
  return `关键事实：${item.label} 与当前问题相关，保留核心约束即可。`
}
</script>

<template>
  <div class="cee-root">
    <div class="cee-header">
      <div class="cee-title-block">
        <div class="cee-title-row">
          <span class="cee-title">上下文工程四阶段模拟器</span>
          <span class="cee-badge">Ch28 · Context</span>
        </div>
        <p class="cee-stage-summary">{{ activeStageMeta.summary }}</p>
      </div>
      <div class="cee-budget" v-if="tokenBudget">
        <span class="cee-budget-label">Token 预算</span>
        <div class="cee-budget-track">
          <div class="cee-budget-fill" :class="budgetClass" :style="{ width: `${budgetUsed * 100}%` }"></div>
        </div>
        <span class="cee-budget-val">{{ totalSelectedTokens }} / {{ tokenBudget }}</span>
      </div>
    </div>

    <div class="cee-stage-tabs" role="tablist" aria-label="上下文工程阶段切换">
      <button
        v-for="stage in stages"
        :key="stage.id"
        type="button"
        class="cee-stage-tab"
        :class="{ active: activeStage === stage.id }"
        :aria-selected="activeStage === stage.id"
        @click="changeStage(stage.id)"
      >
        <span class="cee-stage-tab-label">{{ stage.label }}</span>
        <span class="cee-stage-tab-title">{{ stage.title }}</span>
      </button>
    </div>

    <div class="cee-controls">
      <div class="cee-filter-tabs">
        <button
          v-for="t in typeOptions"
          :key="t"
          class="cee-filter-tab"
          :class="{ active: filterType === t }"
          @click="filterType = t"
        >
          {{ t === 'all' ? '全部' : typeLabel(t) }}
        </button>
      </div>
      <div class="cee-sort">
        <label class="cee-sort-label">排序:</label>
        <select v-model="sortBy" class="cee-sort-select">
          <option value="relevance">相关度</option>
          <option value="recency">最近</option>
          <option value="tokens">Token 少优先</option>
        </select>
      </div>
    </div>

    <div class="cee-body">
      <div class="cee-main">
        <div class="cee-list">
          <div
            v-for="item in filteredCandidates"
            :key="item.id"
            class="cee-item"
            :class="{ selected: selectedIds.has(item.id) }"
            @click="toggleSelect(item.id)"
          >
            <div class="cee-item-check">
              <div class="cee-checkbox" :class="{ checked: selectedIds.has(item.id) }">
                <svg v-if="selectedIds.has(item.id)" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
            </div>
            <div class="cee-item-body">
              <div class="cee-item-top">
                <span class="cee-item-label">{{ item.label }}</span>
                <span
                  class="cee-type-tag"
                  :style="{ background: `${typeColor(item.type)}18`, color: typeColor(item.type) }"
                >
                  {{ typeLabel(item.type) }}
                </span>
                <span class="cee-token-count">{{ item.tokens }} tok</span>
              </div>
              <div v-if="item.preview" class="cee-item-preview">{{ item.preview }}</div>
              <div class="cee-score-row">
                <span class="cee-score-label">相关度</span>
                <div class="cee-score-track">
                  <div
                    class="cee-score-fill"
                    :style="{ width: relevanceBar(item.relevanceScore), background: typeColor(item.type) }"
                  ></div>
                </div>
                <span class="cee-score-val">{{ Math.round(item.relevanceScore * 100) }}%</span>
              </div>
            </div>
          </div>
          <div v-if="filteredCandidates.length === 0" class="cee-empty">无匹配项</div>
        </div>

        <Transition name="cee-stage-fade" mode="out-in">
          <div :key="activeStage" class="cee-stage-view">
            <div v-if="activeStage === 'select'" class="cee-stage-card">
              <div class="cee-stage-card-header">
                <h4>当前已入选上下文</h4>
                <span>{{ workingItems.length }} 项</span>
              </div>
              <div class="cee-mini-list">
                <div v-for="item in workingItems" :key="item.id" class="cee-mini-item">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.tokens }} tok</span>
                </div>
              </div>
            </div>

            <div v-else-if="activeStage === 'arrange'" class="cee-stage-card">
              <div class="cee-stage-card-header">
                <h4>排序后的上下文队列</h4>
                <span>先后顺序决定注意力</span>
              </div>
              <div class="cee-ordered-list">
                <div v-for="item in arrangedItems" :key="item.id" class="cee-ordered-item">
                  <span class="cee-order-index">{{ item.position }}</span>
                  <div>
                    <strong>{{ item.label }}</strong>
                    <p>{{ item.placement }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeStage === 'compress'" class="cee-stage-card">
              <div class="cee-stage-card-header">
                <h4>压缩后的信息层次</h4>
                <span>{{ compressedTokenTotal }} tok</span>
              </div>
              <div class="cee-compress-list">
                <article v-for="item in compressedItems" :key="item.id" class="cee-compress-item">
                  <strong>{{ item.label }}</strong>
                  <div class="cee-compress-grid">
                    <div>
                      <span>原文</span>
                      <p>{{ item.rawText }}</p>
                    </div>
                    <div>
                      <span>摘要</span>
                      <p>{{ item.summaryText }}</p>
                    </div>
                    <div>
                      <span>事实</span>
                      <p>{{ item.factText }}</p>
                    </div>
                  </div>
                  <div class="cee-compress-meta">
                    <span>{{ item.rawTokens }} tok</span>
                    <span>{{ item.summaryTokens }} tok</span>
                    <span>{{ item.factTokens }} tok</span>
                  </div>
                </article>
              </div>
            </div>

            <div v-else class="cee-stage-card">
              <div class="cee-stage-card-header">
                <h4>最终 messages 组装预览</h4>
                <span>{{ assembledMessages.length }} 段</span>
              </div>
              <div class="cee-message-list">
                <article v-for="message in assembledMessages" :key="`${message.role}-${message.title}`" class="cee-message-item">
                  <div class="cee-message-meta">
                    <span class="cee-message-role">{{ message.role }}</span>
                    <strong>{{ message.title }}</strong>
                  </div>
                  <p>{{ message.content }}</p>
                </article>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <aside class="cee-sidebar">
        <div class="cee-sidebar-header">{{ activeStageMeta.label }} · {{ activeStageMeta.title }}</div>
        <div class="cee-sidebar-block">
          <h5>当前动作</h5>
          <p>{{ activeStageMeta.summary }}</p>
        </div>
        <div class="cee-sidebar-block risk">
          <h5>最容易犯的错</h5>
          <p>{{ activeStageMeta.risk }}</p>
        </div>
        <div class="cee-sidebar-block">
          <h5>预算变化</h5>
          <div class="cee-budget-stats">
            <div>
              <span>当前候选</span>
              <strong>{{ totalSelectedTokens }} tok</strong>
            </div>
            <div>
              <span>压缩后</span>
              <strong>{{ compressedTokenTotal }} tok</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cee-root {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
    var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cee-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.cee-title-block {
  display: grid;
  gap: 0.35rem;
}

.cee-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cee-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.cee-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-weight: 500;
}

.cee-stage-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  max-width: 42rem;
}

.cee-budget {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cee-budget-label {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.cee-budget-track {
  width: 120px;
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
}

.cee-budget-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.cee-budget-fill.brand {
  background: var(--vp-c-brand-1);
}

.cee-budget-fill.warning {
  background: #f59e0b;
}

.cee-budget-fill.danger {
  background: #ef4444;
}

.cee-budget-val {
  font-size: 0.75rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.cee-stage-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
}

.cee-stage-tab {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  text-align: left;
  display: grid;
  gap: 0.18rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.cee-stage-tab:hover {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-1);
}

.cee-stage-tab.active {
  border-color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 12%, var(--vp-c-bg));
}

.cee-stage-tab-label {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

.cee-stage-tab-title {
  font-size: 0.82rem;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.cee-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cee-filter-tabs {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.cee-filter-tab {
  padding: 0.25rem 0.625rem;
  border-radius: 20px;
  font-size: 0.75rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.cee-filter-tab.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.cee-sort {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.cee-sort-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.cee-sort-select {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 0.75rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.cee-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 0.75rem;
}

.cee-main {
  display: grid;
  gap: 0.75rem;
}

.cee-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 360px;
  overflow-y: auto;
}

.cee-item {
  display: flex;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.cee-item.selected {
  border-color: var(--vp-c-brand-1);
  background: rgba(13, 148, 136, 0.04);
}

.cee-item-check {
  padding-top: 2px;
}

.cee-checkbox {
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--vp-c-divider);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.cee-checkbox.checked {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.cee-checkbox svg {
  width: 10px;
  height: 10px;
}

.cee-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.cee-item-top {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.cee-item-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cee-type-tag {
  font-size: 0.625rem;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.cee-token-count {
  font-size: 0.625rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  flex-shrink: 0;
}

.cee-item-preview {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cee-score-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.cee-score-label {
  font-size: 0.625rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.cee-score-track {
  flex: 1;
  height: 3px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
}

.cee-score-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.cee-score-val {
  font-size: 0.625rem;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.cee-stage-view {
  min-height: 220px;
}

.cee-stage-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 0.95rem;
  display: grid;
  gap: 0.75rem;
}

.cee-stage-card-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.cee-stage-card-header h4 {
  margin: 0;
  color: var(--vp-c-text-1);
}

.cee-stage-card-header span {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.cee-mini-list,
.cee-ordered-list,
.cee-compress-list,
.cee-message-list {
  display: grid;
  gap: 0.6rem;
}

.cee-mini-item,
.cee-ordered-item,
.cee-message-item {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.cee-mini-item strong,
.cee-ordered-item strong,
.cee-message-item strong {
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}

.cee-mini-item span,
.cee-order-index {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.73rem;
}

.cee-ordered-item {
  justify-content: flex-start;
  align-items: flex-start;
}

.cee-order-index {
  min-width: 1.5rem;
  font-weight: 700;
}

.cee-ordered-item p,
.cee-message-item p,
.cee-compress-item p,
.cee-sidebar p {
  margin: 0.25rem 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.55;
  font-size: 0.78rem;
}

.cee-compress-item {
  padding: 0.8rem;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  display: grid;
  gap: 0.6rem;
}

.cee-compress-item strong {
  color: var(--vp-c-text-1);
}

.cee-compress-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.cee-compress-grid span,
.cee-message-role {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cee-compress-meta {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.cee-compress-meta span {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.cee-message-item {
  display: grid;
  gap: 0.3rem;
}

.cee-message-meta {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  flex-wrap: wrap;
}

.cee-sidebar {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 0.95rem;
  display: grid;
  gap: 0.75rem;
  align-self: start;
}

.cee-sidebar-header {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.cee-sidebar-block {
  padding: 0.75rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 88%, white);
  border: 1px solid var(--vp-c-divider);
}

.cee-sidebar-block.risk {
  background: color-mix(in srgb, #ef4444 8%, var(--vp-c-bg));
}

.cee-sidebar-block h5 {
  margin: 0 0 0.25rem;
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}

.cee-budget-stats {
  display: grid;
  gap: 0.5rem;
}

.cee-budget-stats div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.cee-budget-stats span {
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
}

.cee-budget-stats strong {
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
}

.cee-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 1rem 0;
}

.cee-stage-fade-enter-active,
.cee-stage-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.cee-stage-fade-enter-from,
.cee-stage-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 960px) {
  .cee-stage-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cee-body {
    grid-template-columns: 1fr;
  }

  .cee-compress-grid {
    grid-template-columns: 1fr;
  }
}
</style>
