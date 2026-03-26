<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface CommMode {
  id: string
  label: string
  channel: string
  summary: string
  points: string[]
  tone: 'teal' | 'amber' | 'rose'
}

const modes: CommMode[] = [
  {
    id: 'blackboard',
    label: 'Shared Blackboard',
    channel: '共享黑板',
    summary: '所有 Agent 都围绕同一份中间状态协作，彼此不用直接认识。',
    points: ['低耦合', '适合共享中间状态', '需要处理版本冲突'],
    tone: 'teal',
  },
  {
    id: 'message',
    label: 'Message Passing',
    channel: '定向消息',
    summary: 'Agent A 明确知道要把什么信息发给 Agent B，链路精确但耦合更高。',
    points: ['点对点', '传递内容明确', '需要知道接收方身份'],
    tone: 'amber',
  },
  {
    id: 'handoff',
    label: 'Handoff',
    channel: '控制权移交',
    summary: '不仅传数据，还把任务上下文和执行控制权一起交出去。',
    points: ['耦合最高', '适合流水线交接', '需要完整上下文打包'],
    tone: 'rose',
  },
]

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const activeMode = computed(() => modes[current.value])

function selectMode(index: number) {
  current.value = index
}

onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % modes.length
  }, 2600)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="acd-root">
    <div class="acd-header">
      <div>
        <div class="acd-title">P17 Agent 通信模式</div>
        <div class="acd-subtitle">同样是“协作”，数据流和控制权边界完全不同。</div>
      </div>
      <div class="acd-tabs">
        <button
          v-for="(mode, index) in modes"
          :key="mode.id"
          class="acd-tab"
          :class="[mode.tone, { active: current === index }]"
          @click="selectMode(index)"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div class="acd-body">
      <div class="acd-flow" :class="activeMode.tone">
        <div class="acd-node">
          <div class="acd-node-title">Agent A</div>
          <div class="acd-node-meta">发起方</div>
        </div>
        <div class="acd-link">
          <div class="acd-link-line" />
          <div class="acd-link-label">{{ activeMode.channel }}</div>
        </div>
        <div class="acd-node middle" :class="activeMode.tone">
          <div class="acd-node-title">{{ activeMode.channel }}</div>
          <div class="acd-node-meta">当前通信载体</div>
        </div>
        <div class="acd-link">
          <div class="acd-link-line" />
          <div class="acd-link-label">结果返回</div>
        </div>
        <div class="acd-node">
          <div class="acd-node-title">Agent B</div>
          <div class="acd-node-meta">接收方</div>
        </div>
      </div>

      <div class="acd-panel" :class="activeMode.tone">
        <div class="acd-panel-title">{{ activeMode.label }}</div>
        <div class="acd-panel-summary">{{ activeMode.summary }}</div>
        <div class="acd-points">
          <div v-for="point in activeMode.points" :key="point" class="acd-point">{{ point }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.acd-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}
.acd-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.acd-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.acd-subtitle {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.acd-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.acd-tab {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
  font-size: 0.76rem;
}
.acd-tab.active.teal,
.acd-panel.teal .acd-point,
.acd-flow.teal .middle {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
}
.acd-tab.active.amber,
.acd-panel.amber .acd-point,
.acd-flow.amber .middle {
  border-color: #d97706;
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
}
.acd-tab.active.rose,
.acd-panel.rose .acd-point,
.acd-flow.rose .middle {
  border-color: #e11d48;
  background: rgba(225, 29, 72, 0.08);
  color: #be123c;
}
.acd-body {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1rem;
}
.acd-flow {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}
.acd-node {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  padding: 0.85rem 0.75rem;
  text-align: center;
}
.acd-node-title {
  font-weight: 700;
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
}
.acd-node-meta {
  margin-top: 0.25rem;
  font-size: 0.73rem;
  color: var(--vp-c-text-2);
}
.acd-link {
  min-width: 74px;
  text-align: center;
}
.acd-link-line {
  height: 2px;
  background: var(--vp-c-brand-1);
  position: relative;
}
.acd-link-line::after {
  content: '';
  position: absolute;
  right: -1px;
  top: -4px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid var(--vp-c-brand-1);
}
.acd-link-label {
  margin-top: 0.35rem;
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}
.acd-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  padding: 1rem;
}
.acd-panel-title {
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.acd-panel-summary {
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
.acd-points {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}
.acd-point {
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  font-size: 0.72rem;
}
@media (max-width: 768px) {
  .acd-body {
    grid-template-columns: 1fr;
  }
  .acd-flow {
    grid-template-columns: 1fr;
  }
  .acd-link {
    display: none;
  }
}
</style>
