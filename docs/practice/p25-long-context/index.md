---
title: 补充：长上下文管理
description: 滑动窗口与渐进式摘要——在上下文溢出之前主动裁剪，让长对话不崩溃
---

<PracticeProjectGuide project-id="practice-p25-long-context" />

## 背景与目标

P2 实现了多轮对话，`messages` 数组随对话增长。这个方案有一个定时炸弹：

```
OpenAI.BadRequestError: 400 context_length_exceeded
This model's maximum context length is 128000 tokens.
However, your messages resulted in 132451 tokens.
```

这不是边缘情况。一次代码审查 session、一个文档分析任务、一次持续数小时的技术咨询——都会遇到。P2 的 `trimHistory()` 是最简单的应对，但面对需要跨轮保留信息的场景不够用。

**本章目标**：

```
策略一：滑动窗口  →  保留最近 N 轮，简单但会丢失早期信息
策略二：渐进式摘要  →  用 LLM 压缩旧历史，信息压缩保留而非直接丢弃
策略三：Token 预算监控  →  主动计数，接近上限前触发压缩
```

## 核心概念

### 为什么 P2 的 trimHistory 不够

P2 的裁剪是硬截断：超出 token 预算就删最旧的消息对。对于每轮相对独立的对话，这够用。但对于这类场景就不够了：

```
第1轮：用户说"我在做一个 React + TypeScript 的电商项目，后端用 Go"
第2-10轮：讨论各种具体问题
第11轮：用户问"你还记得我的技术栈吗？"
模型：不记得了——那条消息被截断掉了
```

关键上下文（用户背景、做出的设计决策、已确认的约定）一旦被截断就永久消失。

### 两种策略的本质区别

```
滑动窗口：   [u1,a1] [u2,a2] ... [u10,a10]
                ↓（超出阈值）
            [u6,a6] [u7,a7] [u8,a8] [u9,a9] [u10,a10]
            早期信息：永久丢失

渐进式摘要：  [u1,a1] ... [u6,a6] + [u7,a7]...[u10,a10]
                ↓（超出阈值）
            [摘要: u1-u6 的关键信息] + [u7,a7]...[u10,a10]
            早期信息：被压缩进摘要，仍然可用
```

### Token 估算

精确计数需要 tiktoken，粗略估算用字符数：

```
中文约 1.5 字符/token，英文约 4 字符/token
中英混合取均值，字符数 / 2.5 作为保守估算（偏高，避免低估）
```

## 动手实现

### 第一步：实现滑动窗口

```ts
// p25-long-context.ts
import OpenAI from 'openai'

const client = new OpenAI()
const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

type Message = OpenAI.ChatCompletionMessageParam

// 估算 token 数（粗略，偏保守）
function estimateTokens(messages: Message[]): number {
  return messages.reduce((total, m) => {
    const text = typeof m.content === 'string' ? m.content : ''
    return total + Math.ceil(text.length / 2.5) + 4  // 4 为消息格式开销
  }, 0)
}

// 滑动窗口：保留 system + 最近 maxRounds 轮
function slidingWindow(messages: Message[], maxRounds: number): Message[] {
  const system = messages.filter(m => m.role === 'system')
  const dialog = messages.filter(m => m.role !== 'system')
  const keep = dialog.slice(-maxRounds * 2)  // 每轮 user + assistant = 2条
  return [...system, ...keep]
}
```

### 第二步：实现渐进式摘要

```ts
// 把旧历史压缩成一段摘要
async function summarizeHistory(
  oldMessages: Message[],
  previousSummary: string
): Promise<string> {
  const historyText = oldMessages
    .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
    .join('\n')

  const prompt = previousSummary
    ? `已有摘要：\n${previousSummary}\n\n新增对话：\n${historyText}\n\n请合并为新摘要，保留所有关键信息、决策和约定。`
    : `请将以下对话压缩为简洁摘要，保留关键信息：\n\n${historyText}`

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.2,  // 低温度让摘要更确定性
  })

  return response.choices[0].message.content ?? ''
}
```

### 第三步：封装带自动压缩的对话管理器

