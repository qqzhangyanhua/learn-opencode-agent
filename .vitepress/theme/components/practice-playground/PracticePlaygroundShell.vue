<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { inBrowser } from 'vitepress'
import PracticePlaygroundHeader from './PracticePlaygroundHeader.vue'
import PracticePlaygroundSettingsModal from './PracticePlaygroundSettingsModal.vue'
import {
  DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID,
  getPracticePlaygroundChapterById,
  isPracticePlaygroundChapterId,
  PRACTICE_PLAYGROUND_CHAPTERS,
} from './practicePlaygroundCatalog'
import { createPracticePlaygroundTemplate } from './practicePlaygroundTemplates'
import type {
  PracticePlaygroundChapterId,
  PracticePlaygroundConfig,
  PracticePlaygroundRunState,
  PracticePlaygroundTemplate,
  PracticeTemplateEditorState,
} from './practicePlaygroundTypes'
import {
  createDefaultPracticePlaygroundConfig,
  createInitialPracticePlaygroundRunState,
  createPracticeTemplateEditorState,
} from './practicePlaygroundTypes'
import {
  clearPracticePlaygroundConfig,
  loadPracticePlaygroundConfig,
  savePracticePlaygroundConfig,
} from './practicePlaygroundStorage'

const selectedChapterId = ref<PracticePlaygroundChapterId>(DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID)
const playgroundConfig = ref<PracticePlaygroundConfig>(createDefaultPracticePlaygroundConfig())
const settingsModalOpen = ref(false)
const runState = ref<PracticePlaygroundRunState>(createInitialPracticePlaygroundRunState())
const configStatusMessage = ref('')
const workspaceMessage = ref('Task 2 仅完成工作台骨架，编辑器与结果面板将在后续任务接入。')

const selectedChapter = computed(() => getPracticePlaygroundChapterById(selectedChapterId.value))

const editorState = ref<PracticeTemplateEditorState>(
  createPracticeTemplateEditorState(createPracticePlaygroundTemplate(selectedChapter.value)),
)
const lastAppliedTemplate = ref<PracticePlaygroundTemplate | null>(null)

const currentModelLabel = computed(() => playgroundConfig.value.model.trim() || '未设置')
const hasApiKey = computed(() => Boolean(playgroundConfig.value.apiKey.trim()))
const isConfigReady = computed(() => {
  return Boolean(
    playgroundConfig.value.apiKey.trim()
      && playgroundConfig.value.baseURL.trim()
      && playgroundConfig.value.model.trim(),
  )
})

function cloneTemplate(template: PracticePlaygroundTemplate): PracticePlaygroundTemplate {
  return JSON.parse(JSON.stringify(template)) as PracticePlaygroundTemplate
}

