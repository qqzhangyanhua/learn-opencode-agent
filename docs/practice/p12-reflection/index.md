---
title: P12：Reflection 模式
description: 让 Agent 生成初稿后用评审者角色评估质量，根据反馈迭代修改，直到满足标准
---

<PracticeProjectGuide project-id="practice-p12-reflection" />

<ReflectionCycleDemo />

## 背景与目标

P10 的 ReAct Agent 解决了"如何让模型在行动前显式推理"的问题。但还有另一个常见困境：**模型第一次输出的结果不够好，你知道有问题，但不知道哪里有问题，也不知道怎么改**。

直接告诉模型"请改进你的回答"往往没用，因为你没有给出具体的改进方向。更糟的是，模型有时会把一个好的版本改坏，因为它不知道哪些地方已经做对了。

2023 年，Noah Shinn 等人在论文 *Reflexion: Language Agents with Verbal Reinforcement Learning* 中提出了 Reflection 模式：**让 Agent 在生成输出后，用一个独立的"反思"步骤评估自己的输出质量，产生具体的改进建议，然后据此重新生成**。

这个模式的核心洞察是：**LLM 评估一段文本的能力，往往优于它第一次生成这段文本的能力**。就像人类写作——第一稿通常比较粗糙，但你在修改时能发现很多问题，因为"读者视角"比"写作视角"更客观。

**本章目标**：

1. 理解 Generator / Critic 两个角色的分工
2. 实现 `ReflectionAgent`，完成"生成 → 评审 → 改进"的迭代循环
3. 理解结构化评审反馈的设计方法

## 核心概念

### 为什么第一次输出不够好

LLM 在生成文本时，它的注意力分散在多个维度：理解指令、组织结构、措辞表达、事实准确性、风格匹配……同时兼顾这些往往做不到每项都优秀。

而当你让它"评估一段文本"时，它只需要聚焦在评估维度上，认知负担小很多。这就是为什么同一个模型可以同时扮演 Generator 和 Critic——两个任务的认知模式不同，分开执行比合并执行更可靠。

### Generator 和 Critic 的角色设计

**Generator（生成者）**：

- 接收原始任务描述
- 如果有来自上一轮的评审反馈，将其纳入 prompt 中
- 产生新版本的输出

Generator 的 system prompt 要保持简洁，核心是"完成任务"，不要在里面加入自我评估的要求——那是 Critic 的职责。

**Critic（评审者）**：

- 接收原始任务描述（知道"目标是什么"）
- 接收 Generator 的最新输出（知道"实际输出是什么"）
- 按照明确的评审标准打分，给出具体改进建议
- 返回结构化的评审结果

Critic 的关键设计在于 **system prompt 的评审维度**。模糊的评审（"不够好，再改"）没有意义，有效的评审必须指出具体问题（"第二句话太抽象，需要加一个具体代码示例"）。

### 结构化评审反馈

让 Critic 返回 JSON 格式，而不是自由文本，有几个好处：

1. **可解析**：程序可以直接读取 `passed`、`score`、`suggestions` 字段，决定是否继续迭代
2. **可约束**：JSON schema 约束了评审的维度，避免 Critic 产生没有意义的"都很好"之类的废话
3. **可追踪**：每轮的评审结果形成完整的评审历史，便于调试

评审结果结构：

```ts
interface ReflectionResult {
  passed: boolean       // 是否通过评审（true 则停止迭代）
  score: number         // 1-10 分
  feedback: string      // 总体评价（1-2 句话）
  suggestions: string[] // 具体改进建议（每条针对一个明确问题）
}
```

### 迭代停止条件

Reflection 循环需要明确的停止条件，否则会无限迭代：

1. **质量满足**：`score >= 8`（Critic 认为输出已经足够好）
2. **轮次上限**：`maxIterations`（防止无限循环，即使 Critic 从未满意）

第二个条件是必须的。在极端情况下，Critic 的标准可能设置得太高，或者任务本身的质量瓶颈来自 prompt 或模型能力，而不是迭代次数。

### 自我反思 vs 外部评审

Reflection 模式有两种实现方式：

| 方式 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| 同一模型扮演两个角色 | 同一个 API，Generator 和 Critic 用不同 system prompt | 简单，成本低 | Critic 可能与 Generator 有相同的盲区 |
| 两个模型实例 | Generator 用一个模型，Critic 用另一个 | 视角更多样，盲区互补 | 成本翻倍，需要管理两套配置 |

