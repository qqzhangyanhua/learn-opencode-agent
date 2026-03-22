<script setup lang="ts">
import { computed } from 'vue'
import { getPracticeProjectById, getPracticeProjectsByIds } from '../data/practice-projects.js'
import LearningProgressToggle from './LearningProgressToggle.vue'
import type { PracticeProjectGuideProps } from './types'

const props = defineProps<PracticeProjectGuideProps>()

const project = computed(() => getPracticeProjectById(props.projectId))
const prerequisiteProjects = computed(() =>
  project.value ? getPracticeProjectsByIds(project.value.prerequisiteProjectIds) : []
)

function difficultyLabel(value: string) {
  if (value === 'advanced') return '高阶'
  if (value === 'intermediate') return '进阶'
  return '入门'
}

const playgroundHref = computed(() => {
  if (!project.value?.supportsPlayground) {
    return null
  }

  const slug = project.value.path.split('/').filter(Boolean).at(-1)
  return slug ? `/practice/playground/?chapter=${slug}` : null
})

const progressContentId = computed(() => project.value?.projectId.trim() ?? '')
</script>

<template>
  <section v-if="project" class="practice-project-guide">
    <div class="guide-overview">
      <div class="guide-heading">
        <span class="guide-badge strong">Phase {{ project.phaseOrder }}</span>
        <span class="guide-badge">{{ project.shortLabel }}</span>
        <span class="guide-badge">{{ difficultyLabel(project.difficulty) }}</span>
        <span class="guide-badge">{{ project.estimatedTime }}</span>
        <span class="guide-badge">{{ project.runModeLabel }}</span>
      </div>

      <h2>{{ project.projectTitle }}</h2>
      <p class="guide-summary">{{ project.summary }}</p>
      <p class="guide-phase">
        {{ project.phaseTitle }} · {{ project.phaseSubtitle }}
      </p>
      <LearningProgressToggle
        :content-id="progressContentId"
        content-type="practice"
        description="把这个项目标成待练、继续或已完成，下次回来就知道该从哪接着做。"
      />
    </div>

    <div class="guide-panel">
      <h3>这章学完你要拿到什么</h3>
      <ul>
        <li v-for="goal in project.learningGoals" :key="goal">{{ goal }}</li>
      </ul>
    </div>

    <div class="guide-panel">
      <h3>开始前先确认</h3>
      <ul>
        <li v-for="item in project.prerequisites" :key="item">{{ item }}</li>
      </ul>
      <div v-if="prerequisiteProjects.length" class="guide-links">
        <a
          v-for="linkProject in prerequisiteProjects"
          :key="linkProject.projectId"
          :href="linkProject.path"
        >
          {{ linkProject.shortLabel }} {{ linkProject.title }}
        </a>
      </div>
    </div>

    <div class="guide-panel">
      <h3>推荐运行入口</h3>
      <RunCommand
        :command="project.runCommand"
        :verified="true"
        :hint="project.runModeHint"
      />
      <ul class="source-files">
        <li v-for="sourceFile in project.sourceFiles" :key="sourceFile">
          示例文件：`{{ sourceFile }}`
        </li>
      </ul>
      <a v-if="playgroundHref" :href="playgroundHref" class="guide-inline-link">
        先去在线工作台试跑
      </a>
    </div>
  </section>
</template>

<style scoped>
.practice-project-guide {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 22px 0 28px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(180deg, rgba(234, 88, 12, 0.12), transparent 42%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.guide-overview,
.guide-panel {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.62);
}

.dark .guide-overview,
.dark .guide-panel {
  background: rgba(15, 23, 42, 0.55);
}

.guide-heading {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.guide-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 12px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  font-weight: 700;
}

.guide-badge.strong {
  background: rgba(234, 88, 12, 0.14);
  color: #c2410c;
}

.guide-overview h2 {
  margin: 0 0 10px;
  font-size: 1.34rem;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.guide-summary,
.guide-phase {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

.guide-phase {
  margin-top: 10px;
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

.guide-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.guide-links a,
.guide-inline-link {
  text-decoration: none;
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.source-files {
  margin-top: 14px;
}

.guide-inline-link {
  display: inline-flex;
  margin-top: 10px;
}

@media (max-width: 1180px) {
  .practice-project-guide {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .practice-project-guide {
    padding: 16px;
    margin-bottom: 24px;
  }

  .guide-overview,
  .guide-panel {
    padding: 16px;
  }
}
</style>
