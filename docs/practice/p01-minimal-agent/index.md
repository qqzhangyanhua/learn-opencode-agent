---
title: P1：最小 Agent — 工具调用核心机制
description: 用 80 行 TypeScript 构建你的第一个可运行 Agent，理解工具调用的完整生命周期
---

<ProjectCard
  title="你将构建：一个可以查询天气的最小 Agent"
  difficulty="beginner"
  duration="45 min"
  :prerequisites="[]"
  :tags="['Anthropic SDK', 'Tool Calling', 'TypeScript']"
/>

## 背景与目标

大多数人第一次用 LLM API，都是这样写的：

```ts
const response = await client.messages.create({
  model: 'claude-opus-4-6',
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
3. **执行**：你的代码接收到 `tool_use` 块，调用真实函数并返回结果
4. **整合**：把工具结果放回对话，模型生成最终回复

## 动手实现

<RunCommand command="bun run p01-minimal-agent.ts" />

### 第一步：声明工具

```ts
// p01-minimal-agent.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// 工具声明：告诉模型这个工具做什么、需要什么参数
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: '查询指定城市的当前天气',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，如"北京"、"上海"'
        }
      },
      required: ['city']
    }
  }
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
async function runAgent(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage }
  ]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      tools,
      messages,
    })

    // 将模型回复加入对话历史
    messages.push({ role: 'assistant', content: response.content })

    // 检查停止原因
    if (response.stop_reason === 'end_turn') {
      // 模型已生成最终文本回复，退出循环
      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
      console.log('Agent:', text)
      break
    }

    if (response.stop_reason === 'tool_use') {
      // 模型要调用工具，逐个执行并收集结果
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        console.log(`Tool call: ${block.name}(${JSON.stringify(block.input)})`)

        let result: string
        if (block.name === 'get_weather') {
          const input = block.input as { city: string }
          result = get_weather(input.city)
        } else {
          result = `Unknown tool: ${block.name}`
        }

        console.log(`Tool result: ${result}`)

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }

      // 把工具结果推回对话，继续循环让模型整合
      messages.push({ role: 'user', content: toolResults })
    }
  }
}

// 运行
runAgent('北京今天天气怎么样？适合出去跑步吗？')
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
| `tools` 声明 | JSON Schema 格式，模型靠这个理解工具能力 |
| `stop_reason: 'tool_use'` | 模型需要调用工具时的停止信号 |
| `tool_use` block | 包含工具名、参数、调用 ID |
| `tool_result` block | 你返回给模型的工具执行结果 |
| Agent 循环 | `while(true)` 直到 `end_turn`，这就是最小 Agent 循环 |

## 常见问题

**Q: 模型一定会调用工具吗？**
不一定。如果问题可以直接回答（如"1+1等于几"），模型会跳过工具调用，直接返回 `end_turn`。

**Q: 可以声明多个工具吗？**
可以，`tools` 数组可以放任意数量。模型会根据问题自行选择调用哪个（甚至同时调用多个）。

**Q: 工具执行出错了怎么办？**
在 `tool_result` 的 `content` 里返回错误信息，模型会据此调整回复。详见 P4：错误处理。

## 小结与延伸

你刚才实现的 `while(true)` 循环，就是 Agent 的核心 —— 一个**感知-思考-行动**的循环体。

接下来：
- **P2**：如何在多轮对话中保持上下文，不让 Token 无限增长
- **P10**：用同样的循环实现完整的 ReAct 推理模式

<StarCTA />
