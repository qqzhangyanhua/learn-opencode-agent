<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as contentIndex } from '../data/content-index.data.js'
import type { ChapterLearningGuideProps } from './types'

const props = defineProps<ChapterLearningGuideProps>()
const { frontmatter, title } = useData()

const currentNode = computed(() => {
  const contentId = (frontmatter.value.contentId as string | undefined)?.trim()
  if (!contentId) {
    return null
  }

  return contentIndex.contentById[contentId] ?? null
})

const sectionSummary = computed(() => {
  if (!currentNode.value) {
    return null
  }

  return contentIndex.sectionById[currentNode.value.sectionId]
})
</script>

<template>
  <section class="chapter-hero" :class="currentNode?.sectionId ?? 'support'">
    <h1 class="hero-title">{{ title }}</h1>

    <p class="hero-description">
      {{ currentNode?.roleDescription ?? sectionSummary?.roleDescription ?? '帮助你快速判断本章定位、前置要求与学习目标。' }}
    </p>
  </section>
</template>

<style scoped>
/* Hero Container */
.chapter-hero {
  position: relative;
  margin: 0 0 48px;
  padding: 32px 40px;
  border-radius: 16px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
  border: 1px solid var(--vp-c-divider);
}

.chapter-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0d9488 0%, #3b82f6 100%);
  border-radius: 16px 16px 0 0;
}

.chapter-hero.practice::before {
  background: linear-gradient(90deg, #ea580c 0%, #f97316 100%);
}

.chapter-hero.intermediate::before {
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
}

/* Title */
.hero-title {
  margin: 0 0 16px;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

/* Description */
.hero-description {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  max-width: 720px;
}

.hero-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 960px) {
  .chapter-hero {
    padding: 28px 32px;
  }

  .hero-title {
    font-size: 1.75rem;
  }
}

@media (max-width: 640px) {
  .chapter-hero {
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
