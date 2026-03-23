<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

type MessageRole = 'user' | 'assistant' | 'system'

interface Message {
  role: MessageRole
  content: string
  tokens: number
}

const props = withDefaults(defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>(), {
  autoPlay: false,
  playSpeed: 1500,
})

const TOKEN_BUDGET = 4000
const TRUNCATE_TO = 2000

const messages = ref<Message[]>([
  { role: 'system', content: '你是一个有帮助的助手', tokens: 12 }
])

const currentTurn = ref(0)
const isRunning = ref(false)
const showTruncation = ref(false)
const executionLog = ref<{ time: string; msg: string; type: 'info' | 'warning' | 'success' }[]>([])

let timer: ReturnType<typeof setInterval> | null = null

const conversationTurns = [
  { user: '你好，请介绍一下你自己', userTokens: 15, assistant: '你好！我是一个 AI 助手，可以回答问题、提供建议...', assistantTokens: 45 },
  { user: '你能帮我写代码吗？', userTokens: 12, assistant: '当然可以！我可以帮你编写各种编程语言的代码...', assistantTokens: 50 },
  { user: '那帮我写一个快速排序算法', userTokens: 18, assistant: '好的，这是一个 TypeScript 实现的快速排序：\nfunction quickSort(arr: number[])...', assistantTokens: 120 },
  { user: '能解释一下时间复杂度吗？', userTokens: 16, assistant: '快速排序的平均时间复杂度是 O(n log n)，最坏情况是 O(n²)...', assistantTokens: 85 },
  { user: '如何优化这个算法？', userTokens: 14, assistant: '可以通过以下方式优化：1. 三数取中选择枢轴 2. 小数组用插入排序...', assistantTokens: 95 },
]

const totalTokens = computed(() => {
  return messages.value.reduce((sum, msg) => sum + msg.tokens, 0)
})

const isOverBudget = computed(() => totalTokens.value > TOKEN_BUDGET)

const truncatedMessages = computed(() => {
  if (!showTruncation.value) return messages.value

  const systemMsg = messages.value[0]
  const conversationMsgs = messages.value.slice(1)

  let tokensUsed = systemMsg.tokens
  const kept: Message[] = [systemMsg]

  for (let i = conversationMsgs.length - 1; i >= 0; i--) {
    const msg = conversationMsgs[i]
    if (tokensUsed + msg.tokens <= TRUNCATE_TO) {
      kept.unshift(msg)
      tokensUsed += msg.tokens
    } else {
      break
    }
  }

  return kept
})

function addLog(msg: string, type: 'info' | 'warning' | 'success') {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  executionLog.value.unshift({ time, msg, type })
  if (executionLog.value.length > 10) executionLog.value.pop()
}

function nextTurn() {
  if (currentTurn.value >= conversationTurns.length) {
    stopDemo()
    addLog('对话完成', 'success')
    return
  }

  const turn = conversationTurns[currentTurn.value]

  messages.value.push({
    role: 'user',
    content: turn.user,
    tokens: turn.userTokens
  })

  addLog(`用户消息: ${turn.userTokens} tokens`, 'info')

  setTimeout(() => {
    messages.value.push({
      role: 'assistant',
      content: turn.assistant,
      tokens: turn.assistantTokens
    })

    addLog(`助手回复: ${turn.assistantTokens} tokens`, 'info')

    if (totalTokens.value > TOKEN_BUDGET) {
      addLog(`⚠️ 超出预算！当前 ${totalTokens.value} / ${TOKEN_BUDGET} tokens`, 'warning')
    }

    currentTurn.value++
  }, props.playSpeed * 0.4)
}

function startDemo() {
  if (isRunning.value) return

  isRunning.value = true
  messages.value = [{ role: 'system', content: '你是一个有帮助的助手', tokens: 12 }]
  currentTurn.value = 0
  showTruncation.value = false
  executionLog.value = []

  addLog('开始多轮对话...', 'info')
  timer = setInterval(nextTurn, props.playSpeed)
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
  messages.value = [{ role: 'system', content: '你是一个有帮助的助手', tokens: 12 }]
  currentTurn.value = 0
  showTruncation.value = false
  executionLog.value = []
}

