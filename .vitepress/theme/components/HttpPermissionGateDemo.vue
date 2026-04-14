<template>
  <div class="hpg-root">
    <div class="hpg-header">
      <div>
        <div class="hpg-title">{{ titleText }}</div>
        <p class="hpg-summary">
          先记住：HTTP 请求不是直接进入 <code>Handler</code>，而是先经过入口权限中间件。
          权限结果不同，请求能走到的最远位置也不同。
        </p>
      </div>
      <div class="hpg-badge">Ch08 · HTTP</div>
    </div>

    <div class="hpg-flow-card">
      <div class="hpg-flow-head">
        <div class="hpg-flow-title">请求主链</div>
        <p>同一个请求，先统一过权限门，再决定是被拦截还是继续进入业务处理。</p>
      </div>

      <div class="hpg-flow-chain">
        <button
          v-for="(step, index) in flowSteps"
          :key="step.id"
          type="button"
          class="hpg-flow-step"
          :class="{ active: activeFlowStep === step.id }"
          @click="changeStage(step.id)"
        >
          <div class="hpg-flow-kicker">0{{ index + 1 }}</div>
          <div class="hpg-flow-name">{{ step.label }}</div>
          <p>{{ step.description }}</p>
        </button>
      </div>
    </div>

    <div class="hpg-main">
      <div class="hpg-left">
        <div class="hpg-compare">
          <article class="hpg-lane denied">
            <div class="hpg-lane-head">
              <div>
                <div class="hpg-lane-title">权限不足</div>
                <p>用户只有只读权限，请求在入口被拦截。</p>
              </div>
              <span class="hpg-lane-badge deny">403</span>
            </div>

            <div class="hpg-request-card">
              <span class="hpg-request-method">POST</span>
              <span class="hpg-request-path">{{ requestPathText }}</span>
            </div>

            <div class="hpg-step-list">
              <div
                v-for="step in flowSteps"
                :key="`deny-${step.id}`"
                class="hpg-step-row"
                :class="laneStageClass('denied', step.id)"
              >
                <div class="hpg-step-dot" :class="laneStageClass('denied', step.id)" />
                <div class="hpg-step-copy">
                  <div class="hpg-step-label">{{ step.label }}</div>
                  <p>{{ deniedStageDescription(step.id) }}</p>
                </div>
              </div>
            </div>
          </article>

          <article class="hpg-lane allowed">
            <div class="hpg-lane-head">
              <div>
                <div class="hpg-lane-title">权限通过</div>
                <p>同一请求被放行后，才会继续进入路由和业务处理。</p>
              </div>
              <span class="hpg-lane-badge allow">200</span>
            </div>

            <div class="hpg-request-card">
              <span class="hpg-request-method">POST</span>
              <span class="hpg-request-path">{{ requestPathText }}</span>
            </div>

            <div class="hpg-step-list">
              <div
                v-for="step in flowSteps"
                :key="`allow-${step.id}`"
                class="hpg-step-row"
                :class="laneStageClass('allowed', step.id)"
              >
                <div class="hpg-step-dot" :class="laneStageClass('allowed', step.id)" />
                <div class="hpg-step-copy">
                  <div class="hpg-step-label">{{ step.label }}</div>
                  <p>{{ allowedStageDescription(step.id) }}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="hpg-right">
        <div class="hpg-memory-grid">
          <article class="hpg-memory-card">
            <h4>谁在做守门</h4>
            <p>{{ flowStageLabel('owner') }}</p>
          </article>
          <article class="hpg-memory-card">
            <h4>拦住的依据是什么</h4>
            <p>{{ flowStageLabel('basis') }}</p>
          </article>
          <article class="hpg-memory-card">
            <h4>被拦住后请求停在哪里</h4>
            <p>{{ flowStageLabel('blocked') }}</p>
          </article>
          <article class="hpg-memory-card">
            <h4>放行后为什么 Handler 可以更简单</h4>
            <p>{{ flowStageLabel('simple') }}</p>
          </article>
        </div>

        <div class="hpg-side-card">
          <div class="hpg-side-title">当前主链位置</div>
          <div class="hpg-current-step">
            <div class="hpg-current-kicker">{{ activeStep?.label }}</div>
            <p>{{ activeStep?.description }}</p>
          </div>
        </div>

        <div class="hpg-side-card">
          <div class="hpg-side-title">这一步在服务端意味着什么</div>
          <p>{{ activeStep?.focus }}</p>
        </div>

        <div class="hpg-side-card emphasis">
          <div class="hpg-side-title">一句话记忆</div>
          <p>
            API 请求能走多远，首先不是看 Handler 会不会处理，而是看入口权限中间件放不放行。
          </p>
        </div>
      </div>
    </div>

    <div class="hpg-footer">
      <button type="button" class="btn" @click="restart">重新播放</button>
      <span class="hpg-status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type FlowStageId = 'request' | 'permission' | 'route' | 'handler' | 'response'
