<script setup lang="ts">
import { errorRecoveryLoopCanvas } from '../../data/animation-lab/error-recovery-loop'
import FlowExperimentCanvas from './FlowExperimentCanvas.vue'
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
}>()
</script>

<template>
  <FlowExperimentCanvas :step="step" :config="errorRecoveryLoopCanvas" />
</template>
