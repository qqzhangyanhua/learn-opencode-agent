<script setup lang="ts">
import { agentLoopCanvas } from '../../data/animation-lab/agent-loop'
import FlowExperimentCanvas from './FlowExperimentCanvas.vue'
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
}>()
</script>

<template>
  <FlowExperimentCanvas :step="step" :config="agentLoopCanvas" />
</template>
