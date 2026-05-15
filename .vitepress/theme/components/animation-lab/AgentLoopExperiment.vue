<script setup lang="ts">
import { computed } from 'vue'
import { agentLoopNodes, agentLoopPaths } from '../../data/animation-lab-experiments'
import type { ExperimentStep } from './type'

const props = defineProps<{
  step: ExperimentStep
}>()

const packetClass = computed(() => props.step.packet ? `packet-${props.step.packet.from}-${props.step.packet.to}` : '')

function isNodeActive(id: string) {
  return props.step.activeNodes.includes(id)
}

function isPathActive(id: string) {
  return props.step.activePaths.includes(id)
}
</script>

<template>
  <div class="agent-loop-canvas">
    <div class="runtime-grid" aria-hidden="true"></div>

    <svg class="runtime-paths" viewBox="0 0 1000 560" role="img" aria-label="Agent 运行闭环路径">
      <path
        v-for="path in agentLoopPaths"
        :key="path.id"
        :class="{ active: isPathActive(path.id) }"
        :data-path="path.id"
        :d="path.d"
      />
    </svg>

    <div
      v-for="node in agentLoopNodes"
      :key="node.id"
      :class="['runtime-node', `node-${node.id}`, { active: isNodeActive(node.id) }]"
    >
      <span>{{ node.role }}</span>
      <strong>{{ node.label }}</strong>
    </div>

    <div v-if="step.packet" :class="['motion-packet', packetClass]">
      {{ step.packet.label }}
    </div>

    <div class="canvas-step-summary">
      <span>{{ step.title }}</span>
      <p>{{ step.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.agent-loop-canvas {
  position: relative;
  min-height: 420px;
  overflow: hidden;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(3, 7, 18, 0.98)),
    #020617;
  color: #e5edf7;
  isolation: isolate;
}

.runtime-grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.2));
}

.runtime-paths {
  position: absolute;
  inset: 7% 4% 12%;
  z-index: 1;
  width: 92%;
  height: 81%;
  overflow: visible;
}

.runtime-paths path {
  fill: none;
  stroke: rgba(100, 116, 139, 0.48);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 12 18;
  transition:
    stroke 0.18s ease,
    stroke-width 0.18s ease,
    opacity 0.18s ease;
}

.runtime-paths path.active {
  stroke: #38bdf8;
  stroke-width: 6;
  animation: path-flow 1.2s linear infinite;
  filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.38));
}

