<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SecurityScenario, SecurityRule } from './types'

type SecurityStageKey = 'risk' | 'permission' | 'approval' | 'runtime'
type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected'

interface SecurityStageMeta {
  id: SecurityStageKey
  label: '风险分级' | '最小权限' | '确认机制' | '运行时校验'
  summary: string
  risk: string
}

const props = defineProps<{ scenarios: SecurityScenario[]; rules: SecurityRule[] }>()

const currentIdx = ref(0)
const isRunning = ref(false)
const verdict = ref<'allow' | 'block' | null>(null)
const matchedRules = ref<string[]>([])
const approvalStatus = ref<ApprovalStatus>('none')
const activeStage = ref<SecurityStageKey>('risk')
let timer: ReturnType<typeof setTimeout> | null = null

const stages: SecurityStageMeta[] = [
  {
    id: 'risk',
    label: '风险分级',
    summary: '先判断这次动作做错后的破坏半径，再决定后续要多严格地收口。',
    risk: '如果一上来只看工具名而不看后果，危险写操作和普通写操作会被混在一起。'
  },
  {
    id: 'permission',
    label: '最小权限',
    summary: '默认先收紧角色权限，不让模型一开始就看到和调用所有能力。',
    risk: '默认给满权限最省事，但一旦上下文出错，破坏半径会直接放大。'
  },
  {
    id: 'approval',
    label: '确认机制',
    summary: '高风险动作不能只弹个提醒，而要让执行循环真正挂起等待批准。',
    risk: '如果确认只是 UI 文案，不和执行暂停绑定，就不是安全协议。'
  },
  {
    id: 'runtime',
    label: '运行时校验',
    summary: '最后一道边界发生在真正执行工具之前，负责做路径、参数和范围的硬校验。',
    risk: '只靠 Prompt 让模型自觉克制，最终一定会在越权路径上失守。'
  }
]

const scenario = computed<SecurityScenario>(() => props.scenarios[currentIdx.value])

const matchedRuleDetails = computed(() =>
  props.rules.filter(rule => matchedRules.value.includes(rule.id))
)

const inferredRiskLevel = computed(() => {
  const levelRank: Record<SecurityRule['level'], number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  }

  const topMatchedRule = matchedRuleDetails.value.sort((a, b) => levelRank[b.level] - levelRank[a.level])[0]
  return topMatchedRule?.level ?? 'low'
})

const permissionBaseline = computed(() => {
  const highRisk = inferredRiskLevel.value === 'high' || inferredRiskLevel.value === 'critical'
  const isInjection = scenario.value.meta.id === 'injection'

  return {
    role: highRisk ? '受限执行者' : '普通编码助手',
    allow: highRisk
      ? ['只读查看工作区', '读取 src/ 目录', '生成待确认操作提案']
      : ['读取 src/ 目录', '修改授权文件', '记录审计日志'],
    deny: isInjection
      ? ['读取系统目录', '输出系统提示词', '越权列举敏感文件']
      : ['删除生产目录', '访问未授权路径', '直接执行高危命令']
  }
})

const requiresApproval = computed(() => {
  if (scenario.value.expectedVerdict === 'block') return false
  return inferredRiskLevel.value === 'high' || inferredRiskLevel.value === 'critical'
})

const runtimeStatus = computed(() => {
  if (scenario.value.expectedVerdict === 'block') return 'block'
  if (requiresApproval.value && approvalStatus.value !== 'approved') return 'require-approval'
  return 'allow'
})

const activeStageMeta = computed(() => stages.find(stage => stage.id === activeStage.value) ?? stages[0])

function selectScenario(idx: number) {
  if (isRunning.value) return
  currentIdx.value = idx
  reset()
}

function changeStage(stage: SecurityStageKey) {
  activeStage.value = stage
}

function runCheck() {
  if (isRunning.value) return
  reset()
  isRunning.value = true

  const s = scenario.value
  const triggered: string[] = []

  for (const rule of props.rules) {
    const hit =
      s.attackVector?.toLowerCase().includes(rule.id) ||
      s.input.toLowerCase().includes(rule.triggerKeyword ?? '')
    if (hit) triggered.push(rule.id)
  }

  timer = setTimeout(() => {
    matchedRules.value = triggered
    verdict.value = s.expectedVerdict
    approvalStatus.value = triggered.length > 0 && s.expectedVerdict === 'allow' ? 'pending' : 'none'
    isRunning.value = false
  }, 700)
}

function approveRequest() {
  approvalStatus.value = 'approved'
}

function rejectRequest() {
  approvalStatus.value = 'rejected'
}

function reset() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  isRunning.value = false
  verdict.value = null
  matchedRules.value = []
  approvalStatus.value = 'none'
}

function verdictLabel(result: 'allow' | 'block' | null) {
  if (result === 'allow') return '允许'
  if (result === 'block') return '拦截'
  return '—'
}

