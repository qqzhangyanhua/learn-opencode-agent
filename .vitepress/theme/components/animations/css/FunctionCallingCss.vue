<template>
  <AnimationContainer title="工具调用流程" @restart="handleRestart">
    <template #default="{ isVisible }">
      <div :key="key" class="function-calling" :class="{ active: isVisible && !isRestarting }">
        <!-- Agent 盒子 -->
        <div class="box agent-box">
          <div class="box-icon">🤖</div>
          <div class="box-label">Agent</div>
        </div>

        <!-- 调用箭头 -->
        <div class="arrow call-arrow">
          <div class="arrow-line"></div>
          <div class="arrow-label">调用工具</div>
        </div>

        <!-- Tool 盒子 -->
        <div class="box tool-box">
          <div class="box-icon">🔧</div>
          <div class="box-label">Tool</div>
          <div class="execution-ring"></div>
        </div>

        <!-- 返回箭头 -->
        <div class="arrow return-arrow">
          <div class="arrow-line"></div>
          <div class="arrow-label">返回结果</div>
        </div>

        <!-- 完成标记 -->
        <div class="completion-mark">✓</div>

        <!-- 数据包 -->
        <div class="data-packet call-packet">
          <span>function_name</span>
        </div>
        <div class="data-packet return-packet">
          <span>result</span>
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
.function-calling {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  padding: 3rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 300px;
  position: relative;
}

.box {
  flex: 0 0 140px;
  height: 140px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  position: relative;
  opacity: 0;
  transform: scale(0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.function-calling.active .box {
  animation: boxAppear 0.6s ease forwards;
}

.agent-box {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: white;
}

.tool-box {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  animation-delay: 0.3s;
}

.box-icon {
  font-size: 3rem;
  line-height: 1;
}

.box-label {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.execution-ring {
  position: absolute;
  width: 160px;
  height: 160px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  opacity: 0;
}

.function-calling.active .execution-ring {
  animation: ringRotate 2s linear 2s infinite;
}

.arrow {
  flex: 1;
  position: relative;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-line {
  width: 100%;
  height: 3px;
  background: var(--vp-c-brand-1);
  position: relative;
  opacity: 0;
}

.arrow-line::after {
  content: '';
  position: absolute;
  right: -2px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid var(--vp-c-brand-1);
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
}

.function-calling.active .call-arrow .arrow-line {
  animation: arrowGrow 0.6s ease 0.8s forwards;
}

.function-calling.active .return-arrow .arrow-line {
  animation: arrowGrow 0.6s ease 4s forwards;
}

.arrow-label {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  white-space: nowrap;
  opacity: 0;
}

.function-calling.active .call-arrow .arrow-label {
  animation: labelFadeIn 0.4s ease 1.2s forwards;
}

.function-calling.active .return-arrow .arrow-label {
  animation: labelFadeIn 0.4s ease 4.4s forwards;
}

.data-packet {
  position: absolute;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
  opacity: 0;
  pointer-events: none;
}

.call-packet {
  top: 50%;
  left: 180px;
  transform: translateY(-50%);
}

.function-calling.active .call-packet {
  animation: moveToTool 1.2s ease 1.5s forwards;
}

.return-packet {
  top: 50%;
  right: 180px;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #10b981, #059669);
}

.function-calling.active .return-packet {
  animation: moveToAgent 1.2s ease 4.5s forwards;
}

.completion-mark {
  position: absolute;
  top: 50%;
  left: 70px;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
}

.function-calling.active .completion-mark {
  animation: checkAppear 0.6s ease 5.8s forwards;
}

@keyframes boxAppear {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes arrowGrow {
  from {
    opacity: 0;
    transform: scaleX(0);
  }
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes labelFadeIn {
  to {
    opacity: 1;
  }
}

@keyframes ringRotate {
  0% {
    opacity: 1;
    transform: rotate(0deg);
  }
  100% {
    opacity: 1;
    transform: rotate(360deg);
  }
}

@keyframes moveToTool {
  0% {
    opacity: 0;
    left: 180px;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
    left: calc(50% - 30px);
  }
  100% {
    opacity: 0;
    left: calc(50% - 30px);
  }
}

@keyframes moveToAgent {
  0% {
    opacity: 0;
    right: 180px;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
    right: calc(50% - 30px);
  }
  100% {
    opacity: 0;
    right: calc(50% - 30px);
  }
}

@keyframes checkAppear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@media (max-width: 768px) {
  .function-calling {
    flex-direction: column;
    gap: 2rem;
    padding: 2rem 1rem;
  }

  .arrow {
    width: 60px;
    height: 80px;
    transform: rotate(90deg);
  }

  .arrow-label {
    transform: translateX(-50%) rotate(-90deg);
  }

  .data-packet {
    display: none;
  }
}
</style>
