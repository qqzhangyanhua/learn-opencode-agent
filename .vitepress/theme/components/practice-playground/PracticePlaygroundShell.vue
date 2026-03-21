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
  serializePracticePlaygroundTemplate,
} from './practicePlaygroundTypes'
import {
  clearPracticePlaygroundConfig,
  getPracticePlaygroundStoredConfigUpdatedAt,
  hasPracticePlaygroundStoredConfig,
  loadPracticePlaygroundConfig,
  savePracticePlaygroundConfig,
} from './practicePlaygroundStorage'

interface PracticePlaygroundRunnerHandle {
  abort: (reason?: string) => void
  reset: (reason?: string) => void
  run: (payload: {
    chapter: PracticePlaygroundChapter
    config: PracticePlaygroundConfig
    runnerInput: PracticePlaygroundRunnerInput
  }) => Promise<void>
}

type WorkspaceFeedbackTone = 'neutral' | 'running' | 'success' | 'warning' | 'error'

const selectedChapterId = ref<PracticePlaygroundChapterId>(DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID)
const playgroundConfig = ref<PracticePlaygroundConfig>(createDefaultPracticePlaygroundConfig())
const hasStoredConfig = ref(false)
const storedConfigUpdatedAt = ref<number | null>(null)
const settingsModalOpen = ref(false)
const runState = ref<PracticePlaygroundRunState>(createInitialPracticePlaygroundRunState())
const workspaceFeedback = ref<{
  text: string
  tone: WorkspaceFeedbackTone
}>({
  text: '在左侧调整请求模板后，可以直接在右侧查看输出和调试信息。',
  tone: 'neutral',
})
const editorViewMode = ref<PracticePlaygroundTemplateViewMode>('structured')

const selectedChapter = computed(() => getPracticePlaygroundChapterById(selectedChapterId.value))
const defaultTemplate = computed(() => createPracticePlaygroundTemplate(selectedChapter.value))
const runnerRef = ref<PracticePlaygroundRunnerHandle | null>(null)

const editorState = ref<PracticeTemplateEditorState>(
  createPracticeTemplateEditorState(createPracticePlaygroundTemplate(selectedChapter.value)),
)
const lastAppliedTemplate = ref<PracticePlaygroundTemplate | null>(null)

