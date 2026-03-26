<template>
  <FlowScenarioDemo
    :scenario="taskExecutionScenario"
    variant="timeline"
    :interval-ms="1500"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { taskExecutionScenario } from './taskExecutionScenario'
</script>
