<template>
  <div class="mcp-root">
    <div class="mcp-header">
      <div>
        <div class="mcp-title">{{ titleText }}</div>
        <p class="mcp-summary">
          先记住：MCP 这一章真正的主角不是某一次 <code>tools/call</code>，而是 OpenCode
          如何把外部 MCP Server 暴露的工具，接成自己统一可调用的 Tool Registry。
        </p>
      </div>
      <div class="mcp-badge">Ch06 · MCP</div>
    </div>

    <div class="mcp-flow-card">
      <div class="mcp-flow-head">
        <div class="mcp-flow-title">MCP 接入主链</div>
        <p>先看这条主链，再把下面的握手时序当成 “stdio 场景里的一个协议子过程”。</p>
      </div>

      <div class="mcp-flow-chain">
        <button
          v-for="(step, index) in flowSteps"
          :key="step.id"
          type="button"
          class="mcp-flow-step"
          :class="{ active: activeFlowStep === step.id }"
          @click="changeStage(step.id)"
        >
          <div class="mcp-flow-kicker">0{{ index + 1 }}</div>
          <div class="mcp-flow-name">{{ step.label }}</div>
          <p>{{ step.description }}</p>
        </button>
      </div>
    </div>

    <div class="mcp-main">
      <div class="mcp-left">
        <div class="mcp-subsection">
          <div class="mcp-subtitle">协议子场景：握手与注入</div>
          <p class="mcp-subcopy">
            这里演示的是最常见的 <code>stdio</code> 连接。若换成 remote/SSE，只会替换 transport，
            不会改变 <code>tools/list -> Tool.Info -> registry</code> 这条主链。
          </p>
        </div>

        <div class="mcp-body">
          <div class="mcp-timeline">
            <div class="tl-cols">
              <div class="tl-col oc">{{ clientLabelText }}</div>
              <div class="tl-col mid"></div>
              <div class="tl-col ms">{{ serverLabelText }}</div>
            </div>

            <div
              v-for="(ev, i) in visibleEvents"
              :key="i"
              class="tl-row"
              :class="[ev.dir, ev.type, { entering: i === visibleEvents.length - 1 }]"
            >
              <div class="tl-left">
                <span v-if="ev.dir === 'right'" class="tl-label oc-side">{{ ev.label }}</span>
                <span v-if="ev.dir === 'left'" class="tl-result">{{ ev.label }}</span>
                <span v-if="ev.dir === 'internal'" class="tl-internal">{{ ev.label }}</span>
              </div>
              <div v-if="ev.dir !== 'internal'" class="tl-arrow-wrap">
                <div class="tl-line" :class="ev.dir" />
                <div class="tl-arrowhead" :class="ev.dir" />
              </div>
              <div v-if="ev.dir !== 'internal'" class="tl-right">
                <span v-if="ev.dir === 'left'" class="tl-label ms-side">{{ ev.sub }}</span>
                <span v-if="ev.dir === 'right'" class="tl-result">{{ ev.sub }}</span>
              </div>
            </div>

            <div v-if="showDivider" class="tl-divider">
              <span>完成注入后，Agent 再按统一 registry 发起调用</span>
            </div>

            <div
              v-for="(ev, i) in visibleCallEvents"
              :key="'c' + i"
              class="tl-row"
              :class="[ev.dir, ev.type, { entering: i === visibleCallEvents.length - 1 }]"
            >
              <div class="tl-left">
                <span v-if="ev.dir === 'right'" class="tl-label oc-side">{{ ev.label }}</span>
                <span v-if="ev.dir === 'left'" class="tl-result">{{ ev.label }}</span>
              </div>
              <div class="tl-arrow-wrap">
                <div class="tl-line" :class="ev.dir" />
                <div class="tl-arrowhead" :class="ev.dir" />
              </div>
              <div class="tl-right">
                <span v-if="ev.dir === 'left'" class="tl-label ms-side">{{ ev.sub }}</span>
                <span v-if="ev.dir === 'right'" class="tl-result">{{ ev.sub }}</span>
              </div>
            </div>
          </div>

          <div class="mcp-registry">
            <div class="reg-title">Tool Registry</div>
            <div class="reg-section">内置工具</div>
            <div v-for="t in builtinTools" :key="t" class="reg-tool builtin">{{ t }}</div>
            <div v-if="mcpTools.length > 0" class="reg-section">MCP 工具（{{ serverLabelText }}）</div>
            <div
              v-for="(t, i) in mcpTools"
              :key="t"
              class="reg-tool mcp"
              :class="{ entering: i === mcpTools.length - 1 }"
            >
              {{ t }}
            </div>
          </div>
        </div>
      </div>

      <div class="mcp-right">
        <div class="mcp-memory-grid">
          <article class="mcp-memory-card">
            <h4>谁是 Client，谁是 Server</h4>
            <p>{{ flowStageLabel('role') }}</p>
          </article>
          <article class="mcp-memory-card">
            <h4>OpenCode 接进来的到底是什么</h4>
            <p>{{ flowStageLabel('object') }}</p>
          </article>
          <article class="mcp-memory-card">
            <h4>tools/list 之后发生了什么</h4>
            <p>{{ flowStageLabel('transform') }}</p>
          </article>
          <article class="mcp-memory-card">
            <h4>为什么 Agent 后面能直接调用</h4>
            <p>{{ flowStageLabel('invoke') }}</p>
          </article>
        </div>

        <div class="mcp-side-card">
          <div class="mcp-side-title">当前主链位置</div>
          <div class="mcp-current-step">
            <div class="mcp-current-kicker">{{ activeStep?.label }}</div>
            <p>{{ activeStep?.description }}</p>
          </div>
        </div>

        <div class="mcp-side-card">
          <div class="mcp-side-title">这一步在源码里看什么</div>
          <p>{{ activeStep?.focus }}</p>
        </div>

        <div class="mcp-side-card emphasis">
          <div class="mcp-side-title">一句话记忆</div>
          <p>
            OpenCode 不是自己变成 MCP Server，而是作为 MCP Client 先发现外部工具，再把它们转成统一的
            registry 条目，让 Agent 后续按同一种方式调用。
          </p>
        </div>
      </div>
    </div>

    <div class="mcp-footer">
      <button type="button" class="btn" @click="restart">重新播放</button>
      <span class="mcp-status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface McpEvent {
  dir: 'right' | 'left' | 'internal'
  type: string
  label: string
  sub: string
}

