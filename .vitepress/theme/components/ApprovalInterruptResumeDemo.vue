<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const scenarios = [
  {
    label: '批准继续',
    states: ['运行中', '命中 critical 工具', '保存检查点', '等待审批', 'resume(true)', '继续执行'],
    result: 'Agent 在拿到批准后恢复执行，不需要从头再来。',
  },
  {
    label: '拒绝执行',
    states: ['运行中', '命中 critical 工具', '保存检查点', '等待审批', 'resume(false)', '返回拒绝结果'],
    result: 'Agent 在检查点收口，把拒绝结果作为最终状态返回。',
  },
]

const currentScenario = ref(0)
const currentState = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const scenario = computed(() => scenarios[currentScenario.value])

function selectScenario(index: number) {
  currentScenario.value = index
  currentState.value = 0
}

onMounted(() => {
  timer = setInterval(() => {
    if (currentState.value >= scenario.value.states.length - 1) {
      currentState.value = 0
      currentScenario.value = (currentScenario.value + 1) % scenarios.length
      return
    }
    currentState.value += 1
  }, 1400)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="ai-root">
    <div class="ai-header">
      <div class="ai-title">P28 Interrupt / Resume 协议</div>
      <div class="ai-tabs">
        <button
          v-for="(item, index) in scenarios"
          :key="item.label"
          class="ai-tab"
          :class="{ active: currentScenario === index }"
          @click="selectScenario(index)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="ai-states">
      <div
        v-for="(state, index) in scenario.states"
        :key="state"
        class="ai-state"
        :class="{ active: currentState === index, done: currentState > index }"
      >
        {{ state }}
      </div>
    </div>

    <div class="ai-result">{{ scenario.result }}</div>
  </div>
</template>

<style scoped>
.ai-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}
.ai-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.ai-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.ai-tabs {
  display: flex;
  gap: 0.5rem;
}
.ai-tab {
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  padding: 0.35rem 0.8rem;
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.ai-tab.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
}
.ai-states {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.55rem;
}
.ai-state {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  padding: 0.75rem 0.55rem;
  text-align: center;
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}
.ai-state.done {
  border-color: rgba(13, 148, 136, 0.25);
}
.ai-state.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
  font-weight: 700;
}
.ai-result {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}
@media (max-width: 768px) {
  .ai-states {
    grid-template-columns: 1fr;
  }
}
</style>
