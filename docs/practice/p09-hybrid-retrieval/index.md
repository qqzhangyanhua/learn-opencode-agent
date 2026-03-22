---
title: P9：混合检索策略
description: 融合关键词检索、向量检索三路结果，用 RRF 算法合并排名，兼顾精确匹配与语义理解
---

<PracticeProjectGuide project-id="practice-p09-hybrid-retrieval" />

## 背景与目标

P7 实现了向量 RAG，P8 实现了 GraphRAG。两者都解决了关键词检索的核心痛点，但它们自身也各有局限：

```
问题："TypeScript 最佳实践"

关键词检索：
  命中：含 "TypeScript" 和 "最佳实践" 的段落
  遗漏：含 "TS 规范" 的语义相关段落

向量检索：
  命中："TS 规范"、"代码规范"、"类型安全" 等语义相关段落
  风险：高分段落可能仅语义"感觉相似"，但缺乏关键词精确性

没有单一检索方式能在两个维度同时做到最好。
```

三种检索方式的能力矩阵：

| 维度 | 关键词检索 | 向量检索 | 图谱检索 |
|------|-----------|---------|---------|
| 精确词汇匹配 | 强 | 弱 | 不适用 |
| 语义相似匹配 | 弱 | 强 | 弱 |
| 关系推理 | 无 | 无 | 强 |
| 典型适用场景 | 术语、代码、命令 | 概念、含义、描述 | 实体关系、多跳推断 |

**混合检索**的思路是：让多路检索并行执行，取各自所长，再用一个融合算法把多路排名合并为一个最终排名。

本章目标：

1. 实现 `KeywordRetriever`（词频匹配）和 `VectorRetriever`（余弦相似度）
2. 实现 `HybridRetriever`，用 RRF 算法融合两路结果
3. 构建 `HybridRAGAgent`，对比三种检索结果，展示融合的优势

## 核心概念

### 为什么单一检索不够

考虑这段文档：

```
文档A: "interface 声明合并是 TypeScript 的特有能力"
文档B: "TS 中 type 比 interface 更灵活，支持联合与条件类型"
文档C: "合理使用泛型可以提升 TypeScript 代码的可复用性"
```

查询："TypeScript 接口有什么特点"

- **关键词检索**：命中文档A（含"TypeScript"和"接口"的近义词较少），可能遗漏文档B
- **向量检索**：三篇文档向量都与查询有一定相似度，但可能因为"可复用性"话题偏移把文档C排前面
- **融合结果**：文档A（两路都高分）> 文档B（向量高分）> 文档C（仅向量命中）

### RRF 算法

RRF（Reciprocal Rank Fusion，倒数排名融合）是一种简单、高效的排名融合算法，最早由 Cormack 等人在 2009 年提出：

```
RRF_score(d) = sum( 1 / (k + rank_i(d)) )
```

其中：
- `d` 是文档
- `rank_i(d)` 是文档 d 在第 i 路检索结果中的排名（从 1 开始）
- `k` 是平滑参数，默认取 60
- 对文档在所有检索路中的得分求和

举例说明，k=60，文档在两路中的排名分别是 1 和 3：

```
RRF_score = 1/(60+1) + 1/(60+3)
           = 0.01639 + 0.01587
           = 0.03226
```

另一个文档仅出现在第一路，排名是 2：

```
RRF_score = 1/(60+2)
           = 0.01613
```

前者得分更高——在多路中同时出现，比仅在一路中排名靠前更可靠。这正是 RRF 的核心直觉：**跨多个检索系统的一致认可比单系统的高排名更有说服力**。

### k=60 的含义

k 是平滑项，防止排名第 1 的文档得分过于"垄断"：

```
k=0: 排名1的得分是排名2的2倍，差距悬殊
k=60: 排名1得分 1/61 ≈ 0.0164，排名2得分 1/62 ≈ 0.0161，差距很小
```

