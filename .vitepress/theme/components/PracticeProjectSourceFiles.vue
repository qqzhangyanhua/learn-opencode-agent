<script setup lang="ts">
import { computed, onBeforeUnmount, reactive } from 'vue'
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
    document.body.appendChild(textarea)
    textarea.select()
    const succeeded = document.execCommand('copy')
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
        >
          <summary class="practice-source-files__summary">
            <span class="practice-source-files__path">{{ item.path }}</span>
            <span v-if="item.entry" class="practice-source-files__language">
              {{ item.entry.language.toUpperCase() }}
            </span>
          </summary>

          <div class="practice-source-files__body">
            <div v-if="!item.entry" class="practice-source-files__fallback">
              <p>源码暂未收录，敬请期待更新。</p>
            </div>
            <div v-else>
              <div class="practice-source-files__controls">
                <button
                  type="button"
                  @click="handleCopy(item.path)"
                  :disabled="copyStates[item.path]"
                >
                  {{ copyStates[item.path] ? '已复制' : '复制代码' }}
                </button>
              </div>
              <div class="practice-source-files__code"><pre><code class="practice-source-files__code-text" v-text="item.entry.code"></code></pre></div>
            </div>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.practice-source-files {
  margin: 56px 0;
  padding: 32px;
  border-radius: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

.practice-source-files__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.practice-source-files__header h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--vp-c-text);
}

.practice-source-files__list {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.practice-source-files__entry {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg);
  overflow: hidden;
}

.practice-source-files__summary {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  font-weight: 600;
  font-size: 1rem;
  color: var(--vp-c-text);
  cursor: pointer;
}

.practice-source-files__path {
  max-width: 70%;
  word-break: break-all;
}

.practice-source-files__language {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.practice-source-files__body {
  padding: 0 20px 20px;
}

.practice-source-files__fallback {
  padding: 14px 0;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.practice-source-files__controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.practice-source-files__controls button {
  padding: 8px 14px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.practice-source-files__controls button:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}

.practice-source-files__controls button:disabled {
  cursor: default;
  opacity: 0.7;
}

.practice-source-files__code {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
}

.practice-source-files__code pre {
  margin: 0;
  padding: 16px;
  font-size: 0.85rem;
  line-height: 1.6;
  font-family: var(--vp-font-mono, 'JetBrains Mono', 'SFMono-Regular', monospace);
  white-space: pre;
  color: var(--vp-c-text);
}

.practice-source-files__code-text {
  display: block;
  white-space: pre;
}

.practice-source-files__empty {
  margin-top: 24px;
  padding: 16px;
  border-radius: 14px;
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

@media (max-width: 768px) {
  .practice-source-files {
    padding: 24px;
  }

  .practice-source-files__summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .practice-source-files__controls {
    justify-content: flex-start;
  }
}
</style>
