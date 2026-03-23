<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type RagPipelinePhase = 'doc' | 'chunk' | 'vectorize' | 'store' | 'query' | 'search' | 'generate'

interface RagPipelineStep {
  phase: RagPipelinePhase
  title: string
  description: string
  code?: string
  output?: string
}

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2000,
})

const steps: RagPipelineStep[] = [
  {
    phase: 'doc',
    title: '1. 原始文档输入',
    description: '加载 TypeScript 文档，准备进入 RAG 索引流水线',
    code: `const doc = \`interface 是 TypeScript 的核心特性，\n用于定义对象结构和类型约束...\n(共 1200 字)\``,
  },
  {
    phase: 'chunk',
    title: '2. 分块（Chunking）',
    description: '按固定大小切割，带 20% 重叠防止关键信息被切断',
    code: `function chunk(text: string, size=200, overlap=40): string[] {\n  const chunks = []\n  for (let i = 0; i < text.length; i += size - overlap) {\n    chunks.push(text.slice(i, i + size))\n  }\n  return chunks\n}`,
    output: `生成 7 个块，每块约 200 字\n块1: "interface 是 TypeScript..."\n块2: "...类型约束。type 是另一种..."\n块7: "...泛型可提升复用性"`,
  },
  {
    phase: 'vectorize',
    title: '3. 向量化（Vectorization）',
    description: '把每个文本块转成数值向量，语义相近的词在向量空间距离近',
    code: `function vectorize(text: string): number[] {\n  // 演示：词频 TF 向量化\n  const words = text.toLowerCase().split(/\\s+/)\n  const vocab = buildVocab(words)\n  return vocab.map(w => words.filter(x => x === w).length)\n}`,
    output: `块1 → [0.8, 0, 0.4, 0.1, ...] (维度: 512)`,
  },
  {
    phase: 'store',
    title: '4. 存入向量库',
    description: '把（文本块, 向量）对存入索引，索引阶段完成',
    code: `const vectorStore: Array<{\n  text: string\n  vector: number[]\n}> = chunks.map((text, i) => ({\n  text,\n  vector: vectors[i]\n}))\n// 7 个条目存储完毕`,
  },
  {
    phase: 'query',
    title: '5. 查询向量化（Query Phase）',
    description: '用户提问，对问题做同样的向量化处理',
    code: `const question = "TypeScript 的 interface 有什么特点？"\nconst queryVector = vectorize(question)\n// → [0.7, 0, 0.5, 0.2, ...]`,
  },
  {
    phase: 'search',
    title: '6. 余弦相似度检索',
    description: '计算查询向量与所有块向量的余弦相似度，取最相关的 top-3',
    code: `function cosineSimilarity(a: number[], b: number[]): number {\n  const dot = a.reduce((s, v, i) => s + v * b[i], 0)\n  return dot / (norm(a) * norm(b))\n}`,
    output: `块1 相似度: 0.92 ← Top-1\n块3 相似度: 0.78 ← Top-2\n块5 相似度: 0.71 ← Top-3`,
  },
  {
    phase: 'generate',
    title: '7. 注入上下文，生成答案',
    description: '把 top-3 片段注入 prompt，模型基于检索内容回答',
    code: `const prompt = [\n  { role: 'system', content: '参考资料：\\n' + topChunks.join('\\n---\\n') },\n  { role: 'user', content: question }\n]`,
    output: `模型回答：interface 可以声明合并、\n继承其他接口，支持索引签名...\n（基于文档内容，非训练数据）`,
  },
]

const phaseColors: Record<RagPipelinePhase, string> = {
  doc: '#6b7280',
  chunk: '#3b82f6',
  vectorize: '#8b5cf6',
  store: '#10b981',
  query: '#f59e0b',
  search: '#f97316',
  generate: '#0d9488',
}

const indexingPhases: RagPipelinePhase[] = ['doc', 'chunk', 'vectorize', 'store']
const queryPhases: RagPipelinePhase[] = ['query', 'search', 'generate']

