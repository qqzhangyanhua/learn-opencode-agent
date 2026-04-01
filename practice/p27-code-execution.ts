import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import OpenAI from 'openai'

const execAsync = promisify(exec)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})
const model = process.env.OPENAI_MODEL ?? 'gpt-4o'

interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

interface CodeInput {
  explanation: string
  code: string
}

async function executeCode(code: string, timeoutMs = 10_000): Promise<ExecutionResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sandbox-'))
  const filePath = path.join(tmpDir, 'script.js')

  try {
    await fs.writeFile(filePath, code, 'utf-8')
    const { stdout, stderr } = await execAsync(`node "${filePath}"`, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      cwd: tmpDir,
      env: {
        ...process.env,
        HOME: tmpDir,
      },
    })

    return { stdout, stderr, exitCode: 0, timedOut: false }
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string
      stderr?: string
      code?: number | string
      killed?: boolean
    }

    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? String(error),
      exitCode: typeof err.code === 'number' ? err.code : 1,
      timedOut: err.killed === true,
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

function formatResult(result: ExecutionResult): string {
  if (result.timedOut) {
    return '执行超时（超过10秒）。请检查是否有死循环。'
  }

  const parts: string[] = []
  if (result.stdout.trim()) parts.push(`输出：\n${result.stdout.trim()}`)
  if (result.stderr.trim()) parts.push(`错误：\n${result.stderr.trim()}`)
  if (result.exitCode !== 0) parts.push(`退出码：${result.exitCode}`)
  return parts.join('\n\n') || '执行成功，无输出。'
}

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'execute_code',
      description: `在 Node.js 沙箱中执行 JavaScript 代码，返回 stdout 输出。
适合数据处理、计算和分析。限制：无网络访问，10秒超时，1MB输出上限。
如果代码出错，分析错误信息后修正重试。`,
      parameters: {
        type: 'object',
        properties: {
          explanation: { type: 'string', description: '这段代码做什么（一句话）' },
          code: { type: 'string', description: '要执行的 JavaScript 代码，用 console.log 输出结果' },
        },
        required: ['explanation', 'code'],
      },
    },
  },
]

const systemPrompt = `你是数据分析助手，用 JavaScript 代码处理数据和计算。
遇到数据处理问题时，使用 execute_code 工具生成并运行代码。
代码出错时，仔细阅读错误信息，修正后重试，最多重试3次。`

async function runCodeAgent(query: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ]

  for (let i = 0; i < 8; i += 1) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
    })

    const message = response.choices[0]?.message
    if (!message) return

    messages.push(message)

    if (response.choices[0]?.finish_reason === 'stop') {
      console.log(`\nAgent: ${message.content}`)
      return
    }

    for (const toolCall of message.tool_calls ?? []) {
      if (toolCall.function.name !== 'execute_code') continue

      const input = JSON.parse(toolCall.function.arguments) as CodeInput
      console.log(`\n[执行] ${input.explanation}`)

      const result = await executeCode(input.code)
      const formatted = formatResult(result)
      console.log(`[结果] ${formatted.slice(0, 300)}`)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: formatted,
      })
    }
  }
}

async function main(): Promise<void> {
  await runCodeAgent(`
月度销售数据（万元）：
1月:45, 2月:38, 3月:52, 4月:61, 5月:58, 6月:73,
7月:69, 8月:82, 9月:78, 10月:91, 11月:105, 12月:118

请分析：全年总额和月均、增速最快的月份、上下半年对比。
`)
}

main().catch(console.error)
