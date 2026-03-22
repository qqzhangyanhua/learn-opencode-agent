<script setup lang="ts">
import { computed } from 'vue'
import { data as contentIndex } from '../data/content-index.data.js'
import { data as learningPathData } from '../data/learning-paths.data.js'
import type { LearningPathDefinition, SectionId } from './types'

type StartCardTone = 'theory' | 'practice' | 'intermediate'

interface StartCardDefinition {
  pathId: LearningPathDefinition['pathId']
  label: '先看源码' | '先做项目' | '先补工程判断'
  tone: StartCardTone
  sectionId: SectionId
  summary: string
}

const cardDefinitions: StartCardDefinition[] = [
  {
    pathId: 'theory-first',
    label: '先看源码',
    tone: 'theory',
    sectionId: 'theory',
    summary: '适合想先把 Agent 主链路、工具系统和会话循环串起来，再带着结构感进入项目。'
  },
  {
    pathId: 'practice-first',
    label: '先做项目',
    tone: 'practice',
    sectionId: 'practice',
    summary: '适合已经会调模型、想先抄一个最小可运行 Agent，再回头补理论的人。'
  },
  {
    pathId: 'engineering-depth',
    label: '先补工程判断',
    tone: 'intermediate',
    sectionId: 'intermediate',
    summary: '适合已经做过简单 Demo，想快速补齐 Planning、上下文工程和系统边界意识。'
  }
]

const cards = computed(() => cardDefinitions.map((definition) => {
  const path = learningPathData.learningPaths.find((item) => item.pathId === definition.pathId)
  const section = contentIndex.sectionById[definition.sectionId]

  if (!path) {
    throw new Error(`未找到学习路径 ${definition.pathId}`)
  }

  const startNode = contentIndex.contentNodes.find((node) => node.url === path.recommendedStart)
  const nextNode = path.steps[1] ? contentIndex.contentById[path.steps[1].contentId] : null

  return {
    ...definition,
    title: path.title,
    goal: path.goal,
    audience: path.audience[0] ?? '',
    startHref: path.recommendedStart,
    startLabel: startNode?.navigationLabel ?? section.title,
    nextHref: nextNode?.url ?? section.recommendedStart,
    nextLabel: nextNode?.navigationLabel ?? section.title,
    sectionTitle: section.title,
    sectionSummary: section.roleDescription
  }
}))
</script>

<template>
  <section class="home-start-panel">
    <div class="start-panel-heading">
      <p class="start-panel-kicker">Start Here</p>
      <h2>30 秒选一条适合你的起步路线</h2>
      <p class="start-panel-summary">
        你不需要先读完整目录。先选最符合当前状态的入口，站内路线会继续把你带到实践篇和中级专题。
      </p>
    </div>

    <div class="start-card-grid">
      <article
        v-for="card in cards"
        :key="card.pathId"
        class="start-card"
        :class="card.tone"
      >
        <div class="start-card-top">
          <span class="start-card-label">{{ card.label }}</span>
          <span class="start-card-section">{{ card.sectionTitle }}</span>
        </div>

        <div class="start-card-body">
          <h3>{{ card.title }}</h3>
          <p class="start-card-goal">{{ card.goal }}</p>
          <p class="start-card-summary">{{ card.summary }}</p>
        </div>

        <dl class="start-card-meta">
          <div>
            <dt>适合你如果</dt>
            <dd>{{ card.audience }}</dd>
          </div>
          <div>
            <dt>先从哪里开始</dt>
            <dd>
              <a :href="card.startHref">{{ card.startLabel }}</a>
            </dd>
          </div>
          <div>
            <dt>接下来去哪</dt>
            <dd>
              <a :href="card.nextHref">{{ card.nextLabel }}</a>
            </dd>
          </div>
        </dl>

        <p class="start-card-note">{{ card.sectionSummary }}</p>

        <a :href="card.startHref" class="start-card-cta">
          进入这条路线
        </a>
      </article>
    </div>
  </section>
</template>

<style scoped>
.home-start-panel {
  display: grid;
  gap: 24px;
  margin: 16px 0 56px;
}

.start-panel-heading {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
  display: grid;
  gap: 12px;
}

.start-panel-kicker {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.start-panel-heading h2 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
  color: var(--vp-c-text-1);
}

.start-panel-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.8;
}

.start-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.start-card {
  display: grid;
  gap: 18px;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(180deg, rgba(13, 148, 136, 0.08), transparent 28%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.start-card.practice {
  background:
    linear-gradient(180deg, rgba(234, 88, 12, 0.12), transparent 28%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.start-card.intermediate {
  background:
    linear-gradient(180deg, rgba(59, 130, 246, 0.1), transparent 28%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.start-card-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.start-card-label,
.start-card-section {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.start-card-label {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.start-card.practice .start-card-label {
  color: #c2410c;
  background: rgba(234, 88, 12, 0.12);
}

.start-card.intermediate .start-card-label {
  color: #2563eb;
  background: rgba(59, 130, 246, 0.12);
}

.start-card-section {
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
}

.start-card-body {
  display: grid;
  gap: 10px;
}

.start-card-body h3 {
  margin: 0;
  font-size: 1.22rem;
  line-height: 1.35;
}

.start-card-goal,
.start-card-summary,
.start-card-note {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

.start-card-meta {
  margin: 0;
  display: grid;
  gap: 12px;
}

.start-card-meta div {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
}

.start-card-meta dt {
  margin: 0 0 6px;
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
  font-weight: 600;
}

.start-card-meta dd {
  margin: 0;
  color: var(--vp-c-text-1);
  line-height: 1.7;
}

.start-card-meta a {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

.start-card-meta a:hover {
  text-decoration: underline;
}

.start-card-cta {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  padding: 11px 18px;
  border-radius: 10px;
  background: var(--vp-c-brand-1);
  color: white;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.start-card.practice .start-card-cta {
  background: #ea580c;
}

.start-card.intermediate .start-card-cta {
  background: #2563eb;
}

.start-card-cta:hover {
  transform: translateY(-1px);
  box-shadow: var(--card-shadow-hover);
}

@media (max-width: 1100px) {
  .start-card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home-start-panel {
    margin-bottom: 40px;
  }

  .start-panel-heading h2 {
    font-size: 1.55rem;
  }

  .start-card {
    padding: 20px;
  }

  .start-card-top {
    flex-wrap: wrap;
  }
}
</style>
