import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

type Message = OpenAI.ChatCompletionMessageParam

function estimateTokens(messages: Message[]): number {
  return messages.reduce((total, message) => {
    const text = typeof message.content === 'string' ? message.content : ''
    return total + Math.ceil(text.length / 2.5) + 4
  }, 0)
}

function slidingWindow(messages: Message[], maxRounds: number): Message[] {
  const system = messages.filter((message) => message.role === 'system')
  const dialog = messages.filter((message) => message.role !== 'system')
  const keep = dialog.slice(-maxRounds * 2)
  return [...system, ...keep]
}

async function summarizeHistory(oldMessages: Message[], previousSummary: string): Promise<string> {
  const historyText = oldMessages
    .map((message) => `${message.role === 'user' ? '用户' : '助手'}: ${String(message.content ?? '')}`)
    .join('\n')

  const prompt = previousSummary
    ? `已有摘要：\n${previousSummary}\n\n新增对话：\n${historyText}\n\n请合并为新摘要，保留所有关键信息、决策和约定。`
    : `请将以下对话压缩为简洁摘要，保留关键信息：\n\n${historyText}`

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.2,
  })

  return response.choices[0]?.message.content ?? ''
}

class LongContextManager {
  private messages: Message[]
  private summary = ''
  private readonly tokenThreshold: number

  constructor(systemPrompt: string, tokenThreshold = 4000) {
    this.messages = [{ role: 'system', content: systemPrompt }]
    this.tokenThreshold = tokenThreshold
  }

  private buildMessages(): Message[] {
    const systemContent = this.summary
      ? `${String(this.messages[0]?.content ?? '')}\n\n[历史摘要]\n${this.summary}`
      : String(this.messages[0]?.content ?? '')

    return [
      { role: 'system', content: systemContent },
      ...this.messages.slice(1),
    ]
  }

  private async compressIfNeeded(): Promise<void> {
    if (estimateTokens(this.messages) <= this.tokenThreshold) return

    console.log('[压缩] Token 超出阈值，开始摘要压缩...')

    const dialog = this.messages.slice(1)
    const toSummarize = dialog.slice(0, -4)
    const toKeep = dialog.slice(-4)

    if (toSummarize.length === 0) return

    this.summary = await summarizeHistory(toSummarize, this.summary)
    this.messages = [this.messages[0], ...toKeep]

    console.log(`[压缩] 完成，当前估算 token: ${estimateTokens(this.messages)}`)
  }

  async chat(userInput: string): Promise<string> {
    this.messages.push({ role: 'user', content: userInput })
    await this.compressIfNeeded()

    const response = await client.chat.completions.create({
      model,
      messages: this.buildMessages(),
    })

    const reply = response.choices[0]?.message.content ?? ''
    this.messages.push({ role: 'assistant', content: reply })
    return reply
  }
}

async function main(): Promise<void> {
  const manager = new LongContextManager(
    '你是专业的 TypeScript 编程助手，回答简洁专业。',
    2000,
  )

  const turns = [
    '我在做电商项目，主要用 TypeScript + React，后端是 Node.js',
    '购物车怎么设计比较好？',
    '如果要支持优惠券怎么扩展？',
    '库存检查应该在哪层做？',
    '怎么处理并发下单时的库存竞争？',
    '你还记得我们项目的技术栈吗？',
  ]

  console.log('[滑动窗口示例]', slidingWindow([
    { role: 'system', content: '系统' },
    { role: 'user', content: '1' },
    { role: 'assistant', content: '2' },
    { role: 'user', content: '3' },
    { role: 'assistant', content: '4' },
    { role: 'user', content: '5' },
  ], 2).length)

  for (const turn of turns) {
    console.log(`\n用户: ${turn}`)
    const reply = await manager.chat(turn)
    console.log(`助手: ${reply.slice(0, 150)}...`)
  }
}

main().catch(console.error)
