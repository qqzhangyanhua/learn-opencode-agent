<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PracticePlaygroundJsonEditor from './PracticePlaygroundJsonEditor.vue'
import PracticePlaygroundStructuredEditor from './PracticePlaygroundStructuredEditor.vue'
import type {
  PracticePlaygroundTemplate,
  PracticePlaygroundTemplateViewMode,
  PracticeTemplateEditorState,
} from './practicePlaygroundTypes'
import {
  parsePracticePlaygroundTemplateJson,
  serializePracticePlaygroundTemplate,
} from './practicePlaygroundTypes'

const props = defineProps<{
  canRestoreLastRunTemplate: boolean
  defaultTemplate: PracticePlaygroundTemplate
  editorState: PracticeTemplateEditorState
  lastRunTemplateLabel: string
  viewMode: PracticePlaygroundTemplateViewMode
  runValidationMessage: string
}>()

const emit = defineEmits<{
  'restore-last-run-template': []
  'update:editor-state': [state: PracticeTemplateEditorState]
  'update:view-mode': [mode: PracticePlaygroundTemplateViewMode]
}>()

const copyStatus = ref('')
const draftStatusLabel = computed(() => (
  props.editorState.isDirty ? '草稿未保存' : '当前为默认草稿'
))
const draftStatusTone = computed(() => (
  props.editorState.isDirty ? 'warning' : 'idle'
))
const lastEditedLabel = computed(() => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(props.editorState.lastSyncedFromTemplateAt)
})

watch(
  () => copyStatus.value,
  (value) => {
    if (!value) return
    const timer = window.setTimeout(() => {
      copyStatus.value = ''
    }, 1800)
    return () => window.clearTimeout(timer)
  },
)

function handleViewModeChange(mode: PracticePlaygroundTemplateViewMode) {
  if (mode === props.viewMode) return

  if (mode === 'json') {
    emit('update:editor-state', {
      ...props.editorState,
      jsonText: serializePracticePlaygroundTemplate(props.editorState.template),
      jsonError: '',
      lastSyncedFromTemplateAt: Date.now(),
    })
  }

  emit('update:view-mode', mode)
}

function handleStructuredTemplateUpdate(template: PracticePlaygroundTemplate) {
  emit('update:editor-state', {
    template,
    jsonText: serializePracticePlaygroundTemplate(template),
    jsonError: '',
    isDirty: true,
    lastSyncedFromTemplateAt: Date.now(),
  })
}

function handleJsonTextUpdate(jsonText: string) {
  try {
    const template = parsePracticePlaygroundTemplateJson(jsonText)
    emit('update:editor-state', {
      template,
      jsonText,
      jsonError: '',
      isDirty: true,
      lastSyncedFromTemplateAt: Date.now(),
    })
  } catch (error) {
    emit('update:editor-state', {
      ...props.editorState,
      jsonText,
      jsonError: error instanceof Error ? error.message : 'JSON 解析失败',
      isDirty: true,
    })
  }
}

function handleFormatJson() {
  try {
    const template = parsePracticePlaygroundTemplateJson(props.editorState.jsonText)
    emit('update:editor-state', {
      template,
      jsonText: serializePracticePlaygroundTemplate(template),
      jsonError: '',
      isDirty: true,
      lastSyncedFromTemplateAt: Date.now(),
    })
  } catch (error) {
    emit('update:editor-state', {
      ...props.editorState,
      jsonError: error instanceof Error ? error.message : 'JSON 解析失败',
      isDirty: true,
    })
  }
}

async function handleCopyTemplateJson() {
  const text = props.editorState.jsonText.trim()
  if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    copyStatus.value = '当前环境不支持复制模板。'
    return
  }

  try {
    await navigator.clipboard.writeText(props.editorState.jsonText)
    copyStatus.value = '模板 JSON 已复制。'
  } catch {
    copyStatus.value = '复制失败，请手动复制。'
  }
}
</script>

<template>
  <section class="practice-editor">
    <div class="editor-topbar">
      <div class="view-switcher">
        <button
          type="button"
          :class="['tab-button', { active: viewMode === 'structured' }]"
          @click="handleViewModeChange('structured')"
        >
          结构化编辑
        </button>
        <button
          type="button"
          :class="['tab-button', { active: viewMode === 'json' }]"
          @click="handleViewModeChange('json')"
        >
          原始 JSON
        </button>
        <button
          type="button"
          class="tab-button secondary-action"
          @click="handleCopyTemplateJson"
        >
          复制当前模板 JSON
        </button>
        <button
          type="button"
          class="tab-button secondary-action"
          :disabled="!canRestoreLastRunTemplate"
          :title="lastRunTemplateLabel ? `恢复到最近运行模板：${lastRunTemplateLabel}` : '当前没有可恢复的最近运行模板'"
          @click="emit('restore-last-run-template')"
        >
          恢复最近运行模板
        </button>
      </div>

      <div class="editor-status">
        <span :class="['status-pill', draftStatusTone]">{{ draftStatusLabel }}</span>
        <span>最后修改：{{ lastEditedLabel }}</span>
        <span>改动仅在当前标签页有效</span>
        <span v-if="copyStatus">{{ copyStatus }}</span>
      </div>
    </div>

    <p v-if="viewMode === 'structured' && editorState.jsonError" class="warning-banner">
      JSON 当前有错误，结构化视图展示的是上一次有效版本。
    </p>
    <p v-if="runValidationMessage" class="error-banner">{{ runValidationMessage }}</p>

    <PracticePlaygroundStructuredEditor
      v-if="viewMode === 'structured'"
      :template="editorState.template"
      :default-template="defaultTemplate"
      @update:template="handleStructuredTemplateUpdate"
    />

    <PracticePlaygroundJsonEditor
      v-else
      :json-text="editorState.jsonText"
      :json-error="editorState.jsonError"
      @update:json-text="handleJsonTextUpdate"
      @format-json="handleFormatJson"
    />
  </section>
</template>

<style scoped>
.practice-editor {
  display: grid;
  gap: 14px;
}

.editor-topbar {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 12px 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 90%, white), var(--vp-c-bg-soft));
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
}

.view-switcher {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-button {
  border-radius: 999px;
  padding: 8px 15px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  cursor: pointer;
  font-weight: 600;
}

.tab-button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.tab-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary-action {
  color: var(--vp-c-text-2);
}

.editor-status {
  display: grid;
  gap: 4px;
  text-align: right;
  font-size: 12px;
  color: var(--vp-c-text-2);
  justify-items: end;
}

.status-pill {
  border-radius: 999px;
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  background: color-mix(in srgb, var(--vp-c-bg) 92%, white);
  color: var(--vp-c-text-2);
}

.status-pill.warning {
  border-color: color-mix(in srgb, #f59e0b 40%, var(--vp-c-divider));
  background: color-mix(in srgb, #f59e0b 10%, var(--vp-c-bg));
  color: #92400e;
}

.warning-banner,
.error-banner {
  margin: 0;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
}

.warning-banner {
  background: color-mix(in srgb, #f59e0b 12%, var(--vp-c-bg));
  color: #92400e;
}

.error-banner {
  background: color-mix(in srgb, #ef4444 10%, var(--vp-c-bg));
  color: #b42318;
}

@media (max-width: 700px) {
  .editor-status {
    text-align: left;
    justify-items: start;
  }
}
</style>
