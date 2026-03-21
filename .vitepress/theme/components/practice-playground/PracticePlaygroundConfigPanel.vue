<script setup lang="ts">
import { ref } from 'vue'
import type { PracticePlaygroundConfig } from './practicePlaygroundTypes'

const props = defineProps<{
  config: PracticePlaygroundConfig
}>()

const emit = defineEmits<{
  'update:config': [config: PracticePlaygroundConfig]
  save: []
  clear: []
}>()

const isApiKeyVisible = ref(false)

function handleFieldChange(field: 'apiKey' | 'baseURL' | 'model', value: string) {
  emit('update:config', {
    ...props.config,
    [field]: value,
  })
}

function toggleApiKeyVisibility() {
  isApiKeyVisible.value = !isApiKeyVisible.value
}
</script>

<template>
  <section class="config-panel">
    <header class="panel-header">
      <h2>共享配置</h2>
      <p>以下配置会用于当前 Playground 的全部章节。</p>
    </header>

    <label class="config-item">
      <span>API Key</span>
      <div class="secret-input-row">
        <input
          :type="isApiKeyVisible ? 'text' : 'password'"
          :value="config.apiKey"
          placeholder="sk-..."
          autocomplete="off"
          @input="handleFieldChange('apiKey', ($event.target as HTMLInputElement).value)"
        />
        <button type="button" class="subtle-button" @click="toggleApiKeyVisibility">
          {{ isApiKeyVisible ? '隐藏 Key' : '显示 Key' }}
        </button>
      </div>
    </label>

    <label class="config-item">
      <span>baseURL</span>
      <input
        type="text"
        :value="config.baseURL"
        placeholder="https://api.openai.com/v1"
        @input="handleFieldChange('baseURL', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="config-item">
      <span>model</span>
      <input
        type="text"
        :value="config.model"
        placeholder="gpt-4o"
        @input="handleFieldChange('model', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <div class="actions-row">
      <button type="button" class="primary-button" @click="emit('save')">保存到本地</button>
      <button type="button" class="danger-button" @click="emit('clear')">清空配置</button>
    </div>

    <p class="security-tip">
      安全提示：API Key 仅保存在当前浏览器本地，不会提交到仓库。请勿在公共设备保存敏感配置，离开前建议点击“清空配置”。
    </p>
  </section>
</template>

<style scoped>
.config-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  display: grid;
  gap: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
}

.panel-header p {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.config-item {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.config-item input {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 9px 10px;
  background: var(--vp-c-bg);
}

.secret-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.primary-button,
.danger-button,
.subtle-button {
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
}

.primary-button {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.danger-button {
  border-color: var(--vp-c-danger-1);
  color: var(--vp-c-danger-1);
}

.security-tip {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.5;
}
</style>
