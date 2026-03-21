<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { inBrowser } from 'vitepress'
import PracticePlaygroundSidebar from './PracticePlaygroundSidebar.vue'
import PracticePlaygroundConfigPanel from './PracticePlaygroundConfigPanel.vue'
import PracticePlaygroundRunner from './PracticePlaygroundRunner.vue'
import PracticePlaygroundOutput from './PracticePlaygroundOutput.vue'
import {
  DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID,
  getPracticePlaygroundChapterById,
  isPracticePlaygroundChapterId,
  PRACTICE_PLAYGROUND_CHAPTERS,
} from './practicePlaygroundCatalog'
import type {
  PracticePlaygroundChapterId,
  PracticePlaygroundConfig,
  PracticePlaygroundDifficulty,
  PracticePlaygroundRunState,
} from './practicePlaygroundTypes'
import {
  createDefaultPracticePlaygroundConfig,
  createInitialPracticePlaygroundRunState,
} from './practicePlaygroundTypes'
import {
  clearPracticePlaygroundConfig,
  loadPracticePlaygroundConfig,
  savePracticePlaygroundConfig,
} from './practicePlaygroundStorage'

const selectedChapterId = ref<PracticePlaygroundChapterId>(DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID)
const playgroundConfig = ref<PracticePlaygroundConfig>(createDefaultPracticePlaygroundConfig())
const runState = ref<PracticePlaygroundRunState>(createInitialPracticePlaygroundRunState())
const configStatusMessage = ref('')

const selectedChapter = computed(() => getPracticePlaygroundChapterById(selectedChapterId.value))

function getDifficultyLabel(difficulty: PracticePlaygroundDifficulty): string {
  if (difficulty === 'beginner') return '入门'
  if (difficulty === 'intermediate') return '进阶'
  return '高级'
}

function resolveChapterIdFromLocation(): PracticePlaygroundChapterId {
  if (!inBrowser) return DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID

  const params = new URLSearchParams(window.location.search)
  const chapter = params.get('chapter')
  if (chapter && isPracticePlaygroundChapterId(chapter)) {
    return chapter
  }
  return DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID
}

function syncChapterFromLocation() {
  const resolvedId = resolveChapterIdFromLocation()
  selectedChapterId.value = resolvedId
  replaceChapterQuery(resolvedId)
}

function replaceChapterQuery(id: PracticePlaygroundChapterId) {
  if (!inBrowser) return
  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('chapter', id)
  window.history.replaceState(window.history.state, '', nextUrl)
}

function pushChapterQuery(id: PracticePlaygroundChapterId) {
  if (!inBrowser) return
  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('chapter', id)
  window.history.pushState(window.history.state, '', nextUrl)
}

function handleChapterSelect(id: PracticePlaygroundChapterId) {
  if (id === selectedChapterId.value) return
  selectedChapterId.value = id
  runState.value = createInitialPracticePlaygroundRunState()
  pushChapterQuery(id)
}

function handlePopState() {
  syncChapterFromLocation()
  runState.value = createInitialPracticePlaygroundRunState()
}

function handleConfigUpdate(nextConfig: PracticePlaygroundConfig) {
  playgroundConfig.value = nextConfig
  configStatusMessage.value = ''
}

function handleConfigSave() {
  const didPersist = savePracticePlaygroundConfig(playgroundConfig.value)
  configStatusMessage.value = didPersist
    ? '配置已保存到当前浏览器。'
    : '配置已更新；当前浏览器策略不允许写入本地存储。'
}

function handleConfigClear() {
  const didClear = clearPracticePlaygroundConfig()
  playgroundConfig.value = createDefaultPracticePlaygroundConfig()
  configStatusMessage.value = didClear
    ? '已清空本地配置并恢复默认值。'
    : '已恢复默认值；当前浏览器策略不允许清理本地存储。'
}

function handleRunStateUpdate(nextState: PracticePlaygroundRunState) {
  runState.value = nextState
}

onMounted(() => {
  syncChapterFromLocation()
  playgroundConfig.value = loadPracticePlaygroundConfig()
  if (inBrowser) {
    window.addEventListener('popstate', handlePopState)
  }
})

onUnmounted(() => {
  if (inBrowser) {
    window.removeEventListener('popstate', handlePopState)
  }
})
</script>

<template>
  <div class="practice-playground-shell">
    <PracticePlaygroundSidebar
      class="shell-sidebar"
      :chapters="PRACTICE_PLAYGROUND_CHAPTERS"
      :selected-chapter-id="selectedChapterId"
      @select-chapter="handleChapterSelect"
    />

    <section class="shell-main">
      <header class="chapter-header">
        <div class="title-row">
          <h1>{{ selectedChapter.number }} · {{ selectedChapter.title }}</h1>
          <span class="difficulty-tag">{{ getDifficultyLabel(selectedChapter.difficulty) }}</span>
        </div>
        <p>{{ selectedChapter.summary }}</p>
        <div class="header-links">
          <a :href="selectedChapter.articleHref">返回原文章</a>
          <a href="/practice/setup/">查看实践环境准备</a>
        </div>
      </header>

      <PracticePlaygroundConfigPanel
        :config="playgroundConfig"
        @update:config="handleConfigUpdate"
        @save="handleConfigSave"
        @clear="handleConfigClear"
      />
      <p v-if="configStatusMessage" class="config-status">{{ configStatusMessage }}</p>
      <PracticePlaygroundRunner
        :chapter="selectedChapter"
        :config="playgroundConfig"
        @update:run-state="handleRunStateUpdate"
      />
      <PracticePlaygroundOutput
        :chapter="selectedChapter"
        :run-state="runState"
      />
    </section>
  </div>
</template>

<style scoped>
.practice-playground-shell {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 16px;
  margin: 24px 0 8px;
}

.shell-main {
  display: grid;
  gap: 12px;
}

.chapter-header {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
}

.chapter-header h1 {
  margin: 0;
  font-size: 22px;
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.difficulty-tag {
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
  font-weight: 600;
}

.chapter-header p {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
}

.header-links {
  margin-top: 12px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.header-links a {
  font-size: 14px;
}

.config-status {
  margin: -2px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

@media (max-width: 900px) {
  .practice-playground-shell {
    grid-template-columns: 1fr;
  }
}
</style>
