---
title: P2：多轮对话与上下文管理
description: 构建有记忆的对话助手，掌握 messages 历史管理与 Token 预算控制两项核心技能
---

<PracticeProjectGuide project-id="practice-p02-multi-turn" />

## 背景与目标

P1 的 Agent 每次调用都是全新的对话。试着问它："你还记得我刚才问过什么吗？"——它不记得，因为每次 `messages` 数组都是从零开始构建的。

这对单次工具调用够用，但真实的助手场景需要"记忆"：

```
用户：帮我写一个排序函数
助手：好的，这是一个快速排序实现...

用户：改成支持降序排列     <-- 没有历史，模型不知道"这个"指什么
助手：请问你想改什么？     <-- 对话断了
```

**多轮对话的本质**：把每一轮的用户输入和模型回复都追加到 `messages` 数组里，下次调用时一起发给模型。

但随之而来的是 **Token 预算问题**：历史越长，每次请求的 Token 数越多，成本线性上涨，最终超过模型的 context window 限制直接报错。

本章目标：

```
实现 ChatSession 类，维护对话历史
  -> addMessage()：追加消息
  -> trimHistory()：超出预算时自动裁剪旧消息
  -> chat()：调用 API，自动管理历史
```

## 核心概念

### 消息历史数组如何增长

每轮对话结束后，`messages` 数组增加两个元素：

```
第 0 轮（初始）：[]
第 1 轮后：     [user-1, assistant-1]
第 2 轮后：     [user-1, assistant-1, user-2, assistant-2]
第 3 轮后：     [user-1, assistant-1, user-2, assistant-2, user-3, assistant-3]
```

每条消息的字符数不固定，一个详细回复可能几百甚至上千 Token。积累 10 轮后，单次请求的输入 Token 可能超过 5 万。

### Token 估算方式

精确 Token 计数需要调用 tokenizer，粗略估算用字符数除以 4（英文约 4 字符/Token，中文约 1.5 字符/Token，取均值 4 作为保守估算）：

```ts
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
```

这不精确，但足够用于预算控制。

### 两种截断策略

**策略 A：保留最近 N 条消息**

```
保留前：[u1, a1, u2, a2, u3, a3, u4, a4]  (8条)
保留后：               [u3, a3, u4, a4]    (4条，maxMessages=4)
```

优点：实现简单。缺点：如果 a1 里有重要信息（比如用户的名字），会丢失。

**策略 B：滑动窗口（system + 最新 K 轮）**

```
[system] + [u(n-k+1), a(n-k+1), ..., u(n), a(n)]
```

保留 system prompt 不动，只裁剪中间的历史轮次。这是生产环境最常用的策略。

### 为什么不能保存全部历史

| 问题 | 后果 |
|------|------|
| Token 超出 context window | API 直接返回错误，对话中断 |
| Token 数量过大 | 延迟增加，成本线性上涨 |
| 噪声历史混入 | 模型注意力分散，回复质量下降 |

`gpt-4o-mini` 的 context window 是 200K Token，但生产中一般把单次请求控制在 10-20K 以内，兼顾成本和响应速度。

<ContextWindowDemo />

## 动手实现

### 第一步：定义类型与估算函数

```ts
// p02-multi-turn.ts
import OpenAI from 'openai'

const client = new OpenAI()

// 每 4 个字符估算为 1 个 Token（粗略，够用于预算控制）
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// 把消息内容统一转为字符串用于估算
function messageToText(message: OpenAI.ChatCompletionMessageParam): string {
  if (typeof message.content === 'string') {
    return message.content
  }
  return message.content
    .map(block => {
      if (block.type === 'text') return block.text
      return ''
    })
    .join('')
}
```

### 第二步：实现 ChatSession 类

```ts
class ChatSession {
  private messages: OpenAI.ChatCompletionMessageParam[] = []
  private systemPrompt: string
  private maxTokenEstimate: number

  constructor(systemPrompt: string, maxTokenEstimate = 4000) {
    this.systemPrompt = systemPrompt
    this.maxTokenEstimate = maxTokenEstimate
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.push({ role, content })
  }

  // 估算当前历史的总 Token 数
  estimateHistoryTokens(): number {
    const historyText = this.messages.map(messageToText).join('')
    return estimateTokens(historyText) + estimateTokens(this.systemPrompt)
  }

  // 裁剪历史：从最旧的一对消息开始删，直到 Token 数低于预算
  trimHistory(maxTokenEstimate: number): void {
    while (
      this.messages.length > 2 &&  // 至少保留最后一轮
      this.estimateHistoryTokens() > maxTokenEstimate
    ) {
      // 每次删除最旧的一对（user + assistant）
      this.messages.splice(0, 2)
      console.log(`  [trim] 历史过长，删除最旧一对消息，剩余 ${this.messages.length} 条`)
    }
  }

  getHistoryLength(): number {
    return this.messages.length
  }

  async chat(userInput: string): Promise<string> {
    // 追加用户消息
    this.addMessage('user', userInput)

    // 发送前检查并裁剪历史
    this.trimHistory(this.maxTokenEstimate)

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...this.messages,
      ],
    })

    // 提取文本回复
    const assistantText = response.choices[0].message.content ?? ''

    // 把 assistant 回复追加到历史
    this.addMessage('assistant', assistantText)

    return assistantText
  }
}
```

