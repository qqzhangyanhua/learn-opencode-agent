<script setup lang="ts">
interface PlanningFeedbackPanelProps {
  title: string
  feedback: string
  latestChoiceLabel?: string
}

defineProps<PlanningFeedbackPanelProps>()
</script>

<template>
  <aside class="planning-feedback-panel">
    <h4>{{ title }}</h4>
    <p>{{ feedback }}</p>
    <p v-if="latestChoiceLabel" class="planning-feedback-choice">
      最近一次选择：{{ latestChoiceLabel }}
    </p>
  </aside>
</template>

<style scoped>
.planning-feedback-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

h4,
p {
  margin: 0;
}

h4 {
  color: var(--vp-c-text-1);
}

p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.planning-feedback-choice {
  color: var(--vp-c-brand-1);
  font-size: 0.85rem;
}
</style>
