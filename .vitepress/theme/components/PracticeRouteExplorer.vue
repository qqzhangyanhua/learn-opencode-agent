<script setup lang="ts">
import { computed } from 'vue'
import { practiceRoutes, practiceProjectsById } from '../data/practice-projects.js'
import type { PracticeRouteExplorerProps } from './types'

const props = defineProps<PracticeRouteExplorerProps>()

const routes = computed(() => {
  if (!props.routeIds?.length) {
    return practiceRoutes
  }

  return practiceRoutes.filter((route) => props.routeIds?.includes(route.routeId))
})

function getProjectTitle(projectId: string) {
  return practiceProjectsById[projectId]?.shortLabel ?? projectId
}

function getProjectPath(projectId: string) {
  return practiceProjectsById[projectId]?.path ?? '/practice/'
}
</script>

<template>
  <section class="practice-route-explorer">
    <article
      v-for="route in routes"
      :key="route.routeId"
      class="route-card"
    >
      <div class="route-header">
        <span class="route-badge">推荐起点</span>
        <span class="route-start">{{ getProjectTitle(route.recommendedProjectId) }}</span>
      </div>

      <h3>{{ route.title }}</h3>
      <p class="route-audience">{{ route.audience }}</p>
      <p class="route-summary">{{ route.summary }}</p>

      <ul class="route-milestones">
        <li v-for="milestone in route.milestones" :key="milestone">{{ milestone }}</li>
      </ul>

      <div class="route-support">
        <span>你会顺路经过：</span>
        <a
          v-for="projectId in route.supportingProjectIds"
          :key="projectId"
          :href="getProjectPath(projectId)"
        >
          {{ getProjectTitle(projectId) }}
        </a>
      </div>

      <div class="route-actions">
        <a :href="getProjectPath(route.recommendedProjectId)" class="route-primary">
          从 {{ getProjectTitle(route.recommendedProjectId) }} 开始
        </a>
        <a href="#course-syllabus" class="route-secondary">先看课程大纲</a>
      </div>
    </article>
  </section>
</template>

<style scoped>
.practice-route-explorer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  margin: 24px 0 32px;
}

.route-card {
  padding: 22px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background:
    radial-gradient(circle at top right, rgba(234, 88, 12, 0.14), transparent 34%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.route-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.route-badge,
.route-start {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.8rem;
  font-weight: 700;
}

.route-badge {
  background: rgba(234, 88, 12, 0.14);
  color: #c2410c;
}

.route-start {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.route-card h3 {
  margin: 0 0 10px;
  font-size: 1.15rem;
  color: var(--vp-c-text-1);
}

.route-audience,
.route-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.route-summary {
  margin-top: 10px;
}

.route-milestones {
  margin: 18px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--vp-c-text-2);
}

.route-support {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.route-support a {
  text-decoration: none;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.route-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.route-primary,
.route-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 10px 16px;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.route-primary {
  background: #ea580c;
  color: #fff;
}

.route-secondary {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.route-primary:hover,
.route-secondary:hover {
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .practice-route-explorer {
    gap: 14px;
  }

  .route-card {
    padding: 18px;
  }
}
</style>