.runtime-node {
  position: absolute;
  z-index: 2;
  display: grid;
  gap: 4px;
  place-items: center;
  width: clamp(86px, 13vw, 130px);
  min-height: 66px;
  padding: 11px 12px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 14px 32px rgba(2, 6, 23, 0.34);
  color: #dbeafe;
  text-align: center;
  transform: translate(-50%, -50%);
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.runtime-node span {
  color: #8fb2c9;
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
}

.runtime-node strong {
  color: inherit;
  font-size: clamp(0.76rem, 1vw, 0.92rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.runtime-node.active {
  border-color: rgba(45, 212, 191, 0.78);
  background: rgba(15, 44, 52, 0.94);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.14),
    0 0 26px rgba(45, 212, 191, 0.24),
    0 16px 34px rgba(2, 6, 23, 0.42);
  color: #f8fafc;
}

.runtime-node.active span {
  color: #99f6e4;
}

.node-user {
  left: 11%;
  top: 48%;
}

.node-planner {
  left: 33%;
  top: 32%;
}

.node-llm {
  left: 63%;
  top: 32%;
}

.node-tool {
  left: 84%;
  top: 58%;
}

.node-observation {
  left: 52%;
  top: 69%;
}

.node-memory {
  left: 25%;
  top: 70%;
}

.node-final {
  left: 90%;
  top: 25%;
}

.motion-packet {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  min-width: 54px;
  min-height: 30px;
  padding: 6px 10px;
  border: 1px solid rgba(251, 191, 36, 0.72);
  border-radius: 999px;
  background: rgba(120, 53, 15, 0.92);
  box-shadow:
    0 0 18px rgba(251, 191, 36, 0.32),
    0 10px 22px rgba(2, 6, 23, 0.38);
  color: #fef3c7;
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
  transform: translate(-50%, -50%);
}

.packet-user-planner { animation: packet-user-planner 1.45s ease-in-out infinite; }
.packet-planner-llm { animation: packet-planner-llm 1.45s ease-in-out infinite; }
.packet-llm-tool { animation: packet-llm-tool 1.45s ease-in-out infinite; }
.packet-tool-observation { animation: packet-tool-observation 1.45s ease-in-out infinite; }
.packet-memory-llm { animation: packet-memory-llm 1.45s ease-in-out infinite; }
.packet-llm-final { animation: packet-llm-final 1.45s ease-in-out infinite; }

.canvas-step-summary {
  position: absolute;
  right: 18px;
  bottom: 16px;
  left: 18px;
  z-index: 4;
  display: grid;
  gap: 5px;
  max-width: 560px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(10px);
}

.canvas-step-summary span {
  color: #bae6fd;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.25;
}

.canvas-step-summary p {
  margin: 0;
  color: #d6e3ef;
  font-size: 0.84rem;
  line-height: 1.55;
}

@keyframes path-flow {
  to {
    stroke-dashoffset: -30;
  }
}

@keyframes packet-user-planner {
  0%,
  100% { left: 13%; top: 48%; }
  50% { left: 32%; top: 34%; }
}

@keyframes packet-planner-llm {
  0%,
  100% { left: 35%; top: 32%; }
  50% { left: 61%; top: 31%; }
}

@keyframes packet-llm-tool {
  0%,
  100% { left: 65%; top: 34%; }
  50% { left: 82%; top: 57%; }
}

@keyframes packet-tool-observation {
  0%,
  100% { left: 82%; top: 60%; }
  50% { left: 54%; top: 69%; }
}

@keyframes packet-memory-llm {
  0%,
  100% { left: 27%; top: 68%; }
  50% { left: 61%; top: 35%; }
}

@keyframes packet-llm-final {
  0%,
  100% { left: 65%; top: 30%; }
  50% { left: 88%; top: 25%; }
}

@media (max-width: 780px) {
  .agent-loop-canvas {
    min-height: 360px;
  }

  .runtime-paths {
    inset: 8% 2% 21%;
    width: 96%;
    height: 71%;
  }

  .runtime-node {
    width: clamp(74px, 19vw, 104px);
    min-height: 56px;
    padding: 9px 8px;
  }

  .runtime-node span {
    font-size: 0.62rem;
  }

  .runtime-node strong {
    font-size: 0.72rem;
  }

  .node-user {
    left: 14%;
    top: 46%;
  }

  .node-planner {
    left: 35%;
    top: 28%;
  }

  .node-llm {
    left: 63%;
    top: 29%;
  }

  .node-tool {
    left: 84%;
    top: 53%;
  }

  .node-observation {
    left: 55%;
    top: 63%;
  }

  .node-memory {
    left: 25%;
    top: 64%;
  }

  .node-final {
    left: 86%;
    top: 17%;
  }

  .motion-packet {
    min-width: 46px;
    min-height: 26px;
    padding: 5px 8px;
    font-size: 0.64rem;
  }

  .canvas-step-summary {
    right: 12px;
    bottom: 12px;
    left: 12px;
    padding: 10px 11px;
  }
}

@media (max-width: 520px) {
  .agent-loop-canvas {
    min-height: 430px;
  }

  .runtime-paths {
    inset: 4% -16% 24%;
    width: 132%;
    height: 72%;
  }

  .runtime-node {
    width: 86px;
    min-height: 54px;
  }

  .node-user {
    left: 18%;
    top: 28%;
  }

  .node-planner {
    left: 50%;
    top: 19%;
  }

  .node-llm {
    left: 78%;
    top: 31%;
  }

  .node-tool {
    left: 78%;
    top: 51%;
  }

  .node-observation {
    left: 50%;
    top: 60%;
  }

  .node-memory {
    left: 20%;
    top: 50%;
  }

  .node-final {
    left: 80%;
    top: 12%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .runtime-paths path.active,
  .motion-packet {
    animation: none;
  }

  .packet-user-planner {
    left: 32%;
    top: 34%;
  }

  .packet-planner-llm {
    left: 61%;
    top: 31%;
  }

  .packet-llm-tool {
    left: 82%;
    top: 57%;
  }

  .packet-tool-observation {
    left: 54%;
    top: 69%;
  }

  .packet-memory-llm {
    left: 61%;
    top: 35%;
  }

  .packet-llm-final {
    left: 88%;
    top: 25%;
  }
}
</style>
