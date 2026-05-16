<script setup lang="ts">
import { contextMemoryCanvas } from '../../data/animation-lab/context-memory-flow'
import FlowExperimentCanvas from './FlowExperimentCanvas.vue'
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
}>()
</script>

<template>
  <FlowExperimentCanvas :step="step" :config="contextMemoryCanvas" />
</template>
