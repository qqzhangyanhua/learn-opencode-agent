<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as contentIndex } from '../data/content-index.data.js'
import type {
  ChapterLearningGuideProps,
  EntryMode,
  LearningContentFrontmatter
} from './types'

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

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const learningGoals = computed(() => normalizeList(frontmatter.value.learningGoals))
const prerequisites = computed(() => normalizeList(frontmatter.value.prerequisites))

const stageLabelByMode: Record<EntryMode, string> = {
  'read-first': '先建立概念骨架，再带着问题读源码或实践',
  'build-first': '先把项目跑通，再回头理解底层机制',
  bridge: '把实践经验提升成工程判断与专题视角'
}

const audienceByMode: Record<EntryMode, string[]> = {
  'read-first': ['想先建立系统认知，再进入源码或项目的人'],
  'build-first': ['已经会调模型，想先拿一个可运行项目练手的人'],
  bridge: ['已经做过基础闭环，准备进入工程专题的人']
}

const entryMode = computed(() => {
  return (frontmatter.value.entryMode as EntryMode | undefined) ?? currentNode.value?.entryMode ?? 'read-first'
})

const audience = computed(() => {
  return props.audience?.length ? props.audience : audienceByMode[entryMode.value]
})

const estimatedTime = computed(() => {
  const value = frontmatter.value.estimatedTime
  return typeof value === 'string' && value.trim() ? value.trim() : '未标注'
})

const difficultyLabel = computed(() => {
  const difficulty = (frontmatter.value.difficulty as LearningContentFrontmatter['difficulty'] | undefined) ?? 'beginner'
  if (difficulty === 'advanced') {
    return '高阶'
  }
  if (difficulty === 'intermediate') {
    return '进阶'
  }
  return '入门'
})

const stageLabel = computed(() => props.stageLabel ?? stageLabelByMode[entryMode.value])
</script>

<template>
  <section class="chapter-learning-guide" :class="currentNode?.sectionId ?? 'support'">
    <div class="guide-overview">
      <div class="guide-heading">
        <span class="guide-badge">{{ sectionSummary?.title ?? '章节导读' }}</span>
        <span class="guide-badge subtle">{{ difficultyLabel }}</span>
        <span class="guide-badge subtle">预计 {{ estimatedTime }}</span>
      </div>

      <h2 class="guide-title">{{ title }}</h2>
      <p class="guide-summary">
        {{ currentNode?.roleDescription ?? sectionSummary?.roleDescription ?? '帮助你快速判断本章定位、前置要求与学习目标。' }}
      </p>
      <p class="guide-stage">{{ stageLabel }}</p>
    </div>

    <div class="guide-panel">
      <h3>这章会帮你完成什么</h3>
      <ul>
        <li v-for="goal in learningGoals" :key="goal">{{ goal }}</li>
      </ul>
    </div>

    <div class="guide-panel">
      <h3>开始前先确认</h3>
      <ul>
        <li v-for="item in prerequisites" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div class="guide-panel">
      <h3>适合你如果</h3>
      <ul>
        <li v-for="item in audience" :key="item">{{ item }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.chapter-learning-guide {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 0 0 28px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(180deg, rgba(13, 148, 136, 0.08), transparent 44%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.chapter-learning-guide.practice {
  background:
    linear-gradient(180deg, rgba(234, 88, 12, 0.12), transparent 44%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.chapter-learning-guide.intermediate {
  background:
    linear-gradient(180deg, rgba(59, 130, 246, 0.12), transparent 44%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.guide-overview,
.guide-panel {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.58);
}

.dark .guide-overview,
.dark .guide-panel {
  background: rgba(15, 23, 42, 0.55);
}

.guide-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.guide-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 700;
}

.guide-badge.subtle {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.guide-title {
  margin: 0 0 10px;
  font-size: 1.4rem;
  line-height: 1.35;
  color: var(--vp-c-text-1);
}

.guide-summary,
.guide-stage {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.8;
}

.guide-stage {
  margin-top: 12px;
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.guide-panel h3 {
  margin: 0 0 12px;
  font-size: 0.98rem;
  color: var(--vp-c-text-1);
}

.guide-panel ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--vp-c-text-2);
}

@media (max-width: 1180px) {
  .chapter-learning-guide {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .chapter-learning-guide {
    padding: 16px;
    margin-bottom: 24px;
  }

  .guide-overview,
  .guide-panel {
    padding: 16px;
  }

  .guide-title {
    font-size: 1.2rem;
  }
}
</style>
