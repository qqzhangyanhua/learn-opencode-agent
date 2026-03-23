<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { HYBRID_STEPS, RETRIEVAL_METHODS } from './hybridRetrievalData'
import type { HybridRetrievalPhase } from './types'

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 2000,
})

const currentStepIndex = ref(0)
const isRunning = ref(false)
const executionLog = ref<{ time: string; msg: string; phase: HybridRetrievalPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const currentStep = computed(() => HYBRID_STEPS[currentStepIndex.value])
const progress = computed(() => ((currentStepIndex.value + 1) / HYBRID_STEPS.length) * 100)

function addLog(msg: string, phase: HybridRetrievalPhase) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, phase })
  if (executionLog.value.length > 8) executionLog.value.pop()
}

function nextStep() {
  if (currentStepIndex.value >= HYBRID_STEPS.length - 1) {
    stopDemo()
    addLog('混合检索完成', 'inject')
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
  addLog('启动混合检索流程...', 'query')
  timer = setInterval(nextStep, props.playSpeed)
}

function stopDemo() {
  isRunning.value = false
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
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
  <div class="hrd-root">
    <div class="hrd-header">
      <div class="hrd-title-row">
        <span class="hrd-indicator" :class="{ running: isRunning }" />
        <span class="hrd-title">混合检索 + RRF 融合</span>
        <span class="hrd-badge">P9 · Hybrid Retrieval</span>
      </div>
      <div class="hrd-actions">
        <button class="hrd-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stopDemo() : startDemo()">
          {{ isRunning ? '暂停' : '开始演示' }}
        </button>
        <button class="hrd-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="hrd-progress-bar">
      <div class="hrd-progress-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="hrd-body">
      <div class="hrd-main">
        <div class="hrd-step-indicator">
          <div
            v-for="(step, idx) in HYBRID_STEPS"
            :key="step.phase"
            class="hrd-step-dot"
            :class="{
              active: idx === currentStepIndex,
              done: idx < currentStepIndex
            }"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <div class="hrd-step-content">
          <div class="hrd-step-header">
            <h3 class="hrd-step-title">{{ currentStep.title }}</h3>
            <p class="hrd-step-desc">{{ currentStep.description }}</p>
          </div>

          <div v-if="currentStep.code" class="hrd-code-block">
            <div class="hrd-code-label">代码</div>
            <pre><code>{{ currentStep.code }}</code></pre>
          </div>

          <div v-if="currentStep.output" class="hrd-output-block" :class="currentStep.phase">
            <div class="hrd-output-label">输出</div>
            <pre><code>{{ currentStep.output }}</code></pre>
          </div>
        </div>
      </div>

      <aside class="hrd-sidebar">
        <section class="hrd-block">
          <div class="hrd-block-header">执行日志</div>
          <div class="hrd-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="hrd-log-line" :class="log.phase">
              <span class="hrd-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="hrd-empty">等待执行...</div>
          </div>
        </section>

        <section class="hrd-block hrd-methods">
          <div class="hrd-block-header">检索方式对比</div>
          <div class="hrd-method-list">
            <div
              v-for="method in RETRIEVAL_METHODS"
              :key="method.phase"
              class="hrd-method-item"
              :class="{ active: method.phase === currentStep.phase }"
            >
              <div class="hrd-method-dot" :class="method.phase" />
              <div class="hrd-method-body">
                <div class="hrd-method-label">{{ method.label }}</div>
                <div class="hrd-method-row">
                  <span class="hrd-method-tag strength">{{ method.strength }}</span>
                </div>
                <div class="hrd-method-row">
                  <span class="hrd-method-tag weakness">{{ method.weakness }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.hrd-root {
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

.hrd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hrd-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.hrd-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.hrd-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: hrd-pulse 1.5s ease-in-out infinite;
}

@keyframes hrd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hrd-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.hrd-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.hrd-actions {
  display: flex;
  gap: 0.5rem;
}

.hrd-btn-primary {
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

.hrd-btn-primary:hover { opacity: 0.9; }
.hrd-btn-primary.active { background: #0f766e; }

.hrd-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.hrd-btn-ghost:hover { background: var(--vp-c-bg-soft); }

.hrd-progress-bar {
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
}

.hrd-progress-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.3s ease;
}

.hrd-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  min-height: 400px;
  max-width: 100%;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .hrd-body {
    grid-template-columns: 1fr 240px;
  }
}

.hrd-main {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hrd-step-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}

.hrd-step-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 1rem;
  right: 1rem;
  height: 2px;
  background: var(--vp-c-divider);
  z-index: 0;
}

.hrd-step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  border: 2px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  position: relative;
  z-index: 1;
  transition: all 0.3s;
}

.hrd-step-dot.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
  transform: scale(1.15);
}

.hrd-step-dot.done {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

.hrd-step-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hrd-step-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hrd-step-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.hrd-step-desc {
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.6;
}

.hrd-code-block,
.hrd-output-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.hrd-code-label,
.hrd-output-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.hrd-code-block pre,
.hrd-output-block pre {
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

.hrd-output-block            { border-left: 3px solid var(--vp-c-brand-1); }
.hrd-output-block.keyword    { border-left-color: #3b82f6; }
.hrd-output-block.vector     { border-left-color: #8b5cf6; }
.hrd-output-block.rrf        { border-left-color: #f59e0b; }
.hrd-output-block.merge      { border-left-color: #f97316; }
.hrd-output-block.inject     { border-left-color: #0d9488; }

.hrd-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hrd-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hrd-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.hrd-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hrd-log-line { line-height: 1.5; color: var(--vp-c-text-2); }

.hrd-log-line.query   { color: #6b7280; }
.hrd-log-line.keyword { color: #3b82f6; }
.hrd-log-line.vector  { color: #8b5cf6; }
.hrd-log-line.rrf     { color: #f59e0b; }
.hrd-log-line.merge   { color: #f97316; }
.hrd-log-line.inject  { color: #0d9488; }

.hrd-log-ts { color: var(--vp-c-text-3); margin-right: 0.4rem; }

.hrd-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

.hrd-methods { flex: 1; }

.hrd-method-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hrd-method-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  transition: all 0.2s;
}

.hrd-method-item.active {
  background: rgba(13, 148, 136, 0.1);
  border-left: 3px solid var(--vp-c-brand-1);
}

.hrd-method-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.hrd-method-dot.keyword { background: #3b82f6; }
.hrd-method-dot.vector  { background: #8b5cf6; }
.hrd-method-dot.rrf     { background: #f59e0b; }

.hrd-method-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.hrd-method-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.hrd-method-row { display: flex; flex-wrap: wrap; gap: 0.25rem; }

.hrd-method-tag {
  font-size: 0.6875rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.hrd-method-tag.strength { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.hrd-method-tag.weakness { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

@media (max-width: 768px) {
  .hrd-body { grid-template-columns: 1fr; }
  .hrd-sidebar { order: -1; }
  .hrd-step-indicator { padding: 0 0.5rem; }
  .hrd-step-indicator::before { left: 0.5rem; right: 0.5rem; }
  .hrd-step-dot {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
  .hrd-root { padding: 1rem; }
  .hrd-main { padding: 1rem; }
}
</style>
