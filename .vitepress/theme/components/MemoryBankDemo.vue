<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { MemoryRetrievalPhase, MemoryRetrievalStep } from './types'

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2000,
})

const steps: MemoryRetrievalStep[] = [
  {
    phase: 'query',
    title: '1. 用户输入',
    description: 'Agent 接收到用户查询，准备检索相关记忆',
    code: `const userInput = "帮我用 TypeScript 写个防抖函数"`,
  },
  {
    phase: 'keywords',
    title: '2. 关键词提取',
    description: '把用户输入拆分为关键词，作为检索依据',
    code: `function extractKeywords(text: string): string[] {\n  return text.split(/[\\s，。！？、]+/)\n    .filter(w => w.length > 1)\n}\n// 结果：['TypeScript', '写', '防抖函数']`,
    output: `关键词: ['TypeScript', '防抖函数']`,
  },
  {
    phase: 'match',
    title: '3. 标签匹配 & 打分',
    description: '遍历所有记忆，计算关键词与标签的交集，乘以重要性得到综合分',
    code: `function score(memory: MemoryEntry, keywords: string[]): number {\n  const overlap = memory.tags.filter(t => keywords.includes(t)).length\n  return overlap * memory.importance\n}`,
    output: `记忆A "偏好 TypeScript" → 交集2 × 重要性9 = 18分\n记忆B "用户叫张三" → 交集0 × 重要性8 = 0分\n记忆C "喜欢简洁代码" → 交集1 × 重要性7 = 7分`,
  },
  {
    phase: 'select',
    title: '4. Top-K 筛选',
    description: '按综合得分排序，取前 3 条相关记忆，控制 Token 用量',
    code: `const topK = memories\n  .map(m => ({ ...m, score: score(m, keywords) }))\n  .filter(m => m.score > 0)\n  .sort((a, b) => b.score - a.score)\n  .slice(0, 3)`,
    output: `Top-3 记忆：\n1. 偏好 TypeScript (18分)\n2. 喜欢简洁代码 (7分)`,
  },
  {
    phase: 'inject',
    title: '5. 注入上下文',
    description: '把检索到的记忆拼入 system prompt，模型用相关上下文回答',
    code: `const systemPrompt = \`你是 AI 助手。\n\n[相关记忆]\n\${topK.map(m => \`- \${m.content}\`).join('\\n')}\`\n\n// 模型现在知道用户偏好 TypeScript 和简洁代码风格`,
  },
]

const retrievalFlowSteps: { label: string; phase: MemoryRetrievalPhase }[] = [
  { label: '提取', phase: 'keywords' },
  { label: '匹配', phase: 'match' },
  { label: '排序', phase: 'match' },
  { label: '筛选', phase: 'select' },
  { label: '注入', phase: 'inject' },
]

