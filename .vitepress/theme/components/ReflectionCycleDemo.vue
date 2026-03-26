<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

withDefaults(defineProps<{ autoPlay?: boolean; playSpeed?: number }>(), {
  autoPlay: false,
  playSpeed: 2400,
})

type RoundPhase = 'generating' | 'evaluating' | 'done'
type DemoState = 'idle' | 'active' | 'done'

interface CriticResult {
  score: number
  feedback: string
  suggestions: string[]
  passed: boolean
}

interface RoundSnapshot {
  iteration: number
  phase: RoundPhase
  output: string
  critic?: CriticResult
}

interface Frame {
  state: DemoState
  label: string
  round: RoundSnapshot | null
  log: string
}

const ROUND1_OUTPUT = `泛型是 TypeScript 的核心特性之一，它让你的代码在保持类型安全的同时获得灵活性。通过泛型，你可以写出适用于多种类型的通用函数和类。`

const ROUND2_OUTPUT = `你写过这样的代码吗？\`function identity(arg: any): any { return arg }\` — \`any\` 让类型检查失效，但换成泛型：\`function identity<T>(arg: T): T { return arg }\`，类型安全与灵活性兼得。`

const frames: Frame[] = [
  {
    state: 'idle', label: '等待开始',
    round: null,
    log: '',
  },
  {
    state: 'active', label: '第 1 轮 · Generator 生成',
    round: {
      iteration: 1, phase: 'generating',
      output: ROUND1_OUTPUT,
    },
    log: 'Round 1：Generator 生成初稿',
  },
  {
    state: 'active', label: '第 1 轮 · Critic 评审',
    round: {
      iteration: 1, phase: 'evaluating',
      output: ROUND1_OUTPUT,
      critic: {
        score: 5,
        feedback: '内容基本正确，但开头像教科书定义，缺少代码示例，难以抓住读者。',
        suggestions: [
          '用一个真实痛点或问题作为开头钩子，而非直接给定义',
          '加入一个具体的泛型 vs any 代码对比示例',
        ],
        passed: false,
      },
    },
    log: 'Round 1：Critic 评分 5/10，未通过',
  },
  {
    state: 'active', label: '第 2 轮 · Generator 改进',
    round: {
      iteration: 2, phase: 'generating',
      output: ROUND2_OUTPUT,
    },
    log: 'Round 2：Generator 据反馈改进',
  },
  {
    state: 'done', label: '第 2 轮 · Critic 评审 · 通过',
    round: {
      iteration: 2, phase: 'done',
      output: ROUND2_OUTPUT,
      critic: {
        score: 8,
        feedback: '用痛点问题开头抓住读者，代码示例清晰展示泛型解决的问题，字数在要求内。',
        suggestions: [],
        passed: true,
      },
    },
    log: 'Round 2：Critic 评分 8/10，已通过！',
  },
]

