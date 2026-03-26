<template>
  <div class="mcp-root">
    <div class="mcp-header">{{ titleText }}</div>

    <div class="mcp-body">
      <!-- 时序轴 -->
      <div class="mcp-timeline">
        <!-- 列头 -->
        <div class="tl-cols">
          <div class="tl-col oc">{{ clientLabelText }}</div>
          <div class="tl-col mid"></div>
          <div class="tl-col ms">{{ serverLabelText }}</div>
        </div>

        <!-- 事件行 -->
        <div
          v-for="(ev, i) in visibleEvents"
          :key="i"
          class="tl-row"
          :class="[ev.dir, ev.type, { entering: i === visibleEvents.length - 1 }]"
        >
          <div class="tl-left">
            <span v-if="ev.dir === 'right'" class="tl-label oc-side">{{ ev.label }}</span>
            <span v-if="ev.dir === 'left'"  class="tl-result">{{ ev.label }}</span>
            <span v-if="ev.dir === 'internal'" class="tl-internal">{{ ev.label }}</span>
          </div>
          <div class="tl-arrow-wrap" v-if="ev.dir !== 'internal'">
            <div class="tl-line" :class="ev.dir" />
            <div class="tl-arrowhead" :class="ev.dir" />
          </div>
          <div class="tl-right" v-if="ev.dir !== 'internal'">
            <span v-if="ev.dir === 'left'"  class="tl-label ms-side">{{ ev.sub }}</span>
            <span v-if="ev.dir === 'right'" class="tl-result">{{ ev.sub }}</span>
          </div>
        </div>

        <!-- 分隔线 -->
        <div v-if="showDivider" class="tl-divider">
          <span>Agent 执行阶段（工具已注入 registry）</span>
        </div>

        <!-- 调用事件 -->
        <div
          v-for="(ev, i) in visibleCallEvents"
          :key="'c' + i"
          class="tl-row"
          :class="[ev.dir, ev.type, { entering: i === visibleCallEvents.length - 1 }]"
        >
          <div class="tl-left">
            <span v-if="ev.dir === 'right'" class="tl-label oc-side">{{ ev.label }}</span>
            <span v-if="ev.dir === 'left'"  class="tl-result">{{ ev.label }}</span>
          </div>
          <div class="tl-arrow-wrap">
            <div class="tl-line" :class="ev.dir" />
            <div class="tl-arrowhead" :class="ev.dir" />
          </div>
          <div class="tl-right">
            <span v-if="ev.dir === 'left'"  class="tl-label ms-side">{{ ev.sub }}</span>
            <span v-if="ev.dir === 'right'" class="tl-result">{{ ev.sub }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：工具注册面板 -->
      <div class="mcp-registry">
        <div class="reg-title">Tool Registry</div>
        <div class="reg-section">内置工具</div>
        <div class="reg-tool builtin" v-for="t in builtinTools" :key="t">{{ t }}</div>
        <div class="reg-section" v-if="mcpTools.length > 0">MCP 工具（{{ serverLabelText }}）</div>
        <div
          class="reg-tool mcp"
          v-for="(t, i) in mcpTools"
          :key="t"
          :class="{ entering: i === mcpTools.length - 1 }"
        >{{ t }}</div>
      </div>
    </div>

    <div class="mcp-footer">
      <button class="btn" @click="restart">重新播放</button>
      <span class="mcp-status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface McpEvent {
  dir: 'right' | 'left' | 'internal'
  type: string
  label: string
  sub: string
}

const defaultHandshakeEvents: McpEvent[] = [
  { dir: 'internal', type: 'spawn',  label: 'spawn("npx my-db-mcp-server --connection postgresql://...")', sub: '' },
  { dir: 'right',    type: 'init',   label: 'initialize',   sub: '{ protocolVersion, capabilities }' },
  { dir: 'left',     type: 'init',   label: '{ protocolVersion: "2024-11-05", capabilities: { tools: true } }', sub: 'initialize 响应' },
  { dir: 'right',    type: 'list',   label: 'tools/list',   sub: '{}' },
  { dir: 'left',     type: 'list',   label: '{ tools: [query_table, run_migration, get_schema, list_tables] }', sub: 'tools/list 响应' },
  { dir: 'internal', type: 'inject', label: '转换为 Tool.Info 格式，注入 Tool Registry', sub: '' },
]

const defaultCallEvents: McpEvent[] = [
  { dir: 'right', type: 'call',   label: 'tools/call',   sub: '{ name: "query_table", arguments: { table: "users" } }' },
  { dir: 'left',  type: 'result', label: '{ content: [{ type: "text", text: "id | name\\n1 | Alice\\n2 | Bob" }] }', sub: 'tool result' },
]

const defaultMcpToolNames = ['my_database_query_table', 'my_database_run_migration', 'my_database_get_schema', 'my_database_list_tables']
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

const titleText = computed(() => props.title ?? 'MCP 协议生命周期（stdio 连接）')
const clientLabelText = computed(() => props.clientLabel ?? 'OpenCode')
const serverLabelText = computed(() => props.serverLabel ?? 'MCP Server\nnpx my-db-mcp')
const builtinTools = computed(() => props.builtinTools ?? defaultBuiltinTools)
const mcpToolNames = computed(() => props.mcpToolNames ?? defaultMcpToolNames)
const handshakeEvents = computed(() => props.handshakeEvents ?? defaultHandshakeEvents)
const callEvents = computed(() => props.callEvents ?? defaultCallEvents)