```ts
class LongContextManager {
  private messages: Message[]
  private summary = ''
  private readonly tokenThreshold: number

  constructor(
    systemPrompt: string,
    tokenThreshold = 4000  // 超过此 token 数触发压缩
  ) {
    this.messages = [{ role: 'system', content: systemPrompt }]
    this.tokenThreshold = tokenThreshold
  }

  // 构建发送给 API 的 messages（含摘要注入）
  private buildMessages(): Message[] {
    const systemContent = this.summary
      ? `${this.messages[0].content}\n\n[历史摘要]\n${this.summary}`
      : String(this.messages[0].content)

    return [
      { role: 'system', content: systemContent },
      ...this.messages.slice(1)
    ]
  }

  private async compressIfNeeded(): Promise<void> {
    if (estimateTokens(this.messages) <= this.tokenThreshold) return

    console.log(`[压缩] Token 超出阈值，开始摘要压缩...`)

    const dialog = this.messages.slice(1)
    const toSummarize = dialog.slice(0, -4)   // 压缩除最近 4 条外的旧历史
    const toKeep = dialog.slice(-4)

    if (toSummarize.length === 0) return

    this.summary = await summarizeHistory(toSummarize, this.summary)
    this.messages = [this.messages[0], ...toKeep]

    console.log(`[压缩] 完成，当前估算 token: ${estimateTokens(this.messages)}`)
  }

  async chat(userInput: string): Promise<string> {
    this.messages.push({ role: 'user', content: userInput })
    await this.compressIfNeeded()

    const response = await client.chat.completions.create({
      model,
      messages: this.buildMessages(),
    })

    const reply = response.choices[0].message.content ?? ''
    this.messages.push({ role: 'assistant', content: reply })
    return reply
  }
}

async function main(): Promise<void> {
  const manager = new LongContextManager(
    '你是专业的 TypeScript 编程助手，回答简洁专业。',
    2000  // 故意设小以演示触发
  )

  const turns = [
    '我在做电商项目，主要用 TypeScript + React，后端是 Node.js',
    '购物车怎么设计比较好？',
    '如果要支持优惠券怎么扩展？',
    '库存检查应该在哪层做？',
    '怎么处理并发下单时的库存竞争？',
    '你还记得我们项目的技术栈吗？',  // 这条会测试摘要是否保留了早期信息
  ]

  for (const turn of turns) {
    console.log(`\n用户: ${turn}`)
    const reply = await manager.chat(turn)
    console.log(`助手: ${reply.slice(0, 150)}...`)
  }
}

main().catch(console.error)
```

### 运行结果

```
用户: 我在做电商项目，主要用 TypeScript + React，后端是 Node.js
助手: 了解，TypeScript + React 前端 + Node.js 后端的电商项目...

用户: 购物车怎么设计比较好？
助手: 购物车可以设计为 Session 级的，用 Map<productId, quantity>...

[压缩] Token 超出阈值，开始摘要压缩...
[压缩] 完成，当前估算 token: 234

用户: 你还记得我们项目的技术栈吗？
助手: 记得。你们的技术栈是：TypeScript + React 前端，Node.js 后端，
      在讨论电商购物车设计，目前已确定使用 Map 结构管理购物车...
```

最后一轮，尽管原始消息已被压缩，模型仍能通过摘要回答技术栈信息。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 滑动窗口 | 保留 system + 最近 N 轮，早期信息直接丢弃，实现简单 |
| 渐进式摘要 | 用 LLM 把旧历史压缩成摘要注入 system，信息压缩保留 |
| 摘要叠加 | 新摘要在旧摘要基础上合并，不会丢失更早期的历史 |
| Token 估算 | `字符数 / 2.5 + 4`（每条消息格式开销），粗略但足够触发预警 |
| 触发时机 | 超过阈值时触发，而不是等 API 报 400 错误 |
| 保留最近几轮 | 压缩时保留最近 4 条，让模型有足够上下文继续对话 |

## 常见问题

**Q: 渐进式摘要会丢失信息吗？**

会有损失，但远少于直接截断。减少损失的方法：使用低 temperature（0.2-0.3）让摘要更保守；在 prompt 里明确说明保留重要决策、用户背景、已确认约定；对特别重要的信息（如用户说的需求约束）可以专门抽取并"钉住"不参与压缩。

**Q: 摘要本身也消耗 token，这不是更贵了？**

短期内单次压缩有额外费用。长期看，一次压缩把 N 轮旧历史（可能 5000 token）压缩成摘要（500 token），之后每轮节省 4500 token。2-3 轮后就回本。对于预期总轮次少于 5 轮的会话，用滑动窗口更合算。

**Q: P2 已经有 trimHistory，还需要渐进式摘要吗？**

看场景。P2 的 `trimHistory` 是滑动窗口的简化版，适合短会话或每轮独立的任务。渐进式摘要适合需要跨越多轮保留信息的长会话（技术咨询、文档分析、持续性对话助手）。

## 小结与延伸

长上下文管理是 P2 多轮对话的生产化延伸——解决的不是"如何建立历史"，而是"历史长了怎么办"。

两种策略各有适用场景：
- 每轮相对独立 → 滑动窗口
- 跨轮信息重要 → 渐进式摘要

接下来：

- **P5**：记忆系统架构——从被动裁剪到主动管理，建立短期/长期/工作记忆三层结构
- **P7**：RAG 基础——把历史消息存入向量库，用检索代替全量传入

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p25-long-context" />
<PracticeProjectActionPanel project-id="practice-p25-long-context" />
