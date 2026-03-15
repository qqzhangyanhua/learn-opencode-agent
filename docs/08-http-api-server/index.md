---
title: 第八篇：HTTP API 服务器
description: 第八篇：HTTP API 服务器的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/server/`、`packages/opencode/src/control-plane/`
> **前置阅读**：第四篇 会话管理、第七篇 TUI 终端界面
> **学习目标**：理解 OpenCode 的 HTTP 层不是一组零散接口，而是把项目上下文、会话操作、实时事件、PTY 终端和远程工作区转发统一起来的服务边界


<SourceSnapshotCard
  title="第八篇源码快照"
  description="这一篇先抓 HTTP 层的真实职责：请求怎样进入上下文、怎样分流到不同实时通道、以及怎样在本地与 workspace 之间转发。"
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
      label: '会话路由',
      path: 'packages/opencode/src/server/routes/session.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/routes/session.ts'
    },
    {
      label: '全局事件路由',
      path: 'packages/opencode/src/server/routes/global.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/routes/global.ts'
    },
    {
      label: '工作区转发',
      path: 'packages/opencode/src/control-plane/workspace-router-middleware.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/control-plane/workspace-router-middleware.ts'
    }
  ]"
/>

## 核心概念速览

如果前几篇讲的是 Agent 内部怎么思考、怎么调工具，那么这一篇讲的是：

**外部客户端到底通过什么入口和 OpenCode 交互。**

在当前仓库里，HTTP 服务器至少承担五件事：

1. 把 CLI、Web、Desktop 共用的能力变成统一 API
2. 在每个请求里建立当前目录、项目实例和工作区上下文
3. 提供实时通道，包括 SSE、HTTP 流和 WebSocket
4. 用 `hono-openapi` 把接口描述、校验和文档串起来
5. 在实验性工作区模式下，把请求转发到远端 workspace

最值得先看的三个入口是：

- [packages/opencode/src/server/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/server.ts)
- [packages/opencode/src/server/routes/session.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/session.ts)
- [packages/opencode/src/control-plane/workspace-router-middleware.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/control-plane/workspace-router-middleware.ts)

---

## 本章导读

### 这一章解决什么问题

这一章要解决的是：

- OpenCode 的外部客户端到底通过什么服务边界协作
- 请求上下文为什么比“写几个路由”更关键
- SSE、HTTP 流、WebSocket 在系统里分别承担什么职责
- 本地 server 和实验性 workspace 转发是怎样接到同一请求链上的

### 必看入口

- [packages/opencode/src/server/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/server.ts)：HTTP 服务器装配入口
- [packages/opencode/src/server/routes/session.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/session.ts)：会话主路由
- [packages/opencode/src/server/routes/global.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/global.ts)：全局事件与系统路由
- [packages/opencode/src/server/routes/pty.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/pty.ts)：终端与 WebSocket 能力
- [packages/opencode/src/control-plane/workspace-router-middleware.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/control-plane/workspace-router-middleware.ts)：远程工作区转发

### 一张图先建立感觉

```text
客户端请求
  -> server.ts 建立上下文 / 中间件
  -> session / global / pty / file 等路由
  -> 普通 JSON / HTTP 流 / SSE / WebSocket 分流
  -> 如命中 workspace 模式则进入转发中间件
  -> 最终回到本地实例或远端 workspace
```

### 先抓一条主链路

建议先只顺着这条线读：

```text
server/server.ts
  -> 建立请求上下文
  -> 挂载 session / global / pty 等路由
  -> session.ts 等具体路由处理业务
  -> 根据通道类型走 stream / SSE / WebSocket
  -> 如命中 workspace 模式则进入转发中间件
