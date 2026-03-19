---
title: P14：MCP 协议接入
description: 连接标准化工具服务器，让 Agent 接入外部能力生态
---

<ProjectCard
  title="你将构建：一个通过 MCP 接入外部工具服务器的 Agent，以及一个极简 MCP Server"
  difficulty="advanced"
  duration="60 min"
  :prerequisites="['P1', 'P4']"
  :tags="['MCP', 'Protocol', 'TypeScript', 'Anthropic SDK']"
/>

## 背景与目标

从 P1 到 P12，工具都是直接写在 Agent 代码里的：一个函数，一个 `tool` 对象，交给 Anthropic SDK 注册。这样做直接简单，但随着工具数量增长，你会撞上一个结构性问题：

**工具代码和 Agent 代码强耦合**。如果你有 3 个 Agent（代码助手、数据分析助手、文档助手），它们都需要"执行 shell 命令"这个工具，你会在三个文件里各维护一份实现。工具逻辑改一处，需要同步三处。工具要单独测试，你得把整个 Agent 启动起来。工具要共享给另一个团队，你需要把你的 Agent 代码开源或者打包成 SDK。

2024 年 11 月，Anthropic 发布了 **MCP（Model Context Protocol）**，专门解决这个问题。MCP 的核心思路很简单：把"工具"从 Agent 代码里分离出来，部署成一个独立的服务器，Agent 通过标准协议连接并使用它。

MCP 不是 Anthropic 的私有协议——它是一个开放规范，已经被 OpenAI、Google 等主流 AI 平台支持，也有大量社区实现的 MCP Server（文件系统、数据库、浏览器控制、GitHub API……）。接入 MCP 的意义在于：**你的 Agent 可以直接复用整个生态中已有的工具，而不需要自己重写**。

**本章目标**：

1. 理解 MCP Client / Server 架构和 JSON-RPC 通信机制
2. 实现一个极简 MCP Server（`p14-mcp-server.ts`），注册两个工具
3. 实现 MCP Client Agent（`p14-mcp.ts`），完成工具发现、格式转换、调用转发的完整链路

## 核心概念

### MCP 架构：Client 和 Server

MCP 把工具调用链路分成两个独立进程：

```
Agent 代码                          工具代码
┌─────────────────────┐            ┌─────────────────────┐
│  MCP Client         │  JSON-RPC  │  MCP Server         │
│  - 连接 Server       │ ─────────> │  - 注册工具          │
│  - 发现工具          │ <───────── │  - 执行工具          │
│  - 转发调用          │            │  - 返回结果          │
└─────────────────────┘            └─────────────────────┘
```

Client 运行在 Agent 进程内，负责与 Server 建立连接、获取工具列表、转发工具调用请求。Server 是一个独立进程，负责注册自己有哪些工具、接收调用请求并执行、返回结果。

两者之间的通信格式是 **JSON-RPC 2.0**：一种标准的远程调用协议，每次调用包含方法名、参数、请求 ID，响应包含结果或错误。MCP 在 JSON-RPC 之上定义了几个标准方法：

- `tools/list`：Client 询问 Server 有哪些工具
- `tools/call`：Client 请求 Server 执行某个工具

### 传输层：stdio 和 SSE

MCP 支持两种传输方式：

| 传输方式 | 适用场景 | 通信机制 |
|----------|----------|----------|
| **stdio** | Server 和 Client 在同一台机器上 | Client 启动 Server 子进程，通过标准输入/输出流通信 |
| **SSE** | Server 部署在远程 HTTP 服务器上 | Client 通过 HTTP + Server-Sent Events 连接 |

本章使用 **stdio**：Client 启动 Server 子进程，通过进程间管道传递 JSON-RPC 消息。这是开发阶段最简单的方式，不需要网络配置，Server 崩溃时子进程自动终止，不会留下僵尸服务。

### 工具发现：动态注册到 Anthropic SDK

