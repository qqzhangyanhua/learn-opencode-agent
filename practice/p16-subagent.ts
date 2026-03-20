import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

interface ToolDefinition {
  schema: OpenAI.ChatCompletionTool
  execute: (input: Record<string, string>) => Promise<string>
}

interface SubAgentConfig {
  name: string
  systemPrompt: string
  tools: ToolDefinition[]
  maxIterations: number
}

interface SubAgentResult {
  agentName: string
  output: string
  iterations: number
  toolCalls: string[]
}

interface SubTaskSpec {
  id: string
  title: string
  description: string
  agentType: 'research' | 'code'
}

const webSearchTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'web_search',
      description: '搜索网络获取相关信息，返回搜索结果摘要',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
        },
        required: ['query'],
      },
    },
  },
  execute: async (input) => {
    return `搜索 "${input.query}" 的结果：
1. 相关技术文章：深入理解 ${input.query} 的核心原理与最佳实践
2. 官方文档：${input.query} API 参考手册
3. 社区讨论：${input.query} 在生产环境中的常见问题与解决方案`
  },
}

const summarizeTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'summarize',
      description: '将一段文本压缩为结构化摘要',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '需要总结的文本' },
          focus: { type: 'string', description: '总结的侧重点' },
        },
        required: ['text'],
      },
    },
  },
  execute: async (input) => {
    const focus = input.focus ? `（侧重 ${input.focus}）` : ''
    return `摘要${focus}：${input.text.slice(0, 100)}...（已压缩为关键信息）`
  },
}

const readFileTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取指定路径的文件内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
        },
        required: ['path'],
      },
    },
  },
  execute: async (input) => {
    return `// 文件: ${input.path}
function processData(items: string[]) {
  return items.filter(Boolean).map((item) => item.trim())
}

export { processData }`
  },
}

const analyzeCodeTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'analyze_code',
      description: '对一段代码执行静态分析，返回问题列表',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: '要分析的代码' },
          dimension: {
            type: 'string',
            description: '分析维度：security | performance | quality',
          },
        },
        required: ['code', 'dimension'],
      },
    },
  },
  execute: async (input) => {
    return `[${input.dimension}] 分析完成：
- 发现 2 个潜在问题
- 建议：增加输入验证、添加错误处理
- 严重程度：中等`
  },
}

function isSubTaskSpec(value: unknown): value is SubTaskSpec {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    typeof obj['description'] === 'string' &&
    (obj['agentType'] === 'research' || obj['agentType'] === 'code')
  )
}

class SubAgent {
  private readonly config: SubAgentConfig
  private messages: OpenAI.ChatCompletionMessageParam[] = []
  private callLog: string[] = []
  private lastAssistantText = ''

  constructor(config: SubAgentConfig) {
    this.config = config
  }

  async run(task: string): Promise<SubAgentResult> {
    console.log(`  [${this.config.name}] 启动，任务: ${task.slice(0, 60)}...`)

    this.messages = [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: task },
    ]
    this.callLog = []
    this.lastAssistantText = ''
    const toolSchemas = this.config.tools.map((tool) => tool.schema)
    let iterations = 0

    while (iterations < this.config.maxIterations) {
      iterations += 1

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        tools: toolSchemas,
        messages: this.messages,
      })

      const message = response.choices[0].message
      this.lastAssistantText = message.content ?? ''

      const toolCalls = message.tool_calls ?? []

      if (response.choices[0].finish_reason === 'stop' || toolCalls.length === 0) {
        console.log(
          `  [${this.config.name}] 完成，${iterations} 轮，${this.callLog.length} 次工具调用`,
        )
        return {
          agentName: this.config.name,
          output: this.lastAssistantText,
          iterations,
          toolCalls: [...this.callLog],
        }
      }

      this.messages.push(message)

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue

        const toolDef = this.config.tools.find((tool) => {
          if (tool.schema.type === 'function') {
            return tool.schema.function.name === toolCall.function.name
          }
          return false
        })
        if (!toolDef) {
          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `错误：未知工具 ${toolCall.function.name}`,
          })
          continue
        }

        this.callLog.push(toolCall.function.name)
        console.log(`  [${this.config.name}] 调用工具: ${toolCall.function.name}`)

        const input = JSON.parse(toolCall.function.arguments) as Record<string, string>
        const result = await toolDef.execute(input)

        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
    }

    console.log(
      `  [${this.config.name}] 达到最大迭代次数 (${this.config.maxIterations})，强制返回`,
    )

    return {
      agentName: this.config.name,
      output: this.lastAssistantText || '（子 Agent 未能在限定轮次内完成任务）',
      iterations: this.config.maxIterations,
      toolCalls: [...this.callLog],
    }
  }
}

