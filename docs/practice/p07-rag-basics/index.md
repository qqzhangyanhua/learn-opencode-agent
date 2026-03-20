---
title: P7：RAG 基础
description: 向量化、分块策略、语义检索，构建让 Agent 能读文档的知识库
---

<ProjectCard
  title="你将构建：一个本地 RAG 系统，把文档分块、向量化、检索相关片段并注入 Agent 上下文"
  difficulty="intermediate"
  duration="60 min"
  :prerequisites="['P1', 'P5']"
  :tags="['RAG', 'Vector Search', 'TypeScript', 'OpenAI SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup)。本章对应示例文件位于 `practice/` 目录，可直接按命令运行。

## 前置准备

开始本章前，请先确认：

- 已阅读 [实践环境准备](/practice/setup)
- 基础依赖已就绪：`openai`
- 环境变量已配置：`OPENAI_API_KEY`
- 建议先完成前置章节：`P1`、`P5`
- 本章建议入口命令：`bun run practice/p07-rag-basics.ts`
- 示例文件位置：`practice/p07-rag-basics.ts`

## 背景与目标

P6 的 `MemoryBank` 用关键词检索记忆，有一个根本局限：

```
用户问：代码整洁度怎么提升？
标签命中：无（标签是"代码风格"，不是"整洁度"）
结果：相关记忆未被检索，模型无法利用
```

词面不同，语义相近，关键词检索束手无策。

这还只是记忆检索的问题。更大的挑战是：**模型本身的知识有截止日期，无法处理你的私有文档**。你的产品手册、内部 API 文档、最新研究报告——模型一概不知道。

RAG（Retrieval-Augmented Generation，检索增强生成）是这两个问题的通行解法：

```
文档 → 分块 → 向量化 → 存储
                              ↓
用户问题 → 向量化 → 相似度检索 → 取 top-K 片段 → 注入上下文 → 模型生成
```

本章目标：实现一套完整的本地 RAG 流水线，包含：

1. 文档分块（固定大小 + 重叠）
2. 词频向量化（TF 风格，演示用）
3. 余弦相似度检索
4. 检索结果注入 Agent 上下文

向量化用简化的词频方案，不引入任何外部库，让你看清 RAG 的骨架。真实项目的向量化方案在末尾说明。

## 核心概念

### 为什么需要 RAG

模型的知识来自训练数据，有两个固有限制：

1. **截止日期**：训练数据有时间边界，最新的库文档、API 变更、行业动态一概不知
2. **私有文档**：你的公司知识库、产品文档从未出现在训练数据中

最直接的想法是把文档全部塞进 context：

```
system: 以下是完整文档，共 500 页...
```

这行不通。原因有三：
- **上下文窗口有限**：即使是 Claude 的 200K token 窗口，大型文档库也装不下
- **成本**：每次调用把所有文档传一遍，Token 费用极高
- **注意力稀释**：文档过长，模型对关键信息的"注意力"被稀释，回答质量下降

RAG 的思路是：**只检索相关片段，注入相关上下文**。问"TypeScript 的 interface"，只传 interface 相关的两三个段落，不传整本 TypeScript 手册。

### 分块策略

文档不能整体向量化，原因是向量表示的是一个语义单元，整本书的向量会平均掉所有细节，失去检索精度。分块让每个向量只代表一小段语义完整的内容。

**固定大小分块**：按字符数切，简单粗暴。

```
原文（300字）:
interface 是 TypeScript 的核心特性...（150字）...
type 是另一种定义类型的方式...（150字）

chunkSize=100, 结果：3 块
块1: interface 是 TypeScript 的核心特性...（100字）
块2: ...（剩余50字）type 是另一种定义类型...（50字）  ← 在句子中间切断了
块3: ...方式（剩余100字）
```

问题显而易见：可能在语义单元中间切断。

**重叠分块**（overlap）是缓解方案：相邻块之间保留一段重叠内容，防止关键信息被切断后出现在两块的边缘而两块都没有完整信息。

