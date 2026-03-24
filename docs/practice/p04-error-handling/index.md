---
title: P4：错误处理与重试策略
description: 指数退避、工具调用失败降级、让 Agent 在不稳定环境中可靠运行
---

<PracticeProjectGuide project-id="practice-p04-error-handling" />

## 背景与目标

把 P1 的最小 Agent 部署到生产环境，第一周就会遇到这些问题：

```
OpenAI.APIError: 429 rate_limit_error - Too many requests
OpenAI.APIError: 503 service_unavailable - Service temporarily overloaded
Error: Tool execution failed: Network timeout after 30s
Agent ran 47 iterations and never stopped
```

这些不是边缘情况，而是日常。API 限流、服务过载、工具偶发失败、模型陷入循环——任何一个都能让 Agent 直接崩溃。

**本章目标**：为 Agent 配备三层防护：

```
API 错误  →  指数退避重试，区分可重试与不可重试错误
工具失败  →  捕获异常，把错误信息作为 tool 消息返回给模型
无限循环  →  maxIterations 保护，超限时主动终止
```

## 核心概念

### 三类错误，三种处理方式

Agent 在运行时面临的错误可以分为三类：

**第一类：API 错误**

OpenAI SDK 抛出 `APIError`，通过 `status` 字段区分：

| 状态码 | 错误类型 | 是否可重试 | 处理方式 |
|--------|----------|------------|----------|
| 429 | `rate_limit_error` | 是 | 退避后重试 |
| 500 | `server_error` | 有时是 | 退避后重试（有限次） |
| 503 | `service_unavailable` | 是 | 退避后重试 |
| 400 | `invalid_request_error` | 否 | 立即抛出，参数有误 |
| 401 | `authentication_error` | 否 | 立即抛出，密钥无效 |

**第二类：工具执行错误**

工具函数本身抛出异常——网络超时、文件不存在、权限拒绝。

错误的处理方式：**不要让异常向上冒泡**。把错误信息包装成 `role: 'tool'` 消息返回给模型，让模型决定下一步。模型可能会重试、换个参数、或者告知用户。

**第三类：模型行为错误**

模型陷入循环——重复调用同一工具、生成无意义内容、始终不返回 `finish_reason: 'stop'`。

处理方式：加 `maxIterations` 计数器，超过阈值强制终止。

### 指数退避算法

简单的固定间隔重试会加剧 API 服务器的压力。指数退避让每次重试的等待时间按指数增长，加上随机抖动（jitter）避免多个客户端同时重试形成"惊群效应"：

```
delay = baseDelay * 2^attempt + random(0, jitter)
```

例如 `baseDelay = 1000ms`，`jitter = 500ms`：

| 第几次重试 | 延迟范围 |
|-----------|----------|
| 第 1 次 | 1000–1500 ms |
| 第 2 次 | 2000–2500 ms |
| 第 3 次 | 4000–4500 ms |
| 第 4 次 | 8000–8500 ms |

<ErrorRetryDemo />

## 动手实现

### 第一步：定义类型与常量

```ts
// p04-error-handling.ts
import OpenAI from 'openai'

const client = new OpenAI()

// 重试配置
const RETRY_CONFIG = {
  maxAttempts: 4,
  baseDelay: 1000,   // 1 秒
  jitter: 500,       // 最多额外 500ms 随机延迟
  maxDelay: 30_000,  // 最长等待 30 秒
} as const

// Agent 循环保护
const MAX_ITERATIONS = 10

// 可重试的 HTTP 状态码
const RETRYABLE_STATUS = new Set([429, 500, 503])
```

### 第二步：实现 `withRetry`

```ts
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = RETRY_CONFIG.maxAttempts
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      // 只有 OpenAI API 错误才考虑重试
      if (!(err instanceof OpenAI.APIError)) {
        throw err
      }

      // 不可重试的错误立即抛出
      if (!RETRYABLE_STATUS.has(err.status ?? 0)) {
        throw err
      }

      // 已经是最后一次尝试
      if (attempt === maxAttempts - 1) {
        break
      }

      // 计算退避延迟
      const exponential = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
      const jitter = Math.random() * RETRY_CONFIG.jitter
      const delay = Math.min(exponential + jitter, RETRY_CONFIG.maxDelay)

      console.log(
        `[retry] attempt ${attempt + 1}/${maxAttempts} failed` +
        ` (${err.status} ${err.type ?? 'unknown'}).` +
        ` Waiting ${Math.round(delay)}ms...`
      )

      await sleep(delay)
    }
  }

  throw lastError
}
```

关键设计决策：

- `!(err instanceof OpenAI.APIError)` — 非 API 错误（如网络断连、本地代码异常）直接抛出，不重试
- `!RETRYABLE_STATUS.has(err.status)` — 400/401 这类客户端错误不重试，重试也没用
- `Math.min(..., maxDelay)` — 防止退避时间无限增长

### 第三步：模拟一个不稳定的工具

```ts
// 模拟一个有时会失败的数据查询工具（30% 概率抛错）
function query_database(table: string, id: number): string {
  if (Math.random() < 0.3) {
    throw new Error(`Database connection timeout: failed to query ${table}#${id}`)
  }
  const records: Record<string, Record<number, string>> = {
    users: {
      1: 'Alice (alice@example.com)',
      2: 'Bob (bob@example.com)',
    },
    orders: {
      101: 'Order #101: 3x TypeScript Book, $89.00',
      102: 'Order #102: 1x Mechanical Keyboard, $159.00',
    },
  }
  return records[table]?.[id] ?? `No record found in ${table} with id=${id}`
}

