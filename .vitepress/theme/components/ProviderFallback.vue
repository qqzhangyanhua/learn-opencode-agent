<template>
  <div class="pf-root">
    <div class="pf-header">
      <div>
        <div class="pf-title">Provider 统一调用链</div>
        <p class="pf-summary">
          先记住：上层不是分别调用 Claude、GPT、Gemini，而是统一经过
          <code>Provider.getModel()</code> 拿到同一种模型接口，再继续发模。
        </p>
      </div>
      <div class="pf-badge">Ch05 · Provider</div>
    </div>

    <div class="pf-flow-card">
      <div class="pf-flow-title">统一调用主链</div>
      <div class="pf-flow-chain">
        <div
          v-for="(step, index) in flowSteps"
          :key="step.id"
          class="pf-flow-step"
          :class="{ active: activeFlowStep === step.id }"
        >
          <div class="pf-flow-kicker">0{{ index + 1 }}</div>
          <div class="pf-flow-name">{{ step.label }}</div>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </div>

    <div class="pf-main">
      <div class="pf-left">
        <div class="pf-memory-grid">
          <article class="pf-memory-card">
            <h4>谁在做统一</h4>
            <p>{{ flowStageLabel('owner') }}</p>
          </article>
          <article class="pf-memory-card">
            <h4>统一的是什么</h4>
            <p>{{ flowStageLabel('contract') }}</p>
          </article>
          <article class="pf-memory-card">
            <h4>为什么上层不用感知厂商</h4>
            <p>{{ flowStageLabel('abstraction') }}</p>
          </article>
          <article class="pf-memory-card">
            <h4>失败后怎么回退</h4>
            <p>{{ flowStageLabel('fallback') }}</p>
          </article>
        </div>

        <div class="pf-subsection">
          <div class="pf-subtitle">失败处理子场景</div>
          <p class="pf-subcopy">
            下面这段 retry 演示不是整章主角，而是统一调用链里“请求已经发出后，Provider 如何按统一规则处理失败”的一个子阶段。
          </p>
        </div>

        <div class="pf-timeline">
          <div
            v-for="(ev, i) in visibleEvents"
            :key="i"
            class="tl-ev"
            :class="[ev.kind, { entering: i === visibleEvents.length - 1 }]"
          >
            <div class="tl-dot" :class="ev.kind" />
            <div class="tl-content">
              <div class="tl-title">{{ ev.title }}</div>
              <div class="tl-desc" v-if="ev.desc">{{ ev.desc }}</div>
            </div>
            <div v-if="ev.kind === 'wait' && countdown > 0" class="tl-countdown">{{ countdown }}s</div>
            <div v-if="ev.kind === 'wait' && countdown === 0 && !retried" class="tl-countdown done">就绪</div>
          </div>
        </div>
      </div>

      <div class="pf-right">
        <div class="pf-retryable">
          <div class="rt-title">retryable() 错误分类</div>
          <div
            v-for="rule in retryRules"
            :key="rule.code"
            class="rt-row"
            :class="[rule.decision, { highlight: highlightCode === rule.code }]"
          >
            <span class="rt-code">{{ rule.code }}</span>
            <span class="rt-label">{{ rule.label }}</span>
            <span class="rt-decision" :class="rule.decision">{{ rule.decision === 'yes' ? '重试' : '不重试' }}</span>
          </div>
          <div class="rt-note">匹配当前错误 → 429</div>
        </div>

        <div class="pf-side-card">
          <div class="pf-side-title">当前链路位置</div>
          <p>
            当前演示落在
            <code>Vercel AI SDK -> Provider API</code>
            之后：请求已经发出，系统开始按统一的 retry 规则处理失败，而不是让每家厂商各写一套 session 分支。
          </p>
        </div>

        <div class="pf-side-card emphasis">
          <div class="pf-side-title">一句话记忆</div>
          <p>
            Provider 层的价值不是“多接几家模型”，而是把不同厂商的差异收口成同一条调用链，让上层永远只面向统一接口写代码。
          </p>
        </div>
      </div>
    </div>

    <div class="pf-footer">
      <button class="btn" @click="restart">重新播放</button>
      <span class="pf-status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface TlEvent {
  kind: string
  title: string
  desc: string
}

