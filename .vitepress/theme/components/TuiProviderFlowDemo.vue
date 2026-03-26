<template>
  <FlowScenarioDemo
    :scenario="tuiProviderFlowScenario"
    variant="timeline"
    :interval-ms="1500"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { tuiProviderFlowScenario } from './tuiProviderFlowScenario'
</script>
