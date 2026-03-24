<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getPracticeProjectById } from '../data/practice-projects.js'
import {
  getPracticeSourceFiles,
  type PracticeSourceFileEntry
} from '../data/practice-source-files.js'
import type { PracticeProjectSourceFilesProps } from './types'

const props = defineProps<PracticeProjectSourceFilesProps>()

const project = computed(() => getPracticeProjectById(props.projectId))
const entries = computed(() => {
  const target = project.value
  return target ? getPracticeSourceFiles(target.sourceFiles) : []
})
const entryMap = computed(() => {
  const map = new Map<string, PracticeSourceFileEntry>()
  for (const entry of entries.value) {
    map.set(entry.path, entry)
  }
  return map
})
const orderedEntries = computed(() =>
  project.value?.sourceFiles.map((path) => ({
    path,
    entry: entryMap.value.get(path) ?? null
  })) ?? []
)
const heading = computed(() => props.title ?? '完整示例源码')

const copyStates = reactive<Record<string, boolean>>({})
const copyTimers = new Map<string, ReturnType<typeof setTimeout>>()
const openStates = reactive<Record<string, boolean>>({})
const highlightedCode = reactive<Record<string, string>>({})

// Shiki highlighter instance
let highlighterPromise: Promise<any> | null = null

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      try {
        const { getHighlighter } = await import('shiki')
        return await getHighlighter({
          themes: ['github-dark', 'github-light'],
          langs: ['typescript', 'javascript', 'json', 'bash', 'shell']
        })
      } catch (error) {
        console.warn('Failed to load Shiki highlighter:', error)
        return null
      }
    })()
  }
  return highlighterPromise
}

async function highlightCode(code: string, language: string): Promise<string> {
  const highlighter = await getHighlighter()
  if (!highlighter) {
    return code
  }

  try {
    const isDark = document.documentElement.classList.contains('dark')
    const theme = isDark ? 'github-dark' : 'github-light'

    // Map common language aliases
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'sh': 'bash'
    }
    const lang = langMap[language] || language

    const html = highlighter.codeToHtml(code, {
      lang,
      theme
    })

    // Extract only the code content, remove the outer pre tag
    const match = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/)
    return match ? match[1] : code
  } catch (error) {
    console.warn('Failed to highlight code:', error)
    return code
  }
}

onBeforeUnmount(() => {
  for (const timer of copyTimers.values()) {
    clearTimeout(timer)
  }
  copyTimers.clear()
})

async function tryCopy(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch (error) {
      console.warn('PracticeProjectSourceFiles copy failed', error)
    }
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.setSelectionRange(0, textarea.value.length)
    textarea.select()
    let succeeded = false
    try {
      succeeded = document.execCommand('copy')
    } catch (error) {
      console.warn('PracticeProjectSourceFiles execCommand copy failed', error)
    }
    document.body.removeChild(textarea)
    return succeeded
  }

  return false
}

function getEntry(path: string) {
  return entryMap.value.get(path)
}

async function handleCopy(path: string) {
  const entry = getEntry(path)
  if (!entry || !entry.code) return
  const success = await tryCopy(entry.code)
  if (!success) return
  copyStates[path] = true
  if (copyTimers.has(path)) {
    clearTimeout(copyTimers.get(path))
  }
  const timer = setTimeout(() => {
    copyStates[path] = false
    copyTimers.delete(path)
  }, 1600)
  copyTimers.set(path, timer)
}

function handleToggle(path: string, event: Event) {
  const details = event.currentTarget as HTMLDetailsElement | null
  const isOpen = Boolean(details?.open)
  openStates[path] = isOpen

  // Highlight code when opened
  if (isOpen && !highlightedCode[path]) {
    const entry = getEntry(path)
    if (entry?.code) {
      highlightCode(entry.code, entry.language).then((html) => {
        highlightedCode[path] = html
      })
    }
  }
}
</script>

