import type {
  PracticePlaygroundChapter,
  PracticePlaygroundConfig,
  PracticePlaygroundRunnerContext,
} from './practicePlaygroundTypes'

interface PracticePlaygroundToolCall {
  id: string
  type?: string
  function: {
    name: string
    arguments: string
  }
}

interface PracticePlaygroundChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: PracticePlaygroundToolCall[]
  tool_call_id?: string
}

interface PracticePlaygroundChatCompletionResponse {
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: unknown
      tool_calls?: PracticePlaygroundToolCall[]
    }
  }>
}

interface PracticePlaygroundStreamingResponse {
  choices?: Array<{
    finish_reason?: string | null
    delta?: {
      content?: unknown
    }
  }>
}

interface PracticePlaygroundResolvedChoice {
  finish_reason?: string | null
  message: {
    content?: unknown
    tool_calls?: PracticePlaygroundToolCall[]
  }
}

interface PracticePlaygroundReActAction {
  type: 'action'
  thought: string
  action: string
  actionInput: Record<string, string>
}

interface PracticePlaygroundReActFinal {
  type: 'final'
  thought: string
  answer: string
}

interface PracticePlaygroundReActUnknown {
  type: 'unknown'
  raw: string
}

interface PracticePlaygroundReActInvalidActionInput {
  type: 'invalid-action-input'
  thought: string
  action: string
  rawActionInput: string
  reason: string
}

type PracticePlaygroundReActResult =
  | PracticePlaygroundReActAction
  | PracticePlaygroundReActFinal
  | PracticePlaygroundReActInvalidActionInput
  | PracticePlaygroundReActUnknown

type PracticePlaygroundModelTier = 'mini' | 'standard' | 'large'

const P1_WEATHER_DATA: Record<string, string> = {
  北京: '晴，22°C，东南风 3 级',
  上海: '多云，18°C，东风 2 级',
  广州: '小雨，26°C，南风 2 级',
}

const REACT_WEATHER_DATA: Record<string, string> = {
  北京: '晴，22°C，东南风 3 级，空气质量良',
  上海: '小雨，18°C，东风 4 级，空气质量优',
  广州: '多云，28°C，南风 2 级，空气质量良',
  深圳: '阵雨，27°C，东南风 3 级，空气质量优',
}

const REACT_SEARCH_RESULTS: Record<string, string> = {
  '户外运动 最佳温度': '户外运动最佳温度通常在 15-22°C，风力较小、无明显降水时体验更稳定。',
  '空气质量 运动': '空气质量优良时适合正常户外运动；空气一般时建议降低强度。',
  '小雨 跑步': '轻微小雨可以跑步，但地面湿滑和持续降水会降低体验。',
}

const ROUTING_COMPLEX_KEYWORDS = [
  '分析',
  '比较',
  '设计',
  '架构',
  '权衡',
  'trade-off',
  'compare',
  'analyze',
  'debug',
] as const

const ROUTING_SIMPLE_KEYWORDS = [
  '查询',
  '定义',
  '列出',
  '翻译',
  '是什么',
  'what is',
  '几点',
] as const

function normalizeBaseURL(baseURL: string): string {
  return baseURL.trim().replace(/\/+$/, '')
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (!part || typeof part !== 'object') return ''
        if ('text' in part && typeof part.text === 'string') return part.text
        return ''
      })
      .filter(Boolean)
      .join('')
  }

  return ''
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('请求已取消。', 'AbortError')
  }
}

function validateRunnerConfig(config: PracticePlaygroundConfig): void {
  const missingFields: string[] = []

  if (!config.apiKey.trim()) {
    missingFields.push('API Key')
  }

  if (!config.baseURL.trim()) {
    missingFields.push('baseURL')
  }

  if (!config.model.trim()) {
    missingFields.push('model')
  }

  if (missingFields.length > 0) {
    const errorMessage = [
      '❌ 无法开始运行，请先完成配置：',
      '',
      '缺失项：',
      ...missingFields.map(f => `  • ${f}`),
      '',
      '📝 如何配置：',
      '  1. 点击右上角"设置"按钮',
      '  2. 填写上述缺失项',
      '  3. 点击"保存"',
      '',
      '💡 提示：',
      '  • API Key 可从 OpenAI 官网获取',
      '  • baseURL 默认为 https://api.openai.com/v1',
      '  • model 推荐使用 gpt-4o 或 gpt-4o-mini',
    ].join('\n')

    throw new Error(errorMessage)
  }
}

