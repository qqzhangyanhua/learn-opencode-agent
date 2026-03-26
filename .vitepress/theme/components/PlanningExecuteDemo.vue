<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

withDefaults(defineProps<{ autoPlay?: boolean; playSpeed?: number }>(), {
  autoPlay: false,
  playSpeed: 2200,
})

type StepStatus = 'pending' | 'running' | 'done' | 'failed'
type DemoPhase = 'idle' | 'planning' | 'executing' | 'replanning' | 'done'
type ContentType = 'info' | 'tool' | 'output' | 'error' | 'replan'

interface PlanStep {
  id: string
  description: string
  status: StepStatus
  isRevised?: boolean
}

interface ExecPanel {
  stepTitle?: string
  type?: ContentType
  content: string
  context?: string
}

interface Frame {
  phase: DemoPhase
  phaseLabel: string
  steps: PlanStep[]
  exec: ExecPanel
  log: string
}

const S1 = { id: 'step_1', description: '用 web_search 搜索 TypeScript 5.0 新特性' }
const S2 = { id: 'step_2', description: '整理关键特性，提取核心要点' }
const S2R = { id: 'step_2r', description: '直接用 LLM 基于搜索结果整理（跳过本地文件）', isRevised: true }
const S3 = { id: 'step_3', description: '撰写简报并用 write_report 写入文件' }

const frames: Frame[] = [
  {
    phase: 'idle', phaseLabel: '等待开始',
    steps: [],
    exec: { content: '点击"开始演示"查看 Plan-and-Execute 全流程，含一次步骤失败与重规划。' },
    log: '',
  },
  {
    phase: 'planning', phaseLabel: '规划阶段',
    steps: [],
    exec: { type: 'info', content: 'Planner 正在将目标分解为有序步骤...\n\n目标：调研 TypeScript 5.0 新特性并写一份简报' },
    log: '发送规划请求到 Planner',
  },
  {
    phase: 'executing', phaseLabel: '计划已生成',
    steps: [
      { ...S1, status: 'pending' },
      { ...S2, status: 'pending' },
      { ...S3, status: 'pending' },
    ],
    exec: { type: 'info', content: '规划完成，生成 3 个有序步骤。\n\n全局视图已建立，开始逐步执行。' },
    log: '计划生成成功，3 个步骤',
  },
  {
    phase: 'executing', phaseLabel: '执行 step_1',
    steps: [
      { ...S1, status: 'running' },
      { ...S2, status: 'pending' },
      { ...S3, status: 'pending' },
    ],
    exec: { stepTitle: 'step_1', type: 'tool', content: 'web_search({"query": "TypeScript 5.0 新特性"})' },
    log: '执行 step_1 → 调用 web_search',
  },
  {
    phase: 'executing', phaseLabel: 'step_1 完成',
    steps: [
      { ...S1, status: 'done' },
      { ...S2, status: 'pending' },
      { ...S3, status: 'pending' },
    ],
    exec: {
      stepTitle: 'step_1', type: 'output',
      content: 'TypeScript 5.0 主要新特性：\n• Decorators（装饰器）正式进入标准（Stage 3）\n• const type parameters：泛型支持 const 修饰\n• extends 支持数组：继承多个配置\n• bundler 模块解析模式',
    },
    log: 'step_1 成功，结果追加到累积 context',
  },
  {
    phase: 'executing', phaseLabel: 'step_2 失败',
    steps: [
      { ...S1, status: 'done' },
      { ...S2, status: 'failed' },
      { ...S3, status: 'pending' },
    ],
    exec: {
      stepTitle: 'step_2', type: 'error',
      content: 'file_search({"query": "typescript changelog"})\n\n— 执行失败 —\n未找到与 "typescript changelog" 相关的本地文件',
      context: '[step_1] TypeScript 5.0 主要新特性：Decorators、const type parameters...',
    },
    log: 'step_2 失败 → 触发 Planner.revisePlan',
  },
  {
    phase: 'replanning', phaseLabel: '重新规划',
    steps: [
      { ...S1, status: 'done' },
      { ...S2, status: 'failed' },
      { ...S2R, status: 'pending' },
      { ...S3, status: 'pending' },
    ],
    exec: {
      type: 'replan',
      content: 'Planner.revisePlan 收到失败信息：\n• 已完成：step_1（搜索结果在 context 中）\n• 失败步骤：整理关键特性\n• 失败原因：本地文件不存在\n\n修订策略：插入 step_2r，直接让\nLLM 基于已有搜索结果整理要点。',
    },
    log: '重规划完成，插入修订步骤 step_2r',
  },
  {
    phase: 'executing', phaseLabel: 'step_2r 完成',
    steps: [
      { ...S1, status: 'done' },
      { ...S2, status: 'failed' },
      { ...S2R, status: 'done' },
      { ...S3, status: 'pending' },
    ],
    exec: {
      stepTitle: 'step_2r', type: 'output',
      content: '核心语言特性\n• Decorators 符合 TC39 Stage 3，取代 experimentalDecorators\n• const type parameters：推断时保留字面量类型\n\n工程化改进\n• extends 数组：一个 tsconfig 继承多个配置\n• bundler 解析：专为打包器场景设计',
      context: '[step_1] TypeScript 5.0 主要新特性：Decorators、const type parameters...',
    },
    log: 'step_2r 成功',
  },
  {
    phase: 'done', phaseLabel: '执行完成',
    steps: [
      { ...S1, status: 'done' },
      { ...S2, status: 'failed' },
      { ...S2R, status: 'done' },
      { ...S3, status: 'done' },
    ],
    exec: {
      stepTitle: 'step_3', type: 'output',
      content: 'write_report 完成：typescript-5.0-brief.md（486字符）\n\n预览：# TypeScript 5.0 新特性简报\n\n## 概述\nTypeScript 5.0 于 2023 年 3 月正式发布，带来了装饰器标准化、const 泛型等重要语言特性...',
      context: '[step_1] TypeScript 5.0 新特性...\n[step_2r] 关键特性整理：Decorators、const type parameters...',
    },
    log: '任务完成！成功 3 步，失败 1 步，重规划 1 次',
  },
]

