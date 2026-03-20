<template>
  <AnimationContainer title="什么是 Agent" @restart="handleRestart">
    <template #default="{ isVisible }">
      <div :key="key" class="what-is-agent" :class="{ active: isVisible && !isRestarting }">
        <!-- 阶段 1: 传统 LLM -->
        <div class="stage stage-1">
          <div class="stage-label">传统 LLM</div>
          <div class="flow">
            <div class="node">输入</div>
            <div class="arrow">→</div>
            <div class="node highlight">LLM</div>
            <div class="arrow">→</div>
            <div class="node">输出</div>
          </div>
          <div class="note">一次性调用，无法处理复杂任务</div>
        </div>

        <!-- 阶段 2: AI Agent -->
        <div class="stage stage-2">
          <div class="stage-label">AI Agent</div>
          <div class="flow">
            <div class="node">输入</div>
            <div class="arrow">→</div>
            <div class="loop-container">
              <div class="loop-label">循环执行</div>
              <div class="loop-flow">
                <div class="node small">思考</div>
                <div class="arrow small">→</div>
                <div class="node small">行动</div>
                <div class="arrow small">→</div>
                <div class="node small">观察</div>
              </div>
              <div class="loop-arrow">↻</div>
            </div>
            <div class="arrow">→</div>
            <div class="node">输出</div>
          </div>
          <div class="note">循环执行，直到任务完成</div>
        </div>
      </div>
    </template>
  </AnimationContainer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AnimationContainer from '../core/AnimationContainer.vue'

const key = ref(0)
const isRestarting = ref(false)

function handleRestart() {
  isRestarting.value = true
  key.value++
  setTimeout(() => {
    isRestarting.value = false
  }, 50)
}
</script>

<style scoped>
.what-is-agent {
  width: 100%;
  padding: 2rem;
}

.stage {
  margin-bottom: 3rem;
  opacity: 0;
  transform: translateY(20px);
}

.what-is-agent.active .stage-1 {
  animation: fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.what-is-agent.active .stage-2 {
  animation: fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 2s forwards;
}

.stage-label {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin-bottom: 1rem;
  text-align: center;
}

.flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.node {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: white;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.2);
}

.node.small {
  padding: 0.5rem 1rem;
  font-size: 12px;
}

.node.highlight {
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 4px 20px rgba(13, 148, 136, 0.4);
}

.arrow {
  font-size: 1.5rem;
  color: var(--vp-c-text-2);
  font-weight: bold;
}

.arrow.small {
  font-size: 1rem;
}

.loop-container {
  position: relative;
  padding: 1rem;
  border: 2px dashed var(--vp-c-brand-1);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.loop-label {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--vp-c-bg);
  padding: 0 0.5rem;
  font-size: 12px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.loop-flow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loop-arrow {
  position: absolute;
  bottom: -16px;
  right: 20px;
  font-size: 2rem;
  color: var(--vp-c-brand-1);
  animation: rotate 1.5s linear infinite;
  filter: drop-shadow(0 2px 4px rgba(13, 148, 136, 0.3));
}

.note {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  font-style: italic;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.2);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 8px 30px rgba(13, 148, 136, 0.6);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .flow {
    flex-direction: column;
  }

  .loop-flow {
    flex-direction: column;
  }

  .arrow {
    transform: rotate(90deg);
  }
}
</style>
