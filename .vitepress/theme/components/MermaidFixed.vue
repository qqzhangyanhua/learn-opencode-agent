<template>
  <div v-html="svg" :class="props.class"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, toRaw } from 'vue'
import { useData } from 'vitepress'
import mermaid from 'mermaid'

const pluginSettings = ref({
  securityLevel: 'loose',
  startOnLoad: false,
  externalDiagrams: [],
})

const { page } = useData()
const { frontmatter } = toRaw(page.value)
const mermaidPageTheme = frontmatter.mermaidTheme || ''

const props = defineProps({
  graph: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    required: false,
    default: 'mermaid',
  },
})

const svg = ref(null)
let mut = null
let isMounted = false

async function init(externalDiagrams) {
  try {
    if (mermaid.registerExternalDiagrams) {
      await mermaid.registerExternalDiagrams(externalDiagrams)
    }
  } catch (e) {
    console.error(e)
  }
}

async function renderChart() {
  const hasDarkClass = document.documentElement.classList.contains('dark')
  const mermaidConfig = { ...pluginSettings.value }

  if (mermaidPageTheme) mermaidConfig.theme = mermaidPageTheme
  if (hasDarkClass) mermaidConfig.theme = 'dark'

  mermaid.initialize(mermaidConfig)
  const { svg: svgCode } = await mermaid.render(
    props.id,
    decodeURIComponent(props.graph)
  )

  if (!isMounted) return

  const salt = Math.random().toString(36).substring(7)
  svg.value = `${svgCode} <span style="display: none">${salt}</span>`
}

onMounted(async () => {
  isMounted = true

  await init(pluginSettings.value.externalDiagrams)
  if (!isMounted) return

  let settings = await import('virtual:mermaid-config')
  if (!isMounted) return

  if (settings?.default) pluginSettings.value = settings.default

  mut = new MutationObserver(async () => {
    if (isMounted) await renderChart()
  })
  mut.observe(document.documentElement, { attributes: true })

  await renderChart()

  const hasImages = /<img([\w\W]+?)>/.exec(decodeURIComponent(props.graph))?.length > 0
  if (hasImages) {
    setTimeout(() => {
      if (!isMounted) return
      const imgs = Array.from(document.getElementsByTagName('img'))
      if (imgs.length) {
        Promise.all(
          imgs
            .filter((img) => !img.complete)
            .map((img) => new Promise((resolve) => { img.onload = img.onerror = resolve }))
        ).then(async () => {
          if (isMounted) await renderChart()
        })
      }
    }, 100)
  }
})

onUnmounted(() => {
  isMounted = false
  mut?.disconnect()
})
</script>
