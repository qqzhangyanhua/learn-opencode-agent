import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

interface BlackboardEntry {
  value: string
  version: number
  updatedBy: string
  updatedAt: number
}

interface Blackboard {
  entries: Map<string, BlackboardEntry>
  version: number
}

function createBlackboard(): Blackboard {
  return { entries: new Map(), version: 0 }
}

function writeToBlackboard(board: Blackboard, key: string, value: string, author: string): number {
  board.version += 1
  board.entries.set(key, {
    value,
    version: board.version,
    updatedBy: author,
    updatedAt: Date.now(),
  })
  console.log(`  [Blackboard] ${author} wrote "${key}" (v${board.version})`)
  return board.version
}

function readFromBlackboard(board: Blackboard, key: string): BlackboardEntry | undefined {
  return board.entries.get(key)
}

function readAllFromBlackboard(board: Blackboard): string {
  const lines: string[] = []
  for (const [key, entry] of board.entries) {
    lines.push(`[${key}] (by ${entry.updatedBy}, v${entry.version}):\n${entry.value}`)
  }
  return lines.join('\n\n')
}

interface AgentMessage {
  from: string
  to: string
  content: string
  timestamp: number
}

interface MessageBus {
  messages: AgentMessage[]
}

function createMessageBus(): MessageBus {
  return { messages: [] }
}

function sendMessage(bus: MessageBus, from: string, to: string, content: string): void {
  bus.messages.push({ from, to, content, timestamp: Date.now() })
  console.log(`  [Message] ${from} → ${to}: ${content.slice(0, 60)}...`)
}

function getMessagesFor(bus: MessageBus, recipient: string): AgentMessage[] {
  return bus.messages.filter((message) => message.to === recipient)
}

interface HandoffPayload {
  fromAgent: string
  targetAgent: string
  task: string
  context: string
  constraints: string[]
}

function parseSections(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pattern = /===\s*(\w+)\s*===([\s\S]*?)(?====|\s*$)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const key = match[1]?.trim()
    const value = match[2]?.trim()
    if (key && value) {
      result[key] = value
    }
  }

  if (Object.keys(result).length === 0) {
    result['RESEARCH'] = text
  }

  return result
}

async function runResearcher(topic: string, board: Blackboard, bus: MessageBus): Promise<void> {
  console.log('\n[Researcher] 开始研究...')

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          '你是一位研究员，专门负责收集和整理信息。',
          '针对给定主题，请提供：',
          '1. 3-5 个核心要点（标记为 KEY_POINTS）',
          '2. 相关的背景数据或事实（标记为 BACKGROUND）',
          '3. 一段简短的摘要（标记为 SUMMARY）',
          '',
          '请用以下格式输出，每个部分用 === 分隔：',
          '=== KEY_POINTS ===',
          '（要点列表）',
          '=== BACKGROUND ===',
          '（背景信息）',
          '=== SUMMARY ===',
          '（摘要）',
        ].join('\n'),
      },
      { role: 'user', content: `请研究以下主题：${topic}` },
    ],
  })

  const text = response.choices[0].message.content ?? ''

  const sections = parseSections(text)
  for (const [key, value] of Object.entries(sections)) {
    writeToBlackboard(board, key, value, 'researcher')
  }

  sendMessage(
    bus,
    'researcher',
    'writer',
    `研究完成，已将 ${Object.keys(sections).length} 个部分写入黑板。请查阅 KEY_POINTS、BACKGROUND、SUMMARY。`,
  )
}

async function runWriter(topic: string, board: Blackboard, bus: MessageBus): Promise<void> {
  console.log('\n[Writer] 开始写作...')

  const notifications = getMessagesFor(bus, 'writer')
  console.log(`  [Writer] 收到 ${notifications.length} 条消息`)

  const research = readAllFromBlackboard(board)
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          '你是一位专业写手，擅长将研究资料转化为流畅、有说服力的文章。',
          '根据提供的研究资料，撰写一篇 300-500 字的中文短文。',
          '要求：',
          '- 结构清晰：引言、正文（2-3 段）、结论',
          '- 语言流畅自然，不要罗列要点',
          '- 融合所有研究发现，不要遗漏关键信息',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `主题：${topic}\n\n以下是研究团队的资料：\n\n${research}`,
      },
    ],
  })

  const draft = response.choices[0].message.content ?? ''

  writeToBlackboard(board, 'DRAFT', draft, 'writer')
  sendMessage(bus, 'writer', 'editor', '初稿已完成并写入黑板 DRAFT，请审阅润色。')
}

function createHandoff(board: Blackboard, bus: MessageBus): HandoffPayload {
  const draft = readFromBlackboard(board, 'DRAFT')
  const keyPoints = readFromBlackboard(board, 'KEY_POINTS')
  const editorMessages = getMessagesFor(bus, 'editor')
  const messageContext = editorMessages
    .map((message) => `[${message.from}]: ${message.content}`)
    .join('\n')

  return {
    fromAgent: 'writer',
    targetAgent: 'editor',
    task: '润色和定稿：检查文章的逻辑连贯性、语言表达、信息准确性',
    context: [
      '## 初稿',
      draft?.value ?? '（无初稿）',
      '',
      '## 核心要点（供校验）',
      keyPoints?.value ?? '（无要点）',
      '',
      '## 协作消息',
      messageContext || '（无消息）',
    ].join('\n'),
    constraints: [
      '保持原文的核心观点和结构',
      '修正语法和表达问题',
      '确保所有核心要点都被覆盖',
      '最终输出只包含润色后的文章正文',
    ],
  }
}

async function runEditor(handoff: HandoffPayload): Promise<string> {
  console.log('\n[Editor] 通过 Handoff 接手任务...')
  console.log(`  [Editor] 来自: ${handoff.fromAgent}`)
  console.log(`  [Editor] 任务: ${handoff.task}`)
  console.log(`  [Editor] 约束: ${handoff.constraints.length} 条`)

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          '你是一位资深编辑，负责文章的最终润色和定稿。',
          '',
          '你的任务：',
          handoff.task,
          '',
          '约束条件：',
          ...handoff.constraints.map((constraint) => `- ${constraint}`),
        ].join('\n'),
      },
      { role: 'user', content: handoff.context },
    ],
  })

  return response.choices[0].message.content ?? ''
}

async function main(): Promise<void> {
  const topic = 'TypeScript 类型系统在大型项目中的实际价值'

  console.log(`主题: ${topic}`)
  console.log('='.repeat(50))

  const board = createBlackboard()
  const bus = createMessageBus()

  await runResearcher(topic, board, bus)
  await runWriter(topic, board, bus)

  const handoff = createHandoff(board, bus)
  const finalArticle = await runEditor(handoff)

  console.log(`\n${'='.repeat(50)}`)
  console.log('最终成果')
  console.log('='.repeat(50))
  console.log(finalArticle)

  console.log(`\n${'-'.repeat(50)}`)
  console.log('协作统计')
  console.log('-'.repeat(50))
  console.log(`黑板条目: ${board.entries.size}`)
  console.log(`黑板版本: ${board.version}`)
  console.log(`消息总数: ${bus.messages.length}`)
  console.log(`Handoff 约束: ${handoff.constraints.length} 条`)

  for (const [key, entry] of board.entries) {
    console.log(`  [${key}] by ${entry.updatedBy} (v${entry.version}, ${entry.value.length} chars)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
