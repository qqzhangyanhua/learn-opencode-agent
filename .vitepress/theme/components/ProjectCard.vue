<script setup lang="ts">
import type { ProjectCardProps } from './types'

const props = defineProps<ProjectCardProps>()

const difficultyLabel: Record<ProjectCardProps['difficulty'], string> = {
  beginner:     '入门',
  intermediate: '进阶',
  advanced:     '高阶',
}

const difficultyColor: Record<ProjectCardProps['difficulty'], string> = {
  beginner:     '#22c55e',
  intermediate: '#f97316',
  advanced:     '#ef4444',
}
</script>

<template>
  <div class="project-card">
    <div class="project-card-header">
      <div class="project-title">{{ title }}</div>
      <div class="project-meta">
        <span class="difficulty" :style="{ color: difficultyColor[difficulty] }">
          ● {{ difficultyLabel[difficulty] }}
        </span>
        <span class="duration">时长：{{ duration }}</span>
      </div>
    </div>
    <div v-if="prerequisites.length" class="project-row">
      <span class="label">前置：</span>
      <span v-for="p in prerequisites" :key="p" class="prereq">{{ p }}</span>
    </div>
    <div v-if="tags.length" class="project-row">
      <span class="label">技术：</span>
      <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 10px;
  padding: 16px 20px;
  margin: 0 0 28px;
  background: var(--vp-c-bg-soft);
}

.project-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.project-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--vp-c-text-1);
}

.project-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  white-space: nowrap;
}

.difficulty {
  font-weight: 500;
}

.duration {
  color: var(--vp-c-text-2);
}

.project-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.prereq, .tag {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: monospace;
}
</style>