MCP 最重要的能力是**工具发现**：Agent 启动时不需要知道 Server 有哪些工具，连接后通过 `tools/list` 动态获取。

`tools/list` 返回的工具描述格式和 Anthropic SDK 所需的 `Tool[]` 格式高度相似，但不完全一样，需要做一次格式转换：

```ts
// MCP Server 返回的工具描述（ListToolsResult）
{
  name: 'get_time',
  description: '返回当前时间',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
}

// 转换为 Anthropic SDK 的 Tool 格式
{
  name: 'get_time',
  description: '返回当前时间',
  input_schema: {        // 注意：字段名不同，MCP 用 inputSchema，Anthropic 用 input_schema
    type: 'object',
    properties: {},
    required: []
  }
}
```

转换只需要把 `inputSchema` 重命名为 `input_schema`，其余字段直接复用。

### 工具调用转发

Agent 循环里，当模型返回 `tool_use` 块时，常规做法是直接调用本地函数。接入 MCP 后，这一步变成：**向 MCP Client 发送 `tools/call` 请求，由 Client 转发给 Server 执行，再把结果返回给 Agent**。

对模型来说，这个过程完全透明——它只知道"我发起了一个工具调用，得到了结果"，并不知道工具是本地函数还是远程服务。

### 依赖安装

```bash
bun add @modelcontextprotocol/sdk
```

## 动手实现

<RunCommand command="bun run p14-mcp.ts" />

### 第一步：实现 MCP Server（p14-mcp-server.ts）

Server 是独立运行的进程，用 `@modelcontextprotocol/sdk` 的 `Server` 类注册工具，通过 `StdioServerTransport` 接收请求。

```ts
// p14-mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// 工具参数类型定义
interface GetRandomNumberParams {
  min?: number
  max?: number
}

// 类型守卫：验证 get_random_number 参数
function isGetRandomNumberParams(value: unknown): value is GetRandomNumberParams {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  if ('min' in obj && typeof obj['min'] !== 'number') return false
  if ('max' in obj && typeof obj['max'] !== 'number') return false
  return true
}

// 创建 Server 实例
const server = new Server(
  {
    name: 'p14-demo-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_time',
        description: '返回当前时间，格式：YYYY-MM-DD HH:mm:ss',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_random_number',
        description: '返回指定范围内的随机整数',
        inputSchema: {
          type: 'object',
          properties: {
            min: {
              type: 'number',
              description: '最小值（包含），默认 0',
            },
            max: {
              type: 'number',
              description: '最大值（包含），默认 100',
            },
          },
          required: [],
        },
      },
    ],
  }
})

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  if (name === 'get_time') {
    const now = new Date()
    const formatted = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return {
      content: [{ type: 'text', text: formatted }],
    }
  }

  if (name === 'get_random_number') {
    const params = isGetRandomNumberParams(args) ? args : {}
    const min = params.min ?? 0
    const max = params.max ?? 100
    const result = Math.floor(Math.random() * (max - min + 1)) + min
    return {
      content: [{ type: 'text', text: String(result) }],
    }
  }

  return {
    content: [{ type: 'text', text: `未知工具: ${name}` }],
    isError: true,
  }
})

// 启动 Server，监听 stdio
const transport = new StdioServerTransport()
await server.connect(transport)
```

### 第二步：实现 MCP Client Agent（p14-mcp.ts）

Client Agent 分三个阶段：连接 Server、发现工具、运行 Agent 循环。

```ts
// p14-mcp.ts
import Anthropic from '@anthropic-ai/sdk'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const anthropic = new Anthropic()

// 获取当前文件所在目录，用于定位 Server 脚本的绝对路径
const __dirname = path.dirname(fileURLToPath(import.meta.url))
```

### 第三步：工具发现与格式转换

