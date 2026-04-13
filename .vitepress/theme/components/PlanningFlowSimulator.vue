<script setup lang="ts">
import { computed, ref } from 'vue'
import { planningSimulatorScenario } from '../data/planning-simulator-scenario'
import type { PlanningChoice, PlanningFlowSimulatorProps, PlanningStepState } from './types'
import PlanningMissionCard from './PlanningMissionCard.vue'
import PlanningDecisionPanel from './PlanningDecisionPanel.vue'
import PlanningTreeCanvas from './PlanningTreeCanvas.vue'
import PlanningFeedbackPanel from './PlanningFeedbackPanel.vue'
import PlanningStageBar from './PlanningStageBar.vue'
import PlanningReplaySummary from './PlanningReplaySummary.vue'

const props = withDefaults(defineProps<PlanningFlowSimulatorProps>(), {
  scenario: () => planningSimulatorScenario
})

const currentScreen = ref(props.activeScreen ?? 1)
const selectedPath = ref<string[]>([])
const didReplan = ref(false)

const currentStep = computed<PlanningStepState | undefined>(() =>
  props.scenario.screens.find(step => step.screen === currentScreen.value)
)

const latestChoiceLabel = computed(() => {
  const latestChoiceId = selectedPath.value[selectedPath.value.length - 1]
  if (!latestChoiceId) return ''
  return findChoiceById(latestChoiceId)?.label ?? latestChoiceId
})

function findChoiceById(choiceId: string): PlanningChoice | undefined {
  for (const step of props.scenario.screens) {
    const choice = step.choices.find(item => item.id === choiceId)
    if (choice) return choice
  }
  return undefined
}

function choose(choiceId: string) {
  if (!currentStep.value) return

  selectedPath.value.push(choiceId)

  if (choiceId === 'replan') {
    didReplan.value = true
  }

  const isLastScreen = currentScreen.value >= props.scenario.screens.length
  if (!isLastScreen) {
    currentScreen.value += 1
  }
}
</script>

<template>
  <section class="planning-flow-simulator">
    <PlanningMissionCard
      :mission-title="props.scenario.missionTitle"
      :mission-description="props.scenario.missionDescription"
      :step-title="currentStep?.title"
      :stage-label="currentStep?.stageLabel"
    />

    <div v-if="currentStep?.screen !== 6" class="planning-main-grid">
      <PlanningDecisionPanel
        :title="currentStep?.title ?? '选择下一步'"
        :prompt="currentStep?.prompt ?? ''"
        :hint="currentStep?.hint"
        :choices="currentStep?.choices ?? []"
        @choose="choose"
      />

      <PlanningTreeCanvas
        :stage-label="currentStep?.stageLabel ?? ''"
        :nodes="currentStep?.tree ?? []"
      />

      <PlanningFeedbackPanel
        :title="`${currentStep?.stageLabel ?? '阶段'}反馈`"
        :feedback="currentStep?.feedback ?? ''"
        :latest-choice-label="latestChoiceLabel"
      />
    </div>

    <PlanningReplaySummary
      v-else-if="currentStep?.replaySummary"
      :summary="currentStep.replaySummary"
      :selected-path="selectedPath"
      :did-replan="didReplan"
    />

    <PlanningStageBar
      :screens="props.scenario.screens"
      :current-screen="currentScreen"
    />
  </section>
</template>

<style scoped>
.planning-flow-simulator {
  margin: 1.5rem 0;
  display: grid;
  gap: 1rem;
}

.planning-main-grid {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 260px;
  gap: 0.75rem;
  align-items: start;
}

@media (max-width: 1080px) {
  .planning-main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
