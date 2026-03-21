<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { runPracticePlaygroundChapter } from './practicePlaygroundRunners'
import {
  createInitialPracticePlaygroundRunState,
  type PracticePlaygroundChapter,
  type PracticePlaygroundConfig,
  type PracticePlaygroundConfigSnapshot,
  type PracticePlaygroundRunnerInput,
  type PracticePlaygroundRunState,
} from './practicePlaygroundTypes'

const emit = defineEmits<{
  'update:runState': [state: PracticePlaygroundRunState]
}>()

const runState = ref<PracticePlaygroundRunState>(createInitialPracticePlaygroundRunState())
const activeRequestToken = ref(0)
const activeAbortController = ref<AbortController | null>(null)
const lastAbortReason = ref('请求已取消。')

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
  if (requestToken !== activeRequestToken.value) return
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
    baseURL: config.baseURL.trim(),
    model: config.model.trim(),
    hasApiKey: Boolean(config.apiKey.trim()),
  }
}

function invalidateActiveRequest() {
  activeRequestToken.value += 1
  activeAbortController.value?.abort()
  activeAbortController.value = null
}

function abort(reason = '请求已取消。') {
  if (!activeAbortController.value) return
  lastAbortReason.value = reason
  activeAbortController.value.abort()
}

function reset(reason = '请求已重置。') {
  if (activeAbortController.value) {
    lastAbortReason.value = reason
    activeAbortController.value.abort()
    return
  }

  invalidateActiveRequest()
  lastAbortReason.value = '请求已取消。'
  syncRunState(createInitialPracticePlaygroundRunState())
}

async function run(payload: {
  chapter: PracticePlaygroundChapter
  config: PracticePlaygroundConfig
  runnerInput: PracticePlaygroundRunnerInput
}) {
  if (activeAbortController.value) {
    invalidateActiveRequest()
  }

  const requestToken = activeRequestToken.value + 1
  activeRequestToken.value = requestToken
  const abortController = new AbortController()
  activeAbortController.value = abortController
  const startedAt = Date.now()

  syncRunState({
    status: 'running',
    startedAt,
    finishedAt: null,
    durationMs: null,
    outputText: '',
    debugLines: [...payload.runnerInput.adapterNotes],
    errorMessage: '',
    requestToken,
    configSnapshot: createConfigSnapshot(payload.config),
  })

  try {
    await runPracticePlaygroundChapter({
      chapter: payload.chapter,
      config: { ...payload.config },
      runnerInput: payload.runnerInput,
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
      appendDebugLine(requestToken, lastAbortReason.value)
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
    lastAbortReason.value = '请求已取消。'
  }
}

defineExpose({
  abort,
  reset,
  run,
})

onUnmounted(() => {
  invalidateActiveRequest()
})
</script>
