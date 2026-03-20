import OpenAI from 'openai'

interface MemoryEntry {
  id: string
  content: string
  tags: string[]
  importance: number
  createdAt: string
}

class MemoryBank {
  private memories: MemoryEntry[] = []

  add(content: string, tags: string[], importance = 5): void {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content,
      tags,
      importance,
      createdAt: new Date().toISOString(),
    }
    this.memories.push(entry)
  }

  search(query: string, topK = 3): MemoryEntry[] {
    const keywords = query
      .toLowerCase()
      .split(/[\s，。？！、,.\?!]+/)
      .filter((word) => word.length > 0)

    if (keywords.length === 0) {
      return [...this.memories]
        .sort((left, right) => right.importance - left.importance)
        .slice(0, topK)
    }

    const scored = this.memories.map((memory) => {
      const lowerTags = memory.tags.map((tag) => tag.toLowerCase())
      const hitCount = keywords.filter((keyword) =>
        lowerTags.some((tag) => tag.includes(keyword) || keyword.includes(tag)),
      ).length

      return {
        memory,
        hitCount,
        score: hitCount * memory.importance,
      }
    })

    return scored
      .filter(({ hitCount }) => hitCount > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
      .map(({ memory }) => memory)
  }

  formatForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) return ''

    const lines = memories.map(
      (memory) => `- ${memory.content} [标签: ${memory.tags.join(', ')}]`,
    )
    return `以下是与当前问题相关的历史记忆，请参考：\n${lines.join('\n')}`
  }

  all(): MemoryEntry[] {
    return [...this.memories]
  }
}

class MemoryAgent {
  private readonly client: OpenAI
  private readonly bank: MemoryBank
  private readonly baseSystemPrompt: string

  constructor(bank: MemoryBank, systemPrompt = '') {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.bank = bank
    this.baseSystemPrompt = systemPrompt
  }

  async chat(userMessage: string): Promise<string> {
    const relevantMemories = this.bank.search(userMessage, 3)
    const memoryContext = this.bank.formatForContext(relevantMemories)

    if (relevantMemories.length > 0) {
      console.log(`[检索到 ${relevantMemories.length} 条相关记忆]`)
      relevantMemories.forEach((memory) => {
        console.log(`  - ${memory.content} (重要性: ${memory.importance})`)
      })
    } else {
      console.log('[未检索到相关记忆，使用基础 system prompt]')
    }

    const systemPrompt = memoryContext
      ? `${this.baseSystemPrompt}\n\n${memoryContext}`.trim()
      : this.baseSystemPrompt

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'user', content: userMessage },
    ]

    if (systemPrompt) {
      messages.unshift({ role: 'system', content: systemPrompt })
    }

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
    })

    return response.choices[0].message.content ?? ''
  }
}

async function main(): Promise<void> {
  const bank = new MemoryBank()

  bank.add('用户喜欢简洁的代码风格，不需要过多注释', ['偏好', '编程', '代码风格'], 9)
  bank.add('用户正在做一个 TypeScript Agent 项目', ['项目', 'TypeScript', 'Agent'], 8)
  bank.add('用户不喜欢过长的解释，直接给结论', ['偏好', '沟通', '回复风格'], 8)
  bank.add('用户的操作系统是 macOS', ['环境', '系统', 'macOS'], 5)
  bank.add('用户学过 Python，熟悉异步编程', ['背景', 'Python', '异步'], 6)

  console.log('=== 预置记忆 ===')
  bank.all().forEach((memory) => {
    console.log(`  [${memory.importance}] ${memory.content}`)
    console.log(`      标签: ${memory.tags.join(', ')}`)
  })
  console.log()

  const agent = new MemoryAgent(bank, '你是一个编程助手，用中文简洁回答问题。')

  console.log('=== 提问 1：帮我写一个 sleep 函数 ===')
  const answer1 = await agent.chat('帮我写一个 sleep 函数')
  console.log(`Agent: ${answer1}`)
  console.log()

  console.log('=== 提问 2：什么是 async/await？ ===')
  const answer2 = await agent.chat('什么是 async/await？')
  console.log(`Agent: ${answer2}`)
  console.log()

  console.log('=== 提问 3：怎么查看系统进程？ ===')
  const answer3 = await agent.chat('怎么查看系统进程？')
  console.log(`Agent: ${answer3}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