function applyTruncation() {
  if (totalTokens.value <= TOKEN_BUDGET) {
    addLog('无需截断，tokens 在预算内', 'info')
    return
  }

  showTruncation.value = true
  addLog(`应用滑动窗口截断: ${totalTokens.value} → ${truncatedMessages.value.reduce((s, m) => s + m.tokens, 0)} tokens`, 'success')
}

onUnmounted(() => stopDemo())

if (props.autoPlay) startDemo()
</script>

<template>
  <div class="cwd-root">
    <div class="cwd-header">
      <div class="cwd-title-row">
        <span class="cwd-indicator" :class="{ running: isRunning }" />
        <span class="cwd-title">上下文窗口管理演示</span>
        <span class="cwd-badge">P2 · Context Window</span>
      </div>
      <div class="cwd-actions">
        <button class="cwd-btn-primary" @click="isRunning ? stopDemo() : startDemo()" :disabled="isRunning && currentTurn >= conversationTurns.length">
          {{ isRunning ? '暂停' : '开始对话' }}
        </button>
        <button class="cwd-btn-secondary" @click="applyTruncation" :disabled="!isOverBudget || showTruncation">
          应用截断
        </button>
        <button class="cwd-btn-ghost" @click="resetDemo">重置</button>
      </div>
    </div>

    <div class="cwd-stats">
      <div class="cwd-stat-item">
        <div class="cwd-stat-label">当前轮次</div>
        <div class="cwd-stat-value">{{ currentTurn }} / {{ conversationTurns.length }}</div>
      </div>
      <div class="cwd-stat-item">
        <div class="cwd-stat-label">总 Tokens</div>
        <div class="cwd-stat-value" :class="{ warning: isOverBudget }">{{ totalTokens }}</div>
      </div>
      <div class="cwd-stat-item">
        <div class="cwd-stat-label">预算</div>
        <div class="cwd-stat-value">{{ TOKEN_BUDGET }}</div>
      </div>
      <div class="cwd-stat-item">
        <div class="cwd-stat-label">状态</div>
        <div class="cwd-stat-value" :class="isOverBudget ? 'status-over' : 'status-ok'">
          {{ isOverBudget ? '超出预算' : '正常' }}
        </div>
      </div>
    </div>

    <div class="cwd-body">
      <div class="cwd-messages">
        <div class="cwd-messages-header">
          <span>消息列表</span>
          <span v-if="showTruncation" class="cwd-truncation-badge">已截断</span>
        </div>
        <div class="cwd-messages-content">
          <div
            v-for="(msg, idx) in (showTruncation ? truncatedMessages : messages)"
            :key="idx"
            class="cwd-message"
            :class="msg.role"
          >
            <div class="cwd-message-header">
              <span class="cwd-message-role">{{ msg.role }}</span>
              <span class="cwd-message-tokens">{{ msg.tokens }} tokens</span>
            </div>
            <div class="cwd-message-content">{{ msg.content }}</div>
          </div>
          <div v-if="messages.length === 1" class="cwd-empty">等待对话开始...</div>
        </div>
      </div>

      <aside class="cwd-sidebar">
        <section class="cwd-block">
          <div class="cwd-block-header">Token 预算</div>
          <div class="cwd-budget-bar">
            <div
              class="cwd-budget-fill"
              :class="{ warning: isOverBudget }"
              :style="{ width: `${Math.min((totalTokens / TOKEN_BUDGET) * 100, 100)}%` }"
            />
          </div>
          <div class="cwd-budget-text">
            {{ totalTokens }} / {{ TOKEN_BUDGET }} tokens
            <span v-if="isOverBudget" class="cwd-over-text">(超出 {{ totalTokens - TOKEN_BUDGET }})</span>
          </div>
        </section>

        <section class="cwd-block">
          <div class="cwd-block-header">截断策略</div>
          <div class="cwd-strategy">
            <div class="cwd-strategy-item">
              <div class="cwd-strategy-label">保留系统消息</div>
              <div class="cwd-strategy-desc">始终保留 system prompt</div>
            </div>
            <div class="cwd-strategy-item">
              <div class="cwd-strategy-label">滑动窗口</div>
              <div class="cwd-strategy-desc">保留最近的对话，截断到 {{ TRUNCATE_TO }} tokens</div>
            </div>
          </div>
        </section>

        <section class="cwd-block cwd-log">
          <div class="cwd-block-header">执行日志</div>
          <div class="cwd-log-view">
            <div v-for="(log, i) in executionLog" :key="i" class="cwd-log-line" :class="log.type">
              <span class="cwd-log-ts">{{ log.time }}</span>
              {{ log.msg }}
            </div>
            <div v-if="executionLog.length === 0" class="cwd-empty">等待执行...</div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cwd-root {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
}