```

先看懂“请求是怎样穿过这台服务器的”，再分别研究具体协议和具体路由。

### 初学者阅读顺序

1. 先读 `server.ts`，只看中间件装配和路由挂载。
2. 再读 `routes/session.ts`、`routes/global.ts`、`routes/pty.ts`，建立三类通道的直觉。
3. 最后补读 `workspace-router-middleware.ts`，理解本地请求怎样被扩展到远程 workspace。

### 最容易误解的点

- 这一层不是简单 REST API，它同时承担实时事件、会话控制和终端代理职责。
- 真正的复杂度不在 Hono 语法，而在请求上下文、状态边界和实时通道选择。
- `packages/opencode/src/server` 和云端 `packages/function` 不是同一种服务端，不要混淆。

## 8.1 先看总入口：`server.ts` 怎么拼出整台 API 服务器

### `Server.createApp()` 是所有路由的装配中心

[packages/opencode/src/server/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/server.ts) 里的 `createApp()` 可以直接当成“请求装配表”来看。导读里已经给过总图，这里只需要对照真实中间件顺序：

```text
请求进入
  -> onError 统一错误出口
  -> Basic Auth
  -> 请求日志
  -> CORS
  -> /global 与 /auth 这类全局路由
  -> WorkspaceContext + Instance.provide 建立请求上下文
  -> WorkspaceRouterMiddleware 视情况转发到远端 workspace
  -> /doc OpenAPI
  -> query 校验
  -> project/session/pty/file/mcp/tui 等业务路由
```

这里最重要的不是 Hono API，而是装配顺序本身：

- 先确定每个请求属于哪个目录
- 再确定当前实例怎么初始化
- 最后才进入业务路由

对 Agent 项目来说，同一个路由一旦脱离“当前目录 + 当前实例”，往往就失去了真正语义。

### 路由挂载方式比看起来更有层次

当前真实挂载的主要路由包括：

- `/global`
- `/project`
- `/pty`
- `/config`
- `/experimental`
- `/session`
- `/permission`
- `/question`
- `/provider`
- `/mcp`
- `/tui`
- `/` 挂载的文件路由

其中最容易忽略的是“文件路由不是 `/file` 模块单独挂进去的”，而是：

```ts
.route("/", FileRoutes())
```

这意味着这些接口实际长这样：

- `GET /find`
- `GET /find/file`
- `GET /find/symbol`
- `GET /file`
- `GET /file/content`
- `GET /file/status`

如果电子书只写“有一个 file 模块”，初学者很容易在调接口时找错路径。

### `/doc` 不是附属功能，而是接口契约的一部分

`server.ts` 里直接把 `openAPIRouteHandler()` 挂到 `/doc`。  
这说明当前仓库希望接口文档和路由定义一起维护，而不是事后再补一份说明书。

这套思路对 Agent 项目尤其重要，因为：

- 桌面端和 Web 端都要复用接口
- 后续 SDK 生成依赖接口稳定
- 你调试模型行为时，经常需要快速确认某个路由的输入输出

---

## 8.2 真正关键的是请求上下文，而不是 Hono 语法

### Basic Auth 和 CORS 是第一层入口保护

OpenCode 现在的鉴权不是自造协议，而是直接用 `hono/basic-auth`。

在 [packages/opencode/src/server/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/server.ts) 里可以看到：

- 密码来自 `Flag.OPENCODE_SERVER_PASSWORD`
- 用户名来自 `Flag.OPENCODE_SERVER_USERNAME`
- 默认用户名是 `opencode`
- `OPTIONS` 预检会跳过认证

这比文档里常见的“自己解析 Authorization 头”更贴近真实工程。

CORS 也不是写死白名单字符串数组，而是按来源动态判断：

- `http://localhost:*`
- `http://127.0.0.1:*`
- `tauri://localhost`
- `http://tauri.localhost`
- `https://tauri.localhost`
- `https://*.opencode.ai`
- 以及 `opts.cors` 里追加的来源

这正好对应 OpenCode 的多端形态：本地开发、桌面端、线上站点。

### `WorkspaceContext` 和 `Instance.provide()` 才是请求级状态核心

这一段是当前 API 服务器最值得初学者认真看的部分：

```ts
const rawWorkspaceID = c.req.query("workspace") || c.req.header("x-opencode-workspace")
const raw = c.req.query("directory") || c.req.header("x-opencode-directory") || process.cwd()
```

