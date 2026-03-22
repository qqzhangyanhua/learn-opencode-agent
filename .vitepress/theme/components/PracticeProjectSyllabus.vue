<script setup lang="ts">
import { computed } from 'vue'
import { data as learningPathData } from '../data/learning-paths.data.js'
import { getPracticeProjectsByIds } from '../data/practice-projects.js'
import type { PracticeProjectSyllabusProps } from './types'

const props = defineProps<PracticeProjectSyllabusProps>()

const phases = computed(() => {
  const source = props.phaseIds?.length
    ? learningPathData.practicePhases.filter((phase) => props.phaseIds?.includes(phase.phaseId))
    : learningPathData.practicePhases

  return source.map((phase) => ({
    ...phase,
    projects: getPracticeProjectsByIds(phase.projectIds)
  }))
})

function difficultyLabel(value: string) {
  if (value === 'advanced') return '高阶'
  if (value === 'intermediate') return '进阶'
  return '入门'
}
</script>

<template>
  <section class="practice-project-syllabus">
    <article
      v-for="phase in phases"
      :key="phase.phaseId"
      class="syllabus-card"
    >
      <div class="syllabus-overview">
        <div class="syllabus-heading">
          <span class="phase-badge">Phase {{ phase.order }}</span>
          <span class="phase-count">{{ phase.projectCount }} 个项目</span>
        </div>
        <h3>{{ phase.title }}</h3>
        <p class="phase-subtitle">{{ phase.subtitle }}</p>
        <p class="phase-summary">{{ phase.summary }}</p>

        <div class="phase-tags">
          <span v-for="tag in phase.themeTags" :key="tag">{{ tag }}</span>
        </div>

        <a :href="phase.recommendedStart" class="phase-start">
          从该阶段推荐起点开始
        </a>
      </div>

      <div class="syllabus-projects">
        <a
          v-for="project in phase.projects"
          :key="project.projectId"
          :href="project.path"
          class="project-chip"
        >
          <div class="project-meta">
            <span>{{ project.shortLabel }}</span>
            <span>{{ difficultyLabel(project.difficulty) }}</span>
            <span>{{ project.estimatedTime }}</span>
          </div>
          <h4>{{ project.title }}</h4>
          <p>{{ project.summary }}</p>
        </a>
      </div>
    </article>
  </section>
</template>

<style scoped>
.practice-project-syllabus {
  display: grid;
  gap: 20px;
  margin: 28px 0 36px;
}

.syllabus-card {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 18px;
  padding: 22px;
  border-radius: 24px;
  border: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(180deg, rgba(234, 88, 12, 0.08), transparent 34%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.syllabus-overview,
.project-chip {
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.62);
}

.dark .syllabus-overview,
.dark .project-chip {
  background: rgba(15, 23, 42, 0.5);
}

.syllabus-overview {
  padding: 18px;
}

.syllabus-heading {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.phase-badge,
.phase-count,
.phase-tags span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 700;
}

.phase-badge {
  background: rgba(234, 88, 12, 0.14);
  color: #c2410c;
}

.phase-count {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.syllabus-overview h3 {
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: var(--vp-c-text-1);
}

.phase-subtitle,
.phase-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.phase-summary {
  margin-top: 10px;
}

.phase-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.phase-tags span {
  background: rgba(234, 88, 12, 0.08);
  color: #c2410c;
}

.phase-start {
  display: inline-flex;
  margin-top: 18px;
  text-decoration: none;
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.syllabus-projects {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.project-chip {
  display: block;
  padding: 16px;
  text-decoration: none;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.project-chip:hover {
  transform: translateY(-2px);
  border-color: #ea580c;
}

.project-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
}

.project-chip h4 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  font-size: 1rem;
}

.project-chip p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.65;
  font-size: 0.92rem;
}

@media (max-width: 900px) {
  .syllabus-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .syllabus-card {
    padding: 18px;
  }
}
</style>
