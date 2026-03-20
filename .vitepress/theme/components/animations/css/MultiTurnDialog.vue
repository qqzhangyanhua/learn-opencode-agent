<template>
  <AnimationContainer title="多轮对话" @restart="handleRestart">
    <template #default="{ isVisible }">
      <div :key="key" class="multi-turn-dialog" :class="{ active: isVisible && !isRestarting }">
        <!-- 第 1 轮对话 -->
        <div class="turn turn-1">
          <div class="message user">
            <div class="avatar">👤</div>
            <div class="bubble">帮我分析代码质量</div>
          </div>
          <div class="message agent">
            <div class="avatar">🤖</div>
            <div class="bubble">好的，我先看看项目结构...</div>
          </div>
        </div>

        <!-- 第 2 轮对话 -->
        <div class="turn turn-2">
          <div class="message user">
            <div class="avatar">👤</div>
            <div class="bubble">重点关注类型安全</div>
          </div>
          <div class="message agent">
            <div class="avatar">🤖</div>
            <div class="bubble">
              <span class="context-ref">[引用上下文]</span>
              发现 15 处使用了 any 类型...
            </div>
          </div>
        </div>

        <!-- 上下文展示 -->
        <div class="context-display">
          <div class="context-title">📋 上下文累积</div>
          <div class="context-items">
            <div class="context-item">轮次 1: 项目结构分析</div>
            <div class="context-item">轮次 2: 类型安全检查</div>
          </div>
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
.multi-turn-dialog {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.turn {
  margin-bottom: 2rem;
  opacity: 0;
  transform: translateY(20px);
}

.multi-turn-dialog.active .turn-1 {
  animation: fadeInUp 0.6s ease forwards;
}

.multi-turn-dialog.active .turn-2 {
  animation: fadeInUp 0.6s ease 3s forwards;
}

.multi-turn-dialog.active .context-display {
  animation: fadeInUp 0.6s ease 6s forwards;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
  animation: slideIn 0.4s ease;
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  animation: fadeIn 0.4s ease;
}

.message.user .bubble {
  background: var(--vp-c-brand-1);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.agent .bubble {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-bottom-left-radius: 4px;
}

.context-ref {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  margin-right: 0.5rem;
  background: rgba(255, 193, 7, 0.2);
  color: #f59e0b;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.context-display {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 8px;
  opacity: 0;
  transform: translateY(20px);
}

.context-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin-bottom: 0.75rem;
}

.context-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.context-item {
  padding: 0.5rem;
  background: var(--vp-c-bg);
  border-radius: 4px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  border-left: 3px solid var(--vp-c-brand-1);
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .bubble {
    max-width: 85%;
  }
}
</style>