然后服务器会：

1. 解析 workspace ID
2. 解析目录参数
3. 用 `Filesystem.resolve()` 归一化路径
4. 通过 `WorkspaceContext.provide()` 注入工作区上下文
5. 再通过 `Instance.provide()` 初始化当前项目实例

这段代码背后的思想是：

**OpenCode 的 HTTP API 不是“全局单例服务”，而是“每个请求都绑定一个项目世界”。**

所以你理解任何路由时，都要默认它运行在某个目录和某个项目实例里。

### 实验性 workspace 模式会在中间件层直接改写请求去向

[packages/opencode/src/control-plane/workspace-router-middleware.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/control-plane/workspace-router-middleware.ts) 很值得单独讲。

它当前的逻辑大意是：

- 如果没开 `OPENCODE_EXPERIMENTAL_WORKSPACES`，请求照常本地处理
- 如果当前请求带了 workspace，先查本地 `workspace` 表
- 找到目标 workspace 后，用 adaptor 把请求转发出去

而且代码里的注释说得很直接：

- 现在为了保证一致性，基本都转发
- 未来才考虑把不修改状态的 GET 请求留在本地

这告诉你一件很重要的事：

**当前 API 层已经不是单机边界，它开始承担 control-plane 路由职责了。**

---

## 8.3 OpenCode 不是只有 REST，还同时用了三种实时通道

很多介绍会把“流式响应”一概写成 SSE，但 OpenCode 当前真实实现更细：

1. 全局事件用 SSE
2. 会话消息用 HTTP 流
3. PTY 终端交互用 WebSocket

这三个通道解决的是不同问题。

### 全局事件：`/global/event` 走 SSE

[packages/opencode/src/server/routes/global.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/global.ts) 里的 `/event` 用的是 `streamSSE()`。

它会做几件很工程化的事情：

- 建连时先发一个 `server.connected`
- 每 10 秒发一次 `server.heartbeat`
- 监听 `GlobalBus`
- 连接中断后清理订阅器和心跳定时器

这一条链路适合广播类事件，比如：

- server 已连接
- workspace 同步事件
- 全局 dispose 通知

### 会话消息：`/session/:sessionID/message` 走普通 HTTP 流

这里和很多人直觉不一样。  
[packages/opencode/src/server/routes/session.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/session.ts) 发送消息时用的是 `stream()`，不是 `streamSSE()`。

当前实现会：

- 设置 `Content-Type: application/json`
- 调用 `SessionPrompt.prompt()`
- 把结果直接写到流里

也就是说，这里更像“流式返回一段 JSON 结果”，而不是浏览器 EventSource 那种事件协议。

对写书来说，这个差异最好明确写出来，不然读者会误以为所有实时输出都是 SSE。

### PTY：`/:ptyID/connect` 才是真正的交互式双向通道

[packages/opencode/src/server/routes/pty.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/pty.ts) 用 `upgradeWebSocket()` 把请求升级成 WebSocket。

这条链路之所以必须是 WebSocket，是因为 PTY 交互天然需要双向通信：

- 服务端推送终端输出
- 客户端发送输入
- 连接时还能带 `cursor` 做输出续接

这也是为什么 OpenCode 没把所有实时能力强行统一成 SSE。  
因为终端不是“只读事件流”，而是“会话型交互流”。

---

## 8.4 业务路由怎么分层，比路由数量更重要

### `session.ts` 是整个 API 里最重的资源路由

[packages/opencode/src/server/routes/session.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/session.ts) 其实已经接近一个会话控制面板。

当前至少覆盖了这些动作：

- 会话列表、详情、状态、子会话
- 创建、更新、删除、归档
- 初始化 AGENTS.md
- fork、abort
- share / unshare
- summarize
- message / prompt_async / command
- revert / unrevert
- message、part、todo、permission 等下属资源操作

如果你是初学者，最好的阅读方式不是从第一行看到最后一行，而是按“会话生命周期”来读：

