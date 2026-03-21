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

const PRACTICE_TEMPLATE_ROLES: PracticeTemplateRole[] = ['system', 'user', 'assistant', 'tool']

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
  runnerInput: PracticePlaygroundRunnerInput
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
    jsonText: serializePracticePlaygroundTemplate(template),
    jsonError: '',
    isDirty: false,
    lastSyncedFromTemplateAt: Date.now(),
  }
}

export function clonePracticePlaygroundTemplate(
  template: PracticePlaygroundTemplate,
): PracticePlaygroundTemplate {
  return JSON.parse(JSON.stringify(template)) as PracticePlaygroundTemplate
}

export function serializePracticePlaygroundTemplate(template: PracticePlaygroundTemplate): string {
  return JSON.stringify(template, null, 2)
}

export function parsePracticePlaygroundTemplateJson(jsonText: string): PracticePlaygroundTemplate {
  const parsed = JSON.parse(jsonText) as unknown
  return validatePracticePlaygroundTemplate(parsed)
}

function validatePracticePlaygroundTemplate(raw: unknown): PracticePlaygroundTemplate {
  const payload = expectRecord(raw, '根对象')

  return {
    system: expectString(payload.system, 'system'),
    messages: expectArray(payload.messages, 'messages').map((item, index) =>
      validatePracticeTemplateMessage(item, index),
    ),
    tools: expectArray(payload.tools, 'tools').map((item, index) =>
      validatePracticeTemplateTool(item, index),
    ),
    requestOptions: validatePracticeTemplateRequestOptions(payload.requestOptions),
    meta: validatePracticeTemplateMeta(payload.meta),
  }
}

function validatePracticeTemplateMessage(raw: unknown, index: number): PracticeTemplateMessage {
  const payload = expectRecord(raw, `messages[${index}]`)
  const role = expectTemplateRole(payload.role, `messages[${index}].role`)
  const base = {
    id: expectString(payload.id, `messages[${index}].id`),
    content: expectString(payload.content, `messages[${index}].content`),
  }

  if (role === 'tool') {
    return {
      ...base,
      role,
      toolCallId: expectOptionalString(payload.toolCallId, `messages[${index}].toolCallId`),
    }
  }

  if (payload.toolCallId !== undefined) {
    throw new Error(`messages[${index}].toolCallId 只允许出现在 role 为 tool 的消息中`)
  }

  return {
    ...base,
    role,
  }
}

function validatePracticeTemplateTool(raw: unknown, index: number): PracticeTemplateTool {
  const payload = expectRecord(raw, `tools[${index}]`)
  const fn = expectRecord(payload.function, `tools[${index}].function`)

  return {
    type: expectLiteralString(payload.type, 'function', `tools[${index}].type`),
    function: {
      name: expectString(fn.name, `tools[${index}].function.name`),
      description: expectString(fn.description, `tools[${index}].function.description`),
      parameters: expectRecord(fn.parameters, `tools[${index}].function.parameters`),
    },
    locked: validatePracticeTemplateLocked(payload.locked, index),
  }
}

function validatePracticeTemplateLocked(
  raw: unknown,
  index: number,
): PracticeTemplateTool['locked'] | undefined {
  if (raw === undefined) return undefined
  const payload = expectRecord(raw, `tools[${index}].locked`)

  return {
    name: expectOptionalBoolean(payload.name, `tools[${index}].locked.name`),
    parameters: expectOptionalBoolean(payload.parameters, `tools[${index}].locked.parameters`),
  }
}

function validatePracticeTemplateRequestOptions(raw: unknown): PracticeTemplateRequestOptions {
  if (raw === undefined) return {}
  const payload = expectRecord(raw, 'requestOptions')

  return {
    stream: expectOptionalBoolean(payload.stream, 'requestOptions.stream'),
    temperature: expectOptionalNumber(payload.temperature, 'requestOptions.temperature'),
    maxTokens: expectOptionalNumber(payload.maxTokens, 'requestOptions.maxTokens'),
    toolChoice: expectOptionalString(payload.toolChoice, 'requestOptions.toolChoice'),
  }
}

function validatePracticeTemplateMeta(raw: unknown): PracticeTemplateMeta {
  const payload = expectRecord(raw, 'meta')

  return {
    chapterId: expectString(payload.chapterId, 'meta.chapterId') as PracticePlaygroundChapterId,
    templateVersion: expectLiteralNumber(payload.templateVersion, 1, 'meta.templateVersion'),
    runner: expectString(payload.runner, 'meta.runner') as PracticePlaygroundRunnerType,
    title: expectString(payload.title, 'meta.title'),
    description: expectString(payload.description, 'meta.description'),
  }
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} 必须是对象`)
  }
  return value as Record<string, unknown>
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} 必须是数组`)
  }
  return value
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${path} 必须是字符串`)
  }
  return value
}

function expectOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined
  return expectString(value, path)
}

function expectOptionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    throw new Error(`${path} 必须是布尔值`)
  }
  return value
}

function expectOptionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${path} 必须是数字`)
  }
  return value
}

function expectLiteralString<T extends string>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    throw new Error(`${path} 必须是 ${expected}`)
  }
  return expected
}

function expectLiteralNumber<T extends number>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    throw new Error(`${path} 必须是 ${expected}`)
  }
  return expected
}

function expectTemplateRole(value: unknown, path: string): PracticeTemplateRole {
  if (typeof value !== 'string' || !PRACTICE_TEMPLATE_ROLES.includes(value as PracticeTemplateRole)) {
    throw new Error(`${path} 必须是 ${PRACTICE_TEMPLATE_ROLES.join(' / ')}`)
  }
  return value as PracticeTemplateRole
}
