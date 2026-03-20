import OpenAI from 'openai'
import { readFile, writeFile } from 'fs/promises'

type MessageParam = OpenAI.ChatCompletionMessageParam
type LongTermStore = Record<string, string>

class ShortTermMemory {
  private messages: MessageParam[] = []

  add(role: 'user' | 'assistant', content: string): void {
    this.messages.push({ role, content })
  }

  getAll(): MessageParam[] {
    return [...this.messages]
  }

  clear(): void {
    this.messages = []
  }

  get length(): number {
    return this.messages.length
  }
}

class WorkingMemory {
  private state: Record<string, unknown> = {}

  set(key: string, value: unknown): void {
    this.state[key] = value
  }

  get(key: string): unknown {
    return this.state[key]
  }

  clear(): void {
    this.state = {}
  }

  getSnapshot(): Record<string, unknown> {
    return { ...this.state }
  }
}

class LongTermMemory {
  private store: LongTermStore = {}
  private readonly filePath: string

  constructor(filePath = 'memory.json') {
    this.filePath = filePath
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      this.store = JSON.parse(raw) as LongTermStore
      console.log(`[长期记忆已加载] ${Object.keys(this.store).length} 条记录`)
    } catch {
      this.store = {}
      console.log('[长期记忆] 未找到已有记忆，从空状态开始')
    }
  }

  async save(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.store, null, 2), 'utf-8')
    console.log(`[长期记忆已保存] ${this.filePath}`)
  }

  remember(key: string, value: string): void {
    this.store[key] = value
    console.log(`[长期记忆写入] ${key} = ${value}`)
  }

  recall(key: string): string | undefined {
    return this.store[key]
  }

  getAll(): LongTermStore {
    return { ...this.store }
  }
}

class MemoryAgent {
  private readonly client: OpenAI
  private readonly shortTerm: ShortTermMemory
  private readonly working: WorkingMemory
  private readonly longTerm: LongTermMemory

  constructor(memoryFilePath?: string) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.shortTerm = new ShortTermMemory()
    this.working = new WorkingMemory()
    this.longTerm = new LongTermMemory(memoryFilePath)
  }

  private buildSystemPrompt(): string {
    const longTermData = this.longTerm.getAll()
    const entries = Object.entries(longTermData)

    if (entries.length === 0) {
      return '你是一个有记忆能力的 AI 助手。'
    }

    const memoryLines = entries.map(([key, value]) => `- ${key}：${value}`).join('\n')
    return `你是一个有记忆能力的 AI 助手。

[已知用户信息]
${memoryLines}

请在对话中自然地利用这些已知信息。`
  }

  async init(): Promise<void> {
    await this.longTerm.load()
  }

  async chat(userMessage: string): Promise<string> {
    this.shortTerm.add('user', userMessage)

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        ...this.shortTerm.getAll(),
      ],
    })

    const assistantText = response.choices[0].message.content ?? ''

    this.shortTerm.add('assistant', assistantText)
    return assistantText
  }

  remember(key: string, value: string): void {
    this.longTerm.remember(key, value)
  }

  async saveMemory(): Promise<void> {
    await this.longTerm.save()
  }

  newSession(): void {
    this.shortTerm.clear()
    this.working.clear()
    console.log('\n[新会话开始] 短期记忆已清空，长期记忆保留')
  }

  getWorkingMemory(): WorkingMemory {
    return this.working
  }
}

async function main(): Promise<void> {
  const agent = new MemoryAgent('memory.json')
  await agent.init()

  console.log('=== 第一轮会话 ===\n')

  const message1 = '你好，我叫张三，我是一名前端工程师，平时喜欢用 TypeScript。'
  console.log(`用户：${message1}`)
  const reply1 = await agent.chat(message1)
  console.log(`Agent：${reply1}\n`)

  agent.remember('user_name', '张三')
  agent.remember('user_profession', '前端工程师')
  agent.remember('preferred_language', 'TypeScript')
  await agent.saveMemory()

  const workingMemory = agent.getWorkingMemory()
  workingMemory.set('onboarding_complete', true)
  workingMemory.set('session_count', 1)

  console.log('\n--- 模拟结束第一次会话，开启第二次会话 ---')
  agent.newSession()

  console.log('\n=== 第二轮会话（新会话，长期记忆已加载） ===\n')

  const message2 = '你还记得我叫什么名字吗？'
  console.log(`用户：${message2}`)
  const reply2 = await agent.chat(message2)
  console.log(`Agent：${reply2}\n`)

  const message3 = '我最喜欢用哪种编程语言？'
  console.log(`用户：${message3}`)
  const reply3 = await agent.chat(message3)
  console.log(`Agent：${reply3}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
