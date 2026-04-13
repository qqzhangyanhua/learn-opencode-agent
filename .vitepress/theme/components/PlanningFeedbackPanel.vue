<script setup lang="ts">
import { computed } from 'vue'

interface PlanningFeedbackPanelProps {
  title: string
  feedback: string
  feedbackByChoice?: Partial<Record<string, string>>
  activeChoiceId?: string
  latestChoiceLabel?: string
}

const props = defineProps<PlanningFeedbackPanelProps>()

const resolvedFeedback = computed(() => {
  if (props.activeChoiceId && props.feedbackByChoice?.[props.activeChoiceId]) {
    return props.feedbackByChoice[props.activeChoiceId] ?? props.feedback
  }
  return props.feedback
})
</script>

<template>
  <aside class="planning-feedback-panel">
    <h4>{{ props.title }}</h4>
    <p>{{ resolvedFeedback }}</p>
    <p v-if="props.latestChoiceLabel" class="planning-feedback-choice">
      最近一次选择：{{ props.latestChoiceLabel }}
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
