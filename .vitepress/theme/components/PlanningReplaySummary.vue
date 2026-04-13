<script setup lang="ts">
import type { PlanningReplaySummary as ReplaySummaryData } from './types'

interface PlanningReplaySummaryProps {
  summary: ReplaySummaryData
  selectedPath: string[]
  didReplan: boolean
}

defineProps<PlanningReplaySummaryProps>()
</script>

<template>
  <section class="planning-replay-summary">
    <h4>{{ summary.headline }}</h4>
    <p class="planning-replay-flag">
      本轮路径：{{ selectedPath.join(' → ') || '无' }} ｜重规划：{{ didReplan ? '是' : '否' }}
    </p>

    <div>
      <h5>关键收获</h5>
      <ul>
        <li v-for="item in summary.takeaways" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div>
      <h5>最小可复刻模块</h5>
      <ul>
        <li v-for="moduleItem in summary.modules" :key="moduleItem.name">
          <strong>{{ moduleItem.name }}：</strong>{{ moduleItem.purpose }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.planning-replay-summary {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  background: var(--vp-c-bg-soft);
  display: grid;
  gap: 0.85rem;
}

h4,
h5,
p,
ul {
  margin: 0;
}

h4 {
  color: var(--vp-c-text-1);
}

h5 {
  margin-bottom: 0.4rem;
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
}

ul {
  padding-left: 1.15rem;
  color: var(--vp-c-text-2);
  display: grid;
  gap: 0.25rem;
}

.planning-replay-flag {
  color: var(--vp-c-brand-1);
  font-size: 0.85rem;
}
</style>