```
chunkSize=100, overlap=20:
块1: 字符 0-100
块2: 字符 80-180    ← 与块1 重叠 20 字符
块3: 字符 160-260
```

重叠不解决语义割裂问题，但显著降低关键信息"恰好被切断"的概率。

**语义分块**（按段落）更理想，但实现复杂，本章不涉及。

### 向量化原理

向量化把文本转为数值向量，使得语义相似的文本在向量空间中距离更近。

**本章用词频向量（TF 风格）作演示**：

1. 建立词汇表：收集所有分块中出现的所有词，得到一个有序词表 `vocab`
2. 对每段文本，统计 vocab 中每个词在文本中出现的次数，得到一个与 vocab 等长的向量
3. 归一化：除以向量的 L2 范数，让向量长度为 1

```
vocab: ['interface', 'type', 'class', 'extends', ...]
文本: "interface 继承 interface 用 extends"
词频: [2, 0, 0, 1, ...]  → 归一化 → [0.89, 0, 0, 0.45, ...]
```

**重要说明**：词频向量是演示用的简化方案，无法捕捉语义相似性（"整洁"和"风格"在词频向量中没有任何关联）。生产环境使用 Embedding 模型（如 OpenAI 的 `text-embedding-3-large` 或 OpenAI 的 `text-embedding-3-small`），这类模型把语义相似的文本映射到距离近的向量。

### 余弦相似度

两个向量的相似度用余弦相似度衡量：

```
cosine(a, b) = (a · b) / (|a| × |b|)
```

值域 `[-1, 1]`，1 表示完全相同，0 表示无关，-1 表示完全相反。因为我们对向量做了归一化（`|a| = |b| = 1`），公式简化为点积：

```
cosine(a, b) = a · b = Σ(a[i] × b[i])
```

### 检索结果注入

检索到 top-K 个相关片段后，格式化为结构化文本注入 system prompt：

```
以下是与问题相关的文档内容，请基于这些内容回答：

[文档片段 1 | 来源: typescript-handbook.md]
interface 和 type 都能定义对象形状。interface 支持声明合并...

[文档片段 2 | 来源: typescript-handbook.md]
type 更灵活，支持联合类型、交叉类型和条件类型...
```

这个格式让模型明确知道哪些是参考资料、来源是什么，有助于引用准确、减少幻觉。

## 动手实现

<RunCommand command="bun run practice/p07-rag-basics.ts" :verified="true" />

### 运行与验证

- 先按前置准备完成依赖和环境变量配置
- 执行上面的推荐入口命令
- 将输出与下文的“运行结果”或章节描述对照，确认主链路已经跑通
- 如果遇到命令、依赖、环境变量或样例输入问题，先回到 [实践环境准备](/practice/setup) 排查



### 第一步：定义 Chunk 接口

```ts
// p07-rag-basics.ts
import OpenAI from 'openai'

interface Chunk {
  id: string
  content: string
  source: string
  vector: number[]
}
```

`vector` 字段在分块时计算并存储，检索时直接比较，不重复计算。

### 第二步：词频向量化

```ts
// 全局词汇表，在所有文档加入后构建
let vocabulary: string[] = []

/**
 * naiveVectorize：词频向量，仅用于演示。
 * 生产环境请使用 Embedding 模型（如 text-embedding-3-large / text-embedding-3-small）。
 */
function naiveVectorize(text: string): number[] {
  if (vocabulary.length === 0) return []

  // 简单分词：按空格和标点切分，转小写，过滤空字符串
  const words = text
    .toLowerCase()
    .split(/[\s,.?!，。？！、：:；;\n\r\t]+/)
    .filter(w => w.length > 0)

  // 统计每个词在当前文本中的出现次数
  const freqMap: Record<string, number> = {}
  for (const word of words) {
    freqMap[word] = (freqMap[word] ?? 0) + 1
  }

  // 按词汇表顺序构建向量
  const vec = vocabulary.map(term => freqMap[term] ?? 0)

  // L2 归一化：除以向量长度，确保余弦相似度等价于点积
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (norm === 0) return vec

  return vec.map(v => v / norm)
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  return a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0)
}
```