本章使用**同一模型**扮演两个角色。即使是同一个模型，只要 system prompt 不同，它的评估视角就会不同——因为 prompt 决定了模型关注的维度。

## 动手实现

### 第一步：类型定义和初始化

```ts
// p12-reflection.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

// 评审结果结构
interface ReflectionResult {
  passed: boolean
  score: number
  feedback: string
  suggestions: string[]
}

// 类型守卫：验证 JSON 解析结果是否符合 ReflectionResult
function isReflectionResult(value: unknown): value is ReflectionResult {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['passed'] === 'boolean' &&
    typeof obj['score'] === 'number' &&
    typeof obj['feedback'] === 'string' &&
    Array.isArray(obj['suggestions']) &&
    (obj['suggestions'] as unknown[]).every(s => typeof s === 'string')
  )
}
```

### 第二步：Generator 类

```ts
class Generator {
  private model: string

  constructor(model = 'gpt-4o') {
    this.model = model
  }

  async generate(task: string, previousFeedback?: ReflectionResult): Promise<string> {
    const systemPrompt = `你是一位专业的技术写作者，擅长写清晰、有吸引力的技术内容。
直接完成任务，不需要解释你的写作思路。`

    // 如果有上一轮的评审反馈，将改进要求纳入 prompt
    let userPrompt = task
    if (previousFeedback) {
      userPrompt = `${task}