type FlowStageId =
  | 'config'
  | 'transport'
  | 'connect'
  | 'discover'
  | 'convert'
  | 'registry'
  | 'call'

type FlowLabelKey = 'role' | 'object' | 'transform' | 'invoke'

const defaultHandshakeEvents: McpEvent[] = [
  { dir: 'internal', type: 'spawn', label: 'spawn("npx my-db-mcp-server --connection postgresql://...")', sub: '' },
  { dir: 'right', type: 'init', label: 'initialize', sub: '{ protocolVersion, capabilities }' },
  { dir: 'left', type: 'init', label: '{ protocolVersion: "2024-11-05", capabilities: { tools: true } }', sub: 'initialize 响应' },
  { dir: 'right', type: 'list', label: 'tools/list', sub: '{}' },
  { dir: 'left', type: 'list', label: '{ tools: [query_table, run_migration, get_schema, list_tables] }', sub: 'tools/list 响应' },
  { dir: 'internal', type: 'inject', label: '转换为 Tool.Info 格式，注入 Tool Registry', sub: '' }
]

const defaultCallEvents: McpEvent[] = [
  { dir: 'right', type: 'call', label: 'tools/call', sub: '{ name: "query_table", arguments: { table: "users" } }' },
  { dir: 'left', type: 'result', label: '{ content: [{ type: "text", text: "id | name\\n1 | Alice\\n2 | Bob" }] }', sub: 'tool result' }
]

