import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const RETRY_CONFIG = {
  maxAttempts: 4,
  baseDelay: 1000,
  jitter: 500,
  maxDelay: 30_000,
} as const

const MAX_ITERATIONS = 10
const RETRYABLE_STATUS = new Set([429, 500, 503])

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: '查询数据库中的记录。table 支持 users 和 orders，id 为记录编号',
      parameters: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: '表名：users 或 orders',
          },
          id: {
            type: 'number',
            description: '记录 ID',
          },
        },
        required: ['table', 'id'],
      },
    },
  },
]

type ToolInput = { table: string; id: number }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = RETRY_CONFIG.maxAttempts,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!(error instanceof OpenAI.APIError)) {
        throw error
      }

      if (!RETRYABLE_STATUS.has(error.status ?? 0)) {
        throw error
      }

      if (attempt === maxAttempts - 1) {
        break
      }

      const exponential = RETRY_CONFIG.baseDelay * 2 ** attempt
      const jitter = Math.random() * RETRY_CONFIG.jitter
      const delay = Math.min(exponential + jitter, RETRY_CONFIG.maxDelay)

      console.log(
        `[retry] attempt ${attempt + 1}/${maxAttempts} failed` +
          ` (${error.status} ${error.type ?? 'unknown'}).` +
          ` Waiting ${Math.round(delay)}ms...`,
      )

      await sleep(delay)
    }
  }

  throw lastError
}

function queryDatabase(table: string, id: number): string {
  if (Math.random() < 0.3) {
    throw new Error(`Database connection timeout: failed to query ${table}#${id}`)
  }

  const records: Record<string, Record<number, string>> = {
    users: {
      1: 'Alice (alice@example.com)',
      2: 'Bob (bob@example.com)',
    },
    orders: {
      101: 'Order #101: 3x TypeScript Book, $89.00',
      102: 'Order #102: 1x Mechanical Keyboard, $159.00',
    },
  }

  return records[table]?.[id] ?? `No record found in ${table} with id=${id}`
}

async function runAgent(userMessage: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations += 1
    console.log(`\n[loop] iteration ${iterations}/${MAX_ITERATIONS}`)

    const response = await withRetry(() =>
      client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        tools,
        messages,
      }),
    )

    const message = response.choices[0].message
    messages.push(message)

    if (message.content) {
      console.log(`\nAgent: ${message.content}`)
    }

    if (response.choices[0].finish_reason === 'stop') {
      return
    }

    if (response.choices[0].finish_reason !== 'tool_calls' || !message.tool_calls) {
      console.log(`[warn] unexpected finish_reason: ${response.choices[0].finish_reason}`)
      return
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue

      const input = JSON.parse(toolCall.function.arguments) as ToolInput
      console.log(`[tool] ${toolCall.function.name}(table="${input.table}", id=${input.id})`)

      let content: string
      try {
        content = queryDatabase(input.table, input.id)
        console.log(`[tool] success: ${content}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        content = `Error: ${message}`
        console.log(`[tool] failed: ${message}`)
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content,
      })
    }
  }

  console.log(`[warn] Agent reached maxIterations (${MAX_ITERATIONS}), terminating.`)
}

runAgent('帮我查一下用户 ID 为 1 的信息，以及订单 101 的详情').catch((error) => {
  console.error(error)
  process.exitCode = 1
})
