<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RagScenario, RagChunk } from './types'

type RagStageKey = 'chunk' | 'embedding' | 'hybrid' | 'prompt' | 'conflict'

interface RagStageMeta {
  id: RagStageKey
  label: '召回单元' | '相似度判断' | '关键词召回' | '回答边界' | '冲突治理'
  summary: string
  fix: string
}

interface EmbeddingCandidate {
  label: string
  goodScore: number
  badScore: number
  relevant: boolean
}

interface ConflictDocument {
  source: string
  version: string
  date: string
  status: string
  content: string
  priority: number
}

const props = withDefaults(defineProps<{ scenarios: RagScenario[]; autoPlay?: boolean }>(), {
  autoPlay: false
})

const currentScenarioIdx = ref(0)
const isRunning = ref(false)
const step = ref<'idle' | 'retrieving' | 'ranking' | 'generating' | 'done'>('idle')
const visibleChunks = ref<RagChunk[]>([])
const finalAnswer = ref('')
const activeStage = ref<RagStageKey>('chunk')
let timer: ReturnType<typeof setTimeout> | null = null

const stages: RagStageMeta[] = [
  {
    id: 'chunk',
    label: '召回单元',
    summary: '先定义正确的知识单元，分块错了，后面所有检索和生成都会在错误供给上继续工作。',
    fix: '优先保语义完整，再考虑块大小，用标题、段落和规则边界定义 chunk。'
  },
  {
    id: 'embedding',
    label: '相似度判断',
    summary: 'Embedding 决定了“什么叫相似”，语义空间错了，再好的 top-k 也只是扩大误召回。',
    fix: '先验证语料语言和领域是否匹配，再调相似度阈值和 rerank。'
  },
  {
    id: 'hybrid',
    label: '关键词召回',
    summary: '纯语义检索容易漏掉数字、版本号和专有名词，必须补关键词能力。',
    fix: '把 BM25 或关键词倒排和向量检索融合，至少给精确命中留一条路。'
  },
  {
    id: 'prompt',
    label: '回答边界',
    summary: '检索到了资料，不代表模型就会老老实实引用资料，Prompt 必须收口回答边界。',
    fix: '强制信息源锁死、缺失就明确说不知道、数字日期要求原文引用。'
  },
  {
    id: 'conflict',
    label: '冲突治理',
    summary: '多份文档冲突时，模型不会天然知道谁优先，必须把来源规则显式写进系统。',
    fix: '为 chunk 补来源、版本、日期和状态元数据，再定义冲突优先级。'
  }
]

const scenario = computed<RagScenario>(() => props.scenarios[currentScenarioIdx.value])
const activeStageMeta = computed(() => stages.find(stage => stage.id === activeStage.value) ?? stages[0])

const badChunks = [
  {
    title: '坏分块：过大',
    detail:
      '把“工具超时默认值、全局配置、错误处理、更新日志”塞进同一个 chunk，问题一来相关信息会被无关内容稀释。'
  },
  {
    title: '坏分块：过小',
    detail:
      '把“默认超时 30s”和“timeout 参数可覆盖”拆到两个碎片里，单次召回很容易只拿到一半事实。'
  }
]

const goodChunks = [
  {
    title: '好分块：规则完整',
    detail: '工具调用默认超时 30s，可通过 timeout 参数覆盖，超时触发 ToolTimeoutError。'
  },
  {
    title: '好分块：配置完整',
    detail: '全局超时配置位于 agent.config.timeout，单位毫秒，用于覆盖默认值。'
  }
]

const embeddingCandidates: EmbeddingCandidate[] = [
  { label: '工具调用默认超时 30s', goodScore: 0.93, badScore: 0.58, relevant: true },
  { label: '设置资源限制以避免任务卡死', goodScore: 0.71, badScore: 0.74, relevant: false },
  { label: '超时后触发 ToolTimeoutError', goodScore: 0.88, badScore: 0.49, relevant: true }
]

