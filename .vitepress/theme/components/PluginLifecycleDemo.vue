<template>
  <FlowScenarioDemo
    :scenario="pluginLifecycleScenario"
    variant="timeline"
    :interval-ms="1500"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { pluginLifecycleScenario } from './pluginLifecycleScenario'
</script>