1. `POST /session`
2. `POST /session/:sessionID/message`
3. `POST /session/:sessionID/abort`
4. `POST /session/:sessionID/summarize`
5. `POST /session/:sessionID/share`

这样更能理解 OpenCode 把“一个对话”当成什么对象来管理。

### `file.ts` 提供的是项目视角下的只读能力

[packages/opencode/src/server/routes/file.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/file.ts) 现在主要暴露：

- 文本搜索
- 文件名搜索
- 文件列表
- 文件内容读取
- Git 状态查看

其中一个很值得写进书里的现实细节是：

`/find/symbol` 目前仍然直接返回空数组。

这不是缺点，反而很适合给初学者一个真实工程判断：

- 并不是文档里列出的每个 API 都已经打通
- 仓库里有些接口是先占位，再逐步接入底层能力
- 写源码导向的电子书时，要忠实写“当前状态”，不要替代码脑补完成度

### `project.ts`、`global.ts`、`question.ts` 这些路由负责外围控制面

除了 `session` 和 `file`，还有几类很关键的外围接口：

- [packages/opencode/src/server/routes/project.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/project.ts)：列项目、看当前项目、初始化 Git、更新项目配置
- [packages/opencode/src/server/routes/global.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/global.ts)：健康检查、全局配置、事件流、dispose
- [packages/opencode/src/server/routes/question.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/question.ts)：给前端或终端提供提问交互接口
- [packages/opencode/src/server/routes/permission.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/permission.ts)：权限响应

这类接口共同说明了一点：

**OpenCode 的 API 服务器不只是“聊天接口集合”，而是一个完整的 Agent 控制面。**

---

## 8.5 认证与安全：API Key 管理与多用户隔离

### 认证系统的三种模式

OpenCode 的认证系统位于 [packages/opencode/src/auth/](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/auth/)，支持三种认证模式：

**1. OAuth 模式**（用于 GitHub Copilot、GitLab 等）：
```typescript
{
  type: "oauth",
  refresh: string,      // 刷新令牌
  access: string,       // 访问令牌
  expires: number,      // 过期时间戳
  accountId?: string,   // 账户 ID
  enterpriseUrl?: string // 企业版 URL
}
```

**2. API Key 模式**（用于 Anthropic、OpenAI 等）：
```typescript
{
  type: "api",
  key: string          // API 密钥
}
```

**3. Well-Known 模式**（用于特定服务发现）：
```typescript
{
  type: "wellknown",
  key: string,         // 服务标识
  token: string        // 访问令牌
}
```

### 认证信息的存储与管理

认证信息存储在 `~/.opencode/data/auth.json`，权限设置为 `0o600`（仅所有者可读写）。

**核心 API**：
```typescript
// 获取指定提供商的认证信息
Auth.get(providerID: string): Promise<Info | undefined>

// 获取所有认证信息
Auth.all(): Promise<Record<string, Info>>

// 设置认证信息
Auth.set(key: string, info: Info): Promise<void>

// 删除认证信息
Auth.remove(key: string): Promise<void>
```

**安全特性**：
- 文件权限严格控制（`0o600`）
- 自动规范化 provider key（去除尾部斜杠）
- 使用 Effect 库进行错误处理
- Schema 验证确保数据完整性

### HTTP 服务器的认证层

在 [packages/opencode/src/server/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/server.ts) 中，服务器入口使用 Basic Auth 保护：

```typescript
// 认证中间件
.use(async (c, next) => {
  const password = Flag.OPENCODE_SERVER_PASSWORD
  if (!password) return next()
  return basicAuth({
    username: Flag.OPENCODE_SERVER_USERNAME || "opencode",
    password
  })(c, next)
})
```

**认证流程**：
1. 检查环境变量 `OPENCODE_SERVER_PASSWORD`
2. 如果未设置，跳过认证（本地开发模式）
3. 如果设置，要求 Basic Auth
4. `OPTIONS` 预检请求自动跳过认证

