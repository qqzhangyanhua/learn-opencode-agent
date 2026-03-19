<script setup lang="ts">
import type { PracticePhaseGridProps } from './types'

defineProps<PracticePhaseGridProps>()
</script>

<template>
  <div class="phase-grid">
    <a
      v-for="phase in phases"
      :key="phase.id"
      :href="phase.link"
      class="phase-card"
    >
      <div class="phase-id">Phase {{ phase.id }}</div>
      <div class="phase-title">{{ phase.title }}</div>
      <div class="phase-subtitle">{{ phase.subtitle }}</div>
      <div class="phase-dots">
        <span
          v-for="n in phase.chapterCount"
          :key="n"
          class="dot"
        />
      </div>
    </a>
  </div>
</template>

<style scoped>
.phase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin: 24px 0;
}

.phase-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
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
  margin-bottom: 10px;
  line-height: 1.5;
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
