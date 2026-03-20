import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

interface SubTask {
  id: string
  title: string
  description: string
  expertise: string
}

interface WorkerResult {
  taskId: string
  title: string
  output: string
}

function isSubTask(value: unknown): value is SubTask {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    typeof obj['description'] === 'string' &&
    typeof obj['expertise'] === 'string'
  )
}

async function runWorker(task: SubTask): Promise<WorkerResult> {
  console.log(`[Worker:${task.id}] 开始执行: ${task.title}`)

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          `你是一位专注于「${task.expertise}」的专家。`,
          '请严格围绕分配给你的任务进行分析，不要涉及其他维度。',
          '输出格式：先给出核心结论（1-2句），再列出具体发现（要点列表）。',
        ].join('\n'),
      },
      { role: 'user', content: task.description },
    ],
  })

  const output = response.choices[0].message.content ?? ''

  console.log(`[Worker:${task.id}] 完成 (${output.length} chars)\n`)

  return {
    taskId: task.id,
    title: task.title,
    output,
  }
}

const dispatchToolSchema: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'dispatch_workers',
    description:
      '将任务分派给多个专家 Worker 并行执行。每个 Worker 独立工作，互不可见。执行完成后返回所有 Worker 的结果。',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: '子任务唯一标识，如 "security"、"performance"',
              },
              title: {
                type: 'string',
                description: '子任务名称',
              },
              description: {
                type: 'string',
                description: '给 Worker 的详细执行指令，要包含足够的上下文',
              },
              expertise: {
                type: 'string',
                description: 'Worker 的专业领域，如 "安全审计"、"性能优化"',
              },
            },
            required: ['id', 'title', 'description', 'expertise'],
          },
          description: '要分派的子任务列表',
        },
      },
      required: ['tasks'],
    },
  },
}

async function executeDispatch(tasks: SubTask[]): Promise<string> {
  console.log(`\n[Orchestrator] 分派 ${tasks.length} 个子任务，并行执行...\n`)

  const results = await Promise.all(tasks.map((task) => runWorker(task)))
  return results
    .map((result) => [`### ${result.title} (${result.taskId})`, '', result.output].join('\n'))
    .join('\n\n---\n\n')
}

async function orchestrate(userMessage: string): Promise<string> {
  console.log(`用户: ${userMessage}\n`)

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: [
        '你是一个任务编排器（Orchestrator）。你的职责是：',
        '1. 分析用户的请求，将其拆解为多个独立的子任务',
        '2. 使用 dispatch_workers 工具将子任务分派给专家 Worker',
        '3. 收到 Worker 的结果后，综合整理为一份完整、连贯的最终回答',
        '',
        '拆解原则：',
        '- 每个子任务应该是独立的，Worker 之间互不可见',
        '- 子任务的 description 要包含足够的上下文，Worker 只能看到自己的任务描述',
        '- 为每个子任务指定准确的 expertise，确保 Worker 聚焦于自己的专业领域',
        '- 如果任务不需要拆解（太简单），直接回答即可，不必强行分派',
        '',
        '聚合原则：',
        '- 不要简单拼接 Worker 的输出，要提炼和整合',
        '- 如果多个 Worker 的发现有冲突，指出分歧并给出你的判断',
        '- 最终回答应该是一份结构清晰的综合报告',
      ].join('\n'),
    },
    { role: 'user', content: userMessage },
  ]

  while (true) {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      tools: [dispatchToolSchema],
      messages,
    })

    const message = response.choices[0].message
    const toolCalls = message.tool_calls ?? []

    if (response.choices[0].finish_reason === 'stop' || toolCalls.length === 0) {
      return message.content ?? ''
    }

    messages.push(message)

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function' || toolCall.function.name !== 'dispatch_workers') continue

      const input = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
      const tasksRaw = input['tasks']
      const tasks = Array.isArray(tasksRaw) ? tasksRaw.filter((item) => isSubTask(item)) : []
      const result = await executeDispatch(tasks)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }
}

async function main(): Promise<void> {
  const codeToReview = `
function processUserData(data: any) {
  const result = eval(data.expression)

  const allUsers = []
  for (let i = 0; i < 1000000; i++) {
    allUsers.push(fetch('/api/user/' + i))
  }

  let output = ''
  for (const user of allUsers) {
    output = output + JSON.stringify(user) + '\\n'
  }

  return result + output
}
  `.trim()

  const answer = await orchestrate(
    `请对以下 TypeScript 代码进行全面审查，涵盖安全性、性能和代码质量三个维度：\n\n\`\`\`ts\n${codeToReview}\n\`\`\``,
  )

  console.log('\n========== 最终报告 ==========\n')
  console.log(answer)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
