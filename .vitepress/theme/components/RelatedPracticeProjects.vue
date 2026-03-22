<script setup lang="ts">
import { computed } from 'vue'
import {
  findPracticeProjectsByTheoryPath,
  getPracticeProjectsByIds
} from '../data/practice-projects.js'
import type { RelatedPracticeProjectsProps } from './types'

const props = withDefaults(defineProps<RelatedPracticeProjectsProps>(), {
  title: '看完这章，马上去练哪几个项目',
  description: '先把概念映射到一个可运行项目，再回来看工程判断会更稳。'
})

const projects = computed(() => {
  if (props.projectIds?.length) {
    return getPracticeProjectsByIds(props.projectIds)
  }

  if (props.theoryPath) {
    return findPracticeProjectsByTheoryPath(props.theoryPath)
  }

  return []
})

function difficultyLabel(value: string) {
  if (value === 'advanced') return '高阶'
  if (value === 'intermediate') return '进阶'
  return '入门'
}
</script>

<template>
  <section v-if="projects.length" class="related-practice-projects">
    <div class="bridge-copy">
      <span class="bridge-badge">看完就练</span>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>

    <div class="bridge-grid">
      <a
        v-for="project in projects"
        :key="project.projectId"
        :href="project.path"
        class="bridge-card"
      >
        <div class="bridge-meta">
          <span>{{ project.shortLabel }}</span>
          <span>Phase {{ project.phaseOrder }}</span>
          <span>{{ difficultyLabel(project.difficulty) }}</span>
          <span>{{ project.estimatedTime }}</span>
        </div>
        <h3>{{ project.title }}</h3>
        <p>{{ project.summary }}</p>
      </a>
    </div>
  </section>
</template>

<style scoped>
.related-practice-projects {
  margin: 22px 0 28px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(180deg, rgba(234, 88, 12, 0.12), transparent 40%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.bridge-copy h2 {
  margin: 0 0 10px;
  font-size: 1.18rem;
  color: var(--vp-c-text-1);
}

.bridge-copy p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

.bridge-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 12px;
  margin-bottom: 12px;
  background: rgba(234, 88, 12, 0.14);
  color: #c2410c;
  font-size: 0.8rem;
  font-weight: 700;
}

.bridge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.bridge-card {
  display: block;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.62);
  text-decoration: none;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.dark .bridge-card {
  background: rgba(15, 23, 42, 0.55);
}

.bridge-card:hover {
  transform: translateY(-2px);
  border-color: #ea580c;
}

.bridge-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
}

.bridge-card h3 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  font-size: 1rem;
}

.bridge-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

@media (max-width: 640px) {
  .related-practice-projects {
    padding: 16px;
  }
}
</style>
