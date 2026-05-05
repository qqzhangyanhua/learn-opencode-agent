<script setup lang="ts">
import { computed } from 'vue'
import { discoveryGoalRoutes } from '../data/discovery-content.js'
import type { DiscoveryStartGridProps } from './types'

const props = defineProps<DiscoveryStartGridProps>()

const routes = computed(() => {
  if (!props.goalIds?.length) {
    return discoveryGoalRoutes
  }

  return discoveryGoalRoutes.filter((route) => props.goalIds?.includes(route.goalId))
})
</script>

<template>
  <ul class="start-list">
    <li v-for="route in routes" :key="route.goalId">
      <span class="goal">{{ route.title }}</span>
      <span class="arrow">→</span>
      <a :href="route.recommendedStart.href">{{ route.recommendedStart.title }}</a>
      <span class="time">{{ route.recommendedStart.estimatedTime }}</span>
    </li>
  </ul>
</template>

<style scoped>
.start-list {
  list-style: none;
  margin: 12px 0 24px;
  padding: 0;
  display: grid;
  gap: 6px;
}

.start-list li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.88rem;
  line-height: 1.6;
}

.goal {
  color: var(--vp-c-text-1);
  min-width: 9em;
}

.arrow {
  color: var(--vp-c-text-3);
}

.start-list a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.start-list a:hover {
  text-decoration: underline;
}

.time {
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}
</style>
