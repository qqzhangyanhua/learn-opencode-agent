import OpenAI from 'openai'

interface Entity {
  id: string
  name: string
  type: string
  properties: Record<string, string>
}

interface Relation {
  from: string
  to: string
  type: string
  properties: Record<string, string>
}

class KnowledgeGraph {
  private readonly entities = new Map<string, Entity>()
  private readonly relations: Relation[] = []

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

  getNeighbors(
    entityId: string,
    maxHops = 2,
  ): { entities: Entity[]; relations: Relation[] } {
    const visitedIds = new Set<string>([entityId])
    const collectedEntities: Entity[] = []
    const collectedRelations: Relation[] = []
    const queue: Array<[string, number]> = [[entityId, 0]]

    while (queue.length > 0) {
      const [currentId, currentHop] = queue.shift()!

      if (currentHop >= maxHops) continue

      for (const relation of this.relations) {
        let neighborId: string | null = null

        if (relation.from === currentId) {
          neighborId = relation.to
        } else if (relation.to === currentId) {
          neighborId = relation.from
        }

        if (neighborId === null || visitedIds.has(neighborId)) {
          continue
        }

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

  formatContext(entities: Entity[], relations: Relation[]): string {
    if (entities.length === 0 && relations.length === 0) {
      return '未找到相关图谱信息。'
    }

    const lines: string[] = ['【知识图谱上下文】']

    if (entities.length > 0) {
      lines.push('\n实体信息：')
      for (const entity of entities) {
        const props = Object.entries(entity.properties)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
        lines.push(`  - ${entity.name}（${entity.type}）${props ? `，${props}` : ''}`)
      }
    }

    if (relations.length > 0) {
      lines.push('\n关系信息：')
      for (const relation of relations) {
        const fromEntity = this.entities.get(relation.from)
        const toEntity = this.entities.get(relation.to)
        if (!fromEntity || !toEntity) continue

        lines.push(`  - ${fromEntity.name} --[${relation.type}]--> ${toEntity.name}`)
      }
    }

    return lines.join('\n')
  }
}

class GraphRAGAgent {
  private readonly client: OpenAI
  private readonly graph: KnowledgeGraph
  private readonly allEntityNames: string[]

  constructor(graph: KnowledgeGraph, entityNames: string[]) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.graph = graph
    this.allEntityNames = entityNames
  }

  private extractQueryEntities(question: string): string[] {
    return this.allEntityNames.filter((name) => question.includes(name))
  }

  private getMaxHops(question: string): number {
    if (question.includes('技术') || question.includes('用了什么')) return 3
    if (question.includes('多少人') || question.includes('哪些人') || question.includes('成员')) {
      return 1
    }
    return 2
  }

  async answer(question: string): Promise<void> {
    console.log(`\n问题: ${question}`)
    console.log('─'.repeat(50))

    const queryEntityNames = this.extractQueryEntities(question)
    const maxHops = this.getMaxHops(question)

    if (queryEntityNames.length === 0) {
      console.log('[GraphRAG] 未识别到已知实体，跳过图检索')
    } else {
      console.log(`[GraphRAG] 识别到实体: ${queryEntityNames.join(', ')}`)
      console.log(`[GraphRAG] 使用 ${maxHops} 跳 BFS 检索`)
    }

    const allEntities: Entity[] = []
    const allRelations: Relation[] = []
    const seenEntityIds = new Set<string>()
    const seenRelationKeys = new Set<string>()

    for (const name of queryEntityNames) {
      const startEntity = this.graph.findEntity(name)
      if (!startEntity) continue

      if (!seenEntityIds.has(startEntity.id)) {
        allEntities.push(startEntity)
        seenEntityIds.add(startEntity.id)
      }

      const { entities, relations } = this.graph.getNeighbors(startEntity.id, maxHops)

      for (const entity of entities) {
        if (!seenEntityIds.has(entity.id)) {
          allEntities.push(entity)
          seenEntityIds.add(entity.id)
        }
      }

      for (const relation of relations) {
        const key = `${relation.from}:${relation.type}:${relation.to}`
        if (!seenRelationKeys.has(key)) {
          allRelations.push(relation)
          seenRelationKeys.add(key)
        }
      }
    }

    console.log(
      `[GraphRAG] 检索到 ${allEntities.length} 个实体，${allRelations.length} 条关系`,
    )

    const graphContext = this.graph.formatContext(allEntities, allRelations)
    console.log(`\n${graphContext}`)

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

async function main(): Promise<void> {
  const graph = new KnowledgeGraph()

  const entities: Entity[] = [
    { id: 'e1', name: '张三', type: '人', properties: { 职级: '高级工程师' } },
    { id: 'e2', name: '李四', type: '人', properties: { 职级: '技术经理' } },
    { id: 'e3', name: '王五', type: '人', properties: { 职级: '工程师' } },
    { id: 'e4', name: '项目A', type: '项目', properties: { 状态: '进行中', 优先级: '高' } },
    { id: 'e5', name: '项目B', type: '项目', properties: { 状态: '规划中', 优先级: '中' } },
    { id: 'e6', name: '技术部', type: '部门', properties: { 规模: '20人' } },
    { id: 'e7', name: 'TypeScript', type: '技术', properties: { 版本: '5.x' } },
  ]

  for (const entity of entities) {
    graph.addEntity(entity)
  }

  const relations: Relation[] = [
    { from: 'e1', to: 'e2', type: '同事', properties: {} },
    { from: 'e2', to: 'e4', type: '负责', properties: { 角色: '技术负责人' } },
    { from: 'e3', to: 'e5', type: '负责', properties: { 角色: '项目经理' } },
    { from: 'e1', to: 'e6', type: '属于', properties: {} },
    { from: 'e2', to: 'e6', type: '属于', properties: {} },
    { from: 'e4', to: 'e7', type: '使用', properties: {} },
  ]

  for (const relation of relations) {
    graph.addRelation(relation)
  }

  const entityNames = entities.map((entity) => entity.name)
  const agent = new GraphRAGAgent(graph, entityNames)

  await agent.answer('张三的同事负责什么项目？')
  await agent.answer('张三的同事负责的项目用了什么技术？')
  await agent.answer('技术部有多少人？')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
