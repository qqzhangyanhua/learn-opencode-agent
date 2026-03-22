---
title: P1：最小 Agent — 工具调用核心机制
description: 用 80 行 TypeScript 构建你的第一个可运行 Agent，理解工具调用的完整生命周期
contentType: practice
series: practice
contentId: practice-p01-minimal-agent
shortTitle: 最小 Agent
summary: 用最少的代码跑通工具调用生命周期，亲手实现一个可查询天气的最小 Agent。
difficulty: beginner
estimatedTime: 45 min
learningGoals:
  - 用 80 行 TypeScript 构建第一个可运行 Agent
  - 理解工具调用的完整生命周期
  - 跑通“用户输入 → 模型思考 → 工具执行 → 最终回复”的最小闭环
prerequisites:
  - 已阅读实践环境准备
  - 无，可直接开始
recommendedNext:
  - /practice/p10-react-loop/
  - /00-what-is-ai-agent/
practiceLinks:
  - /practice/p10-react-loop/
  - /00-what-is-ai-agent/
searchTags:
  - 最小 Agent
  - OpenAI SDK
  - Tool Calling
  - TypeScript
  - Agent Loop
navigationLabel: P1 最小 Agent
entryMode: build-first
roleDescription: 用一个最短可运行项目先把工具调用和 Agent 循环亲手跑通，再回头理解理论篇里的系统抽象。
---

<ProjectCard
  title="你将构建：一个可以查询天气的最小 Agent"
  difficulty="beginner"
  duration="45 min"
  :prerequisites="[]"
  :tags="['OpenAI SDK', 'Tool Calling', 'TypeScript']"
/>

