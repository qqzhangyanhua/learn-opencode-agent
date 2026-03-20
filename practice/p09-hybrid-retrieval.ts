import OpenAI from 'openai'

interface RetrievalResult {
  id: string
  content: string
  source: string
  score: number
}

interface LibraryDocument {
  id: string
  content: string
  source: string
  vector: number[]
  tokens: string[]
}

let vocabulary: string[] = []

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.?!，。？！、：:；;\n\r\t]+/)
    .filter((word) => word.length > 0)
}

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

class DocumentLibrary {
  private docs: LibraryDocument[] = []

  add(content: string, source: string): void {
    const tokens = tokenize(content)

    this.docs.push({
      id: `${source}#${this.docs.length}`,
      content,
      source,
      vector: [],
      tokens,
    })

    this.rebuildVocabularyAndVectors()
    console.log(`[文档已加载 | 来源: ${source} | 共 ${this.docs.length} 篇]`)
  }

  private rebuildVocabularyAndVectors(): void {
    const vocabSet = new Set<string>()

    for (const doc of this.docs) {
      for (const word of doc.tokens) {
        vocabSet.add(word)
      }
    }

    vocabulary = Array.from(vocabSet).sort()

    for (const doc of this.docs) {
      doc.vector = naiveVectorize(doc.content)
    }
  }

  getAll(): LibraryDocument[] {
    return this.docs
  }
}

class KeywordRetriever {
  constructor(private readonly lib: DocumentLibrary) {}

  search(query: string, topK = 10): RetrievalResult[] {
    const queryTokens = Array.from(new Set(tokenize(query)))
    if (queryTokens.length === 0) return []

    const results: RetrievalResult[] = []

    for (const doc of this.lib.getAll()) {
      const docTokenSet = new Set(doc.tokens)
      const hitCount = queryTokens.filter((token) => docTokenSet.has(token)).length

      if (hitCount > 0) {
        results.push({
          id: doc.id,
          content: doc.content,
          source: doc.source,
          score: hitCount / queryTokens.length,
        })
      }
    }

    return results
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
  }
}

class VectorRetriever {
  constructor(private readonly lib: DocumentLibrary) {}

  search(query: string, topK = 10): RetrievalResult[] {
    const queryVec = naiveVectorize(query)

    return this.lib
      .getAll()
      .map((doc) => ({
        id: doc.id,
        content: doc.content,
        source: doc.source,
        score: cosineSimilarity(queryVec, doc.vector),
      }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
  }
}

class HybridRetriever {
  private readonly keywordRetriever: KeywordRetriever
  private readonly vectorRetriever: VectorRetriever

  constructor(lib: DocumentLibrary) {
    this.keywordRetriever = new KeywordRetriever(lib)
    this.vectorRetriever = new VectorRetriever(lib)
  }

  rrfFusion(resultSets: RetrievalResult[][], k = 60): RetrievalResult[] {
    const scoreMap = new Map<string, { result: RetrievalResult; rrfScore: number }>()

    for (const results of resultSets) {
      results.forEach((result, index) => {
        const rank = index + 1
        const contribution = 1 / (k + rank)
        const existing = scoreMap.get(result.id)

        if (existing) {
          existing.rrfScore += contribution
        } else {
          scoreMap.set(result.id, {
            result,
            rrfScore: contribution,
          })
        }
      })
    }

    return Array.from(scoreMap.values())
      .sort((left, right) => right.rrfScore - left.rrfScore)
      .map(({ result, rrfScore }) => ({
        ...result,
        score: rrfScore,
      }))
  }

  search(query: string, topK = 3): RetrievalResult[] {
    const keywordResults = this.keywordRetriever.search(query, 10)
    const vectorResults = this.vectorRetriever.search(query, 10)
    return this.rrfFusion([keywordResults, vectorResults]).slice(0, topK)
  }

  searchKeywordOnly(query: string, topK = 3): RetrievalResult[] {
    return this.keywordRetriever.search(query, topK)
  }

  searchVectorOnly(query: string, topK = 3): RetrievalResult[] {
    return this.vectorRetriever.search(query, topK)
  }
}

class HybridRAGAgent {
  private readonly client: OpenAI
  private readonly retriever: HybridRetriever

  constructor(retriever: HybridRetriever) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.retriever = retriever
  }

  private formatContext(results: RetrievalResult[]): string {
    if (results.length === 0) return ''

    const sections = results.map(
      (result, index) => `[片段 ${index + 1} | 来源: ${result.source}]\n${result.content}`,
    )

    return `以下是与问题相关的文档内容，请基于这些内容回答：\n\n${sections.join('\n\n')}`
  }

  async chat(userMessage: string): Promise<string> {
    const relevantChunks = this.retriever.search(userMessage, 3)
    const context = this.formatContext(relevantChunks)

    const systemPrompt = context
      ? `你是一个技术助手，请基于提供的文档内容准确回答问题，用中文简洁作答。\n\n${context}`
      : '你是一个技术助手，用中文简洁作答。'

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })

