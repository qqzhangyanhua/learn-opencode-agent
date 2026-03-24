---
title: P3：流式输出与实时反馈
description: 用 stream() API 实现逐 token 打印，让 Agent 回复不再让用户干等
---

<PracticeProjectGuide project-id="practice-p03-streaming" />

## 背景与目标

P1 的 Agent 用的是标准的非流式调用：

```ts
const response = await client.chat.completions.create({ ... })
// 5-10 秒后，所有内容一次性出现
console.log(response.content)
```

这意味着用户要盯着空白终端等待 5-10 秒，才能看到完整回复。模型其实早就开始生成了，只是你在等它全部写完才拿到结果。

**流式输出的本质**：模型每生成一个 token 就立刻推送给你，你拿到就打印，用户看到文字像打字机一样逐字出现。感知上的等待从"5 秒空白"变成"立刻开始有内容"。

本章目标：

```
用户输入
  -> 模型开始生成，逐 token 推送
    -> 文字 delta 打印到终端
      -> 检测到工具调用，显示进度提示
        -> 工具执行完毕，继续流式
          -> 最终回复完整呈现
```

## 核心概念

### stream() vs create()

OpenAI SDK 提供两个入口，底层协议不同：

| 方法 | 返回 | 行为 |
|------|------|------|
| `client.chat.completions.create()` | `Promise<ChatCompletion>` | 等待全部生成完毕，一次性返回 |
| `client.chat.completions.create({ stream: true })` | `Stream<ChatCompletionChunk>` | 返回 AsyncIterable，每个 chunk 立刻推送 |

流式模式在传输层用 HTTP 分块传输（chunked transfer），服务器边生成边写入响应流。

### 流式 Chunk 结构

每个 chunk 的 `choices[0].delta` 包含增量内容，最关键的两类字段：

```
delta.content         -> 文本片段，直接打印即可
delta.tool_calls      -> 工具调用增量：函数名和参数 JSON 分片推送
choices[0].finish_reason -> 'stop' 表示文本完毕，'tool_calls' 表示需要执行工具
```

实际消费流时，你主要处理 `delta.content` 的文本片段。

### 流式 + 工具调用的组合问题

工具调用本身无法流式执行：模型必须把完整的工具名和参数都生成完毕，你才能知道要调什么、传什么参数。所以当模型要调用工具时，流式打印会暂停：

```
[流式文字] 好的，我来查询北京的天气...
[暂停]  <- 模型在生成 tool_calls（参数 JSON 逐步推送，但你不打印）
[工具执行] 拿到结果
[流式文字] 继续：北京今天晴朗，气温 22°C...
```

处理方式：在流消费循环里检测 `delta.tool_calls`，按 `index` 累积每个工具调用的函数名和参数 JSON，等流结束后统一执行，把结果推回 `messages`，再发起新一轮流式请求。

<StreamingOutputDemo />

## 动手实现

### 第一步：工具声明与实现

和 P1 完全相同，复用 `get_weather` 工具：

```ts
// p03-streaming.ts
import OpenAI from 'openai'

const client = new OpenAI()

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

function get_weather(city: string): string {
  const data: Record<string, string> = {
    北京: '晴，22°C，东南风 3 级',
    上海: '多云，18°C，东风 2 级',
    广州: '小雨，26°C，南风 2 级',
  }
  return data[city] ?? `暂无 ${city} 的天气数据`
}
```

### 第二步：执行单个工具调用

提取工具执行逻辑为独立函数，方便复用：

```ts
function executeTool(name: string, input: Record<string, string>): string {
  if (name === 'get_weather') {
    return get_weather(input.city)
  }
  return `Unknown tool: ${name}`
}
```

### 第三步：流式 Agent 循环

核心实现。用 `for await` 遍历流式 chunk，分类处理文本和工具调用增量：