const currentModelLabel = computed(() => playgroundConfig.value.model.trim() || '未设置')
const currentChapterLabel = computed(() => `${selectedChapter.value.number} · ${selectedChapter.value.title}`)
const currentTemplateLabel = computed(() => editorState.value.template.meta.title || '当前模板')
const configSourceLabel = computed(() => hasStoredConfig.value ? '浏览器本地存储' : '当前会话')
const configSavedAtLabel = computed(() => {
  if (!hasStoredConfig.value || storedConfigUpdatedAt.value === null) return '未保存到本地'

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(storedConfigUpdatedAt.value)
})
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
const headerStatus = computed<{
  hint: string
  label: string
  tone: 'idle' | 'warning' | 'running' | 'ready' | 'success' | 'error'
}>(() => {
  if (runState.value.status === 'running') {
    return {
      label: '运行中',
      hint: currentWorkspaceFeedback.value.text,
      tone: 'running',
    }
  }

  if (runState.value.status === 'success') {
    return {
      label: '已完成',
      hint: currentWorkspaceFeedback.value.text,
      tone: 'success',
    }
  }

  if (runState.value.status === 'error') {
    return {
      label: '运行失败',
      hint: currentWorkspaceFeedback.value.text,
      tone: 'error',
    }
  }

  if (runState.value.finishedAt && isAbortSummary(runState.value.debugLines)) {
    return {
      label: '已取消',
      hint: currentWorkspaceFeedback.value.text,
      tone: 'warning',
    }
  }

  if (workspaceFeedback.value.tone === 'success') {
    return {
      label: '已更新',
      hint: workspaceFeedback.value.text,
      tone: 'success',
    }
  }

  if (workspaceFeedback.value.tone === 'warning') {
    return {
      label: '已变更',
      hint: workspaceFeedback.value.text,
      tone: 'warning',
    }
  }

  if (!isConfigReady.value) {
    return {
      label: '待配置',
      hint: '先在设置中补齐 API Key、接口地址和模型名称。',
      tone: 'idle',
    }
  }

  if (runValidationMessage.value) {
    return {
      label: '需修复',
      hint: '先修复当前模板问题，再发起运行。',
      tone: 'warning',
    }
  }

  return {
    label: '可运行',
    hint: '左侧改完模板后可以直接运行。',
    tone: 'ready',
  }
})
const isResetDisabled = computed(() => {
  return !editorState.value.isDirty && !hasRunArtifacts.value
})
const canRun = computed(() => isConfigReady.value && !runValidationMessage.value)
const hasRunArtifacts = computed(() => {
  return runState.value.status !== 'idle'
    || Boolean(runState.value.outputText.trim())
    || runState.value.debugLines.length > 0
    || runState.value.configSnapshot !== null
})
const canRestoreLastRunTemplate = computed(() => {
  if (!lastAppliedTemplate.value) return false
  return serializePracticePlaygroundTemplate(lastAppliedTemplate.value)
    !== serializePracticePlaygroundTemplate(editorState.value.template)
})
const derivedWorkspaceFeedback = computed<{
  text: string
  tone: WorkspaceFeedbackTone
} | null>(() => {
  if (runState.value.status === 'running') {
    return {
      text: `正在运行 ${selectedChapter.value.playground.title}，右侧会持续刷新输出和调试信息。`,
      tone: 'running',
    }
  }

  if (runState.value.status === 'success') {
    return {
      text: `本次运行已完成${formatDurationSuffix(runState.value.durationMs)}，可以继续调整模板后再次运行。`,
      tone: 'success',
    }
  }

  if (runState.value.status === 'error') {
    return {
      text: runState.value.errorMessage || '本次运行失败，请先查看右侧调试信息再继续修改模板。',
      tone: 'error',
    }
  }

  if (runState.value.finishedAt && isAbortSummary(runState.value.debugLines)) {
    return {
      text: findLastAbortLine(runState.value.debugLines) ?? '本次运行已取消。',
      tone: 'warning',
    }
  }

  return null
})
const currentWorkspaceFeedback = computed(() => derivedWorkspaceFeedback.value ?? workspaceFeedback.value)
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
  runnerRef.value?.reset('请求已取消：浏览器前进或后退后，已切换章节。')
  selectedChapterId.value = resolvedId
  syncEditorStateForChapter(resolvedId)
  runState.value = createInitialPracticePlaygroundRunState()
  replaceChapterQuery(resolvedId)
}

function handleChapterSelect(id: PracticePlaygroundChapterId) {
  if (id === selectedChapterId.value) return
  runnerRef.value?.reset('请求已取消：你切换了章节，当前运行已中断。')
  selectedChapterId.value = id
  syncEditorStateForChapter(id)
  workspaceFeedback.value = {
    text: `已切换到 ${getPracticePlaygroundChapterById(id).playground.title}。`,
    tone: 'warning',
  }
  pushChapterQuery(id)
}

function handlePopState() {
  syncChapterFromLocation()
  workspaceFeedback.value = {
    text: `已切换到 ${selectedChapter.value.playground.title}。`,
    tone: 'warning',
  }
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
  hasStoredConfig.value = didPersist
  storedConfigUpdatedAt.value = didPersist ? getPracticePlaygroundStoredConfigUpdatedAt() : null
  workspaceFeedback.value = didPersist
    ? {
        text: '配置已保存到当前浏览器。',
        tone: 'success',
      }
    : {
        text: '配置已更新；当前浏览器策略不允许写入本地存储。',
        tone: 'warning',
      }
  settingsModalOpen.value = false
}

function handleSettingsClear() {
  const didClear = clearPracticePlaygroundConfig()
  playgroundConfig.value = createDefaultPracticePlaygroundConfig()
  hasStoredConfig.value = false
  storedConfigUpdatedAt.value = null
  workspaceFeedback.value = didClear
    ? {
        text: '已清空本地配置并恢复默认值。',
        tone: 'warning',
      }
    : {
        text: '已恢复默认值；当前浏览器策略不允许清理本地存储。',
        tone: 'warning',
      }
  settingsModalOpen.value = false
}

