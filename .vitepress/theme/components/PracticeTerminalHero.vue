<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const LINES = [
  { text: '$ bun run p01-minimal-agent.ts', color: '#f97316' },
  { text: '✓ Anthropic SDK initialized', color: '#86efac' },
  { text: '✓ Tool registered: get_weather', color: '#86efac' },
  { text: 'Agent: 我需要查询北京的天气...', color: '#93c5fd' },
  { text: 'Tool call: get_weather({ city: "北京" })', color: '#d1d5db' },
  { text: 'Tool result: { temp: 22, condition: "晴" }', color: '#fbbf24' },
  { text: 'Agent: 北京今天晴，气温 22°C，适合出行。', color: '#93c5fd' },
]

const displayedLines = ref<Array<{ text: string; color: string; done: boolean }>>([])
let timer: ReturnType<typeof setTimeout> | null = null

function sleep(ms: number) {
  return new Promise<void>(resolve => { timer = setTimeout(resolve, ms) })
}

let destroyed = false

onMounted(() => {
  destroyed = false
  animate()
})
onUnmounted(() => {
  destroyed = true
  if (timer) clearTimeout(timer)
})

async function animate() {
  if (destroyed) return
  displayedLines.value = []
  for (const line of LINES) {
    if (destroyed) return
    const entry = { text: '', color: line.color, done: false }
    displayedLines.value.push(entry)
    for (const char of line.text) {
      if (destroyed) return
      entry.text += char
      await sleep(55)
    }
    entry.done = true
    await sleep(500)
  }
  await sleep(2000)
  if (!destroyed) animate()
}
</script>

<template>
  <div class="terminal-hero">
    <div class="terminal-titlebar">
      <span class="dot red" />
      <span class="dot yellow" />
      <span class="dot green" />
      <span class="terminal-title">agent-workshop ~ bash</span>
    </div>
    <div class="terminal-body">
      <div
        v-for="(line, i) in displayedLines"
        :key="i"
        class="terminal-line"
        :style="{ color: line.color }"
      >
        {{ line.text }}<span v-if="i === displayedLines.length - 1 && !line.done" class="cursor">▋</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-hero {
  background: #1c1917;
  border: 1px solid #292524;
  border-radius: 10px;
  max-width: 560px;
  margin: 0 auto 28px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  overflow: hidden;
}

.terminal-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #292524;
  border-bottom: 1px solid #3a3330;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot.red    { background: #ef4444; }
.dot.yellow { background: #eab308; }
.dot.green  { background: #22c55e; }

.terminal-title {
  color: #57534e;
  font-size: 11px;
  margin-left: 8px;
}

.terminal-body {
  padding: 16px 20px;
  min-height: 160px;
  line-height: 1.9;
}

.terminal-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
  color: #f97316;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
</style>