const defaultMcpToolNames = [
  'my_database_query_table',
  'my_database_run_migration',
  'my_database_get_schema',
  'my_database_list_tables'
]
const defaultBuiltinTools = ['read', 'write', 'edit', 'bash', 'grep', 'glob', '...']

const props = defineProps<{
  title?: string
  clientLabel?: string
  serverLabel?: string
  builtinTools?: string[]
  mcpToolNames?: string[]
  handshakeEvents?: McpEvent[]
  callEvents?: McpEvent[]
}>()

const flowSteps = [
  {
    id: 'config',
    label: '读取配置',
    description: '先从 mcpServers 里找到要接入的 server 配置、启用状态、鉴权和超时。',
    focus: '先看 config.ts 里的 mcp 配置格式，理解 OpenCode 连接的目标是“外部 server 定义”。'
  },
  {
    id: 'transport',
    label: '选 transport',
    description: '按 type 决定走本地 stdio 子进程，还是远程 HTTP / SSE 传输。',
    focus: '在 mcp/index.ts 里对照 StdioClientTransport、StreamableHTTPClientTransport、SSEClientTransport。'
  },
  {
    id: 'connect',
    label: '建立连接',
    description: 'Client 发 initialize，确认协议版本和 capabilities，连接才算真正建立。',
    focus: '重点盯 connect()：这里决定 OpenCode 是 MCP Client，不是 Server。'
  },
  {
    id: 'discover',
    label: '发现工具',
    description: '连接成功后调用 tools/list，拿到外部 MCP Server 暴露的工具描述。',
    focus: '看 tools/list 结果长什么样，先把“发现”与“调用”分开理解。'
  },
  {
    id: 'convert',
    label: '转换协议',
    description: 'MCP Tool 不是直接给 Agent 用，要先转成 OpenCode 侧统一的 Tool.Info。',
    focus: '去找工具转换逻辑，看 name、description、schema 是怎么被重塑成统一接口的。'
  },
  {
    id: 'registry',
    label: '注入 registry',
    description: '转换后的工具被注册进 Tool Registry，和内置工具并排存在。',
    focus: '把这一步记成“外部工具完成本地化”，后面 Agent 已经不需要知道它来自哪里。'
  },
  {
    id: 'call',
    label: 'Agent 调用',
    description: '等 registry 里有了条目，Agent 就按统一工具调用链发 tools/call。',
    focus: '从 Agent 视角看，它只是在调用一个工具名，不再关心底层 transport 和协议细节。'
  }
] as const satisfies Array<{
  id: FlowStageId
  label: string
  description: string
  focus: string
}>

const titleText = computed(() => props.title ?? 'MCP 协议接入主链（stdio 子场景）')
const clientLabelText = computed(() => props.clientLabel ?? 'OpenCode')
const serverLabelText = computed(() => props.serverLabel ?? 'MCP Server\nnpx my-db-mcp')
const builtinTools = computed(() => props.builtinTools ?? defaultBuiltinTools)
const mcpToolNames = computed(() => props.mcpToolNames ?? defaultMcpToolNames)
const handshakeEvents = computed(() => props.handshakeEvents ?? defaultHandshakeEvents)
const callEvents = computed(() => props.callEvents ?? defaultCallEvents)

const activeFlowStep = ref<FlowStageId>('config')
const visibleEvents = ref<McpEvent[]>([])
const visibleCallEvents = ref<McpEvent[]>([])
const mcpTools = ref<string[]>([])
const showDivider = ref(false)

const activeStep = computed(() => flowSteps.find(step => step.id === activeFlowStep.value))

const statusText = computed(() => {
  const total = visibleEvents.value.length + visibleCallEvents.value.length
  if (total === 0) return '等待开始...'
  if (visibleCallEvents.value.length === callEvents.value.length) return 'MCP 工具调用完成，结果已返回 Agent 主循环'
  if (showDivider.value) return `Agent 已经从 registry 中调用 ${mcpToolNames.value[0] ?? 'MCP 工具'}`
  if (mcpTools.value.length === mcpToolNames.value.length) return 'MCP 工具已转换并注入 Tool Registry'
  return 'OpenCode 正在连接并发现外部 MCP 工具'
})

