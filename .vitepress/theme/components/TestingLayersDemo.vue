<template>
  <FlowScenarioDemo
    :scenario="testingLayersScenario"
    variant="topology"
    :interval-ms="1500"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { testingLayersScenario } from './testingLayersScenario'
</script>
