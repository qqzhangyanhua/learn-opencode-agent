<template>
  <FlowScenarioDemo
    :scenario="localCloudTopologyScenario"
    variant="topology"
    :interval-ms="1550"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import { localCloudTopologyScenario } from './localCloudTopologyScenario'
</script>