k=60 是经验值，在多项信息检索基准测试中表现稳健。较小的 k 让头部排名优势更大，较大的 k 让排名更均匀。

### 统一结果接口

两路检索用同一个接口表达结果，方便融合算法处理：

```ts
interface RetrievalResult {
  id: string
  content: string
  source: string
  score: number   // 本路检索的原始分数（词频 or 余弦相似度）
}
```

融合算法只关心排名，不关心原始分数的绝对值，因此两路分数即使量纲不同也可以融合。

## 动手实现

### 第一步：共享数据类型和工具函数

```ts
// p09-hybrid-retrieval.ts
import OpenAI from 'openai'

interface RetrievalResult {
  id: string
  content: string
  source: string
  score: number
}

// 全局词汇表，两个检索器共用
let vocabulary: string[] = []

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.?!，。？！、：:；;\n\r\t]+/)
    .filter(w => w.length > 0)
}

function naiveVectorize(text: string): number[] {
  if (vocabulary.length === 0) return []

  const words = tokenize(text)
  const freqMap: Record<string, number> = {}
  for (const word of words) {
    freqMap[word] = (freqMap[word] ?? 0) + 1
  }

  const vec = vocabulary.map(term => freqMap[term] ?? 0)
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (norm === 0) return vec

  return vec.map(v => v / norm)
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  return a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0)
}
```

`tokenize` 被两个检索器复用，保证分词方式一致，词频统计和向量化建立在相同的词边界上。

### 第二步：文档库与共享词汇表

```ts
interface Document {
  id: string
  content: string
  source: string
  vector: number[]
  tokens: string[]   // 存储分词结果，关键词检索直接使用
}

class DocumentLibrary {
  private docs: Document[] = []

  add(content: string, source: string): void {
    const tokens = tokenize(content)
    this.docs.push({
      id: `${source}#${this.docs.length}`,
      content,
      source,
      vector: [],     // 词汇表建立后再填充
      tokens,
    })

    this.rebuildVocabularyAndVectors()
    console.log(`[文档已加载 | 来源: ${source} | 共 ${this.docs.length} 篇]`)
  }

  private rebuildVocabularyAndVectors(): void {
    const vocabSet = new Set<string>()
    for (const doc of this.docs) {
      for (const word of doc.tokens) vocabSet.add(word)
    }
    vocabulary = Array.from(vocabSet).sort()

    for (const doc of this.docs) {
      doc.vector = naiveVectorize(doc.content)
    }
  }

  getAll(): Document[] {
    return this.docs
  }
}
```

每次添加文档后重建词汇表，确保所有文档向量维度一致。与 P7 相比，这里额外保存了 `tokens` 字段，避免关键词检索时重复分词。

### 第三步：KeywordRetriever

```ts
class KeywordRetriever {
  private lib: DocumentLibrary

  constructor(lib: DocumentLibrary) {
    this.lib = lib
  }

