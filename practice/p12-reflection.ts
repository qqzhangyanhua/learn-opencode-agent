import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

interface ReflectionResult {
  passed: boolean
  score: number
  feedback: string
  suggestions: string[]
}

function isReflectionResult(value: unknown): value is ReflectionResult {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>
  return (
    typeof obj['passed'] === 'boolean' &&
    typeof obj['score'] === 'number' &&
    typeof obj['feedback'] === 'string' &&
    Array.isArray(obj['suggestions']) &&
    (obj['suggestions'] as unknown[]).every((item) => typeof item === 'string')
  )
}

class Generator {
  constructor(private readonly model = 'gpt-4o') {}

  async generate(task: string, previousFeedback?: ReflectionResult): Promise<string> {
    const systemPrompt = `你是一位专业的技术写作者，擅长写清晰、有吸引力的技术内容。
直接完成任务，不需要解释你的写作思路。`

    let userPrompt = task
    if (previousFeedback) {
      userPrompt = `${task}

上一版本的评审反馈（请据此改进）：
- 总体评价：${previousFeedback.feedback}
- 具体改进建议：
${previousFeedback.suggestions.map((suggestion, index) => `  ${index + 1}. ${suggestion}`).join('\n')}

请针对以上具体问题进行改进，同时保留上一版本做得好的部分。`
    }

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    return response.choices[0].message.content ?? ''
  }
}

class Critic {
  constructor(private readonly model = 'gpt-4o') {}

  async evaluate(task: string, output: string): Promise<ReflectionResult> {
    const systemPrompt = `你是一位严格的技术内容评审专家。你的职责是客观评估内容质量，给出可执行的改进建议。

评审时请严格按照以下标准：
- 是否准确完成了任务要求
- 内容是否有吸引力，开头是否能抓住读者
- 是否包含具体的代码示例（如果任务要求）
- 字数是否符合要求
- 技术准确性

你必须返回严格的 JSON 格式（不要包含其他文字）：
{
  "passed": true 或 false,
  "score": 1-10 的整数,
  "feedback": "总体评价，1-2句话",
  "suggestions": ["具体改进建议1", "具体改进建议2"]
}

评分标准：
- 1-4：有明显问题，未达到任务要求
- 5-7：基本完成，但有改进空间
- 8-10：质量较高，达到或超出预期
passed 为 true 的条件：score >= 8`

    const userPrompt = `任务要求：
${task}

待评审的内容：
${output}

请严格按 JSON 格式输出评审结果。`

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const responseText = (response.choices[0].message.content ?? '').trim()

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn(`[Critic] JSON 提取失败，原始输出：\n${responseText}`)
      return {
        passed: false,
        score: 0,
        feedback: 'Critic 输出格式错误，无法解析评审结果',
        suggestions: ['检查 Critic 的 system prompt 是否正确约束了输出格式'],
      }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      console.warn(`[Critic] JSON 解析失败：${jsonMatch[0]}`)
      return {
        passed: false,
        score: 0,
        feedback: 'Critic 返回了无效的 JSON',
        suggestions: ['检查模型输出中的 JSON 格式'],
      }
    }

    if (!isReflectionResult(parsed)) {
      console.warn('[Critic] 类型校验失败，解析结果：', parsed)
      return {
        passed: false,
        score: 0,
        feedback: 'Critic 返回的 JSON 字段不完整',
        suggestions: ['确保 passed、score、feedback、suggestions 字段都存在'],
      }
    }

    return parsed
  }
}

class ReflectionAgent {
  private readonly generator = new Generator()
  private readonly critic = new Critic()

  async run(task: string, maxIterations = 3): Promise<string> {
    console.log(`任务: ${task}\n`)

    let lastOutput = ''
    let lastFeedback: ReflectionResult | undefined

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      console.log(`[第${iteration}轮]`)

      lastOutput = await this.generator.generate(task, lastFeedback)

      const preview = lastOutput.replace(/\n/g, ' ').slice(0, 80)
      console.log(`生成: ${preview}${lastOutput.length > 80 ? '...' : ''}`)

      lastFeedback = await this.critic.evaluate(task, lastOutput)

      console.log(`评审: 分数 ${lastFeedback.score}/10 | ${lastFeedback.passed ? '通过' : '未通过'}`)
      console.log(`反馈: ${lastFeedback.feedback}`)

      if (lastFeedback.suggestions.length > 0) {
        console.log(`建议: ${lastFeedback.suggestions.join(' | ')}`)
      }

      console.log('')

      if (lastFeedback.passed) {
        console.log(`已通过评审（分数 ${lastFeedback.score} >= 8），停止迭代。\n`)
        break
      }

      if (iteration === maxIterations) {
        console.log(`已达到最大迭代次数 (${maxIterations})，停止迭代。\n`)
      }
    }

    console.log('最终输出:')
    console.log('─'.repeat(50))
    console.log(lastOutput)
    console.log('─'.repeat(50))

    return lastOutput
  }
}

async function main(): Promise<void> {
  const agent = new ReflectionAgent()
  await agent.run(
    '写一篇关于 TypeScript 泛型的技术文章开头段落（要求：吸引人、有代码示例、100字以内）',
    3,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