let timer: ReturnType<typeof setTimeout> | null = null

function flowStageLabel(key: FlowLabelKey) {
  const map: Record<FlowLabelKey, string> = {
    role: 'OpenCode 是 MCP Client，外部子进程或远端服务才是 MCP Server；Client 负责连接、发现、转换和转发调用。',
    object: '接进来的是 MCP Server 暴露的工具描述与调用能力，不是把 Server 代码直接塞进 OpenCode 进程。',
    transform: 'tools/list 返回的还是 MCP 协议对象，OpenCode 会先把它转换成统一的 Tool.Info，再交给内部 registry 使用。',
    invoke: '因为 registry 里已经有了标准化条目，Agent 只按统一工具接口调用，不再区分它来自内置工具还是 MCP。'
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

function stageForEvent(ev: McpEvent): FlowStageId {
  if (ev.type === 'spawn') return 'transport'
  if (ev.type === 'init') return 'connect'
  if (ev.type === 'list') return 'discover'
  if (ev.type === 'inject') return 'convert'
  if (ev.type === 'call' || ev.type === 'result') return 'call'
  return 'config'
}

async function run() {
  activeFlowStep.value = 'config'
  await delay(450)
  activeFlowStep.value = 'transport'
  await delay(450)

  for (const ev of handshakeEvents.value) {
    activeFlowStep.value = stageForEvent(ev)
    await delay(ev.type === 'inject' ? 600 : ev.dir === 'internal' ? 650 : 780)
    visibleEvents.value = [...visibleEvents.value, ev]

    if (ev.type === 'list' && ev.dir === 'left') {
      activeFlowStep.value = 'discover'
      for (const t of mcpToolNames.value) {
        await delay(240)
        mcpTools.value = [...mcpTools.value, t]
      }
    }

    if (ev.type === 'inject') {
      await delay(420)
      activeFlowStep.value = 'registry'
    }
  }

  await delay(700)
  showDivider.value = true
  activeFlowStep.value = 'call'
  await delay(500)

  for (const ev of callEvents.value) {
    activeFlowStep.value = stageForEvent(ev)
    await delay(760)
    visibleCallEvents.value = [...visibleCallEvents.value, ev]
  }
}

function restart() {
  if (timer) clearTimeout(timer)
  activeFlowStep.value = 'config'
  visibleEvents.value = []
  visibleCallEvents.value = []
  mcpTools.value = []
  showDivider.value = false
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
.mcp-root {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 20px;
  margin: 24px 0;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 26%),
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 94%, white), var(--vp-c-bg));
  font-size: 13px;
  display: grid;
  gap: 16px;
}

.mcp-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.mcp-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.mcp-summary {
  margin: 8px 0 0;
  max-width: 56rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.mcp-summary code,
.mcp-subcopy code {
  font-family: var(--vp-font-family-mono);
}

.mcp-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.mcp-flow-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 95%, white);
  padding: 14px;
  display: grid;
  gap: 14px;
}

.mcp-flow-head {
  display: grid;
  gap: 6px;
}

.mcp-flow-head p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.mcp-flow-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-1);
  text-transform: uppercase;
}

