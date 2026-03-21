import type {
  PRACTICE_PLAYGROUND_CHAPTERS,
  PRACTICE_PLAYGROUND_DIFFICULTIES,
  PRACTICE_PLAYGROUND_RUNNER_TYPES,
} from './practicePlaygroundCatalog'

export type PracticePlaygroundChapter = (typeof PRACTICE_PLAYGROUND_CHAPTERS)[number]
export type PracticePlaygroundChapterId = PracticePlaygroundChapter['id']
export type PracticePlaygroundDifficulty = (typeof PRACTICE_PLAYGROUND_DIFFICULTIES)[number]
export type PracticePlaygroundRunnerType = (typeof PRACTICE_PLAYGROUND_RUNNER_TYPES)[number]

export type PracticePlaygroundTemplateViewMode = 'structured' | 'json'

export type PracticeTemplateRole = 'system' | 'user' | 'assistant' | 'tool'
export type PracticeTemplateNonToolRole = Exclude<PracticeTemplateRole, 'tool'>

interface PracticeTemplateMessageBase {
  id: string
  content: string
}

export type PracticeTemplateMessage =
  | (PracticeTemplateMessageBase & {
      role: PracticeTemplateNonToolRole
      toolCallId?: never
    })
  | (PracticeTemplateMessageBase & {
      role: 'tool'
      toolCallId?: string
    })

export type PracticePlaygroundRunnerMessage =
  | {
      role: PracticeTemplateNonToolRole
      content: string
    }
  | {
      role: 'tool'
      content: string
      tool_call_id?: string
    }

export interface PracticeTemplateTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
  // IDE UI 用于“锁定不可编辑字段”的元信息。运行时必须被剥离，不下发到 API。
  locked?: {
    name?: boolean
    parameters?: boolean
  }
}

export interface PracticeTemplateRequestOptions {
  stream?: boolean
  temperature?: number
  maxTokens?: number
  toolChoice?: 'auto' | 'none' | string
}

export interface PracticeTemplateMeta {
  chapterId: PracticePlaygroundChapterId
  templateVersion: 1
  runner: PracticePlaygroundRunnerType
  title: string
  description: string
}

export interface PracticePlaygroundTemplate {
  system: string
  messages: PracticeTemplateMessage[]
  tools: PracticeTemplateTool[]
  requestOptions: PracticeTemplateRequestOptions
  meta: PracticeTemplateMeta
}

export interface PracticeTemplateEditorState {
  template: PracticePlaygroundTemplate
  jsonText: string
  jsonError: string
  isDirty: boolean
  lastSyncedFromTemplateAt: number
}

export interface PracticePlaygroundRunnerInput {
  requestBody: {
    model: string
    messages: PracticePlaygroundRunnerMessage[]
    tools?: Array<{
      type: 'function'
      function: {
        name: string
        description: string
        parameters: Record<string, unknown>
      }
    }>
    stream?: boolean
    temperature?: number
    max_tokens?: number
    tool_choice?: 'auto' | 'none' | string
  }
  templateSnapshot: PracticePlaygroundTemplate
  // 适配器级别的说明，用于上层把“强制覆盖/内部注入”写入 debug 区。
  adapterNotes: string[]
}

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

export function createEmptyPracticePlaygroundTemplate(): PracticePlaygroundTemplate {
  return {
    system: '',
    messages: [],
    tools: [],
    requestOptions: {},
    meta: {
      chapterId: 'p01-minimal-agent',
      templateVersion: 1,
      runner: 'tool-call',
      title: 'P1 最小 Agent',
      description: '最小工具调用闭环',
    },
  }
}

export function createPracticeTemplateEditorState(
  template: PracticePlaygroundTemplate,
): PracticeTemplateEditorState {
  return {
    template,
    jsonText: JSON.stringify(template, null, 2),
    jsonError: '',
    isDirty: false,
    lastSyncedFromTemplateAt: Date.now(),
  }
}