.cwd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.cwd-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cwd-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.cwd-indicator.running {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.cwd-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.cwd-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.cwd-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cwd-btn-primary,
.cwd-btn-secondary {
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

.cwd-btn-secondary {
  background: #8b5cf6;
}

.cwd-btn-primary:hover:not(:disabled),
.cwd-btn-secondary:hover:not(:disabled) {
  opacity: 0.9;
}

.cwd-btn-primary:disabled,
.cwd-btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cwd-btn-ghost {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.cwd-btn-ghost:hover {
  background: var(--vp-c-bg-soft);
}

.cwd-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.cwd-stat-item {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
}

.cwd-stat-label {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.25rem;
}

.cwd-stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.cwd-stat-value.warning {
  color: #f59e0b;
}

.cwd-stat-value.status-ok {
  color: #10b981;
}

.cwd-stat-value.status-over {
  color: #ef4444;
}

.cwd-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
}

.cwd-messages {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cwd-messages-header {
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cwd-truncation-badge {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  font-weight: 500;
}

.cwd-messages-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
}

.cwd-message {
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid;
}

.cwd-message.system {
  background: rgba(59, 130, 246, 0.05);
  border-left-color: #3b82f6;
}

.cwd-message.user {
  background: rgba(16, 185, 129, 0.05);
  border-left-color: #10b981;
}

.cwd-message.assistant {
  background: rgba(139, 92, 246, 0.05);
  border-left-color: #8b5cf6;
}

.cwd-message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.cwd-message-role {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cwd-message.system .cwd-message-role { color: #3b82f6; }
.cwd-message.user .cwd-message-role { color: #10b981; }
.cwd-message.assistant .cwd-message-role { color: #8b5cf6; }

.cwd-message-tokens {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.cwd-message-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.cwd-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cwd-block {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cwd-block-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.cwd-budget-bar {
  height: 8px;
  background: var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
}

.cwd-budget-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.3s, background 0.3s;
}

.cwd-budget-fill.warning {
  background: #f59e0b;
}

.cwd-budget-text {
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.cwd-over-text {
  color: #ef4444;
  font-weight: 600;
}

.cwd-strategy {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cwd-strategy-item {
  padding: 0.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
}

.cwd-strategy-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.25rem;
}

.cwd-strategy-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.cwd-log {
  flex: 1;
}

.cwd-log-view {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.cwd-log-line {
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.cwd-log-line.info { color: var(--vp-c-brand-1); }
.cwd-log-line.success { color: #10b981; }
.cwd-log-line.warning { color: #f59e0b; }

.cwd-log-ts {
  color: var(--vp-c-text-3);
  margin-right: 0.4rem;
}

.cwd-empty {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.4rem;
}

@media (max-width: 768px) {
  .cwd-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .cwd-body {
    grid-template-columns: 1fr;
  }

  .cwd-actions {
    width: 100%;
  }

  .cwd-btn-primary,
  .cwd-btn-secondary,
  .cwd-btn-ghost {
    flex: 1;
  }
}
</style>
