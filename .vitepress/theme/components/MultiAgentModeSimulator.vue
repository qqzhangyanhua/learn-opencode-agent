<script setup lang="ts">
import { computed, ref } from 'vue'
import { multiAgentModeScenarios } from '../data/multi-agent-mode-scenarios'
import type {
  MultiAgentModeAgent,
  MultiAgentModeEvent,
  MultiAgentModeKey
} from './types'

interface ModeTeachingSnapshot {
  decisionOwner: string
  bestFor: string
  failureMode: string
  returnPath: string
}

const props = withDefaults(defineProps<{ initialModeId?: MultiAgentModeKey }>(), {
  initialModeId: 'orchestrator'
})

const activeModeId = ref<MultiAgentModeKey>(props.initialModeId)
const activeStageIndex = ref(0)

const activeScenario = computed(
  () => multiAgentModeScenarios.find(scenario => scenario.id === activeModeId.value) ?? multiAgentModeScenarios[0]
)

const activeStage = computed(() => activeScenario.value?.stages[activeStageIndex.value])

function modeDecisionOwner(modeId: MultiAgentModeKey) {
  const map: Record<MultiAgentModeKey, string> = {
    orchestrator: '协调者 Orchestrator 负责拆分、派发和最终收口。',
    debate: '裁判 Judge 负责界定议题并收束正反观点。',
    pipeline: '流程本身负责决策，前一步输出直接决定后一步输入。'
  }

  return map[modeId]
}

function modeBestFor(modeId: MultiAgentModeKey) {
  const map: Record<MultiAgentModeKey, string> = {
    orchestrator: '适合可拆成多个明确角色、最后还需要统一汇总的复杂任务。',
    debate: '适合方案比较、优先级拉扯和多视角评估这类“值不值得做”的问题。',
    pipeline: '适合步骤顺序明确、前一步结果天然就是后一步输入的加工链。'
  }

  return map[modeId]
}

function modeFailureMode(modeId: MultiAgentModeKey) {
  const map: Record<MultiAgentModeKey, string> = {
    orchestrator: '协调者拆错任务时，下面所有 Worker 都会沿着错误方向推进。',
    debate: '如果没有裁判收束，系统会停在观点对撞，最后拿不到可执行结论。',
    pipeline: '前一阶段一旦出错，偏差会被后续阶段继续放大。'
  }

  return map[modeId]
}

function modeReturnPath(modeId: MultiAgentModeKey) {
  const map: Record<MultiAgentModeKey, string> = {
    orchestrator: '各 Worker 先回传局部结果，再由协调者统一汇总后返回用户。',
    debate: '正反双方先交锋，再由裁判总结条件化结论并回给用户。',
    pipeline: '结果沿固定顺序逐段传递，最后一步直接形成最终输出。'
  }

  return map[modeId]
}

const activeModeSnapshot = computed<ModeTeachingSnapshot>(() => ({
  decisionOwner: modeDecisionOwner(activeModeId.value),
  bestFor: modeBestFor(activeModeId.value),
  failureMode: modeFailureMode(activeModeId.value),
  returnPath: modeReturnPath(activeModeId.value)
}))

function changeMode(modeId: MultiAgentModeKey) {
  if (modeId === activeModeId.value) return
  activeModeId.value = modeId
  activeStageIndex.value = 0
}

function changeStage(index: number) {
  if (!activeScenario.value) return
  if (index < 0 || index >= activeScenario.value.stages.length) return
  activeStageIndex.value = index
}

function agentColor(agentId: string) {
  const colors: Record<string, string> = {
    orchestrator: '#0f766e',
    researcher: '#2563eb',
    writer: '#7c3aed',
    reviewer: '#ea580c',
    pro: '#15803d',
    con: '#b91c1c',
    judge: '#0f766e',
    collector: '#2563eb',
    designer: '#7c3aed',
    estimator: '#d97706',
    publisher: '#0f766e'
  }

  return colors[agentId] ?? '#64748b'
}

function eventTypeLabel(type: MultiAgentModeEvent['type']) {
  const labels: Record<MultiAgentModeEvent['type'], string> = {
    task: '任务',
    result: '结果',
    debate: '观点',
    artifact: '产物',
    decision: '判断'
  }

  return labels[type]
}

function eventClass(type: MultiAgentModeEvent['type']) {
  const classes: Record<MultiAgentModeEvent['type'], string> = {
    task: 'event-task',
    result: 'event-result',
    debate: 'event-debate',
    artifact: 'event-artifact',
    decision: 'event-decision'
  }

  return classes[type]
}

