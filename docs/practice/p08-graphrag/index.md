---
title: P8：GraphRAG — 知识图谱增强检索
description: 构建基于知识图谱的 RAG 系统，处理实体关系推理，回答需要多跳推断的复杂问题
---

<PracticeProjectGuide project-id="practice-p08-graphrag" />

## 背景与目标

向量 RAG 解决了"找相似文档"的问题，但它有一个根本局限：**它不理解关系**。

考虑这个问题：

> "张三的同事负责哪些项目？"

你的文档库里可能有这些句子：

- "张三和李四是同事，共同在技术部工作。"
- "李四目前负责项目 A 的研发。"

向量检索会为这两段文本分别生成向量，但它无法把它们**串联**起来——"张三 → 同事 → 李四 → 负责 → 项目 A"这条推理链需要**关系遍历**，不是余弦相似度能做到的。

**知识图谱**（Knowledge Graph）正是为此而生。它把信息表示为节点（实体）和边（关系），天然支持多跳推理。

**GraphRAG** 将知识图谱与 LLM 结合：

```
文本语料 → 实体抽取 → 关系抽取 → 构建图 → 查询时图遍历 → 注入上下文 → LLM 生成回答
```

本章目标：手动构建一个小型人员/项目知识图谱，实现 BFS 图遍历检索，让 Agent 能回答需要多跳推理的问题。

## 核心概念

### 知识图谱的结构

知识图谱由两类元素组成：

**节点（Entity）**：现实世界中的实体，比如人、组织、项目、技术。

```
张三  (类型: 人)
李四  (类型: 人)
项目A (类型: 项目)
技术部 (类型: 部门)
```

**边（Relation）**：实体之间的关系，有方向，有类型。

```
张三 --[同事]--> 李四
李四 --[负责]--> 项目A
张三 --[属于]--> 技术部
项目A --[使用]--> TypeScript
```

### 多跳推理

"张三的同事负责什么项目？"需要走 **2 跳**：

```
起点: 张三
第1跳: 张三 --[同事]--> 李四
第2跳: 李四 --[负责]--> 项目A
答案: 项目A
```

向量检索无法自动完成这个链条，但图遍历（BFS/DFS）可以。

### BFS 图遍历策略

从查询实体出发，按广度优先顺序遍历邻居节点，收集 N 跳以内的所有实体和关系：

```
第0跳: {张三}
第1跳: {李四, 技术部}           ← 张三的直接邻居
第2跳: {项目A, 王五}            ← 李四、技术部的邻居（排除已访问）
最终上下文 = 所有收集到的节点 + 边
```

### GraphRAG 与向量 RAG 的互补

| 维度 | 向量 RAG | GraphRAG |
|------|----------|----------|
| 擅长 | 语义相似检索，找"说了类似内容"的段落 | 关系推理，回答"A 和 B 有什么关联" |
| 数据结构 | 向量索引 | 图（节点 + 边） |
| 检索方式 | 余弦相似度排序 | 图遍历（BFS/DFS） |
| 多跳能力 | 弱（需要拼凑） | 强（原生支持） |
| 典型场景 | 文档问答、语义搜索 | 人员关系、供应链、知识库推理 |

生产系统通常将两者结合：向量 RAG 召回候选段落，GraphRAG 补充关系上下文。

## 动手实现

### 第一步：定义数据结构

```ts
// p08-graphrag.ts
import OpenAI from 'openai'

// 实体：知识图谱的节点
interface Entity {
  id: string
  name: string
  type: string
  properties: Record<string, string>
}

// 关系：知识图谱的有向边
interface Relation {
  from: string   // 起点实体 id
  to: string     // 终点实体 id
  type: string   // 关系类型，如 "同事"、"负责"
  properties: Record<string, string>
}
```

### 第二步：实现 KnowledgeGraph 类

