import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

interface PlanStep {
  id: string
  description: string
  tool?: string
  status: 'pending' | 'running' | 'done' | 'failed'
  result?: string
}

type ToolFunction = (input: Record<string, string>) => Promise<string>

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function file_search(input: Record<string, string>): Promise<string> {
  const query = input['query'] ?? ''
  await sleep(100)

  const fakeResults: Record<string, string> = {
    typescript: '找到文件：typescript-5.0-release-notes.md, ts-changelog.md',
    report: '找到文件：report-template.md, sample-report.md',
  }

  for (const [key, value] of Object.entries(fakeResults)) {
    if (query.toLowerCase().includes(key)) return value
  }

  return `未找到与"${query}"相关的文件`
}

async function web_search(input: Record<string, string>): Promise<string> {
  const query = input['query'] ?? ''
  await sleep(150)

  const fakeResults: Record<string, string> = {
    'typescript 5': `TypeScript 5.0 主要新特性：
1. Decorators（装饰器）正式进入标准（Stage 3）
2. const type parameters：泛型参数支持 const 修饰
3. 多个配置文件继承（extends 支持数组）
4. bundler 模块解析模式
5. 枚举和命名空间合并改进
6. --verbatimModuleSyntax 标志`,
    'const type parameters': 'const type parameters 允许在推断泛型时保留字面量类型，无需显式写 as const',
    decorators: 'TypeScript 5.0 Decorators 符合 TC39 Stage 3 提案，与旧版 experimentalDecorators 不兼容',
  }

  for (const [key, value] of Object.entries(fakeResults)) {
    if (query.toLowerCase().includes(key)) return value
  }

  return `搜索"${query}"：暂无相关结果`
}

async function write_report(input: Record<string, string>): Promise<string> {
  const filename = input['filename'] ?? 'report.md'
  const content = input['content'] ?? ''
  await sleep(80)

  const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '')
  return `已写入文件 ${filename}（${content.length} 字符）\n预览：${preview}`
}

const toolRegistry: Record<string, ToolFunction> = {
  file_search,
  web_search,
  write_report,
}

function extractJsonBlock(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return null
}

class Planner {
  async createPlan(goal: string): Promise<PlanStep[]> {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `你是一个任务规划器。将用户目标分解为 3-6 个有序的、可独立执行的步骤。

要求：
- 步骤要具体，每步只做一件事
- 步骤之间有明确的依赖顺序
- 必须以合法 JSON 数组输出，不要输出任何其他内容
- 格式如下：
[
  {"id": "step_1", "description": "步骤描述"},
  {"id": "step_2", "description": "步骤描述"}
]`,
        },
        { role: 'user', content: `目标：${goal}` },
      ],
    })

    const text = response.choices[0].message.content ?? ''

    return this.parseSteps(text)
  }

  async revisePlan(
    completedSteps: PlanStep[],
    failedStep: PlanStep,
    error: string,
  ): Promise<PlanStep[]> {
    const completedSummary = completedSteps
      .filter((step) => step.status === 'done')
      .map((step) => `- ${step.description}：${(step.result ?? '').slice(0, 80)}`)
      .join('\n')

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `你是一个任务规划器。任务执行过程中某个步骤失败了，你需要重新规划剩余步骤。

要求：
- 不要重复已完成的步骤
- 考虑失败原因，调整策略
- 必须以合法 JSON 数组输出，不要输出任何其他内容
- 格式如下：
[
  {"id": "step_revised_1", "description": "步骤描述"},
  {"id": "step_revised_2", "description": "步骤描述"}
]`,
        },
        {
          role: 'user',
          content: `已完成的步骤：
${completedSummary || '无'}

失败步骤：${failedStep.description}
失败原因：${error}

请规划剩余需要执行的步骤（不含已完成的）。`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''

    return this.parseSteps(text)
  }

  private parseSteps(text: string): PlanStep[] {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.warn('[Planner] 无法找到 JSON 数组，原始输出：', text.slice(0, 200))
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      console.warn('[Planner] JSON 解析失败：', jsonMatch[0].slice(0, 200))
      return []
    }

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is { id: string; description: string } => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>)['id'] === 'string' &&
          typeof (item as Record<string, unknown>)['description'] === 'string'
        )
      })
      .map((item) => ({
        id: item.id,
        description: item.description,
        status: 'pending' as const,
      }))
  }
}

