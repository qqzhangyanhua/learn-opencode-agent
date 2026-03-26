---
title: 补充：结构化输出
description: JSON Mode 与 Zod Schema——让 Agent 输出你能可靠解析的数据，彻底告别正则提取
---

<PracticeProjectGuide project-id="practice-p26-structured-output" />

## 背景与目标

P1 的 Agent 输出自由文本，你想从里面提取结构化数据：

```ts
const text = response.choices[0].message.content ?? ''

// 尝试提取评分
const score = parseInt(text.match(/得分[：:]\s*(\d+)/)?.[1] ?? '0')
// 模型说"Score: 8"        → 0（正则不匹配）
// 模型说"评分约为8分"      → 0（又不匹配）
// 模型说"综合得分：**8**"  → 0（还是不匹配）
// 模型说"评分：8"         → 8（偶尔成功）
```

同一个问题，模型每次措辞略有不同，正则就覆盖不了所有情况。这不是模型的问题——自由文本本来就不适合程序解析。

**本章目标**：

```
JSON Mode      →  强制输出合法 JSON，成本低，但不保证字段类型
Zod + parse()  →  Schema 约束 + 自动类型推导，推荐方案
```

## 核心概念

### JSON Mode 的能力边界

开启 `response_format: { type: 'json_object' }` 后，模型只会输出合法的 JSON 字符串——不再有多余的解释文字。但它有一个关键限制：

```
保证：输出是合法 JSON（JSON.parse 不会报错）
不保证：字段名、字段类型、字段是否存在
```

模型可能输出 `{ "score": "8" }` 而不是 `{ "score": 8 }`，或者漏掉你期望的字段。`JSON.parse()` 返回 `any`，TypeScript 的类型保护全部失效。

### Zod + parse() 的工作方式

`client.beta.chat.completions.parse()` 结合 Zod Schema，一步完成调用 + 解析 + 验证：

<SchemaConstrainedOutputDemo />

```
你定义 Zod Schema → SDK 把 Schema 转成 JSON Schema 传给模型
→ 模型按 Schema 填充 → SDK 用 Zod 验证并推导 TypeScript 类型
→ message.parsed 的类型完全符合你的 Schema
```

整个链路没有 `any`，没有手写类型断言，没有 `JSON.parse()`。

### message.refusal

当请求触发模型安全策略时，`message.refusal` 有值，`message.parsed` 为 null。必须先检查 `refusal`，再使用 `parsed`：

```ts
if (message.refusal) {
  // 处理拒绝情况
}
// 到这里 message.parsed 一定不为 null（TypeScript 会推断）
const result = message.parsed
```

## 动手实现

### 第一步：安装依赖并定义 Schema

```bash
bun add zod
```

```ts
// p26-structured-output.ts
import { z } from 'zod'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'

const client = new OpenAI()
const model = process.env.OPENAI_MODEL ?? 'gpt-4o'

// 定义代码审查结果的 Schema
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

// 从 Schema 推导 TypeScript 类型，无需手写 interface
type Review = z.infer<typeof ReviewSchema>
```

### 第二步：用 parse() API 调用

```ts
async function reviewCode(code: string): Promise<Review | null> {
  const completion = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: 'system',
        content: '你是代码审查专家，找出代码问题并给出评分，以 JSON 格式输出。'
      },
      {
        role: 'user',
        content: `请审查以下代码：\n\n\`\`\`typescript\n${code}\n\`\`\``
      }
    ],
    response_format: zodResponseFormat(ReviewSchema, 'review'),
  })

  const message = completion.choices[0].message

  if (message.refusal) {
    console.error('模型拒绝了请求：', message.refusal)
    return null
  }

  // message.parsed 的类型是 Review，不是 any
  return message.parsed
}
```

### 第三步：使用结果，完全类型安全

```ts
function printReview(review: Review): void {
  const status = review.approvable ? '[通过]' : '[需修改]'
  console.log(`\n${status} 评分：${review.score}/10`)
  console.log(`评价：${review.summary}\n`)

  // review.issues 的类型是 Array<{ severity: 'critical'|'warning'|'suggestion', ... }>
  for (const group of ['critical', 'warning', 'suggestion'] as const) {
    const items = review.issues.filter(i => i.severity === group)
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
```

### 运行结果

```
[需修改] 评分：3/10
评价：代码存在严重安全漏洞和类型问题，需要立即修复再合并。

[CRITICAL]
  - SQL 注入漏洞：直接拼接用户输入到 SQL 字符串 (第3行)
    改进：使用参数化查询 db.query('SELECT * FROM users WHERE id = ?', [userId])

[WARNING]
  - processPayment 参数类型为 any，丢失类型保护
    改进：定义 type PaymentParams = { amount: number; currency: string }
  - fetch 响应未检查 ok 状态，错误响应会被当成成功处理
    改进：if (!response.ok) throw new Error(await response.text())

[SUGGESTION]
  - getUserData 返回类型未标注，建议加 Promise<User | undefined>
```

所有字段（`review.score`、`review.approvable`、每个 issue 的 `severity`）都是强类型，可以直接存数据库、渲染 UI 或传给下一个 Agent。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `response_format: { type: 'json_object' }` | JSON Mode：保证合法 JSON，不保证字段类型 |
| `zodResponseFormat(Schema, name)` | 把 Zod Schema 转为 OpenAI 结构化输出格式 |
| `client.beta.chat.completions.parse()` | 调用并自动解析，`message.parsed` 有完整类型 |
| `message.refusal` | 模型拒绝时有值，此时 `parsed` 为 null，必须先检查 |
| `z.infer<typeof Schema>` | 从 Schema 推导 TypeScript 类型，无需手写 interface |
| `.optional()` | 标记模型可能省略的字段，使用时需处理 `undefined` |

## 常见问题

**Q: `parse()` API 还在 beta，稳定吗？**

OpenAI 的结构化输出功能已大量生产使用，`beta` 只是 SDK 版本管理约定。放心用。

**Q: Zod Schema 很复杂时，模型能填对所有字段吗？**

通常可以。字段名要语义清晰，`z.enum()` 的选项要有区分度。超过 20 个必填字段时准确率会下降，建议拆分为多次调用，每次只填一个子结构。

**Q: 用了结构化输出还需要 try/catch 吗？**

需要。结构化输出解决"格式"问题，不解决"调用失败"问题。API 本身可能抛出网络错误，结合 P4 的重试策略使用效果最好。

## 小结与延伸

结构化输出是 Agent 从"给人看"到"给程序处理"的关键一步。一旦输出是强类型的，你就能把 Agent 的判断结果接入 CI 流水线、存数据库、渲染仪表盘——而不是让人工去读文本再手动记录。

接下来：

- **P11**：Planning——在多步规划场景里，用结构化输出确保每步的任务描述能精确传递给执行者
- **P22**：完整项目——Code Review Agent 把结构化输出接入 CI，让模型判断能阻断 PR 合并

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p26-structured-output" />
<PracticeProjectActionPanel project-id="practice-p26-structured-output" />
