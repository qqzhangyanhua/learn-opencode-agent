---
title: 第六篇：MCP 协议集成
description: 第六篇：MCP 协议集成的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/mcp/`
> **前置阅读**：第五篇 多模型支持
> **学习目标**：理解 OpenCode 为什么把外部工具和资源接入交给 MCP，而不是继续往核心仓库里硬编码更多第三方集成

---

<SourceSnapshotCard
  title="第六篇源码快照"
  description="这一篇先抓外部能力进入系统的边界：MCP 连接怎样建立、工具与资源怎样发现、以及认证怎样被拉回 OpenCode 自己的控制面。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: 'MCP 连接入口',
      path: 'packages/opencode/src/mcp/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/mcp/index.ts'
    },
    {
      label: 'MCP 认证',
      path: 'packages/opencode/src/mcp/auth.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/mcp/auth.ts'
    },
    {
      label: 'OAuth 协调',
      path: 'packages/opencode/src/mcp/oauth-provider.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/mcp/oauth-provider.ts'
    },
    {
      label: 'MCP HTTP 路由',
      path: 'packages/opencode/src/server/routes/mcp.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/routes/mcp.ts'
    }
  ]"
/>

## 核心概念速览

学到这里，你其实已经能看到一个明显问题：

- Agent 需要越来越多外部能力
- 但核心仓库不可能无限膨胀

MCP 在 OpenCode 里的价值，正是在解决这个矛盾。

它让 OpenCode 可以：

1. 不直接内嵌所有第三方 API
2. 通过标准协议发现外部工具、资源和 prompt
3. 把认证、连接、重连和工具注册收敛到统一层

所以这一篇不该被理解成“再学一个协议”，而应该理解成：

**OpenCode 走向外部生态时，选了什么扩展边界。**

## 本章导读

### 这一章解决什么问题

这一章要解决的是：

- OpenCode 为什么没有继续把所有外部能力硬编码进核心仓库
- MCP 在这个项目里承担了哪些扩展职责
- 工具、资源、prompt 是怎样从外部服务器动态接入的
- OAuth、认证、连接恢复为什么会成为 MCP 集成的一部分

### 必看入口

- [packages/opencode/src/mcp/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/mcp/index.ts)：MCP 主入口与连接管理
- [packages/opencode/src/mcp/auth.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/mcp/auth.ts)：认证流程处理
- [packages/opencode/src/mcp/oauth-provider.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/mcp/oauth-provider.ts)：OAuth provider 协调
- [packages/opencode/src/mcp/oauth-callback.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/mcp/oauth-callback.ts)：回调收口
- [packages/opencode/src/server/routes/mcp.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/mcp.ts)：对外暴露的 MCP HTTP 接口

### 先抓一条主链路

建议先看这条链路：

```text
用户配置 MCP 服务器
  -> mcp/index.ts 建立连接
  -> 发现工具 / 资源 / prompts
  -> 注册到 OpenCode 内部能力边界
  -> 如需认证则进入 auth.ts / oauth-provider.ts
  -> 供 session / tool / command 系统消费
```

这条线先解决“外部能力怎样进入系统”，再去研究协议细节和认证细节。

### 初学者阅读顺序

1. 先读 `mcp/index.ts`，理解连接、发现、注册三个动作。
2. 再读 `server/routes/mcp.ts`，看 MCP 能力如何通过本地服务边界暴露出来。
3. 最后读 `auth.ts`、`oauth-provider.ts`、`oauth-callback.ts`，理解外部授权怎样落地。

### 最容易误解的点

- MCP 不只是“外部工具列表”，它同时带来资源、prompt 和认证链路。
- MCP 集成不是简单透传，OpenCode 仍然会把外部能力重新纳入自己的权限与会话体系。
- 协议本身不是重点，重点是它让核心仓库保持边界稳定。

## 6.1 什么是 Model Context Protocol

### MCP 的设计理念

对当前仓库来说，MCP 最值得关注的不是协议术语，而是它替 OpenCode 解决了一个扩展边界问题：Agent 需要越来越多外部能力，但核心仓库不能无限继续内嵌第三方集成。

如果继续硬编码集成，结构会越来越像这样：
```
OpenCode → 直接集成 GitHub API
OpenCode → 直接集成 Jira API
OpenCode → 直接集成 Slack API
...
```

每接一个系统，核心仓库都要额外承担：
- 编写工具定义
- 处理认证
- 维护 API 客户端
- 更新代码并发布新版本

MCP 的做法则是把这层差异外移：
```
OpenCode → MCP 协议 → MCP 服务器（GitHub）
                    → MCP 服务器（Jira）
                    → MCP 服务器（Slack）