.mcp-flow-chain {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.mcp-flow-step {
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

.mcp-flow-step:hover {
  transform: translateY(-1px);
  border-color: rgba(16, 185, 129, 0.4);
}

.mcp-flow-step.active {
  border-color: rgba(16, 185, 129, 0.6);
  background: rgba(16, 185, 129, 0.12);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.mcp-flow-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #047857;
  text-transform: uppercase;
}

.mcp-flow-name {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.mcp-flow-step p {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.mcp-main {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
  gap: 16px;
}

.mcp-left,
.mcp-right {
  display: grid;
  gap: 12px;
}

.mcp-subsection {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
}

.mcp-subtitle {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-1);
  text-transform: uppercase;
}

.mcp-subcopy {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.mcp-body {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.mcp-timeline {
  flex: 1;
  background: #111827;
  border-radius: 12px;
  padding: 12px;
  min-height: 280px;
  overflow-x: hidden;
}

.tl-cols {
  display: flex;
  margin-bottom: 10px;
  border-bottom: 1px solid #334155;
  padding-bottom: 8px;
}

.tl-col {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  white-space: pre-line;
  line-height: 1.4;
}

.tl-col.oc {
  width: 92px;
  flex-shrink: 0;
  color: #93c5fd;
}

.tl-col.mid {
  flex: 1;
}

.tl-col.ms {
  width: 132px;
  flex-shrink: 0;
  color: #6ee7b7;
}

.tl-row {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 8px;
  animation: rowIn 0.3s ease;
}

@keyframes rowIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tl-left {
  width: 92px;
  flex-shrink: 0;
  text-align: right;
  padding-right: 6px;
}

.tl-right {
  width: 132px;
  flex-shrink: 0;
  padding-left: 6px;
}

.tl-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
}

.tl-label.oc-side {
  color: #93c5fd;
}

.tl-label.ms-side {
  color: #6ee7b7;
}

.tl-result {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #94a3b8;
  word-break: break-all;
  line-height: 1.35;
}

.tl-internal {
  font-size: 11px;
  color: #fcd34d;
  display: block;
  text-align: center;
  padding: 5px 8px;
  background: rgba(146, 64, 14, 0.45);
  border-radius: 4px;
  width: 100%;
}

.tl-arrow-wrap {
  flex: 1;
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
}

.tl-line {
  height: 2px;
  flex: 1;
}

.tl-line.right {
  background: linear-gradient(to right, #3b82f6, #60a5fa);
}

.tl-line.left {
  background: linear-gradient(to left, #10b981, #34d399);
}

.tl-arrowhead {
  width: 0;
  height: 0;
  flex-shrink: 0;
}

.tl-arrowhead.right {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid #60a5fa;
}

.tl-arrowhead.left {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 7px solid #34d399;
  order: -1;
}

.tl-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  color: #94a3b8;
  font-size: 10px;
}

.tl-divider::before,
.tl-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #334155;
}

.mcp-registry {
  width: 180px;
  flex-shrink: 0;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 10px;
  min-height: 280px;
}

.reg-title {
  font-weight: 700;
  font-size: 12px;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
  text-align: center;
}

.reg-section {
  font-size: 10px;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 8px 0 4px;
}

.reg-tool {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  padding: 4px 6px;
  border-radius: 6px;
  margin-bottom: 4px;
  word-break: break-word;
}

.reg-tool.builtin {
  color: #94a3b8;
  background: var(--vp-c-bg-soft);
}

.reg-tool.mcp {
  color: #6ee7b7;
  background: #0f2a1a;
  animation: toolIn 0.3s ease;
}

@keyframes toolIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.mcp-memory-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mcp-memory-card,
.mcp-side-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
  background: color-mix(in srgb, var(--vp-c-bg) 95%, white);
}

.mcp-memory-card h4,
.mcp-side-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.mcp-memory-card p,
.mcp-side-card p {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.mcp-current-step {
  display: grid;
  gap: 6px;
}

.mcp-current-kicker {
  font-size: 12px;
  font-weight: 700;
  color: #047857;
}

.mcp-side-card.emphasis {
  background:
    linear-gradient(135deg, rgba(16, 185, 129, 0.12), transparent 70%),
    color-mix(in srgb, var(--vp-c-bg) 95%, white);
}

.mcp-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.mcp-status {
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
  .mcp-flow-chain {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mcp-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .mcp-flow-chain,
  .mcp-memory-grid {
    grid-template-columns: 1fr;
  }

  .mcp-body {
    flex-direction: column;
  }

  .mcp-registry {
    width: 100%;
    min-height: 0;
  }

  .tl-col.oc,
  .tl-left {
    width: 74px;
  }

  .tl-col.ms,
  .tl-right {
    width: 110px;
  }
}
</style>
