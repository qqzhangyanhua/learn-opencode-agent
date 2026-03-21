<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PracticePlaygroundConfig } from './practicePlaygroundTypes'

const props = defineProps<{
  open: boolean
  config: PracticePlaygroundConfig
}>()

const emit = defineEmits<{
  close: []
  save: [config: PracticePlaygroundConfig]
  clear: []
}>()

const draft = ref<PracticePlaygroundConfig>({ ...props.config, apiKey: '' })
const isApiKeyVisible = ref(false)
const hasStoredApiKey = ref(false)
const isReplacingApiKey = ref(true)

function syncDraftFromProps() {
  const storedApiKey = props.config.apiKey.trim()
  hasStoredApiKey.value = Boolean(storedApiKey)
  isReplacingApiKey.value = !hasStoredApiKey.value
  draft.value = {
    ...props.config,
    apiKey: '',
  }
  isApiKeyVisible.value = false
}

watch(
  () => props.config,
  () => {
    syncDraftFromProps()
  },
  { deep: true, immediate: true },
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      syncDraftFromProps()
    }
  },
)

const maskedApiKeyLabel = computed(() => {
  if (isReplacingApiKey.value) {
    return draft.value.apiKey.trim() ? '待保存新值' : '未填写'
  }
  return hasStoredApiKey.value ? '已填写' : '未填写'
})

function handleFieldChange(field: keyof PracticePlaygroundConfig, value: string) {
  draft.value = {
    ...draft.value,
    [field]: value,
  }
}

function handleStartReplacingApiKey() {
  isReplacingApiKey.value = true
  isApiKeyVisible.value = false
  draft.value = {
    ...draft.value,
    apiKey: '',
  }
}

function handleSave() {
  emit('save', {
    ...draft.value,
    apiKey: isReplacingApiKey.value ? draft.value.apiKey : props.config.apiKey,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop"
      @click.self="emit('close')"
    >
      <section
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="在线运行设置"
      >
        <header class="modal-header">
          <div>
            <h2>在线运行设置</h2>
            <p>配置只保存在当前浏览器本地，不会提交到仓库。</p>
          </div>
          <button type="button" class="icon-button" @click="emit('close')">关闭</button>
        </header>

        <div class="modal-body">
          <label class="config-item">
            <span>API Key</span>
            <div v-if="isReplacingApiKey" class="secret-input-row">
              <input
                :type="isApiKeyVisible ? 'text' : 'password'"
                :value="draft.apiKey"
                placeholder="sk-..."
                autocomplete="off"
                @input="handleFieldChange('apiKey', ($event.target as HTMLInputElement).value)"
              />
              <button type="button" class="subtle-button" @click="isApiKeyVisible = !isApiKeyVisible">
                {{ isApiKeyVisible ? '隐藏 Key' : '显示 Key' }}
              </button>
            </div>
            <div v-else class="stored-secret-row">
              <p>已保存 API Key；出于安全原因，这里不会回显完整值。</p>
              <button type="button" class="subtle-button" @click="handleStartReplacingApiKey">
                重新输入
              </button>
            </div>
            <small>当前状态：{{ maskedApiKeyLabel }}</small>
            <small v-if="!isReplacingApiKey">重新输入后会覆盖当前已保存的 Key。</small>
          </label>

          <label class="config-item">
            <span>baseURL</span>
            <input
              type="text"
              :value="draft.baseURL"
              placeholder="https://api.openai.com/v1"
              @input="handleFieldChange('baseURL', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label class="config-item">
            <span>model</span>
            <input
              type="text"
              :value="draft.model"
              placeholder="gpt-4o"
              @input="handleFieldChange('model', ($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <footer class="modal-footer">
          <p class="security-tip">
            安全提示：请勿在公共设备保存敏感配置，离开前建议清空配置。
          </p>
          <div class="actions-row">
            <button type="button" class="ghost-button" @click="emit('clear')">清空配置</button>
            <button type="button" class="primary-button" @click="handleSave">保存到本地</button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: color-mix(in srgb, var(--vp-c-black) 40%, transparent);
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal-card {
  width: min(640px, 100%);
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
  display: grid;
  gap: 0;
}

.modal-header,
.modal-footer {
  padding: 18px 20px;
}

.modal-header {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--vp-c-divider);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.modal-header p {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.icon-button,
.subtle-button,
.ghost-button,
.primary-button {
  border-radius: 10px;
  padding: 9px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  display: grid;
  gap: 14px;
}

.config-item {
  display: grid;
  gap: 8px;
}

.config-item span {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.config-item input {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--vp-c-bg-soft);
}

.config-item small {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.secret-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.stored-secret-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--vp-c-bg-soft);
}

.stored-secret-row p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.modal-footer {
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
}

.security-tip {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.5;
}

.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.primary-button {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

@media (max-width: 700px) {
  .modal-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
