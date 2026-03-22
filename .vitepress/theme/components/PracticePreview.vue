<script setup lang="ts">
import { computed } from 'vue'
import { data as contentIndex } from '../data/content-index.data.js'
import { data as learningPathData } from '../data/learning-paths.data.js'

const theoryEntry = computed(() => contentIndex.sectionById.theory)
const practiceEntry = computed(() => contentIndex.sectionById.practice)
const intermediateEntry = computed(() => contentIndex.sectionById.intermediate)
const practicePhaseCount = computed(() => learningPathData.practicePhases.length)
const practiceProjectCount = computed(() =>
  learningPathData.practicePhases.reduce((total, phase) => total + phase.projectCount, 0)
)

const entryCards = computed(() => [
  {
    key: 'theory',
    label: '先读源码',
    title: theoryEntry.value.title,
    subtitle: theoryEntry.value.countLabel,
    description: theoryEntry.value.roleDescription,
    href: theoryEntry.value.recommendedStart,
    tone: 'theory'
  },
  {
    key: 'practice',
    label: '先动手实践',
    title: practiceEntry.value.title,
    subtitle: `${practiceProjectCount.value} 个项目 · ${practicePhaseCount.value} 个阶段`,
    description: practiceEntry.value.roleDescription,
    href: practiceEntry.value.recommendedStart,
    tone: 'practice'
  },
  {
    key: 'intermediate',
    label: '带着问题进阶',
    title: intermediateEntry.value.title,
    subtitle: intermediateEntry.value.countLabel,
    description: intermediateEntry.value.roleDescription,
    href: intermediateEntry.value.recommendedStart,
    tone: 'intermediate'
  }
])
</script>

<template>
  <div class="dual-track-container">
    <article
      v-for="card in entryCards"
      :key="card.key"
      class="track-card"
      :class="card.tone"
    >
      <p class="track-label">{{ card.label }}</p>
      <div class="track-header">
        <h3>{{ card.title }}</h3>
        <span class="track-subtitle">{{ card.subtitle }}</span>
      </div>
      <p class="track-description">{{ card.description }}</p>
      <a :href="card.href" class="track-btn" :class="{ primary: card.tone === 'practice' }">
        从这里开始 →
      </a>
    </article>
  </div>
</template>

<style scoped>
.dual-track-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin: 32px 0;
}

.track-card {
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
}

.track-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.track-card.practice:hover {
  border-color: #ea580c;
}

.track-label {
  margin: 0 0 12px;
  color: var(--vp-c-brand-1);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.track-card.practice .track-label {
  color: #ea580c;
}

.track-header {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.track-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
}

.track-subtitle {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.track-description {
  margin: 0 0 20px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
}

.track-btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: transparent;
}

.track-btn:hover {
  background: var(--vp-c-brand-1);
  color: white;
  transform: translateX(2px);
}

.track-btn.primary {
  background: #ea580c;
  color: white;
  border-color: #ea580c;
}

.track-btn.primary:hover {
  background: #c2410c;
  border-color: #c2410c;
}

@media (max-width: 640px) {
  .dual-track-container {
    grid-template-columns: 1fr;
  }

  .track-card {
    padding: 24px;
  }
}
</style>