const TOTAL = frames.length - 1
const frameIdx = ref(0)
const isRunning = ref(false)
const log = ref<{ msg: string; phase: DemoPhase }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const cur = computed(() => frames[frameIdx.value])
const progress = computed(() => (frameIdx.value / TOTAL) * 100)
const doneCount = computed(() => cur.value.steps.filter(s => s.status === 'done').length)
const failCount = computed(() => cur.value.steps.filter(s => s.status === 'failed').length)

function addLog(msg: string, phase: DemoPhase) {
  if (!msg) return
  log.value.unshift({ msg, phase })
  if (log.value.length > 6) log.value.pop()
}

function advance() {
  if (frameIdx.value >= TOTAL) { stop(); return }
  frameIdx.value++
  addLog(cur.value.log, cur.value.phase)
}

function start() {
  if (isRunning.value) return
  if (frameIdx.value >= TOTAL) reset()
  isRunning.value = true
  addLog(frames[frameIdx.value].log, frames[frameIdx.value].phase)
  timer = setInterval(advance, 2200)
}

function stop() {
  isRunning.value = false
  if (timer !== null) { clearInterval(timer); timer = null }
}

function reset() {
  stop()
  frameIdx.value = 0
  log.value = []
}

onUnmounted(stop)
</script>

<template>
  <div class="ped-root">
    <div class="ped-header">
      <div class="ped-title-row">
        <span class="ped-dot" :class="{ running: isRunning, done: cur.phase === 'done' }" />
        <span class="ped-title">Plan-and-Execute 演示</span>
        <span class="ped-badge">P11 · Planning</span>
      </div>
      <div class="ped-actions">
        <button class="ped-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stop() : start()">
          {{ isRunning ? '暂停' : frameIdx === TOTAL ? '重播' : '开始演示' }}
        </button>
        <button class="ped-btn-ghost" @click="reset">重置</button>
      </div>
    </div>

    <div class="ped-progress"><div class="ped-progress-fill" :style="{ width: `${progress}%` }" /></div>

    <div class="ped-phase-strip">
      <span class="ped-phase-label" :class="cur.phase">{{ cur.phaseLabel }}</span>
      <span v-if="cur.phase === 'done'" class="ped-stats">完成 {{ doneCount }} · 失败 {{ failCount }} · 重规划 1 次</span>
    </div>

    <div class="ped-body">
      <!-- 左栏：计划列表 -->
      <div class="ped-plan-panel">
        <div class="ped-panel-header">执行计划</div>
        <div v-if="cur.steps.length === 0" class="ped-empty">
          <span v-if="cur.phase === 'planning'" class="ped-spinner" />
          <span>{{ cur.phase === 'planning' ? '规划中...' : '等待规划' }}</span>
        </div>
        <div v-else class="ped-step-list">
          <div v-for="step in cur.steps" :key="step.id" class="ped-step-item" :class="step.status">
            <div class="ped-step-icon" :class="step.status">
              <span v-if="step.status === 'running'" class="ped-spinner-sm" />
              <span v-else-if="step.status === 'done'">✓</span>
              <span v-else-if="step.status === 'failed'">✕</span>
              <span v-else>·</span>
            </div>
            <div class="ped-step-body">
              <div class="ped-step-id">
                {{ step.id }}
                <span v-if="step.isRevised" class="ped-revised-badge">修订</span>
              </div>
              <div class="ped-step-desc">{{ step.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏：执行详情 -->
      <div class="ped-exec-panel">
        <div class="ped-panel-header">
          <span v-if="cur.exec.stepTitle" class="ped-exec-step-id">{{ cur.exec.stepTitle }}</span>
          <span v-else>执行详情</span>
        </div>
        <div class="ped-exec-content" :class="cur.exec.type ?? 'info'">
          <div class="ped-exec-type-label" v-if="cur.exec.type">
            {{ { tool: '工具调用', output: '执行结果', error: '执行失败', replan: '重规划', info: '说明' }[cur.exec.type] }}
          </div>
          <pre class="ped-exec-pre">{{ cur.exec.content }}</pre>
        </div>
        <div v-if="cur.exec.context" class="ped-context-block">
          <div class="ped-context-label">累积 Context</div>
          <pre class="ped-context-pre">{{ cur.exec.context }}</pre>
        </div>
        <!-- 执行日志 -->
        <div class="ped-log-box">
          <div class="ped-log-header">执行日志</div>
          <div v-for="(entry, i) in log" :key="i" class="ped-log-line" :class="entry.phase">{{ entry.msg }}</div>
          <div v-if="log.length === 0" class="ped-log-empty">等待执行...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ped-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: 1.5rem 0;
  overflow: hidden;
}

.ped-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.ped-title-row { display: flex; align-items: center; gap: 0.625rem; }

.ped-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}
.ped-dot.running { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; animation: ped-pulse 1.5s infinite; }
.ped-dot.done { background: #10b981; box-shadow: 0 0 8px #10b981; }
@keyframes ped-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.ped-title { font-size: 1rem; font-weight: 600; color: var(--vp-c-text-1); }
.ped-badge {
  font-size: 0.6875rem; padding: 2px 8px; border-radius: 10px;
  background: rgba(245, 158, 11, 0.12); color: #d97706; font-weight: 500;
}

.ped-actions { display: flex; gap: 0.5rem; }
.ped-btn-primary {
  background: var(--vp-c-brand-1); color: #fff; border: none;
  padding: 0.375rem 0.875rem; border-radius: 6px; font-size: 0.875rem;
  font-weight: 500; cursor: pointer; transition: opacity 0.2s;
}
.ped-btn-primary:hover { opacity: 0.9; }
.ped-btn-primary.active { background: #0f766e; }
.ped-btn-ghost {
  background: transparent; border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem; border-radius: 6px; font-size: 0.875rem;
  cursor: pointer; color: var(--vp-c-text-1);
}
.ped-btn-ghost:hover { background: var(--vp-c-bg); }

.ped-progress { height: 3px; background: var(--vp-c-divider); border-radius: 2px; overflow: hidden; }
.ped-progress-fill { height: 100%; background: var(--vp-c-brand-1); transition: width 0.35s ease; }

.ped-phase-strip { display: flex; align-items: center; gap: 0.75rem; min-height: 1.5rem; }
.ped-phase-label {
  font-size: 0.8125rem; font-weight: 600; padding: 2px 10px;
  border-radius: 20px; transition: all 0.3s;
}
.ped-phase-label.idle { background: var(--vp-c-bg); color: var(--vp-c-text-3); border: 1px solid var(--vp-c-divider); }
.ped-phase-label.planning { background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); }
.ped-phase-label.executing { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }
.ped-phase-label.replanning { background: rgba(249, 115, 22, 0.1); color: #ea580c; border: 1px solid rgba(249, 115, 22, 0.3); }
.ped-phase-label.done { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); }
.ped-stats { font-size: 0.8125rem; color: var(--vp-c-text-2); }

.ped-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  min-height: 360px;
}