```ts
// p14-mcp.ts（续）

// 连接 MCP Server，返回已转换为 Anthropic 格式的工具列表
async function connectMcpServer(client: Client): Promise<Anthropic.Tool[]> {
  // StdioClientTransport 会 spawn 一个子进程运行 Server
  const transport = new StdioClientTransport({
    command: 'bun',
    args: [path.join(__dirname, 'p14-mcp-server.ts')],
  })

  await client.connect(transport)
  console.log('[MCP Server 已启动]')

  // 获取工具列表（tools/list）
  const { tools } = await client.listTools()

  const toolNames = tools.map(t => t.name).join(', ')
  console.log(`[已发现工具: ${toolNames}]\n`)

  // 将 MCP 工具格式转换为 Anthropic SDK 格式
  // 区别只在 inputSchema -> input_schema
  return tools.map((t) => ({
    name: t.name,
    description: t.description ?? '',
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  }))
}
```

### 第四步：Agent 循环，工具调用通过 MCP 转发

```ts
// p14-mcp.ts（续）

// 通过 MCP Client 执行工具调用
async function callToolViaMcp(
  client: Client,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  console.log(`Tool call via MCP: ${toolName}(${JSON.stringify(toolInput)})`)

  const result = await client.callTool({
    name: toolName,
    arguments: toolInput,
  })

  // 提取文本内容
  const text = (result.content as Array<{ type: string; text?: string }>)
    .filter(c => c.type === 'text')
    .map(c => c.text ?? '')
    .join('')

  console.log(`Tool result: ${text}\n`)
  return text
}

// Agent 主循环
async function runAgent(client: Client, tools: Anthropic.Tool[], userMessage: string): Promise<void> {
  console.log(`用户: ${userMessage}\n`)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      tools,
      messages,
    })

    // 收集文本输出
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )

    // 处理工具调用
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      // 模型不再调用工具，输出最终回复
      const finalText = textBlocks.map(b => b.text).join('')
      console.log(`Agent: ${finalText}`)
      break
    }

    // 将模型的 assistant 消息（含工具调用）加入历史
    messages.push({ role: 'assistant', content: response.content })

    // 逐个执行工具调用，收集结果
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      const toolInput = toolUse.input as Record<string, unknown>
      const resultText = await callToolViaMcp(client, toolUse.name, toolInput)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: resultText,
      })
    }

    // 把工具结果作为 user 消息加入历史
    messages.push({ role: 'user', content: toolResults })
  }
}

// 入口：初始化 Client，连接 Server，运行 Agent
async function main(): Promise<void> {
  const client = new Client(
    { name: 'p14-demo-client', version: '1.0.0' },
    { capabilities: {} }
  )

  const tools = await connectMcpServer(client)

  await runAgent(client, tools, '现在几点了？再给我一个 1-100 的随机数')

  // 关闭连接，子进程自动终止
  await client.close()
}

main().catch(console.error)
```

### 运行结果

