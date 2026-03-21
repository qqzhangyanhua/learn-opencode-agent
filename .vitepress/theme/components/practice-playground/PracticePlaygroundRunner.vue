<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import {
  getPracticePlaygroundRunnerNotice,
  isPracticePlaygroundRunnerReady,
  runPracticePlaygroundChapter,
} from './practicePlaygroundRunners'
import {
  createInitialPracticePlaygroundRunState,
  type PracticePlaygroundConfigSnapshot,
  type PracticePlaygroundChapter,
  type PracticePlaygroundConfig,
  type PracticePlaygroundRunState,
} from './practicePlaygroundTypes'

const props = defineProps<{
  chapter: PracticePlaygroundChapter
  config: PracticePlaygroundConfig
}>()

const emit = defineEmits<{
  'update:runState': [state: PracticePlaygroundRunState]
}>()

const runState = ref<PracticePlaygroundRunState>(createInitialPracticePlaygroundRunState())
const activeRequestToken = ref(0)
const activeAbortController = ref<AbortController | null>(null)

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function syncRunState(nextState: PracticePlaygroundRunState) {
  runState.value = nextState
  emit('update:runState', nextState)
}

function updateRunStateSafely(
  requestToken: number,
  updater: (currentState: PracticePlaygroundRunState) => PracticePlaygroundRunState,
) {
  if (requestToken !== activeRequestToken.value) {
    return
  }

  syncRunState(updater(runState.value))
}

function appendDebugLine(requestToken: number, line: string) {
  updateRunStateSafely(requestToken, (currentState) => ({
    ...currentState,
    debugLines: [...currentState.debugLines, line],
  }))
}

function createConfigSnapshot(config: PracticePlaygroundConfig): PracticePlaygroundConfigSnapshot {
  return {
    baseURL: config.baseURL,
    model: config.model,
    hasApiKey: Boolean(config.apiKey.trim()),
  }
}

function abortActiveRequest() {
  activeAbortController.value?.abort()
  activeAbortController.value = null
}

function resetRunState() {
  abortActiveRequest()
  activeRequestToken.value += 1
  syncRunState(createInitialPracticePlaygroundRunState())
}

async function handleRun() {
  if (!isPracticePlaygroundRunnerReady(props.chapter) || runState.value.status === 'running') {
    return
  }

  const requestToken = activeRequestToken.value + 1
  activeRequestToken.value = requestToken
  const abortController = new AbortController()
  activeAbortController.value = abortController
  const startedAt = Date.now()
  const configSnapshot = createConfigSnapshot({ ...props.config })
  syncRunState({
    status: 'running',
    startedAt,
    finishedAt: null,
    durationMs: null,
    outputText: '',
    debugLines: [],
    errorMessage: '',
    requestToken,
    configSnapshot,
  })

  try {
    await runPracticePlaygroundChapter({
      chapter: props.chapter,
      config: { ...props.config },
      signal: abortController.signal,
      onDebug: (line) => appendDebugLine(requestToken, line),
      onOutput: (text) => {
        updateRunStateSafely(requestToken, (currentState) => ({
          ...currentState,
          outputText: text,
        }))
      },
    })

    updateRunStateSafely(requestToken, (currentState) => ({
      ...currentState,
      status: 'success',
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
    }))
  } catch (error) {
    if (isAbortError(error)) {
      updateRunStateSafely(requestToken, (currentState) => ({
        ...currentState,
        status: 'idle',
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      }))
      appendDebugLine(requestToken, '请求已取消：旧请求已被中断。')
      return
    }

    const message = error instanceof Error ? error.message : '运行失败，且无法解析错误信息。'
    updateRunStateSafely(requestToken, (currentState) => ({
      ...currentState,
      status: 'error',
      errorMessage: message,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
    }))
    appendDebugLine(requestToken, `运行失败：${message}`)
  } finally {
    if (activeAbortController.value === abortController) {
      activeAbortController.value = null
    }
  }
}

watch(
  () => props.chapter.id,
  () => {
    resetRunState()
  },
  { immediate: true },
)

onUnmounted(() => {
  abortActiveRequest()
  activeRequestToken.value += 1
})
</script>

<template>
  <section class="runner-card">
    <header class="runner-header">
      <div>
        <h2>运行区</h2>
        <p>{{ getPracticePlaygroundRunnerNotice(chapter) }}</p>
      </div>
      <button
        type="button"
        class="run-button"
        :disabled="!isPracticePlaygroundRunnerReady(chapter) || runState.status === 'running'"
        @click="handleRun"
      >
        {{ runState.status === 'running' ? '运行中...' : '一键运行' }}
      </button>
    </header>

    <div class="example-block">
      <h3>预置示例</h3>
      <p>{{ chapter.playground.description }}</p>
      <dl class="example-grid">
        <div>
          <dt>运行模式</dt>
          <dd>{{ chapter.playground.mode }}</dd>
        </div>
        <div>
          <dt>预置问题</dt>
          <dd>{{ chapter.playground.prompt }}</dd>
        </div>
        <div>
          <dt>输出方式</dt>
          <dd>{{ chapter.playground.outputMode }}</dd>
        </div>
        <div>
          <dt>本地工具</dt>
          <dd>
            <span v-if="chapter.playground.tools.length > 0">
              {{ chapter.playground.tools.join('、') }}
            </span>
            <span v-else>当前示例不依赖本地工具</span>
          </dd>
        </div>
      </dl>
      <div class="highlight-block">
        <h4>本章运行提示</h4>
        <ul>
          <li v-for="item in chapter.playground.highlights" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
      <p v-if="!isPracticePlaygroundRunnerReady(chapter)" class="pending-tip">
        当前章节暂未接入，将在后续任务实现。
      </p>
    </div>
  </section>
</template>

<style scoped>
.runner-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  display: grid;
  gap: 14px;
}

.runner-header {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
}

.runner-header h2 {
  margin: 0;
  font-size: 18px;
}

.runner-header p {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  max-width: 720px;
}

.run-button {
  border-radius: 10px;
  border: 1px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 10px 14px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 600;
}

.run-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.example-block {
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
  padding: 14px;
  background: var(--vp-c-bg);
  display: grid;
  gap: 10px;
}

.example-block h3 {
  margin: 0;
  font-size: 16px;
}

.example-block p {
  margin: 0;
  color: var(--vp-c-text-2);
}

.highlight-block {
  display: grid;
  gap: 8px;
}

.highlight-block h4 {
  margin: 0;
  font-size: 14px;
}

.highlight-block ul {
  margin: 0;
  padding-left: 18px;
  color: var(--vp-c-text-2);
}

.highlight-block li + li {
  margin-top: 4px;
}

.example-grid {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.example-grid div {
  min-width: 0;
}

.example-grid dt {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.example-grid dd {
  margin: 6px 0 0;
  word-break: break-word;
}

.pending-tip {
  color: var(--vp-c-text-1);
  font-size: 14px;
}

@media (max-width: 700px) {
  .runner-header {
    flex-direction: column;
    align-items: stretch;
  }

  .run-button {
    width: 100%;
  }

  .example-grid {
    grid-template-columns: 1fr;
  }
}
</style>