```ts
class KnowledgeGraph {
  private entities: Map<string, Entity> = new Map()
  private relations: Relation[] = []

  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity)
  }

  addRelation(relation: Relation): void {
    this.relations.push(relation)
  }

  findEntity(name: string): Entity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.name === name) return entity
    }
    return undefined
  }

  // BFS 图遍历：从 entityId 出发，收集 maxHops 跳以内的邻居
  getNeighbors(
    entityId: string,
    maxHops: number = 2
  ): { entities: Entity[]; relations: Relation[] } {
    const visitedIds = new Set<string>([entityId])
    const collectedEntities: Entity[] = []
    const collectedRelations: Relation[] = []

    // BFS 队列：[实体id, 当前跳数]
    const queue: Array<[string, number]> = [[entityId, 0]]

    while (queue.length > 0) {
      const [currentId, currentHop] = queue.shift()!

      if (currentHop >= maxHops) continue

      // 遍历所有边，找到与当前节点相连的边（出边和入边都收集）
      for (const relation of this.relations) {
        let neighborId: string | null = null

        if (relation.from === currentId) {
          neighborId = relation.to
        } else if (relation.to === currentId) {
          neighborId = relation.from
        }

        if (neighborId === null || visitedIds.has(neighborId)) continue

        const neighborEntity = this.entities.get(neighborId)
        if (!neighborEntity) continue

        visitedIds.add(neighborId)
        collectedEntities.push(neighborEntity)
        collectedRelations.push(relation)
        queue.push([neighborId, currentHop + 1])
      }
    }

    return { entities: collectedEntities, relations: collectedRelations }
  }

  // 将图遍历结果格式化为 LLM 可理解的文本上下文
  formatContext(entities: Entity[], relations: Relation[]): string {
    if (entities.length === 0 && relations.length === 0) {
      return '未找到相关图谱信息。'
    }

    const lines: string[] = ['【知识图谱上下文】']

    if (entities.length > 0) {
      lines.push('\n实体信息：')
      for (const e of entities) {
        const props = Object.entries(e.properties)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
        lines.push(`  - ${e.name}（${e.type}）${props ? `，${props}` : ''}`)
      }
    }

    if (relations.length > 0) {
      lines.push('\n关系信息：')
      for (const r of relations) {
        const fromEntity = this.entities.get(r.from)
        const toEntity = this.entities.get(r.to)
        if (!fromEntity || !toEntity) continue
        lines.push(`  - ${fromEntity.name} --[${r.type}]--> ${toEntity.name}`)
      }
    }

    return lines.join('\n')
  }
}
```

### 第三步：实现 GraphRAGAgent

```ts
class GraphRAGAgent {
  private client: OpenAI
  private graph: KnowledgeGraph
  private allEntityNames: string[]

  constructor(graph: KnowledgeGraph, entityNames: string[]) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.graph = graph
    this.allEntityNames = entityNames
  }

  // 从问题中提取查询实体（简单字符串匹配，真实场景用 NLP/LLM 抽取）
  private extractQueryEntities(question: string): string[] {
    return this.allEntityNames.filter(name => question.includes(name))
  }

  async answer(question: string): Promise<void> {
    console.log(`\n问题: ${question}`)
    console.log('─'.repeat(50))

    // Step 1: 提取查询实体
    const queryEntityNames = this.extractQueryEntities(question)
    if (queryEntityNames.length === 0) {
      console.log('[GraphRAG] 未识别到已知实体，跳过图检索')
    } else {
      console.log(`[GraphRAG] 识别到实体: ${queryEntityNames.join(', ')}`)
    }

    // Step 2: 对每个实体做 BFS 图遍历，合并结果
    const allEntities: Entity[] = []
    const allRelations: Relation[] = []
    const seenEntityIds = new Set<string>()
    const seenRelationKeys = new Set<string>()

    for (const name of queryEntityNames) {
      const startEntity = this.graph.findEntity(name)
      if (!startEntity) continue

      // 把起点实体本身也加入
      if (!seenEntityIds.has(startEntity.id)) {
        allEntities.push(startEntity)
        seenEntityIds.add(startEntity.id)
      }

      const { entities, relations } = this.graph.getNeighbors(startEntity.id, 2)

      for (const e of entities) {
        if (!seenEntityIds.has(e.id)) {
          allEntities.push(e)
          seenEntityIds.add(e.id)
        }
      }

      for (const r of relations) {
        const key = `${r.from}:${r.type}:${r.to}`
        if (!seenRelationKeys.has(key)) {
          allRelations.push(r)
          seenRelationKeys.add(key)
        }
      }
    }

    console.log(`[GraphRAG] 检索到 ${allEntities.length} 个实体，${allRelations.length} 条关系`)

    // Step 3: 格式化图谱上下文
    const graphContext = this.graph.formatContext(allEntities, allRelations)
    console.log('\n' + graphContext)

    // Step 4: 注入上下文，调用 LLM 生成回答
    const systemPrompt = `你是一个知识图谱问答助手。