const promptComparison = computed(() => ({
  loosePrompt: '请参考检索结果回答，尽量完整一些。',
  looseAnswer: '工具调用一般都会有超时限制，通常是几十秒，超时以后会报错并建议做重试。',
  strictPrompt:
    '只基于参考资料回答；资料未提及就明确说未找到；数字和日期必须原文引用，禁止推测。',
  strictAnswer:
    '根据参考资料，工具调用默认超时 30s，可通过 timeout 参数或 agent.config.timeout 覆盖，超时触发 ToolTimeoutError。'
}))

const conflictDocuments: ConflictDocument[] = [
  {
    source: '员工手册',
    version: 'v2.0',
    date: '2023-08-01',
    status: '旧版',
    content: '请假超过 2 天需主管审批。',
    priority: 2
  },
  {
    source: '请假制度补充通知',
    version: 'v3.0',
    date: '2024-01-01',
    status: '现行有效',
    content: '请假超过 1 天需主管审批，超过 3 天需部门负责人会签。',
    priority: 1
  },
  {
    source: 'FAQ',
    version: 'v1.1',
    date: '2023-10-10',
    status: '历史解释',
    content: '多数情况 2 天以内不需要额外说明。',
    priority: 3
  }
]

const resolvedConflict = computed(
  () => [...conflictDocuments].sort((a, b) => a.priority - b.priority)[0]
)

watch(currentScenarioIdx, () => {
  resetHybrid()
})

function changeStage(stage: RagStageKey) {
  activeStage.value = stage
}

function selectScenario(idx: number) {
  if (isRunning.value) return
  currentScenarioIdx.value = idx
}

async function runHybridDemo() {
  if (activeStage.value !== 'hybrid' || isRunning.value) return
  resetHybrid()
  isRunning.value = true

  step.value = 'retrieving'
  await delay(700)

  step.value = 'ranking'
  const sorted = [...scenario.value.chunks].sort((a, b) => b.score - a.score)
  for (const chunk of sorted) {
    visibleChunks.value.push(chunk)
    await delay(180)
  }

  step.value = 'generating'
  await delay(500)

  step.value = 'done'
  finalAnswer.value = scenario.value.expectedAnswer
  isRunning.value = false
}

function resetHybrid() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  isRunning.value = false
  step.value = 'idle'
  visibleChunks.value = []
  finalAnswer.value = ''
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    timer = setTimeout(resolve, ms)
  })
}

function scoreColor(score: number) {
  if (score >= 0.8) return 'score-high'
  if (score >= 0.5) return 'score-mid'
  return 'score-low'
}

const precision = computed(() => {
  if (visibleChunks.value.length === 0) return 0
  const relevant = visibleChunks.value.filter(chunk => chunk.isRelevant).length
  return Math.round((relevant / visibleChunks.value.length) * 100)
})

const recall = computed(() => {
  const totalRelevant = scenario.value.chunks.filter(chunk => chunk.isRelevant).length
  if (totalRelevant === 0) return 0
  const retrieved = visibleChunks.value.filter(chunk => chunk.isRelevant).length
  return Math.round((retrieved / totalRelevant) * 100)
})

const stepLabel: Record<typeof step.value, string> = {
  idle: '就绪',
  retrieving: '检索中…',
  ranking: '排序中…',
  generating: '生成中…',
  done: '完成'
}
</script>

