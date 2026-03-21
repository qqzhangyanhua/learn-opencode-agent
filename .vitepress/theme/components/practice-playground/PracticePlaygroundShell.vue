<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { inBrowser } from 'vitepress'
import PracticePlaygroundEditor from './PracticePlaygroundEditor.vue'
import PracticePlaygroundHeader from './PracticePlaygroundHeader.vue'
import PracticePlaygroundResultPanel from './PracticePlaygroundResultPanel.vue'
import PracticePlaygroundRunner from './PracticePlaygroundRunner.vue'
import PracticePlaygroundSettingsModal from './PracticePlaygroundSettingsModal.vue'
import {
  DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID,
  getPracticePlaygroundChapterById,
  isPracticePlaygroundChapterId,
  PRACTICE_PLAYGROUND_CHAPTERS,
} from './practicePlaygroundCatalog'
import { adaptPracticeTemplateToRunnerInput } from './practicePlaygroundTemplateAdapters'
import { createPracticePlaygroundTemplate } from './practicePlaygroundTemplates'
import type {
  PracticePlaygroundChapter,
  PracticePlaygroundChapterId,
  PracticePlaygroundConfig,
  PracticePlaygroundRunnerInput,
  PracticePlaygroundRunState,
  PracticePlaygroundTemplate,
  PracticePlaygroundTemplateViewMode,
  PracticeTemplateEditorState,
} from './practicePlaygroundTypes'
import {
  clonePracticePlaygroundTemplate,
  createDefaultPracticePlaygroundConfig,
  createInitialPracticePlaygroundRunState,
  createPracticeTemplateEditorState,
} from './practicePlaygroundTypes'
import {
  clearPracticePlaygroundConfig,
  loadPracticePlaygroundConfig,
  savePracticePlaygroundConfig,
} from './practicePlaygroundStorage'

interface PracticePlaygroundRunnerHandle {
  abort: (reason?: string) => void
  reset: () => void
  run: (payload: {
    chapter: PracticePlaygroundChapter
    config: PracticePlaygroundConfig
    runnerInput: PracticePlaygroundRunnerInput
  }) => Promise<void>
}

const selectedChapterId = ref<PracticePlaygroundChapterId>(DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID)
const playgroundConfig = ref<PracticePlaygroundConfig>(createDefaultPracticePlaygroundConfig())
const settingsModalOpen = ref(false)
const runState = ref<PracticePlaygroundRunState>(createInitialPracticePlaygroundRunState())
const configStatusMessage = ref('')
const workspaceMessage = ref('你可以在左侧切换结构化编辑和原始 JSON，当前右侧结果区仍是占位实现。')
const editorViewMode = ref<PracticePlaygroundTemplateViewMode>('structured')

const selectedChapter = computed(() => getPracticePlaygroundChapterById(selectedChapterId.value))
const defaultTemplate = computed(() => createPracticePlaygroundTemplate(selectedChapter.value))
const runnerRef = ref<PracticePlaygroundRunnerHandle | null>(null)

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

const runValidationMessage = computed(() => {
  if (editorState.value.jsonError) {
    return 'JSON 当前存在解析错误，请先修复后再运行。'
  }

  const lockedToolIssue = getLockedToolIssue(editorState.value.template, defaultTemplate.value)
  if (lockedToolIssue) return lockedToolIssue

  return ''
})
const runnerInput = computed(() =>
  adaptPracticeTemplateToRunnerInput(
    selectedChapter.value,
    editorState.value.template,
    playgroundConfig.value,
  ),
)

function syncEditorStateForChapter(chapterId: PracticePlaygroundChapterId) {
  const chapter = getPracticePlaygroundChapterById(chapterId)
  const template = createPracticePlaygroundTemplate(chapter)
  editorState.value = createPracticeTemplateEditorState(template)
  editorViewMode.value = 'structured'
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
  runnerRef.value?.reset()
  selectedChapterId.value = resolvedId
  syncEditorStateForChapter(resolvedId)
  runState.value = createInitialPracticePlaygroundRunState()
  replaceChapterQuery(resolvedId)
}