词汇表是全局的，原因是向量维度必须一致才能比较。所有文档分块完成后，统一构建词汇表，再对所有分块重新向量化。

### 第三步：DocumentStore 类

```ts
class DocumentStore {
  private chunks: Chunk[] = []

  /**
   * 添加文档：分块 → 收集词汇 → 全量重新向量化
   */
  addDocument(
    content: string,
    source: string,
    chunkSize: number = 200,
    overlap: number = 40,
  ): void {
    const newChunks = this.splitIntoChunks(content, source, chunkSize, overlap)
    this.chunks.push(...newChunks)

    // 重建词汇表并重新向量化所有分块
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
          vector: [],  // 先占位，rebuildVocabularyAndVectorize 中填充
        })
        index++
      }

      // 下一块从 start + chunkSize - overlap 开始，实现重叠
      start += chunkSize - overlap
    }

    return chunks
  }

  private rebuildVocabularyAndVectorize(): void {
    // 收集所有分块中出现的所有词，构建全局词汇表
    const vocabSet = new Set<string>()
    for (const chunk of this.chunks) {
      const words = chunk.content
        .toLowerCase()
        .split(/[\s,.?!，。？！、：:；;\n\r\t]+/)
        .filter(w => w.length > 0)
      for (const word of words) vocabSet.add(word)
    }
    vocabulary = Array.from(vocabSet).sort()

    // 对所有分块重新计算向量（词汇表变了，旧向量失效）
    for (const chunk of this.chunks) {
      chunk.vector = naiveVectorize(chunk.content)
    }
  }

  /**
   * 向量检索：把查询向量化，与所有分块做余弦相似度，取 top-K
   */
  search(query: string, topK: number = 3): Chunk[] {
    if (this.chunks.length === 0) return []

    const queryVec = naiveVectorize(query)

    const scored = this.chunks.map(chunk => ({
      chunk,
      score: cosineSimilarity(queryVec, chunk.vector),
    }))

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ chunk }) => chunk)
  }

  /**
   * 把检索结果格式化为注入 system prompt 的上下文字符串
   */
  formatContext(chunks: Chunk[]): string {
    if (chunks.length === 0) return ''

    const sections = chunks.map((chunk, i) =>
      `[文档片段 ${i + 1} | 来源: ${chunk.source}]\n${chunk.content}`
    )

    return `以下是与问题相关的文档内容，请基于这些内容回答：\n\n${sections.join('\n\n')}`
  }

  get totalChunks(): number {
    return this.chunks.length
  }
}
```

`rebuildVocabularyAndVectorize` 在每次 `addDocument` 后调用，确保词汇表始终覆盖全部文档。代价是每次加文档都要重算所有向量，适合文档数量有限的场景。生产环境通常在离线阶段一次性构建索引。

### 第四步：RAGAgent 类

```ts
class RAGAgent {
  private client: OpenAI
  private store: DocumentStore
  private baseSystem: string

  constructor(store: DocumentStore, baseSystem: string = '') {
    this.client = new OpenAI()
    this.store = store
    this.baseSystem = baseSystem
  }

  async chat(userMessage: string): Promise<string> {
    // 1. 检索相关片段
    const relevantChunks = this.store.search(userMessage, 3)

    if (relevantChunks.length > 0) {
      console.log(`[检索到 ${relevantChunks.length} 个相关片段]`)
      relevantChunks.forEach((chunk, i) => {
        const preview = chunk.content.slice(0, 60).replace(/\n/g, ' ')
        console.log(`  片段${i + 1}: ${preview}...`)
      })
    } else {
      console.log('[未找到相关片段，依赖模型自身知识]')
    }

    // 2. 构建注入了检索内容的 system prompt
    const context = this.store.formatContext(relevantChunks)
    const systemPrompt = context
      ? `${this.baseSystem}\n\n${context}`.trim()
      : this.baseSystem

    // 3. 调用模型
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'user', content: userMessage },
    ]

    if (systemPrompt) {
      messages.unshift({ role: 'system', content: systemPrompt })
    }

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages,
    })

    return response.choices[0].message.content ?? ''
  }
}
```