const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: RagPipelinePhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentStep = computed(() => steps[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

function addLog(msg: string, phase: RagPipelinePhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= steps.length - 1) {
    stopDemo()
    addLog('RAG 流水线执行完成', 'generate')
    return
  }
  currentStepIndex.value++
  addLog(`${currentStep.value.title}`, currentStep.value.phase)
}

function startDemo() {
  if (isRunning.value) return
  isRunning.value = true
  currentStepIndex.value = 0
  executionLog.value = []
  addLog('开始 RAG 索引流水线...', 'doc')
  timer = setInterval(nextStep, props.playSpeed)
}

function stopDemo() {
  isRunning.value = false
  if (timer !== null) { clearInterval(timer); timer = null }
}

function resetDemo() {
  stopDemo()
  currentStepIndex.value = 0
  executionLog.value = []
}

onUnmounted(() => stopDemo())
if (props.autoPlay) startDemo()
</script>

<template>
  <div class="rpd-root">
    <div class="rpd-header">
      <div class="rpd-title-row">
        <span class="rpd-indicator" :class="{ running: isRunning }" />
        <span class="rpd-title">RAG 流水线</span>
        <span class="rpd-badge">P7 · RAG</span>
      </div>
      <div class="rpd-actions">
        <button class="rpd-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button class="rpd-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="rpd-progress-bar">
      <div class="rpd-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="rpd-body">
      <div class="rpd-main">
        <div class="rpd-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="step.phase"
            class="rpd-step-dot"
            :class="{ active: idx === currentStepIndex, done: idx < currentStepIndex }"
            :style="idx === currentStepIndex ? { background: phaseColors[step.phase], borderColor: phaseColors[step.phase] } : {}"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="rpd-step-content">
          <div class="rpd-step-header">
            <h3 class="rpd-step-title">{{ currentStep.title }}</h3>
            <p class="rpd-step-desc">{{ currentStep.description }}</p>
          </div>
          <div v-if="currentStep.code" class="rpd-code-block">
            <div class="rpd-block-label">代码</div>
            <pre><code>{{ currentStep.code }}</code></pre>
          </div>
          <div v-if="currentStep.output" class="rpd-output-block" :style="{ borderLeftColor: phaseColors[currentStep.phase] }">
            <div class="rpd-block-label">输出</div>
            <pre><code>{{ currentStep.output }}</code></pre>
          </div>
        </div>
      </div>

      <aside class="rpd-sidebar">
        <section class="rpd-block">
          <div class="rpd-block-header">执行日志</div>
          <div class="rpd-log-view">
            <div
              v-for="(log, i) in executionLog"
              :key="i"
              class="rpd-log-line"
              :style="{ color: phaseColors[log.phase] }"
            >
              <span class="rpd-log-ts">{{ log.time }}</span>{{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="rpd-empty">等待执行...</div>
          </div>
        </section>

        <section class="rpd-block">
          <div class="rpd-block-header">索引阶段（步骤 1-4）</div>
          <div class="rpd-phase-list">
            <div
              v-for="step in steps.filter(s => indexingPhases.includes(s.phase))"
              :key="step.phase"
              class="rpd-phase-item"
              :class="{ active: step.phase === currentStep.phase }"
              :style="step.phase === currentStep.phase ? { borderLeftColor: phaseColors[step.phase], background: 'rgba(13,148,136,0.08)' } : {}"
            >
              <div class="rpd-phase-icon" :style="{ background: phaseColors[step.phase] }" />
              <div class="rpd-phase-text">{{ step.title }}</div>
            </div>
          </div>
        </section>

        <section class="rpd-block rpd-phases">
          <div class="rpd-block-header">查询阶段（步骤 5-7）</div>
          <div class="rpd-phase-list">
            <div
              v-for="step in steps.filter(s => queryPhases.includes(s.phase))"
              :key="step.phase"
              class="rpd-phase-item"
              :class="{ active: step.phase === currentStep.phase }"
              :style="step.phase === currentStep.phase ? { borderLeftColor: phaseColors[step.phase], background: 'rgba(13,148,136,0.08)' } : {}"
            >
              <div class="rpd-phase-icon" :style="{ background: phaseColors[step.phase] }" />
              <div class="rpd-phase-text">{{ step.title }}</div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.rpd-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
  max-width: 100%;
  overflow: hidden;
}
.rpd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.rpd-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.rpd-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}
.rpd-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: rpd-pulse 1.5s ease-in-out infinite;
}
@keyframes rpd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.rpd-title { font-size: 1rem; font-weight: 600; color: var(--vp-c-text-1); }
.rpd-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}
.rpd-actions { display: flex; gap: 0.5rem; }
.rpd-btn-primary {
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
.rpd-btn-primary:hover { opacity: 0.9; }
.rpd-btn-primary.active { background: #0f766e; }
.rpd-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}
.rpd-btn-ghost:hover { background: var(--vp-c-bg-soft); }
.rpd-progress-bar { height: 4px; background: var(--vp-c-divider); border-radius: 2px; overflow: hidden; }
.rpd-progress-fill { height: 100%; background: var(--vp-c-brand-1); transition: width 0.3s ease; }
.rpd-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
  max-width: 100%;
  overflow: hidden;
}
@media (max-width: 1024px) {
  .rpd-body {
    grid-template-columns: 1fr 240px;
  }
}
.rpd-main {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.rpd-step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}
.rpd-step-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 1rem;
  right: 1rem;
  height: 2px;
  background: var(--vp-c-divider);
  z-index: 0;
}
.rpd-step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  border: 2px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  position: relative;
  z-index: 1;
  transition: all 0.3s;
}
.rpd-step-dot.active { color: #fff; transform: scale(1.15); }
.rpd-step-dot.done { background: #10b981; border-color: #10b981; color: #fff; }
.rpd-step-content { display: flex; flex-direction: column; gap: 1rem; }
.rpd-step-header { display: flex; flex-direction: column; gap: 0.5rem; }
.rpd-step-title { font-size: 1.125rem; font-weight: 600; color: var(--vp-c-text-1); margin: 0; }
.rpd-step-desc { font-size: 0.9375rem; color: var(--vp-c-text-2); margin: 0; line-height: 1.6; }
.rpd-code-block, .rpd-output-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}
.rpd-block-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}
.rpd-code-block pre, .rpd-output-block pre {
  margin: 0;
  padding: 0.75rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  overflow-x: auto;
  max-width: 100%;
  word-wrap: break-word;
  white-space: pre-wrap;
}
.rpd-output-block { border-left: 3px solid var(--vp-c-brand-1); transition: border-left-color 0.3s; }
.rpd-sidebar { display: flex; flex-direction: column; gap: 0.75rem; }
.rpd-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.rpd-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}
.rpd-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.rpd-log-line { line-height: 1.5; }
.rpd-log-ts { color: var(--vp-c-text-3); margin-right: 0.4rem; }
.rpd-empty { font-size: 0.75rem; color: var(--vp-c-text-3); text-align: center; padding: 0.4rem; }
.rpd-phases { flex: 1; }
.rpd-phase-list { display: flex; flex-direction: column; gap: 0.5rem; }
.rpd-phase-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  border-left: 3px solid transparent;
  transition: all 0.2s;
}
.rpd-phase-icon { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rpd-phase-text { font-size: 0.8125rem; color: var(--vp-c-text-1); }
@media (max-width: 768px) {
  .rpd-body { grid-template-columns: 1fr; }
  .rpd-sidebar { order: -1; }
  .rpd-step-indicator { padding: 0 0.5rem; }
  .rpd-step-indicator::before { left: 0.5rem; right: 0.5rem; }
  .rpd-step-dot { width: 26px; height: 26px; font-size: 0.75rem; }
  .rpd-root { padding: 1rem; }
  .rpd-main { padding: 1rem; }
}
</style>