```

也就是说，MCP 在这里本质上提供的是一套统一接入面，主要包含三类对象：
- **工具（Tools）**：AI 可以调用的函数
- **资源（Resources）**：AI 可以读取的数据
- **提示词（Prompts）**：预定义的提示词模板

### MCP 的核心概念

打开 `mcp/index.ts`，先看 MCP 在 OpenCode 里声明的核心对象：

```typescript
export namespace MCP {
  // 资源定义
  export const Resource = z.object({
    name: z.string(),           // 资源名称
    uri: z.string(),            // 资源 URI（如 "file:///path/to/file"）
    description: z.string().optional(),
    mimeType: z.string().optional(),
    client: z.string(),         // 来自哪个 MCP 服务器
  })

  // 服务器状态
  export const Status = z.discriminatedUnion("status", [
    z.object({ status: z.literal("connected") }),      // 已连接
    z.object({ status: z.literal("disabled") }),       // 已禁用
    z.object({ status: z.literal("failed"), error: z.string() }),  // 连接失败
    z.object({ status: z.literal("needs_auth") }),     // 需要认证
    z.object({
      status: z.literal("needs_client_registration"),
      error: z.string()
    }),  // 需要客户端注册
  ])
}
```

这三类对象可以直接对应到 OpenCode 里最常见的外部扩展需求：

1. **Tools（工具）**：
   ```typescript
   // MCP 服务器暴露工具
   {
     name: "github_create_issue",
     description: "Create a GitHub issue",
     inputSchema: {
       type: "object",
       properties: {
         title: { type: "string" },
         body: { type: "string" }
       }
     }
   }
   ```

2. **Resources（资源）**：
   ```typescript
   // MCP 服务器暴露资源
   {
     uri: "github://repo/issues/123",
     name: "Issue #123",
     mimeType: "application/json"
   }
   ```

3. **Prompts（提示词）**：
   ```typescript
   // MCP 服务器暴露提示词模板
   {
     name: "code_review",
     description: "Review code changes",
     arguments: [
       { name: "pr_number", required: true }
     ]
   }
   ```

---

## 6.2 MCP 服务器的发现与连接

### 配置 MCP 服务器

**位置**：`~/.opencode/config.json` 或 `.opencode/config.json`

**本地服务器配置**：

```json
{
  "mcp": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "enabled": true
    }
  }
}
```

**远程服务器配置**：

```json
{
  "mcp": {
    "github": {
      "type": "remote",
      "url": "https://mcp.github.com",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

### 连接流程

`mcp/index.ts` 里把连接建立与状态判定集中在一起：

```typescript
async function create(key: string, mcp: Config.Mcp) {
  if (mcp.enabled === false) {
    return {
      mcpClient: undefined,
      status: { status: "disabled" as const },
    }
  }

  let mcpClient: MCPClient | undefined
  let status: Status | undefined

  // 1. 远程服务器：尝试 HTTP 和 SSE 传输
  if (mcp.type === "remote") {
    const transports = [
      {
        name: "StreamableHTTP",
        transport: new StreamableHTTPClientTransport(new URL(mcp.url), {
          authProvider,
          requestInit: mcp.headers ? { headers: mcp.headers } : undefined,
        }),
      },
      {
        name: "SSE",
        transport: new SSEClientTransport(new URL(mcp.url), {
          authProvider,
          requestInit: mcp.headers ? { headers: mcp.headers } : undefined,
        }),
      },
    ]

    for (const { name, transport } of transports) {
      try {
        const client = new Client({
          name: "opencode",
          version: Installation.VERSION,
        })
        await withTimeout(client.connect(transport), connectTimeout)
        registerNotificationHandlers(client, key)
        mcpClient = client
        status = { status: "connected" }
        break
      } catch (error) {
        // 处理认证错误
        if (error instanceof UnauthorizedError) {
          status = { status: "needs_auth" as const }
          break
        }
        // 继续尝试下一个传输方式
      }
    }
  }

  // 2. 本地服务器：使用 stdio 传输
  if (mcp.type === "local") {
    const [cmd, ...args] = mcp.command
    const transport = new StdioClientTransport({
      stderr: "pipe",
      command: cmd,
      args,
      cwd: Instance.directory,
      env: {
        ...process.env,
        ...mcp.environment,
      },
    })

    try {
      const client = new Client({
        name: "opencode",
        version: Installation.VERSION,
      })
      await withTimeout(client.connect(transport), connectTimeout)
      registerNotificationHandlers(client, key)
      mcpClient = client
      status = { status: "connected" }
    } catch (error) {
      status = {
        status: "failed" as const,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // 3. 获取工具列表
  const result = await mcpClient.listTools().catch((err) => {
    log.error("failed to get tools from client", { key, error: err })
    return undefined
  })

  if (!result) {
    await mcpClient.close()
    return {
      mcpClient: undefined,
      status: { status: "failed", error: "Failed to get tools" },
    }
  }

  return { mcpClient, status }
}
```

**连接策略**：
1. 远程服务器：先尝试 StreamableHTTP，失败则尝试 SSE
2. 本地服务器：使用 stdio（标准输入输出）
3. 连接成功后立即获取工具列表验证

### 传输方式对比

| 传输方式 | 适用场景 | 优点 | 缺点 |
|---------|---------|------|------|
| **StreamableHTTP** | 远程服务器 | 双向流式、高效 | 需要服务器支持 |
| **SSE** | 远程服务器 | 兼容性好 | 单向流式 |
| **stdio** | 本地进程 | 简单、快速 | 仅限本地 |

---

## 6.3 工具与资源的动态注册

### 工具转换

MCP 工具需要先转换为 AI SDK 可调用的工具对象，这段逻辑也在 `mcp/index.ts`：

```typescript
async function convertMcpTool(
  mcpTool: MCPToolDef,
  client: MCPClient,
  timeout?: number
): Promise<Tool> {
  const inputSchema = mcpTool.inputSchema

  // 确保 schema 是 object 类型
  const schema: JSONSchema7 = {
    ...(inputSchema as JSONSchema7),
    type: "object",
    properties: (inputSchema.properties ?? {}) as JSONSchema7["properties"],
    additionalProperties: false,
  }

  return dynamicTool({
    description: mcpTool.description ?? "",
    inputSchema: jsonSchema(schema),
    execute: async (args: unknown) => {
      // 调用 MCP 服务器的工具
      return client.callTool(
        {
          name: mcpTool.name,
          arguments: (args || {}) as Record<string, unknown>,
        },
        CallToolResultSchema,
        {
          resetTimeoutOnProgress: true,
          timeout,
        },
      )
    },
  })
}
```

**转换流程**：
1. 提取 MCP 工具的 JSON Schema
2. 创建 AI SDK 的 `dynamicTool`
3. `execute` 函数调用 MCP 服务器

### 工具命名规范

`mcp/index.ts` 里还专门处理了工具命名规范：

```typescript
export async function tools() {
  const result: Record<string, Tool> = {}
  const clientsSnapshot = await clients()

  for (const [clientName, client] of Object.entries(clientsSnapshot)) {
    const toolsResult = await client.listTools()

    for (const mcpTool of toolsResult.tools) {
      // 清理名称：只保留字母数字和下划线
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9_-]/g, "_")
      const sanitizedToolName = mcpTool.name.replace(/[^a-zA-Z0-9_-]/g, "_")

      // 工具名称格式：clientName_toolName
      const toolKey = sanitizedClientName + "_" + sanitizedToolName

      result[toolKey] = await convertMcpTool(mcpTool, client, timeout)
    }
  }

  return result
}
```

**命名规则**：
- 格式：`{服务器名}_{工具名}`
- 示例：`github_create_issue`、`filesystem_read_file`
- 避免冲突：不同服务器的同名工具会有不同前缀

### 资源读取

资源读取逻辑同样在 `mcp/index.ts` 里：

```typescript
export async function readResource(clientName: string, resourceUri: string) {
  const clientsSnapshot = await clients()
  const client = clientsSnapshot[clientName]

  if (!client) {
    log.warn("client not found for resource", { clientName })
    return undefined
  }

  const result = await client
    .readResource({
      uri: resourceUri,
    })
    .catch((e) => {
      log.error("failed to read resource from MCP server", {
        clientName,
        resourceUri,
        error: e.message,
      })
      return undefined
    })

  return result
}
```

**使用示例**：
```typescript
// 读取 GitHub issue
const issue = await MCP.readResource("github", "github://repo/issues/123")

// 读取本地文件
const file = await MCP.readResource("filesystem", "file:///path/to/file.txt")
```

### 动态工具更新

MCP 服务器可以动态添加或删除工具，这部分通知处理也放在 `mcp/index.ts`：

```typescript
function registerNotificationHandlers(client: MCPClient, serverName: string) {
  client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
    log.info("tools list changed notification received", { server: serverName })
    Bus.publish(ToolsChanged, { server: serverName })
  })
}
```

**流程**：
1. MCP 服务器发送 `tools/list_changed` 通知
2. OpenCode 接收通知并发布事件
3. 重新获取工具列表
4. 更新可用工具

---

## 6.4 OAuth 认证流程实现

### 认证为什么会成为 MCP 集成的一部分？

远程 MCP 服务器通常需要认证：
- GitHub MCP：需要 GitHub OAuth
- Slack MCP：需要 Slack OAuth
- 自定义 MCP：可能需要自定义 OAuth

### OAuth 配置

```json
{
  "mcp": {
    "github": {
      "type": "remote",
      "url": "https://mcp.github.com",
      "oauth": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret",
        "scope": "repo read:user"
      }
    }
  }
}
```

**自动发现模式**（推荐）：
```json
{
  "mcp": {
    "github": {
      "type": "remote",
      "url": "https://mcp.github.com"
      // OAuth 配置会自动从服务器获取
    }
  }
}
```

### OAuth 流程

`mcp/index.ts` 里可以看到完整的认证发起流程：

```typescript
export async function authenticate(mcpName: string): Promise<Status> {
  // 1. 启动认证流程
  const { authorizationUrl } = await startAuth(mcpName)

  if (!authorizationUrl) {
    // 已经认证
    return { status: "connected" }
  }

  // 2. 生成并存储 state 参数（防止 CSRF）
  const oauthState = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  await McpAuth.updateOAuthState(mcpName, oauthState)

  // 3. 注册回调监听器
  const callbackPromise = McpOAuthCallback.waitForCallback(oauthState)

  // 4. 打开浏览器
  try {
    await open(authorizationUrl)
  } catch (error) {
    // 浏览器打开失败（如 SSH 会话）
    log.warn("failed to open browser, user must open URL manually", { mcpName, error })
    Bus.publish(BrowserOpenFailed, { mcpName, url: authorizationUrl })
  }

  // 5. 等待回调
  const code = await callbackPromise

  // 6. 验证 state
  const storedState = await McpAuth.getOAuthState(mcpName)
  if (storedState !== oauthState) {
    await McpAuth.clearOAuthState(mcpName)
    throw new Error("OAuth state mismatch - potential CSRF attack")
  }

  await McpAuth.clearOAuthState(mcpName)

  // 7. 完成认证
  return finishAuth(mcpName, code)
}
```

**OAuth 流程图**：

```
用户运行命令
  ↓
opencode mcp auth github
  ↓
生成 state 参数
  ↓
启动本地回调服务器（http://localhost:3000）
  ↓
打开浏览器 → GitHub 授权页面
  ↓
用户授权
  ↓
GitHub 重定向 → http://localhost:3000/callback?code=xxx&state=yyy
  ↓
验证 state
  ↓
用 code 换取 access_token
  ↓
存储 token
  ↓
重新连接 MCP 服务器
```

### Token 存储

`mcp/auth.ts` 负责把 token 与客户端信息落盘：

```typescript
export namespace McpAuth {
  export const Tokens = z.object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.number().optional(),
    scope: z.string().optional(),
  })

  export const Entry = z.object({
    tokens: Tokens.optional(),
    clientInfo: ClientInfo.optional(),
    codeVerifier: z.string().optional(),
    oauthState: z.string().optional(),
    serverUrl: z.string().optional(),
  })

  const filepath = path.join(Global.Path.data, "mcp-auth.json")

  export async function updateTokens(
    mcpName: string,
    tokens: Tokens,
    serverUrl?: string
  ): Promise<void> {
    const entry = (await get(mcpName)) ?? {}
    entry.tokens = tokens
    await set(mcpName, entry, serverUrl)
  }

  export async function isTokenExpired(mcpName: string): Promise<boolean | null> {
    const entry = await get(mcpName)
    if (!entry?.tokens) return null
    if (!entry.tokens.expiresAt) return false
    return entry.tokens.expiresAt < Date.now() / 1000
  }
}
```

**存储位置**：`~/.opencode/mcp-auth.json`

**安全措施**：
- 文件权限：`0o600`（仅所有者可读写）
- 存储 refresh_token 用于自动刷新
- 记录 token 过期时间

### 使用 CLI 认证

```bash
# 查看 MCP 服务器状态
opencode mcp status

# 认证 MCP 服务器
opencode mcp auth github

# 移除认证
opencode mcp auth github --remove
```

---

## 6.5 开发自己的 MCP 服务器

### 最简单的 MCP 服务器

**安装 SDK**：
```bash
npm install @modelcontextprotocol/sdk
```

**创建服务器**（`my-mcp-server.ts`）：

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

// 1. 创建服务器
const server = new Server(
  {
    name: "my-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},  // 支持工具
    },
  },
)

// 2. 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_weather",
        description: "Get weather for a city",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "City name",
            },
          },
          required: ["city"],
        },
      },
    ],
  }
})

