<template>
  <FlowScenarioDemo
    :scenario="extensionBestPracticeScenario"
    variant="timeline"
    :interval-ms="1500"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { extensionBestPracticeScenario } from './extensionBestPracticeScenario'
</script>
