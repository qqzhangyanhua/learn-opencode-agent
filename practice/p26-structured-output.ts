import { z } from 'zod'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const model = process.env.OPENAI_MODEL ?? 'gpt-4o'

const IssueSchema = z.object({
  severity: z.enum(['critical', 'warning', 'suggestion']),
  message: z.string(),
  fix: z.string(),
  line: z.number().optional(),
})

const ReviewSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string(),
  issues: z.array(IssueSchema),
  approvable: z.boolean(),
})

type Review = z.infer<typeof ReviewSchema>

async function reviewCode(code: string): Promise<Review | null> {
  const completion = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: 'system',
        content: '你是代码审查专家，找出代码问题并给出评分，以 JSON 格式输出。',
      },
      {
        role: 'user',
        content: `请审查以下代码：\n\n\`\`\`typescript\n${code}\n\`\`\``,
      },
    ],
    response_format: zodResponseFormat(ReviewSchema, 'review'),
  })

  const message = completion.choices[0]?.message

  if (!message) return null
  if (message.refusal) {
    console.error('模型拒绝了请求：', message.refusal)
    return null
  }

  return message.parsed
}

function printReview(review: Review): void {
  const status = review.approvable ? '[通过]' : '[需修改]'
  console.log(`\n${status} 评分：${review.score}/10`)
  console.log(`评价：${review.summary}\n`)

  for (const group of ['critical', 'warning', 'suggestion'] as const) {
    const items = review.issues.filter((issue) => issue.severity === group)
    if (items.length === 0) continue

    console.log(`[${group.toUpperCase()}]`)
    for (const issue of items) {
      const loc = issue.line ? ` (第${issue.line}行)` : ''
      console.log(`  - ${issue.message}${loc}`)
      console.log(`    改进：${issue.fix}`)
    }
  }
}

async function main(): Promise<void> {
  const code = `
async function getUserData(userId: string) {
  const query = \`SELECT * FROM users WHERE id = \${userId}\`
  const result = await db.query(query)
  return result[0]
}

async function processPayment(amount: any, currency: any) {
  const response = await fetch('/api/pay', {
    method: 'POST',
    body: JSON.stringify({ amount, currency })
  })
  return response.json()
}`

  const review = await reviewCode(code)
  if (review) printReview(review)
}

main().catch(console.error)