function handleChapterSelect(id: PracticePlaygroundChapterId) {
  if (id === selectedChapterId.value) return
  runnerRef.value?.reset()
  selectedChapterId.value = id
  syncEditorStateForChapter(id)
  workspaceMessage.value = `已切换到 ${getPracticePlaygroundChapterById(id).playground.title}，请求状态已重置。`
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

function handleEditorStateUpdate(nextState: PracticeTemplateEditorState) {
  editorState.value = nextState
}

function handleEditorViewModeUpdate(nextMode: PracticePlaygroundTemplateViewMode) {
  editorViewMode.value = nextMode
}

function handleResetTemplate() {
  runnerRef.value?.reset()
  syncEditorStateForChapter(selectedChapterId.value)
  workspaceMessage.value = `已重置 ${selectedChapter.value.playground.title} 的模板草稿。`
}

function handleRunStateUpdate(nextState: PracticePlaygroundRunState) {
  runState.value = nextState
}

function handleRun() {
  if (runValidationMessage.value) {
    runState.value = {
      ...runState.value,
      status: 'error',
      errorMessage: runValidationMessage.value,
      debugLines: [...runState.value.debugLines, `运行前校验失败：${runValidationMessage.value}`],
    }
    workspaceMessage.value = runValidationMessage.value
    return
  }

  const startedAt = Date.now()
  const appliedTemplate = clonePracticePlaygroundTemplate(editorState.value.template)

  lastAppliedTemplate.value = appliedTemplate
  void runnerRef.value?.run({
    chapter: selectedChapter.value,
    config: { ...playgroundConfig.value },
    runnerInput: runnerInput.value,
  })
  workspaceMessage.value = `已开始运行 ${selectedChapter.value.playground.title}。`
}

onMounted(() => {
  playgroundConfig.value = loadPracticePlaygroundConfig()
  syncChapterFromLocation()
  if (inBrowser) {
    window.addEventListener('popstate', handlePopState)
  }
})

onUnmounted(() => {
  runnerRef.value?.abort('请求已取消：页面已卸载。')
  if (inBrowser) {
    window.removeEventListener('popstate', handlePopState)
  }
})

function getLockedToolIssue(
  currentTemplate: PracticePlaygroundTemplate,
  chapterTemplate: PracticePlaygroundTemplate,
): string {
  for (const [index, tool] of chapterTemplate.tools.entries()) {
    if (!tool.locked) continue

    const currentTool = currentTemplate.tools[index]
    if (!currentTool) {
      return `本章本地工具实现固定，不能删除锁定工具 ${tool.function.name}。`
    }

    if (currentTool.type !== tool.type) {
      return `本章本地工具实现固定，不能修改锁定工具 ${tool.function.name} 的类型。`
    }

    if (currentTool.function.name !== tool.function.name) {
      return `本章本地工具实现固定，不能修改锁定工具 ${tool.function.name} 的工具名。`
    }
  }

  return ''
}
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
      :is-run-blocked="Boolean(runValidationMessage)"
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
        <PracticePlaygroundEditor
          :default-template="defaultTemplate"
          :editor-state="editorState"
          :view-mode="editorViewMode"
          :run-validation-message="runValidationMessage"
          @update:editor-state="handleEditorStateUpdate"
          @update:view-mode="handleEditorViewModeUpdate"
        />
      </article>

      <article class="workspace-pane result-pane">
        <div class="pane-label">右侧结果区</div>
        <h2>输出 / 调试</h2>
        <p>{{ workspaceMessage }}</p>
        <p v-if="lastAppliedTemplate" class="placeholder-note">
          最近一次触发运行的模板：{{ lastAppliedTemplate.meta.title }}
        </p>
        <PracticePlaygroundResultPanel :run-state="runState" />
      </article>
    </section>

    <PracticePlaygroundSettingsModal
      :open="settingsModalOpen"
      :config="playgroundConfig"
      @close="handleSettingsClose"
      @save="handleSettingsSave"
      @clear="handleSettingsClear"
    />

    <PracticePlaygroundRunner ref="runnerRef" @update:runState="handleRunStateUpdate" />
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

.placeholder-note {
  color: var(--vp-c-text-1);
}

@media (max-width: 900px) {
  .workspace-main {
    grid-template-columns: 1fr;
  }
}
</style>