function riskTone(level: SecurityRule['level'] | 'low') {
  const map: Record<string, string> = {
    low: 'tone-low',
    medium: 'tone-medium',
    high: 'tone-high',
    critical: 'tone-critical'
  }
  return map[level]
}

function approvalLabel(status: ApprovalStatus) {
  const labels: Record<ApprovalStatus, string> = {
    none: '无需确认',
    pending: '等待批准',
    approved: '已批准',
    rejected: '已拒绝'
  }
  return labels[status]
}
</script>

<template>
  <div class="sbd-root">
    <div class="sbd-header">
      <div class="sbd-title-row">
        <span class="sbd-title">安全协议状态机</span>
        <span class="sbd-badge">Ch31 · Security</span>
      </div>
      <div class="sbd-actions">
        <button class="sbd-btn-primary" :disabled="isRunning" @click="runCheck">
          {{ isRunning ? '检查中…' : '执行安全检查' }}
        </button>
        <button class="sbd-btn-ghost" @click="reset">重置</button>
      </div>
    </div>

    <div class="sbd-stage-tabs" role="tablist" aria-label="安全协议阶段切换">
      <button
        v-for="stage in stages"
        :key="stage.id"
        type="button"
        class="sbd-stage-tab"
        :class="{ active: activeStage === stage.id }"
        :aria-selected="activeStage === stage.id"
        @click="changeStage(stage.id)"
      >
        <span>{{ stage.label }}</span>
      </button>
    </div>

    <div class="sbd-tabs">
      <button
        v-for="(s, i) in scenarios"
        :key="s.meta.id"
        class="sbd-tab"
        :class="{ active: currentIdx === i, [s.meta.tone]: true }"
        @click="selectScenario(i)"
      >
        {{ s.meta.label }}
      </button>
    </div>

    <div class="sbd-body">
      <div class="sbd-panel">
        <div class="sbd-panel-header">当前请求</div>
        <div class="sbd-input-box">{{ scenario.input }}</div>
        <div v-if="scenario.attackVector" class="sbd-attack-label">
          攻击向量: <code>{{ scenario.attackVector }}</code>
        </div>
      </div>

      <Transition name="sbd-stage-fade" mode="out-in">
        <div :key="activeStage" class="sbd-panel sbd-protocol-panel">
          <div class="sbd-panel-header">{{ activeStageMeta.label }}</div>

          <div v-if="activeStage === 'risk'" class="sbd-stage-card">
            <div class="sbd-risk-pill" :class="riskTone(inferredRiskLevel)">
              风险等级：{{ inferredRiskLevel.toUpperCase() }}
            </div>
            <p>{{ activeStageMeta.summary }}</p>
            <div class="sbd-rule-list">
              <div
                v-for="rule in rules"
                :key="rule.id"
                class="sbd-rule"
                :class="{
                  triggered: matchedRules.includes(rule.id),
                  scanning: isRunning
                }"
              >
                <div class="sbd-rule-top">
                  <span class="sbd-rule-name">{{ rule.name }}</span>
                  <span class="sbd-rule-level" :class="rule.level">{{ rule.level }}</span>
                </div>
                <div class="sbd-rule-desc">{{ rule.description }}</div>
              </div>
            </div>
          </div>

          <div v-else-if="activeStage === 'permission'" class="sbd-stage-card">
            <div class="sbd-permission-role">{{ permissionBaseline.role }}</div>
            <div class="sbd-permission-grid">
              <div class="sbd-permission-block">
                <h5>默认允许</h5>
                <ul>
                  <li v-for="item in permissionBaseline.allow" :key="item">{{ item }}</li>
                </ul>
              </div>
              <div class="sbd-permission-block deny">
                <h5>默认禁止</h5>
                <ul>
                  <li v-for="item in permissionBaseline.deny" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div v-else-if="activeStage === 'approval'" class="sbd-stage-card">
            <div class="sbd-approval-pill" :class="approvalStatus">
              {{ requiresApproval ? '需要人工确认' : '无需人工确认' }}
            </div>
            <p>{{ activeStageMeta.summary }}</p>
            <div class="sbd-approval-status">
              当前状态：<strong>{{ approvalLabel(approvalStatus) }}</strong>
            </div>
            <div v-if="requiresApproval" class="sbd-approval-actions">
              <button class="sbd-btn-primary" @click="approveRequest">批准执行</button>
              <button class="sbd-btn-ghost" @click="rejectRequest">拒绝执行</button>
            </div>
          </div>

          <div v-else class="sbd-stage-card">
            <div class="sbd-runtime-line">
              <span>规则命中</span>
              <strong>{{ matchedRules.length > 0 ? matchedRules.join(', ') : '无' }}</strong>
            </div>
            <div class="sbd-runtime-line">
              <span>权限基线</span>
              <strong>{{ permissionBaseline.role }}</strong>
            </div>
            <div class="sbd-runtime-line">
              <span>确认状态</span>
              <strong>{{ approvalLabel(approvalStatus) }}</strong>
            </div>
            <div class="sbd-runtime-line">
              <span>最终执行状态</span>
              <strong>{{ runtimeStatus }}</strong>
            </div>
            <div class="sbd-verdict" :class="runtimeStatus === 'allow' ? 'allow' : 'block'">
              <div class="sbd-verdict-label">{{ verdictLabel(verdict) }}</div>
              <div class="sbd-verdict-reason">{{ scenario.reason }}</div>
            </div>
          </div>
        </div>
      </Transition>

      <div class="sbd-panel">
        <div class="sbd-panel-header">当前阶段说明</div>
        <div class="sbd-side-block">
          <h5>{{ activeStageMeta.label }}</h5>
          <p>{{ activeStageMeta.summary }}</p>
        </div>
        <div class="sbd-side-block risk">
          <h5>最容易犯的错</h5>
          <p>{{ activeStageMeta.risk }}</p>
        </div>
        <div v-if="scenario.recommendation" class="sbd-side-block">
          <h5>建议</h5>
          <p>{{ scenario.recommendation }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sbd-root {
  background:
    radial-gradient(circle at top left, rgba(239, 68, 68, 0.08), transparent 28%),
    var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sbd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.sbd-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.sbd-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sbd-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-weight: 500;
}

.sbd-actions {
  display: flex;
  gap: 0.5rem;
}

.sbd-btn-primary {
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.sbd-btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.sbd-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.sbd-stage-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.sbd-stage-tab {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.sbd-stage-tab:hover {
  transform: translateY(-1px);
  border-color: #ef4444;
}

.sbd-stage-tab.active {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
  color: var(--vp-c-text-1);
}

.sbd-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sbd-tab {
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8125rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.sbd-tab.active.negative {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}

.sbd-tab.active.positive {
  background: #10b981;
  color: #fff;
  border-color: #10b981;
}

.sbd-tab.active.neutral {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.sbd-body {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 0.75rem;
}

.sbd-panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.sbd-panel-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.sbd-input-box {
  font-size: 0.8125rem;
  color: var(--vp-c-text-1);
  line-height: 1.6;
  padding: 0.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
}

.sbd-attack-label {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
}

.sbd-attack-label code {
  font-size: 0.6875rem;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  padding: 1px 4px;
  border-radius: 3px;
}

.sbd-protocol-panel {
  min-height: 20rem;
}

.sbd-stage-card {
  display: grid;
  gap: 0.75rem;
}

.sbd-risk-pill,
.sbd-approval-pill,
.sbd-permission-role {
  display: inline-flex;
  align-self: start;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.tone-low {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.tone-medium {
  background: rgba(13, 148, 136, 0.1);
  color: #0d9488;
}

.tone-high {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.tone-critical {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.sbd-rule-list {
  display: grid;
  gap: 0.5rem;
}

.sbd-rule {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.5rem 0.625rem;
  transition: all 0.3s;
}

.sbd-rule.scanning {
  animation: scan-pulse 0.8s ease-in-out infinite alternate;
}

.sbd-rule.triggered {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.04);
}

@keyframes scan-pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

.sbd-rule-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.sbd-rule-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sbd-rule-level {
  font-size: 0.625rem;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 700;
}

.sbd-rule-level.critical {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.sbd-rule-level.high {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.sbd-rule-level.medium {
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
}

.sbd-rule-desc,
.sbd-stage-card p,
.sbd-side-block p {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
}

.sbd-permission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.sbd-permission-block {
  padding: 0.7rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.18);
}

.sbd-permission-block.deny {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.18);
}

.sbd-permission-block h5,
.sbd-side-block h5 {
  margin: 0 0 0.35rem;
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
}

.sbd-permission-block ul {
  margin: 0;
  padding-left: 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  line-height: 1.6;
}

.sbd-approval-pill.pending {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.sbd-approval-pill.approved {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.sbd-approval-pill.rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.sbd-approval-pill.none {
  background: rgba(13, 148, 136, 0.1);
  color: #0d9488;
}

.sbd-approval-status {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.sbd-approval-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sbd-runtime-line {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}

.sbd-runtime-line strong {
  color: var(--vp-c-text-1);
}

.sbd-verdict {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid;
}

.sbd-verdict.allow {
  background: rgba(16, 185, 129, 0.06);
  border-color: #10b981;
}

.sbd-verdict.block {
  background: rgba(239, 68, 68, 0.06);
  border-color: #ef4444;
}

.sbd-verdict-label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.sbd-verdict-reason {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.sbd-side-block {
  padding: 0.75rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 88%, white);
  border: 1px solid var(--vp-c-divider);
}

.sbd-side-block.risk {
  background: rgba(239, 68, 68, 0.05);
}

.sbd-stage-fade-enter-active,
.sbd-stage-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.sbd-stage-fade-enter-from,
.sbd-stage-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 960px) {
  .sbd-stage-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sbd-body {
    grid-template-columns: 1fr;
  }

  .sbd-permission-grid {
    grid-template-columns: 1fr;
  }
}
</style>