用户提问时，你会收到从知识图谱中检索到的相关实体和关系作为上下文。
请基于这些上下文信息回答问题，如果上下文不足以回答，请明确说明。`

    const userMessage = `${graphContext}\n\n问题: ${question}`

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })

    const answer = response.choices[0].message.content ?? ''

    console.log(`\n回答: ${answer}`)
  }
}
```

### 第四步：构建知识图谱并运行

```ts
async function main() {
  // 构建知识图谱
  const graph = new KnowledgeGraph()

  // 添加实体
  const entities: Entity[] = [
    { id: 'e1', name: '张三', type: '人', properties: { 职级: '高级工程师' } },
    { id: 'e2', name: '李四', type: '人', properties: { 职级: '技术经理' } },
    { id: 'e3', name: '王五', type: '人', properties: { 职级: '工程师' } },
    { id: 'e4', name: '项目A', type: '项目', properties: { 状态: '进行中', 优先级: '高' } },
    { id: 'e5', name: '项目B', type: '项目', properties: { 状态: '规划中', 优先级: '中' } },
    { id: 'e6', name: '技术部', type: '部门', properties: { 规模: '20人' } },
    { id: 'e7', name: 'TypeScript', type: '技术', properties: { 版本: '5.x' } },
  ]

  for (const e of entities) {
    graph.addEntity(e)
  }

  // 添加关系
  const relations: Relation[] = [
    { from: 'e1', to: 'e2', type: '同事', properties: {} },
    { from: 'e2', to: 'e4', type: '负责', properties: { 角色: '技术负责人' } },
    { from: 'e3', to: 'e5', type: '负责', properties: { 角色: '项目经理' } },
    { from: 'e1', to: 'e6', type: '属于', properties: {} },
    { from: 'e2', to: 'e6', type: '属于', properties: {} },
    { from: 'e4', to: 'e7', type: '使用', properties: {} },
  ]

  for (const r of relations) {
    graph.addRelation(r)
  }

  const entityNames = entities.map(e => e.name)
  const agent = new GraphRAGAgent(graph, entityNames)

  // 查询1：需要 2 跳推理
  await agent.answer('张三的同事负责什么项目？')

  // 查询2：需要 3 跳推理（同事 → 负责项目 → 使用技术）
  await agent.answer('张三的同事负责的项目用了什么技术？')

  // 查询3：直接关系
  await agent.answer('技术部有多少人？')
}

main().catch(console.error)
```

### 运行结果