const visibleEvents = ref<McpEvent[]>([])
const visibleCallEvents = ref<McpEvent[]>([])
const mcpTools = ref<string[]>([])
const showDivider = ref(false)

const statusText = computed(() => {
  const total = visibleEvents.value.length + visibleCallEvents.value.length
  if (total === 0) return '等待开始...'
  if (visibleCallEvents.value.length === callEvents.value.length) return 'MCP 工具调用完成，结果返回 Agent 主循环'
  if (showDivider.value) return `Agent 正在调用 ${mcpToolNames.value[0] ?? 'MCP 工具'}...`
  if (mcpTools.value.length === mcpToolNames.value.length) return '工具注入完成，Agent 可调用 MCP 工具'
  return 'MCP 握手中...'
})

let timer: ReturnType<typeof setTimeout> | null = null

function delay(ms: number) {
  return new Promise<void>(resolve => { timer = setTimeout(resolve, ms) })
}

async function run() {
  await delay(500)

  // 握手阶段
  for (let i = 0; i < handshakeEvents.value.length; i++) {
    const ev = handshakeEvents.value[i]
    await delay(ev.type === 'inject' ? 600 : ev.dir === 'internal' ? 700 : 800)
    visibleEvents.value = [...visibleEvents.value, ev]

    // 工具逐个出现
    if (ev.type === 'list' && ev.dir === 'left') {
      for (const t of mcpToolNames.value) {
        await delay(250)
        mcpTools.value = [...mcpTools.value, t]
      }
    }
  }

  await delay(800)
  showDivider.value = true

  await delay(700)

  // 调用阶段
  for (const ev of callEvents.value) {
    await delay(800)
    visibleCallEvents.value = [...visibleCallEvents.value, ev]
  }
}

function restart() {
  if (timer) clearTimeout(timer)
  visibleEvents.value = []
  visibleCallEvents.value = []
  mcpTools.value = []
  showDivider.value = false
  timer = setTimeout(() => run(), 300)
}

onMounted(() => { timer = setTimeout(() => run(), 700) })
onUnmounted(() => { if (timer) clearTimeout(timer) })
</script>

<style scoped>
.mcp-root {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  margin: 24px 0;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}

.mcp-header {
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
}

.mcp-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* ---- Timeline ---- */
.mcp-timeline {
  flex: 1;
  background: #111;
  border-radius: 8px;
  padding: 12px;
  min-height: 240px;
  overflow-x: hidden;
}

.tl-cols {
  display: flex;
  margin-bottom: 10px;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
}

.tl-col {
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-align: center;
  white-space: pre-line;
  line-height: 1.4;
}
.tl-col.oc  { width: 90px; flex-shrink: 0; color: #93c5fd; }
.tl-col.mid { flex: 1; }
.tl-col.ms  { width: 120px; flex-shrink: 0; color: #6ee7b7; }

.tl-row {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 8px;
  animation: rowIn 0.3s ease;
}

@keyframes rowIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.tl-left  { width: 90px; flex-shrink: 0; text-align: right; padding-right: 6px; }
.tl-right { width: 120px; flex-shrink: 0; padding-left: 6px; }

.tl-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
}
.tl-label.oc-side { color: #93c5fd; }
.tl-label.ms-side { color: #6ee7b7; }

.tl-result {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #6b7280;
  word-break: break-all;
  line-height: 1.3;
}

.tl-internal {
  font-family: var(--vp-font-family-base);
  font-size: 11px;
  color: #f59e0b;
  display: block;
  text-align: center;
  padding: 5px 8px;
  background: #2a1f00;
  border-radius: 4px;
  width: 100%;
}

/* Arrow */
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
  transition: width 0.3s;
}
.tl-line.right { background: linear-gradient(to right, #3b82f6, #60a5fa); }
.tl-line.left  { background: linear-gradient(to left,  #10b981, #34d399); }
.tl-line.call  { background: linear-gradient(to right, #7c3aed, #a78bfa); }
.tl-line.result { background: linear-gradient(to left, #f59e0b, #fcd34d); }

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
.tl-arrowhead.call {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid #a78bfa;
}
.tl-arrowhead.result {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 7px solid #fcd34d;
  order: -1;
}

/* Divider */
.tl-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  color: #4b5563;
  font-size: 10px;
  font-family: var(--vp-font-family-base);
}
.tl-divider::before,
.tl-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #374151;
}

/* ---- Registry ---- */
.mcp-registry {
  width: 160px;
  flex-shrink: 0;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 10px;
  min-height: 240px;
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
  padding: 3px 6px;
  border-radius: 4px;
  margin-bottom: 3px;
}
.reg-tool.builtin {
  color: #9ca3af;
  background: var(--vp-c-bg-soft);
}
.reg-tool.mcp {
  color: #6ee7b7;
  background: #0f2a1a;
  animation: toolIn 0.3s ease;
}
@keyframes toolIn {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Footer */
.mcp-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
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
  transition: background 0.2s;
}
.btn:hover { background: var(--vp-c-brand-1); color: white; }
</style>
