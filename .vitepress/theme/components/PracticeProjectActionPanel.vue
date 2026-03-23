<script setup lang="ts">
import { computed } from 'vue'
import { getPracticeProjectById } from '../data/practice-projects.js'
import type { PracticeProjectActionPanelProps } from './types'

const props = withDefaults(defineProps<PracticeProjectActionPanelProps>(), {
  title: '做完这一章，怎么判断自己过关'
})

const project = computed(() => getPracticeProjectById(props.projectId))
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
  </section>
</template>

<style scoped>
.practice-project-action-panel {
  margin: 40px 0 24px;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.action-column h2 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.action-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.action-list li {
  padding: 10px 0;
  padding-left: 24px;
  position: relative;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.action-list li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: var(--vp-c-brand-1);
  font-weight: bold;
}

.action-list span {
  display: block;
  color: var(--vp-c-text-1);
}
</style>
