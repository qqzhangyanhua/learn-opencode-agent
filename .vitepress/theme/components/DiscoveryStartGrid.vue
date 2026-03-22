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
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
  margin: 24px 0 32px;
}

.start-card {
  display: grid;
  gap: 14px;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(180deg, rgba(59, 130, 246, 0.08), transparent 36%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.start-card-copy h3,
.start-card-copy p,
.continue-list p {
  margin: 0;
}

.start-card-kicker {
  color: var(--vp-c-brand-1);
  font-size: 0.85rem;
  font-weight: 700;
}

.start-primary-link {
  color: var(--vp-c-text-1);
  font-size: 1.05rem;
  font-weight: 700;
  text-decoration: none;
}

.start-primary-link:hover,
.continue-list a:hover {
  color: var(--vp-c-brand-1);
}

.start-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.start-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
}

.continue-list ul {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.continue-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}

.continue-list a {
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-decoration: none;
}
</style>