type FlowLabelKey = 'owner' | 'basis' | 'blocked' | 'simple'
type LaneId = 'denied' | 'allowed'

const flowSteps = [
  {
    id: 'request',
    label: 'HTTP 请求',
    description: '客户端把同一个 POST 请求发到 HTTP API 服务器入口。',
    focus: '这一步还没有进入业务代码，请求只是刚到 Hono 应用入口。'
  },
  {
    id: 'permission',
    label: '权限中间件',
    description: '入口权限中间件判断当前用户是否允许执行这次动作。',
    focus: '真正决定请求能不能继续往下走的，是这里的权限判定，而不是后面的 Handler 临时补 if。'
  },
  {
    id: 'route',
    label: '路由匹配',
    description: '只有通过权限校验的请求，才会继续命中具体路由。',
    focus: '被拒绝的请求不会再进入路由层，所以路由代码天然少了一层重复防御。'
  },
  {
    id: 'handler',
    label: 'Handler',
    description: 'Handler 专注执行业务，例如写消息、启动 processor 或返回流。',
    focus: '因为入口已经完成统一守门，Handler 可以聚焦业务本身，而不是重复判断权限。'
  },
  {
    id: 'response',
    label: '响应返回',
    description: '权限失败直接返回 403；权限通过则返回正常 JSON 或 stream 响应。',
    focus: '请求的最终结果，是入口权限判定与后续业务执行共同决定的。'
  }
] as const satisfies Array<{
  id: FlowStageId
  label: string
  description: string
  focus: string
}>

const stageOrder: FlowStageId[] = ['request', 'permission', 'route', 'handler', 'response']
const deniedCompleted = ref<FlowStageId[]>([])
const allowedCompleted = ref<FlowStageId[]>([])
const activeFlowStep = ref<FlowStageId>('request')
const splitResolved = ref(false)
const deniedResponseReady = ref(false)
const requestPathText = ' /session/:id/message'
const titleText = 'HTTP 请求权限守门对照'

let timer: ReturnType<typeof setTimeout> | null = null

const activeStep = computed(() => flowSteps.find(step => step.id === activeFlowStep.value))

const statusText = computed(() => {
  if (deniedCompleted.value.length === 0 && allowedCompleted.value.length === 0) return '等待开始...'
  if (activeFlowStep.value === 'permission' && !splitResolved.value) return '入口权限中间件正在判断请求是否允许继续'
  if (activeFlowStep.value === 'route') return '左侧已返回 403，右侧继续进入路由匹配'
  if (activeFlowStep.value === 'handler') return '只有通过权限的请求才会真正进入 Handler'
  if (activeFlowStep.value === 'response') return '双结果对照完成：左侧 403，右侧 200 / stream'
  return `${activeStep.value?.label ?? 'HTTP 请求'} 处理中`
})