    return response.choices[0].message.content ?? ''
  }
}

function printResults(label: string, results: RetrievalResult[]): void {
  console.log(`\n${label}:`)

  if (results.length === 0) {
    console.log('  （无结果）')
    return
  }

  results.forEach((result, index) => {
    const preview = result.content.slice(0, 70).replace(/\n/g, ' ')
    console.log(
      `  ${index + 1}. [分: ${result.score.toFixed(4)} | ${result.source}] ${preview}...`,
    )
  })
}

async function main(): Promise<void> {
  const lib = new DocumentLibrary()

  lib.add(
    `TypeScript 的 interface 和 type 都用于描述对象的形状。
interface 支持声明合并：同名两个 interface 自动合并为一个。
type 不支持声明合并，重复声明报错。
interface 只能描述对象结构，不能直接表示联合类型。
type 更灵活：支持联合类型（A | B）、交叉类型（A & B）和条件类型。
通常建议：描述对象形状优先用 interface，需要联合或条件类型时用 type。`,
    'typescript-types.md',
  )

  lib.add(
    `TypeScript 类型系统最佳实践：
1. 优先用 interface 描述对象形状，type 留给联合、交叉和条件类型场景。
2. 启用 strict 模式：noImplicitAny、strictNullChecks 是最有价值的两个选项。
3. 避免 any，用 unknown 代替，强制在使用前做类型收窄。
4. 用 satisfies 操作符在推断类型的同时做类型检查，兼顾灵活性与安全性。
5. 泛型约束优先于 any：<T extends object> 比 <T = any> 更安全。`,
    'ts-best-practices.md',
  )

  lib.add(
    `AI Agent 的核心循环是 ReAct 模式：Reason（推理）和 Act（行动）交替进行。
Agent 接收用户输入后，先推理下一步应该做什么，再调用工具执行，观察结果，再推理。
工具调用是 Agent 与外界交互的唯一方式：读写文件、调用 API、执行代码都通过工具完成。
上下文窗口是 Agent 的工作记忆，接近上限时需要压缩策略：保留关键消息，摘要旧消息。`,
    'agent-basics.md',
  )

  lib.add(
    `RAG（检索增强生成）让 Agent 能利用私有文档回答问题。
RAG 流水线：文档分块 → 向量化 → 存储 → 查询向量化 → 相似度检索 → 注入上下文 → 生成。
混合检索（关键词 + 向量）比单纯向量检索有更好的综合召回率。
RRF 算法是融合多路排名的标准方法，参数 k=60 在多个基准测试中表现稳健。`,
    'rag-concepts.md',
  )

  const retriever = new HybridRetriever(lib)
  const agent = new HybridRAGAgent(retriever)

  const query = 'TypeScript 类型系统最佳实践'
  console.log(`\n${'='.repeat(60)}`)
  console.log(`查询: "${query}"`)
  console.log('='.repeat(60))

  printResults('关键词检索 top3', retriever.searchKeywordOnly(query, 3))
  printResults('向量检索 top3', retriever.searchVectorOnly(query, 3))
  printResults('RRF 融合 top3', retriever.search(query, 3))

  console.log('\n--- Agent 回答 ---')
  const answer = await agent.chat(query)
  console.log(`Agent: ${answer}`)

  const query2 = 'Agent 上下文窗口快满了怎么处理'
  console.log(`\n${'='.repeat(60)}`)
  console.log(`查询: "${query2}"`)
  console.log('='.repeat(60))

  printResults('关键词检索 top3', retriever.searchKeywordOnly(query2, 3))
  printResults('向量检索 top3', retriever.searchVectorOnly(query2, 3))
  printResults('RRF 融合 top3', retriever.search(query2, 3))

  console.log('\n--- Agent 回答 ---')
  const answer2 = await agent.chat(query2)
  console.log(`Agent: ${answer2}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
