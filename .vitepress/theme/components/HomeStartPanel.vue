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

        <div class="start-card-audience">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="audience-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span class="audience-text"><strong>适合：</strong>{{ card.audience }}</span>
        </div>

        <div class="start-card-path">
          <div class="path-step">
            <span class="path-label">1. 起步锚点</span>
            <a :href="card.startHref">{{ card.startLabel }}</a>
          </div>
          <div class="path-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </div>
          <div class="path-step">
            <span class="path-label">2. 下一步去哪</span>
            <a :href="card.nextHref">{{ card.nextLabel }}</a>
          </div>
        </div>

        <div class="start-card-footer">
          <a :href="card.startHref" class="start-card-cta">
            进入路线
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cta-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </a>
          <span class="start-card-note">{{ card.sectionSummary }}</span>
        </div>
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
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(13, 148, 136, 0.06), inset 0 1px 0 rgba(255,255,255,0.8);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

@media (min-width: 1101px) {
  .start-card:nth-child(2) {
    transform: translateY(20px);
  }
}

.start-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 40px rgba(13, 148, 136, 0.1), inset 0 1px 0 rgba(255,255,255,0.9);
}

@media (min-width: 1101px) {
  .start-card:nth-child(2):hover {
    transform: translateY(16px);
  }
}

.start-card.practice {
  background: rgba(255, 248, 244, 0.65);
  border-color: rgba(234, 88, 12, 0.15);
}

.start-card.intermediate {
  background: rgba(245, 248, 255, 0.65);
  border-color: rgba(59, 130, 246, 0.15);
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
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--vp-c-text-1);
}

.start-card-goal {
  margin: 0;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

.start-card-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 0.95rem;
}

.start-card-audience {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.audience-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--vp-c-brand-1);
}

.start-card.practice .audience-icon { color: #ea580c; }
.start-card.intermediate .audience-icon { color: #2563eb; }

.audience-text strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.start-card-path {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.path-step {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.path-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.path-step a {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  line-height: 1.3;
  display: inline-block;
  transition: color 0.2s;
}

.start-card.practice .path-step a { color: #c2410c; }
.start-card.intermediate .path-step a { color: #2563eb; }

.path-step a:hover {
  text-decoration: underline;
}

.start-card.practice .path-step a:hover { color: #9a3412; }
.start-card.intermediate .path-step a:hover { color: #1e40af; }

.path-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  opacity: 0.4;
}

.start-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: auto;
  padding-top: 8px;
}

.start-card-cta {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--vp-c-brand-1);
  color: white;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.cta-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.start-card.practice .start-card-cta { background: #ea580c; }
.start-card.intermediate .start-card-cta { background: #2563eb; }

.start-card-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
}

.start-card.practice .start-card-cta:hover { box-shadow: 0 4px 12px rgba(234, 88, 12, 0.2); }
.start-card.intermediate .start-card-cta:hover { box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }

.start-card-cta:hover .cta-icon {
  transform: translateX(3px);
}

.start-card-note {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  text-align: right;
  flex: 1;
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
    padding: 24px 20px;
  }

  .start-card-top {
    flex-wrap: wrap;
  }

  .start-card-footer {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .start-card-note {
    text-align: center;
  }
}

html.dark .start-card {
  background: rgba(6, 22, 21, 0.6);
  border-color: rgba(13, 148, 136, 0.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05);
}

html.dark .start-card:hover {
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08);
}

html.dark .start-card.practice {
  background: rgba(20, 10, 5, 0.6);
  border-color: rgba(234, 88, 12, 0.25);
}

html.dark .start-card.intermediate {
  background: rgba(5, 10, 20, 0.6);
  border-color: rgba(59, 130, 246, 0.25);
}

html.dark .start-card-audience {
  background: rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 0.05);
}

html.dark .start-card-path {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}
</style>