<template>
  <div class="rag-root">
    <div class="rag-header">
      <div class="rag-title-row">
        <span class="rag-title">RAG 五故障链模拟器</span>
        <span class="rag-badge">Ch25 · RAG</span>
      </div>
      <div class="rag-actions" v-if="activeStage === 'hybrid'">
        <button class="rag-btn-primary" :disabled="isRunning" @click="runHybridDemo">
          {{ isRunning ? stepLabel[step] : '运行检索' }}
        </button>
        <button class="rag-btn-ghost" @click="resetHybrid">重置</button>
      </div>
    </div>

    <div class="rag-stage-tabs" role="tablist" aria-label="RAG 故障阶段切换">
      <button
        v-for="stage in stages"
        :key="stage.id"
        type="button"
        class="rag-stage-btn"
        :class="{ active: activeStage === stage.id }"
        :aria-selected="activeStage === stage.id"
        @click="changeStage(stage.id)"
      >
        {{ stage.label }}
      </button>
    </div>

    <div class="rag-body">
      <Transition name="rag-stage-fade" mode="out-in">
        <div :key="activeStage" class="rag-main">
          <div v-if="activeStage === 'chunk'" class="rag-stage-grid">
            <div class="rag-col">
              <div class="rag-col-header">错误分块</div>
              <div class="rag-card-list">
                <article v-for="item in badChunks" :key="item.title" class="rag-card bad">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.detail }}</p>
                </article>
              </div>
            </div>
            <div class="rag-col">
              <div class="rag-col-header">修复后分块</div>
              <div class="rag-card-list">
                <article v-for="item in goodChunks" :key="item.title" class="rag-card good">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.detail }}</p>
                </article>
              </div>
            </div>
          </div>

          <div v-else-if="activeStage === 'embedding'" class="rag-stage-grid single">
            <div class="rag-col">
              <div class="rag-query-box">
                <span class="rag-query-label">查询</span>
                <span class="rag-query-text">智能体工具调用超时策略是什么？</span>
              </div>
              <div class="rag-col-header">不同语义空间下的匹配差异</div>
              <div class="rag-embedding-list">
                <article v-for="item in embeddingCandidates" :key="item.label" class="rag-embedding-item">
                  <strong>{{ item.label }}</strong>
                  <div class="rag-embedding-row">
                    <span>匹配良好的 embedding</span>
                    <div class="rag-meter-bg">
                      <div class="rag-meter-fill good" :style="{ width: `${item.goodScore * 100}%` }"></div>
                    </div>
                    <span>{{ Math.round(item.goodScore * 100) }}%</span>
                  </div>
                  <div class="rag-embedding-row">
                    <span>失配的 embedding</span>
                    <div class="rag-meter-bg">
                      <div class="rag-meter-fill bad" :style="{ width: `${item.badScore * 100}%` }"></div>
                    </div>
                    <span>{{ Math.round(item.badScore * 100) }}%</span>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <div v-else-if="activeStage === 'hybrid'" class="rag-stage-grid">
            <div class="rag-col">
              <div class="rag-scenarios">
                <button
                  v-for="(s, i) in scenarios"
                  :key="s.meta.id"
                  class="rag-scenario-btn"
                  :class="{ active: currentScenarioIdx === i }"
                  @click="selectScenario(i)"
                >
                  {{ s.meta.label }}
                </button>
              </div>
              <div class="rag-query-box">
                <span class="rag-query-label">查询</span>
                <span class="rag-query-text">{{ scenario.query }}</span>
              </div>
              <div class="rag-col-header">
                召回文档
                <span v-if="step !== 'idle'" class="rag-count-tag">{{ visibleChunks.length }} / {{ scenario.chunks.length }}</span>
              </div>
              <div class="rag-chunk-list">
                <div
                  v-for="chunk in visibleChunks"
                  :key="chunk.id"
                  class="rag-chunk"
                  :class="{ relevant: chunk.isRelevant, irrelevant: !chunk.isRelevant }"
                >
                  <div class="rag-chunk-top">
                    <span class="rag-chunk-src">{{ chunk.source }}</span>
                    <span class="rag-score-badge" :class="scoreColor(chunk.score)">
                      {{ (chunk.score * 100).toFixed(0) }}%
                    </span>
                  </div>
                  <div class="rag-chunk-text">{{ chunk.text }}</div>
                  <div v-if="step === 'done'" class="rag-chunk-relevant-tag">
                    {{ chunk.isRelevant ? '相关' : '噪声' }}
                  </div>
                </div>
                <div v-if="visibleChunks.length === 0" class="rag-empty">
                  {{ step === 'idle' ? '点击「运行检索」开始' : '检索中…' }}
                </div>
              </div>
            </div>

            <div class="rag-col">
              <div class="rag-col-header">评估指标</div>
              <div class="rag-metrics">
                <div class="rag-metric-item">
                  <span class="rag-metric-label">准确率 (Precision)</span>
                  <div class="rag-meter-bg">
                    <div class="rag-meter-fill" :style="{ width: `${precision}%` }" :class="precision >= 70 ? 'good' : 'bad'"></div>
                  </div>
                  <span class="rag-metric-val">{{ precision }}%</span>
                </div>
                <div class="rag-metric-item">
                  <span class="rag-metric-label">召回率 (Recall)</span>
                  <div class="rag-meter-bg">
                    <div class="rag-meter-fill" :style="{ width: `${recall}%` }" :class="recall >= 70 ? 'good' : 'bad'"></div>
                  </div>
                  <span class="rag-metric-val">{{ recall }}%</span>
                </div>
              </div>

              <div class="rag-col-header" style="margin-top: 1rem">生成答案</div>
              <div class="rag-answer-box">
                <div v-if="finalAnswer" class="rag-answer-text">{{ finalAnswer }}</div>
                <div v-else class="rag-empty">等待检索完成…</div>
              </div>

              <div v-if="step === 'done'" class="rag-eval-note">
                <span class="rag-eval-tag" :class="scenario.meta.tone">{{ scenario.meta.label }}</span>
                {{ scenario.evaluation }}
              </div>
            </div>
          </div>

          <div v-else-if="activeStage === 'prompt'" class="rag-stage-grid">
            <div class="rag-col">
              <div class="rag-col-header">宽松 Prompt</div>
              <article class="rag-card bad">
                <strong>指令</strong>
                <p>{{ promptComparison.loosePrompt }}</p>
              </article>
              <article class="rag-card bad">
                <strong>回答结果</strong>
                <p>{{ promptComparison.looseAnswer }}</p>
              </article>
            </div>
            <div class="rag-col">
              <div class="rag-col-header">严格 Prompt</div>
              <article class="rag-card good">
                <strong>指令</strong>
                <p>{{ promptComparison.strictPrompt }}</p>
              </article>
              <article class="rag-card good">
                <strong>回答结果</strong>
                <p>{{ promptComparison.strictAnswer }}</p>
              </article>
            </div>
          </div>

          <div v-else class="rag-stage-grid">
            <div class="rag-col">
              <div class="rag-col-header">冲突文档</div>
              <div class="rag-card-list">
                <article
                  v-for="doc in conflictDocuments"
                  :key="`${doc.source}-${doc.version}`"
                  class="rag-card"
                  :class="doc.priority === 1 ? 'good' : 'bad-soft'"
                >
                  <strong>{{ doc.source }} · {{ doc.version }}</strong>
                  <p>{{ doc.content }}</p>
                  <div class="rag-doc-meta">{{ doc.date }} · {{ doc.status }}</div>
                </article>
              </div>
            </div>
            <div class="rag-col">
              <div class="rag-col-header">冲突治理结果</div>
              <article class="rag-card good">
                <strong>最终采用来源</strong>
                <p>{{ resolvedConflict.source }} {{ resolvedConflict.version }}：{{ resolvedConflict.content }}</p>
                <div class="rag-doc-meta">优先级最高：{{ resolvedConflict.date }} · {{ resolvedConflict.status }}</div>
              </article>
            </div>
          </div>
        </div>
      </Transition>

      <aside class="rag-side">
        <div class="rag-side-header">{{ activeStageMeta.label }}</div>
        <div class="rag-side-block">
          <h5>这一层在查什么</h5>
          <p>{{ activeStageMeta.summary }}</p>
        </div>
        <div class="rag-side-block fix">
          <h5>修复动作</h5>
          <p>{{ activeStageMeta.fix }}</p>
        </div>
        <div class="rag-side-block">
          <h5>排查顺序</h5>
          <p>先查召回单元，再查相似度，再补关键词，最后才看回答边界和冲突治理。</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.rag-root {
  background:
    radial-gradient(circle at top left, rgba(13, 148, 136, 0.08), transparent 28%),
    var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.rag-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.rag-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rag-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.rag-actions {
  display: flex;
  gap: 0.5rem;
}

.rag-btn-primary {
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

.rag-btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.rag-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.rag-stage-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
}

.rag-stage-btn {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.rag-stage-btn:hover {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-1);
}

.rag-stage-btn.active {
  background: rgba(13, 148, 136, 0.1);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.rag-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 1rem;
}

.rag-main {
  min-width: 0;
}

.rag-stage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.rag-stage-grid.single {
  grid-template-columns: 1fr;
}

.rag-col {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.rag-col-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rag-card-list,
.rag-embedding-list {
  display: grid;
  gap: 0.6rem;
}

.rag-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.8rem;
  background: var(--vp-c-bg);
  display: grid;
  gap: 0.35rem;
}

.rag-card.good {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.04);
}