// 工具声明
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: '查询数据库中的记录。table 支持 users 和 orders，id 为记录编号',
      parameters: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: '表名：users 或 orders',
          },
          id: {
            type: 'number',
            description: '记录 ID',
          },
        },
        required: ['table', 'id'],
      },
    },
  },
]
```

### 第四步：带防护的 Agent 循环

```ts
type ToolInput = { table: string; id: number }

async function runAgent(userMessage: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++
    console.log(`\n[loop] iteration ${iterations}/${MAX_ITERATIONS}`)

    // 调用 API，带重试保护
    const response = await withRetry(() =>
      client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        tools,
        messages,
      })
    )

    const message = response.choices[0].message
    messages.push(message)

    if (message.content) {
      console.log(`\nAgent: ${message.content}`)
    }

    if (response.choices[0].finish_reason === 'stop') {
      return
    }

    if (response.choices[0].finish_reason !== 'tool_calls' || !message.tool_calls) {
      console.log(`[warn] unexpected finish_reason: ${response.choices[0].finish_reason}`)
      return
    }

    // 执行工具，捕获所有错误
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue

      const input = JSON.parse(toolCall.function.arguments) as ToolInput
      console.log(`[tool] ${toolCall.function.name}(table="${input.table}", id=${input.id})`)

      let content: string
      try {
        content = query_database(input.table, input.id)
        console.log(`[tool] success: ${content}`)
      } catch (err) {
        // 工具失败：把错误信息作为 tool 消息返回，不抛异常
        const message = err instanceof Error ? err.message : String(err)
        content = `Error: ${message}`
        console.log(`[tool] failed: ${message}`)
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content,
      })
    }
  }

  // 超出最大循环次数
  console.log(`[warn] Agent reached maxIterations (${MAX_ITERATIONS}), terminating.`)
}

// 运行示例
runAgent('帮我查一下用户 ID 为 1 的信息，以及订单 101 的详情').catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

### 运行结果

正常情况（工具未失败）：

```
[loop] iteration 1/10
[tool] query_database(table="users", id=1)
[tool] success: Alice (alice@example.com)
[tool] query_database(table="orders", id=101)
[tool] success: Order #101: 3x TypeScript Book, $89.00

[loop] iteration 2/10

Agent: 查询结果如下：
- 用户 ID 1：Alice，邮箱 alice@example.com
- 订单 #101：购买了 3 本 TypeScript Book，合计 $89.00
```

工具失败时（30% 概率触发）：

```
[loop] iteration 1/10
[tool] query_database(table="users", id=1)
[tool] failed: Database connection timeout: failed to query users#1
[tool] query_database(table="orders", id=101)
[tool] success: Order #101: 3x TypeScript Book, $89.00

[loop] iteration 2/10
[tool] query_database(table="users", id=1)
[tool] success: Alice (alice@example.com)

[loop] iteration 3/10

Agent: 用户 ID 1 的信息：Alice（alice@example.com）。
订单 #101 的详情：3 本 TypeScript Book，共 $89.00。
（查询用户信息时首次遇到数据库超时，已自动重试成功。）
```

注意第二轮循环：模型收到工具错误后，**主动发起了重试**——这是模型的自主行为，不是代码硬编码的。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `instanceof OpenAI.APIError` | SDK 统一的错误基类，通过 `status` 和 `type` 区分错误种类 |
| 可重试状态码 | 429 (rate_limit)、500 (server error)、503 (service unavailable)；400/401 立即抛出 |
| 指数退避 | `baseDelay * 2^attempt + jitter`，防止集中重试打垮服务器 |
| 工具错误降级 | `try/catch` 包裹工具调用，catch 时构造 `role: 'tool'` 消息而非抛出异常 |
| `maxIterations` | Agent 循环的硬性上限，防止模型行为异常导致无限运行 |
| 模型自主重试 | 收到工具错误信息后，模型可能自行决定重试——这是 Agent 智能的体现 |

## 常见问题

**Q: 重试多少次合适？**

取决于错误类型和业务容忍度。对于 429 限流，建议检查 `Retry-After` 响应头指定的等待时间（如果有）。没有的话，4 次重试、最长等待 30 秒，基本覆盖大多数瞬时过载场景。超过这个阈值说明问题不是瞬时的，继续重试只会浪费时间。

**Q: 工具失败应该告诉用户吗？**

应该，但由模型来决定怎么说。把错误信息放入 `role: 'tool'` 消息的 `content`，模型会根据错误严重程度和任务上下文，自行决定是向用户报告、重试，还是用其他方式完成任务。不要在代码层面硬编码"失败就停止"——这剥夺了模型的自主判断空间。

**Q: 如何区分"模型在思考"和"Agent 卡死了"？**

两种判断维度：一是**时间维度**，给每次 API 调用设置超时（OpenAI SDK 支持 `timeout` 选项）；二是**轮次维度**，即本章实现的 `maxIterations`。正常的 Agent 很少需要超过 10 轮工具调用——如果超过，大概率是循环或参数错误。生产环境可以在循环里同时记录日志，方便事后分析是哪一轮开始异常。

## 小结与延伸

本章为 Agent 加上了三层防护：API 重试、工具错误降级、循环次数保护。这些不是可选的"优化项"，而是任何生产级 Agent 的基础配置。

值得注意的是，工具错误降级体现了 Agent 设计的一个重要原则：**让模型参与错误处理决策**，而不是在代码层面把所有异常都截断。模型看到错误信息后可能做出比硬编码逻辑更合理的选择。

接下来：

- **P5**：记忆与上下文管理——随着对话增长，如何控制 Token 消耗
- **P20**：可观测性——如何在生产环境追踪 Agent 的每一步行为

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p04-error-handling" />
<PracticeProjectActionPanel project-id="practice-p04-error-handling" />
