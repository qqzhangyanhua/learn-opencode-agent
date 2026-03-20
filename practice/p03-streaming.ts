import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '查询指定城市的当前天气',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如"北京"、"上海"',
          },
        },
        required: ['city'],
      },
    },
  },
]

function getWeather(city: string): string {
  const data: Record<string, string> = {
    北京: '晴，22°C，东南风 3 级',
    上海: '多云，18°C，东风 2 级',
    广州: '小雨，26°C，南风 2 级',
  }
  return data[city] ?? `暂无 ${city} 的天气数据`
}

function executeTool(name: string, input: Record<string, string>): string {
  if (name === 'get_weather') {
    return getWeather(input.city)
  }
  return `Unknown tool: ${name}`
}

async function runStreamingAgent(userMessage: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  while (true) {
    const stream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      tools,
      messages,
      stream: true,
    })

    let textContent = ''
    const toolCalls: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }> = []
    let currentToolCall: {
      index: number
      id: string
      name: string
      arguments: string
    } | null = null
    let finishReason: string | null = null

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      if (delta?.content) {
        process.stdout.write(delta.content)
        textContent += delta.content
      }

      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          if (toolCallDelta.index !== undefined) {
            if (
              currentToolCall === null ||
              currentToolCall.index !== toolCallDelta.index
            ) {
              if (currentToolCall) {
                toolCalls.push({
                  id: currentToolCall.id,
                  type: 'function',
                  function: {
                    name: currentToolCall.name,
                    arguments: currentToolCall.arguments,
                  },
                })
              }

              currentToolCall = {
                index: toolCallDelta.index,
                id: toolCallDelta.id ?? '',
                name: toolCallDelta.function?.name ?? '',
                arguments: toolCallDelta.function?.arguments ?? '',
              }

              if (toolCallDelta.function?.name) {
                process.stdout.write(`\n[调用工具: ${toolCallDelta.function.name} `)
              }
            } else {
              if (toolCallDelta.function?.arguments) {
                currentToolCall.arguments += toolCallDelta.function.arguments
              }
            }
          }
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason
      }
    }

    if (currentToolCall) {
      toolCalls.push({
        id: currentToolCall.id,
        type: 'function',
        function: {
          name: currentToolCall.name,
          arguments: currentToolCall.arguments,
        },
      })
      process.stdout.write(`${currentToolCall.arguments}]\n`)
    }

    const assistantMessage: OpenAI.ChatCompletionAssistantMessageParam = {
      role: 'assistant',
      content: textContent || null,
    }

    if (toolCalls.length > 0) {
      assistantMessage.tool_calls = toolCalls
    }

    messages.push(assistantMessage)

    if (finishReason === 'stop') {
      process.stdout.write('\n')
      return
    }

    if (finishReason !== 'tool_calls') {
      process.stdout.write(`\n[未处理的 finish_reason: ${finishReason ?? 'null'}]\n`)
      return
    }

    for (const toolCall of toolCalls) {
      let parsedInput: Record<string, string> = {}
      try {
        parsedInput = JSON.parse(toolCall.function.arguments) as Record<
          string,
          string
        >
      } catch {
        parsedInput = {}
      }

      const result = executeTool(toolCall.function.name, parsedInput)

      console.log(`[工具结果: ${result}]`)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }
}

process.stdout.write('> 北京天气怎么样，适合跑步吗？\n')
runStreamingAgent('北京天气怎么样，适合跑步吗？').catch((error) => {
  console.error(error)
  process.exitCode = 1
})