```
[MCP Server 已启动]
[已发现工具: get_time, get_random_number]

用户: 现在几点了？再给我一个 1-100 的随机数

Tool call via MCP: get_time({})
Tool result: 2026-03-19 14:30:22

Tool call via MCP: get_random_number({"min":1,"max":100})
Tool result: 42

Agent: 现在是 2026-03-19 14:30:22，另外我为你生成了一个 1-100 之间的随机数：42
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| MCP Client / Server 分离 | Server 是独立进程，Client 运行在 Agent 内，两者通过 JSON-RPC 通信，彻底解耦工具代码和 Agent 代码 |
| `StdioClientTransport` | Client 使用 `command` + `args` 配置启动 Server 子进程，通过进程管道（stdin/stdout）传输 JSON-RPC 消息 |
| `ListToolsRequestSchema` | Server 注册此 handler 响应 `tools/list` 请求，返回工具名、描述、inputSchema |
| `CallToolRequestSchema` | Server 注册此 handler 响应 `tools/call` 请求，根据工具名分支执行，返回 `content` 数组 |
| `inputSchema` -> `input_schema` | MCP 工具描述用 camelCase `inputSchema`，Anthropic SDK 用 snake_case `input_schema`，转换时只需重命名这一个字段 |
| `client.listTools()` | Client 在连接后调用此方法发现工具，返回 `{ tools: ListToolResult[] }`，动态获取不需要硬编码 |
| `client.callTool()` | Client 转发工具调用到 Server，参数为 `{ name, arguments }`，返回 `{ content }` |
| `client.close()` | 关闭连接后，stdio 子进程自动终止，不需要手动 kill |
| 类型守卫替代 any | `isGetRandomNumberParams` 在运行时校验参数类型，避免对 `args` 使用 `any` |

## 常见问题

**Q: MCP 和直接写工具函数有什么实际好处？**

直接写工具函数的问题出现在规模扩大时：当你有多个 Agent 需要共享工具、工具需要独立测试和部署、工具作者不是 Agent 作者时，强耦合就变成了维护负担。

MCP 的好处是解耦，但解耦是有成本的：多一个进程、多一次网络调用（即使是本地 stdio 也有序列化开销）、调试链路变长。**如果你只有一个 Agent 且工具不会被复用，直接写工具函数更简单**。MCP 适合这些场景：工具要被多个 Agent 共享、工具需要独立部署（比如需要特殊依赖或权限）、你想接入社区现有的 MCP Server 生态（文件系统、浏览器、数据库等）。

**Q: MCP Server 可以部署在远程服务器吗？**

可以，使用 **SSE 传输**替代 stdio。Server 启动一个 HTTP 服务器，Client 通过 HTTP 连接：

```ts
// Server 侧（使用 SSEServerTransport）
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express from 'express'

const app = express()
const transport = new SSEServerTransport('/mcp', res)
await server.connect(transport)
app.listen(3000)

// Client 侧（使用 SSEClientTransport）
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const transport = new SSEClientTransport(new URL('http://your-server:3000/mcp'))
await client.connect(transport)
```

SSE 传输让 MCP Server 可以集中部署、多个 Agent 同时连接，适合生产环境的工具服务化。认证方面，可以在 HTTP 层加 Bearer Token 或 API Key。

**Q: MCP Server 崩溃了怎么办？**

stdio 模式下，Server 子进程崩溃后，Client 的后续 `callTool` 调用会抛出错误（底层管道断开）。目前 MCP SDK 不内置自动重连，需要在 Client 侧用 `try/catch` 处理，并按需重新建立连接：

```ts
async function callToolWithRetry(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  retries = 1
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // ... 正常调用
      return await callToolViaMcp(client, name, args)
    } catch (err) {
      if (attempt < retries) {
        console.warn('[MCP] 调用失败，尝试重连...')
        // 重新初始化 client 和 transport
        await reconnect(client)
      } else {
        throw err
      }
    }
  }
  throw new Error('unreachable')
}
```

生产环境建议结合健康检查（定期 `client.listTools()` 验活）和监控告警，而不是仅靠重试。

## 小结与延伸

你现在有了一个完整的 MCP 工具调用链路：

- `p14-mcp-server.ts`：独立的 MCP Server，注册 `get_time` 和 `get_random_number` 两个工具，通过 stdio 运行
- `p14-mcp.ts`：MCP Client Agent，连接 Server 后动态发现工具，转换格式注册到 Anthropic SDK，工具调用通过 MCP 协议转发

这个模式的核心价值是工具和 Agent 的解耦：Server 可以独立部署、独立测试、被多个 Agent 共享。整个 MCP 生态已经有大量现成的 Server（文件系统、Git、数据库、浏览器自动化……），你的 Agent 可以直接接入，而不需要重写这些工具。

接下来可以探索的方向：

- **接入社区 MCP Server**：把 Server 脚本替换为 `@modelcontextprotocol/server-filesystem`，Agent 立刻获得文件读写能力
- **P15 多 Agent**：多个 Agent 共享同一个 MCP Server，工具实现只维护一份
- **P20 可观测性**：在 `callToolViaMcp` 中加入耗时埋点，监控每个 MCP 工具的延迟分布

<StarCTA />
