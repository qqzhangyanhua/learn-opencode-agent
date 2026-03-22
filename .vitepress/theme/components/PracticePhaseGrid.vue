<script setup lang="ts">
import { computed } from 'vue'
import { data as learningPathData } from '../data/learning-paths.data.js'
import type { PracticePhaseGridProps } from './types'

const props = defineProps<PracticePhaseGridProps>()

const phases = computed(() => props.phases ?? learningPathData.practicePhases)
</script>

<template>
  <div class="phase-grid">
    <a
      v-for="phase in phases"
      :key="phase.phaseId"
      :href="phase.recommendedStart"
      class="phase-card"
    >
      <div class="phase-id">Phase {{ phase.order }}</div>
      <div class="phase-title">{{ phase.title }}</div>
      <div class="phase-subtitle">{{ phase.subtitle }}</div>
      <div class="phase-summary">{{ phase.summary }}</div>
      <div class="phase-dots">
        <span
          v-for="projectId in phase.projectIds"
          :key="projectId"
          class="dot"
        />
      </div>
    </a>
  </div>
</template>

<style scoped>
.phase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.phase-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 18px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s;
  display: block;
}

.phase-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.phase-id {
  color: #f97316;
  font-size: 11px;
  font-family: monospace;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.phase-title {
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.phase-subtitle {
  color: var(--vp-c-text-2);
  font-size: 11px;
  margin-bottom: 8px;
  line-height: 1.5;
}

.phase-summary {
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 10px;
}

.phase-dots {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dot {
  width: 18px;
  height: 4px;
  background: #ea580c;
  border-radius: 2px;
  opacity: 0.8;
}
</style>
