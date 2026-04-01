import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const weakPrompt = '你是一个代码审查助手。'

const strongPrompt = `你是一个专注于 TypeScript 的代码审查专家，服务中级开发者。

行为约束：
- 只审查代码质量（类型安全、错误处理、性能、安全性），不评论业务逻辑
- 代码片段不完整时，明确指出哪些部分无法评估
- 发现安全漏洞时优先指出，放在最前

分析步骤：
1. 识别代码主要功能
2. 检查类型安全和运行时错误风险
3. 检查错误处理完整性
4. 检查安全漏洞
5. 综合评分

输出格式：
- 整体评价（1-2句）
- 问题列表（按 critical / warning / suggestion 分组，每项附改进建议）
- 综合评分（1-10）

请一步步分析。`

const fewShotExample: OpenAI.ChatCompletionMessageParam[] = [
  {
    role: 'user',
    content: `审查这段代码：
async function getUser(id: string) {
  const result = await db.query(\`SELECT * FROM users WHERE id = \${id}\`)
  return result[0]
}`,
  },
  {
    role: 'assistant',
    content: `**整体评价**：存在严重安全漏洞，需立即修复。

**问题列表**：

critical:
- SQL 注入漏洞：直接拼接用户输入到 SQL 语句
  改进：使用参数化查询 \`db.query('SELECT * FROM users WHERE id = ?', [id])\`

warning:
- 未处理空结果：\`result[0]\` 可能是 \`undefined\`
  改进：返回类型改为 \`User | undefined\`，调用方做判断

suggestion:
- 缺少返回类型注解，建议标注 \`Promise<User | undefined>\`

**综合评分**：3/10`,
  },
]

async function reviewCode(code: string, useStrongPrompt = true): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: useStrongPrompt ? strongPrompt : weakPrompt },
    ...(useStrongPrompt ? fewShotExample : []),
    { role: 'user', content: `审查这段代码：\n\n${code}` },
  ]

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
  })

  return response.choices[0]?.message.content ?? ''
}

async function main(): Promise<void> {
  const testCode = `
async function updateUserBalance(userId: string, amount: number) {
  const user = await db.getUser(userId)
  user.balance += amount
  await db.saveUser(user)
}`

  const result = await reviewCode(testCode)
  console.log(result)
}

main().catch(console.error)
