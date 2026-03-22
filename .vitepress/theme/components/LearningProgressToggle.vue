<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  LEARNING_PROGRESS_STATUSES,
  LEARNING_PROGRESS_STATUS_META,
  type LearningProgressStatus,
  type LearningProgressToggleProps
} from './types'
import {
  canUseLearningProgressStorage,
  getLearningProgressRecord,
  saveLearningProgressStatus
} from './learning-progress/learningProgressStorage'

const props = withDefaults(defineProps<LearningProgressToggleProps>(), {
  title: '学习进度',
  description: '手动标记这页，方便下次回来继续。'
})

const currentStatus = ref<LearningProgressStatus | null>(null)
const feedbackMessage = ref('')
const storageAvailable = ref(true)
let feedbackTimer: ReturnType<typeof window.setTimeout> | null = null

const normalizedContentId = computed(() => props.contentId?.trim() ?? '')
const shouldRender = computed(() => normalizedContentId.value.length > 0)
const statusItems = LEARNING_PROGRESS_STATUSES.map((status) => ({
  status,
  ...LEARNING_PROGRESS_STATUS_META[status]
}))

function clearFeedbackTimer() {
  if (feedbackTimer !== null) {
    window.clearTimeout(feedbackTimer)
    feedbackTimer = null
  }
}

function setFeedback(message: string) {
  feedbackMessage.value = message
  clearFeedbackTimer()
  feedbackTimer = window.setTimeout(() => {
    feedbackMessage.value = ''
    feedbackTimer = null
  }, 2200)
}

function syncProgress() {
  storageAvailable.value = canUseLearningProgressStorage()

  if (!shouldRender.value || !storageAvailable.value) {
    currentStatus.value = null
    return
  }

  currentStatus.value = getLearningProgressRecord(normalizedContentId.value)?.status ?? null
}

function handleSelect(status: LearningProgressStatus) {
  if (!shouldRender.value) {
    return
  }

  if (!storageAvailable.value) {
    setFeedback('当前环境不支持本地保存')
    return
  }

  const record = saveLearningProgressStatus({
    contentId: normalizedContentId.value,
    contentType: props.contentType,
    status
  })

  if (!record) {
    storageAvailable.value = canUseLearningProgressStorage()
    setFeedback(storageAvailable.value ? '保存失败，请稍后重试' : '当前环境不支持本地保存')
    return
  }

  currentStatus.value = record.status
  setFeedback(`已保存为“${LEARNING_PROGRESS_STATUS_META[status].label}”`)
}

watch(
  () => [normalizedContentId.value, props.contentType],
  () => {
    feedbackMessage.value = ''
    syncProgress()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearFeedbackTimer()
})
</script>

<template>
  <section v-if="shouldRender" class="learning-progress-toggle">
    <div class="progress-copy">
      <p class="progress-title">{{ title }}</p>
      <p class="progress-description">{{ description }}</p>
    </div>

    <div class="progress-actions">
      <button
        v-for="item in statusItems"
        :key="item.status"
        type="button"
        class="progress-button"
        :class="{ active: currentStatus === item.status }"
        :disabled="!storageAvailable"
        @click="handleSelect(item.status)"
      >
        <span class="progress-button-label">{{ item.label }}</span>
        <span class="progress-button-description">{{ item.description }}</span>
      </button>
    </div>

    <p class="progress-feedback" :class="{ warning: !storageAvailable }">
      {{ feedbackMessage || (storageAvailable ? '仅保存在当前浏览器' : '当前环境不支持本地保存') }}
    </p>
  </section>
</template>

<style scoped>
.learning-progress-toggle {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.72);
}

.dark .learning-progress-toggle {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.48);
}

.progress-title,
.progress-description,
.progress-feedback {
  margin: 0;
}

.progress-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.progress-description,
.progress-feedback {
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.progress-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.progress-button {
  display: grid;
  gap: 6px;
  min-height: 100%;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg);
  text-align: left;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.progress-button:not(:disabled) {
  cursor: pointer;
}

.progress-button:hover:not(:disabled),
.progress-button:focus-visible:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.progress-button.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.progress-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.progress-button-label {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.progress-button-description {
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.progress-feedback.warning {
  color: #c2410c;
}

@media (max-width: 720px) {
  .progress-actions {
    grid-template-columns: 1fr;
  }
}
</style>
