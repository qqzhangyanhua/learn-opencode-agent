<script setup lang="ts">
import { contextCompactionCanvas } from '../../data/animation-lab/context-compaction'
import FlowExperimentCanvas from './FlowExperimentCanvas.vue'
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
}>()
</script>

<template>
  <FlowExperimentCanvas :step="step" :config="contextCompactionCanvas" />
</template>
