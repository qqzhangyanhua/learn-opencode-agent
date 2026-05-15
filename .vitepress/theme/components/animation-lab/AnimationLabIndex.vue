<script setup lang="ts">
import SystemMotionPlayer from './SystemMotionPlayer.vue'
import AgentLoopExperiment from './AgentLoopExperiment.vue'
import { agentLoopExperiment } from '../../data/animation-lab-experiments'
</script>

<template>
  <section class="animation-lab-index">
    <header class="lab-hero">
      <p class="lab-eyebrow">Animation Lab</p>
      <h1>动画实验室</h1>
      <p>用系统运动展示 Agent 概念，把抽象机制拆成可观察、可暂停、可复盘的运行轨迹。</p>
    </header>

    <SystemMotionPlayer :experiment="agentLoopExperiment">
      <template #default="{ step }">
        <AgentLoopExperiment :step="step" />
      </template>
    </SystemMotionPlayer>

    <section class="lab-upcoming">
      <p class="lab-eyebrow">Next Experiments</p>
      <h2>后续实验方向</h2>
      <div class="lab-upcoming-grid">
        <article>
          <strong>上下文与记忆流</strong>
          <span>观察短期上下文、长期记忆与检索证据的切换。</span>
        </article>
        <article>
          <strong>多 Agent 调度</strong>
          <span>拆解任务分发、并行协作与结果汇总的运行轨迹。</span>
        </article>
        <article>
          <strong>工具调用与权限门</strong>
          <span>展示请求、审批、执行与回填之间的边界。</span>
        </article>
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

.lab-upcoming {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding-top: 4px;
}

.lab-upcoming h2 {
  margin: 0;
  border: none;
  color: var(--vp-c-text-1);
  font-size: 1.18rem;
  line-height: 1.35;
}

.lab-upcoming-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}

.lab-upcoming-grid article {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.lab-upcoming-grid strong {
  color: var(--vp-c-text-1);
  font-size: 0.94rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.lab-upcoming-grid span {
  color: var(--vp-c-text-2);
  font-size: 0.86rem;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .animation-lab-index {
    gap: 18px;
    padding-top: 2px;
  }

  .lab-upcoming-grid {
    grid-template-columns: 1fr;
  }
}
</style>
