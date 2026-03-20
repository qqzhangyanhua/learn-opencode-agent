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

async function runAgent(userMessage: string): Promise<void> {
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
    messages.push(message)

    if (message.content) {
      console.log(`Agent: ${message.content}`)
    }

    if (response.choices[0].finish_reason === 'stop') {
      return
    }

    if (response.choices[0].finish_reason !== 'tool_calls' || !message.tool_calls) {
      console.log(`未处理的 finish_reason: ${response.choices[0].finish_reason}`)
      return
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue

      console.log(`Tool call: ${toolCall.function.name}(${toolCall.function.arguments})`)

      let result: string
      if (toolCall.function.name === 'get_weather') {
        const input = JSON.parse(toolCall.function.arguments) as { city?: string }
        result = getWeather(input.city ?? '')
      } else {
        result = `Unknown tool: ${toolCall.function.name}`
      }

      console.log(`Tool result: ${result}`)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }
}

runAgent('北京今天天气怎么样？适合出去跑步吗？').catch((error) => {
  console.error(error)
  process.exitCode = 1
})