function syncEditorStateForChapter(chapterId: PracticePlaygroundChapterId) {
  const chapter = getPracticePlaygroundChapterById(chapterId)
  const template = createPracticePlaygroundTemplate(chapter)
  editorState.value = createPracticeTemplateEditorState(template)
  lastAppliedTemplate.value = null
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

function syncChapterFromLocation() {
  const resolvedId = resolveChapterIdFromLocation()
  selectedChapterId.value = resolvedId
  syncEditorStateForChapter(resolvedId)
  runState.value = createInitialPracticePlaygroundRunState()
  replaceChapterQuery(resolvedId)
}

function handleChapterSelect(id: PracticePlaygroundChapterId) {
  if (id === selectedChapterId.value) return
  selectedChapterId.value = id
  syncEditorStateForChapter(id)
  runState.value = createInitialPracticePlaygroundRunState()
  workspaceMessage.value = `已切换到 ${getPracticePlaygroundChapterById(id).playground.title}，工作台骨架已更新。`
  pushChapterQuery(id)
}

function handlePopState() {
  syncChapterFromLocation()
}

function handleOpenSettings() {
  settingsModalOpen.value = true
}

function handleSettingsClose() {
  settingsModalOpen.value = false
}

function handleSettingsSave(nextConfig: PracticePlaygroundConfig) {
  playgroundConfig.value = nextConfig
  const didPersist = savePracticePlaygroundConfig(nextConfig)
  configStatusMessage.value = didPersist
    ? '配置已保存到当前浏览器。'
    : '配置已更新；当前浏览器策略不允许写入本地存储。'
  settingsModalOpen.value = false
}

function handleSettingsClear() {
  const didClear = clearPracticePlaygroundConfig()
  playgroundConfig.value = createDefaultPracticePlaygroundConfig()
  configStatusMessage.value = didClear
    ? '已清空本地配置并恢复默认值。'
    : '已恢复默认值；当前浏览器策略不允许清理本地存储。'
  settingsModalOpen.value = false
}

function handleResetTemplate() {
  syncEditorStateForChapter(selectedChapterId.value)
  runState.value = createInitialPracticePlaygroundRunState()
  workspaceMessage.value = `已重置 ${selectedChapter.value.playground.title} 的模板草稿。`
}

function handleRun() {
  const startedAt = Date.now()
  const appliedTemplate = cloneTemplate(editorState.value.template)
  const nextRequestToken = runState.value.requestToken + 1

  lastAppliedTemplate.value = appliedTemplate
  runState.value = {
    status: 'success',
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    outputText: '',
    debugLines: ['Task 2 占位运行：真实 runner 将在后续任务接入。'],
    errorMessage: '',
    requestToken: nextRequestToken,
    configSnapshot: {
      baseURL: playgroundConfig.value.baseURL.trim(),
      model: playgroundConfig.value.model.trim(),
      hasApiKey: hasApiKey.value,
    },
  }
  workspaceMessage.value = '运行按钮事件已接通；真实编辑器与结果面板将在后续任务接入。'
}

onMounted(() => {
  playgroundConfig.value = loadPracticePlaygroundConfig()
  syncChapterFromLocation()
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
    <PracticePlaygroundHeader
      :chapters="PRACTICE_PLAYGROUND_CHAPTERS"
      :selected-chapter-id="selectedChapterId"
      :title="selectedChapter.playground.title"
      :model-label="currentModelLabel"
      :has-api-key="hasApiKey"
      :is-config-ready="isConfigReady"
      :is-running="runState.status === 'running'"
      @select-chapter="handleChapterSelect"
      @open-settings="handleOpenSettings"
      @reset-template="handleResetTemplate"
      @run="handleRun"
    />

    <p v-if="configStatusMessage" class="config-status">{{ configStatusMessage }}</p>

    <section class="workspace-main">
      <article class="workspace-pane editor-pane">
        <div class="pane-label">左侧编辑区</div>
        <h2>请求模板编辑器</h2>
        <p>
          当前章节：{{ selectedChapter.number }} · {{ selectedChapter.title }}
        </p>
        <p>
          本任务先只搭工作台骨架。下一步会在这里接入结构化编辑和原始 JSON 双视图。
        </p>
        <dl class="meta-grid">
          <div>
            <dt>system</dt>
            <dd>{{ editorState.template.system || '当前模板未设置 system' }}</dd>
          </div>
          <div>
            <dt>messages</dt>
            <dd>{{ editorState.template.messages.length }} 条</dd>
          </div>
          <div>
            <dt>tools</dt>
            <dd>{{ editorState.template.tools.length }} 个</dd>
          </div>
          <div>
            <dt>模板状态</dt>
            <dd>{{ editorState.isDirty ? '有未保存改动' : '当前标签页草稿' }}</dd>
          </div>
        </dl>
      </article>

      <article class="workspace-pane result-pane">
        <div class="pane-label">右侧结果区</div>
        <h2>输出 / 调试 双面板占位</h2>
        <p>{{ workspaceMessage }}</p>
        <p v-if="lastAppliedTemplate" class="placeholder-note">
          最近一次触发运行的模板：{{ lastAppliedTemplate.meta.title }}
        </p>
        <div class="result-split">
          <section>
            <h3>输出面板</h3>
            <p>后续任务会在这里接入运行输出。</p>
          </section>
          <section>
            <h3>调试面板</h3>
            <p>后续任务会在这里接入请求摘要与 debug 日志。</p>
          </section>
        </div>
      </article>
    </section>

    <PracticePlaygroundSettingsModal
      :open="settingsModalOpen"
      :config="playgroundConfig"
      @close="handleSettingsClose"
      @save="handleSettingsSave"
      @clear="handleSettingsClear"
    />
  </div>
</template>

<style scoped>
.practice-playground-shell {
  display: grid;
  gap: 14px;
  margin: 24px 0 8px;
}

.config-status {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.workspace-main {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 14px;
}

.workspace-pane {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 18px;
  background: var(--vp-c-bg-soft);
  min-width: 0;
}

.pane-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.workspace-pane h2 {
  margin: 0;
  font-size: 20px;
}

.workspace-pane p {
  color: var(--vp-c-text-2);
}

.meta-grid {
  margin: 18px 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.meta-grid div {
  min-width: 0;
}

.meta-grid dt {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.meta-grid dd {
  margin: 6px 0 0;
  word-break: break-word;
}

.result-split {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.result-split section {
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
  background: var(--vp-c-bg);
}

.result-split h3 {
  margin: 0;
  font-size: 16px;
}

.placeholder-note {
  color: var(--vp-c-text-1);
}

@media (max-width: 900px) {
  .workspace-main {
    grid-template-columns: 1fr;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
