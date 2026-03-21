<script setup lang="ts">
import type { PracticePlaygroundChapter, PracticePlaygroundChapterId } from './practicePlaygroundTypes'

const props = defineProps<{
  chapters: readonly PracticePlaygroundChapter[]
  selectedChapterId: PracticePlaygroundChapterId
  title: string
  modelLabel: string
  hasApiKey: boolean
  isConfigReady: boolean
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
          <span>Model：{{ modelLabel }}</span>
          <span>{{ isConfigReady ? '配置完整' : '配置不完整' }}</span>
          <span>{{ hasApiKey ? 'API Key 已配置' : 'API Key 未配置' }}</span>
        </p>
      </div>
    </div>

    <div class="header-actions">
      <button type="button" class="ghost-button" @click="emit('open-settings')">设置</button>
      <button type="button" class="ghost-button" @click="emit('reset-template')">重置</button>
      <button
        type="button"
        class="run-button"
        :disabled="isRunning"
        @click="emit('run')"
      >
        {{ isRunning ? '运行中...' : '运行' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.workspace-header {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 16px 18px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--vp-c-brand-1) 12%, transparent), transparent 52%),
    var(--vp-c-bg-soft);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
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
  min-width: 180px;
}

.chapter-select span {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.chapter-select select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--vp-c-bg);
  min-width: 0;
}

.header-title {
  min-width: 0;
}

.header-title h1 {
  margin: 0;
  font-size: 24px;
}

.header-title p {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ghost-button,
.run-button {
  border-radius: 10px;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  font-weight: 600;
}

.run-button {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.run-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
</style>