> 开始前先看：[实践环境准备](/practice/setup)。如果你还不想先搭本地环境，也可以先打开 <a href="/practice/playground/?chapter=p01-minimal-agent" target="_blank" rel="noopener noreferrer">本章在线运行工作台</a>，在浏览器侧填写 `API Key / baseURL / model` 直接试跑；相关限制和安全提示见 [在线运行模式](/practice/setup#online-mode)。本章对应示例文件位于 `practice/` 目录，可直接按命令运行。

## 前置准备

开始本章前，请先确认：

- 已阅读 [实践环境准备](/practice/setup)
- 如果暂时不走本地环境，已了解 [在线运行模式](/practice/setup#online-mode) 的适用范围与安全提示
- 基础依赖已就绪：`openai`
- 本地运行时环境变量已配置：`OPENAI_API_KEY`
- 前置章节：无，可直接开始
- 本章建议入口命令：`bun run p01-minimal-agent.ts`
- 示例文件位置：`practice/p01-minimal-agent.ts`

## 背景与目标

大多数人第一次用 LLM API，都是这样写的：

```ts
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: '北京今天天气怎么样？' }]
})
```

模型会回答"我无法获取实时天气"——因为它没有工具。

**Agent 和普通 LLM 调用的本质区别**就在这里：Agent 有工具，模型可以主动调用它们。

本章目标：用最少的代码，跑通工具调用的完整链路：

```
用户输入 → 模型思考 → 决定调用工具 → 执行工具 → 模型整合结果 → 最终回复
```

## 核心概念：工具调用生命周期

一次工具调用经历 4 个阶段：

1. **声明**：告诉模型有哪些工具、每个工具的参数 Schema
2. **决策**：模型根据用户问题，决定是否调用工具（以及调用哪个、传什么参数）
3. **执行**：你的代码接收到 `tool_calls` 数组，调用真实函数并返回结果
4. **整合**：把工具结果放回对话，模型生成最终回复

## 动手实现

<RunCommand command="bun run p01-minimal-agent.ts" :verified="true" />

### 运行与验证

- 先按前置准备完成依赖、运行参数和本章示例文件
- 如果你走在线运行模式，先打开 <a href="/practice/playground/?chapter=p01-minimal-agent" target="_blank" rel="noopener noreferrer">本章在线运行工作台</a>，确认页面里的 `API Key / baseURL / model` 已填写正确
- 如果你走本地运行模式，再执行上面的推荐入口命令
- 将输出与下文的“运行结果”或章节描述对照，确认主链路已经跑通
- 如果遇到命令、依赖、环境变量或样例输入问题，先回到 [实践环境准备](/practice/setup) 排查



### 第一步：声明工具

```ts
// p01-minimal-agent.ts
import OpenAI from 'openai'

const client = new OpenAI()

// 工具声明：告诉模型这个工具做什么、需要什么参数
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
```

### 第二步：模拟工具实现

```ts
// 真实项目中这里调用天气 API，这里用模拟数据
function get_weather(city: string): string {
  const data: Record<string, string> = {
    '北京': '晴，22°C，东南风 3 级',
    '上海': '多云，18°C，东风 2 级',
    '广州': '小雨，26°C，南风 2 级',
  }
  return data[city] ?? `暂无 ${city} 的天气数据`
}
```

### 第三步：Agent 循环

```ts
async function runAgent(userMessage: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  while (true) {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      tools,
      messages,
    })

    // 将模型回复加入对话历史
    const message = response.choices[0].message
    messages.push(message)

    if (message.content) {
      console.log(`Agent: ${message.content}`)
    }

    // 检查停止原因
    if (response.choices[0].finish_reason === 'stop') {
      // 模型已生成最终文本回复，退出循环
      return
    }

    if (response.choices[0].finish_reason !== 'tool_calls' || !message.tool_calls) {
      console.log(`未处理的 finish_reason: ${response.choices[0].finish_reason}`)
      return
    }

    // 模型要调用工具，逐个执行并收集结果
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue

      console.log(`Tool call: ${toolCall.function.name}(${toolCall.function.arguments})`)

      let result: string
      if (toolCall.function.name === 'get_weather') {
        const input = JSON.parse(toolCall.function.arguments) as { city?: string }
        result = get_weather(input.city ?? '')
      } else {
        result = `Unknown tool: ${toolCall.function.name}`
      }

      console.log(`Tool result: ${result}`)

      // 把工具结果推回对话，继续循环让模型整合
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }
}

// 运行
runAgent('北京今天天气怎么样？适合出去跑步吗？').catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

### 运行结果

```
Tool call: get_weather({"city":"北京"})
Tool result: 晴，22°C，东南风 3 级
Agent: 北京今天天气晴朗，气温 22°C，有东南风 3 级。非常适合出去跑步！
      建议穿一件薄外套，做好防晒准备。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `tools` 声明 | `type: 'function'` 包裹，内含 `name`、`description`、`parameters`（JSON Schema） |
| `finish_reason: 'tool_calls'` | 模型需要调用工具时的停止信号 |
| `message.tool_calls` | 包含工具调用 ID、函数名、参数 JSON 字符串 |
| `role: 'tool'` 消息 | 你返回给模型的工具执行结果，通过 `tool_call_id` 关联 |
| Agent 循环 | `while(true)` 直到 `finish_reason === 'stop'`，这就是最小 Agent 循环 |

## 常见问题

**Q: 模型一定会调用工具吗？**
不一定。如果问题可以直接回答（如"1+1等于几"），模型会跳过工具调用，直接返回 `finish_reason: 'stop'`。

**Q: 可以声明多个工具吗？**
可以，`tools` 数组可以放任意数量。模型会根据问题自行选择调用哪个（甚至同时调用多个）。

**Q: 工具执行出错了怎么办？**
在 `role: 'tool'` 消息的 `content` 里返回错误信息，模型会据此调整回复。详见 P4：错误处理。

## 小结与延伸

你刚才实现的 `while(true)` 循环，就是 Agent 的核心 —— 一个**感知-思考-行动**的循环体。

接下来：
- **P2**：如何在多轮对话中保持上下文，不让 Token 无限增长
- **P10**：用同样的循环实现完整的 ReAct 推理模式

<StarCTA />
