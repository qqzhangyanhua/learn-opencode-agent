<script setup lang="ts">
import { computed } from 'vue'
import { getPracticeProjectById, getPracticeProjectsByIds } from '../data/practice-projects.js'
import type { PracticeProjectActionPanelProps } from './types'

const props = withDefaults(defineProps<PracticeProjectActionPanelProps>(), {
  title: '做完这一章，怎么判断自己过关'
})

const project = computed(() => getPracticeProjectById(props.projectId))
const nextProjects = computed(() =>
  project.value ? getPracticeProjectsByIds(project.value.nextProjectIds) : []
)

const fallbackLinks = [
  {
    label: '回到实践篇首页',
    href: '/practice/',
    description: '重新按目标或阶段选择下一步项目。'
  },
  {
    label: '进入中级篇',
    href: '/intermediate/',
    description: '如果你开始关心更强的工程判断，可以从这里继续。'
  }
]
</script>

<template>
  <section v-if="project" class="practice-project-action-panel">
    <div class="action-column">
      <h2>{{ title }}</h2>
      <ul class="action-list">
        <li v-for="signal in project.completionSignals" :key="signal">
          <span>{{ signal }}</span>
        </li>
      </ul>
    </div>

    <div class="action-column">
      <h2>回看哪些理论判断</h2>
      <ul class="action-list">
        <li v-for="link in project.relatedTheory" :key="link.href">
          <a :href="link.href">{{ link.label }}</a>
          <p>{{ link.description }}</p>
        </li>
      </ul>
    </div>

    <div class="action-column">
      <h2>下一步继续去哪</h2>
      <ul v-if="nextProjects.length" class="action-list">
        <li v-for="nextProject in nextProjects" :key="nextProject.projectId">
          <a :href="nextProject.path">{{ nextProject.shortLabel }} {{ nextProject.title }}</a>
          <p>{{ nextProject.summary }}</p>
        </li>
      </ul>
      <ul v-else class="action-list">
        <li v-for="link in fallbackLinks" :key="link.href">
          <a :href="link.href">{{ link.label }}</a>
          <p>{{ link.description }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.practice-project-action-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 32px 0 24px;
}

.action-column {
  padding: 20px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.action-column h2 {
  margin: 0 0 14px;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.action-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.action-list li {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}

.action-list a,
.action-list span {
  display: inline-block;
  color: var(--vp-c-text-1);
  font-weight: 700;
  text-decoration: none;
  line-height: 1.65;
}

.action-list a:hover {
  color: var(--vp-c-brand-1);
}

.action-list p {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

@media (max-width: 1080px) {
  .practice-project-action-panel {
    grid-template-columns: 1fr;
  }
}
</style>
