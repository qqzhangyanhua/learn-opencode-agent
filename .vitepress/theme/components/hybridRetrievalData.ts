import type { HybridRetrievalPhase } from './types'

export interface HybridStep {
  phase: HybridRetrievalPhase
  title: string
  description: string
  code?: string
  output?: string
}

export interface RetrievalMethod {
  label: string
  strength: string
  weakness: string
  phase: HybridRetrievalPhase
}

export const HYBRID_STEPS: HybridStep[] = [
  {
    phase: 'query',
    title: '1. 用户查询',
    description: 'Agent 接收查询，准备并行执行多路检索',
    code: `const query = "TypeScript 接口有什么特点？"\n// 即将触发：关键词检索 + 向量检索（并行）`,
  },
  {
    phase: 'keyword',
    title: '2. 关键词检索（并行路 A）',
    description: '词频匹配，精确命中含目标词汇的文档',
    code: `class KeywordRetriever {\n  retrieve(query: string): SearchResult[] {\n    const keywords = tokenize(query)\n    return this.docs\n      .map(doc => ({ doc, score: tfScore(doc, keywords) }))\n      .filter(r => r.score > 0)\n      .sort((a, b) => b.score - a.score)\n  }\n}`,
    output: `关键词检索结果（按 TF 分排序）：\n#1 文档A: interface 声明合并 (score: 3.2)\n#2 文档C: interface 继承 (score: 2.1)\n#3 文档F: TS 类型系统 (score: 1.5)`,
  },
  {
    phase: 'vector',
    title: '3. 向量检索（并行路 B）',
    description: '余弦相似度，语义匹配捕获同义表达',
    code: `class VectorRetriever {\n  retrieve(query: string): SearchResult[] {\n    const qVec = vectorize(query)\n    return this.store\n      .map(entry => ({\n        doc: entry.text,\n        score: cosineSimilarity(qVec, entry.vector)\n      }))\n      .sort((a, b) => b.score - a.score)\n  }\n}`,
    output: `向量检索结果（按余弦相似度排序）：\n#1 文档A: interface 声明合并 (sim: 0.92)\n#2 文档B: TS 规范说明 (sim: 0.85)\n#3 文档C: interface 继承 (sim: 0.79)`,
  },
  {
    phase: 'rrf',
    title: '4. RRF 算法融合排名',
    description: 'Reciprocal Rank Fusion：对两路排名求倒数加权求和，k=60',
    code: `function rrfScore(ranks: number[], k = 60): number {\n  return ranks.reduce((sum, rank) => sum + 1 / (k + rank), 0)\n}\n\n// 文档A: 1/(60+1) + 1/(60+1) = 0.0328\n// 文档C: 1/(60+2) + 1/(60+3) = 0.0321\n// 文档B: 1/(60+∞) + 1/(60+2) = 0.0156`,
    output: `RRF 融合得分：\n文档A: 0.0328 ← 两路均 #1\n文档C: 0.0321 ← 两路都命中\n文档B: 0.0156 ← 仅向量命中`,
  },
  {
    phase: 'merge',
    title: '5. 最终融合排名',
    description: '融合结果同时具备精确匹配和语义匹配优势',
    output: `最终 Top-3（融合后）：\n#1 文档A: interface 声明合并\n   关键词排名: #1, 向量排名: #1\n#2 文档C: interface 继承\n   关键词排名: #2, 向量排名: #3\n#3 文档B: TS 规范说明\n   关键词排名: 未命中, 向量排名: #2`,
  },
  {
    phase: 'inject',
    title: '6. 注入上下文生成答案',
    description: '把融合后的 top-K 文档注入 prompt，模型综合两路检索结果回答',
    code: `const context = mergedResults\n  .slice(0, 3)\n  .map(r => r.doc)\n  .join('\\n---\\n')\n\nconst messages = [\n  { role: 'system', content: \`参考资料：\\n\${context}\` },\n  { role: 'user', content: query }\n]`,
  },
]

export const RETRIEVAL_METHODS: RetrievalMethod[] = [
  {
    label: '关键词检索',
    strength: '精确命中，速度快',
    weakness: '无法理解语义',
    phase: 'keyword',
  },
  {
    label: '向量检索',
    strength: '语义理解，同义匹配',
    weakness: '精确词可能漏召回',
    phase: 'vector',
  },
  {
    label: 'RRF 融合',
    strength: '两路互补，稳定性高',
    weakness: '计算开销略增',
    phase: 'rrf',
  },
]
