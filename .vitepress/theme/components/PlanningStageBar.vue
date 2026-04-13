<script setup lang="ts">
import { computed } from 'vue'
import type { PlanningStepState } from './types'

interface PlanningStageBarProps {
  screens: PlanningStepState[]
  currentScreen: number
}

const props = defineProps<PlanningStageBarProps>()

const stageItems = computed(() =>
  props.screens.map(step => ({
    screen: step.screen,
    label: step.stageLabel
  }))
)
</script>

<template>
  <nav class="planning-stage-bar" aria-label="Planning 阶段条">
    <ol>
      <li
        v-for="item in stageItems"
        :key="item.screen"
        :class="{
          active: item.screen === currentScreen,
          done: item.screen < currentScreen
        }"
      >
        <span class="planning-stage-index">{{ item.screen }}</span>
        <span class="planning-stage-label">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.planning-stage-bar {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 0.85rem;
}

ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.5rem;
}

li {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.4rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-height: 3rem;
}

li.done {
  border-color: #16a34a;
}

li.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

.planning-stage-index {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

.planning-stage-label {
  font-size: 0.78rem;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

@media (max-width: 960px) {
  ol {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
