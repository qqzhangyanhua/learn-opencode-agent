<template>
  <FlowScenarioDemo
    :scenario="extensionDecisionScenario"
    variant="decision"
    :interval-ms="1550"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { extensionDecisionScenario } from './extensionDecisionScenario'
</script>