type FlowLabelKey = 'owner' | 'contract' | 'abstraction' | 'fallback'

const flowSteps = [
  {
    id: 'processor',
    label: 'processor.ts',
    description: '上层只关心当前要用哪个 providerID / modelID，不直接写厂商特化逻辑。'
  },
  {
    id: 'provider',
    label: 'Provider.getModel()',
    description: 'Provider 层负责把不同提供商收口成统一的模型获取入口。'
  },
  {
    id: 'sdk',
    label: 'Vercel AI SDK',
    description: 'SDK 继续吸收消息格式、鉴权和流式调用差异。'
  },
  {
    id: 'api',
    label: '具体 Provider API',
    description: '直到最后一层才真正落到 Anthropic、OpenAI、Google 或本地模型接口。'
  }
] as const

const activeFlowStep = ref<(typeof flowSteps)[number]['id']>('provider')

const allEvents: TlEvent[] = [
  { kind: 'request', title: '调用 #1', desc: 'processor.ts 统一发出请求，SDK 转成 Provider API 格式' },
  { kind: 'error', title: '429 Too Many Requests', desc: '具体 Provider API 返回限流响应' },
  { kind: 'classify', title: 'retryable() 检查', desc: '统一错误分类命中 429 → 限流，可重试' },
  { kind: 'wait', title: '等待 retry-after', desc: '读取响应头：retry-after = 3s' },
  { kind: 'request', title: '调用 #2', desc: '沿同一条统一调用链重试，而不是换一套上层逻辑' },
  { kind: 'success', title: '200 OK', desc: '流式响应开始，text-delta 事件发出' }
]

const retryRules = [
  { code: '429', label: '限流', decision: 'yes' },
  { code: '503', label: '服务过载', decision: 'yes' },
  { code: '408', label: '超时', decision: 'yes' },
  { code: '400', label: '参数错误', decision: 'no' },
  { code: 'ctx', label: '上下文溢出', decision: 'no' },
  { code: 'sig', label: '用户中止', decision: 'no' }
] as const

const visibleEvents = ref<TlEvent[]>([])
const countdown = ref(0)
const retried = ref(false)
const highlightCode = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

function flowStageLabel(key: FlowLabelKey) {
  const map: Record<FlowLabelKey, string> = {
    owner: 'Provider 层负责把不同厂商先收口成统一入口，SDK 再继续统一真正的调用协议。',
    contract: '统一的是模型实例、消息格式、鉴权差异和最终给 llm.ts 使用的调用接口。',
    abstraction: '因为 processor.ts / session 层只拿统一 model，不再分别写 Claude、GPT、Gemini 的 if/else 分支。',
    fallback: '请求失败后仍沿统一链路进入 retry / fallback 处理，而不是每个提供商各自补一套上层恢复逻辑。'
  }

  return map[key]
}

const statusText = computed(() => {
  if (visibleEvents.value.length === 0) return '等待开始...'
  const last = visibleEvents.value[visibleEvents.value.length - 1]
  if (last.kind === 'success') return '统一调用链已恢复，Token 流开始输出'
  if (countdown.value > 0) return `等待 ${countdown.value}s 后重试...`
  if (last.kind === 'error') return '429 Rate Limit — 检查 retry-after 响应头'
  return last.title
})

function delay(ms: number) {
  return new Promise<void>(resolve => {
    timer = setTimeout(resolve, ms)
  })
}

async function runCountdown(seconds: number) {
  countdown.value = seconds
  while (countdown.value > 0) {
    await delay(1000)
    countdown.value--
  }
}

async function run() {
  await delay(500)

  for (let i = 0; i < allEvents.length; i++) {
    const ev = allEvents[i]

    if (ev.kind === 'wait') {
      visibleEvents.value = [...visibleEvents.value, ev]
      activeFlowStep.value = 'api'
      await runCountdown(3)
      retried.value = false
      await delay(400)
    } else if (ev.kind === 'classify') {
      visibleEvents.value = [...visibleEvents.value, ev]
      activeFlowStep.value = 'provider'
      highlightCode.value = '429'
      await delay(900)
    } else if (ev.kind === 'request' && i > 0) {
      retried.value = true
      activeFlowStep.value = 'sdk'
      highlightCode.value = ''
      visibleEvents.value = [...visibleEvents.value, ev]
      await delay(700)
    } else {
      visibleEvents.value = [...visibleEvents.value, ev]
      if (ev.kind === 'request') activeFlowStep.value = 'sdk'
      if (ev.kind === 'error') activeFlowStep.value = 'api'
      if (ev.kind === 'success') activeFlowStep.value = 'provider'
      await delay(700)
    }
  }
}