<template>
  <section class="practice-source-files">
    <header class="practice-source-files__header">
      <h2>{{ heading }}</h2>
    </header>

    <div v-if="!project" class="practice-source-files__empty">
      <p>未能定位到指定的练习项目，无法展示源码。</p>
    </div>

    <div v-else>
      <div
        v-if="project.sourceFiles.length === 0"
        class="practice-source-files__empty"
      >
        <p>暂未配置示例源码文件，敬请稍后补齐。</p>
      </div>

      <div v-else class="practice-source-files__list">
        <details
          v-for="item in orderedEntries"
          :key="item.path"
          class="practice-source-files__entry"
          @toggle="handleToggle(item.path, $event)"
        >
          <summary class="practice-source-files__summary">
            <span class="practice-source-files__icon">▸</span>
            <span class="practice-source-files__path">{{ item.path }}</span>
            <span v-if="item.entry" class="practice-source-files__language">
              {{ item.entry.language }}
            </span>
          </summary>

          <div class="practice-source-files__body">
            <div v-if="!item.entry" class="practice-source-files__fallback">
              <p>源码暂未收录，敬请期待更新。</p>
            </div>
            <div v-else-if="openStates[item.path]">
              <div class="practice-source-files__controls">
                <button
                  type="button"
                  class="copy-button"
                  @click="handleCopy(item.path)"
                  :disabled="copyStates[item.path]"
                >
                  {{ copyStates[item.path] ? '✓ 已复制' : '复制' }}
                </button>
              </div>
              <div class="practice-source-files__code">
                <pre v-if="highlightedCode[item.path]" v-html="highlightedCode[item.path]"></pre>
                <pre v-else><code v-text="item.entry.code"></code></pre>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.practice-source-files {
  margin: 48px 0;
  padding: 0;
}

.practice-source-files__header h2 {
  margin: 0 0 20px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.practice-source-files__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.practice-source-files__entry {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  overflow: hidden;
  transition: border-color 0.2s;
}

.practice-source-files__entry[open] {
  border-color: var(--vp-c-brand-1);
}

.practice-source-files__summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.practice-source-files__summary:hover {
  background: var(--vp-c-bg-soft);
}

.practice-source-files__summary::-webkit-details-marker {
  display: none;
}

.practice-source-files__icon {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  transition: transform 0.2s;
  display: inline-block;
}

.practice-source-files__entry[open] .practice-source-files__icon {
  transform: rotate(90deg);
}

.practice-source-files__path {
  flex: 1;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  word-break: break-all;
}

.practice-source-files__language {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.practice-source-files__body {
  padding: 0 16px 16px;
}

.practice-source-files__fallback {
  padding: 12px 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.practice-source-files__controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.copy-button {
  padding: 4px 12px;
  font-size: 0.85rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--vp-font-family-base);
}

.copy-button:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.copy-button:disabled {
  cursor: default;
  color: var(--vp-c-brand-1);
}

.practice-source-files__code {
  border-radius: 6px;
  overflow: hidden;
}

.practice-source-files__code pre {
  margin: 0;
  padding: 16px;
  font-size: 0.875rem;
  line-height: 1.7;
  overflow-x: auto;
  background: var(--vp-code-block-bg);
}

.practice-source-files__code code {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-code-block-color);
}

/* Shiki highlighted code styles */
.practice-source-files__code :deep(.line) {
  display: inline-block;
  min-height: 1em;
}

.practice-source-files__code :deep(span) {
  font-family: var(--vp-font-family-mono);
}

.practice-source-files__empty {
  margin-top: 16px;
  padding: 16px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  border: 1px dashed var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.practice-source-files__empty p {
  margin: 0;
}

@media (max-width: 768px) {
  .practice-source-files__summary {
    flex-wrap: wrap;
    gap: 8px;
  }

  .practice-source-files__path {
    flex-basis: 100%;
  }

  .practice-source-files__code pre {
    font-size: 0.8rem;
  }
}
</style>
