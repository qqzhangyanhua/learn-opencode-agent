<script setup lang="ts">
import type { PracticePlaygroundChapter, PracticePlaygroundChapterId } from './practicePlaygroundTypes'

const props = defineProps<{
  chapters: readonly PracticePlaygroundChapter[]
  selectedChapterId: PracticePlaygroundChapterId
  title: string
  modelLabel: string
  workStatusHint: string
  workStatusLabel: string
  workStatusTone: 'idle' | 'warning' | 'running' | 'ready' | 'success' | 'error'
  hasApiKey: boolean
  isConfigReady: boolean
  isRunBlocked: boolean
  isResetDisabled: boolean
  isRunning: boolean
}>()

const emit = defineEmits<{
  'select-chapter': [chapterId: PracticePlaygroundChapterId]
  'open-settings': []
  'reset-template': []
  run: []
}>()
</script>

<template>
  <header class="workspace-header">
    <div class="header-main">
      <label class="chapter-select">
        <span>章节</span>
        <select
          :value="selectedChapterId"
          @change="
            emit('select-chapter', ($event.target as HTMLSelectElement).value as PracticePlaygroundChapterId)
          "
        >
          <option
            v-for="chapter in chapters"
            :key="chapter.id"
            :value="chapter.id"
          >
            {{ chapter.number }} · {{ chapter.title }}
          </option>
        </select>
      </label>

      <div class="header-title">
        <h1>{{ title }}</h1>
        <p>
          <span>模型：{{ modelLabel }}</span>
          <span>{{ isConfigReady ? '运行配置完整' : '运行配置待补齐' }}</span>
          <span>{{ hasApiKey ? 'API Key 已配置' : 'API Key 未配置' }}</span>
        </p>
        <div class="header-status">
          <span :class="['status-pill', workStatusTone]">{{ workStatusLabel }}</span>
          <span class="status-hint">{{ workStatusHint }}</span>
        </div>
      </div>
    </div>

    <div class="header-actions">
      <button type="button" class="ghost-button" @click="emit('open-settings')">设置</button>
      <button
        type="button"
        class="ghost-button"
        :disabled="isResetDisabled"
        @click="emit('reset-template')"
      >
        重置
      </button>
      <button
        type="button"
        class="run-button"
        :disabled="isRunning || isRunBlocked"
        title="快捷键：Ctrl / ⌘ + Enter"
        @click="emit('run')"
      >
        {{ isRunning ? '运行中…' : '运行' }}
      </button>
      <span class="action-hint">快捷键：Ctrl / ⌘ + Enter</span>
    </div>
  </header>
</template>

<style scoped>
.workspace-header {
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 16%, var(--vp-c-divider));
  border-radius: 20px;
  padding: 18px 20px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--vp-c-brand-1) 16%, transparent), transparent 54%),
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 85%, white), var(--vp-c-bg-soft));
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
}

.header-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-width: 0;
}

.chapter-select {
  display: grid;
  gap: 6px;
  min-width: 210px;
}

.chapter-select span {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.chapter-select select {
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 12%, var(--vp-c-divider));
  border-radius: 12px;
  padding: 11px 13px;
  background: var(--vp-c-bg);
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.header-title {
  min-width: 0;
}

.header-title h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.02em;
}

.header-title p {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.header-title p span {
  border-radius: 999px;
  padding: 5px 10px;
  background: color-mix(in srgb, var(--vp-c-bg) 88%, transparent);
  border: 1px solid var(--vp-c-divider);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.header-status {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.status-pill {
  border-radius: 999px;
  padding: 6px 11px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
}

.status-pill.idle {
  color: var(--vp-c-text-2);
}

.status-pill.warning {
  border-color: color-mix(in srgb, #f59e0b 40%, var(--vp-c-divider));
  background: color-mix(in srgb, #f59e0b 10%, var(--vp-c-bg));
  color: #92400e;
}

.status-pill.running {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 40%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-bg));
  color: var(--vp-c-brand-1);
}

.status-pill.ready {
  border-color: color-mix(in srgb, #16a34a 40%, var(--vp-c-divider));
  background: color-mix(in srgb, #16a34a 10%, var(--vp-c-bg));
  color: #166534;
}

.status-pill.success {
  border-color: color-mix(in srgb, #16a34a 40%, var(--vp-c-divider));
  background: color-mix(in srgb, #16a34a 10%, var(--vp-c-bg));
  color: #166534;
}

.status-pill.error {
  border-color: color-mix(in srgb, #ef4444 40%, var(--vp-c-divider));
  background: color-mix(in srgb, #ef4444 10%, var(--vp-c-bg));
  color: #b42318;
}

.status-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.ghost-button,
.run-button {
  border-radius: 12px;
  padding: 10px 15px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  cursor: pointer;
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.run-button {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 28%, var(--vp-c-divider));
  color: var(--vp-c-brand-1);
  background: linear-gradient(180deg, color-mix(in srgb, var(--vp-c-brand-soft) 78%, white), var(--vp-c-brand-soft));
}

.ghost-button:disabled,
.run-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

@media (max-width: 900px) {
  .workspace-header,
  .header-main {
    flex-direction: column;
  }

  .chapter-select {
    min-width: 100%;
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 700px) {
  .workspace-header {
    padding: 16px;
  }

  .header-title h1 {
    font-size: 22px;
  }

  .header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ghost-button,
  .run-button {
    width: 100%;
  }

  .run-button {
    grid-column: 1 / -1;
  }
}
</style>