.rag-card.bad {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.04);
}

.rag-card.bad-soft {
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(245, 158, 11, 0.05);
}

.rag-card strong,
.rag-embedding-item strong,
.rag-side-block h5 {
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}

.rag-card p,
.rag-embedding-item p,
.rag-side-block p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 0.78rem;
}

.rag-query-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.rag-query-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
  padding-top: 1px;
}

.rag-query-text {
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

.rag-embedding-item {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.8rem;
  background: var(--vp-c-bg);
  display: grid;
  gap: 0.45rem;
}

.rag-embedding-row {
  display: grid;
  grid-template-columns: 120px 1fr 52px;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}

.rag-scenarios {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rag-scenario-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8125rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.rag-scenario-btn.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.rag-count-tag {
  font-size: 0.6875rem;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.rag-chunk-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
}

.rag-chunk {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.625rem 0.75rem;
  background: var(--vp-c-bg);
  position: relative;
  transition: border-color 0.2s;
}

.rag-chunk.relevant {
  border-left: 3px solid #10b981;
}

.rag-chunk.irrelevant {
  border-left: 3px solid #ef4444;
  opacity: 0.7;
}

.rag-chunk-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.rag-chunk-src,
.rag-doc-meta {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.rag-score-badge {
  font-size: 0.625rem;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 700;
}

.score-high {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.score-mid {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.score-low {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.rag-chunk-text {
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.rag-chunk-relevant-tag {
  font-size: 0.625rem;
  margin-top: 0.3rem;
  color: var(--vp-c-text-3);
}

.rag-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 1rem 0;
}

.rag-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rag-metric-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rag-metric-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.rag-meter-bg {
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
}

.rag-meter-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.rag-meter-fill.good {
  background: #10b981;
}

.rag-meter-fill.bad {
  background: #ef4444;
}

.rag-metric-val {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
}

.rag-answer-box {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  min-height: 80px;
}

.rag-answer-text {
  font-size: 0.8125rem;
  color: var(--vp-c-text-1);
  line-height: 1.7;
}

.rag-eval-note {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  border-left: 3px solid var(--vp-c-brand-1);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rag-eval-tag {
  font-size: 0.625rem;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
  align-self: flex-start;
}

.rag-eval-tag.positive {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.rag-eval-tag.negative {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.rag-eval-tag.neutral {
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
}

.rag-side {
  display: grid;
  gap: 0.75rem;
  align-self: start;
}

.rag-side-header {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
}

.rag-side-block {
  padding: 0.8rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  display: grid;
  gap: 0.35rem;
}

.rag-side-block.fix {
  background: rgba(13, 148, 136, 0.05);
}

.rag-stage-fade-enter-active,
.rag-stage-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.rag-stage-fade-enter-from,
.rag-stage-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 1100px) {
  .rag-stage-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .rag-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .rag-stage-tabs,
  .rag-stage-grid {
    grid-template-columns: 1fr;
  }

  .rag-embedding-row {
    grid-template-columns: 1fr;
  }
}
</style>
