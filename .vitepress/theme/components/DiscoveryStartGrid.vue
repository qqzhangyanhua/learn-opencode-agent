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
  <section class="discovery-start-grid">
    <article
      v-for="route in routes"
      :key="route.goalId"
      class="start-card"
    >
      <div class="start-card-copy">
        <p class="start-card-kicker">{{ route.title }}</p>
        <h3>先读什么</h3>
      </div>

      <a :href="route.recommendedStart.href" class="start-primary-link">
        {{ route.recommendedStart.title }}
      </a>

      <p class="start-summary">{{ route.recommendedStart.summary }}</p>

      <div class="start-meta">
        <DiscoveryTypeBadge :label="route.recommendedStart.contentTypeLabel" />
        <span>{{ route.recommendedStart.estimatedTime }}</span>
      </div>

      <div class="continue-list">
        <p>然后继续：</p>
        <ul>
          <li v-for="item in route.continueWith" :key="item.contentId">
            <a :href="item.href">{{ item.title }}</a>
            <DiscoveryTypeBadge :label="item.contentTypeLabel" />
          </li>
        </ul>
      </div>
    </article>
  </section>
</template>

<style scoped>
.discovery-start-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  margin: 12px 0 20px;
}

.start-card {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-left: 3px solid var(--vp-c-divider);
  border-radius: 0 6px 6px 0;
  background: var(--vp-c-bg-alt);
}

.start-card-copy h3,
.start-card-copy p,
.continue-list p {
  margin: 0;
}

.start-card-kicker {
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  font-weight: 600;
}

.start-card-copy h3 {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.start-primary-link {
  color: var(--vp-c-brand-1);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
}

.start-primary-link:hover,
.continue-list a:hover {
  text-decoration: underline;
}

.start-summary {
  margin: 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.start-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  color: var(--vp-c-text-3);
  font-size: 0.72rem;
}

.continue-list p {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

.continue-list ul {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.continue-list li {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
  padding: 5px 8px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

.continue-list a {
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  font-weight: 400;
  text-decoration: none;
}

.continue-list a:hover {
  color: var(--vp-c-brand-1);
}
</style>
