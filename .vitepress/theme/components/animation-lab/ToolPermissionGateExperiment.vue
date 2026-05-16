<script setup lang="ts">
import { toolPermissionGateCanvas } from '../../data/animation-lab/tool-permission-gate'
import FlowExperimentCanvas from './FlowExperimentCanvas.vue'
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
}>()
</script>

<template>
  <FlowExperimentCanvas :step="step" :config="toolPermissionGateCanvas" />
</template>
