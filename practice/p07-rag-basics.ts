import OpenAI from 'openai'

interface Chunk {
  id: string
  content: string
  source: string
  vector: number[]
}

let vocabulary: string[] = []

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.?!，。？！、：:；;\n\r\t]+/)
    .filter((word) => word.length > 0)
}

/**
 * 词频向量仅用于演示 RAG 骨架。
 * 生产环境请替换为真正的 Embedding 模型。
 */
function naiveVectorize(text: string): number[] {
  if (vocabulary.length === 0) return []

  const freqMap: Record<string, number> = {}
  for (const word of tokenize(text)) {
    freqMap[word] = (freqMap[word] ?? 0) + 1
  }

  const vector = vocabulary.map((term) => freqMap[term] ?? 0)
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))

  if (norm === 0) return vector
  return vector.map((value) => value / norm)
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0)
}

class DocumentStore {
  private chunks: Chunk[] = []

  addDocument(
    content: string,
    source: string,
    chunkSize = 200,
    overlap = 40,
  ): void {
    const newChunks = this.splitIntoChunks(content, source, chunkSize, overlap)
    this.chunks.push(...newChunks)
    this.rebuildVocabularyAndVectorize()

    console.log(`[文档已加载: ${newChunks.length} 个片段 | 来源: ${source}]`)
  }

  private splitIntoChunks(
    content: string,
    source: string,
    chunkSize: number,
    overlap: number,
  ): Chunk[] {
    const chunks: Chunk[] = []
    const step = Math.max(chunkSize - overlap, 1)
    let start = 0
    let index = 0

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length)
      const chunkContent = content.slice(start, end).trim()

      if (chunkContent.length > 0) {
        chunks.push({
          id: `${source}#${index}`,
          content: chunkContent,
          source,
          vector: [],
        })
        index += 1
      }

      start += step
    }

    return chunks
  }

  private rebuildVocabularyAndVectorize(): void {
    const vocabSet = new Set<string>()

    for (const chunk of this.chunks) {
      for (const word of tokenize(chunk.content)) {
        vocabSet.add(word)
      }
    }

    vocabulary = Array.from(vocabSet).sort()

    for (const chunk of this.chunks) {
      chunk.vector = naiveVectorize(chunk.content)
    }
  }

  search(query: string, topK = 3): Chunk[] {
    if (this.chunks.length === 0) return []

    const queryVec = naiveVectorize(query)

    return this.chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryVec, chunk.vector),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
      .map(({ chunk }) => chunk)
  }

  formatContext(chunks: Chunk[]): string {
    if (chunks.length === 0) return ''

    const sections = chunks.map(
      (chunk, index) => `[文档片段 ${index + 1} | 来源: ${chunk.source}]\n${chunk.content}`,
    )

    return `以下是与问题相关的文档内容，请基于这些内容回答：\n\n${sections.join('\n\n')}`
  }

  get totalChunks(): number {
    return this.chunks.length
  }
}

class RAGAgent {
  private readonly client: OpenAI
  private readonly store: DocumentStore
  private readonly baseSystem: string

  constructor(store: DocumentStore, baseSystem = '') {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.store = store
    this.baseSystem = baseSystem
  }

  async chat(userMessage: string): Promise<string> {
    const relevantChunks = this.store.search(userMessage, 3)

    if (relevantChunks.length > 0) {
      console.log(`[检索到 ${relevantChunks.length} 个相关片段]`)
      relevantChunks.forEach((chunk, index) => {
        const preview = chunk.content.slice(0, 60).replace(/\n/g, ' ')
        console.log(`  片段${index + 1}: (${chunk.id}) ${preview}...`)
      })
    } else {
      console.log('[未找到相关片段，依赖模型自身知识]')
    }

    const context = this.store.formatContext(relevantChunks)
    const systemPrompt = context
      ? `${this.baseSystem}\n\n${context}`.trim()
      : this.baseSystem

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
  const store = new DocumentStore()

  store.addDocument(
    `TypeScript 的 interface 和 type 都用于描述对象的形状。
interface 支持声明合并（Declaration Merging）：同名的两个 interface 会自动合并成一个。
type 不支持声明合并，重复声明会报错。
interface 只能描述对象结构，不能直接表示联合类型。
type 更灵活：支持联合类型（A | B）、交叉类型（A & B）和条件类型（T extends U ? X : Y）。
interface 可以用 extends 关键字继承其他 interface，也可以继承 type。
通常建议：描述对象形状优先用 interface，需要联合或条件类型时用 type。`,
    'typescript-types.md',
    150,
    30,
  )

  store.addDocument(
    `AI Agent 的核心循环是 ReAct 模式：Reason（推理）和 Act（行动）交替进行。
Agent 接收用户输入后，先推理下一步应该做什么，再调用工具执行，观察结果，再推理，如此循环。
工具调用（Tool Use）是 Agent 与外界交互的唯一方式：读写文件、调用 API、执行代码都通过工具完成。
上下文窗口是 Agent 的工作记忆：所有对话历史、工具调用结果都存在这里。
当上下文窗口接近上限时，需要压缩策略：保留关键消息，丢弃或摘要旧消息。
多 Agent 系统中，Orchestrator 负责任务分解，Sub-agent 负责具体执行。`,
    'agent-basics.md',
    150,
    30,
  )

  store.addDocument(
    `RAG（检索增强生成）的核心思想：不把所有文档塞进上下文，只检索相关片段。
RAG 流水线：文档分块 → 向量化 → 存储 → 查询向量化 → 相似度检索 → 注入上下文 → 生成。
分块策略影响检索质量：块太大语义模糊，块太小上下文不足。通常 200-500 字符为宜。
Embedding 模型把文本转为高维向量，语义相似的文本在向量空间中距离近。
常用 Embedding 模型：OpenAI text-embedding-3-small、text-embedding-3-large、本地模型 all-MiniLM-L6-v2。
向量数据库负责高效存储和检索向量：Qdrant、Chroma、pgvector 是常见选择。
混合检索（关键词 + 向量）比单纯向量检索有更好的召回率。`,
    'rag-overview.md',
    150,
    30,
  )

  console.log(`\n[知识库初始化完成，共 ${store.totalChunks} 个分块]\n`)

  const agent = new RAGAgent(
    store,
    '你是一个技术助手，请基于提供的文档内容准确回答问题，用中文简洁作答。',
  )

  console.log('=== 提问 1: TypeScript 的 interface 和 type 有什么区别？===')
  const answer1 = await agent.chat('TypeScript 的 interface 和 type 有什么区别？')
  console.log(`Agent: ${answer1}\n`)

  console.log('=== 提问 2: Agent 的上下文窗口满了怎么办？===')
  const answer2 = await agent.chat('Agent 的上下文窗口满了怎么办？')
  console.log(`Agent: ${answer2}\n`)

  console.log('=== 提问 3: 常见的向量数据库有哪些？===')
  const answer3 = await agent.chat('常见的向量数据库有哪些？')
  console.log(`Agent: ${answer3}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