// 3. 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_weather") {
    const city = request.params.arguments?.city as string

    // 实际应用中这里会调用天气 API
    const weather = {
      city,
      temperature: 22,
      condition: "Sunny",
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(weather, null, 2),
        },
      ],
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`)
})

// 4. 启动服务器
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("MCP server running on stdio")
}

main().catch(console.error)
```

### 配置 OpenCode 使用自定义服务器

```json
{
  "mcp": {
    "weather": {
      "type": "local",
      "command": ["node", "/path/to/my-mcp-server.js"]
    }
  }
}
```

### 测试服务器

```bash
# 启动 OpenCode
bun dev

# 查看可用工具
> /tools

# 应该看到 weather_get_weather

# 调用工具
> 帮我查询北京的天气
```

### 添加资源支持

```typescript
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

// 注册资源列表
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "weather://beijing",
        name: "Beijing Weather",
        description: "Current weather in Beijing",
        mimeType: "application/json",
      },
    ],
  }
})

// 注册资源读取
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri

  if (uri === "weather://beijing") {
    const weather = {
      city: "Beijing",
      temperature: 22,
      condition: "Sunny",
    }

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(weather, null, 2),
        },
      ],
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})
```

### 添加提示词支持

```typescript
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

// 注册提示词列表
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "weather_report",
        description: "Generate a weather report",
        arguments: [
          {
            name: "city",
            description: "City name",
            required: true,
          },
        ],
      },
    ],
  }
})

// 注册提示词获取
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "weather_report") {
    const city = request.params.arguments?.city as string

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a detailed weather report for ${city}. Include temperature, conditions, and recommendations.`,
          },
        },
      ],
    }
  }

  throw new Error(`Unknown prompt: ${request.params.name}`)
})
```

### 发布 MCP 服务器

**1. 发布到 npm**：

```json
{
  "name": "@your-org/mcp-weather",
  "version": "1.0.0",
  "bin": {
    "mcp-weather": "./dist/index.js"
  },
  "files": ["dist"]
}
```

```bash
npm publish
```

**2. 用户安装**：

```json
{
  "mcp": {
    "weather": {
      "type": "local",
      "command": ["npx", "-y", "@your-org/mcp-weather"]
    }
  }
}
```

**3. 提交到 MCP 服务器目录**：

https://github.com/modelcontextprotocol/servers

---

## 本章小结

### 核心概念

1. **MCP 协议**
   - 开放协议：定义 AI 与外部工具的通信标准
   - 三种能力：Tools（工具）、Resources（资源）、Prompts（提示词）
   - 传输方式：StreamableHTTP、SSE、stdio

2. **服务器连接**
   - 本地服务器：通过 stdio 启动进程
   - 远程服务器：通过 HTTP/SSE 连接
   - 状态管理：connected/disabled/failed/needs_auth

3. **工具注册**
   - 动态转换：MCP 工具 → AI SDK 工具
   - 命名规范：`{服务器名}_{工具名}`
   - 动态更新：监听 `tools/list_changed` 通知

4. **OAuth 认证**
   - 自动发现：从服务器获取 OAuth 配置
   - PKCE 流程：防止授权码拦截
   - Token 管理：存储、刷新、过期检测

5. **自定义开发**
   - MCP SDK：`@modelcontextprotocol/sdk`
   - 三种处理器：ListTools、CallTool、ListResources
   - 发布方式：npm 包或本地脚本

### 关键代码位置

| 功能 | 文件路径 |
|------|---------|
| MCP 核心 | `packages/opencode/src/mcp/index.ts` |
| OAuth 认证 | `packages/opencode/src/mcp/auth.ts` |
| OAuth 提供商 | `packages/opencode/src/mcp/oauth-provider.ts` |
| OAuth 回调 | `packages/opencode/src/mcp/oauth-callback.ts` |
| CLI 命令 | `packages/opencode/src/cli/cmd/mcp.ts` |
| 配置定义 | `packages/opencode/src/config/config.ts` |

### 设计模式总结

#### 1. 适配器模式

```typescript
// MCP 工具 → AI SDK 工具
async function convertMcpTool(mcpTool: MCPToolDef): Promise<Tool> {
  return dynamicTool({
    description: mcpTool.description,
    inputSchema: jsonSchema(mcpTool.inputSchema),
    execute: async (args) => {
      return client.callTool({ name: mcpTool.name, arguments: args })
    },
  })
}
```

**好处**：
- 隔离 MCP 协议细节
- 统一工具接口
- 易于扩展

#### 2. 观察者模式

```typescript
// 监听工具列表变化
client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
  Bus.publish(ToolsChanged, { server: serverName })
})
```

**好处**：
- 解耦服务器和客户端
- 支持动态更新
- 事件驱动

#### 3. 策略模式

```typescript
// 不同传输方式
const transports = [
  { name: "StreamableHTTP", transport: new StreamableHTTPClientTransport(...) },
  { name: "SSE", transport: new SSEClientTransport(...) },
]