const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: MemoryRetrievalPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentStep = computed(() => steps[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

function addLog(msg: string, phase: MemoryRetrievalPhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= steps.length - 1) {
    stopDemo()
    addLog('记忆检索完成', 'inject')
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
  addLog('开始记忆检索流程...', 'query')
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
  <div class="mbd-root">
    <div class="mbd-header">
      <div class="mbd-title-row">
        <span class="mbd-indicator" :class="{ running: isRunning }" />
        <span class="mbd-title">MemoryBank 标签检索</span>
        <span class="mbd-badge">P6 · Memory Retrieval</span>
      </div>
      <div class="mbd-actions">
        <button class="mbd-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button class="mbd-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="mbd-progress-bar">
      <div class="mbd-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="mbd-body">
      <div class="mbd-main">
        <div class="mbd-step-indicator">
          <div
            v-for="(step, idx) in steps"
            :key="step.phase"
            class="mbd-step-dot"
            :class="{ active: idx === currentStepIndex, done: idx < currentStepIndex }"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="mbd-step-content">
          <div class="mbd-step-header">
            <h3 class="mbd-step-title">{{ currentStep.title }}</h3>
            <p class="mbd-step-desc">{{ currentStep.description }}</p>
          </div>

          <div v-if="currentStep.code" class="mbd-code-block">
            <div class="mbd-code-label">代码</div>
            <pre><code>{{ currentStep.code }}</code></pre>
          </div>

          <div v-if="currentStep.output" class="mbd-output-block" :class="currentStep.phase">
            <div class="mbd-output-label">输出</div>
            <pre><code>{{ currentStep.output }}</code></pre>
          </div>
        </div>
      </div>

      <aside class="mbd-sidebar">
        <section class="mbd-block">
          <div class="mbd-block-header">执行日志</div>
          <div class="mbd-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="mbd-log-line" :class="log.phase">
              <span class="mbd-log-ts">{{ log.time }}</span>{{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="mbd-empty">等待执行...</div>
          </div>
        </section>

        <section class="mbd-block mbd-flow">
          <div class="mbd-block-header">检索流程说明</div>
          <div class="mbd-flow-list">
            <div
              v-for="(item, idx) in retrievalFlowSteps"
              :key="idx"
              class="mbd-flow-item"
              :class="{ active: item.phase === currentStep.phase }"
            >
              <div class="mbd-flow-num">{{ idx + 1 }}</div>
              <div class="mbd-flow-icon" :class="item.phase" />
              <div class="mbd-flow-text">{{ item.label }}</div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.mbd-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
}
.mbd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.mbd-title-row { display: flex; align-items: center; gap: 0.625rem; }
.mbd-indicator {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}
.mbd-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: mbd-pulse 1.5s ease-in-out infinite;
}
@keyframes mbd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.mbd-title { font-size: 1rem; font-weight: 600; color: var(--vp-c-text-1); }
.mbd-badge {
  font-size: 0.6875rem; padding: 2px 8px; border-radius: 10px;
  background: rgba(13, 148, 136, 0.1); color: var(--vp-c-brand-1); font-weight: 500;
}
.mbd-actions { display: flex; gap: 0.5rem; }
.mbd-btn-primary {
  background: var(--vp-c-brand-1); color: #fff; border: none;
  padding: 0.375rem 0.875rem; border-radius: 6px;
  font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s;
}
.mbd-btn-primary:hover { opacity: 0.9; }
.mbd-btn-primary.active { background: #0f766e; }
.mbd-btn-ghost {
  background: transparent; border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem; border-radius: 6px;
  font-size: 0.875rem; cursor: pointer; color: var(--vp-c-text-1);
}
.mbd-btn-ghost:hover { background: var(--vp-c-bg-soft); }
.mbd-progress-bar { height: 4px; background: var(--vp-c-divider); border-radius: 2px; overflow: hidden; }
.mbd-progress-fill { height: 100%; background: var(--vp-c-brand-1); transition: width 0.3s ease; }
.mbd-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
}
.mbd-main {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.mbd-step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}
.mbd-step-indicator::before {
  content: '';
  position: absolute;
  top: 50%; left: 1rem; right: 1rem;
  height: 2px; background: var(--vp-c-divider); z-index: 0;
}
.mbd-step-dot {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--vp-c-bg-soft); border: 2px solid var(--vp-c-divider);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.875rem; font-weight: 600; color: var(--vp-c-text-3);
  position: relative; z-index: 1; transition: all 0.3s;
}
.mbd-step-dot.active { background: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); color: #fff; transform: scale(1.15); }
.mbd-step-dot.done { background: #10b981; border-color: #10b981; color: #fff; }
.mbd-step-content { display: flex; flex-direction: column; gap: 1rem; }
.mbd-step-header { display: flex; flex-direction: column; gap: 0.5rem; }
.mbd-step-title { font-size: 1.125rem; font-weight: 600; color: var(--vp-c-text-1); margin: 0; }
.mbd-step-desc { font-size: 0.9375rem; color: var(--vp-c-text-2); margin: 0; line-height: 1.6; }
.mbd-code-block,
.mbd-output-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}
.mbd-code-label,
.mbd-output-label {
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--vp-c-text-3);
  padding: 0.5rem 0.75rem; background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}
.mbd-code-block pre,
.mbd-output-block pre {
  margin: 0; padding: 0.75rem;
  font-family: var(--vp-font-family-mono); font-size: 0.8125rem;
  line-height: 1.6; color: var(--vp-c-text-1); overflow-x: auto;
}
.mbd-output-block            { border-left: 3px solid var(--vp-c-brand-1); }
.mbd-output-block.query      { border-left-color: #3b82f6; }
.mbd-output-block.keywords   { border-left-color: #f59e0b; }
.mbd-output-block.match      { border-left-color: #8b5cf6; }
.mbd-output-block.select     { border-left-color: #10b981; }
.mbd-output-block.inject     { border-left-color: #0d9488; }
.mbd-sidebar { display: flex; flex-direction: column; gap: 0.75rem; }
.mbd-block {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 8px; padding: 0.75rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.mbd-block-header {
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--vp-c-text-2);
  padding-bottom: 0.3rem; border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}
.mbd-log-view {
  font-family: var(--vp-font-family-mono); font-size: 0.6875rem;
  max-height: 180px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.2rem;
}
.mbd-log-line { line-height: 1.5; color: var(--vp-c-text-2); }
.mbd-log-line.query    { color: #3b82f6; }
.mbd-log-line.keywords { color: #f59e0b; }
.mbd-log-line.match    { color: #8b5cf6; }
.mbd-log-line.select   { color: #10b981; }
.mbd-log-line.inject   { color: #0d9488; }
.mbd-log-ts { color: var(--vp-c-text-3); margin-right: 0.4rem; }
.mbd-empty { font-size: 0.75rem; color: var(--vp-c-text-3); text-align: center; padding: 0.4rem; }
.mbd-flow { flex: 1; }
.mbd-flow-list { display: flex; flex-direction: column; gap: 0.5rem; }
.mbd-flow-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem; border-radius: 4px;
  background: var(--vp-c-bg-soft); transition: all 0.2s;
}
.mbd-flow-item.active { background: rgba(13, 148, 136, 0.1); border-left: 3px solid var(--vp-c-brand-1); }
.mbd-flow-num { font-size: 0.6875rem; font-weight: 700; color: var(--vp-c-text-3); width: 14px; text-align: center; flex-shrink: 0; }
.mbd-flow-icon { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.mbd-flow-icon.query    { background: #3b82f6; }
.mbd-flow-icon.keywords { background: #f59e0b; }
.mbd-flow-icon.match    { background: #8b5cf6; }
.mbd-flow-icon.select   { background: #10b981; }
.mbd-flow-icon.inject   { background: #0d9488; }
.mbd-flow-text { font-size: 0.8125rem; color: var(--vp-c-text-1); }
@media (max-width: 768px) {
  .mbd-body { grid-template-columns: 1fr; }
  .mbd-step-indicator { padding: 0 0.5rem; }
  .mbd-step-indicator::before { left: 0.5rem; right: 0.5rem; }
  .mbd-step-dot { width: 28px; height: 28px; font-size: 0.75rem; }
}
</style>