### CORS 安全策略

CORS 配置针对 OpenCode 的多端形态：

**允许的来源**：
- `http://localhost:*` - 本地开发
- `http://127.0.0.1:*` - 本地开发
- `tauri://localhost` - Tauri 桌面应用
- `http://tauri.localhost` - Tauri 开发模式
- `https://tauri.localhost` - Tauri HTTPS
- `https://*.opencode.ai` - 官方站点
- 自定义来源（通过 `opts.cors` 配置）

**为什么这样设计**：
- 支持本地开发的任意端口
- 兼容 Tauri 的特殊协议
- 允许官方部署的子域名
- 可扩展自定义来源

### 多用户权限隔离

虽然当前 OpenCode 主要面向单用户场景，但架构上已经为多用户隔离做了准备：

**1. 请求级上下文隔离**：
```typescript
// 每个请求都绑定到特定目录和工作区
const rawWorkspaceID = c.req.query("workspace") || c.req.header("x-opencode-workspace")
const directory = c.req.query("directory") || c.req.header("x-opencode-directory")
```

**2. 工作区级别隔离**：
- 每个 workspace 有独立的 ID
- 会话、消息、文件缓存都关联到 workspace
- 远程 workspace 通过 `WorkspaceRouterMiddleware` 转发

**3. 认证信息隔离**：
- 每个 provider 的认证信息独立存储
- 支持同一 provider 的多个账户（通过不同 key）

### 安全最佳实践

**1. 本地开发**：
```bash
# 不设置密码（仅本地访问）
bun dev serve

# 设置密码保护
OPENCODE_SERVER_PASSWORD=your-secret bun dev serve
```

**2. 生产部署**：
```bash
# 必须设置强密码
export OPENCODE_SERVER_PASSWORD="$(openssl rand -base64 32)"
export OPENCODE_SERVER_USERNAME="admin"

# 限制监听地址
bun dev serve --host 127.0.0.1
```

**3. 认证信息管理**：
- 定期轮换 API Key
- 使用环境变量而非硬编码
- 不要将 `auth.json` 提交到版本控制
- 使用最小权限原则（只授予必要的 API 权限）

**4. 网络安全**：
- 生产环境使用 HTTPS
- 配置防火墙限制访问
- 使用反向代理（如 Nginx）添加额外安全层
- 启用请求速率限制

### OAuth 特殊处理

对于 OAuth 流程，OpenCode 使用了一个特殊的占位符：

```typescript
export const OAUTH_DUMMY_KEY = "opencode-oauth-dummy-key"
```

这用于在 OAuth 流程中临时标识认证状态，避免在完整令牌获取前暴露敏感信息。

---

## 8.6 OpenAPI、错误建模与请求边界

### `describeRoute + validator + resolver` 是当前接口定义的标准写法

OpenCode 现在的路由定义基本都遵循这个模式：

1. `describeRoute()` 写摘要、描述、operationId、响应类型
2. `validator()` 校验 `param`、`query`、`json`
3. `resolver()` 把 Zod schema 暴露给 OpenAPI

这有两个直接好处：

- 文档和代码不会越来越分离
- 输入校验和接口契约来自同一份 schema

这比“手写注释 + 手写 Swagger + 手写校验”要稳定得多。

### 错误处理也是统一出口，不是每个路由自己拼 JSON

`server.ts` 的 `onError()` 会统一处理：

- `NamedError`
- `NotFoundError`
- `Provider.ModelNotFoundError`
- `HTTPException`
- 其他未知异常

然后再统一转成 JSON 响应。
这对 Agent 项目尤其重要，因为模型调用链很长，任何一段抛错都可能最终穿透到接口层。

### 请求边界的三层防护

从当前实现看，HTTP 层的安全边界至少有三层：

1. **Basic Auth**：保护整个服务入口
2. **CORS**：限制浏览器端来源
3. **workspace 转发**：限制请求到底落到本地实例还是远端 workspace