for (const { name, transport } of transports) {
  try {
    await client.connect(transport)
    break
  } catch (error) {
    // 尝试下一个
  }
}
```

**好处**：
- 灵活切换传输方式
- 自动降级
- 易于添加新传输

### 实践建议

1. **开发 MCP 服务器**
   - 从简单工具开始
   - 使用 TypeScript 获得类型安全
   - 提供清晰的错误消息
   - 添加日志便于调试

2. **配置 MCP 服务器**
   - 优先使用 OAuth 自动发现
   - 设置合理的超时时间
   - 使用环境变量传递敏感信息
   - 测试连接失败场景

3. **安全考虑**
   - 验证 OAuth state 参数
   - 使用 PKCE 防止授权码拦截
   - 限制文件权限（0o600）
   - 定期刷新 token

### 源码阅读路径

1. 先看 `packages/opencode/src/mcp/index.ts`，理解 OpenCode 怎样维护 MCP 客户端和连接状态。
2. 再看 `packages/opencode/src/mcp/auth.ts`、`oauth-provider.ts`、`oauth-callback.ts`，串起认证链路。
3. 最后读 `packages/opencode/src/cli/cmd/mcp.ts` 和 `server/routes/mcp.ts`，看 MCP 是怎样同时接到 CLI 和 HTTP 层的。

### 任务

判断 OpenCode 的 MCP 集成为什么首先是在管理“外部能力接入边界”，而不是简单列出一批第三方工具。

### 操作

1. 打开 `packages/opencode/src/mcp/index.ts`，梳理 OpenCode 怎样维护 MCP 客户端、连接状态和可用能力。
2. 再读 `auth.ts`、`oauth-provider.ts`、`oauth-callback.ts`，画出一条 OAuth 认证链路的起点、关键中转点和最终落盘或生效的位置。
3. 最后读 `packages/opencode/src/cli/cmd/mcp.ts` 和 `packages/opencode/src/server/routes/mcp.ts`，确认 MCP 为什么会同时接到 CLI 和 HTTP 层。

### 验收

完成后你应该能说明：

- 为什么 MCP 集成的核心不是工具数量，而是连接、认证和协议边界。
- 为什么 StreamableHTTP、SSE、stdio 这几种传输方式不能被粗暴看成一回事。
- 为什么同一套 MCP 状态既要能被 CLI 管理，也要能被服务端路由消费。

### 下一篇预告

**第七篇：TUI 终端界面（Terminal User Interface）**

我们将深入 `packages/opencode/src/cli/cmd/tui/` 目录，学习：
- 为什么终端前端会演化成 TUI 工作台
- SolidJS + OpenTUI 技术栈
- 响应式状态管理
- 键盘快捷键与交互设计
- 主题系统与可定制化

---

### 思考题

1. 为什么 MCP 需要三种传输方式（StreamableHTTP/SSE/stdio）？
2. OAuth 的 state 参数有什么作用？为什么要验证它？
3. 如果你要开发一个 Jira MCP 服务器，需要实现哪些工具？

（提示：答案都在本章的代码示例中）