function handleEditorStateUpdate(nextState: PracticeTemplateEditorState) {
  editorState.value = nextState
}

function handleEditorViewModeUpdate(nextMode: PracticePlaygroundTemplateViewMode) {
  editorViewMode.value = nextMode
}

function handleResetTemplate() {
  runnerRef.value?.reset('请求已取消：你重置了模板，当前运行已中断。')
  syncEditorStateForChapter(selectedChapterId.value)
  workspaceFeedback.value = {
    text: `已恢复 ${selectedChapter.value.playground.title} 的默认模板。`,
    tone: 'warning',
  }
}

function handleClearResult() {
  runnerRef.value?.reset('请求已取消：你清空了结果面板。')
  runState.value = createInitialPracticePlaygroundRunState()
  workspaceFeedback.value = {
    text: lastAppliedTemplate.value
      ? '已清空结果面板，最近一次运行模板仍可恢复。'
      : '已清空结果面板。',
    tone: 'warning',
  }
}

function handleRestoreLastRunTemplate() {
  if (!lastAppliedTemplate.value) return

  const restoredTemplate = clonePracticePlaygroundTemplate(lastAppliedTemplate.value)
  editorState.value = {
    template: restoredTemplate,
    jsonText: serializePracticePlaygroundTemplate(restoredTemplate),
    jsonError: '',
    isDirty: true,
    lastSyncedFromTemplateAt: Date.now(),
  }
  workspaceFeedback.value = {
    text: `已恢复到最近一次运行模板：${restoredTemplate.meta.title}。`,
    tone: 'success',
  }
}

function handleRunStateUpdate(nextState: PracticePlaygroundRunState) {
  runState.value = nextState
}

function handleRun() {
  if (!isConfigReady.value) {
    workspaceFeedback.value = {
      text: '先在设置中补齐 API Key、接口地址和模型名称。',
      tone: 'warning',
    }
    return
  }

  if (runValidationMessage.value) {
    runState.value = {
      ...runState.value,
      status: 'error',
      errorMessage: runValidationMessage.value,
      debugLines: [...runState.value.debugLines, `运行前校验失败：${runValidationMessage.value}`],
    }
    workspaceFeedback.value = {
      text: runValidationMessage.value,
      tone: 'error',
    }
    return
  }

  const appliedTemplate = clonePracticePlaygroundTemplate(editorState.value.template)

  lastAppliedTemplate.value = appliedTemplate
  workspaceFeedback.value = {
    text: `已发起 ${selectedChapter.value.playground.title} 的运行请求，请在右侧查看输出和调试信息。`,
    tone: 'running',
  }
  void runnerRef.value?.run({
    chapter: selectedChapter.value,
    config: { ...playgroundConfig.value },
    runnerInput: runnerInput.value,
  })
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (settingsModalOpen.value || runState.value.status === 'running') return
  if (event.isComposing || event.defaultPrevented) return
  if (event.altKey || event.shiftKey) return
  if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return
  if (!canRun.value) return

  event.preventDefault()
  handleRun()
}

onMounted(() => {
  playgroundConfig.value = loadPracticePlaygroundConfig()
  hasStoredConfig.value = hasPracticePlaygroundStoredConfig()
  storedConfigUpdatedAt.value = getPracticePlaygroundStoredConfigUpdatedAt()
  syncChapterFromLocation()
  if (inBrowser) {
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleWindowKeydown)
  }
})

