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
  <section class="discovery-goal-routes">
    <article
      v-for="route in routes"
      :key="route.goalId"
      class="goal-card"
    >
      <div class="goal-card-top">
        <span class="goal-kicker">按目标开始</span>
        <span class="goal-route-label">{{ route.routeLabel }}</span>
      </div>

      <h2>{{ route.title }}</h2>
      <p class="goal-audience">{{ route.audience }}</p>
      <p class="goal-summary">{{ route.summary }}</p>

      <div class="goal-start">
        <div>
          <p class="goal-label">推荐第一站</p>
          <a :href="route.recommendedStart.href" class="goal-start-link">
            {{ route.recommendedStart.title }}
          </a>
        </div>
        <DiscoveryTypeBadge :label="route.recommendedStart.contentTypeLabel" />
      </div>

      <div class="goal-support">
        <span>接下来你会经过：</span>
        <a
          v-for="item in route.continueWith"
          :key="item.contentId"
          :href="item.href"
        >
          {{ item.title }}
        </a>
      </div>

      <a :href="route.recommendedStart.href" class="goal-cta">
        从这里开始
      </a>
    </article>
  </section>
</template>

<style scoped>
.discovery-goal-routes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  margin: 12px 0 20px;
}

.goal-card {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 0 6px 6px 0;
  background: var(--vp-c-bg-alt);
}

.goal-card-top,
.goal-start,
.goal-support {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.goal-card-top {
  justify-content: space-between;
}

.goal-kicker,
.goal-route-label {
  font-size: 0.7rem;
  font-weight: 600;
}

.goal-kicker {
  color: var(--vp-c-brand-1);
}

.goal-route-label {
  color: var(--vp-c-text-3);
}

.goal-card h2 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.goal-audience {
  display: none;
}

.goal-summary {
  margin: 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.goal-label {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
}

.goal-start-link {
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
}

.goal-start-link:hover,
.goal-support a:hover {
  text-decoration: underline;
}

.goal-support {
  justify-content: flex-start;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
  gap: 4px;
}

.goal-support a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
  text-decoration: none;
}

.goal-cta {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 4px;
  color: var(--vp-c-brand-1);
  background: transparent;
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 500;
}

.goal-cta:hover {
  background: var(--vp-c-brand-soft);
}
</style>