function flowStageLabel(key: FlowLabelKey) {
  const map: Record<FlowLabelKey, string> = {
    owner: '入口权限中间件负责统一守门，真正的业务 Handler 只是接住已经被放行的请求。',
    basis: '依据是当前用户是否拥有这次资源访问或动作执行的权限，不是简单看路由存不存在。',
    blocked: '一旦在权限中间件被拒绝，请求会直接在那里返回 403，后面的路由和 Handler 都不会再执行。',
    simple: '因为进入 Handler 的请求已经过了统一权限检查，业务代码可以更专注地处理写库、流式响应和结果组织。'
  }

  return map[key]
}

function changeStage(stageId: FlowStageId) {
  activeFlowStep.value = stageId
}

function delay(ms: number) {
  return new Promise<void>(resolve => {
    timer = setTimeout(resolve, ms)
  })
}

function laneStageClass(lane: LaneId, stageId: FlowStageId) {
  const completed = lane === 'denied' ? deniedCompleted.value : allowedCompleted.value
  const stageIndex = stageOrder.indexOf(stageId)
  const activeIndex = stageOrder.indexOf(activeFlowStep.value)

  if (completed.includes(stageId)) return 'done'
  if (lane === 'denied' && splitResolved.value && (stageId === 'route' || stageId === 'handler')) return 'blocked'
  if (lane === 'denied' && stageId === 'response' && deniedResponseReady.value) return activeFlowStep.value === 'response' ? 'current' : 'done'
  if (stageId === activeFlowStep.value) return 'current'
  if (stageIndex < activeIndex && lane === 'allowed') return 'done'
  return 'pending'
}

function deniedStageDescription(stageId: FlowStageId) {
  const map: Record<FlowStageId, string> = {
    request: '同一个消息写入请求到达服务器入口。',
    permission: '权限中间件发现当前身份缺少 session:write，拒绝继续执行。',
    route: '未进入路由匹配，业务路由完全没有机会运行。',
    handler: '未进入 Handler，所以不会触发写消息或流式处理。',
    response: '直接返回 403 Forbidden，错误在入口被统一收口。'
  }

  return map[stageId]
}

function allowedStageDescription(stageId: FlowStageId) {
  const map: Record<FlowStageId, string> = {
    request: '同一个消息写入请求到达服务器入口。',
    permission: '权限中间件确认当前用户拥有 session:write，可以继续往下走。',
    route: '请求命中 SessionRoutes，对应 POST /:sessionID/message。',
    handler: 'Handler 开始执行业务逻辑，准备写消息并启动 processor。',
    response: '返回正常 stream 响应，客户端继续接收增量结果。'
  }

  return map[stageId]
}

async function run() {
  activeFlowStep.value = 'request'
  await delay(450)
  deniedCompleted.value = ['request']
  allowedCompleted.value = ['request']

  activeFlowStep.value = 'permission'
  await delay(850)
  deniedCompleted.value = ['request', 'permission']
  allowedCompleted.value = ['request', 'permission']
  splitResolved.value = true
  deniedResponseReady.value = true

  await delay(500)
  activeFlowStep.value = 'route'
  await delay(700)
  allowedCompleted.value = ['request', 'permission', 'route']

  activeFlowStep.value = 'handler'
  await delay(700)
  allowedCompleted.value = ['request', 'permission', 'route', 'handler']

  activeFlowStep.value = 'response'
  await delay(700)
  deniedCompleted.value = ['request', 'permission', 'response']
  allowedCompleted.value = ['request', 'permission', 'route', 'handler', 'response']
}

function restart() {
  if (timer) clearTimeout(timer)
  deniedCompleted.value = []
  allowedCompleted.value = []
  activeFlowStep.value = 'request'
  splitResolved.value = false
  deniedResponseReady.value = false
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
.hpg-root {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 20px;
  margin: 24px 0;
  background:
    radial-gradient(circle at top left, rgba(239, 68, 68, 0.06), transparent 24%),
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 94%, white), var(--vp-c-bg));
  font-size: 13px;
  display: grid;
  gap: 16px;
}

