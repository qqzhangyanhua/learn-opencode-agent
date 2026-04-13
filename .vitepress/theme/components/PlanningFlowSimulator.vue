<script setup lang="ts">
import { computed, ref } from 'vue'
import { planningSimulatorScenario } from '../data/planning-simulator-scenario'
import type {
  PlanningChoice,
  PlanningFlowSimulatorProps,
  PlanningStepState,
  PlanningTreeNodeSnapshot
} from './types'
import PlanningMissionCard from './PlanningMissionCard.vue'
import PlanningDecisionPanel from './PlanningDecisionPanel.vue'
import PlanningTreeCanvas from './PlanningTreeCanvas.vue'
import PlanningFeedbackPanel from './PlanningFeedbackPanel.vue'
import PlanningStageBar from './PlanningStageBar.vue'
import PlanningReplaySummary from './PlanningReplaySummary.vue'

interface PlanningChoiceMeta {
  granularity?: '粗粒度' | '中粒度' | '细粒度'
  didReplan?: boolean
}

type PlanningBranchingStep = PlanningStepState & {
  treeByChoice?: Partial<Record<string, PlanningTreeNodeSnapshot[]>>
  feedbackByChoice?: Partial<Record<string, string>>
  choiceMeta?: Partial<Record<string, PlanningChoiceMeta>>
}

const props = withDefaults(defineProps<PlanningFlowSimulatorProps>(), {
  scenario: () => planningSimulatorScenario
})

const currentScreen = ref(props.activeScreen ?? 1)
const selectedPath = ref<string[]>([])
const didReplan = ref(false)
const selectedGranularity = ref<PlanningChoiceMeta['granularity']>()

const currentStep = computed<PlanningBranchingStep | undefined>(() =>
  props.scenario.screens.find(step => step.screen === currentScreen.value) as
    | PlanningBranchingStep
    | undefined
)

const activeChoiceId = computed(() => {
  if (!currentStep.value) return undefined
  return resolveChoiceForStep(currentStep.value)
})

const currentFeedback = computed(() => {
  if (!currentStep.value) return ''
  return resolveCurrentFeedback(currentStep.value)
})

const currentTree = computed(() => {
  if (!currentStep.value) return []
  return resolveCurrentTree(currentStep.value)
})

const latestChoiceLabel = computed(() => {
  const latestChoiceId = activeChoiceId.value ?? selectedPath.value[selectedPath.value.length - 1]
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

function resolveChoiceForStep(step: PlanningBranchingStep): string | undefined {
  const choiceForCurrent = selectedPath.value[step.screen - 1]
  const choiceForPrevious = selectedPath.value[step.screen - 2]
  const candidateChoices = [choiceForCurrent, choiceForPrevious].filter(Boolean) as string[]

  const hasTreeByChoice = Boolean(step.treeByChoice)
  const hasFeedbackByChoice = Boolean(step.feedbackByChoice)

  if (!hasTreeByChoice && !hasFeedbackByChoice) {
    return candidateChoices[0]
  }

  for (const choiceId of candidateChoices) {
    if (step.feedbackByChoice?.[choiceId] || step.treeByChoice?.[choiceId]) {
      return choiceId
    }
  }

  return candidateChoices[0]
}

function resolveCurrentFeedback(step: PlanningBranchingStep): string {
  const resolvedChoiceId = resolveChoiceForStep(step)
  if (resolvedChoiceId && step.feedbackByChoice?.[resolvedChoiceId]) {
    return step.feedbackByChoice[resolvedChoiceId] ?? step.feedback
  }

  if (selectedGranularity.value && step.screen >= 4) {
    return `${step.feedback} 当前任务粒度：${selectedGranularity.value}。`
  }

  return step.feedback
}

function resolveCurrentTree(step: PlanningBranchingStep): PlanningTreeNodeSnapshot[] {
  const resolvedChoiceId = resolveChoiceForStep(step)
  if (resolvedChoiceId && step.treeByChoice?.[resolvedChoiceId]) {
    return step.treeByChoice[resolvedChoiceId] ?? []
  }
  return step.tree ?? []
}

function choose(choiceId: string) {
  if (!currentStep.value) return

  selectedPath.value.push(choiceId)

  const choiceMeta = currentStep.value.choiceMeta?.[choiceId]
  if (choiceMeta?.granularity) {
    selectedGranularity.value = choiceMeta.granularity
  }

  if (choiceId === 'replan' || choiceMeta?.didReplan) {
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
        :nodes="currentTree"
      />

      <PlanningFeedbackPanel
        :title="`${currentStep?.stageLabel ?? '阶段'}反馈`"
        :feedback="currentFeedback"
        :feedback-by-choice="currentStep?.feedbackByChoice"
        :active-choice-id="activeChoiceId"
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
  grid-template-columns: minmax(220px, 250px) minmax(320px, 1fr) minmax(220px, 250px);
  gap: 0.75rem;
  align-items: start;
}

@media (max-width: 1380px) {
  .planning-main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