/* 左栏 */
.ped-plan-panel, .ped-exec-panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ped-panel-header {
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--vp-c-text-2);
  padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  display: flex; align-items: center; gap: 0.5rem;
}

.ped-exec-step-id {
  font-size: 0.75rem; font-weight: 700;
  color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono);
}

.ped-empty {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  flex: 1; color: var(--vp-c-text-3); font-size: 0.875rem;
}

.ped-step-list { display: flex; flex-direction: column; padding: 0.5rem; gap: 0.375rem; flex: 1; }

.ped-step-item {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.5rem 0.625rem; border-radius: 6px;
  border: 1px solid transparent; transition: all 0.3s;
  background: var(--vp-c-bg-soft);
}
.ped-step-item.running { border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.05); }
.ped-step-item.done { border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.04); }
.ped-step-item.failed { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.04); }

.ped-step-icon {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6875rem; font-weight: 700; margin-top: 1px;
  border: 1.5px solid var(--vp-c-divider); color: var(--vp-c-text-3);
}
.ped-step-icon.running { border-color: #3b82f6; color: #3b82f6; }
.ped-step-icon.done { background: #10b981; border-color: #10b981; color: #fff; }
.ped-step-icon.failed { background: #ef4444; border-color: #ef4444; color: #fff; }

.ped-step-body { flex: 1; min-width: 0; }
.ped-step-id {
  font-size: 0.6875rem; font-weight: 700; font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2); display: flex; align-items: center; gap: 0.375rem;
}
.ped-revised-badge {
  font-size: 0.5625rem; padding: 1px 5px; border-radius: 4px;
  background: rgba(249, 115, 22, 0.15); color: #ea580c; font-family: inherit;
}
.ped-step-desc { font-size: 0.8125rem; color: var(--vp-c-text-1); line-height: 1.4; margin-top: 2px; }

/* 右栏 */
.ped-exec-content {
  margin: 0.75rem; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}
.ped-exec-content.tool { border-left: 3px solid #3b82f6; }
.ped-exec-content.output { border-left: 3px solid #10b981; }
.ped-exec-content.error { border-left: 3px solid #ef4444; }
.ped-exec-content.replan { border-left: 3px solid #f97316; }
.ped-exec-content.info { border-left: 3px solid var(--vp-c-brand-1); }

.ped-exec-type-label {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; padding: 0.3rem 0.75rem;
  background: var(--vp-c-bg-soft); border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}

.ped-exec-pre {
  font-family: var(--vp-font-family-mono); font-size: 0.8125rem;
  line-height: 1.65; color: var(--vp-c-text-1); padding: 0.75rem;
  margin: 0; white-space: pre-wrap; word-break: break-word;
}

.ped-context-block {
  margin: 0 0.75rem 0.75rem; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--vp-c-divider); opacity: 0.7;
}
.ped-context-label {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; padding: 0.25rem 0.75rem;
  background: var(--vp-c-bg-soft); border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}
.ped-context-pre {
  font-family: var(--vp-font-family-mono); font-size: 0.75rem;
  color: var(--vp-c-text-2); padding: 0.5rem 0.75rem;
  margin: 0; white-space: pre-wrap; word-break: break-word;
}

.ped-log-box {
  margin-top: auto; padding: 0.625rem 0.875rem;
  border-top: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
}
.ped-log-header {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--vp-c-text-3); margin-bottom: 0.3rem;
}
.ped-log-line {
  font-size: 0.75rem; font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2); line-height: 1.5; padding: 1px 0;
}
.ped-log-line.planning { color: #d97706; }
.ped-log-line.executing { color: #3b82f6; }
.ped-log-line.replanning { color: #ea580c; }
.ped-log-line.done { color: #059669; }
.ped-log-empty { font-size: 0.75rem; color: var(--vp-c-text-3); }

/* 微动效 */
.ped-spinner { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(245,158,11,0.3); border-top-color: #f59e0b; animation: ped-spin 0.8s linear infinite; }
.ped-spinner-sm { display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid rgba(59,130,246,0.3); border-top-color: #3b82f6; animation: ped-spin 0.8s linear infinite; }
@keyframes ped-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .ped-body { grid-template-columns: 1fr; }
}
</style>