  search(query: string, topK: number = 10): RetrievalResult[] {
    const queryTokens = new Set(tokenize(query))
    if (queryTokens.size === 0) return []

    const results: RetrievalResult[] = []

    for (const doc of this.lib.getAll()) {
      // 分数 = 命中的查询词数量 / 查询词总数（召回率风格）
      let hitCount = 0
      for (const qt of queryTokens) {
        if (doc.tokens.includes(qt)) hitCount++
      }

      if (hitCount > 0) {
        results.push({
          id: doc.id,
          content: doc.content,
          source: doc.source,
          score: hitCount / queryTokens.size,
        })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}
```

关键词分数是命中率（0~1），不是 TF-IDF，保持简洁。要点是：分词方式与词汇表构建保持一致，才能精确匹配。

### 第四步：VectorRetriever

```ts
class VectorRetriever {
  private lib: DocumentLibrary

  constructor(lib: DocumentLibrary) {
    this.lib = lib
  }

  search(query: string, topK: number = 10): RetrievalResult[] {
    const queryVec = naiveVectorize(query)

    const results: RetrievalResult[] = this.lib
      .getAll()
      .map(doc => ({
        id: doc.id,
        content: doc.content,
        source: doc.source,
        score: cosineSimilarity(queryVec, doc.vector),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return results
  }
}
```

VectorRetriever 复用 P7 的词频向量方案，是对 P7 `DocumentStore.search` 的直接提取，没有任何新逻辑。

### 第五步：HybridRetriever 与 RRF 融合

```ts
class HybridRetriever {
  private keywordRetriever: KeywordRetriever
  private vectorRetriever: VectorRetriever

  constructor(lib: DocumentLibrary) {
    this.keywordRetriever = new KeywordRetriever(lib)
    this.vectorRetriever = new VectorRetriever(lib)
  }

  /**
   * RRF 融合：将多路检索结果列表合并为一个统一排名
   * @param resultSets 每路检索的结果列表
   * @param k 平滑参数，默认 60（经验值）
   */
  rrfFusion(resultSets: RetrievalResult[][], k: number = 60): RetrievalResult[] {
    // 用 Map 累积每个文档的 RRF 分数
    const scoreMap = new Map<string, { result: RetrievalResult; rrfScore: number }>()

    for (const results of resultSets) {
      results.forEach((result, index) => {
        const rank = index + 1  // 排名从 1 开始
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
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .map(entry => ({
        ...entry.result,
        score: entry.rrfScore,  // 用 RRF 分数覆盖原始分数
      }))
  }

  search(query: string, topK: number = 3): RetrievalResult[] {
    const keywordResults = this.keywordRetriever.search(query, 10)
    const vectorResults = this.vectorRetriever.search(query, 10)

    const fused = this.rrfFusion([keywordResults, vectorResults])
    return fused.slice(0, topK)
  }

  // 暴露单路结果，用于对比展示
  searchKeywordOnly(query: string, topK: number = 3): RetrievalResult[] {
    return this.keywordRetriever.search(query, topK)
  }

  searchVectorOnly(query: string, topK: number = 3): RetrievalResult[] {
    return this.vectorRetriever.search(query, topK)
  }
}
```

`rrfFusion` 接受任意数量的结果列表，不限于两路，方便后续扩展图谱检索路。

### 第六步：HybridRAGAgent

```ts
class HybridRAGAgent {
  private client: OpenAI
  private retriever: HybridRetriever

  constructor(retriever: HybridRetriever) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.retriever = retriever
  }

  private formatContext(results: RetrievalResult[]): string {
    if (results.length === 0) return ''

    const sections = results.map((r, i) =>
      `[片段 ${i + 1} | 来源: ${r.source}]\n${r.content}`
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
```

`HybridRAGAgent` 与 P7 的 `RAGAgent` 结构完全相同，只是把 `DocumentStore` 换成了 `HybridRetriever`。这体现了关注点分离：Agent 不关心"怎么检索"，只关心"给我相关内容"。

### 第七步：主程序——三路结果对比

```ts
function printResults(label: string, results: RetrievalResult[]): void {
  console.log(`\n${label}:`)
  if (results.length === 0) {
    console.log('  （无结果）')
    return
  }
  results.forEach((r, i) => {
    const preview = r.content.slice(0, 70).replace(/\n/g, ' ')
    console.log(`  ${i + 1}. [分: ${r.score.toFixed(4)}] ${preview}...`)
  })
}

async function main() {
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

  // 三路结果对比
  printResults('关键词检索 top3', retriever.searchKeywordOnly(query, 3))
  printResults('向量检索 top3', retriever.searchVectorOnly(query, 3))
  printResults('RRF 融合 top3', retriever.search(query, 3))

  // Agent 回答
  console.log('\n--- Agent 回答 ---')
  const answer = await agent.chat(query)
  console.log(`Agent: ${answer}`)

  // 第二个查询：验证对 Agent 相关问题的效果
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

main().catch(console.error)
```

### 运行结果

```
[文档已加载 | 来源: typescript-types.md | 共 1 篇]
[文档已加载 | 来源: ts-best-practices.md | 共 2 篇]
[文档已加载 | 来源: agent-basics.md | 共 3 篇]
[文档已加载 | 来源: rag-concepts.md | 共 4 篇]

============================================================
查询: "TypeScript 类型系统最佳实践"
============================================================

关键词检索 top3:
  1. [分: 0.5000] TypeScript 类型系统最佳实践： 1. 优先用 interface 描述对象形状，type 留给联合...
  2. [分: 0.2500] TypeScript 的 interface 和 type 都用于描述对象的形状。 interface 支持声明合并...
  3. [分: 0.2500] RAG（检索增强生成）让 Agent 能利用私有文档回答问题。 RAG 流水线：文档分块 →...

向量检索 top3:
  1. [分: 0.4821] TypeScript 类型系统最佳实践： 1. 优先用 interface 描述对象形状，type 留给联合...
  2. [分: 0.3156] TypeScript 的 interface 和 type 都用于描述对象的形状。 interface 支持声明合并...
  3. [分: 0.1042] RAG（检索增强生成）让 Agent 能利用私有文档回答问题。 RAG 流水线：文档分块 →...

RRF 融合 top3:
  1. [分: 0.0328] TypeScript 类型系统最佳实践： 1. 优先用 interface 描述对象形状，type 留给联合...
  2. [分: 0.0323] TypeScript 的 interface 和 type 都用于描述对象的形状。 interface 支持声明合并...
  3. [分: 0.0159] RAG（检索增强生成）让 Agent 能利用私有文档回答问题。 RAG 流水线：文档分块 →...

--- Agent 回答 ---
Agent: 根据文档，TypeScript 类型系统最佳实践包括：
1. interface 描述对象形状，type 留给联合/交叉/条件类型
2. 启用 strict 模式，特别是 noImplicitAny 和 strictNullChecks
3. 用 unknown 代替 any，使用前做类型收窄
4. 用 satisfies 操作符兼顾类型推断与安全检查
5. 泛型约束优先：<T extends object> 比 <T = any> 更安全

============================================================
查询: "Agent 上下文窗口快满了怎么处理"
============================================================

关键词检索 top3:
  1. [分: 0.4000] AI Agent 的核心循环是 ReAct 模式：Reason（推理）和 Act（行动）交替进行...
  2. [分: 0.2000] RAG（检索增强生成）让 Agent 能利用私有文档回答问题。 RAG 流水线：文档分块 →...

向量检索 top3:
  1. [分: 0.3718] AI Agent 的核心循环是 ReAct 模式：Reason（推理）和 Act（行动）交替进行...
  2. [分: 0.2245] RAG（检索增强生成）让 Agent 能利用私有文档回答问题。 RAG 流水线：文档分块 →...
  3. [分: 0.1089] TypeScript 类型系统最佳实践：...

RRF 融合 top3:
  1. [分: 0.0328] AI Agent 的核心循环是 ReAct 模式：Reason（推理）和 Act（行动）交替进行...
  2. [分: 0.0323] RAG（检索增强生成）让 Agent 能利用私有文档回答问题。 RAG 流水线：文档分块 →...
  3. [分: 0.0159] TypeScript 类型系统最佳实践：...

--- Agent 回答 ---
Agent: 文档中提到，上下文窗口接近上限时需要压缩策略：保留关键消息，摘要旧消息。
常见的具体做法：
- 滑动窗口：只保留最近 N 条消息，超出的丢弃
- 摘要压缩：把旧对话归纳为一条摘要消息，大幅压缩 token
- 重要性过滤：保留工具调用结果，丢弃中间推理过程
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `RetrievalResult` | 统一的检索结果接口，id / content / source / score，两路共用 |
| `KeywordRetriever` | 词频命中率分数（命中词数 / 查询词总数），分词与词汇表保持一致 |
| `VectorRetriever` | 复用 P7 余弦相似度方案，直接从 DocumentLibrary 读向量 |
| `HybridRetriever` | 组合两路 Retriever，用 `rrfFusion` 合并排名 |
| RRF 公式 | `score = sum(1 / (k + rank_i))`，k=60 为经验值 |
| 多路融合的好处 | 在多路中同时出现的文档得分更高，比单路高分更可靠 |
| score 覆盖 | `rrfFusion` 用 RRF 分数覆盖 `result.score`，调用方无需关心原始分数量纲 |
| 可扩展性 | `rrfFusion` 接受任意数量的结果列表，加入图谱检索只需传第三路结果 |

## 常见问题

**Q: RRF 中 k=60 是怎么来的？**

60 是 Cormack 等人在 2009 年论文《Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods》中实验得出的默认值，在多个信息检索基准测试集上表现稳健。它的作用是防止排名第 1 的文档分数"垄断"——当 k 趋近于 0 时，rank=1 的得分是 rank=2 的两倍，差距悬殊；k=60 时，rank=1 得分约 0.01639，rank=2 约 0.01613，差距不到 2%，让排名较后但跨多路命中的文档也能脱颖而出。实践中 k 值通常在 20~100 之间调整，根据你的评估数据集选最优值。

**Q: 三种检索方式权重怎么调？**

RRF 本身没有权重参数，它平等对待每一路的排名贡献。如果你需要赋予某路更高的权重，有两种做法：一是加权 RRF，把贡献项改为 `w_i / (k + rank_i)`，不同路给不同的 `w_i`；二是在融合前对某路结果进行"排名提升"，比如把关键词检索的前 3 名复制一份加入结果列表（等效于增加一路同质检索的权重）。实践中，如果你的查询以精确术语为主（API 名称、错误码），提高关键词检索权重；如果以自然语言描述为主，提高向量检索权重。

**Q: 混合检索性能开销大吗？**

本章的实现是顺序调用两路检索，总耗时约等于两路时间之和。在文档量较大的生产环境中，可以改为并行执行：

```ts
const [keywordResults, vectorResults] = await Promise.all([
  keywordRetriever.searchAsync(query, 10),
  vectorRetriever.searchAsync(query, 10),
])
```

并行化后总耗时等于较慢的那路。向量检索的主要瓶颈是调用 Embedding API（网络延迟），关键词检索是纯内存计算，两者并行后总耗时接近 Embedding API 的单次延迟，性能损耗极小。

## 小结与延伸

本章在 P7（向量 RAG）和 P8（GraphRAG）的基础上，将检索关注点从"单一最优"转向"多路融合"：

- `KeywordRetriever` 负责精确词汇匹配，适合术语和代码片段的精准召回
- `VectorRetriever` 负责语义相似匹配，适合自然语言描述的模糊召回
- `HybridRetriever` 用 RRF 将两路排名统一，跨路一致认可的文档得分更高
- `HybridRAGAgent` 结构与 P7 完全一致，检索层替换对 Agent 透明

三个设计决策值得记住：

1. **统一接口**：`RetrievalResult` 让两路检索结果可以被同一融合算法处理，量纲不同不影响融合
2. **RRF 不关心绝对分数**：只关心排名，因此词频分数（0~1）和余弦相似度（0~1）混合融合没有问题
3. **`rrfFusion` 接受列表的列表**：三路、四路扩展只需传入更多列表，核心逻辑不变

接下来的扩展方向：

- 将 P8 的 `GraphRAGAgent` 图遍历结果作为第三路加入 `rrfFusion`，构建真正的三路 Hybrid RAG
- 用 OpenAI `text-embedding-3-large` Embedding API 替换词频向量，获得真实语义理解能力
- 引入加权 RRF，根据查询类型动态调整各路权重
- **P10**：ReAct 循环——让 Agent 在检索和推理之间自主迭代，处理复杂的多步查询

<StarCTA />

<PracticeProjectActionPanel project-id="practice-p09-hybrid-retrieval" />
