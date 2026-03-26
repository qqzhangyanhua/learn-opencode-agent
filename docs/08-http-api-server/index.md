---
title: 第9章：HTTP API 服务器
description: 深入 Hono 框架驱动的 API 服务器，理解路由组织、SSE 推送、OpenAPI 自动生成与工作区上下文注入机制
contentType: theory
series: book
contentId: book-08-http-api-server
shortTitle: HTTP API 服务器
summary: 深入 Hono 框架驱动的 API 服务器，理解路由组织、SSE 推送、OpenAPI 自动生成与工作区上下文注入机制
difficulty: intermediate
estimatedTime: 20 分钟
learningGoals:
  - 理解 Hono 中间件链的设计
  - SSE 事件总线与 HTTP 流式响应的两种模式
  - 以及工作区上下文注入机制
prerequisites:
  - 第8章 TUI 终端界面
  - 第5章 会话管理
recommendedNext:
  - /09-data-persistence/
  - /practice/
practiceLinks:
  - /practice/
  - /reading-map
searchTags:
  - HTTP API 服务器
  - OpenCode
  - 源码阅读
navigationLabel: HTTP API 服务器
entryMode: read-first
roleDescription: 深入 HTTP API 服务器设计，理解 SSE 流式传输机制。
---
<ChapterLearningGuide />

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/server/`
> **前置阅读**：第8章 TUI 终端界面、第5章 会话管理
> **学习目标**：理解 Hono 中间件链的设计、SSE 事件总线与 HTTP 流式响应的两种模式，以及工作区上下文注入机制

---

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- 为什么 OpenCode 需要一个独立的 HTTP API 服务器，而不是把逻辑直接嵌入 TUI
- Hono 中间件链的每一层各负责什么
- SSE 全局事件总线和 HTTP Stream 单次响应有什么区别，为什么需要两种模式
- 工作区上下文如何通过 AsyncLocalStorage 注入到每个请求

### 必看入口

- [packages/opencode/src/server/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/server.ts)：`createApp` 中间件链定义
- [packages/opencode/src/server/routes/session.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/session.ts)：Session 路由（最复杂的部分）
- [packages/opencode/src/server/error.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/error.ts)：`NamedError` 统一错误体系

### 先抓一条主链路

```text
客户端发出 POST /session/:id/message
  -> onError 注册（兜底）
  -> BasicAuth 检查
  -> CORS 白名单过滤
  -> 工作区上下文注入（Instance.provide）
  -> SessionRoutes -> 消息处理
  -> stream() 写入最终结果
  -> SSE /event 广播实时进度给所有客户端