function stageButtonClass(index: number) {
  return {
    active: index === activeStageIndex.value,
    done: index < activeStageIndex.value
  }
}

function roleLabel(agent: MultiAgentModeAgent) {
  return `${agent.name} · ${agent.role}`
}
</script>

<template>
  <section class="multi-agent-mode-simulator">
    <header class="simulator-header">
      <div>
        <p class="simulator-kicker">Ch26 · Multi-Agent</p>
        <h3>多智能体协作模式模拟器</h3>
        <p class="simulator-summary">{{ activeScenario.summary }}</p>
      </div>
      <div class="mode-switcher" role="tablist" aria-label="多智能体模式切换">
        <button
          v-for="scenario in multiAgentModeScenarios"
          :key="scenario.id"
          type="button"
          class="mode-button"
          :class="{ active: scenario.id === activeModeId }"
          :aria-selected="scenario.id === activeModeId"
          @click="changeMode(scenario.id)"
        >
          <span>{{ scenario.label }}</span>
        </button>
      </div>
    </header>

    <div class="simulator-grid">
      <aside class="agent-panel">
        <div class="panel-header">
          <h4>角色结构</h4>
          <span>{{ activeScenario.label }}</span>
        </div>
        <div class="agent-list">
          <article
            v-for="agent in activeScenario.agents"
            :key="agent.id"
            class="agent-card"
            :style="{ '--agent-accent': agentColor(agent.id) }"
          >
            <div class="agent-title">
              <i :style="{ background: agentColor(agent.id) }"></i>
              <strong>{{ roleLabel(agent) }}</strong>
            </div>
            <p>{{ agent.summary }}</p>
          </article>
        </div>
      </aside>

      <div class="event-panel">
        <div class="panel-header">
          <h4>当前阶段</h4>
          <span>{{ activeStage?.label }}</span>
        </div>
        <Transition name="stage-fade" mode="out-in">
          <div :key="`${activeModeId}-${activeStage?.id}`" class="event-list">
            <article
              v-for="event in activeStage?.events"
              :key="event.id"
              class="event-card"
              :class="eventClass(event.type)"
              :style="{ '--event-accent': agentColor(event.from) }"
            >
              <div class="event-meta">
                <span class="event-from" :style="{ color: agentColor(event.from) }">{{ event.from }}</span>
                <span v-if="event.to" class="event-arrow">→</span>
                <span v-if="event.to" class="event-to">{{ event.to }}</span>
                <span class="event-badge">{{ eventTypeLabel(event.type) }}</span>
              </div>
              <p>{{ event.content }}</p>
              <div v-if="event.metadata" class="event-tags">
                <span v-for="(value, key) in event.metadata" :key="key">{{ key }}: {{ value }}</span>
              </div>
            </article>
          </div>
        </Transition>
      </div>

      <aside class="insight-panel">
        <div class="panel-header">
          <h4>模式说明</h4>
          <span>{{ activeScenario.label }}</span>
        </div>
        <Transition name="stage-fade" mode="out-in">
          <div :key="`${activeModeId}-mode-memory`" class="mode-memory-grid">
            <article class="insight-card memory">
              <h5>谁负责决策</h5>
              <p>{{ activeModeSnapshot.decisionOwner }}</p>
            </article>
            <article class="insight-card memory">
              <h5>最适合的任务</h5>
              <p>{{ activeModeSnapshot.bestFor }}</p>
            </article>
            <article class="insight-card memory">
              <h5>最容易出的问题</h5>
              <p>{{ activeModeSnapshot.failureMode }}</p>
            </article>
            <article class="insight-card memory">
              <h5>结果怎么回来</h5>
              <p>{{ activeModeSnapshot.returnPath }}</p>
            </article>
          </div>
        </Transition>

        <div class="panel-header panel-subheader">
          <h4>阶段判断</h4>
          <span>{{ activeStage?.label }}</span>
        </div>
        <Transition name="stage-fade" mode="out-in">
          <div :key="`${activeModeId}-${activeStage?.id}-insight`" class="insight-stack">
            <article class="insight-card primary">
              <h5>{{ activeStage?.headline }}</h5>
              <p>{{ activeStage?.insight }}</p>
            </article>
            <article class="insight-card risk">
              <h5>这一阶段最容易出错的地方</h5>
              <p>{{ activeStage?.risk }}</p>
            </article>
          </div>
        </Transition>
      </aside>
    </div>

    <nav class="stage-bar" aria-label="协作阶段切换">
      <button
        v-for="(stage, index) in activeScenario.stages"
        :key="stage.id"
        type="button"
        class="stage-button"
        :class="stageButtonClass(index)"
        :aria-current="index === activeStageIndex ? 'step' : undefined"
        @click="changeStage(index)"
      >
        <span class="stage-index">0{{ index + 1 }}</span>
        <span class="stage-label">{{ stage.label }}</span>
      </button>
    </nav>
  </section>
