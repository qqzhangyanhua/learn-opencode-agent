<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CostBreakdownItem, CostScenario } from './types'

type CostStageKey = 'complexity' | 'routing' | 'budget' | 'observability'

interface CostStageMeta {
  id: CostStageKey
  label: '复杂度识别' | '模型路由' | '预算控制' | '可观测性'
  summary: string
  action: string
}

interface ComplexitySample {
  request: string
  complexity: '简单' | '中等' | '复杂'
  reason: string
}

interface RouteDecision {
  complexity: '简单' | '中等' | '复杂'
  primaryModel: string
  fallbackModel: string
  note: string
}

interface ObservableMetric {
  label: string
  value: string
  status: 'good' | 'warn' | 'bad'
}

const props = defineProps<{ scenarios: CostScenario[] }>()

const currentIdx = ref(0)
const showOptimized = ref(false)
const activeStage = ref<CostStageKey>('complexity')

const stages: CostStageMeta[] = [
  {
    id: 'complexity',
    label: '复杂度识别',
    summary: '先判断请求复杂度，才能知道是否值得调用强模型和长上下文。',
    action: '把简单、普通、复杂请求分层，别让所有请求默认走最贵链路。'
  },
  {
    id: 'routing',
    label: '模型路由',
    summary: '模型选择不是感觉问题，而是复杂度、预算和失败策略共同决定的路由问题。',
    action: '先有主模型和降级链，再谈更精细的路由规则。'
  },
  {
    id: 'budget',
    label: '预算控制',
    summary: '无效 token 才是成本大头，system、历史、输出和工具结果都要进预算表。',
    action: '同时控制输入预算和输出预算，别等窗口撞线后才想起来补救。'
  },
  {
    id: 'observability',
    label: '可观测性',
    summary: '成本和延迟如果不可见，就只能靠感觉优化，最后什么都解释不清。',
    action: '把 token、latency、retry、route 和 truncation 做成可追踪指标。'
  }
]

const complexitySamples: ComplexitySample[] = [
  {
    request: '帮我解释一下 Tool 是什么',
    complexity: '简单',
    reason: '知识型问答，低分支、低风险、无需重工具链。'
  },
  {
    request: '帮我重构 auth/service.ts 并补测试',
    complexity: '中等',
    reason: '需要文件上下文和一些工具调用，但依然在可控工程范围内。'
  },
  {
    request: '排查生产事故并给出修复方案，必要时执行脚本',
    complexity: '复杂',
    reason: '涉及多步推理、工具调用、风险判断和更高失败成本。'
  }
]

const routeDecisions: RouteDecision[] = [
  {
    complexity: '简单',
    primaryModel: 'cheap-tier',
    fallbackModel: 'balanced-tier',
    note: '优先省成本，先用便宜模型回答常规问题。'
  },
  {
    complexity: '中等',
    primaryModel: 'balanced-tier',
    fallbackModel: 'strong-tier',
    note: '兼顾质量与成本，适合普通工程任务。'
  },
  {
    complexity: '复杂',
    primaryModel: 'strong-tier',
    fallbackModel: 'balanced-tier',
    note: '优先保证推理质量，但预算紧张时也要能降级。'
  }
]

const observabilityMetrics = computed<ObservableMetric[]>(() => {
  const active = showOptimized.value ? optimized.value : baseline.value
  const totalInput = active
    .filter(item => item.category === 'input' || item.category === 'cache')
    .reduce((sum, item) => sum + item.tokens, 0)
  const totalOutput = active
    .filter(item => item.category === 'output')
    .reduce((sum, item) => sum + item.tokens, 0)
  const toolTokens = active
    .filter(item => item.category === 'tool')
    .reduce((sum, item) => sum + item.tokens, 0)

  return [
    {
      label: 'input tokens',
      value: formatTokens(totalInput),
      status: totalInput > 5000 ? 'warn' : 'good'
    },
    {
      label: 'output tokens',
      value: formatTokens(totalOutput),
      status: totalOutput > 1200 ? 'warn' : 'good'
    },
    {
      label: 'latency',
      value: showOptimized.value ? '2.8s' : '4.6s',
      status: showOptimized.value ? 'good' : 'warn'
    },
    {
      label: 'retry',
      value: showOptimized.value ? '1 次' : '3 次',
      status: showOptimized.value ? 'good' : 'bad'
    },
    {
      label: 'tool truncation',
      value: toolTokens > 800 ? '已触发' : '未触发',
      status: toolTokens > 800 ? 'warn' : 'good'
    },
    {
      label: 'route',
      value: activeRoute.value.primaryModel,
      status: activeRoute.value.complexity === '复杂' ? 'warn' : 'good'
    }
  ]
})