```ts
async function runStreamingAgent(userMessage: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  while (true) {
    // 启动流式请求
    const stream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      tools,
      messages,
      stream: true,
    })

    // 收集本轮的文本内容和工具调用
    let textContent = ''
    const toolCalls: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }> = []

    // 当前正在构建的工具调用（参数 JSON 分多个 delta 推送）
    let currentToolCall: {
      index: number
      id: string
      name: string
      arguments: string
    } | null = null

    let finishReason: string | null = null

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      // 文本片段，直接打印到终端
      if (delta?.content) {
        process.stdout.write(delta.content)
        textContent += delta.content
      }

      // 工具调用增量处理
      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          if (toolCallDelta.index !== undefined) {
            if (
              currentToolCall === null ||
              currentToolCall.index !== toolCallDelta.index
            ) {
              // 新的工具调用开始，先保存上一个
              if (currentToolCall) {
                toolCalls.push({
                  id: currentToolCall.id,
                  type: 'function',
                  function: {
                    name: currentToolCall.name,
                    arguments: currentToolCall.arguments,
                  },
                })
              }

              currentToolCall = {
                index: toolCallDelta.index,
                id: toolCallDelta.id ?? '',
                name: toolCallDelta.function?.name ?? '',
                arguments: toolCallDelta.function?.arguments ?? '',
              }

              if (toolCallDelta.function?.name) {
                process.stdout.write(`\n[调用工具: ${toolCallDelta.function.name} `)
              }
            } else {
              // 同一个工具调用的参数增量
              if (toolCallDelta.function?.arguments) {
                currentToolCall.arguments += toolCallDelta.function.arguments
              }
            }
          }
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason
      }
    }

    // 保存最后一个工具调用
    if (currentToolCall) {
      toolCalls.push({
        id: currentToolCall.id,
        type: 'function',
        function: {
          name: currentToolCall.name,
          arguments: currentToolCall.arguments,
        },
      })
      process.stdout.write(`${currentToolCall.arguments}]\n`)
    }

    // 构建 assistant 消息并加入历史
    const assistantMessage: OpenAI.ChatCompletionAssistantMessageParam = {
      role: 'assistant',
      content: textContent || null,
    }
    if (toolCalls.length > 0) {
      assistantMessage.tool_calls = toolCalls
    }
    messages.push(assistantMessage)

    if (finishReason === 'stop') {
      // 模型已生成完整文本回复，结束循环
      process.stdout.write('\n')
      return
    }

    if (finishReason !== 'tool_calls') {
      process.stdout.write(`\n[未处理的 finish_reason: ${finishReason ?? 'null'}]\n`)
      return
    }

    // 执行所有工具调用，收集结果
    for (const toolCall of toolCalls) {
      let parsedInput: Record<string, string> = {}
      try {
        parsedInput = JSON.parse(toolCall.function.arguments) as Record<string, string>
      } catch {
        parsedInput = {}
      }

      const result = executeTool(toolCall.function.name, parsedInput)
      console.log(`[工具结果: ${result}]`)

      // 把工具结果推回 messages，继续下一轮流式
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }
}

// 运行
process.stdout.write('> 北京天气怎么样，适合跑步吗？\n')
runStreamingAgent('北京天气怎么样，适合跑步吗？').catch(console.error)
```

### 运行结果

```
> 北京天气怎么样，适合跑步吗？
[调用工具: get_weather {"city":"北京"}]
[工具结果: 晴，22°C，东南风 3 级]
北京今天天气晴朗，气温 22°C，东南风 3 级。非常适合跑步！建议穿一件轻薄的运动服，做好防晒准备。东南风 3 级不算大，跑步时会有微风相伴，体感舒适。
```

和 P1 不同的地方在于：最后那句话不是等 5 秒后一次性出现，而是从"北"字开始，逐字在终端打印，用户立刻就有内容可读。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `create({ stream: true })` | 返回 `Stream<ChatCompletionChunk>`，可用 `for await` 遍历 chunk |
| `delta.content` | 文本流的最小单位，用 `process.stdout.write()` 打印，不加换行 |
| `delta.tool_calls` | 工具调用增量，按 `index` 区分不同工具调用，参数 JSON 分片推送需累积 |
| `finish_reason` | `'stop'` 表示文本回复完毕，`'tool_calls'` 表示需要执行工具 |
| `ChatCompletionAssistantMessageParam` | 手动构建 assistant 消息，包含 `content` 和 `tool_calls` |
| `process.stdout.write()` vs `console.log()` | `stdout.write` 不自动加换行，适合逐字追加；`console.log` 每次换行 |
| 工具调用时暂停流式 | 参数 JSON 在流中推送但不打印，凑齐后执行，结果推回 messages 再开新一轮流式 |

## 常见问题

**Q: 流式和非流式 Token 消耗一样吗？**

一样。流式只是改变了数据传输方式（服务器边生成边推送 vs 全部生成后一次返回），模型实际运行的计算量和生成的 Token 数量完全相同，账单上看不出区别。

**Q: 工具调用时为什么不能流式？**

因为工具执行需要完整的参数。模型生成 `{"city": "北京"}` 这个 JSON 时，它是一个字符一个字符推送的：先是 `{`，然后 `"c`，然后 `it`... 直到 `}` 才完整。在收到完整参数之前你无法知道要调什么，所以工具调用天然是等待完整块后再执行的。参数 JSON 通过 `delta.tool_calls[].function.arguments` 分片推送，你在流消费阶段只是累积字符串，等 `finish_reason` 出现后才真正解析执行。

**Q: 如何在 Web 场景用 SSE 转发流式输出？**

在 HTTP API 层，把 OpenAI SDK 的事件流转换成 [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)（SSE）格式推给前端：

```ts
// Express 路由示例（伪代码）
app.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  const stream = await client.chat.completions.create({ ..., stream: true })

  for await (const chunk of stream) {
    if (chunk.choices[0]?.delta?.content) {
      res.write(`data: ${JSON.stringify({ text: chunk.choices[0].delta.content })}\n\n`)
    }
  }

  res.write('data: [DONE]\n\n')
  res.end()
})
```

前端用 `EventSource` 接收，实现浏览器内的流式打印效果。OpenCode 的 HTTP API 服务器（第9章）就是这个思路。

## 小结与延伸

本章做了三件事：

- 给 `create()` 加上 `stream: true`，用 `for await` 消费 chunk 流
- 用 `process.stdout.write()` 逐 token 打印，消除等待感
- 在工具调用时暂停打印，执行完毕后开新一轮流式请求继续

流式输出是 Agent 交互体验的基础设施。几乎所有面向用户的 Agent 场景（ChatGPT、Claude.ai、OpenCode TUI）都在用这个模式。

接下来：

- **P4**：工具执行出错了该怎么处理？如何让 Agent 在错误中优雅恢复
- **P10**：完整的 ReAct 推理循环，把流式输出和思维链结合起来

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p03-streaming" />
<PracticeProjectActionPanel project-id="practice-p03-streaming" />
