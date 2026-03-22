<script setup lang="ts">
import { computed } from 'vue'
import { data as contentIndex } from '../data/content-index.data.js'
import type { LearningPathProps } from './types'
import { data as learningPathData } from '../data/learning-paths.data.js'

const props = defineProps<LearningPathProps>()

const visiblePaths = computed(() => {
  const allowedIds = props.pathIds?.length ? new Set(props.pathIds) : null

  return learningPaths
    .filter((path) => !allowedIds || allowedIds.has(path.pathId))
    .map((path) => ({
      ...path,
      startNode: contentIndex.contentById[path.steps[0]?.contentId],
      steps: path.steps.map((step) => ({
        ...step,
        node: contentIndex.contentById[step.contentId]
      }))
    }))
})
const learningPaths = learningPathData.learningPaths
</script>

<template>
  <div class="path-container">
    <article
      v-for="path in visiblePaths"
      :key="path.pathId"
      class="path-card"
    >
      <div class="path-header">
        <div>
          <p class="path-kicker">{{ path.pathId }}</p>
          <h3 class="path-title">{{ path.title }}</h3>
        </div>
        <span class="path-badge">{{ path.steps.length }} 步</span>
      </div>

      <p class="path-goal">{{ path.goal }}</p>

      <div class="path-panel">
        <h4>适合谁</h4>
        <ul>
          <li v-for="audience in path.audience" :key="audience">{{ audience }}</li>
        </ul>
      </div>

      <div class="path-panel">
        <h4>开始前先确认</h4>
        <ul>
          <li v-for="criteria in path.entryCriteria" :key="criteria">{{ criteria }}</li>
        </ul>
      </div>

      <div class="path-panel">
        <h4>走完你会得到</h4>
        <ul>
          <li v-for="outcome in path.outcomes" :key="outcome">{{ outcome }}</li>
        </ul>
      </div>

      <div class="start-card">
        <span>推荐起点</span>
        <a :href="path.recommendedStart">{{ path.startNode?.navigationLabel ?? path.recommendedStart }}</a>
      </div>

      <ol class="step-list">
        <li
          v-for="step in path.steps"
          :key="`${path.pathId}-${step.order}`"
          class="step-item"
        >
          <div class="step-order">{{ step.order }}</div>
          <div class="step-body">
            <a :href="step.node?.url ?? path.recommendedStart" class="step-title">
              {{ step.node?.navigationLabel ?? step.contentId }}
            </a>
            <p class="step-reason">{{ step.reason }}</p>
          </div>
        </li>
      </ol>

      <a :href="path.recommendedStart" class="path-cta">从这条路线开始</a>
    </article>
  </div>
</template>

<style scoped>
.path-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
  margin: 28px 0 56px;
}

.path-card {
  padding: 24px;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  border: 1px solid var(--vp-c-divider);
  box-shadow: var(--card-shadow-light);
  display: grid;
  gap: 16px;
}

.path-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.path-kicker {
  margin: 0 0 8px;
  color: var(--vp-c-brand-1);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.path-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--vp-c-text-1);
}

.path-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 600;
}

.path-goal {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.path-panel {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
}

.path-panel h4 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}

.path-panel ul {
  margin: 0;
  padding-left: 18px;
  color: var(--vp-c-text-2);
  display: grid;
  gap: 8px;
}

.start-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px dashed var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
}

.start-card span {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.start-card a,
.step-title,
.path-cta {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.start-card a:hover,
.step-title:hover,
.path-cta:hover {
  text-decoration: underline;
}

.step-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.step-item {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 12px;
  align-items: flex-start;
}

.step-order {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-brand-1);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-body {
  min-width: 0;
}

.step-title {
  display: inline-block;
  margin-bottom: 4px;
  font-weight: 600;
}

.step-reason {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.path-cta {
  font-weight: 700;
}
</style>
