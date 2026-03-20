<template>
  <div ref="containerRef" class="lottie-player"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import lottie, { type AnimationItem } from 'lottie-web'
import type { LottiePlayerProps } from '../types'

const props = withDefaults(defineProps<LottiePlayerProps>(), {
  autoplay: false,
  loop: false,
  speed: 1
})

const emit = defineEmits<{
  complete: []
  loopComplete: []
}>()

const containerRef = ref<HTMLElement | null>(null)
let animation: AnimationItem | null = null

onMounted(() => {
  if (!containerRef.value) return

  animation = lottie.loadAnimation({
    container: containerRef.value,
    renderer: 'svg',
    loop: props.loop,
    autoplay: props.autoplay,
    animationData: props.animationData
  })

  animation.setSpeed(props.speed)

  animation.addEventListener('complete', () => {
    emit('complete')
  })

  animation.addEventListener('loopComplete', () => {
    emit('loopComplete')
  })
})

onUnmounted(() => {
  if (animation) {
    animation.destroy()
    animation = null
  }
})

watch(() => props.autoplay, (newVal) => {
  if (!animation) return
  if (newVal) {
    animation.play()
  } else {
    animation.pause()
  }
})

function play() {
  animation?.play()
}

function pause() {
  animation?.pause()
}

function stop() {
  animation?.stop()
}

function restart() {
  animation?.goToAndPlay(0)
}

defineExpose({
  play,
  pause,
  stop,
  restart
})
</script>

<style scoped>
.lottie-player {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>
