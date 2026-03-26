<template>
  <FlowScenarioDemo
    :scenario="toolExecutionLifecycleScenario"
    variant="timeline"
    :interval-ms="1550"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { toolExecutionLifecycleScenario } from './toolExecutionLifecycleScenario'
</script>