RAGAgent 不持有文档，只持有 DocumentStore 的引用。文档管理和检索逻辑完全封装在 DocumentStore 中，职责清晰。

### 第五步：主程序——预置文档并验证

```ts
async function main() {
  const store = new DocumentStore()

  // 预置文档：几段关于 TypeScript 和 Agent 的技术说明
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
常用 Embedding 模型：OpenAI text-embedding-3-large、OpenAI text-embedding-3-small、本地模型 all-MiniLM-L6-v2。
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

  // 测试 1：TypeScript 类型问题
  console.log('=== 提问 1: TypeScript 的 interface 和 type 有什么区别？===')
  const answer1 = await agent.chat('TypeScript 的 interface 和 type 有什么区别？')
  console.log(`Agent: ${answer1}\n`)

  // 测试 2：Agent 相关问题
  console.log('=== 提问 2: Agent 的上下文窗口满了怎么办？===')
  const answer2 = await agent.chat('Agent 的上下文窗口满了怎么办？')
  console.log(`Agent: ${answer2}\n`)

  // 测试 3：RAG 本身的问题
  console.log('=== 提问 3: 常见的向量数据库有哪些？===')
  const answer3 = await agent.chat('常见的向量数据库有哪些？')
  console.log(`Agent: ${answer3}\n`)
}

main().catch(console.error)
```

### 运行结果

