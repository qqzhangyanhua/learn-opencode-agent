<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const stages = ['测试用例', 'Agent 输出', '确定性校验', 'LLM Judge', '评分汇总']
const cases = [
  { id: 'tc-01', label: 'JSON 结构化输出', score: 9.1, status: 'pass' },
  { id: 'tc-02', label: '事实型问答', score: 7.8, status: 'pass' },
  { id: 'tc-03', label: '长回答格式约束', score: 6.2, status: 'flag' },
]

const currentStage = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const currentLabel = computed(() => stages[currentStage.value])

onMounted(() => {
  timer = setInterval(() => {
    currentStage.value = (currentStage.value + 1) % stages.length
  }, 1500)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="ep-root">
    <div class="ep-header">
      <div class="ep-title">P21 评估流水线</div>
      <div class="ep-status">当前阶段：{{ currentLabel }}</div>
    </div>

    <div class="ep-stages">
      <div
        v-for="(stage, index) in stages"
        :key="stage"
        class="ep-stage"
        :class="{ active: currentStage === index, done: currentStage > index }"
      >
        <div class="ep-stage-index">{{ index + 1 }}</div>
        <div class="ep-stage-label">{{ stage }}</div>
      </div>
    </div>

    <div class="ep-body">
      <div class="ep-cases">
        <div v-for="testCase in cases" :key="testCase.id" class="ep-case">
          <div>
            <div class="ep-case-id">{{ testCase.id }}</div>
            <div class="ep-case-label">{{ testCase.label }}</div>
          </div>
          <div class="ep-case-score" :class="testCase.status">{{ testCase.score }}</div>
        </div>
      </div>

      <div class="ep-panel">
        <div class="ep-panel-title">为什么这一步重要</div>
        <div v-if="currentStage === 0" class="ep-panel-text">先定义 case，评估才有可重复的输入边界。</div>
        <div v-else-if="currentStage === 1" class="ep-panel-text">Agent 输出是被评估对象，不是最终真理。</div>
        <div v-else-if="currentStage === 2" class="ep-panel-text">正则、JSON 解析和关键词检查负责硬约束。</div>
        <div v-else-if="currentStage === 3" class="ep-panel-text">LLM Judge 负责评审“好不好”，而不是“有没有”。</div>
        <div v-else class="ep-panel-text">最终看通过率、均分和异常 case，而不是只盯一个样本。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ep-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}
.ep-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.ep-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.ep-status {
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}
.ep-stages {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.6rem;
}
.ep-stage {
  padding: 0.75rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  text-align: center;
}
.ep-stage.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
}
.ep-stage.done {
  border-color: rgba(13, 148, 136, 0.25);
}
.ep-stage-index {
  width: 22px;
  height: 22px;
  margin: 0 auto 0.35rem;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  line-height: 22px;
  font-size: 0.72rem;
  font-weight: 700;
}
.ep-stage-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.ep-body {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 1rem;
  margin-top: 1rem;
}
.ep-cases,
.ep-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  padding: 0.9rem;
}
.ep-case {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 0;
}
.ep-case + .ep-case {
  border-top: 1px solid var(--vp-c-divider);
}
.ep-case-id {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.ep-case-label {
  margin-top: 0.2rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-1);
}
.ep-case-score {
  min-width: 50px;
  text-align: center;
  padding: 0.28rem 0.5rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.78rem;
}
.ep-case-score.pass {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.ep-case-score.flag {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}
.ep-panel-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.ep-panel-text {
  margin-top: 0.65rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}
@media (max-width: 768px) {
  .ep-stages,
  .ep-body {
    grid-template-columns: 1fr;
  }
}
</style>