async function readErrorResponse(response: Response): Promise<string> {
  const prefix = `请求失败（${response.status} ${response.statusText}）`
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as {
        error?: { message?: string }
        message?: string
      }
      if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
        return `${prefix}：${payload.error.message}`
      }
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return `${prefix}：${payload.message}`
      }
    } catch {
      return prefix
    }
  }

  try {
    const rawText = (await response.text()).trim()
    if (rawText) {
      return `${prefix}：${rawText.slice(0, 240)}`
    }
  } catch {
    return prefix
  }

  return prefix
}

async function createChatCompletion(
  context: Pick<PracticePlaygroundRunnerContext, 'config' | 'signal'>,
  body: Record<string, unknown>,
): Promise<PracticePlaygroundChatCompletionResponse> {
  const response = await createChatCompletionResponse(context, body)
  return (await response.json()) as PracticePlaygroundChatCompletionResponse
}

async function createChatCompletionResponse(
  context: Pick<PracticePlaygroundRunnerContext, 'config' | 'signal'>,
  body: Record<string, unknown>,
): Promise<Response> {
  throwIfAborted(context.signal)
  const { config, signal } = context
  validateRunnerConfig(config)

  const response = await fetch(`${normalizeBaseURL(config.baseURL)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    signal,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await readErrorResponse(response))
  }

  return response
}

function createRequestBody(
  context: PracticePlaygroundRunnerContext,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...context.runnerInput.requestBody,
    ...overrides,
  }
}

function createChatMessages(
  messages: PracticePlaygroundRunnerContext['runnerInput']['requestBody']['messages'],
): PracticePlaygroundChatMessage[] {
  return messages.map((message) => {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        content: message.content,
        ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
      }
    }

    return {
      role: message.role,
      content: message.content,
    }
  })
}

function getWeather(city: string): string {
  return P1_WEATHER_DATA[city] ?? `暂无 ${city} 的天气数据`
}

function getReActWeather(city: string): string {
  return REACT_WEATHER_DATA[city] ?? `暂无 ${city} 的天气数据`
}

function searchWeb(query: string): string {
  for (const [key, value] of Object.entries(REACT_SEARCH_RESULTS)) {
    if (key.split(' ').some((keyword) => query.includes(keyword))) {
      return value
    }
  }
  return `搜索“${query}”未命中预置结果，请基于已有信息继续判断。`
}

function calculateExpression(expression: string): string {
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return '只支持基本数学运算（+ - * /）。'
  }

  try {
    const result = Function(`"use strict"; return (${expression})`)() as number
    return `计算结果：${expression} = ${result}`
  } catch {
    return `计算失败：${expression} 不是合法表达式。`
  }
}

function executeP1ToolCall(toolCall: PracticePlaygroundToolCall): string {
  if (toolCall.function.name !== 'get_weather') {
    return `未实现的工具：${toolCall.function.name}`
  }

  let parsedArguments: { city?: string } = {}
  try {
    parsedArguments = JSON.parse(toolCall.function.arguments) as { city?: string }
  } catch {
    throw new Error(`工具参数解析失败：${toolCall.function.arguments}`)
  }

  return getWeather(parsedArguments.city?.trim() ?? '')
}

function executeReActTool(action: string, actionInput: Record<string, string>): string {
  if (action === 'get_weather') {
    return getReActWeather(actionInput.city?.trim() ?? '')
  }

  if (action === 'search_web') {
    return searchWeb(actionInput.query?.trim() ?? '')
  }

  if (action === 'calculate') {
    return calculateExpression(actionInput.expression?.trim() ?? '')
  }

  return `未知工具：${action}`
}

function getFirstChoice(
  response: PracticePlaygroundChatCompletionResponse,
): PracticePlaygroundResolvedChoice {
  const choice = response.choices?.[0]
  if (!choice?.message) {
    throw new Error('模型未返回可解析的消息。')
  }
  return {
    finish_reason: choice.finish_reason,
    message: choice.message,
  }
}

async function runP1MinimalAgent(context: PracticePlaygroundRunnerContext): Promise<void> {
  const messages = createChatMessages(context.runnerInput.requestBody.messages)

  context.onDebug(`请求开始：准备发送带 tools 的第一次请求，共 ${messages.length} 条消息。`)

  const firstResponse = await createChatCompletion(context, createRequestBody(context, {
    messages,
  }))

  const firstChoice = getFirstChoice(firstResponse)
  throwIfAborted(context.signal)
  const firstMessage = firstChoice.message
  const firstContent = normalizeMessageContent(firstMessage.content)

  if (firstChoice.finish_reason === 'stop') {
    context.onOutput(firstContent || '模型已直接返回结果，但正文为空。')
    context.onDebug('请求完成：模型未触发工具调用，直接返回最终回答。')
    return
  }

  if (firstChoice.finish_reason !== 'tool_calls' || !firstMessage.tool_calls?.length) {
    throw new Error(`未处理的 finish_reason：${firstChoice.finish_reason ?? 'unknown'}`)
  }

  messages.push({
    role: 'assistant',
    content: firstContent || null,
    tool_calls: firstMessage.tool_calls,
  })

  for (const toolCall of firstMessage.tool_calls) {
    context.onDebug(`工具执行：${toolCall.function.name}(${toolCall.function.arguments})`)
    const toolResult = executeP1ToolCall(toolCall)
    context.onDebug(`工具结果：${toolResult}`)

    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResult,
    })
  }

  context.onDebug('请求继续：工具结果已回写，准备发起第二次请求。')

  const secondResponse = await createChatCompletion(context, createRequestBody(context, {
    messages,
  }))

  const secondChoice = getFirstChoice(secondResponse)
  throwIfAborted(context.signal)
  const finalOutput = normalizeMessageContent(secondChoice.message.content)
  context.onOutput(finalOutput || '模型已完成请求，但没有返回可显示文本。')
  context.onDebug('请求完成：已收到最终回答。')
}

async function runP2MultiTurn(context: PracticePlaygroundRunnerContext): Promise<void> {
  const messages = context.runnerInput.requestBody.messages
  context.onDebug(`多轮请求开始：当前模板共 ${messages.length} 条消息。`)
  context.onDebug('多轮请求说明：本示例不会触发工具调用，只观察上下文如何影响最终回答。')

  const response = await createChatCompletion(context, createRequestBody(context))

  const finalChoice = getFirstChoice(response)
  throwIfAborted(context.signal)
  const finalOutput = normalizeMessageContent(finalChoice.message.content)
  context.onOutput(finalOutput || '模型已完成请求，但没有返回可显示文本。')
  context.onDebug('请求完成：最终回答已基于完整多轮历史生成。')
}

function splitSSEEventBlocks(buffer: string): { blocks: string[]; rest: string } {
  const blocks: string[] = []
  let rest = buffer

  while (true) {
    const separatorMatch = rest.match(/\r?\n\r?\n/)
    if (!separatorMatch || separatorMatch.index === undefined) {
      break
    }

    const block = rest.slice(0, separatorMatch.index)
    blocks.push(block)
    rest = rest.slice(separatorMatch.index + separatorMatch[0].length)
  }

  return { blocks, rest }
}

function parseStreamingEventBlock(
  rawBlock: string,
  onDelta: (deltaText: string) => void,
): { sawDone: boolean; finishReason: string | null } {
  const lines = rawBlock.split(/\r?\n/)
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith(':')) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    const field = (separatorIndex === -1 ? line : line.slice(0, separatorIndex)).trim().toLowerCase()
    const value =
      separatorIndex === -1
        ? ''
        : line.slice(separatorIndex + 1).replace(/^\s/, '')

    if (field === 'data') {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) {
    return { sawDone: false, finishReason: null }
  }

  const payloadText = dataLines.join('\n').trim()
  if (!payloadText) {
    return { sawDone: false, finishReason: null }
  }

  if (payloadText === '[DONE]') {
    return { sawDone: true, finishReason: null }
  }

  let payload: PracticePlaygroundStreamingResponse
  try {
    payload = JSON.parse(payloadText) as PracticePlaygroundStreamingResponse
  } catch {
    throw new Error(`流式数据格式异常：${payloadText.slice(0, 160)}`)
  }

  const choice = payload.choices?.[0]
  const deltaText = normalizeMessageContent(choice?.delta?.content)
  if (deltaText) {
    onDelta(deltaText)
  }

  return {
    sawDone: false,
    finishReason: choice?.finish_reason ?? null,
  }
}

async function runP3Streaming(context: PracticePlaygroundRunnerContext): Promise<void> {
  context.onDebug('流式请求开始：准备以 stream=true 发起浏览器直连请求。')

  const response = await createChatCompletionResponse(context, createRequestBody(context))

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('当前响应不支持流式读取。')
  }

  const cancelReader = () => {
    void reader.cancel().catch(() => {})
  }
  context.signal.addEventListener('abort', cancelReader, { once: true })

  const decoder = new TextDecoder()
  let buffer = ''
  let output = ''
  let sawDone = false
  let finishReason: string | null = null
  try {
    while (true) {
      throwIfAborted(context.signal)
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const { blocks, rest } = splitSSEEventBlocks(buffer)
      buffer = rest

      for (const block of blocks) {
        const result = parseStreamingEventBlock(block, (deltaText) => {
          output += deltaText
          context.onOutput(output)
        })
        if (result.sawDone) {
          sawDone = true
        }
        if (result.finishReason) {
          finishReason = result.finishReason
        }
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) {
      const { blocks, rest } = splitSSEEventBlocks(`${buffer}\n\n`)
      for (const block of [...blocks, rest].filter((item) => item.trim())) {
        const result = parseStreamingEventBlock(block, (deltaText) => {
          output += deltaText
          context.onOutput(output)
        })
        if (result.sawDone) {
          sawDone = true
        }
        if (result.finishReason) {
          finishReason = result.finishReason
        }
      }
    }
  } finally {
    context.signal.removeEventListener('abort', cancelReader)
  }

  if (sawDone || finishReason === 'stop') {
    context.onDebug('流式请求完成：已收到完整文本流。')
    return
  }

  context.onDebug('流式响应提前结束：已保留当前已接收内容。')
  throw new Error('流式响应已中断，未收到完整结束标记。')
}

function unwrapCodeFence(text: string): string {
  return text.replace(/```[\w-]*\s*\n?/g, '').replace(/```/g, '').trim()
}

function normalizeReActText(text: string): string {
  return unwrapCodeFence(text).replace(/\r\n/g, '\n').replace(/：/g, ':').trim()
}

function collectReActSections(text: string): Map<string, string> {
  const normalizedText = normalizeReActText(text)
  const sectionPattern = /^\s*(thought|action\s+input|final\s+answer|action)\s*:\s*/gim
  const matches = Array.from(normalizedText.matchAll(sectionPattern))
  const sections = new Map<string, string>()

  for (let index = 0; index < matches.length; index += 1) {
    const currentMatch = matches[index]
    const nextMatch = matches[index + 1]
    const key = currentMatch[1].toLowerCase().replace(/\s+/g, ' ')
    const valueStart = (currentMatch.index ?? 0) + currentMatch[0].length
    const valueEnd = nextMatch?.index ?? normalizedText.length
    sections.set(key, normalizedText.slice(valueStart, valueEnd).trim())
  }

  return sections
}

function parseReActOutput(text: string): PracticePlaygroundReActResult {
  const sections = collectReActSections(text)
  const thought = sections.get('thought') ?? ''
  const finalAnswer = sections.get('final answer')
  const action = sections.get('action')
  const actionInputText = sections.get('action input')

  if (finalAnswer) {
    return {
      type: 'final',
      thought,
      answer: finalAnswer,
    }
  }

  if (action && actionInputText) {
    const normalizedActionInput = unwrapCodeFence(actionInputText)

    try {
      const parsed = JSON.parse(normalizedActionInput) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {
          type: 'invalid-action-input',
          thought,
          action: action.split('\n')[0]?.trim() ?? '',
          rawActionInput: normalizedActionInput,
          reason: 'Action Input 不是合法的 JSON 对象。',
        }
      }

      return {
        type: 'action',
        thought,
        action: action.split('\n')[0]?.trim() ?? '',
        actionInput: parsed as Record<string, string>,
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : '无法解析 JSON。'
      return {
        type: 'invalid-action-input',
        thought,
        action: action.split('\n')[0]?.trim() ?? '',
        rawActionInput: normalizedActionInput,
        reason,
      }
    }
  }

  return {
    type: 'unknown',
    raw: normalizeReActText(text),
  }
}

async function runP10ReactLite(context: PracticePlaygroundRunnerContext): Promise<void> {
  const messages = createChatMessages(context.runnerInput.requestBody.messages)

  context.onDebug('ReAct 请求开始：这是教学型简化链路，最多循环 3 次。')

  for (let step = 1; step <= 3; step += 1) {
    context.onDebug(`第 ${step} 轮：发送 ReAct 推理请求。`)

    const response = await createChatCompletion(context, createRequestBody(context, {
      messages,
    }))

    throwIfAborted(context.signal)
    const choice = getFirstChoice(response)
    const responseText = normalizeMessageContent(choice.message.content)
    const parsed = parseReActOutput(responseText)

    if (parsed.type === 'final') {
      if (parsed.thought) {
        context.onDebug(`Thought ${step}：${parsed.thought}`)
      }
      context.onDebug(`Final Answer ${step}：已生成最终回答。`)
      context.onOutput(parsed.answer || '模型已结束推理，但没有返回可显示文本。')
      return
    }

    if (parsed.type === 'action') {
      context.onDebug(`Thought ${step}：${parsed.thought || '（模型未显式给出 Thought）'}`)
      context.onDebug(`Action ${step}：${parsed.action}`)
      context.onDebug(`Action Input ${step}：${JSON.stringify(parsed.actionInput)}`)

      throwIfAborted(context.signal)
      const observation = executeReActTool(parsed.action, parsed.actionInput)
      context.onDebug(`Observation ${step}：${observation}`)

      messages.push({
        role: 'assistant',
        content: responseText,
      })
      messages.push({
        role: 'user',
        content: `Observation: ${observation}`,
      })
      continue
    }

    if (parsed.type === 'invalid-action-input') {
      context.onDebug(`Thought ${step}：${parsed.thought || '（模型未显式给出 Thought）'}`)
      context.onDebug(`Action ${step}：${parsed.action || '（未解析到动作名称）'}`)
      context.onDebug(`Action Input ${step} 解析失败：${parsed.reason}`)
      context.onDebug(`原始 Action Input ${step}：${parsed.rawActionInput || '（空）'}`)
      throw new Error('ReAct Action Input 解析失败，已中断当前教学链路。')
    }

    context.onDebug(`第 ${step} 轮：模型输出未匹配标准 ReAct 格式，回退展示原始内容。`)
    context.onOutput(parsed.raw || '模型未返回可显示文本。')
    return
  }

  context.onDebug('ReAct 链路停止：已达到教学模式的最大 3 轮限制。')
  throw new Error('ReAct 教学链路已达到最大步数限制（3）。')
}

function chooseModelRoute(
  prompt: string,
  toolCount: number,
): {
  tier: PracticePlaygroundModelTier
  score: number
  reasons: string[]
} {
  const reasons: string[] = []
  let score = 0

  if (prompt.length <= 40) {
    score -= 1
    reasons.push(`输入较短（${prompt.length} 字），倾向更轻量的路由。`)
  } else if (prompt.length >= 100) {
    score += 1
    reasons.push(`输入较长（${prompt.length} 字），需要更强的上下文处理能力。`)
  }

  if (toolCount >= 2) {
    score += 1
    reasons.push(`预期涉及 ${toolCount} 个工具或分析维度，复杂度上调。`)
  }

  const lowerPrompt = prompt.toLowerCase()
  const complexKeywords = ROUTING_COMPLEX_KEYWORDS.filter((keyword) => lowerPrompt.includes(keyword))
  if (complexKeywords.length > 0) {
    score += 1
    reasons.push(`命中复杂任务关键词：${complexKeywords.join('、')}。`)
  }

  const simpleKeywords = ROUTING_SIMPLE_KEYWORDS.filter((keyword) => lowerPrompt.includes(keyword))
  if (simpleKeywords.length > 0) {
    score -= 1
    reasons.push(`命中轻量任务关键词：${simpleKeywords.join('、')}。`)
  }

  if (score <= -1) {
    return { tier: 'mini', score, reasons }
  }

  if (score >= 2) {
    return { tier: 'large', score, reasons }
  }

  return { tier: 'standard', score, reasons }
}

async function runP18ModelRouting(context: PracticePlaygroundRunnerContext): Promise<void> {
  const prompt =
    [...context.runnerInput.templateSnapshot.messages]
      .reverse()
      .find((message) => message.role === 'user')
      ?.content
      ?? context.chapter.playground.prompt
  const toolCount = context.runnerInput.requestBody.tools?.length ?? 0
  const routeDecision = chooseModelRoute(prompt, toolCount)

  context.onDebug(`路由判断：推荐使用 ${routeDecision.tier} 层级。`)
  context.onDebug(`路由评分：${routeDecision.score >= 0 ? '+' : ''}${routeDecision.score}`)
  for (const reason of routeDecision.reasons) {
    context.onDebug(`路由理由：${reason}`)
  }
  context.onDebug(`演示说明：实际请求仍使用当前配置模型 ${context.config.model.trim()}。`)

  const response = await createChatCompletion(context, createRequestBody(context))

  throwIfAborted(context.signal)
  const choice = getFirstChoice(response)
  const finalOutput = normalizeMessageContent(choice.message.content)
  context.onOutput(finalOutput || '模型已完成请求，但没有返回可显示文本。')
  context.onDebug('请求完成：已返回路由演示的最终回答。')
}

export function isPracticePlaygroundRunnerReady(chapter: PracticePlaygroundChapter): boolean {
  return chapter.playground.status === 'ready'
}

export function getPracticePlaygroundRunnerNotice(chapter: PracticePlaygroundChapter): string {
  if (isPracticePlaygroundRunnerReady(chapter)) {
    return chapter.playground.description
  }

  return '当前章节暂未接入，将在后续任务实现。'
}

export async function runPracticePlaygroundChapter(
  context: PracticePlaygroundRunnerContext,
): Promise<void> {
  if (context.chapter.id === 'p01-minimal-agent') {
    await runP1MinimalAgent(context)
    return
  }

  if (context.chapter.id === 'p02-multi-turn') {
    await runP2MultiTurn(context)
    return
  }

  if (context.chapter.id === 'p03-streaming') {
    await runP3Streaming(context)
    return
  }

  if (context.chapter.id === 'p10-react-loop') {
    await runP10ReactLite(context)
    return
  }

  if (context.chapter.id === 'p18-model-routing') {
    await runP18ModelRouting(context)
    return
  }

  const chapter = context.chapter as PracticePlaygroundChapter
  const errorMessage = [
    `❌ 章节 ${chapter.number} 暂未接入 Playground`,
    '',
    '当前仅支持以下章节的在线运行：',
    '  ✅ P1：最小 Agent',
    '  ✅ P2：多轮对话',
    '  ✅ P3：流式输出',
    '  ✅ P10：ReAct Loop',
    '  ✅ P18：模型路由',
    '',
    '💡 如何运行其他章节：',
    '  1. 查看章节文档了解实现细节',
    `  2. 访问 ${chapter.articleHref}`,
    '  3. 按照文档在本地环境运行',
    '',
    '📚 参考资源：',
    '  • 实践环境准备：/practice/setup',
    '  • 本地运行说明：/practice/setup#local-mode',
  ].join('\n')

  throw new Error(errorMessage)
}