const scenario = computed<CostScenario>(() => props.scenarios[currentIdx.value])

const baseline = computed<CostBreakdownItem[]>(() => scenario.value.baseline)
const optimized = computed<CostBreakdownItem[]>(() => scenario.value.optimized)

const activeItems = computed(() => (showOptimized.value ? optimized.value : baseline.value))

const totalCost = computed(() => activeItems.value.reduce((sum, item) => sum + item.costUsd, 0))
const totalTokens = computed(() => activeItems.value.reduce((sum, item) => sum + item.tokens, 0))

const baselineCost = computed(() => baseline.value.reduce((sum, item) => sum + item.costUsd, 0))
const optimizedCost = computed(() => optimized.value.reduce((sum, item) => sum + item.costUsd, 0))
const savings = computed(() => baselineCost.value - optimizedCost.value)
const savingsPct = computed(() =>
  baselineCost.value > 0 ? Math.round((savings.value / baselineCost.value) * 100) : 0
)

const maxCost = computed(() =>
  Math.max(...baseline.value.map(item => item.costUsd), ...optimized.value.map(item => item.costUsd), 0.001)
)

const activeStageMeta = computed(() => stages.find(stage => stage.id === activeStage.value) ?? stages[0])
const activeComplexity = computed(() => {
  if (scenario.value.meta.id === 'tool-heavy') return '复杂'
  return showOptimized.value ? '中等' : '中等'
})

const activeRoute = computed(
  () => routeDecisions.find(item => item.complexity === activeComplexity.value) ?? routeDecisions[1]
)

function changeStage(stage: CostStageKey) {
  activeStage.value = stage
}

function barWidth(item: CostBreakdownItem) {
  return `${Math.round((item.costUsd / maxCost.value) * 100)}%`
}

function categoryColor(category: string) {
  const map: Record<string, string> = {
    input: '#0d9488',
    output: '#3b82f6',
    cache: '#10b981',
    tool: '#f59e0b',
    embed: '#8b5cf6'
  }
  return map[category] ?? '#6b7280'
}

function formatCost(value: number) {
  return value < 0.01 ? `$${(value * 1000).toFixed(2)}m` : `$${value.toFixed(4)}`
}