.hpg-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.hpg-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.hpg-summary {
  margin: 8px 0 0;
  max-width: 56rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.hpg-summary code {
  font-family: var(--vp-font-family-mono);
}

.hpg-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.hpg-flow-card,
.hpg-side-card,
.hpg-memory-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 95%, white);
}

.hpg-flow-card {
  padding: 14px;
  display: grid;
  gap: 14px;
}

.hpg-flow-head {
  display: grid;
  gap: 6px;
}

.hpg-flow-head p,
.hpg-memory-card p,
.hpg-side-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.hpg-flow-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-1);
  text-transform: uppercase;
}

.hpg-flow-chain {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.hpg-flow-step {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.hpg-flow-step:hover {
  transform: translateY(-1px);
  border-color: rgba(239, 68, 68, 0.35);
}

.hpg-flow-step.active {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.08);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.hpg-flow-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #b91c1c;
  text-transform: uppercase;
}

.hpg-flow-name {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.hpg-flow-step p {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.hpg-main {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
  gap: 16px;
}

.hpg-left,
.hpg-right {
  display: grid;
  gap: 12px;
}

.hpg-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hpg-lane {
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 14px;
  display: grid;
  gap: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 96%, white);
}

.hpg-lane.denied {
  background:
    linear-gradient(180deg, rgba(239, 68, 68, 0.07), transparent 40%),
    color-mix(in srgb, var(--vp-c-bg) 96%, white);
}

.hpg-lane.allowed {
  background:
    linear-gradient(180deg, rgba(16, 185, 129, 0.08), transparent 42%),
    color-mix(in srgb, var(--vp-c-bg) 96%, white);
}

.hpg-lane-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.hpg-lane-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.hpg-lane-head p {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.hpg-lane-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
}

.hpg-lane-badge.deny {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.14);
}

.hpg-lane-badge.allow {
  color: #047857;
  background: rgba(16, 185, 129, 0.14);
}

.hpg-request-card {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  border: 1px dashed var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  word-break: break-word;
}

.hpg-request-method {
  color: #2563eb;
  font-weight: 700;
}

.hpg-request-path {
  color: var(--vp-c-text-1);
}

.hpg-step-list {
  display: grid;
  gap: 10px;
}

.hpg-step-row {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}

.hpg-step-row.done {
  border-color: rgba(16, 185, 129, 0.28);
}

.hpg-step-row.current {
  border-color: rgba(59, 130, 246, 0.42);
  background: rgba(59, 130, 246, 0.08);
}

.hpg-step-row.blocked {
  border-style: dashed;
  opacity: 0.56;
  background: rgba(148, 163, 184, 0.08);
}

.hpg-step-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  margin-top: 4px;
  flex-shrink: 0;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.hpg-step-dot.done {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.18);
}

.hpg-step-dot.current {
  border-color: #2563eb;
  background: rgba(59, 130, 246, 0.2);
}

.hpg-step-dot.blocked {
  border-color: #94a3b8;
  background: rgba(148, 163, 184, 0.22);
}

.hpg-step-label,
.hpg-side-title,
.hpg-memory-card h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.hpg-step-copy p {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.hpg-memory-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.hpg-memory-card,
.hpg-side-card {
  padding: 14px;
}

.hpg-memory-card p {
  margin-top: 8px;
}

.hpg-current-step {
  display: grid;
  gap: 6px;
}

.hpg-current-kicker {
  font-size: 12px;
  font-weight: 700;
  color: #b91c1c;
}

.hpg-side-card.emphasis {
  background:
    linear-gradient(135deg, rgba(239, 68, 68, 0.08), transparent 70%),
    color-mix(in srgb, var(--vp-c-bg) 95%, white);
}

.hpg-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hpg-status {
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
  transition: background 0.2s ease;
}

.btn:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}

@media (max-width: 1100px) {
  .hpg-flow-chain {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hpg-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hpg-flow-chain,
  .hpg-compare,
  .hpg-memory-grid {
    grid-template-columns: 1fr;
  }
}
</style>
