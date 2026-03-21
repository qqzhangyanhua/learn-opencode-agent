<template>
  <div ref="containerRef" class="lottie-player"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { LottiePlayerProps } from '../../types'

type AnimationItem = import('lottie-web').AnimationItem

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
let observer: IntersectionObserver | null = null
let hasInitialized = false

async function initAnimation() {
  if (hasInitialized || !containerRef.value) return

  hasInitialized = true
  const lottie = await import('lottie-web')

  animation = lottie.default.loadAnimation({
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
}

onMounted(() => {
  if (!containerRef.value) {
    return
  }

  if (typeof IntersectionObserver === 'undefined') {
    void initAnimation()
    return
  }

  observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return
    void initAnimation()
    observer?.disconnect()
    observer = null
  }, {
    threshold: 0.2
  })

  observer.observe(containerRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
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
