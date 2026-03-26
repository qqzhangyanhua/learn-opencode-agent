<template>
  <div class="ad-root">
    <div class="ad-header">{{ titleText }}</div>
    <div class="ad-body">
      <!-- 左：任务输入选择 -->
      <div class="ad-tasks">
        <div class="ad-tasks-title">选择任务类型</div>
        <div
          v-for="(t, i) in taskTypes"
          :key="i"
          class="ad-task-btn"
          :class="{ active: selectedTask === i, disabled: running }"
          @click="!running && selectTask(i)"
        >
          <span class="ad-task-icon">{{ t.icon }}</span>
          <span class="ad-task-label">{{ t.label }}</span>
        </div>
      </div>

      <!-- 中：Sisyphus -->
      <div class="ad-center">
        <div class="ad-sisyphus" :class="{ thinking: phase === 'think' }">
          <div class="ad-sis-icon">S</div>
          <div class="ad-sis-label">{{ orchestratorName }}</div>
          <div class="ad-sis-thought" v-if="thought">{{ thought }}</div>
        </div>
        <div class="ad-arrow" v-if="phase === 'dispatch'">
          <svg width="60" height="20" viewBox="0 0 60 20">
            <line x1="0" y1="10" x2="50" y2="10" stroke="var(--vp-c-brand-1)" stroke-width="2"/>
            <polygon points="50,5 60,10 50,15" fill="var(--vp-c-brand-1)"/>
          </svg>
        </div>
      </div>

      <!-- 右：Agent 列表 -->
      <div class="ad-agents">
        <div
          v-for="(a, i) in agents"
          :key="i"
          class="ad-agent"
          :class="{
            active: activeAgent === i && phase === 'dispatch',
            dim: phase === 'dispatch' && activeAgent !== i
          }"
        >
          <span class="ad-agent-name">{{ a.name }}</span>
          <span class="ad-agent-role">{{ a.role }}</span>
        </div>
      </div>
    </div>

    <div class="ad-log" v-if="logText">{{ logText }}</div>

    <div class="ad-footer">
      <button class="btn" @click="restart">重新播放</button>
      <span class="ad-status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface DispatchTaskType {
  icon: string
  label: string
  targetAgent: number
  thought: string
  log: string
}

interface DispatchAgent {
  name: string
  role: string
}

const defaultTaskTypes: DispatchTaskType[] = [
  { icon: 'S', label: '代码搜索/探索', targetAgent: 4, thought: '搜索任务 → Explore 更快', log: '委托 Explore：grep/glob，不写文件' },
  { icon: 'W', label: '网络搜索/文档', targetAgent: 3, thought: '需要上网 → Librarian 负责', log: '委托 Librarian：联网查询文档' },
  { icon: 'C', label: '复杂编码实现', targetAgent: 1, thought: '深度编码 → Hephaestus 专注干', log: '委托 Hephaestus：自主深度实现' },
  { icon: 'A', label: '架构分析建议', targetAgent: 2, thought: '只读分析 → Oracle 更客观', log: '委托 Oracle：只读顾问，不动文件' },
  { icon: 'I', label: '图像/PDF 理解', targetAgent: 5, thought: '多模态内容 → Multimodal-Looker', log: '委托 Multimodal-Looker：视觉分析' },
]

const defaultAgents: DispatchAgent[] = [
  { name: 'Sisyphus', role: '主编排器' },
  { name: 'Hephaestus', role: '深度编码' },
  { name: 'Oracle', role: '只读顾问' },
  { name: 'Librarian', role: '网络搜索' },
  { name: 'Explore', role: '代码探索' },
  { name: 'Multimodal', role: '视觉分析' },
]

const props = defineProps<{
  title?: string
  orchestratorName?: string
  taskTypes?: DispatchTaskType[]
  agents?: DispatchAgent[]
  idleStatus?: string
}>()

const titleText = computed(() => props.title ?? 'Sisyphus 任务分发决策')
const orchestratorName = computed(() => props.orchestratorName ?? 'Sisyphus')
const taskTypes = computed(() => props.taskTypes ?? defaultTaskTypes)
const agents = computed(() => props.agents ?? defaultAgents)
const idleStatus = computed(() => props.idleStatus ?? '点击左侧任务类型开始分发')

const selectedTask = ref<number | null>(null)
const activeAgent = ref<number | null>(null)
const phase = ref<'idle' | 'think' | 'dispatch'>('idle')
const thought = ref('')
const logText = ref('')
const running = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

const statusText = computed(() => {
  if (phase.value === 'idle') return idleStatus.value
  if (phase.value === 'think') return `${orchestratorName.value} 正在分析任务类型...`
  if (phase.value === 'dispatch') return `任务已委托给 ${agents.value[activeAgent.value!]?.name}`
  return ''
})

function selectTask(i: number) {
  if (timer) clearTimeout(timer)
  selectedTask.value = i
  activeAgent.value = null
  thought.value = ''
  logText.value = ''
  phase.value = 'think'
  running.value = true

  timer = setTimeout(() => {
    thought.value = taskTypes.value[i].thought
    timer = setTimeout(() => {
      phase.value = 'dispatch'
      activeAgent.value = taskTypes.value[i].targetAgent
      logText.value = taskTypes.value[i].log
      running.value = false
    }, 1000)
  }, 800)
}

function restart() {
  if (timer) clearTimeout(timer)
  selectedTask.value = null
  activeAgent.value = null
  phase.value = 'idle'
  thought.value = ''
  logText.value = ''
  running.value = false
}

onMounted(() => {
  if (taskTypes.value.length > 0) {
    timer = setTimeout(() => selectTask(0), 800)
  }
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.ad-root {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  margin: 24px 0;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}

.ad-header {
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
}

.ad-body {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Task buttons */
.ad-tasks {
  flex: 0 0 140px;
}

.ad-tasks-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.ad-task-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  margin-bottom: 6px;
  cursor: pointer;
  background: var(--vp-c-bg);
  transition: all 0.2s;
}

.ad-task-btn:hover:not(.disabled) {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.ad-task-btn.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.ad-task-btn.disabled { cursor: not-allowed; opacity: 0.6; }

.ad-task-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vp-font-family-mono);
  flex-shrink: 0;
}

.ad-task-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
  line-height: 1.3;
}

.ad-task-btn.active .ad-task-label { color: var(--vp-c-text-1); }

/* Center */
.ad-center {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ad-sisyphus {
  width: 80px;
  padding: 10px 8px;
  border-radius: 10px;
  border: 2px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  text-align: center;
  position: relative;
  transition: all 0.3s;
}

.ad-sisyphus.thinking {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent); }
}

.ad-sis-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: white;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 4px;
}

.ad-sis-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.ad-sis-thought {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #94a3b8;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  animation: fadeIn 0.3s ease;
}

.ad-sis-thought::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: #1e293b;
}

.ad-arrow {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Agents */
.ad-agents {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ad-agent {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.ad-agent.active {
  border-color: #10b981;
  background: #052e16;
  animation: agentIn 0.4s ease;
}

.ad-agent.dim { opacity: 0.35; }

@keyframes agentIn {
  from { transform: translateX(6px); opacity: 0.5; }
  to   { transform: translateX(0); opacity: 1; }
}

.ad-agent-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
}

.ad-agent.active .ad-agent-name { color: #34d399; }

.ad-agent-role {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.ad-agent.active .ad-agent-role { color: #6ee7b7; }

/* Log */
.ad-log {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: #34d399;
  animation: fadeIn 0.3s ease;
}

/* Footer */
.ad-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ad-status {
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}
.btn:hover { background: var(--vp-c-brand-1); color: white; }
</style>
