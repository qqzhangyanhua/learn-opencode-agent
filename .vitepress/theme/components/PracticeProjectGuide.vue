<script setup lang="ts">
import { computed } from 'vue'
import { getPracticeProjectById } from '../data/practice-projects.js'
import LearningProgressToggle from './LearningProgressToggle.vue'
import type { PracticeProjectGuideProps } from './types'

const props = defineProps<PracticeProjectGuideProps>()

const project = computed(() => getPracticeProjectById(props.projectId))

function difficultyLabel(value: string) {
  if (value === 'advanced') return '高阶'
  if (value === 'intermediate') return '进阶'
  return '入门'
}

</script>

<template>
  <section v-if="project" class="practice-hero">
    <h1 class="hero-title">{{ project.projectTitle }}</h1>
    <p class="hero-description">{{ project.summary }}</p>

    <LearningProgressToggle
      :content-id="project.projectId"
      content-type="practice"
    />

    <div class="hero-run">
      <RunCommand
        :command="project.runCommand"
        :verified="true"
        :hint="project.runModeHint"
      />
    </div>
  </section>
</template>

<style scoped>
/* Practice Hero Container */
.practice-hero {
  position: relative;
  margin: 0 0 48px;
  padding: 32px 40px;
  border-radius: 16px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
  border: 1px solid var(--vp-c-divider);
}

.practice-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #ea580c 0%, #f97316 100%);
  border-radius: 16px 16px 0 0;
}

/* Title */
.hero-title {
  margin: 0 0 16px;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  background: linear-gradient(90deg, #ea580c 0%, #f97316 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Description */
.hero-description {
  margin: 0 0 24px;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  max-width: 720px;
}

/* Run Section */
.hero-run {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Responsive */
@media (max-width: 960px) {
  .practice-hero {
    padding: 28px 32px;
  }

  .hero-title {
    font-size: 1.75rem;
  }
}

@media (max-width: 640px) {
  .practice-hero {
    padding: 24px 20px;
    margin-bottom: 32px;
  }

  .hero-title {
    font-size: 1.5rem;
  }

  .hero-description {
    font-size: 0.95rem;
  }
}
</style>