function restart() {
  if (timer) clearTimeout(timer)
  visibleEvents.value = []
  countdown.value = 0
  retried.value = false
  highlightCode.value = ''
  activeFlowStep.value = 'provider'
  timer = setTimeout(() => run(), 300)
}

onMounted(() => {
  timer = setTimeout(() => run(), 700)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.pf-root {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 20px;
  margin: 24px 0;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 92%, white), var(--vp-c-bg));
  font-size: 13px;
  display: grid;
  gap: 16px;
}

.pf-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.pf-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.pf-summary {
  margin: 8px 0 0;
  max-width: 52rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.pf-summary code {
  font-family: var(--vp-font-family-mono);
}

.pf-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.pf-flow-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 95%, white);
  padding: 14px;
}

.pf-flow-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}

.pf-flow-chain {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.pf-flow-step {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.pf-flow-step.active {
  border-color: rgba(37, 99, 235, 0.45);
  background: rgba(37, 99, 235, 0.08);
  transform: translateY(-1px);
}

.pf-flow-kicker {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  margin-bottom: 4px;
}

.pf-flow-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 6px;
}

.pf-flow-step p,
.pf-memory-card p,
.pf-side-card p,
.tl-desc {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.pf-main {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 320px);
  gap: 16px;
}

.pf-left {
  display: grid;
  gap: 14px;
}

.pf-memory-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pf-memory-card,
.pf-retryable,
.pf-side-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 96%, white);
  padding: 12px;
}

.pf-memory-card h4,
.pf-side-title,
.pf-subtitle,
.rt-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.pf-subsection {
  padding: 0 2px;
}

.pf-subcopy {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.pf-timeline {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 96%, white);
  padding: 14px;
  display: flex;
  flex-direction: column;
}

.tl-ev {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0;
  position: relative;
  animation: evIn 0.3s ease;
}

@keyframes evIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

.tl-ev::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 22px;
  bottom: -8px;
  width: 2px;
  background: var(--vp-c-divider);
}

.tl-ev:last-child::before {
  display: none;
}

.tl-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 1px;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.tl-dot.request  { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.tl-dot.error    { border-color: #ef4444; background: #fee2e2; }
.tl-dot.classify { border-color: #f59e0b; background: #fef3c7; }
.tl-dot.wait     { border-color: #6b7280; background: #374151; }
.tl-dot.success  { border-color: #10b981; background: #d1fae5; }

.tl-content {
  flex: 1;
}

.tl-title {
  font-weight: 600;
  font-size: 12px;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
}

.tl-ev.error .tl-title {
  color: #ef4444;
}

.tl-ev.success .tl-title {
  color: #10b981;
}

.tl-ev.wait .tl-title {
  color: #6b7280;
}

.tl-countdown {
  font-family: var(--vp-font-family-mono);
  font-size: 18px;
  font-weight: 700;
  color: #f59e0b;
  min-width: 40px;
  text-align: right;
  animation: countPulse 1s ease infinite;
}

.tl-countdown.done {
  color: #10b981;
  animation: none;
  font-size: 14px;
}

@keyframes countPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.pf-right {
  display: grid;
  gap: 12px;
  align-content: start;
}

.rt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: all 0.3s;
}

.rt-row.highlight {
  background: rgba(30, 58, 95, 0.9);
  box-shadow: 0 0 0 1px #3b82f6;
}

.rt-code {
  width: 32px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-1);
}

.rt-label {
  flex: 1;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.rt-decision {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
}

.rt-decision.yes {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.rt-decision.no {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.rt-note {
  margin-top: 8px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.pf-side-card.emphasis {
  background: color-mix(in srgb, #2563eb 8%, var(--vp-c-bg));
}

.pf-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  font-weight: 600;
}

.btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pf-status {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

@media (max-width: 1080px) {
  .pf-main,
  .pf-flow-chain {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .pf-memory-grid {
    grid-template-columns: 1fr;
  }
}
</style>
