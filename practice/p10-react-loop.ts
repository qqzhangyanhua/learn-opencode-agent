import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const REACT_SYSTEM_PROMPT = `你是一个使用 ReAct（Reasoning and Acting）框架的 AI 助手。

在每次回答时，你必须严格遵守以下格式：

当需要使用工具时：
Thought: [你的推理过程，解释为什么需要这个工具]
Action: [工具名称]
Action Input: [JSON 格式的参数，必须是合法 JSON]

当你看到工具结果（以 Observation: 开头）后，继续：
Thought: [基于观察结果的再推理]
Action: [下一个工具] 或
Final Answer: [当你有足够信息时，给出最终回答]

规则：
1. 每次只能执行一个 Action
2. Action Input 必须是合法的 JSON 对象
3. 有足够信息后必须输出 Final Answer 结束
4. 不要在 Thought 外增加额外解释文字`

type ToolFunction = (input: Record<string, string>) => string

function get_weather(input: Record<string, string>): string {
  const data: Record<string, string> = {
    北京: '晴，22°C，东南风 3 级，空气质量良',
    上海: '小雨，18°C，东风 4 级，空气质量优',
    广州: '多云，28°C，南风 2 级，空气质量良',
    深圳: '阵雨，27°C，东南风 3 级，空气质量优',
    成都: '阴，16°C，静风，空气质量中',
  }

  const city = input['city'] ?? ''
  return data[city] ?? `暂无 ${city} 的天气数据`
}

function search_web(input: Record<string, string>): string {
  const query = input['query'] ?? ''
  const results: Record<string, string> = {
    '户外运动 最佳温度': '户外运动最佳温度：跑步 15-22°C，骑行 10-25°C，登山 8-20°C',
    '小雨 跑步': '小雨天气跑步：轻微小雨（降水量<2mm/h）可以跑步，建议穿防水外套',
    '空气质量 运动': '空气质量建议：优良可正常运动，中等减少强度，差避免户外运动',
  }

  for (const [key, value] of Object.entries(results)) {
    if (key.split(' ').some((part) => query.includes(part))) {
      return value
    }
  }

  return `搜索"${query}"：未找到相关结果`
}

function calculate(input: Record<string, string>): string {
  const expression = input['expression'] ?? ''

  try {
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return '只支持基本数学运算（+ - * /）'
    }

    const result = Function(`"use strict"; return (${expression})`)() as number
    return `计算结果：${expression} = ${result}`
  } catch {
    return `计算失败：${expression} 不是合法的数学表达式`
  }
}

const toolRegistry: Record<string, ToolFunction> = {
  get_weather,
  search_web,
  calculate,
}

const TOOLS_DESCRIPTION = `
可用工具：

1. get_weather
   描述：查询指定城市的当前天气
   参数：{"city": "城市名称"}

2. search_web
   描述：搜索网页获取信息
   参数：{"query": "搜索关键词"}

3. calculate
   描述：执行数学计算
   参数：{"expression": "数学表达式，如 \\"(22 + 18) / 2\\""}
`

type ReActOutput =
  | {
      type: 'action'
      thought: string
      action: string
      actionInput: Record<string, string>
    }
  | {
      type: 'final'
      thought: string
      answer: string
    }
  | {
      type: 'unknown'
      raw: string
    }

function parseReActOutput(text: string): ReActOutput {
  const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=\nAction:|\nFinal Answer:|$)/)
  const actionMatch = text.match(/Action:\s*(.+)/)
  const actionInputMatch = text.match(/Action Input:\s*(\{[\s\S]*?\})/)
  const finalAnswerMatch = text.match(/Final Answer:\s*([\s\S]+)/)
  const thought = thoughtMatch?.[1]?.trim() ?? ''

  if (finalAnswerMatch) {
    return {
      type: 'final',
      thought,
      answer: finalAnswerMatch[1].trim(),
    }
  }

  if (actionMatch && actionInputMatch) {
    let actionInput: Record<string, string> = {}

    try {
      const parsed = JSON.parse(actionInputMatch[1]) as unknown
      if (typeof parsed === 'object' && parsed !== null) {
        actionInput = parsed as Record<string, string>
      }
    } catch {
      console.warn(`[ReAct] Action Input 解析失败: ${actionInputMatch[1]}`)
    }

    return {
      type: 'action',
      thought,
      action: actionMatch[1].trim(),
      actionInput,
    }
  }

  return { type: 'unknown', raw: text }
}

class ReActAgent {
  constructor(private readonly maxSteps = 10) {}

  async run(userInput: string): Promise<void> {
    console.log(`用户: ${userInput}\n`)

    const systemPrompt = `${REACT_SYSTEM_PROMPT}\n\n${TOOLS_DESCRIPTION}`
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ]

    for (let step = 0; step < this.maxSteps; step += 1) {
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages,
      })

      const responseText = response.choices[0].message.content ?? ''

      const parsed = parseReActOutput(responseText)

      if (parsed.type === 'final') {
        if (parsed.thought) {
          console.log(`Thought: ${parsed.thought}`)
        }
        console.log(`\nFinal Answer: ${parsed.answer}`)
        return
      }

      if (parsed.type === 'action') {
        console.log(`Thought: ${parsed.thought}`)
        console.log(`Action: ${parsed.action}`)
        console.log(`Action Input: ${JSON.stringify(parsed.actionInput)}`)

        const toolFn = toolRegistry[parsed.action]
        const observation = toolFn
          ? toolFn(parsed.actionInput)
          : `错误：未知工具 "${parsed.action}"，可用工具：${Object.keys(toolRegistry).join(', ')}`

        console.log(`Observation: ${observation}\n`)

        messages.push({ role: 'assistant', content: responseText })
        messages.push({ role: 'user', content: `Observation: ${observation}` })
        continue
      }

      console.warn(`[ReAct] 格式解析失败，原始输出：\n${parsed.raw}`)
      console.log(`\nFinal Answer: ${parsed.raw}`)
      return
    }

    console.log(`\n[ReAct] 已达到最大步数限制 (${this.maxSteps})，停止执行。`)
  }
}

async function main(): Promise<void> {
  const agent = new ReActAgent()
  await agent.run('北京和上海哪个城市今天更适合户外跑步？')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
