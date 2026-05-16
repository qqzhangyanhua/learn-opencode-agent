<script setup lang="ts">
import { providerRoutingFallbackCanvas } from '../../data/animation-lab/provider-routing-fallback'
import FlowExperimentCanvas from './FlowExperimentCanvas.vue'
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
}>()
</script>

<template>
  <FlowExperimentCanvas :step="step" :config="providerRoutingFallbackCanvas" />
</template>
