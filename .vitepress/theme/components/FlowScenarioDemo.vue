<template>
  <div class="flow-root" :class="[`variant-${variant}`, variantMeta.layoutClass]">
    <div class="flow-header">
      <div class="flow-title">{{ scenario.title }}</div>
      <div class="flow-summary">{{ scenario.summary }}</div>
    </div>

    <div class="flow-body">
      <div class="flow-canvas">
        <div
          v-for="lane in scenario.lanes"
          :key="lane.id"
          class="flow-lane"
          :class="variantMeta.laneClass"
        >
          <div class="flow-lane-label">{{ lane.label }}</div>
          <div class="flow-lane-steps" :class="variantMeta.stepGroupClass">
            <div
              v-for="step in laneSteps(lane.id)"
              :key="step.id"
              class="flow-step"
              :class="[
                `kind-${step.kind ?? 'normal'}`,
                {
                  visible: isStepVisible(step.id),
                  active: isStepActive(step.id),
                },
              ]"
            >
              <div class="flow-step-title">{{ step.title }}</div>
              <div v-if="isStepVisible(step.id)" class="flow-step-detail">
                {{ step.detail }}
              </div>
              <div v-if="step.codeLabel && isStepVisible(step.id)" class="flow-step-code">
                {{ step.codeLabel }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flow-sidepanel">
        <div class="flow-side-label">{{ variantMeta.sideLabel }}</div>
        <div class="flow-side-title">{{ activeStep?.title }}</div>
        <div class="flow-side-detail">{{ activeStep?.detail }}</div>
        <div v-if="activeStep?.codeLabel" class="flow-side-code">{{ activeStep.codeLabel }}</div>
        <div v-if="activeStep?.emphasis" class="flow-side-emphasis">{{ activeStep.emphasis }}</div>
        <div v-if="activeRelations.length" class="flow-relations">
          <div class="flow-relations-label">{{ variantMeta.relationLabel }}</div>
          <div class="flow-relations-list">
            <div
              v-for="relation in activeRelations"
              :key="`${relation.direction}-${relation.stepId}`"
              class="flow-relation-chip"
              :class="[relation.direction, relation.style]"
            >
              <span class="flow-relation-arrow">{{ relation.direction === 'incoming' ? '←' : '→' }}</span>
              <span class="flow-relation-title">{{ relation.title }}</span>
              <span v-if="relation.label" class="flow-relation-tag">{{ relation.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flow-footer">
      <button class="btn" @click="restart">重新播放</button>
      <button class="btn" @click="prev" :disabled="isAtStart">上一步</button>
      <button class="btn" @click="next" :disabled="isAtEnd">下一步</button>
      <span class="flow-status">{{ progress.current }} / {{ progress.total }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { createFlowPlayback } from './flowPlayback'
import type { FlowScenario, FlowStep, FlowVariant } from './flowScenario'
import { getFlowStepRelations, getFlowVariantMeta } from './flowScenarioPresenter'

const props = withDefaults(defineProps<{
  scenario: FlowScenario
  variant?: FlowVariant
  autoplay?: boolean
  intervalMs?: number
}>(), {
  variant: 'timeline',
  autoplay: true,
  intervalMs: 1400,
})

const playback = ref(createFlowPlayback(props.scenario.steps))
const activeIndex = ref(playback.value.currentIndex())
const isPlaying = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

const activeStep = computed(() => props.scenario.steps[activeIndex.value])
const progress = computed(() => playback.value.progress())
const isAtStart = computed(() => playback.value.isAtStart())
const isAtEnd = computed(() => playback.value.isAtEnd())
const variantMeta = computed(() => getFlowVariantMeta(props.variant))
const activeRelations = computed(() =>
  getFlowStepRelations(props.scenario, activeStep.value?.id)
)

function syncIndex() {
  activeIndex.value = playback.value.currentIndex()
}

function stop() {
  isPlaying.value = false
  if (timer) clearTimeout(timer)
  timer = null
}

function scheduleNextTick() {
  if (!isPlaying.value || playback.value.isAtEnd()) {
    stop()
    return
  }

  timer = setTimeout(() => {
    playback.value.next()
    syncIndex()
    scheduleNextTick()
  }, props.intervalMs)
}

function play() {
  stop()
  isPlaying.value = true
  scheduleNextTick()
}

function restart() {
  stop()
  playback.value.restart()
  syncIndex()
  if (props.autoplay) play()
}

function next() {
  stop()
  playback.value.next()
  syncIndex()
}

function prev() {
  stop()
  playback.value.prev()
  syncIndex()
}

function isStepVisible(stepId: string) {
  return playback.value.visibleStepIds().includes(stepId)
}

function isStepActive(stepId: string) {
  return activeStep.value?.id === stepId
}

function laneSteps(laneId: string): FlowStep[] {
  return props.scenario.steps.filter((step) => step.lane === laneId)
}

watch(
  () => props.scenario,
  (scenario) => {
    stop()
    playback.value = createFlowPlayback(scenario.steps)
    syncIndex()
    if (props.autoplay) play()
  }
)

onMounted(() => {
  if (props.autoplay) play()
})

onUnmounted(() => {
  stop()
})
</script>

<style scoped>
.flow-root {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  margin: 24px 0;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}

.flow-header {
  margin-bottom: 16px;
}

.flow-title {
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  color: var(--vp-c-text-1);
}

.flow-summary {
  margin-top: 6px;
  text-align: center;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.flow-body {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(220px, 0.8fr);
  gap: 16px;
}

.flow-canvas {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-lane {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  overflow: hidden;
}

.flow-lane-label {
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.flow-lane-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
}

.steps-decision {
  flex-direction: column;
  flex-wrap: nowrap;
}

.steps-topology {
  flex-direction: column;
  flex-wrap: nowrap;
}

.flow-step {
  min-width: 180px;
  flex: 1 1 180px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 12px;
  opacity: 0.42;
  transform: translateY(4px);
  transition: opacity 0.25s ease, transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.flow-step.visible {
  opacity: 1;
  transform: translateY(0);
}

.flow-step.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--vp-c-brand-1) 35%, transparent);
  background: color-mix(in srgb, var(--vp-c-brand-soft) 55%, var(--vp-c-bg));
}

.flow-step.kind-async {
  border-style: dashed;
}

.flow-step.kind-commit {
  border-color: #10b981;
}

.flow-step.kind-decision {
  border-color: #f59e0b;
}

.variant-decision .flow-step.kind-decision {
  background:
    linear-gradient(135deg, color-mix(in srgb, #f59e0b 12%, var(--vp-c-bg)) 0%, var(--vp-c-bg-soft) 100%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #f59e0b 28%, transparent);
}

.variant-decision .flow-step {
  min-width: 100%;
}

.variant-topology .flow-canvas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.variant-topology .flow-lane {
  min-height: 100%;
}

.variant-topology .flow-step {
  min-width: 100%;
}

.flow-step-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.flow-step-detail {
  margin-top: 8px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.flow-step-code,
.flow-side-code {
  margin-top: 8px;
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  padding: 6px 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.flow-sidepanel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  padding: 14px;
}

.flow-side-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.flow-side-title {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.flow-side-detail {
  margin-top: 10px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.flow-side-emphasis {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
}

.flow-relations {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--vp-c-divider);
}

.flow-relations-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.flow-relations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.flow-relation-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.flow-relation-chip.incoming {
  border-left: 3px solid var(--vp-c-brand-1);
}

.flow-relation-chip.outgoing {
  border-left: 3px solid #10b981;
}

.flow-relation-chip.dashed {
  border-style: dashed;
}

.flow-relation-arrow {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
}

.flow-relation-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.flow-relation-tag {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.flow-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 16px;
}

.btn {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 8px 12px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.flow-status {
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

@media (max-width: 960px) {
  .flow-body {
    grid-template-columns: 1fr;
  }
}
</style>
