<script setup lang="ts">
import type { PlanningChoice } from './types'

interface PlanningDecisionPanelProps {
  title: string
  prompt: string
  hint?: string
  choices: PlanningChoice[]
  disabled?: boolean
}

const props = defineProps<PlanningDecisionPanelProps>()

const emit = defineEmits<{
  choose: [choiceId: string]
}>()

function onChoose(choiceId: string) {
  if (props.disabled) return
  emit('choose', choiceId)
}
</script>

<template>
  <aside class="planning-decision-panel">
    <h4>{{ title }}</h4>
    <p class="planning-prompt">{{ prompt }}</p>
    <p v-if="hint" class="planning-hint">{{ hint }}</p>
    <div class="planning-choices">
      <button
        v-for="choice in choices"
        :key="choice.id"
        type="button"
        class="planning-choice-btn"
        :disabled="disabled"
        @click="onChoose(choice.id)"
      >
        <span class="planning-choice-label">{{ choice.label }}</span>
        <span class="planning-choice-summary">{{ choice.summary }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.planning-decision-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
}

h4 {
  margin: 0 0 0.5rem;
  color: var(--vp-c-text-1);
}

.planning-prompt,
.planning-hint {
  margin: 0 0 0.5rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.planning-hint {
  font-size: 0.85rem;
}

.planning-choices {
  display: grid;
  gap: 0.5rem;
}

.planning-choice-btn {
  text-align: left;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  padding: 0.7rem 0.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.planning-choice-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.planning-choice-label {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.planning-choice-summary {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}
</style>
