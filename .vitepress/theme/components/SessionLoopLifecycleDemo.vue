<template>
  <FlowScenarioDemo
    :scenario="sessionLoopLifecycleScenario"
    variant="decision"
    :interval-ms="1550"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { sessionLoopLifecycleScenario } from './sessionLoopLifecycleScenario'
</script>
