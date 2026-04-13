<script setup lang="ts">
interface PlanningMissionCardProps {
  missionTitle: string
  missionDescription: string
  stepTitle?: string
  stageLabel?: string
}

defineProps<PlanningMissionCardProps>()
</script>

<template>
  <header class="planning-mission-card">
    <p class="planning-mission-label">Planning 任务挑战</p>
    <h3>{{ missionTitle }}</h3>
    <p class="planning-mission-description">{{ missionDescription }}</p>
    <div v-if="stepTitle || stageLabel" class="planning-mission-meta">
      <span v-if="stepTitle">{{ stepTitle }}</span>
      <span v-if="stageLabel">{{ stageLabel }}</span>
    </div>
  </header>
</template>

<style scoped>
.planning-mission-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.planning-mission-label {
  margin: 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--vp-c-text-1);
}

.planning-mission-description {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.planning-mission-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}
</style>