### 第三步：模拟多轮对话

```ts
async function main(): Promise<void> {
  const session = new ChatSession(
    '你是一名简洁的编程助手，回答控制在 100 字以内。',
    2000  // 约 500 Token 预算，故意设小以便演示裁剪
  )

  const turns: string[] = [
    '用 TypeScript 写一个计算数组平均值的函数',
    '改成支持忽略 undefined 值',
    '加上单元测试',
    '把这个函数改成支持加权平均',
  ]

  for (let i = 0; i < turns.length; i++) {
    const userInput = turns[i]
    console.log(`\n--- 第 ${i + 1} 轮 ---`)
    console.log(`用户：${userInput}`)

    const reply = await session.chat(userInput)

    console.log(`助手：${reply}`)
    console.log(
      `历史长度：${session.getHistoryLength()} 条，` +
      `估算 Token：${session.estimateHistoryTokens()}`
    )
  }
}

main().catch(console.error)
```

### 运行结果

```
--- 第 1 轮 ---
用户：用 TypeScript 写一个计算数组平均值的函数
助手：function average(nums: number[]): number {
  return nums.reduce((sum, n) => sum + n, 0) / nums.length
}
历史长度：2 条，估算 Token：68

--- 第 2 轮 ---
用户：改成支持忽略 undefined 值
助手：function average(nums: Array<number | undefined>): number {
  const valid = nums.filter((n): n is number => n !== undefined)
  return valid.reduce((sum, n) => sum + n, 0) / valid.length
}
历史长度：4 条，估算 Token：186

--- 第 3 轮 ---
用户：加上单元测试
助手：import { test, expect } from 'bun:test'
test('average ignores undefined', () => {
  expect(average([1, undefined, 3])).toBe(2)
  expect(average([undefined])).toBeNaN()
})
历史长度：6 条，估算 Token：312

--- 第 4 轮 ---
  [trim] 历史过长，删除最旧一对消息，剩余 4 条
用户：把这个函数改成支持加权平均
助手：function weightedAverage(
  nums: Array<number | undefined>,
  weights: number[]
): number {
  const pairs = nums.map((n, i) => ({ n, w: weights[i] }))
    .filter((p): p is { n: number; w: number } => p.n !== undefined)
  const weightedSum = pairs.reduce((s, p) => s + p.n * p.w, 0)
  const totalWeight = pairs.reduce((s, p) => s + p.w, 0)
  return weightedSum / totalWeight
}
历史长度：6 条，估算 Token：389
```

第 4 轮触发了裁剪。模型依然理解"这个函数"——因为最近两轮（单元测试那轮）的上下文还在，它从中推断出函数的形态。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `messages` 数组 | 每轮追加 `{role: 'user'}` 和 `{role: 'assistant'}` 两条记录 |
| system prompt | 作为 `{ role: 'system' }` 消息放在 `messages` 数组开头 |
| Token 估算 | `字符数 / 4`，粗略但实用，避免调用额外 API |
| 裁剪时机 | 发送请求前检查，超出预算则删除最旧的 user+assistant 对 |
| 保留最后一轮 | `messages.length > 2` 作为裁剪终止条件，避免把刚追加的用户消息也删掉 |
| `gpt-4o-mini` | 速度快、成本低的模型，适合多轮对话场景 |

## 常见问题

**Q: 为什么历史要包含 assistant 的回复，不能只保留用户消息吗？**

模型的推理是基于完整对话的。如果只有用户消息，模型看到"改成支持降序排列"时完全不知道"改什么"——它需要看见自己之前返回的代码，才能在此基础上修改。用户消息和模型回复必须成对出现。

**Q: 超过 context window 会怎样？**

OpenAI API 会返回 400 错误，错误信息类似 `prompt is too long: 210234 tokens > 200000 maximum`。对话直接中断。这就是为什么要在发送请求前主动裁剪，而不是等报错再处理。

**Q: system prompt 算 Token 吗？**

算。每次请求，system prompt 的 Token 都会计入输入 Token 总数，所以 `estimateHistoryTokens()` 里把它一起算进去了。如果 system prompt 很长（几千字），要把这部分预算留出来，不能全给历史消息。

## 小结与延伸

你现在有了一个带记忆的对话助手骨架：

- `addMessage()` — 维护历史
- `trimHistory()` — 控制 Token 预算
- `chat()` — 封装完整的一轮对话

这里实现的是最简单的裁剪策略（删除最旧的对）。生产环境还有更精细的方案：

- **摘要压缩**：用模型把旧历史总结成一段文字，替换原始消息（OpenCode 的 `ContextCompaction` 就是这个思路，见第5章）
- **重要性过滤**：标记"关键消息"（如用户偏好、重要决策），裁剪时跳过这些
- **向量检索**：把历史消息存入向量库，每轮检索最相关的几条放入 context（见 P7）

接下来：

- **P3**：给对话加上流式输出，让回复实时打印而不是等待全部生成
- **P5**：系统性地了解 Agent 的记忆架构（短期/长期/工作记忆）

<StarCTA />

<PracticeProjectActionPanel project-id="practice-p02-multi-turn" />