class Executor {
  async executeStep(step: PlanStep, context: string): Promise<string> {
    const systemPrompt = `你是一个任务执行器。根据步骤描述完成具体任务。

${
  Object.keys(toolRegistry).length > 0
    ? `可用工具（如需要，在回复中以 TOOL_CALL: 开头，格式如下）：
TOOL_CALL: {"tool": "工具名", "input": {"参数名": "参数值"}}

可用工具列表：
- file_search：搜索本地文件，参数：{"query": "搜索词"}
- web_search：搜索网络信息，参数：{"query": "搜索词"}
- write_report：写入文件，参数：{"filename": "文件名", "content": "内容"}

如果不需要工具，直接输出执行结果即可。`
    : '直接输出执行结果。'
}

注意：
- 只完成当前步骤要求的任务
- 输出要具体、完整，供后续步骤使用`

    const userContent = `${
      context ? `前序步骤结果：\n${context}\n\n` : ''
    }当前步骤：${step.description}`

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })

    const text = response.choices[0].message.content ?? ''

    const marker = 'TOOL_CALL:'
    const markerIndex = text.indexOf(marker)
    if (markerIndex !== -1) {
      const jsonStr = extractJsonBlock(text.slice(markerIndex + marker.length))
      if (!jsonStr) {
        return `[工具调用解析失败]\n模型原始输出：${text}`
      }
      return this.handleToolCall(jsonStr, text)
    }

    return text
  }

  private async handleToolCall(jsonStr: string, fullText: string): Promise<string> {
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return `[工具调用解析失败]\n模型原始输出：${fullText}`
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>)['tool'] !== 'string'
    ) {
      return `[工具调用格式错误]\n原始：${jsonStr}`
    }

    const { tool, input } = parsed as { tool: string; input?: Record<string, string> }
    const toolFn = toolRegistry[tool]

    if (!toolFn) {
      return `[未知工具: ${tool}]，可用工具：${Object.keys(toolRegistry).join(', ')}`
    }

    try {
      return await toolFn(input ?? {})
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      return `[工具 ${tool} 执行失败]: ${errMsg}`
    }
  }
}

class PlanAndExecuteAgent {
  private readonly planner = new Planner()
  private readonly executor = new Executor()

  constructor(private readonly maxRevisions = 2) {}

  async run(goal: string): Promise<void> {
    console.log(`目标: ${goal}\n`)
    console.log('[规划中...]')

    let steps = await this.planner.createPlan(goal)
    if (steps.length === 0) {
      console.log('[规划失败] 无法生成有效步骤，退出。')
      return
    }

    console.log('计划:')
    steps.forEach((step) => {
      console.log(`  ${step.id}: ${step.description}`)
    })
    console.log('')

    let context = ''
    let revisionCount = 0
    let index = 0

    while (index < steps.length) {
      const step = steps[index]
      step.status = 'running'

      console.log(`[执行 ${step.id}: ${step.description}]`)

      try {
        const result = await this.executor.executeStep(step, context)
        step.status = 'done'
        step.result = result
        context += `\n[${step.id} 结果]\n${result}\n`

        console.log(`结果: ${result.slice(0, 120)}${result.length > 120 ? '...' : ''}`)
        console.log('')
        index += 1
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        step.status = 'failed'

        console.log(`[步骤失败] ${step.description}`)
        console.log(`错误: ${errMsg}`)

        if (revisionCount >= this.maxRevisions) {
          console.log(`[已达最大重规划次数 ${this.maxRevisions}，停止执行]`)
          break
        }

        console.log('\n[重新规划中...]')
        revisionCount += 1

        const revisedSteps = await this.planner.revisePlan(steps, step, errMsg)
        if (revisedSteps.length === 0) {
          console.log('[重规划失败] 无法生成新步骤，停止执行。')
          break
        }

        console.log('修订后的剩余步骤:')
        revisedSteps.forEach((revisedStep) => {
          console.log(`  ${revisedStep.id}: ${revisedStep.description}`)
        })
        console.log('')

        steps = [...steps.slice(0, index + 1), ...revisedSteps]
        index += 1
      }
    }

    const doneCount = steps.filter((step) => step.status === 'done').length
    const failedCount = steps.filter((step) => step.status === 'failed').length

    console.log('---')
    console.log(`执行完成。成功: ${doneCount} 步，失败: ${failedCount} 步`)

    if (doneCount > 0 && failedCount === 0) {
      console.log('\n任务完成!')
    }
  }
}

async function main(): Promise<void> {
  const agent = new PlanAndExecuteAgent()
  await agent.run('调研 TypeScript 5.0 新特性并写一份简报')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

