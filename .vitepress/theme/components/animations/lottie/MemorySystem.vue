<template>
  <AnimationContainer title="记忆系统演进" @restart="handleRestart">
    <template #default="{ isVisible }">
      <LottiePlayer
        ref="playerRef"
        :animation-data="animationData"
        :autoplay="isVisible"
        :loop="false"
        @complete="handleComplete"
      />
    </template>
  </AnimationContainer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AnimationContainer from '../core/AnimationContainer.vue'
import LottiePlayer from '../core/LottiePlayer.vue'
import animationData from './assets/memory-system.json'

const playerRef = ref<InstanceType<typeof LottiePlayer> | null>(null)

function handleRestart() {
  playerRef.value?.restart()
}

function handleComplete() {
  console.log('Memory system animation completed')
}
</script>
