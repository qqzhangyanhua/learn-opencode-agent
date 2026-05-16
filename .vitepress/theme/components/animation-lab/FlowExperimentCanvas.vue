<script setup lang="ts">
import { computed } from 'vue'
import type { ExperimentStep, FlowCanvasConfig } from './type'

const props = defineProps<{
  step: ExperimentStep
  config: FlowCanvasConfig
}>()

const nodeStyleById = computed(() => {
  return props.config.nodes.reduce<Record<string, Record<string, string>>>((styles, node) => {
    styles[node.id] = {
      '--node-x': `${node.x}%`,
      '--node-y': `${node.y}%`,
      '--node-mobile-x': `${node.mobileX ?? node.x}%`,
      '--node-mobile-y': `${node.mobileY ?? node.y}%`,
    }

    return styles
  }, {})
})

const packetRouteStyle = computed(() => {
  if (!props.step.packet) {
    return undefined
  }

  const from = props.config.nodes.find((node) => node.id === props.step.packet?.from)
  const to = props.config.nodes.find((node) => node.id === props.step.packet?.to)

  if (!from || !to) {
    return undefined
  }

  return {
    '--packet-start-x': `${from.x}%`,
    '--packet-start-y': `${from.y}%`,
    '--packet-end-x': `${to.x}%`,
    '--packet-end-y': `${to.y}%`,
    '--packet-mobile-start-x': `${from.mobileX ?? from.x}%`,
    '--packet-mobile-start-y': `${from.mobileY ?? from.y}%`,
    '--packet-mobile-end-x': `${to.mobileX ?? to.x}%`,
    '--packet-mobile-end-y': `${to.mobileY ?? to.y}%`,
  }
})

function isNodeActive(id: string) {
  return props.step.activeNodes.includes(id)
}

function isPathActive(id: string) {
  return props.step.activePaths.includes(id)
}
</script>

<template>
  <div :class="['flow-experiment-canvas', `accent-${config.accent}`, `motion-${config.motion}`]">
    <div class="flow-scene">
      <div class="flow-grid" aria-hidden="true"></div>
      <div class="scene-effect" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <svg class="flow-paths" viewBox="0 0 1000 560" role="img" :aria-label="config.ariaLabel">
        <path
          v-for="path in config.paths"
          :key="path.id"
          :class="{ active: isPathActive(path.id) }"
          :d="path.d"
        />
      </svg>

      <div
        v-for="node in config.nodes"
        :key="node.id"
        :class="['flow-node', { active: isNodeActive(node.id) }]"
        :style="nodeStyleById[node.id]"
      >
        <span>{{ node.role }}</span>
        <strong>{{ node.label }}</strong>
      </div>

      <div v-if="step.packet && packetRouteStyle" class="flow-packet" :style="packetRouteStyle">
        {{ step.packet.label }}
      </div>
    </div>

    <div class="flow-step-summary">
      <span>{{ step.title }}</span>
      <p>{{ step.description }}</p>
    </div>
  </div>
</template>

<style scoped src="./FlowExperimentCanvas.css"></style>