上一版本的评审反馈（请据此改进）：
- 总体评价：${previousFeedback.feedback}
- 具体改进建议：
${previousFeedback.suggestions.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

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
```

### 第三步：Critic 类

```ts
class Critic {
  private model: string

  constructor(model = 'gpt-4o') {
    this.model = model
  }

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

    // 提取 JSON（模型有时会在 JSON 前后加说明文字）
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // 解析失败时返回一个"不通过"的默认结果，让循环继续
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
      console.warn(`[Critic] 类型校验失败，解析结果：`, parsed)
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
```

### 第四步：ReflectionAgent 主循环

```ts
class ReflectionAgent {
  private generator: Generator
  private critic: Critic

  constructor() {
    this.generator = new Generator()
    this.critic = new Critic()
  }

  async run(task: string, maxIterations = 3): Promise<string> {
    console.log(`任务: ${task}\n`)

    let lastOutput = ''
    let lastFeedback: ReflectionResult | undefined

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      console.log(`[第${iteration}轮]`)

      // 生成阶段：有反馈则据此改进，否则生成初稿
      lastOutput = await this.generator.generate(task, lastFeedback)

      // 打印输出摘要（前80个字符）
      const preview = lastOutput.replace(/\n/g, ' ').slice(0, 80)
      console.log(`生成: ${preview}${lastOutput.length > 80 ? '...' : ''}`)

      // 评审阶段
      lastFeedback = await this.critic.evaluate(task, lastOutput)

      const status = lastFeedback.passed ? '通过' : '未通过'
      console.log(`评审: 分数 ${lastFeedback.score}/10 | ${status}`)
      console.log(`反馈: ${lastFeedback.feedback}`)

      if (lastFeedback.suggestions.length > 0) {
        console.log(`建议: ${lastFeedback.suggestions.join(' | ')}`)
      }

      console.log('')

      // 通过评审则停止迭代
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

// 运行演示
const agent = new ReflectionAgent()
await agent.run(
  '写一篇关于 TypeScript 泛型的技术文章开头段落（要求：吸引人、有代码示例、100字以内）',
  3
)
```

### 运行结果

```
任务: 写一篇关于 TypeScript 泛型的技术文章开头段落（要求：吸引人、有代码示例、100字以内）

[第1轮]
生成: 泛型是 TypeScript 的核心特性之一，它让你的代码在保持类型安全的同时获得灵活性。通过泛型，你可以...
评审: 分数 5/10 | 未通过
反馈: 内容基本正确，但缺少代码示例，开头不够吸引人，像教科书定义而非文章钩子
建议: 加入一个具体的泛型代码示例 | 用一个真实痛点或问题开头，而不是直接给定义

[第2轮]
生成: 你写过这样的代码吗？`function identity(arg: any): any { return arg }` — any 的问题是...
评审: 分数 8/10 | 通过
反馈: 开头用痛点问题抓住读者，代码示例清晰展示了泛型解决的具体问题，字数在要求内

已通过评审（分数 8 >= 8），停止迭代。

最终输出:
──────────────────────────────────────────────────
你写过这样的代码吗？`function identity(arg: any): any { return arg }` — any 让类型检查失效，泛型是真正的解法：`function identity<T>(arg: T): T { return arg }`，既灵活又安全。
──────────────────────────────────────────────────
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| Generator / Critic 分工 | Generator 专注于生成，Critic 专注于评审，两个角色用不同 system prompt 激活不同模式 |
| 带反馈的改进 prompt | Generator 在有 `previousFeedback` 时，把具体建议注入 prompt，指导改进方向 |
| 结构化评审 JSON | Critic 返回 `{ passed, score, feedback, suggestions }`，而非自由文本，使结果可解析、可决策 |
| `isReflectionResult` 类型守卫 | JSON 解析后用运行时类型检查替代 `any`，保证类型安全 |
| JSON 提取正则 | 用 `\{[\s\S]*\}` 从模型输出中提取 JSON，处理模型在 JSON 前后附加说明文字的情况 |
| 解析失败降级 | Critic 解析失败时返回 `passed: false` 的默认结果，让循环继续而不是崩溃 |
| 双重停止条件 | `score >= 8` 满足质量要求时停止；`maxIterations` 保证最坏情况下也能终止 |
| 输出摘要打印 | 每轮只打印前 80 字符，避免终端被长文本淹没，同时保留可读性 |

## 常见问题

**Q: Reflection 会不会进入无限改进循环？**

不会，只要正确设置了 `maxIterations`。循环停止有两个出口：Critic 评分达到阈值（`passed: true`），或者达到最大迭代次数。

需要注意的是，`maxIterations` 不应该设置得太大。如果经过 5 轮迭代 Critic 还不满意，问题通常不在于"再多迭代几次"，而在于：任务描述不够清晰、Critic 的评审标准设置得不合理、或者模型本身的能力瓶颈。这时应该先检查 prompt，而不是增加迭代次数。实际生产项目中，2-3 轮通常已经足够。

**Q: Generator 和 Critic 用同一个模型有效吗？**

有效，原因在于两个角色的 system prompt 完全不同，激活了模型不同的行为模式。Generator 被引导去"创作"，Critic 被引导去"批判性审查"，这是两种不同的认知模式。

当然，同一个模型可能存在共同的盲区——比如它在生成时犯的系统性错误，在评审时也可能看不出来。如果任务对质量要求极高，可以考虑用不同的模型担任 Critic，或者在 Critic 的 prompt 里加入具体的 checklist（比如"检查有没有拼写错误"、"检查代码能不能运行"），把盲区显式约束掉。

**Q: 评审标准怎么设计才有效？**

有效的评审标准有三个特征：

1. **可操作**：不是"更好"，而是"加入一个代码示例"、"把第一句话改成问句"
2. **可打分**：每个维度有明确的通过标准，而不是主观感受
3. **与任务绑定**：评审标准来自任务要求（字数限制、必须有代码示例等），而不是通用写作准则

最差的评审 prompt 是"评估这段内容的质量"——这太模糊了。最好的评审 prompt 会列出具体的检查点，就像代码 review checklist 一样，逐条核查。

## 小结与延伸

你现在有了一个完整的 Reflection Agent：

- `Generator` 接收任务和上一轮评审反馈，生成改进后的版本
- `Critic` 用结构化 JSON 评审输出，给出分数和具体建议
- `ReflectionAgent.run` 协调两个角色，在质量满足或轮次用尽时停止

Reflection 模式解决了一个普遍问题：如何让 Agent 输出从"凑合能用"提升到"达到标准"，而不需要人工介入每一轮修改。

这个模式的局限在于 API 调用成本随迭代次数线性增加，所以适合对质量要求高但不是高频调用的场景：代码生成、文档撰写、报告生成等。

接下来可以探索的方向：

- **P13 多模态**：Generator 处理图像输入，Critic 评审图像描述的准确性
- **P15 多 Agent**：把 Reflection 嵌入多 Agent 协作框架，让不同 Agent 的输出经过评审后再传递给下游
- **P21 Evaluation**：把 Critic 的评审逻辑抽象为通用 Evaluator，用于系统级质量监控

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p12-reflection" />
<PracticeProjectActionPanel project-id="practice-p12-reflection" />
