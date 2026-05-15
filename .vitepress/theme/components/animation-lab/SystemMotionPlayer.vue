<script setup lang="ts">
import { computed, ref } from 'vue'
import TracePanel from './TracePanel.vue'
import type { Experiment } from './type'

const props = defineProps<{
  experiment: Experiment
}>()

const currentStepIndex = ref(0)
const isTraceCollapsed = ref(false)

const currentStep = computed(() => props.experiment.steps[currentStepIndex.value])
const isFirstStep = computed(() => currentStepIndex.value === 0)
const isLastStep = computed(() => currentStepIndex.value === props.experiment.steps.length - 1)

function previousStep() {
  currentStepIndex.value = Math.max(0, currentStepIndex.value - 1)
}

function nextStep() {
  currentStepIndex.value = Math.min(props.experiment.steps.length - 1, currentStepIndex.value + 1)
}

function resetSteps() {
  currentStepIndex.value = 0
}

function toggleTrace() {
  isTraceCollapsed.value = !isTraceCollapsed.value
}
</script>

<template>
  <section class="system-motion-player" :class="{ 'trace-collapsed': isTraceCollapsed }">
    <header class="player-header">
      <div>
        <p class="player-kicker">Animation Lab</p>
        <h2>{{ experiment.title }}</h2>
        <p>{{ experiment.summary }}</p>
      </div>
      <div class="player-step-count" aria-live="polite">
        {{ currentStepIndex + 1 }} / {{ experiment.steps.length }}
      </div>
    </header>

    <div class="player-shell">
      <div class="player-canvas">
        <slot
          :step="currentStep"
          :step-index="currentStepIndex"
          :total-steps="experiment.steps.length"
          :trace-collapsed="isTraceCollapsed"
        />
      </div>

      <TracePanel
        :step="currentStep"
        :step-index="currentStepIndex"
        :total-steps="experiment.steps.length"
        :collapsed="isTraceCollapsed"
        @toggle="toggleTrace"
      />
    </div>

    <footer class="player-controls">
      <button type="button" :disabled="isFirstStep" @click="previousStep">上一步</button>
      <button type="button" @click="resetSteps">重置</button>
      <button type="button" :disabled="isLastStep" @click="nextStep">下一步</button>
    </footer>
  </section>
</template>

<style scoped>
.system-motion-player {
  display: grid;
  gap: 18px;
  min-width: 0;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: #020617;
  color: #e5edf7;
}

.player-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
  min-width: 0;
}

.player-header h2 {
  margin: 0;
  border: none;
  color: #f8fafc;
  font-size: 1.28rem;
  line-height: 1.3;
}

.player-header p {
  margin: 8px 0 0;
  color: #b6c3d1;
  font-size: 0.9rem;
  line-height: 1.7;
}

.player-kicker {
  margin: 0 0 7px;
  color: #7dd3fc;
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.player-step-count {
  min-width: 74px;
  padding: 7px 10px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.1);
  color: #dff7ff;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  white-space: nowrap;
}

.player-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  gap: 16px;
  align-items: stretch;
  min-width: 0;
  transition: grid-template-columns 0.2s ease;
}

.trace-collapsed .player-shell {
  grid-template-columns: minmax(0, 1fr) 96px;
}

.player-canvas {
  min-width: 0;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 32%),
    #0f172a;
}

.player-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(96px, 1fr));
  gap: 10px;
  min-width: 0;
}

.player-controls button {
  min-width: 0;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid rgba(125, 211, 252, 0.32);
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.12);
  color: #dff7ff;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    opacity 0.18s ease;
}

.player-controls button:hover:not(:disabled) {
  border-color: rgba(125, 211, 252, 0.66);
  background: rgba(14, 165, 233, 0.2);
  color: #ffffff;
}

.player-controls button:focus-visible {
  outline: 3px solid rgba(56, 189, 248, 0.44);
  outline-offset: 3px;
}

.player-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

@media (max-width: 720px) {
  .system-motion-player {
    padding: 14px;
  }

  .player-header {
    grid-template-columns: 1fr;
  }

  .player-step-count {
    justify-self: start;
  }

  .player-shell,
  .trace-collapsed .player-shell {
    grid-template-columns: 1fr;
  }

  .player-canvas {
    min-height: 320px;
  }

  .player-controls {
    grid-template-columns: repeat(3, minmax(72px, 1fr));
  }
}

@media (max-width: 420px) {
  .player-controls {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .player-shell,
  .player-controls button {
    transition-duration: 0.01ms;
  }
}
</style>