</template>

<style scoped>
.multi-agent-mode-simulator {
  margin: 1.5rem 0;
  padding: 1.2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.08), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 92%, white), var(--vp-c-bg));
  display: grid;
  gap: 1rem;
}

.simulator-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.simulator-kicker {
  margin: 0 0 0.2rem;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

h3 {
  margin: 0;
  color: var(--vp-c-text-1);
}

.simulator-summary {
  margin: 0.45rem 0 0;
  max-width: 48rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.mode-switcher {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.mode-button {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease,
    color 0.2s ease;
}

.mode-button:hover {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.mode-button.active {
  border-color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 12%, var(--vp-c-bg));
  color: var(--vp-c-text-1);
}

.simulator-grid {
  display: grid;
  grid-template-columns: minmax(220px, 250px) minmax(320px, 1fr) minmax(240px, 280px);
  gap: 0.85rem;
  align-items: start;
}

.agent-panel,
.event-panel,
.insight-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 96%, white);
  padding: 0.95rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.panel-subheader {
  margin-top: 0.95rem;
}

.panel-header h4 {
  margin: 0;
  color: var(--vp-c-text-1);
}

.panel-header span {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.agent-list,
.event-list,
.insight-stack {
  display: grid;
  gap: 0.65rem;
}

.mode-memory-grid {
  display: grid;
  gap: 0.65rem;
}

.agent-card {
  border: 1px solid color-mix(in srgb, var(--agent-accent) 20%, var(--vp-c-divider));
  border-radius: 10px;
  background: color-mix(in srgb, var(--agent-accent) 10%, var(--vp-c-bg-soft));
  padding: 0.7rem 0.8rem;
}

.agent-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
}

.agent-title i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.agent-card strong {
  color: var(--vp-c-text-1);
  font-size: 0.84rem;
}

.agent-card p,
.event-card p,
.insight-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 0.82rem;
}

.event-card {
  border-left: 4px solid var(--event-accent);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  padding: 0.8rem;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
}

.event-from,
.event-to {
  font-size: 0.75rem;
  font-weight: 700;
}

.event-arrow {
  color: var(--vp-c-text-3);
}

.event-badge {
  margin-left: auto;
  font-size: 0.67rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
}

.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.45rem;
}

.event-tags span {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  background: var(--vp-c-bg);
}

.event-task {
  background: color-mix(in srgb, #2563eb 8%, var(--vp-c-bg-soft));
}

.event-result {
  background: color-mix(in srgb, #0f766e 8%, var(--vp-c-bg-soft));
}

.event-debate {
  background: color-mix(in srgb, #b45309 8%, var(--vp-c-bg-soft));
}

.event-artifact {
  background: color-mix(in srgb, #7c3aed 8%, var(--vp-c-bg-soft));
}

.event-decision {
  background: color-mix(in srgb, #dc2626 8%, var(--vp-c-bg-soft));
}

.insight-card {
  border-radius: 12px;
  padding: 0.85rem;
  border: 1px solid var(--vp-c-divider);
}

.insight-card h5 {
  margin: 0 0 0.45rem;
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
}

.insight-card.primary {
  background: color-mix(in srgb, #0ea5e9 10%, var(--vp-c-bg));
}

.insight-card.risk {
  background: color-mix(in srgb, #ef4444 10%, var(--vp-c-bg));
}

.insight-card.memory {
  background: color-mix(in srgb, #0f766e 8%, var(--vp-c-bg));
}

.stage-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}

.stage-button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  padding: 0.55rem 0.65rem;
  display: grid;
  gap: 0.15rem;
  text-align: left;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.stage-button:hover {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-1);
}

.stage-button.active {
  border-color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 12%, var(--vp-c-bg));
}

.stage-button.done {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 30%, var(--vp-c-divider));
}

.stage-index {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

.stage-label {
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--vp-c-text-1);
}

.stage-fade-enter-active,
.stage-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.stage-fade-enter-from,
.stage-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 1380px) {
  .simulator-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .stage-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
