<template>
  <div ref="containerRef" class="lottie-player"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import lottie, { type AnimationItem } from 'lottie-web'
import type { LottiePlayerProps } from '../../types'

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
  console.log('LottiePlayer mounted')
  if (!containerRef.value) {
    console.error('Container ref is null')
    return
  }

  console.log('Loading animation with data:', {
    layers: props.animationData.layers?.length,
    frames: props.animationData.op,
    autoplay: props.autoplay
  })

  animation = lottie.loadAnimation({
    container: containerRef.value,
    renderer: 'svg',
    loop: props.loop,
    autoplay: props.autoplay,
    animationData: props.animationData
  })

  animation.setSpeed(props.speed)

  animation.addEventListener('complete', () => {
    console.log('Animation complete event')
    emit('complete')
  })

  animation.addEventListener('loopComplete', () => {
    console.log('Animation loop complete event')
    emit('loopComplete')
  })

  animation.addEventListener('DOMLoaded', () => {
    console.log('Animation DOM loaded')
  })

  animation.addEventListener('data_ready', () => {
    console.log('Animation data ready')
  })

  animation.addEventListener('error', (error) => {
    console.error('Animation error:', error)
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
  height: 500px;
  min-height: 500px;
  background: var(--vp-c-bg);
}
</style>