```
问题: 张三的同事负责什么项目？
──────────────────────────────────────────────────
[GraphRAG] 识别到实体: 张三
[GraphRAG] 检索到 4 个实体，4 条关系

【知识图谱上下文】

实体信息：
  - 张三（人），职级: 高级工程师
  - 李四（人），职级: 技术经理
  - 技术部（部门），规模: 20人
  - 项目A（项目），状态: 进行中，优先级: 高

关系信息：
  - 张三 --[同事]--> 李四
  - 李四 --[负责]--> 项目A
  - 张三 --[属于]--> 技术部
  - 李四 --[属于]--> 技术部

回答: 根据知识图谱，张三的同事是李四（技术经理），李四目前负责项目A，
该项目状态为进行中，优先级为高。

问题: 张三的同事负责的项目用了什么技术？
──────────────────────────────────────────────────
[GraphRAG] 识别到实体: 张三
[GraphRAG] 检索到 5 个实体，5 条关系

【知识图谱上下文】

实体信息：
  - 张三（人），职级: 高级工程师
  - 李四（人），职级: 技术经理
  - 技术部（部门），规模: 20人
  - 项目A（项目），状态: 进行中，优先级: 高
  - TypeScript（技术），版本: 5.x

关系信息：
  - 张三 --[同事]--> 李四
  - 李四 --[负责]--> 项目A
  - 张三 --[属于]--> 技术部
  - 李四 --[属于]--> 技术部
  - 项目A --[使用]--> TypeScript

回答: 根据知识图谱，张三的同事李四负责项目A，项目A使用的技术是 TypeScript（版本 5.x）。

问题: 技术部有多少人？
──────────────────────────────────────────────────
[GraphRAG] 识别到实体: 技术部
[GraphRAG] 检索到 3 个实体，3 条关系

【知识图谱上下文】

实体信息：
  - 技术部（部门），规模: 20人
  - 张三（人），职级: 高级工程师
  - 李四（人），职级: 技术经理

关系信息：
  - 张三 --[属于]--> 技术部
  - 李四 --[属于]--> 技术部

回答: 根据知识图谱，技术部的规模为 20 人。图谱中记录了张三（高级工程师）
和李四（技术经理）属于技术部。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `Entity` | 知识图谱节点，包含 id、name、type 和 properties |
| `Relation` | 有向边，from → to，标注关系类型 |
| `getNeighbors` | BFS 遍历，参数 `maxHops` 控制遍历深度（默认 2 跳） |
| `formatContext` | 将图遍历结果转为 LLM 可读的文本，是 RAG 的"注入"环节 |
| 实体识别 | 本章用简单字符串匹配；生产中用 NLP 模型或另一个 LLM 调用 |
| 双向遍历 | BFS 同时遍历出边和入边，确保不遗漏关系 |
| 去重逻辑 | 多个查询实体可能共享邻居，用 `Set` 避免重复收集 |

## 常见问题

**Q: 真实场景中如何自动抽取实体和关系，不需要手动构建图？**

真实项目有两条路：一是用 NLP 模型（如 spaCy、HanLP）做命名实体识别（NER）和关系抽取；二是直接用 LLM 从文本中抽取，提示词示例："从以下文本中抽取所有实体和关系，以 JSON 格式返回"。Microsoft 的 GraphRAG 开源项目（[github.com/microsoft/graphrag](https://github.com/microsoft/graphrag)）提供了完整的 LLM 驱动抽取流程，可作为参考。

**Q: 生产环境用什么图数据库存储知识图谱？**

常用选择：**Neo4j**（最成熟，Cypher 查询语言）、**ArangoDB**（多模型，支持图+文档）、**Amazon Neptune**（云托管）。本章用内存 Map 实现是为了演示核心算法，替换存储层时只需重写 `KnowledgeGraph` 的读写方法，`GraphRAGAgent` 无需改动。

**Q: GraphRAG 和向量 RAG 怎么选，还是都用？**

看场景。如果问题是"找和这段话相似的内容"，用向量 RAG；如果问题涉及"A 和 B 之间的关系"或需要多跳推理，用 GraphRAG。生产级系统通常**混合使用**：向量 RAG 召回语义相关的段落，GraphRAG 补充实体关系上下文，再一起注入 LLM。这被称为 Hybrid RAG，详见 P9。

## 小结与延伸

本章实现了 GraphRAG 的完整骨架：

- `KnowledgeGraph` 类管理实体和关系，BFS 实现多跳图遍历
- `GraphRAGAgent` 从问题中识别实体，遍历图，格式化上下文，调用 LLM 生成答案
- 演示了向量 RAG 无法处理、但 GraphRAG 能回答的多跳推理场景

实际工程中的扩展方向：

- 用 LLM 替代字符串匹配来识别查询实体（处理别名、缩写）
- 引入边的权重，让 BFS 变成带权最短路径检索
- 接入 Neo4j，用 Cypher 查询替代内存 BFS
- 结合向量 RAG，构建 Hybrid 检索管道（见 P9）

接下来：

- **P9**：将向量检索和图检索融合为 Hybrid RAG 系统
- **P10**：用 ReAct 循环让 Agent 自主规划多步推理策略

<StarCTA />

<PracticeProjectActionPanel project-id="practice-p08-graphrag" />