```

### 初学者阅读顺序

1. 先读 `server.ts` 中的 `createApp`，理解中间件链的全貌。
2. 再读 `routes/session.ts`，重点看 `POST /:sessionID/message` 和 `GET /event`。
3. 最后看 `error.ts`，理解 `NamedError` 如何统一错误响应格式。

### 最容易误解的点

- `GET /event`（SSE）和 `POST /session/:id/message`（HTTP Stream）是两套不同机制，前者广播给所有客户端，后者只响应单个请求。
- 工作区上下文注入用的是 AsyncLocalStorage，不是函数参数传递——这和 React Context 的思想一致。
- 未匹配路径会被代理到 `app.opencode.ai`，所以同一端口能同时提供 API 和 Web UI。

## 9.1 为什么需要一个独立的 API 服务器？

OpenCode 从立项之初就确立了一个原则：**核心逻辑只实现一次，但可以被多个前端消费**。

TUI 是第一个客户端，Web 应用是第二个，Tauri 桌面端是第三个，VS Code 扩展是第四个。如果核心逻辑直接嵌入 TUI，其他客户端就无从复用。

解决方案是让 `packages/opencode` 同时扮演两个角色：

```
opencode [目录]           →  TUI 模式：启动服务器 + 挂载 TUI
opencode serve [目录]     →  无头模式：只启动服务器，等待外部客户端连接
```

无论哪种模式，HTTP API 服务器都在运行。这是整个多端架构的基础。

```mermaid
graph LR
    CLI[CLI\n终端] --> HTTP[HTTP Server\n:4096]
    WEB[Web App\nSolidJS] --> HTTP
    DESK[Desktop\nTauri] --> HTTP
    SDK[JS SDK] --> HTTP

    HTTP --> AUTH[认证中间件]
    AUTH --> ROUTER[路由分发]
    ROUTER --> SESS[/session/*\n会话 API]
    ROUTER --> PROV[/provider/*\n模型 API]
    ROUTER --> WORK[/workspace/*\n工作区 API]

    SESS --> PROC[processor.ts]
    SESS --> SSE[SSE 事件流]
    SSE -.->|实时推送| WEB

    style HTTP fill:#1d4ed8,color:#fff
    style PROC fill:#065f46,color:#fff
```

## 9.2 技术选型：为什么选 Hono？

Node.js 生态里的 HTTP 框架从不缺选择，但 OpenCode 选择了 Hono。原因很实际：

| 关注点 | Hono 的优势 |
|--------|------------|
| 运行时兼容 | 原生支持 Bun、Node.js、Deno、Cloudflare Workers，无需 polyfill |
| 类型安全 | 路由级别的完整 TypeScript 类型推导 |
| 中间件 | 内置 CORS、BasicAuth、SSE、proxy、WebSocket |
| OpenAPI | `hono-openapi` 插件一键从代码生成规范文档 |
| 体积 | 极轻量，无外部运行时依赖 |

OpenCode 大量使用了 `hono-openapi` 提供的 `describeRoute` + `validator` + `resolver` 三件套，使每个路由处理函数同时承担"业务逻辑"和"API 文档"两项职责。

## 9.3 服务器入口：createApp 的中间件链

服务器的核心工厂函数在 `packages/opencode/src/server/server.ts`：

```typescript
export const createApp = (opts: { cors?: string[] }): Hono => {
  const app = new Hono()
  return app
    .onError(...)       // 1. 统一错误处理
    .use(...)           // 2. BasicAuth 鉴权（可选）
    .use(...)           // 3. 请求日志
    .use(cors(...))     // 4. CORS 白名单
    .route("/global", GlobalRoutes())
    .put("/auth/:providerID", ...)   // 5. 认证凭据管理
    .delete("/auth/:providerID", ...)
    .use(async (c, next) => {       // 6. 工作区上下文注入
      return WorkspaceContext.provide({
        workspaceID: ...,
        async fn() {
          return Instance.provide({ directory, init, async fn() { return next() } })
        },
      })
    })
    .use(WorkspaceRouterMiddleware)
    .get("/doc", openAPIRouteHandler(...))  // 7. OpenAPI 文档
    .route("/session", SessionRoutes())
    .route("/provider", ProviderRoutes())
    // ... 更多路由
    .get("/event", ...)             // 8. SSE 事件流
    .all("/*", ...)                 // 9. 兜底代理到 app.opencode.ai
}
```

中间件按顺序执行，每一层都有明确职责。让我们逐层深入。

## 9.4 第一层：统一错误处理

`.onError` 是 Hono 的全局错误捕获器：

```typescript
.onError((err, c) => {
  if (err instanceof NamedError) {
    let status: ContentfulStatusCode
    if (err instanceof NotFoundError)              status = 404
    else if (err instanceof Provider.ModelNotFoundError) status = 400
    else if (err.name.startsWith("Worktree"))      status = 400
    else                                            status = 500
    return c.json(err.toObject(), { status })
  }
  if (err instanceof HTTPException) return err.getResponse()
  const message = err instanceof Error && err.stack ? err.stack : err.toString()
  return c.json(new NamedError.Unknown({ message }).toObject(), { status: 500 })
})
```

**关键设计**：`NamedError` 是 OpenCode 的自定义错误基类。所有业务层抛出的错误都继承自它，因此在这里可以统一分类为 HTTP 状态码，并以结构化 JSON 返回。路由处理函数可以放心地 `throw new NotFoundError(...)`，不需要每个路由都写 `try/catch`。

`server/error.ts` 提供了辅助函数，避免重复写 400/404 的响应 Schema：

```typescript
export function errors(...codes: number[]) {
  return Object.fromEntries(codes.map((code) => [code, ERRORS[code as keyof typeof ERRORS]]))
}

// 使用：在路由的 responses 字段里展开
describeRoute({
  responses: {
    200: { ... },
    ...errors(400, 404),  // 自动引入 400 和 404 的 Schema
  },
})
```

## 9.5 第二层：可选的 BasicAuth

```typescript
.use((c, next) => {
  if (c.req.method === "OPTIONS") return next()  // CORS 预检不需要鉴权
  const password = Flag.OPENCODE_SERVER_PASSWORD
  if (!password) return next()                   // 未设置密码时跳过
  const username = Flag.OPENCODE_SERVER_USERNAME ?? "opencode"
  return basicAuth({ username, password })(c, next)
})
```

通过环境变量 `OPENCODE_SERVER_PASSWORD` 启用 BasicAuth。这对"在远程服务器上运行 `opencode serve`，本地通过 SSH 隧道连接"的场景很有用。注意 CORS OPTIONS 预检请求被豁免，否则浏览器客户端会因为预检失败而无法正常工作。

## 9.6 第三层：CORS 精细白名单

CORS 配置直接影响哪些 Web 应用可以调用 API：

```typescript
.use(cors({
  origin(input) {
    if (!input) return
    if (input.startsWith("http://localhost:")) return input  // 本地开发
    if (input.startsWith("http://127.0.0.1:")) return input
    if (["tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"]
        .includes(input)) return input  // Tauri 桌面端
    if (/^https:\/\/([a-z0-9-]+\.)*opencode\.ai$/.test(input)) return input  // *.opencode.ai
    if (opts?.cors?.includes(input)) return input  // 命令行传入的自定义域名
    return  // 其他来源：拒绝
  },
}))
```

白名单涵盖四类来源：本地开发服务器、Tauri 桌面应用（有三种不同的 Origin 格式）、opencode.ai 旗下的所有子域名，以及启动时通过 `--cors` 参数指定的自定义域名。`origin` 函数返回字符串则允许，返回 `undefined` 则拒绝。

## 9.7 第四层：工作区上下文注入

这是整个中间件链中最核心的一层，也是最体现 OpenCode 架构思想的地方：

```typescript
.use(async (c, next) => {
  if (c.req.path === "/log") return next()

  const rawWorkspaceID = c.req.query("workspace") || c.req.header("x-opencode-workspace")
  const raw = c.req.query("directory") || c.req.header("x-opencode-directory") || process.cwd()
  const directory = Filesystem.resolve(decodeURIComponent(raw))

  return WorkspaceContext.provide({
    workspaceID: rawWorkspaceID ? WorkspaceID.make(rawWorkspaceID) : undefined,
    async fn() {
      return Instance.provide({
        directory,
        init: InstanceBootstrap,
        async fn() { return next() },
      })
    },
  })
})
```

每个请求在进入业务路由之前，都会先：

1. 从查询参数或请求头读取 `directory`（默认 `process.cwd()`）
2. 通过 `Instance.provide()` 初始化该目录对应的项目实例（按需创建）
3. 将实例绑定到当前**异步上下文**（AsyncLocalStorage）

这意味着路由处理函数可以直接调用 `Instance.directory`、`Instance.worktree` 等，无需显式传递参数。一台服务器可以同时服务多个工作目录，每个请求自动路由到对应的项目实例。

这和 React 的 `Context` API 在设计思想上一脉相承：不是把依赖一层一层传下去，而是注入到一个"环境"里，需要的地方直接取。

## 9.8 路由组织：模块化 Hono 子路由

所有业务路由按资源类型拆分为独立文件，挂载到对应路径：

```
/global      →  GlobalRoutes()    # 全局配置
/session     →  SessionRoutes()   # 会话管理（最复杂）
/project     →  ProjectRoutes()   # 项目信息
/pty         →  PtyRoutes()       # 伪终端
/config      →  ConfigRoutes()    # 配置读写
/mcp         →  McpRoutes()       # MCP 服务器管理
/provider    →  ProviderRoutes()  # LLM 提供商
/permission  →  PermissionRoutes() # 权限响应
/question    →  QuestionRoutes()  # 用户问答
/tui         →  TuiRoutes()       # TUI 专用
/            →  FileRoutes()      # 文件读取（注意挂在根路径）
```

每个子路由都是一个标准的 Hono 实例，通过 `.route()` 方法挂载。这种设计让每个路由模块可以独立测试，也可以独立演进。

## 9.9 Session 路由：API 的核心

Session 路由是 OpenCode API 最丰富的部分，`routes/session.ts` 有近千行。它完整体现了 RESTful 设计加流式扩展的混合风格：

### 标准 CRUD

```
GET    /session              # 列表（支持 directory/roots/start/search/limit 过滤）
GET    /session/status       # 所有会话的当前状态
GET    /session/:id          # 获取单个会话
POST   /session              # 创建新会话
DELETE /session/:id          # 删除会话
PATCH  /session/:id          # 更新标题或归档状态
```

`GET /session` 使用 `for await...of` 异步生成器遍历数据库，支持流式返回大量会话：

```typescript
async (c) => {
  const query = c.req.valid("query")
  const sessions: Session.Info[] = []
  for await (const session of Session.list({
    directory: query.directory,
    roots: query.roots,
    start: query.start,
    search: query.search,
    limit: query.limit,
  })) {
    sessions.push(session)
  }
  return c.json(sessions)
}
```

### 会话特殊操作

```
POST /session/:id/init       # 初始化，生成 AGENTS.md
POST /session/:id/fork       # 从指定消息点分叉出新会话
POST /session/:id/abort      # 中止正在运行的 AI 处理
POST /session/:id/share      # 生成分享链接
DELETE /session/:id/share    # 撤销分享
GET  /session/:id/diff       # 获取某条消息对应的文件变更 diff
POST /session/:id/summarize  # LLM 压缩（第5章详述）
POST /session/:id/revert     # 撤销消息效果
POST /session/:id/unrevert   # 恢复被撤销的消息
```

fork 是一个特别有价值的功能：允许用户从历史某个时间点"另开一条时间线"，尝试不同的解决思路，而不破坏原来的会话记录。

### 消息层 API

```
GET    /session/:id/message                        # 获取所有消息
GET    /session/:id/message/:msgID                 # 获取单条消息
DELETE /session/:id/message/:msgID                 # 删除消息
DELETE /session/:id/message/:msgID/part/:partID    # 删除某个 Part
PATCH  /session/:id/message/:msgID/part/:partID    # 更新某个 Part
```

消息 API 直接操作第5章介绍的 `MessageV2` Part 结构，粒度细到单个 Part 的增删改。

## 9.10 流式响应：两种截然不同的模式

OpenCode 服务器使用了两种流式技术，针对不同的场景。

### 模式一：`streamSSE` — 全局事件总线

`GET /event` 是服务器的"广播频道"，所有客户端都应连接它来实时同步状态：

```typescript
.get("/event", async (c) => {
  c.header("X-Accel-Buffering", "no")     // 禁用 Nginx 代理缓冲
  c.header("X-Content-Type-Options", "nosniff")
  return streamSSE(c, async (stream) => {
    // 立即发送连接确认
    stream.writeSSE({
      data: JSON.stringify({ type: "server.connected", properties: {} }),
    })

    // 订阅 Bus 上的所有事件，转发到 SSE 流
    const unsub = Bus.subscribeAll(async (event) => {
      await stream.writeSSE({ data: JSON.stringify(event) })
      if (event.type === Bus.InstanceDisposed.type) {
        stream.close()  // 实例销毁时关闭流
      }
    })

    // 每 10 秒发送一次心跳，防止代理服务器因超时关闭连接
    const heartbeat = setInterval(() => {
      stream.writeSSE({
        data: JSON.stringify({ type: "server.heartbeat", properties: {} }),
      })
    }, 10_000)

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        clearInterval(heartbeat)
        unsub()
        resolve()
      })
    })
  })
})
```

SSE（Server-Sent Events）协议格式非常简单：每条消息以 `data: <content>\n\n` 格式发送，客户端通过浏览器原生的 `EventSource` API 接收。OpenCode 直接把 `BusEvent` 序列化为 JSON，事件的 `type` 字段告诉客户端如何处理。

**心跳设计**：10 秒一次的心跳是生产环境的必要措施。很多反向代理（Nginx、Caddy、AWS ALB）会在连接空闲一段时间后断开，心跳确保连接始终活跃。第8章介绍的 TUI SDKProvider 中的 `reconnect` 逻辑，也是为了处理这类意外断连。

**两个响应头**：
- `X-Accel-Buffering: no` — 告诉 Nginx 不要缓冲此响应，让事件立即透传到客户端
- `X-Content-Type-Options: nosniff` — 防止浏览器对 SSE 流进行 MIME 嗅探

### 模式二：`stream` — 单请求响应流

`POST /session/:id/message` 用另一种方式处理流：

```typescript
.post("/:sessionID/message", ..., async (c) => {
  c.status(200)
  c.header("Content-Type", "application/json")
  return stream(c, async (stream) => {
    const sessionID = c.req.valid("param").sessionID
    const body = c.req.valid("json")
    const msg = await SessionPrompt.prompt({ ...body, sessionID })
    stream.write(JSON.stringify(msg))  // 处理完成后一次性写入结果
  })
})
```

注意：这里用的是 `stream()`，不是 `streamSSE()`。它不遵循 SSE 协议，而是普通的 HTTP streaming。HTTP 连接保持开放，`SessionPrompt.prompt()` 完成（可能需要几十秒）后，才把最终的消息对象序列化写入。

**为什么这样设计？** 因为 AI 处理的中间过程（每个 token、每个工具调用）已经通过 SSE 事件总线广播了。已连接 `/event` 的客户端会实时看到进度；而 `POST /session/:id/message` 只需要在结束时返回最终结果供调用方记录。这是关注点分离的典型体现。

**SSE 广播动画：** 观察 processor.ts 产生的每个事件如何同时推送到 TUI、Web、Desktop 三个客户端。

<SseBroadcast />

对于不需要等待结果的场景，还有 `POST /session/:id/prompt_async`，它直接返回 204 并在后台异步运行：

```typescript
async (c) => {
  c.status(204)
  return stream(c, async () => {
    SessionPrompt.prompt({ ...body, sessionID })  // 不 await，立即返回
  })
}
```

这三种模式的对比：

| 端点 | 协议 | 用途 |
|------|------|------|
| `GET /event` | SSE | 广播所有 Bus 事件，实时进度更新 |
| `POST /session/:id/message` | HTTP Stream | 等待 AI 处理完成，返回最终消息 |
| `POST /session/:id/prompt_async` | HTTP 204 | 触发 AI 处理，不等结果 |

## 9.11 OpenAPI 自动生成

每个路由都用 `describeRoute` 标注了元信息，用 `validator` 定义了 Zod 模式，用 `resolver` 关联 Zod 类型到 OpenAPI Schema。这三者配合，让 API 文档自动从代码生成：

```typescript
// 一个典型的自文档路由
.get(
  "/:sessionID",
  describeRoute({
    summary: "Get session",
    description: "Retrieve detailed information about a specific OpenCode session.",
    operationId: "session.get",
    responses: {
      200: {
        description: "Get session",
        content: {
          "application/json": {
            schema: resolver(Session.Info),  // 直接引用 Zod schema
          },
        },
      },
      ...errors(400, 404),
    },
  }),
  validator("param", z.object({ sessionID: Session.get.schema })),
  async (c) => {
    const sessionID = c.req.valid("param").sessionID  // 类型安全，已验证
    const session = await Session.get(sessionID)
    return c.json(session)
  },
)
```

访问 `GET /doc` 可以看到完整的 OpenAPI 3.1.1 规范。这份规范也是 SDK 代码生成的数据源：

```
server.ts + routes/*.ts
  ↓ describeRoute/validator/resolver 元信息
generateSpecs(app)  →  OpenAPI 3.1.1 JSON
  ↓
script/generate.ts  →  packages/sdk/js/src/
  ↓
客户端调用 opencode.session.list({...})  // 完全类型安全
```

这条流水线保证了"服务器返回什么，客户端就能看到什么类型"的端到端类型安全。

## 9.12 服务器启动：端口策略与 mDNS

`Server.listen()` 处理启动逻辑：

```typescript
export function listen(opts: {
  port: number
  hostname: string
  mdns?: boolean
  mdnsDomain?: string
  cors?: string[]
}) {
  const app = createApp(opts)
  const args = { hostname: opts.hostname, idleTimeout: 0, fetch: app.fetch, websocket } as const

  const tryServe = (port: number) => {
    try { return Bun.serve({ ...args, port }) }
    catch { return undefined }
  }

  // 先尝试 4096，失败则让操作系统分配随机端口
  const server = opts.port === 0 ? (tryServe(4096) ?? tryServe(0)) : tryServe(opts.port)
  if (!server) throw new Error(`Failed to start server on port ${opts.port}`)

  // 非 loopback 地址才发布 mDNS
  const shouldPublishMDNS =
    opts.mdns && server.port && !["127.0.0.1", "localhost", "::1"].includes(opts.hostname)
  if (shouldPublishMDNS) MDNS.publish(server.port!, opts.mdnsDomain)

  return server
}
```

**端口降级逻辑**：如果请求端口 0（意为"操作系统分配"），服务器会先尝试固定的 4096 端口。这对开发体验很重要——大多数时候端口 4096 是空闲的，TUI 客户端就不需要动态发现服务器地址。只有当 4096 被占用时才真正退化到随机端口。

**mDNS 广播**：在局域网模式（`--hostname 0.0.0.0`）下，服务器通过 mDNS 广播自己的地址，移动端或其他设备可以自动发现，无需手动配置 IP。这是 `server/mdns.ts` 的职责。

## 9.13 兜底代理：透明转发到 Web 应用

```typescript
.all("/*", async (c) => {
  const path = c.req.path
  const response = await proxy(`https://app.opencode.ai${path}`, {
    ...c.req,
    headers: { ...c.req.raw.headers, host: "app.opencode.ai" },
  })
  response.headers.set("Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; ...")
  return response
})
```

对于所有未匹配的路径（即 API 路由之外的路径），服务器将请求透明代理到 `https://app.opencode.ai`。这意味着在浏览器中直接打开 `http://localhost:4096`，看到的是完整的 Web 应用 UI，而 API 调用则被路由到本地服务器。

用户不需要分别启动"后端服务器"和"前端开发服务器"，一个命令就能得到完整的 Web + API 环境。

## 9.14 请求的完整生命周期

把上面各层串联起来，一个 `POST /session/:id/message` 请求的完整路径是：

```
浏览器发出请求
  ↓
onError 注册（兜底）
  ↓
BasicAuth 检查（如有密码）
  ↓
请求日志记录
  ↓
CORS 检查，拒绝非白名单 Origin
  ↓
工作区上下文注入：Instance.provide(directory)
  ↓
WorkspaceRouterMiddleware（企业版多租户路由）
  ↓
query 参数验证（directory/workspace 字段）
  ↓
路由匹配：/session → SessionRoutes
  ↓
路由匹配：/:sessionID/message → POST 处理函数
  ↓
param 验证：sessionID
  ↓
body 验证：PromptInput schema
  ↓
SessionPrompt.prompt(...)  →  AI 处理（可能数十秒）
                              同时 Bus 广播事件给 SSE 客户端
  ↓
stream.write(JSON.stringify(msg))  →  响应返回
```

整个过程中，Bus 持续广播事件（`session.assistant.token`、`session.tool.call` 等），已连接 SSE 的客户端实时更新 UI。`POST /session/:id/message` 只是最后的"告知完成"。

## 9.15 设计模式总结

| 模式 | 体现 | 好处 |
|------|------|------|
| 中间件责任链 | CORS → Auth → 日志 → 上下文注入 | 关注点分离，每层只做一件事 |
| 按需初始化 | Instance.provide() per-request | 同一服务器服务多个工作目录 |
| 代码即文档 | describeRoute + validator + resolver | API 文档永远和实现同步 |
| 双流模式 | SSE 推事件 + HTTP Stream 传结果 | 实时进度与最终状态解耦 |
| 向下代理 | 未匹配路径 → app.opencode.ai | 一个端口提供完整 Web 体验 |

## 本章小结

### 关键代码位置

| 模块 | 位置 | 建议关注点 |
| --- | --- | --- |
| 服务器工厂 | `packages/opencode/src/server/server.ts` | `createApp`、中间件顺序、CORS 白名单 |
| Session 路由 | `packages/opencode/src/server/routes/session.ts` | CRUD、流式端点、fork/revert |
| 错误体系 | `packages/opencode/src/server/error.ts` | `NamedError`、`errors()` 辅助函数 |
| 服务器启动 | `packages/opencode/src/server/server.ts` | `listen()`、端口降级、mDNS 广播 |
| mDNS | `packages/opencode/src/server/mdns.ts` | 局域网服务发现 |

### 源码阅读路径

1. 先读 `server.ts` 的 `createApp`，画出中间件链顺序图。
2. 再读 `routes/session.ts`，找出 `GET /event` 和 `POST /:id/message` 两个核心端点。
3. 对照第5章的 `SessionPrompt.prompt()`，理解 AI 处理和 HTTP 响应的配合关系。

**思考题**：

1. 工作区上下文通过 `Instance.provide()` 注入到 AsyncLocalStorage，这和 React 的 Context API 在设计思想上有什么相似之处？为什么这种模式比"每个函数都接收 directory 参数"更优雅？

2. 为什么 `POST /session/:id/message` 使用 `stream()` 而不是 `streamSSE()`？如果 AI 处理中途抛出异常，客户端能正确感知吗？

3. `GET /event` 中的 10 秒心跳是维持连接活性的手段。如果客户端断线重连，它会错过这期间的事件吗？OpenCode 应该如何设计来解决这个问题？

## 下一章预告

第10章：**数据持久化** — 深入 `packages/opencode/src/storage/`，学习：SQLite + Drizzle ORM 的 schema 设计、消息与 Part 的存储结构、SQLite JSON 列的查询技巧、数据库迁移策略，以及 KV 存储的分层缓存设计。

---

## 常见误区

### 误区1：HTTP API 服务器只在"服务器模式"下运行，本地 TUI 不启动它

**错误理解**：HTTP 服务器只有执行 `opencode serve` 时才会启动，普通 `opencode` 命令直接调用业务逻辑，不经过 HTTP 层。

**实际情况**：即使是普通的 TUI 模式，`opencode` 也会在本地启动 HTTP 服务器（默认端口 4096）。TUI 通过 HTTP 请求和 SSE 事件流与服务端通信。这是架构统一性的体现——所有客户端使用同一套通信协议，本地的区别只是连接 `localhost` 而不是远程地址。

### 误区2：SSE 和 HTTP Stream 是同一个东西，随便用哪个都行

**错误理解**：`streamSSE` 和 `stream` 都是流式传输，功能相同，可以互换使用。

**实际情况**：两者用途不同。SSE（`GET /event`）是**持久连接**的事件广播，用于推送 Agent 执行过程中的实时事件（工具调用、文字片段、状态变化），一个连接可以接收多次事件。HTTP Stream（`POST /session/:id/message` 的 `stream()`）是**单次请求**的流式响应，用于传输这次请求的处理结果。前者是"订阅"，后者是"请求-流式响应"。

### 误区3：OpenCode 的 API 需要手动编写 SDK，维护成本高

**错误理解**：如果要在外部调用 OpenCode 的 API，需要手动阅读文档、编写 HTTP 请求代码。

**实际情况**：`packages/sdk/js/` 里的 SDK 是从服务端路由定义**自动生成**的。`describeRoute` 装饰器不仅生成 OpenAPI 文档，还驱动 SDK 代码生成脚本。这意味着 API 变更后运行 `generate.ts`，SDK 会自动更新，不存在"API 和 SDK 不同步"的问题。

### 误区4：mDNS 广播是可选的调试功能，生产环境应该禁用

**错误理解**：mDNS 局域网服务发现是开发时用来方便找服务的，生产部署应该关掉，通过固定 IP 或域名访问。

**实际情况**：mDNS 是 OpenCode 多端架构的关键基础设施。当你在本机运行 `opencode serve`，手机浏览器或局域网里的其他设备可以通过 mDNS 自动发现服务并连接，无需手动配置 IP 地址。这是团队共享 Agent 会话的核心机制，不是调试辅助。

### 误区5：`NamedError` 体系只是美化错误消息，没有实质作用

**错误理解**：`NamedError` 只是给错误加了个名字，方便日志阅读，对客户端处理没有帮助。

**实际情况**：`NamedError` 让错误在 HTTP 层变成结构化 JSON 响应，客户端（SDK）可以用 `instanceof` 检查错误类型并做针对性处理。例如 `ForbiddenError` 触发重新认证，`NotFoundError` 触发资源刷新，`ValidationError` 显示字段级错误信息。这是类型安全的错误处理链，而不是单纯的日志美化。

---

<SourceSnapshotCard
  title="第9章源码快照"
  description="这一章的核心是 createApp 的中间件链：每一层如何只做一件事，以及 SSE 广播与 HTTP Stream 如何协作支撑实时 AI 交互。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: '服务器入口',
      path: 'packages/opencode/src/server/server.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/server.ts'
    },
    {
      label: 'Session 路由',
      path: 'packages/opencode/src/server/routes/session.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/routes/session.ts'
    },
    {
      label: '错误处理辅助',
      path: 'packages/opencode/src/server/error.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/error.ts'
    },
    {
      label: 'mDNS 服务发现',
      path: 'packages/opencode/src/server/mdns.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/mdns.ts'
    }
  ]"
/>


<StarCTA />
