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
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
  margin: 24px 0 32px;
}

.goal-card {
  display: grid;
  gap: 16px;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background:
    radial-gradient(circle at top right, rgba(13, 148, 136, 0.12), transparent 34%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.goal-card-top,
.goal-start,
.goal-support {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.goal-kicker,
.goal-route-label {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.78rem;
  font-weight: 700;
}

.goal-kicker {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.goal-route-label {
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
}

.goal-card h2 {
  margin: 0;
  font-size: 1.18rem;
  color: var(--vp-c-text-1);
}

.goal-audience,
.goal-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

.goal-label {
  margin: 0 0 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.goal-start-link {
  color: var(--vp-c-text-1);
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
}

.goal-start-link:hover,
.goal-support a:hover {
  color: var(--vp-c-brand-1);
}

.goal-support {
  justify-content: flex-start;
  color: var(--vp-c-text-2);
  font-size: 0.92rem;
}

.goal-support a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: none;
}

.goal-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border-radius: 999px;
  padding: 10px 18px;
  background: var(--vp-c-brand-1);
  color: white;
  text-decoration: none;
  font-weight: 700;
}
</style>
