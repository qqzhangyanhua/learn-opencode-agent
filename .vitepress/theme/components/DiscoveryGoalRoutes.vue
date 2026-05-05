<script setup lang="ts">
import { computed } from 'vue'
import { discoveryGoalRoutes } from '../data/discovery-content.js'
import type { DiscoveryGoalRoutesProps } from './types'

const props = defineProps<DiscoveryGoalRoutesProps>()

const routes = computed(() => {
  if (!props.goalIds?.length) {
    return discoveryGoalRoutes
  }

  return discoveryGoalRoutes.filter((route) => props.goalIds?.includes(route.goalId))
})
</script>

<template>
  <div class="goal-routes">
    <section
      v-for="route in routes"
      :key="route.goalId"
      class="goal"
    >
      <h3>{{ route.title }}</h3>
      <p class="summary">{{ route.summary }}</p>

      <p class="line">
        <span class="label">第一站</span>
        <a :href="route.recommendedStart.href">{{ route.recommendedStart.title }}</a>
      </p>

      <p class="line">
        <span class="label">接着读</span>
        <span class="next">
          <a
            v-for="(item, i) in route.continueWith"
            :key="item.contentId"
            :href="item.href"
          >
            {{ item.title }}<template v-if="i < route.continueWith.length - 1">、</template>
          </a>
        </span>
      </p>
    </section>
  </div>
</template>

<style scoped>
.goal-routes {
  display: grid;
  gap: 18px;
  margin: 12px 0 24px;
}

.goal {
  display: grid;
  gap: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.goal:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.goal h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
  letter-spacing: 0;
}

.summary {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.line {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.7;
}

.label {
  display: inline-block;
  width: 4em;
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}

.line a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.line a:hover {
  text-decoration: underline;
}

.next {
  color: var(--vp-c-text-3);
}
</style>