function createSubAgent(task: SubTaskSpec): SubAgent {
  const configs: Record<SubTaskSpec['agentType'], SubAgentConfig> = {
    research: {
      name: `研究员-${task.id}`,
      systemPrompt: [
        '你是一名研究专家。你的任务是搜索和整理资料。',
        '工作流程：1) 用 web_search 搜索相关信息 2) 用 summarize 整理关键发现 3) 输出结构化的研究报告。',
        '务必至少搜索两次以确保信息全面，然后输出最终结论。',
      ].join('\n'),
      tools: [webSearchTool, summarizeTool],
      maxIterations: 8,
    },
    code: {
      name: `代码审查员-${task.id}`,
      systemPrompt: [
        '你是一名代码审查专家。你的任务是分析代码质量。',
        '工作流程：1) 用 read_file 读取目标代码 2) 用 analyze_code 从指定维度分析 3) 输出审查报告。',
        '报告格式：先列出发现的问题，再给出改进建议。',
      ].join('\n'),
      tools: [readFileTool, analyzeCodeTool],
      maxIterations: 6,
    },
  }

  return new SubAgent(configs[task.agentType])
}

async function runWithTimeout(
  agent: SubAgent,
  task: string,
  timeoutMs: number,
): Promise<SubAgentResult> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('SubAgent 超时')), timeoutMs)
  })

  return Promise.race([agent.run(task), timeout])
}

async function orchestrate(userMessage: string): Promise<string> {
  console.log(`用户: ${userMessage}\n`)

  const planResponse = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          '你是一个任务编排器。分析用户请求，将其拆解为子任务列表。',
          '每个子任务必须包含 id、title、description 和 agentType。',
          'agentType 只能是 "research"（需要搜索资料）或 "code"（需要分析代码）。',
          '用 JSON 格式输出子任务数组，不要输出其他内容。',
          '格式：[{"id":"...","title":"...","description":"...","agentType":"research|code"}]',
        ].join('\n'),
      },
      { role: 'user', content: userMessage },
    ],
  })

  const planText = planResponse.choices[0].message.content ?? ''

  const jsonMatch = planText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return `编排器未能拆解任务。原始输出：${planText}`
  }

  let parsedTasks: unknown
  try {
    parsedTasks = JSON.parse(jsonMatch[0])
  } catch {
    return `编排器输出的 JSON 解析失败：${jsonMatch[0]}`
  }

  const tasks = Array.isArray(parsedTasks)
    ? parsedTasks.filter((task) => isSubTaskSpec(task))
    : []

  console.log(`[Orchestrator] 拆解为 ${tasks.length} 个子任务：`)
  tasks.forEach((task) => console.log(`  - [${task.agentType}] ${task.title}`))
  console.log('')

  const TIMEOUT_MS = 60_000
  const settled = await Promise.allSettled(
    tasks.map((task) => {
      const agent = createSubAgent(task)
      return runWithTimeout(agent, task.description, TIMEOUT_MS)
    }),
  )

  const results: SubAgentResult[] = []
  const failures: Array<{ taskId: string; error: string }> = []

  for (let index = 0; index < settled.length; index += 1) {
    const outcome = settled[index]
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value)
    } else {
      failures.push({
        taskId: tasks[index]?.id ?? `unknown-${index}`,
        error: String(outcome.reason),
      })
    }
  }

  const workerOutputs = results
    .map((result) =>
      [
        `### ${result.agentName}`,
        `工具调用: ${result.toolCalls.join(' → ') || '无'}`,
        `迭代次数: ${result.iterations}`,
        '',
        result.output,
      ].join('\n'),
    )
    .join('\n\n---\n\n')

  const failureReport =
    failures.length > 0
      ? `\n\n### 失败的子任务\n${failures.map((failure) => `- ${failure.taskId}: ${failure.error}`).join('\n')}`
      : ''

  const synthesisResponse = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          '你是一个报告聚合专家。将多个子 Agent 的输出整合为一份结构清晰的综合报告。提炼核心发现，去除重复，解决冲突。',
      },
      {
        role: 'user',
        content: `以下是各子 Agent 的执行结果：\n\n${workerOutputs}${failureReport}\n\n请整合为一份综合报告。`,
      },
    ],
  })

  return synthesisResponse.choices[0].message.content ?? ''
}

async function main(): Promise<void> {
  const answer = await orchestrate(
    '帮我调研 TypeScript 的装饰器（Decorator）特性：1) 搜索装饰器的最新 TC39 提案状态和主流框架支持情况；2) 分析 src/decorators.ts 文件中的装饰器实现是否有性能或安全问题。',
  )

  console.log('\n========== 综合报告 ==========\n')
  console.log(answer)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
