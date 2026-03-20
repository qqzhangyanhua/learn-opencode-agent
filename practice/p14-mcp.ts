import OpenAI from 'openai'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function hasTextContent(
  value: unknown,
): value is { content: Array<{ type: string; text?: string }> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>)['content'])
  )
}

async function connectMcpServer(mcpClient: Client): Promise<OpenAI.ChatCompletionTool[]> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(__dirname, 'p14-mcp-server.ts')],
    cwd: __dirname,
  })

  await mcpClient.connect(transport)
  console.log('[MCP Server 已启动]')

  const { tools } = await mcpClient.listTools()
  const toolNames = tools.map((tool) => tool.name).join(', ')
  console.log(`[已发现工具: ${toolNames}]\n`)

  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description ?? '',
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  }))
}

async function callToolViaMcp(
  mcpClient: Client,
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  console.log(`Tool call via MCP: ${toolName}(${JSON.stringify(toolInput)})`)

  const result = await mcpClient.callTool({
    name: toolName,
    arguments: toolInput,
  })

  if (!hasTextContent(result)) {
    return '工具返回了非标准 content 结果'
  }

  const text = result.content
    .filter((item): item is { type: 'text'; text: string } => item.type === 'text')
    .map((item) => item.text)
    .join('')

  console.log(`Tool result: ${text}\n`)
  return text
}

async function runAgent(
  mcpClient: Client,
  tools: OpenAI.ChatCompletionTool[],
  userMessage: string,
): Promise<void> {
  console.log(`用户: ${userMessage}\n`)

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  while (true) {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      tools,
      messages,
    })

    const message = response.choices[0].message
    const toolCalls = message.tool_calls ?? []

    if (response.choices[0].finish_reason === 'stop' || toolCalls.length === 0) {
      console.log(`Agent: ${message.content ?? ''}`)
      break
    }

    messages.push(message)

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') continue

      const toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
      const resultText = await callToolViaMcp(mcpClient, toolCall.function.name, toolInput)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: resultText,
      })
    }
  }
}

async function main(): Promise<void> {
  const mcpClient = new Client(
    { name: 'p14-demo-client', version: '1.0.0' },
    { capabilities: {} },
  )

  const tools = await connectMcpServer(mcpClient)
  await runAgent(mcpClient, tools, '现在几点了？再给我一个 1-100 的随机数')
  await mcpClient.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