onUnmounted(() => {
  runnerRef.value?.abort('请求已取消：页面已卸载。')
  if (inBrowser) {
    window.removeEventListener('popstate', handlePopState)
    window.removeEventListener('keydown', handleWindowKeydown)
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

function formatDurationSuffix(durationMs: number | null): string {
  if (durationMs === null) return ''
  return `，耗时 ${durationMs} ms`
}

function isAbortSummary(debugLines: string[]): boolean {
  return debugLines.some((line) => /请求已取消|请求已重置|已切换章节|当前运行已中断/.test(line))
}

function findLastAbortLine(debugLines: string[]): string | null {
  for (let index = debugLines.length - 1; index >= 0; index -= 1) {
    const line = debugLines[index]
    if (/请求已取消|请求已重置|已切换章节|当前运行已中断/.test(line)) {
      return line
    }
  }
  return null
}
</script>

<template>
  <div class="practice-playground-shell">
    <PracticePlaygroundHeader
      :chapters="PRACTICE_PLAYGROUND_CHAPTERS"
      :selected-chapter-id="selectedChapterId"
      :title="selectedChapter.playground.title"
      :model-label="currentModelLabel"
      :work-status-hint="headerStatus.hint"
      :work-status-label="headerStatus.label"
      :work-status-tone="headerStatus.tone"
      :has-api-key="hasApiKey"
      :is-config-ready="isConfigReady"
      :is-run-blocked="!isConfigReady || Boolean(runValidationMessage)"
      :is-reset-disabled="isResetDisabled"
      :is-running="runState.status === 'running'"
      @select-chapter="handleChapterSelect"
      @open-settings="handleOpenSettings"
      @reset-template="handleResetTemplate"
      @run="handleRun"
    />

    <section class="workspace-main">
      <article class="workspace-pane editor-pane">
        <div class="pane-label">左侧编辑区</div>
        <h2>请求模板编辑器</h2>
        <p>
          当前章节：{{ selectedChapter.number }} · {{ selectedChapter.title }}
        </p>
        <PracticePlaygroundEditor
          :can-restore-last-run-template="canRestoreLastRunTemplate"
          :default-template="defaultTemplate"
          :editor-state="editorState"
          :last-run-template-label="lastAppliedTemplate?.meta.title || ''"
          :view-mode="editorViewMode"
          :run-validation-message="runValidationMessage"
          @restore-last-run-template="handleRestoreLastRunTemplate"
          @update:editor-state="handleEditorStateUpdate"
          @update:view-mode="handleEditorViewModeUpdate"
        />
      </article>

      <article class="workspace-pane result-pane">
        <div class="pane-label">右侧结果区</div>
        <h2>输出 / 调试</h2>
        <p :class="['workspace-feedback', currentWorkspaceFeedback.tone]">
          {{ currentWorkspaceFeedback.text }}
        </p>
        <PracticePlaygroundResultPanel
          :can-rerun="canRun"
          :chapter-label="currentChapterLabel"
          :config-saved-at-label="configSavedAtLabel"
          :config-source-label="configSourceLabel"
          :is-running="runState.status === 'running'"
          :run-state="runState"
          :template-label="currentTemplateLabel"
          @clear="handleClearResult"
          @rerun="handleRun"
        />
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

.workspace-main {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 14px;
}

.workspace-pane {
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-divider));
  border-radius: 20px;
  padding: 20px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 92%, white), var(--vp-c-bg-soft));
  min-width: 0;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
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
  font-size: 21px;
  letter-spacing: -0.02em;
}

.workspace-pane p {
  color: var(--vp-c-text-2);
}

.workspace-feedback {
  margin: 12px 0 0;
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  color: var(--vp-c-text-1);
}

.workspace-feedback.neutral {
  color: var(--vp-c-text-2);
}

.workspace-feedback.running {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 28%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-bg));
}

.workspace-feedback.success {
  border-color: color-mix(in srgb, #16a34a 34%, var(--vp-c-divider));
  background: color-mix(in srgb, #16a34a 10%, var(--vp-c-bg));
  color: #166534;
}

.workspace-feedback.warning {
  border-color: color-mix(in srgb, #f59e0b 34%, var(--vp-c-divider));
  background: color-mix(in srgb, #f59e0b 10%, var(--vp-c-bg));
  color: #92400e;
}

.workspace-feedback.error {
  border-color: color-mix(in srgb, #ef4444 34%, var(--vp-c-divider));
  background: color-mix(in srgb, #ef4444 10%, var(--vp-c-bg));
  color: #b42318;
}

@media (max-width: 900px) {
  .workspace-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .workspace-pane {
    border-radius: 18px;
    padding: 16px;
  }

  .workspace-pane h2 {
    font-size: 19px;
  }
}
</style>