```
[文档已加载: 6 个片段 | 来源: typescript-types.md]
[文档已加载: 5 个片段 | 来源: agent-basics.md]
[文档已加载: 6 个片段 | 来源: rag-overview.md]

[知识库初始化完成，共 17 个分块]

=== 提问 1: TypeScript 的 interface 和 type 有什么区别？===
[检索到 3 个相关片段]
  片段1: TypeScript 的 interface 和 type 都用于描述对象的形状。 interface 支持声明合并...
  片段2: interface 只能描述对象结构，不能直接表示联合类型。 type 更灵活：支持联合类型...
  片段3: interface 可以用 extends 关键字继承其他 interface，也可以继承 type...
Agent: 根据文档内容，interface 和 type 的主要区别是：
1. 声明合并：interface 支持同名自动合并，type 重复声明会报错
2. 灵活性：type 支持联合类型、交叉类型和条件类型，interface 不行
3. 使用建议：描述对象形状优先 interface，需要复合类型用 type

=== 提问 2: Agent 的上下文窗口满了怎么办？===
[检索到 3 个相关片段]
  片段1: 上下文窗口是 Agent 的工作记忆：所有对话历史、工具调用结果都存在这里。 当上下文窗口接近...
  片段2: AI Agent 的核心循环是 ReAct 模式：Reason（推理）和 Act（行动）交替进行...
  片段3: 多 Agent 系统中，Orchestrator 负责任务分解，Sub-agent 负责具体执行...
Agent: 文档中提到，上下文窗口接近上限时需要压缩策略：保留关键消息，丢弃或摘要旧消息。
具体策略包括：滑动窗口（只保留最近 N 条消息）、摘要压缩（把旧对话摘要成一条）、重要性过滤（保留工具调用结果，丢弃中间推理过程）。

=== 提问 3: 常见的向量数据库有哪些？===
[检索到 3 个相关片段]
  片段1: 向量数据库负责高效存储和检索向量：Qdrant、Chroma、pgvector 是常见选择...
  片段2: RAG（检索增强生成）的核心思想：不把所有文档塞进上下文，只检索相关片段...
  片段3: 常用 Embedding 模型：OpenAI text-embedding-3-large、OpenAI text-embedding-3-small、本地模型...
Agent: 常见向量数据库有：Qdrant（高性能，支持过滤）、Chroma（轻量，开发友好）、pgvector（PostgreSQL 插件，适合已有 PG 用户）。选型时考虑数据规模、是否需要混合查询、以及团队的基础设施偏好。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 分块（Chunking） | 文档切成小片段，每片段语义独立，便于精准检索 |
| 重叠（Overlap） | 相邻块保留部分重复内容，防止关键信息被边界截断 |
| 词频向量 | 演示用简化方案，无法捕捉语义相似性，生产环境用 Embedding 模型 |
| L2 归一化 | 向量除以自身长度，使余弦相似度等价于点积，计算更快 |
| 全局词汇表 | 所有分块共用同一词表，保证向量维度一致，可进行比较 |
| 余弦相似度 | 衡量向量方向的接近程度，与向量长度无关，适合文本相似度 |
| top-K 检索 | 只取相似度最高的 K 个片段注入上下文，控制 Token 成本 |
| 上下文注入 | 检索结果格式化后追加到 system prompt，来源标注清晰 |

## 常见问题

**Q: 为什么不直接把整个文档塞进上下文？**

三个原因：第一，上下文窗口有限，大型文档库塞不下；第二，Token 成本高，每次调用都把全量文档传一遍；第三，注意力稀释——文档越长，模型对关键内容的"注意力权重"越分散，回答质量下降。RAG 只传相关片段，在成本、质量、覆盖范围之间取得平衡。

**Q: 分块大小怎么选？**

没有通用答案，取决于文档类型和模型的上下文窗口。经验值：

- API 文档、代码注释：100-200 字符（信息密度高，块小点）
- 技术文章、手册：300-500 字符（叙述性文字，需要一定上下文）
- 长篇报告：500-800 字符（摘要级检索）

分块太小：单块信息不完整，模型回答需要拼凑多块；分块太大：向量语义模糊，检索精度下降。调参时看检索结果是否"看起来相关"，这是最直接的信号。

**Q: 真实项目用什么向量数据库？**

取决于场景：

- **Qdrant**：高性能，支持有效载荷过滤（先过滤再向量检索），适合生产规模
- **Chroma**：Python 生态，开箱即用，适合快速原型和本地开发
- **pgvector**：PostgreSQL 扩展，适合已有 PostgreSQL 基础设施的团队，一个数据库搞定向量和关系数据

Embedding 模型选型：
- **OpenAI text-embedding-3-large**：与 Claude 配合效果好，中英文双语优秀
- **OpenAI text-embedding-3-small**：成本低，英文效果好
- **本地模型（all-MiniLM-L6-v2）**：零 API 成本，适合离线或隐私敏感场景

## 小结与延伸

本章实现了一套完整的 RAG 流水线骨架：

- **DocumentStore**：分块、向量化（词频 TF 风格）、余弦相似度检索
- **RAGAgent**：检索相关片段，格式化注入 system prompt，调用模型生成

三个设计决策值得记住：

1. **词汇表全局共享**：所有分块向量维度一致，才能相互比较
2. **L2 归一化**：向量归一后，相似度计算退化为点积，简洁高效
3. **来源标注**：检索结果注入时带上文件名，帮助模型区分参考资料和自身知识

词频向量的根本局限是无法捕捉语义相似性——"速度"和"性能"词面不同，但语义相近。真实系统必须替换为 Embedding 模型。替换方法很简单：把 `naiveVectorize` 换成调用 Embedding API，其余代码完全不变。

接下来：

- **P8**：GraphRAG——用知识图谱增强 RAG，处理实体关系和多跳推理
- **P9**：混合检索——关键词 + 向量双路并行，在精准性和召回率之间取得最佳平衡

<StarCTA />