const TOTAL = frames.length - 1
const frameIdx = ref(0)
const isRunning = ref(false)
const log = ref<string[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const cur = computed(() => frames[frameIdx.value])
const progress = computed(() => (frameIdx.value / TOTAL) * 100)

const scoreColor = computed(() => {
  const score = cur.value.round?.critic?.score ?? 0
  if (score >= 8) return '#10b981'
  if (score >= 5) return '#f59e0b'
  return '#ef4444'
})

const scoreBarWidth = computed(() => {
  const score = cur.value.round?.critic?.score ?? 0
  return `${(score / 10) * 100}%`
})

function advance() {
  if (frameIdx.value >= TOTAL) { stop(); return }
  frameIdx.value++
  if (frames[frameIdx.value].log) {
    log.value.unshift(frames[frameIdx.value].log)
    if (log.value.length > 5) log.value.pop()
  }
}

function start() {
  if (isRunning.value) return
  if (frameIdx.value >= TOTAL) reset()
  isRunning.value = true
  if (frames[frameIdx.value].log) log.value.unshift(frames[frameIdx.value].log)
  timer = setInterval(advance, 2400)
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
  <div class="rcd-root">
    <!-- 头部 -->
    <div class="rcd-header">
      <div class="rcd-title-row">
        <span class="rcd-dot" :class="{ running: isRunning, done: cur.state === 'done' }" />
        <span class="rcd-title">Reflection 迭代演示</span>
        <span class="rcd-badge">P12 · Reflection</span>
      </div>
      <div class="rcd-actions">
        <button class="rcd-btn-primary" :class="{ active: isRunning }" @click="isRunning ? stop() : start()">
          {{ isRunning ? '暂停' : frameIdx === TOTAL ? '重播' : '开始演示' }}
        </button>
        <button class="rcd-btn-ghost" @click="reset">重置</button>
      </div>
    </div>

    <div class="rcd-progress"><div class="rcd-progress-fill" :style="{ width: `${progress}%` }" /></div>

    <!-- 迭代进度条 -->
    <div class="rcd-rounds-row">
      <div class="rcd-round-label">迭代轮次</div>
      <div class="rcd-round-dots">
        <div
          v-for="r in [1, 2]" :key="r"
          class="rcd-round-dot"
          :class="{
            active: cur.round?.iteration === r,
            done: cur.round ? (cur.round.iteration > r || (cur.round.iteration === r && cur.round.critic?.passed)) : false,
            failed: cur.round?.iteration === r && cur.round?.critic && !cur.round.critic.passed,
          }"
        >
          <span class="rcd-round-num">{{ r }}</span>
          <span
            v-if="cur.round && cur.round.iteration >= r && cur.round.critic && cur.round.iteration === r"
            class="rcd-round-score"
          >{{ cur.round.critic.score }}/10</span>
        </div>
      </div>
      <div class="rcd-state-label" :class="cur.state">{{ cur.label }}</div>
    </div>

    <!-- 主体双栏 -->
    <div class="rcd-body">
      <!-- 左栏：Generator 输出 -->
      <div class="rcd-gen-panel">
        <div class="rcd-panel-header">
          <span class="rcd-role-tag generator">Generator</span>
          <span v-if="cur.round" class="rcd-iter-tag">第 {{ cur.round.iteration }} 轮</span>
        </div>
        <div v-if="!cur.round" class="rcd-empty">等待生成...</div>
        <div v-else class="rcd-gen-content">
          <div class="rcd-gen-phase-row">
            <span class="rcd-phase-badge" :class="cur.round.phase">
              <span v-if="cur.round.phase === 'generating'" class="rcd-spinner-sm" />
              {{ cur.round.phase === 'generating' ? '生成中...' : cur.round.phase === 'evaluating' ? '待评审' : '已通过' }}
            </span>
          </div>
          <div class="rcd-output-box" :class="{ improved: cur.round.iteration === 2 }">
            <div class="rcd-output-label">
              输出 · 版本 {{ cur.round.iteration }}
              <span v-if="cur.round.iteration === 2" class="rcd-improved-tag">已改进</span>
            </div>
            <div class="rcd-output-text">{{ cur.round.output }}</div>
          </div>
          <!-- 任务说明 -->
          <div class="rcd-task-box">
            <div class="rcd-task-label">任务要求</div>
            <div class="rcd-task-text">写 TypeScript 泛型文章开头段落（要求：吸引人、有代码示例、100字以内）</div>
          </div>
        </div>
      </div>

      <!-- 右栏：Critic 评审 -->
      <div class="rcd-critic-panel">
        <div class="rcd-panel-header">
          <span class="rcd-role-tag critic">Critic</span>
          <span class="rcd-panel-sub">评审结果</span>
        </div>
        <div v-if="!cur.round?.critic" class="rcd-empty">
          <span v-if="cur.round?.phase === 'generating'" class="rcd-spinner" />
          <span>{{ cur.round ? '等待 Generator 完成...' : '等待开始' }}</span>
        </div>
        <div v-else class="rcd-critic-content">
          <!-- 分数仪表 -->
          <div class="rcd-score-section">
            <div class="rcd-score-num" :style="{ color: scoreColor }">{{ cur.round.critic.score }}</div>
            <div class="rcd-score-info">
              <div class="rcd-score-label">/ 10</div>
              <div
                class="rcd-pass-badge"
                :class="cur.round.critic.passed ? 'passed' : 'failed'"
              >{{ cur.round.critic.passed ? '已通过' : '未通过' }}</div>
            </div>
          </div>
          <div class="rcd-score-bar-wrap">
            <div class="rcd-score-bar" :style="{ width: scoreBarWidth, background: scoreColor }" />
          </div>

          <!-- Feedback -->
          <div class="rcd-feedback-box">
            <div class="rcd-section-label">总体评价</div>
            <div class="rcd-feedback-text">{{ cur.round.critic.feedback }}</div>
          </div>

          <!-- Suggestions -->
          <div v-if="cur.round.critic.suggestions.length > 0" class="rcd-suggestions-box">
            <div class="rcd-section-label">改进建议</div>
            <div
              v-for="(s, i) in cur.round.critic.suggestions"
              :key="i"
              class="rcd-suggestion-item"
            >
              <span class="rcd-suggestion-num">{{ i + 1 }}</span>
              <span class="rcd-suggestion-text">{{ s }}</span>
            </div>
          </div>
          <div v-else class="rcd-passed-note">
            已满足所有评审标准（score {{ cur.round.critic.score }} ≥ 8），停止迭代。
          </div>

          <!-- 停止条件说明 -->
          <div class="rcd-stop-hint">
            停止条件：score ≥ 8 或达到 maxIterations（3）
          </div>
        </div>

        <!-- 执行日志 -->
        <div class="rcd-log-box">
          <div class="rcd-log-header">执行日志</div>
          <div v-for="(entry, i) in log" :key="i" class="rcd-log-line">{{ entry }}</div>
          <div v-if="log.length === 0" class="rcd-log-empty">等待执行...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rcd-root {
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

.rcd-header {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 0.75rem;
}
.rcd-title-row { display: flex; align-items: center; gap: 0.625rem; }
.rcd-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--vp-c-text-3); transition: background 0.3s, box-shadow 0.3s; flex-shrink: 0;
}
.rcd-dot.running { background: #8b5cf6; box-shadow: 0 0 8px #8b5cf6; animation: rcd-pulse 1.5s infinite; }
.rcd-dot.done { background: #10b981; box-shadow: 0 0 8px #10b981; }
@keyframes rcd-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.rcd-title { font-size: 1rem; font-weight: 600; color: var(--vp-c-text-1); }
.rcd-badge {
  font-size: 0.6875rem; padding: 2px 8px; border-radius: 10px;
  background: rgba(139, 92, 246, 0.1); color: #7c3aed; font-weight: 500;
}

.rcd-actions { display: flex; gap: 0.5rem; }
.rcd-btn-primary {
  background: var(--vp-c-brand-1); color: #fff; border: none;
  padding: 0.375rem 0.875rem; border-radius: 6px; font-size: 0.875rem;
  font-weight: 500; cursor: pointer; transition: opacity 0.2s;
}
.rcd-btn-primary:hover { opacity: 0.9; }
.rcd-btn-primary.active { background: #0f766e; }
.rcd-btn-ghost {
  background: transparent; border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem; border-radius: 6px; font-size: 0.875rem;
  cursor: pointer; color: var(--vp-c-text-1);
}
.rcd-btn-ghost:hover { background: var(--vp-c-bg); }

.rcd-progress { height: 3px; background: var(--vp-c-divider); border-radius: 2px; overflow: hidden; }
.rcd-progress-fill { height: 100%; background: var(--vp-c-brand-1); transition: width 0.35s ease; }

/* 迭代轮次行 */
.rcd-rounds-row {
  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
}
.rcd-round-label { font-size: 0.75rem; color: var(--vp-c-text-3); font-weight: 600; }
.rcd-round-dots { display: flex; gap: 0.625rem; }
.rcd-round-dot {
  display: flex; align-items: center; gap: 0.375rem; padding: 3px 10px;
  border-radius: 20px; border: 1.5px solid var(--vp-c-divider);
  font-size: 0.75rem; font-weight: 600; color: var(--vp-c-text-3);
  background: var(--vp-c-bg); transition: all 0.3s;
}
.rcd-round-dot.active { border-color: #8b5cf6; color: #8b5cf6; background: rgba(139,92,246,0.06); }
.rcd-round-dot.done { border-color: #10b981; color: #059669; background: rgba(16,185,129,0.06); }
.rcd-round-dot.failed { border-color: #f59e0b; color: #d97706; background: rgba(245,158,11,0.06); }
.rcd-round-num { font-size: 0.75rem; }
.rcd-round-score { font-size: 0.6875rem; opacity: 0.8; }
.rcd-state-label {
  font-size: 0.8125rem; font-weight: 500; color: var(--vp-c-text-2);
  margin-left: auto;
}

/* 双栏主体 */
.rcd-body {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; min-height: 380px;
}

.rcd-gen-panel, .rcd-critic-panel {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;
}

.rcd-panel-header {
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
  display: flex; align-items: center; gap: 0.5rem;
}
.rcd-role-tag {
  font-size: 0.6875rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;
}
.rcd-role-tag.generator { background: rgba(139,92,246,0.12); color: #7c3aed; }
.rcd-role-tag.critic { background: rgba(245,158,11,0.12); color: #d97706; }
.rcd-iter-tag, .rcd-panel-sub { font-size: 0.75rem; color: var(--vp-c-text-2); font-weight: 400; }

.rcd-empty {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  flex: 1; color: var(--vp-c-text-3); font-size: 0.875rem; padding: 1rem;
}

/* Generator 面板 */
.rcd-gen-content { display: flex; flex-direction: column; gap: 0.625rem; padding: 0.75rem; flex: 1; }
.rcd-gen-phase-row { display: flex; align-items: center; gap: 0.5rem; }
.rcd-phase-badge {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.75rem; padding: 3px 10px; border-radius: 20px; font-weight: 500;
}
.rcd-phase-badge.generating { background: rgba(139,92,246,0.1); color: #7c3aed; }
.rcd-phase-badge.evaluating { background: rgba(245,158,11,0.1); color: #d97706; }
.rcd-phase-badge.done { background: rgba(16,185,129,0.1); color: #059669; }

.rcd-output-box {
  border: 1px solid var(--vp-c-divider); border-radius: 6px; overflow: hidden;
  border-left: 3px solid #8b5cf6;
}
.rcd-output-box.improved { border-left-color: #10b981; }
.rcd-output-label {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--vp-c-text-3);
  padding: 0.3rem 0.75rem; background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex; align-items: center; gap: 0.375rem;
}
.rcd-improved-tag {
  font-size: 0.5625rem; padding: 1px 5px; border-radius: 3px;
  background: rgba(16,185,129,0.15); color: #059669;
}
.rcd-output-text {
  font-size: 0.875rem; line-height: 1.65; color: var(--vp-c-text-1);
  padding: 0.75rem; font-family: var(--vp-font-family-mono);
  white-space: pre-wrap; word-break: break-word;
}

.rcd-task-box {
  border: 1px solid var(--vp-c-divider); border-radius: 6px; overflow: hidden; margin-top: auto;
}
.rcd-task-label {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--vp-c-text-3);
  padding: 0.3rem 0.75rem; background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.rcd-task-text { font-size: 0.8125rem; color: var(--vp-c-text-2); padding: 0.5rem 0.75rem; line-height: 1.5; }

/* Critic 面板 */
.rcd-critic-content { display: flex; flex-direction: column; gap: 0.625rem; padding: 0.75rem; flex: 1; }
.rcd-score-section { display: flex; align-items: flex-end; gap: 0.375rem; }
.rcd-score-num { font-size: 2.5rem; font-weight: 700; line-height: 1; transition: color 0.5s; }
.rcd-score-info { display: flex; flex-direction: column; gap: 0.25rem; padding-bottom: 4px; }
.rcd-score-label { font-size: 0.875rem; color: var(--vp-c-text-3); }
.rcd-pass-badge {
  font-size: 0.6875rem; padding: 2px 8px; border-radius: 4px; font-weight: 600;
}
.rcd-pass-badge.passed { background: rgba(16,185,129,0.15); color: #059669; }
.rcd-pass-badge.failed { background: rgba(239,68,68,0.12); color: #dc2626; }

.rcd-score-bar-wrap {
  height: 6px; background: var(--vp-c-divider); border-radius: 3px; overflow: hidden;
}
.rcd-score-bar { height: 100%; border-radius: 3px; transition: width 0.6s ease, background 0.5s; }

.rcd-feedback-box, .rcd-suggestions-box {
  border: 1px solid var(--vp-c-divider); border-radius: 6px; overflow: hidden;
}
.rcd-section-label {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--vp-c-text-3);
  padding: 0.3rem 0.75rem; background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.rcd-feedback-text { font-size: 0.8125rem; color: var(--vp-c-text-1); padding: 0.625rem 0.75rem; line-height: 1.55; }
.rcd-suggestion-item {
  display: flex; gap: 0.5rem; padding: 0.4rem 0.75rem; align-items: flex-start;
  border-bottom: 1px solid var(--vp-c-divider);
}
.rcd-suggestion-item:last-child { border-bottom: none; }
.rcd-suggestion-num {
  flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%;
  background: rgba(245,158,11,0.15); color: #d97706;
  font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
  margin-top: 2px;
}
.rcd-suggestion-text { font-size: 0.8125rem; color: var(--vp-c-text-1); line-height: 1.5; }
.rcd-passed-note {
  font-size: 0.8125rem; color: #059669; background: rgba(16,185,129,0.06);
  border: 1px solid rgba(16,185,129,0.2); border-radius: 6px; padding: 0.625rem 0.75rem;
}
.rcd-stop-hint {
  font-size: 0.75rem; color: var(--vp-c-text-3); margin-top: auto;
  padding: 0.375rem 0.5rem; border-radius: 4px; background: var(--vp-c-bg-soft);
}

.rcd-log-box {
  padding: 0.625rem 0.875rem; border-top: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
}
.rcd-log-header {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--vp-c-text-3); margin-bottom: 0.3rem;
}
.rcd-log-line { font-size: 0.75rem; font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); line-height: 1.5; padding: 1px 0; }
.rcd-log-empty { font-size: 0.75rem; color: var(--vp-c-text-3); }

.rcd-spinner { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(139,92,246,0.2); border-top-color: #8b5cf6; animation: rcd-spin 0.8s linear infinite; }
.rcd-spinner-sm { display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid rgba(139,92,246,0.2); border-top-color: #8b5cf6; animation: rcd-spin 0.8s linear infinite; }
@keyframes rcd-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .rcd-body { grid-template-columns: 1fr; }
}
</style>
