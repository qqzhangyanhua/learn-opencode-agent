<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import SystemMotionPlayer from './SystemMotionPlayer.vue'
import AgentLoopExperiment from './AgentLoopExperiment.vue'
import ContextMemoryExperiment from './ContextMemoryExperiment.vue'
import MultiAgentDispatchExperiment from './MultiAgentDispatchExperiment.vue'
import ToolPermissionGateExperiment from './ToolPermissionGateExperiment.vue'
import ContextCompactionExperiment from './ContextCompactionExperiment.vue'
import ErrorRecoveryLoopExperiment from './ErrorRecoveryLoopExperiment.vue'
import ProviderRoutingFallbackExperiment from './ProviderRoutingFallbackExperiment.vue'
import RagRetrievalFlowExperiment from './RagRetrievalFlowExperiment.vue'
import HumanApprovalGateExperiment from './HumanApprovalGateExperiment.vue'
import StructuredOutputValidationExperiment from './StructuredOutputValidationExperiment.vue'
import StreamingInterruptControlExperiment from './StreamingInterruptControlExperiment.vue'
import { animationLabExperiments } from '../../data/animation-lab-experiments'

const selectedExperimentId = ref(animationLabExperiments[0]?.id ?? '')
const selectedCatalogItem = computed(() => {
  return animationLabExperiments.find((item) => item.id === selectedExperimentId.value) ?? animationLabExperiments[0]
})

function selectExperimentFromHash() {
  if (typeof window === 'undefined') {
    return
  }

  const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  selectedExperimentId.value = animationLabExperiments.some((item) => item.id === hashId)
    ? hashId
    : animationLabExperiments[0]?.id ?? ''
}

onMounted(() => {
  selectExperimentFromHash()
  window.addEventListener('hashchange', selectExperimentFromHash)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', selectExperimentFromHash)
})
</script>

<template>
  <section class="animation-lab-index">
    <header class="lab-hero">
      <p class="lab-eyebrow">Animation Lab</p>
      <h1>动画实验室</h1>
      <p>用系统运动展示 Agent 运行闭环、工具边界、上下文管理、RAG、结构化输出、流式控制、模型路由与多 Agent 协作，把抽象机制拆成可观察、可暂停、可复盘的轨迹。</p>
    </header>

    <section class="lab-workspace" aria-label="动画实验库">
      <div class="lab-stage">
        <SystemMotionPlayer v-if="selectedCatalogItem?.experiment" :experiment="selectedCatalogItem.experiment">
          <template #default="{ step }">
            <AgentLoopExperiment v-if="selectedCatalogItem.experiment.kind === 'agent-loop'" :step="step" />
            <ContextMemoryExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'context-memory-flow'"
              :step="step"
            />
            <MultiAgentDispatchExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'multi-agent-dispatch'"
              :step="step"
            />
            <ToolPermissionGateExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'tool-permission-gate'"
              :step="step"
            />
            <ContextCompactionExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'context-compaction'"
              :step="step"
            />
            <ErrorRecoveryLoopExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'error-recovery-loop'"
              :step="step"
            />
            <ProviderRoutingFallbackExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'provider-routing-fallback'"
              :step="step"
            />
            <RagRetrievalFlowExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'rag-retrieval-flow'"
              :step="step"
            />
            <HumanApprovalGateExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'human-approval-gate'"
              :step="step"
            />
            <StructuredOutputValidationExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'structured-output-validation'"
              :step="step"
            />
            <StreamingInterruptControlExperiment
              v-else-if="selectedCatalogItem.experiment.kind === 'streaming-interrupt-control'"
              :step="step"
            />
          </template>
        </SystemMotionPlayer>

        <div v-else class="lab-placeholder">
          <p class="lab-eyebrow">Coming Soon</p>
          <h2>{{ selectedCatalogItem?.title }}</h2>
          <p>{{ selectedCatalogItem?.summary }}</p>
          <span>这个实验会复用当前播放器结构，后续补充专属画布与 Trace 步骤。</span>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.animation-lab-index {
  display: grid;
  gap: 22px;
  min-width: 0;
  padding: 10px 0 30px;
}

.lab-hero {
  display: grid;
  gap: 8px;
  max-width: 720px;
  min-width: 0;
  padding-top: 8px;
}

.lab-eyebrow {
  margin: 0;
  color: #0284c7;
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.3;
  text-transform: uppercase;
}

.lab-hero h1 {
  margin: 0;
  border: none;
  color: var(--vp-c-text-1);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.12;
  text-wrap: balance;
}

.lab-hero p:last-child {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 1rem;
  line-height: 1.8;
  text-wrap: pretty;
}

.lab-workspace {
  min-width: 0;
}

.lab-stage {
  min-width: 0;
}

.lab-placeholder {
  display: grid;
  gap: 10px;
  min-height: 360px;
  min-width: 0;
  align-content: center;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 30%),
    #0f172a;
  color: #e5edf7;
}

.lab-placeholder h2 {
  margin: 0;
  border: none;
  color: #f8fafc;
  font-size: 1.28rem;
  line-height: 1.3;
}

.lab-placeholder p:not(.lab-eyebrow),
.lab-placeholder span {
  margin: 0;
  color: #b6c3d1;
  font-size: 0.9rem;
  line-height: 1.7;
}

@media (max-width: 820px) {
  .animation-lab-index {
    gap: 18px;
    padding-top: 2px;
  }

  .lab-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