如果以后你想基于这个项目扩展 API，优先要想清楚的不是“再加哪个路由”，而是：

- 它应该在哪个上下文里执行
- 它应该由本地处理还是远端处理
- 它返回一次性结果、事件流，还是双向连接

---

## 本章小结

理解 OpenCode 的 HTTP API，重点不是背 Hono 语法，而是抓住四条主线：

1. `server.ts` 负责把上下文、中间件和路由装起来
2. `session/global/pty/file` 分别对应会话控制、全局控制、终端通道和项目读取
3. `auth/` 提供三种认证模式和安全的凭证管理
4. `WorkspaceRouterMiddleware` 说明这个系统已经在为远程 workspace 做控制面扩展

如果你之后要继续读源码，我建议把这一篇当成“总交通图”。
因为很多看似属于会话、权限、项目、终端的逻辑，最后都会从这里暴露给客户端。

### 关键代码位置

| 模块 | 位置 | 建议关注点 |
|------|------|-----------|
| 服务器入口 | `packages/opencode/src/server/server.ts` | 中间件顺序、路由挂载、错误处理 |
| 会话路由 | `packages/opencode/src/server/routes/session.ts` | 会话生命周期、消息流 |
| 文件路由 | `packages/opencode/src/server/routes/file.ts` | 文件搜索、内容读取 |
| PTY 路由 | `packages/opencode/src/server/routes/pty.ts` | WebSocket 升级、终端交互 |
| 全局路由 | `packages/opencode/src/server/routes/global.ts` | SSE 事件流、健康检查 |
| 认证系统 | `packages/opencode/src/auth/` | OAuth/API Key/WellKnown 三种模式 |
| 认证服务 | `packages/opencode/src/auth/service.ts` | 凭证存储、Effect 错误处理 |
| 工作区转发 | `packages/opencode/src/control-plane/workspace-router-middleware.ts` | 远程 workspace 路由 |

### 源码阅读路径

1. 先从 `server.ts` 看请求中间件顺序和路由挂载总图，特别关注 Basic Auth 和 CORS 配置。
2. 再读 `auth/index.ts` 和 `auth/service.ts`，理解三种认证模式和凭证管理机制。
3. 然后读 `routes/global.ts`、`routes/session.ts`、`routes/pty.ts`，分别理解 SSE、HTTP 流和 WebSocket 三种实时通道。
4. 最后读 `workspace-router-middleware.ts`，确认远程 workspace 转发是在什么阶段介入的。

### 任务

判断 OpenCode 的 HTTP 层为什么不是一组零散 REST 接口，而是一条带上下文、通道分流和 workspace 转发的服务边界。

### 操作

1. 打开 `packages/opencode/src/server/server.ts`，按中间件顺序写出请求进入后的主链路。
2. 再读 `routes/global.ts`、`routes/session.ts`、`routes/pty.ts`，分别记下 SSE、HTTP 流、WebSocket 对应的使用场景。
3. 最后读 `workspace-router-middleware.ts`，确认请求在什么条件下会继续本地处理，什么条件下会被转发到远端 workspace。

### 验收

完成后你应该能说明：

- 为什么请求上下文比“再加几个路由”更关键。
- 为什么 `/global/event`、`/session/:sessionID/message`、`/:ptyID/connect` 不能统一成同一种协议。
- 为什么这层已经带有 control-plane 性质，而不是单机 CLI 的附属接口。


### 下一篇预告

下一篇我们不再看“请求怎么进来”，而是看“这些项目、会话、消息和权限最终怎么落盘”。
也就是 OpenCode 的本地数据库、迁移逻辑，以及它和云端 Console 数据层的边界。

### 思考题

1. 为什么这一层真正的复杂度更多在请求上下文和实时通道，而不是 Hono 的路由语法？
2. 如果你要新增一个接口，如何判断它应该返回普通 JSON、SSE、HTTP 流还是 WebSocket？
3. `packages/opencode/src/server` 和 `packages/function/src/api.ts` 都像“服务端”，但为什么它们必须分开？