function formatTokens(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`
}
</script>

<template>
  <div class="cod-root">
    <div class="cod-header">
      <div class="cod-title-row">
        <span class="cod-title">性能与成本四阶段仪表盘</span>
        <span class="cod-badge">Ch32 · Cost</span>
      </div>
      <div class="cod-toggle" v-if="activeStage === 'budget' || activeStage === 'observability'">
        <button class="cod-toggle-btn" :class="{ active: !showOptimized }" @click="showOptimized = false">基线</button>
        <button class="cod-toggle-btn" :class="{ active: showOptimized }" @click="showOptimized = true">优化后</button>
      </div>
    </div>

    <div class="cod-stage-tabs" role="tablist" aria-label="性能成本阶段切换">
      <button
        v-for="stage in stages"
        :key="stage.id"
        type="button"
        class="cod-stage-btn"
        :class="{ active: activeStage === stage.id }"
        :aria-selected="activeStage === stage.id"
        @click="changeStage(stage.id)"
      >
        {{ stage.label }}
      </button>
    </div>

    <div class="cod-scenarios">
      <button
        v-for="(item, index) in scenarios"
        :key="item.meta.id"
        class="cod-scenario-btn"
        :class="{ active: currentIdx === index }"
        @click="currentIdx = index; showOptimized = false"
      >
        {{ item.meta.label }}
      </button>
    </div>

    <div class="cod-body">
      <Transition name="cod-stage-fade" mode="out-in">
        <div :key="activeStage" class="cod-main">
          <div v-if="activeStage === 'complexity'" class="cod-grid">
            <div class="cod-panel">
              <div class="cod-panel-header">复杂度识别</div>
              <div class="cod-list">
                <article
                  v-for="sample in complexitySamples"
                  :key="sample.request"
                  class="cod-item"
                  :class="{ active: sample.complexity === activeComplexity }"
                >
                  <strong>{{ sample.complexity }}</strong>
                  <p>{{ sample.request }}</p>
                  <span>{{ sample.reason }}</span>
                </article>
              </div>
            </div>

            <div class="cod-panel">
              <div class="cod-panel-header">当前场景判断</div>
              <div class="cod-highlight-card">
                <div class="cod-highlight-label">当前复杂度</div>
                <div class="cod-highlight-value">{{ activeComplexity }}</div>
                <p>
                  {{ scenario.meta.label }} 需要
                  {{ activeComplexity === '复杂' ? '更强模型和更严格预算' : '分层模型和基本预算治理' }}，
                  不能只靠最后看账单补救。
                </p>
              </div>
            </div>
          </div>

          <div v-else-if="activeStage === 'routing'" class="cod-grid">
            <div class="cod-panel">
              <div class="cod-panel-header">模型路由策略</div>
              <div class="cod-list">
                <article
                  v-for="route in routeDecisions"
                  :key="route.complexity"
                  class="cod-item"
                  :class="{ active: route.complexity === activeRoute.complexity }"
                >
                  <strong>{{ route.complexity }}</strong>
                  <p>主模型：{{ route.primaryModel }}</p>
                  <span>降级：{{ route.fallbackModel }} · {{ route.note }}</span>
                </article>
              </div>
            </div>

            <div class="cod-panel">
              <div class="cod-panel-header">当前决策</div>
              <div class="cod-highlight-card">
                <div class="cod-highlight-label">当前路由</div>
                <div class="cod-highlight-value">{{ activeRoute.primaryModel }}</div>
                <p>如果预算紧张或失败重试增加，系统会向 {{ activeRoute.fallbackModel }} 继续降级，而不是所有请求都坚持最贵模型。</p>
              </div>
            </div>
          </div>

          <div v-else-if="activeStage === 'budget'" class="cod-grid single">
            <div class="cod-summary">
              <div class="cod-card">
                <div class="cod-card-label">总成本</div>
                <div class="cod-card-value" :class="showOptimized ? 'green' : ''">{{ formatCost(totalCost) }}</div>
                <div class="cod-card-sub">本次请求</div>
              </div>
              <div class="cod-card">
                <div class="cod-card-label">总 Token</div>
                <div class="cod-card-value">{{ formatTokens(totalTokens) }}</div>
                <div class="cod-card-sub">输入 + 输出</div>
              </div>
              <div class="cod-card" :class="{ highlight: showOptimized }">
                <div class="cod-card-label">{{ showOptimized ? '节省' : '可节省' }}</div>
                <div class="cod-card-value" :class="showOptimized ? 'green' : 'hint'">{{ formatCost(savings) }}</div>
                <div class="cod-card-sub">-{{ savingsPct }}%</div>
              </div>
            </div>

            <div class="cod-breakdown">
              <div class="cod-breakdown-header">预算控制明细</div>
              <div class="cod-bars">
                <div v-for="item in activeItems" :key="item.label" class="cod-bar-row">
                  <div class="cod-bar-label">{{ item.label }}</div>
                  <div class="cod-bar-track">
                    <div
                      class="cod-bar-fill"
                      :style="{ width: barWidth(item), background: categoryColor(item.category) }"
                    ></div>
                  </div>
                  <div class="cod-bar-cost">{{ formatCost(item.costUsd) }}</div>
                  <div class="cod-bar-tokens">{{ formatTokens(item.tokens) }} tok</div>
                </div>
              </div>
            </div>

            <div v-if="scenario.tips?.length" class="cod-tips">
              <div class="cod-tips-header">优化建议</div>
              <div v-for="tip in scenario.tips" :key="tip.id" class="cod-tip-item">
                <div class="cod-tip-top">
                  <span class="cod-tip-title">{{ tip.title }}</span>
                  <span class="cod-tip-saving">节省 {{ tip.estimatedSaving }}</span>
                </div>
                <div class="cod-tip-desc">{{ tip.description }}</div>
              </div>
            </div>
          </div>

          <div v-else class="cod-grid">
            <div class="cod-panel">
              <div class="cod-panel-header">可观测指标</div>
              <div class="cod-list">
                <article
                  v-for="metric in observabilityMetrics"
                  :key="metric.label"
                  class="cod-item metric"
                  :class="metric.status"
                >
                  <strong>{{ metric.label }}</strong>
                  <p>{{ metric.value }}</p>
                </article>
              </div>
            </div>

            <div class="cod-panel">
              <div class="cod-panel-header">为什么要可观测</div>
              <div class="cod-highlight-card">
                <div class="cod-highlight-label">当前模式</div>
                <div class="cod-highlight-value">{{ showOptimized ? '优化后链路' : '基线链路' }}</div>
                <p>如果你看不到 input / output token、latency、retry 和 truncation，就无法知道问题到底出在模型、上下文还是工具返回。</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <aside class="cod-side">
        <div class="cod-side-header">{{ activeStageMeta.label }}</div>
        <div class="cod-side-block">
          <h5>当前关注点</h5>
          <p>{{ activeStageMeta.summary }}</p>
        </div>
        <div class="cod-side-block action">
          <h5>工程动作</h5>
          <p>{{ activeStageMeta.action }}</p>
        </div>
        <div class="cod-side-block">
          <h5>当前场景</h5>
          <p>{{ scenario.meta.label }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cod-root {
  background:
    radial-gradient(circle at top left, rgba(245, 158, 11, 0.08), transparent 28%),
    var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cod-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.cod-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cod-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.cod-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  font-weight: 500;
}

.cod-toggle {
  display: flex;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.cod-toggle-btn {
  padding: 0.3rem 0.875rem;
  font-size: 0.8125rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
}

.cod-toggle-btn.active {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.cod-stage-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.cod-stage-btn {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.cod-stage-btn:hover {
  transform: translateY(-1px);
  border-color: #f59e0b;
}

.cod-stage-btn.active {
  background: rgba(245, 158, 11, 0.08);
  border-color: #f59e0b;
  color: var(--vp-c-text-1);
}

.cod-scenarios {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cod-scenario-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8125rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.cod-scenario-btn.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.cod-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 1rem;
}

.cod-main {
  min-width: 0;
}

.cod-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.cod-grid.single {
  grid-template-columns: 1fr;
}

.cod-panel,
.cod-breakdown {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.875rem;
}

.cod-panel-header,
.cod-breakdown-header,
.cod-tips-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  margin-bottom: 0.75rem;
}

.cod-list {
  display: grid;
  gap: 0.6rem;
}

.cod-item {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.8rem;
  background: var(--vp-c-bg-soft);
  display: grid;
  gap: 0.35rem;
}

.cod-item.active {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.06);
}

.cod-item.metric.good {
  border-color: rgba(16, 185, 129, 0.25);
}

.cod-item.metric.warn {
  border-color: rgba(245, 158, 11, 0.28);
}

.cod-item.metric.bad {
  border-color: rgba(239, 68, 68, 0.28);
}

.cod-item strong,
.cod-highlight-label,
.cod-side-block h5 {
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}

.cod-item p,
.cod-item span,
.cod-highlight-card p,
.cod-side-block p,
.cod-tip-desc {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 0.78rem;
}

.cod-highlight-card {
  display: grid;
  gap: 0.4rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 0.9rem;
  background: rgba(245, 158, 11, 0.05);
}

.cod-highlight-value,
.cod-card-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
}

.cod-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.cod-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.cod-card.highlight {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.04);
}

.cod-card-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
}

.cod-card-value.green {
  color: #10b981;
}

.cod-card-value.hint {
  color: var(--vp-c-text-3);
}

.cod-card-sub {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
}

.cod-bars {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.cod-bar-row {
  display: grid;
  grid-template-columns: 120px 1fr 70px 60px;
  align-items: center;
  gap: 0.5rem;
}

.cod-bar-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cod-bar-track {
  height: 8px;
  background: var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
}

.cod-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.cod-bar-cost,
.cod-bar-tokens,
.cod-tip-saving {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  text-align: right;
}

.cod-tips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cod-tip-item {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 0 6px 6px 0;
  padding: 0.625rem 0.75rem;
}

.cod-tip-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.cod-tip-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.cod-side {
  display: grid;
  gap: 0.75rem;
  align-self: start;
}

.cod-side-header {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
}

.cod-side-block {
  padding: 0.8rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  display: grid;
  gap: 0.35rem;
}

.cod-side-block.action {
  background: rgba(245, 158, 11, 0.05);
}

.cod-stage-fade-enter-active,
.cod-stage-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.cod-stage-fade-enter-from,
.cod-stage-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 1100px) {
  .cod-body {
    grid-template-columns: 1fr;
  }

  .cod-stage-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .cod-grid,
  .cod-summary {
    grid-template-columns: 1fr;
  }

  .cod-bar-row {
    grid-template-columns: 90px 1fr 60px;
  }

  .cod-bar-tokens {
    display: none;
  }
}
</style>
