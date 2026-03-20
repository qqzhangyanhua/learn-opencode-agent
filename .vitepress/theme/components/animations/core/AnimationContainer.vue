<template>
  <div ref="containerRef" class="animation-container" :class="{ visible: isVisible }">
    <div v-if="title" class="animation-header">
      <h3 class="animation-title">{{ title }}</h3>
      <span v-if="statusText" class="animation-status">{{ statusText }}</span>
    </div>
    <div class="animation-content">
      <slot :is-visible="isVisible" :restart="restart" />
    </div>
    <div class="animation-controls">
      <button class="btn-restart" @click="restart" aria-label="重新播放动画">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.65 2.35A7 7 0 1 0 15 8h-2a5 5 0 1 1-1.65-3.65L9 6h6V0l-1.35 2.35z" fill="currentColor"/>
        </svg>
        重新播放
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIntersectionObserver } from './useIntersectionObserver'
import type { AnimationContainerProps } from '../types'

const props = withDefaults(defineProps<AnimationContainerProps>(), {
  title: '',
  statusText: ''
})

const containerRef = ref<HTMLElement | null>(null)
const { isVisible } = useIntersectionObserver(containerRef, {
  threshold: 0.3,
  triggerOnce: true
})

const emit = defineEmits<{
  restart: []
}>()

function restart() {
  emit('restart')
}
</script>

<style scoped>
.animation-container {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.animation-container.visible {
  opacity: 1;
  transform: translateY(0);
}

.animation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.animation-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.animation-status {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.animation-content {
  margin: 1rem 0;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.animation-controls {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--vp-c-divider);
}

.btn-restart {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  background: transparent;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-restart:hover {
  color: #fff;
  background: var(--vp-c-brand-1);
}

.btn-restart:active {
  transform: scale(0.98);
}

.btn-restart svg {
  width: 16px;
  height: 16px;
}
</style>
