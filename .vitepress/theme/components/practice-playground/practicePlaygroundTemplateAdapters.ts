import type {
  PracticePlaygroundChapter,
  PracticePlaygroundConfig,
  PracticePlaygroundRunnerInput,
  PracticePlaygroundRunnerMessage,
  PracticePlaygroundTemplate,
  PracticeTemplateMessage,
} from './practicePlaygroundTypes'

const P10_INTERNAL_SYSTEM_MESSAGE = [
  '最低教学 ReAct 约束：',
  '1. 先判断是否需要工具，再决定下一步。',
  '2. 每轮最多调用一个工具。',
  '3. 看到工具返回结果后再继续推理。',
  '4. 信息足够时直接输出最终答案，不要空转。',
].join('\n')

const P18_INTERNAL_SYSTEM_MESSAGE = [
  '内部路由说明：',
  '1. 先简短判断任务复杂度与成本敏感度。',
  '2. 用 mini / standard / large 描述推荐档位及理由。',
  '3. 最终回答仍直接面向用户，不泄露内部实现细节。',
].join('\n')

function cloneTemplate(template: PracticePlaygroundTemplate): PracticePlaygroundTemplate {
  return JSON.parse(JSON.stringify(template)) as PracticePlaygroundTemplate
}

function stripToolForRequest(tool: PracticePlaygroundTemplate['tools'][number]) {
  return {
    type: tool.type,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: JSON.parse(JSON.stringify(tool.function.parameters)) as Record<string, unknown>,
    },
  }
}

function createRequestMessage(
  message: PracticeTemplateMessage,
  adapterNotes: string[],
): PracticePlaygroundRunnerMessage {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: message.content,
      ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
    }
  }

  const unsafeToolCallId = (message as { toolCallId?: unknown }).toolCallId
  if (typeof unsafeToolCallId === 'string' && unsafeToolCallId.trim()) {
    adapterNotes.push(`校验修正：已移除 ${message.role} 消息上的 tool_call_id，仅 tool 消息允许携带该字段。`)
  }

  return {
    role: message.role,
    content: message.content,
  }
}

function appendMessage(
  target: PracticePlaygroundRunnerInput['requestBody']['messages'],
  message: PracticeTemplateMessage,
  adapterNotes: string[],
): void {
  target.push(createRequestMessage(message, adapterNotes))
}

function ensureLeadingSystemMessage(
  messages: PracticePlaygroundRunnerInput['requestBody']['messages'],
  content: string,
): 'inserted' | 'moved' | 'unchanged' {
  const existingIndex = messages.findIndex(
    (message) => message.role === 'system' && message.content === content,
  )

  if (existingIndex === 0) {
    return 'unchanged'
  }

  if (existingIndex > 0) {
    const [existingMessage] = messages.splice(existingIndex, 1)
    messages.unshift(existingMessage)
    return 'moved'
  }

  messages.unshift({
    role: 'system',
    content,
  })
  return 'inserted'
}

export function adaptPracticeTemplateToRunnerInput(
  chapter: PracticePlaygroundChapter,
  template: PracticePlaygroundTemplate,
  config: PracticePlaygroundConfig,
): PracticePlaygroundRunnerInput {
  const templateSnapshot = cloneTemplate(template)
  const adapterNotes: string[] = []
  const requestMessages: PracticePlaygroundRunnerInput['requestBody']['messages'] = []

  if (template.system.trim()) {
    requestMessages.push({
      role: 'system',
      content: template.system,
    })
  }

  template.messages.forEach((message) => {
    appendMessage(requestMessages, message, adapterNotes)
  })

  if (chapter.id === 'p10-react-loop') {
    const reactConstraintState = ensureLeadingSystemMessage(
      requestMessages,
      P10_INTERNAL_SYSTEM_MESSAGE,
    )
    adapterNotes.push(
      reactConstraintState === 'inserted'
        ? '系统注入：已将 ReAct 教学约束前置到消息最前，并保留用户 system 原样跟随。'
        : reactConstraintState === 'moved'
          ? '系统注入：检测到旧位置的 ReAct 教学约束，已移动到消息最前，避免出现 system 穿插。'
          : '系统注入：检测到已有前置 ReAct 教学约束，未重复注入。',
    )
  }

  if (chapter.id === 'p18-model-routing') {
    const routingInstructionState = ensureLeadingSystemMessage(
      requestMessages,
      P18_INTERNAL_SYSTEM_MESSAGE,
    )
    adapterNotes.push(
      routingInstructionState === 'inserted'
        ? '系统注入：已将模型路由说明前置到消息最前，并保留用户 system 原样跟随。'
        : routingInstructionState === 'moved'
          ? '系统注入：检测到旧位置的模型路由说明，已移动到消息最前，避免出现 system 穿插。'
          : '系统注入：检测到已有前置模型路由说明，未重复注入。',
    )
  }

  const requestBody: PracticePlaygroundRunnerInput['requestBody'] = {
    model: config.model.trim(),
    messages: requestMessages,
  }

  if (template.tools.length > 0) {
    requestBody.tools = template.tools.map((tool) => stripToolForRequest(tool))
  }

  if (typeof template.requestOptions.stream === 'boolean') {
    requestBody.stream = template.requestOptions.stream
  }

  if (typeof template.requestOptions.temperature === 'number') {
    requestBody.temperature = template.requestOptions.temperature
  }

  if (typeof template.requestOptions.maxTokens === 'number') {
    requestBody.max_tokens = template.requestOptions.maxTokens
  }

  if (typeof template.requestOptions.toolChoice === 'string') {
    requestBody.tool_choice = template.requestOptions.toolChoice
  }

  if (chapter.id === 'p03-streaming') {
    const streamWasExplicitlyFalse = template.requestOptions.stream === false
    requestBody.stream = true
    adapterNotes.push(
      streamWasExplicitlyFalse
        ? '章节约束：P3 强制启用 stream=true，已覆盖模板中的 false'
        : '章节约束：P3 运行时固定 stream=true',
    )
  }

  return {
    requestBody,
    templateSnapshot,
    adapterNotes,
  }
}
