import type {
  PRACTICE_PLAYGROUND_CHAPTERS,
  PRACTICE_PLAYGROUND_DIFFICULTIES,
  PRACTICE_PLAYGROUND_RUNNER_TYPES,
} from './practicePlaygroundCatalog'

export type PracticePlaygroundChapter = (typeof PRACTICE_PLAYGROUND_CHAPTERS)[number]
export type PracticePlaygroundChapterId = PracticePlaygroundChapter['id']
export type PracticePlaygroundDifficulty = (typeof PRACTICE_PLAYGROUND_DIFFICULTIES)[number]
export type PracticePlaygroundRunnerType = (typeof PRACTICE_PLAYGROUND_RUNNER_TYPES)[number]

export interface PracticePlaygroundConfig {
  apiKey: string
  baseURL: string
  model: string
}

// 运行快照只保留当次请求真正使用到的字段，避免把持久化元数据混回运行态。
export interface PracticePlaygroundConfigSnapshot {
  baseURL: string
  model: string
  hasApiKey: boolean
}

export type PracticePlaygroundChapterPlayground = PracticePlaygroundChapter['playground']

export type PracticePlaygroundRunStatus = 'idle' | 'running' | 'success' | 'error'

export interface PracticePlaygroundRunState {
  status: PracticePlaygroundRunStatus
  startedAt: number | null
  finishedAt: number | null
  durationMs: number | null
  outputText: string
  debugLines: string[]
  errorMessage: string
  requestToken: number
  configSnapshot: PracticePlaygroundConfigSnapshot | null
}

export interface PracticePlaygroundRunnerContext {
  chapter: PracticePlaygroundChapter
  config: PracticePlaygroundConfig
  signal: AbortSignal
  onDebug: (line: string) => void
  onOutput: (text: string) => void
}

export type PracticePlaygroundRunner = (
  context: PracticePlaygroundRunnerContext,
) => Promise<void>

export function createInitialPracticePlaygroundRunState(): PracticePlaygroundRunState {
  return {
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    outputText: '',
    debugLines: [],
    errorMessage: '',
    requestToken: 0,
    configSnapshot: null,
  }
}

export function createDefaultPracticePlaygroundConfig(): PracticePlaygroundConfig {
  return {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  }
}
