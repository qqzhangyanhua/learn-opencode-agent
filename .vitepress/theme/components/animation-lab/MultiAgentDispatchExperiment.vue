<script setup lang="ts">
import { multiAgentDispatchCanvas } from '../../data/animation-lab/multi-agent-dispatch'
import FlowExperimentCanvas from './FlowExperimentCanvas.vue'
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
}>()
</script>

<template>
  <FlowExperimentCanvas :step="step" :config="multiAgentDispatchCanvas" />
</template>
