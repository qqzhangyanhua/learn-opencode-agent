---
title: 第一篇：Agent 基础架构
description: 第一篇：Agent 基础架构的详细内容
---

<script setup>
import RuntimeLifecycleDiagram from '../../.vitepress/theme/components/RuntimeLifecycleDiagram.vue'
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：项目根目录、`packages/opencode/`、`packages/app/`、`packages/desktop/`
> **前置阅读**：无
> **学习目标**：先建立“基于当前仓库理解 Agent”的整体视角，知道 OpenCode 为什么拆成多包、多端和客户端/服务器分离结构

---

<SourceSnapshotCard
  title="第一篇源码快照"
  description="这一篇先不急着通读所有目录，而是先抓住一次最小任务闭环：命令怎样进入运行时、怎样进入会话、怎样进入模型与工具循环。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: 'CLI 总入口',
      path: 'packages/opencode/src/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/index.ts'
    },
    {
      label: 'run 命令入口',
      path: 'packages/opencode/src/cli/cmd/run.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/cli/cmd/run.ts'
    },
    {
      label: '共享服务边界',
      path: 'packages/opencode/src/server/server.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/server.ts'
    },
    {
      label: '会话消息入口',
      path: 'packages/opencode/src/server/routes/session.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/routes/session.ts'
    },
    {
      label: '会话主循环',
      path: 'packages/opencode/src/session/prompt.ts → processor.ts → llm.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/prompt.ts'
    }
  ]"
/>

## 核心概念速览

这一篇最该先建立的，不是“Agent 的定义”，而是**一次任务到底怎样从输入走到结果**。

很多初学者一上来就扎进 monorepo、workspace、Turbo、前端外壳，最后会越看越散。更有效的顺序正好相反：

- 先抓一次最小运行时闭环
- 再回头解释目录为什么这样拆
- 最后再理解多端、服务边界和工程组织

所以这一篇最适合带着下面这个问题去读：

**OpenCode 为什么不是单体 CLI，而是一套围绕运行时主链路组织起来的工程系统？**

## 先跑一次，再看架构

如果你只记这一条线，后面十四篇就不容易碎掉：

```text
用户输入任务
  -> packages/opencode/src/index.ts
  -> packages/opencode/src/cli/cmd/run.ts
  -> packages/opencode/src/server/server.ts
  -> packages/opencode/src/server/routes/session.ts
  -> packages/opencode/src/session/prompt.ts
  -> packages/opencode/src/session/processor.ts
  -> packages/opencode/src/session/llm.ts
  -> packages/opencode/src/tool/registry.ts
  -> packages/opencode/src/session/message-v2.ts
  -> CLI / TUI / Web / Desktop 收到结果
```

这条链路先回答三件事：

1. 命令入口不是只做参数解析，它会先把日志、环境变量、数据库迁移等运行时前置条件装起来。
2. `run` 命令不是直接把 prompt 丢给模型，而是先进入共享 server / session 语义。
3. OpenCode 保存的不是一段“聊天文本”，而是带 `text`、`reasoning`、`tool`、`file` 等部件的结构化消息流。

<RuntimeLifecycleDiagram
  :highlight-keys="['prompt', 'session', 'tools', 'provider', 'feedback']"
  description="第一篇先看总链路，不追所有细节。你只要先知道一次任务怎样穿过这些环节，后面章节就都有落点。"
/>

## 本章导读

### 这一章解决什么问题

这一章先不要求你背完整目录，而是先建立一张“系统怎样跑起来”的总图：

- 用户输入为什么会先进入 `run` 命令，而不是直接进入模型
- 为什么共享 server / session 边界比“一个命令行脚本”更重要
- 为什么多端外壳可以共用同一套运行时语义
- 为什么这个项目最后会长成多包协作，而不是单体 CLI

### 必看入口

- [package.json](https://github.com/anomalyco/opencode/blob/dev/package.json)：workspace、catalog、脚本入口
- [packages/opencode/src/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/index.ts)：CLI 总入口与运行时前置初始化
- [packages/opencode/src/cli/cmd/run.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/run.ts)：最小任务闭环入口
- [packages/opencode/src/server/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/server.ts)：共享服务边界与请求上下文装配
- [packages/opencode/src/server/routes/session.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/session.ts)：会话创建与消息入口
- [packages/opencode/src/session/prompt.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/prompt.ts)：用户输入转为消息并进入主循环
- [packages/opencode/src/session/processor.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/processor.ts)：模型 / 工具 / 结果回写循环
- [packages/opencode/src/session/message-v2.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/message-v2.ts)：结构化消息模型

### 初学者阅读顺序

1. 先看 `index.ts` 和 `run.ts`，只问“任务从哪里进”。
2. 再看 `server.ts` 和 `routes/session.ts`，只问“它怎样进入共享服务边界”。
3. 然后看 `prompt.ts`、`processor.ts`、`llm.ts`、`tool/registry.ts`，只问“它怎样进入模型 / 工具循环”。
4. 最后再回到根目录 `package.json`、`packages/app/`、`packages/desktop/`，理解多包和多端为什么是结果而不是前提。

### 最容易误解的点

- `packages/opencode` 不只是 CLI，它同时承载 server、session、tool、provider 等核心运行时语义。
- `run` 命令不是“命令行特供逻辑”，它更像进入同一套会话系统的一扇门。
- 目录拆分不是为了追求形式上的 monorepo，而是为了让多端外壳复用同一条主链路。

## 1.1 先跑一次最小闭环，再理解目录结构

### 从 `run` 命令进仓库，比先看 monorepo 更有效

如果你第一次读这个仓库就先看 workspace 和包关系，很容易把注意力放在“项目怎么拆目录”；但对初学者更重要的问题是：

**一次任务到底怎么跑完？**

在当前实现里，这条最小闭环比目录树更有解释力：

```text
index.ts
  -> RunCommand
  -> server.ts
  -> session.ts
  -> prompt.ts
  -> processor.ts
  -> llm.ts
  -> tool/registry.ts
  -> message-v2.ts
```

只要把这条线读顺，你再回头看 monorepo、多端、客户端/服务器分离，就不会觉得它们是抽象名词。

### 第一步：`index.ts` 先把运行时装起来

`packages/opencode/src/index.ts` 最值得先看的，不是 `yargs(...).command(...)` 这几个注册调用，而是命令执行前那层全局 middleware。

这里至少会先做这些事：

- 初始化日志
- 写入 `AGENT`、`OPENCODE`、`OPENCODE_PID` 等环境标记
- 确认本地数据库是否存在
- 在首次运行时执行 JSON migration

这说明 CLI 入口不是一层薄壳。它先把“这个 Agent 进程已经具备运行条件”这件事做完，后面的 `run`、`serve`、`web` 命令才有意义。

### 第二步：`RunCommand` 把任务送进共享运行时语义

`packages/opencode/src/cli/cmd/run.ts` 是这一篇最值得抓的入口。

它重要，不是因为它叫 `run`，而是因为它告诉你：

- 用户输入的 message 怎样进入会话系统
- CLI 怎样订阅和展示 tool / step / reasoning 等事件
- 最终输出为什么能在终端里实时回流

也就是说，CLI 不是直接“调模型 -> 打印文本”。它真正做的是把用户任务接进同一套 session / message / tool 语义。

### 第三步：`server.ts` 把请求装进项目上下文

为什么一个本地 CLI 还要绕进 `packages/opencode/src/server/server.ts`？

因为 OpenCode 想复用的不只是“某个函数”，而是整套服务边界：

- Basic Auth / 日志 / CORS 这类中间件顺序
- `WorkspaceContext.provide()` 注入的工作区语义
- `Instance.provide()` 初始化的当前项目实例
- `project`、`session`、`pty`、`file` 等统一路由出口

这一步很关键。它解释了为什么 OpenCode 不适合写成一堆直接互调的 CLI 函数：**它从一开始就把“当前请求属于哪个项目世界”当成核心语义。**

### 第四步：`session.ts` 和 `prompt.ts` 把用户输入变成会话消息

进入 `packages/opencode/src/server/routes/session.ts` 后，你会看到两件分开的事：

1. 创建 session 容器
2. 往某个 session 里发送消息

再往下到 `packages/opencode/src/session/prompt.ts`，`prompt()` 会：

- 取出当前 session
- 清理需要回滚的状态
- 创建本轮用户消息
- `touch` 当前 session
- 如果允许回复，就把控制权交给主循环

这很重要，因为它说明“用户输入”在这里已经不是一段原始文本，而是进入了可持久化、可恢复、可继续处理的消息系统。

### 第五步：`processor.ts`、`llm.ts` 和 `tool/registry.ts` 进入真正的 Agent 循环

到了 `packages/opencode/src/session/processor.ts`，你才真正进入大家通常理解的“Agent 在干活”阶段。

这时候系统开始处理：

- reasoning 片段
- tool call / tool result / tool error
- step 开始与结束
- usage、finish reason、token、cost 等运行时信息

而 `packages/opencode/src/session/llm.ts` 会把另外三类东西绑定起来：

- 当前 Agent 与系统提示词
- 当前 Provider / Model 抽象
- 当前可用工具集合

工具集合不是散落各处的 if/else，而是统一从 `packages/opencode/src/tool/registry.ts` 进入，再按权限、模式、provider 能力继续过滤。

这就是 OpenCode 真正的主链路：**模型不是单独工作，工具也不是外挂；两者是在同一个会话循环里一起运转。**

### 第六步：`message-v2.ts` 决定结果怎样被保存和回流

最后一定要看 `packages/opencode/src/session/message-v2.ts`。

因为它解释了一个经常被忽略的问题：OpenCode 存的不是“最终答案字符串”，而是结构化 part。

你会看到至少这些类型：

- `text`
- `reasoning`
- `file`
- 以及和工具、步骤相关的结构

这带来的直接结果是：

- CLI / TUI / Web / Desktop 可以消费同一份消息流
- 会话可以恢复，而不是只能展示一段平面文本
- 后续章节讨论工具、会话、Provider、多端 UI 时，都能挂回同一份数据模型

### 先得到三个结论

读完这一条最小闭环，你至少应该先记住：

1. OpenCode 的主语不是“一个 CLI 命令”，而是一条完整运行时链路。
2. 客户端/服务器分离不是形式主义，而是为了让不同终端共享同一套项目上下文和会话语义。
3. monorepo 和多端结构是这条主链路外溢出来的工程结果，不是理解仓库的第一起点。

---

## 1.2 OpenCode 的架构设计哲学

### 为什么先从 Monorepo 开始理解这个项目

打开项目根目录的 `package.json`，你会看到：

```json
{
  "workspaces": {
    "packages": [
      "packages/*",
      "packages/console/*",
      "packages/sdk/js",
      "packages/slack"
    ]
  }
}
```

这里最值得关注的不是“monorepo 这个词”，而是它在当前仓库里具体解决了三件事：

1. 让多个终端共用同一套代码和资源
2. 让依赖版本集中管理，而不是每个包各配一份
3. 让跨包修改可以作为一次完整变更提交

例如 `packages/ui` 中的组件和主题资源，可以同时被 `packages/app` 与 `packages/desktop` 复用；对读者来说，这比抽象讨论 monorepo 更能解释目录为什么这样拆。

### Bun Workspaces 配置详解

在 OpenCode 里，workspaces 首先是一个“包关系声明”，用来告诉 Bun 哪些目录属于同一个仓库内的包集合。

**配置解析**：
```json
{
  "workspaces": {
    "packages": [
      "packages/*",              // 所有 packages 下的一级目录
      "packages/console/*",      // console 下的子包
      "packages/sdk/js",         // SDK 特殊路径
      "packages/slack"           // Slack 集成
    ]
  }
}
```

从这个配置能看出两层信息：

- `packages/*` 覆盖常规一级包
- `packages/console/*`、`packages/sdk/js`、`packages/slack` 是需要额外显式声明的特殊路径

也就是说，当前仓库不是一层平铺结构，而是同时包含“常规产品包”和“局部多级子系统”。

**为什么有些包需要单独列出**：
- `packages/console/*`：控制台有多个子模块（app/core/function/mail/resource）
- `packages/sdk/js`：SDK 在二级目录，需要显式声明
- `packages/slack`：独立的集成包

### Catalog 统一依赖版本

同一个 `package.json` 里还能看到 `catalog`，它解决的是“共享包之外的共享版本”：

```json
{
  "catalog": {
    "solid-js": "1.9.10",
    "drizzle-orm": "1.0.0",
    "hono": "4.10.7",
    "@opentui/core": "0.1.87"
  }
}
```

子包里如果写成下面这样：
```json
{
  "dependencies": {
    "solid-js": "catalog:",
    "hono": "catalog:"
  }
}
```

意思就是“版本号不要在子包里各写一份，而是统一回到根配置取值”。  
这让 `solid-js`、`hono`、`drizzle-orm` 这类跨包依赖能保持一致，也让升级路径更清晰。

### 包依赖关系图

```text
packages/opencode (核心)
├── depends on: packages/ui
├── depends on: packages/util
└── provides: CLI、Server、Agent

packages/app (Web UI)
├── depends on: packages/ui
├── depends on: packages/sdk/js
└── provides: Web 客户端

packages/desktop (桌面应用)
├── depends on: packages/app
├── depends on: packages/ui
└── provides: Tauri 桌面应用

packages/ui (UI 组件库)
├── depends on: solid-js
└── provides: 共享组件

packages/sdk/js (SDK)
├── depends on: packages/util
└── provides: API 客户端

packages/console/core (控制台核心)
├── depends on: drizzle-orm
└── provides: 业务逻辑

packages/console/app (控制台前端)
├── depends on: packages/console/core
├── depends on: packages/ui
└── provides: 控制台界面
```

**依赖原则**：
- ✅ 上层可以依赖下层（app → ui）
- ❌ 下层不能依赖上层（ui ↛ app）
- ✅ 同层可以互相依赖（app ↔ desktop）
- ❌ 避免循环依赖

### Turbo 编排策略

OpenCode 使用 Turbo 来编排构建任务。查看 `turbo.json`：

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

**Turbo 的作用**：
1. **并行构建**：自动分析依赖关系，并行构建无依赖的包
2. **增量构建**：只重新构建修改过的包
3. **缓存**：构建结果可以缓存，加速后续构建

**构建顺序示例**：
```bash
bun turbo build

# Turbo 自动分析依赖：
# 1. 先构建 packages/util（无依赖）
# 2. 并行构建 packages/ui 和 packages/sdk/js
# 3. 构建 packages/opencode（依赖 ui 和 util）
# 4. 最后构建 packages/app 和 packages/desktop
```

### 构建与发布流程

**本地开发**：
```bash
# 安装所有依赖
bun install

# 类型检查（所有包）
bun turbo typecheck

# 构建所有包
bun turbo build

# 运行特定包
bun run --cwd packages/opencode dev
```

**发布流程**：
```bash
# 1. 版本管理（使用 changesets）
bun changeset

# 2. 生成版本号
bun changeset version

# 3. 构建所有包
bun turbo build

# 4. 发布到 npm
bun changeset publish
```

**为什么使用 changesets**：
- 自动管理版本号
- 生成 CHANGELOG
- 处理包之间的依赖关系
- 支持独立版本和统一版本

---

### 技术栈选择的考量

看 `packages/opencode/package.json` 的依赖：

```json
{
  "dependencies": {
    "ai": "5.0.124",              // Vercel AI SDK - 统一多模型接口
    "hono": "4.10.7",             // Web 框架 - 轻量、快速
    "drizzle-orm": "1.0.0",       // ORM - 类型安全
    "solid-js": "1.9.10",         // TUI 框架 - 响应式
    "@opentui/core": "0.1.87",    // 终端 UI 组件
    "yargs": "18.0.0"             // CLI 解析 - 成熟稳定
  }
}
```

**为什么选 Bun 而不是 Node.js？**
- 启动速度快 3-4 倍
- 内置 TypeScript 支持，无需编译
- 兼容 Node.js 生态

**为什么选 SolidJS 而不是 React？**
- 更小的包体积（TUI 需要快速启动）
- 真正的响应式（不需要虚拟 DOM）
- 性能更好

**为什么选 Hono 而不是 Express？**
- 现代化的 API 设计
- 原生支持 TypeScript
- 更好的性能

### 设计原则：简单但不简陋

看 CLI 入口 `packages/opencode/src/index.ts` 的核心逻辑：

```typescript
let cli = yargs(hideBin(process.argv))
  .scriptName("opencode")
  .command(RunCommand)        // 默认运行（TUI）
  .command(ServeCommand)      // 启动服务器
  .command(WebCommand)        // 启动 Web
  .command(AgentCommand)      // Agent 管理
  .command(McpCommand)        // MCP 服务器
  // ... 更多命令

await cli.parse()
```

**设计思想**：
- 每个命令是独立的模块（`src/cli/cmd/`）
- 命令之间零耦合
- 添加新命令只需要创建文件 + 注册

这就是 **好品味**（Good Taste）：不需要复杂的插件系统，简单的模块化就够了。

---

## 1.3 客户端/服务器分离架构

### 为什么要分离？

如果把 OpenCode 做成单体 CLI，会很快遇到这些问题：
```
用户输入 → CLI 处理 → 调用 AI → 返回结果
```

如果你想要 Web 界面，就得重写一遍逻辑。

**OpenCode 当前的拆法**：
```
CLI/Web/Desktop → HTTP API 服务器 → 业务逻辑 → AI 模型
```

所有客户端共享同一个后端。

### 服务器的核心设计

看 `packages/opencode/src/server/server.ts` 的入口：

```typescript
export const createApp = (opts: { cors?: string[] }): Hono => {
  const app = new Hono()
  return app
    .onError((err, c) => {
      // 统一错误处理
      if (err instanceof NamedError) {
        return c.json(err.toObject(), { status: 500 })
      }
      return c.json(new NamedError.Unknown({ message }).toObject(), {
        status: 500,
      })
    })
    .use(async (c, next) => {
      // 认证中间件
      const password = Flag.OPENCODE_SERVER_PASSWORD
      if (!password) return next()
      return basicAuth({ username, password })(c, next)
    })
    // ... 路由注册
}
```

**关键点**：
1. **错误统一处理**：所有错误都转换为 `NamedError`，前端可以解析
2. **可选认证**：通过环境变量 `OPENCODE_SERVER_PASSWORD` 控制
3. **中间件模式**：日志、CORS、认证都是中间件

### API 设计原则

服务器暴露的主要端点（在 `src/server/routes/` 目录）：

```typescript
// 会话管理
POST   /session/create          // 创建新会话
GET    /session/:id             // 获取会话详情
DELETE /session/:id             // 删除会话
POST   /session/:id/message     // 发送消息
GET    /session/:id/stream      // SSE 流式响应

// 文件操作
GET    /file/read               // 读取文件
POST   /file/write              // 写入文件
GET    /file/tree               // 文件树

// 项目管理
GET    /project/list            // 项目列表
POST   /project/create          // 创建项目
```

**RESTful 设计**：
- 资源用名词（`/session`，不是 `/createSession`）
- HTTP 方法表达操作（GET/POST/DELETE）
- 状态码有意义（404 = 未找到，500 = 服务器错误）

### 本地优先 vs 云端部署

OpenCode 支持两种模式：

**本地模式**（默认）：
```bash
bun dev                    # 启动 TUI，服务器在后台
bun dev serve              # 只启动服务器（端口 4096）
```

**云端模式**：
```bash
# 部署到 Cloudflare Workers
cd infra
sst deploy
```

数据存储：
- 本地模式：SQLite（`~/.opencode/opencode.db`）
- 云端模式：可配置 PostgreSQL/MySQL

---

## 1.4 多端支持策略（CLI/Web/Desktop）

### 三端架构图

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP API 服务器                       │
│              (packages/opencode/src/server/)            │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Session  │  │  File    │  │ Project  │  ...        │
│  │ Routes   │  │ Routes   │  │ Routes   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
         ▲                ▲                ▲
         │                │                │
    ┌────┴────┐      ┌────┴────┐     ┌────┴────┐
    │   CLI   │      │   Web   │     │ Desktop │
    │  (TUI)  │      │  (SPA)  │     │ (Tauri) │
    └─────────┘      └─────────┘     └─────────┘
```

### CLI（TUI）实现

**位置**：`packages/opencode/src/cli/cmd/tui/`

**技术栈**：SolidJS + OpenTUI

**启动流程**（`src/cli/cmd/tui/index.ts`）：
```typescript
export const RunCommand: CommandModule = {
  command: "$0 [directory]",
  describe: "Run OpenCode in the current directory",
  handler: async (opts) => {
    // 1. 启动后台服务器
    const server = await startServer()

    // 2. 渲染 TUI 界面
    render(<App />, {
      exitOnCtrlC: true,
      exitOnEscape: true,
    })
  }
}
```

**为什么前端形态最终落到 TUI？**
- 单次命令行：一问一答，体验割裂
- TUI 工作台：实时更新，更接近 IDE 的连续操作体验

### Web 应用实现

**位置**：`packages/app/`

**技术栈**：SolidJS + Vite

**启动方式**：
```bash
# 先启动服务器
bun dev serve --port 4096

# 再启动 Web 开发服务器
bun run --cwd packages/app dev
```

**关键代码**（`packages/app/src/App.tsx`）：
```typescript
import { SDK } from "@opencode-ai/sdk"

// 连接到本地服务器
const sdk = new SDK({
  baseURL: "http://localhost:4096"
})

// 创建会话
const session = await sdk.session.create({
  workspaceId: "...",
  agent: "primary",
  model: "claude-sonnet-4"
})

// 发送消息
await sdk.session.message(session.id, {
  content: "帮我重构这个函数"
})
```

### 桌面应用实现

**位置**：`packages/desktop/`

**技术栈**：Tauri 2.x + SolidJS

**架构**：
```
┌─────────────────────────────────┐
│      前端（SolidJS）             │
│  复用 packages/app 的代码        │
└─────────────────────────────────┘
         ▲
         │ IPC 通信
         ▼
┌─────────────────────────────────┐
│      后端（Rust）                │
│  - 文件系统访问                  │
│  - 系统托盘                      │
│  - 原生通知                      │
└─────────────────────────────────┘
```

**启动方式**：
```bash
bun run --cwd packages/desktop tauri dev
```

### 代码复用策略

**共享 UI 组件**（`packages/ui/`）：
```typescript
// packages/ui/src/components/button.tsx
export const Button = (props) => {
  return <button class="btn">{props.children}</button>
}

// packages/app 和 packages/desktop 都可以直接用
import { Button } from "@opencode-ai/ui"
```

**共享业务逻辑**（`packages/sdk/js/`）：
```typescript
// SDK 封装了所有 API 调用
import { SDK } from "@opencode-ai/sdk"

// CLI、Web、Desktop 都用同一个 SDK
const sdk = new SDK({ baseURL: "..." })
```

---

## 1.5 开发环境搭建与项目结构导览

### 环境要求

```bash
# 1. 安装 Bun（必需）
curl -fsSL https://bun.sh/install | bash

# 2. 验证版本
bun --version  # 需要 >= 1.3.10

# 3. 克隆仓库
git clone https://github.com/anomalyco/opencode.git
cd opencode

# 4. 安装依赖
bun install
```

**注意**：
- 不要用 `npm install`，必须用 `bun install`
- 如果开发桌面应用，需要安装 Rust 工具链

### 项目目录结构

```
opencode/
├── packages/
│   ├── opencode/          # 核心模块（CLI + 服务器）
│   │   ├── src/
│   │   │   ├── index.ts           # CLI 入口
│   │   │   ├── cli/               # CLI 命令
│   │   │   ├── server/            # HTTP 服务器
│   │   │   ├── agent/             # Agent 系统
│   │   │   ├── session/           # 会话管理
│   │   │   ├── storage/           # 数据库
│   │   │   └── ...
│   │   ├── test/                  # 单元测试
│   │   └── package.json
│   │
│   ├── app/               # Web 应用
│   │   ├── src/
│   │   ├── e2e/                   # E2E 测试
│   │   └── package.json
│   │
│   ├── desktop/           # 桌面应用（Tauri）
│   │   ├── src/                   # 前端代码
│   │   ├── src-tauri/             # Rust 后端
│   │   └── package.json
│   │
│   ├── ui/                # UI 组件库
│   ├── util/              # 工具函数
│   ├── sdk/js/            # JavaScript SDK
│   └── ...
│
├── sdks/
│   └── vscode/            # VSCode 扩展
│
├── infra/                 # 基础设施代码（SST）
├── docs/                  # 文档
└── package.json           # 根配置
```

### 常用开发命令

```bash
# 启动 CLI（TUI）
bun dev

# 启动服务器（无头模式）
bun dev serve

# 启动 Web 应用
bun run --cwd packages/app dev

# 启动桌面应用
bun run --cwd packages/desktop tauri dev

# 类型检查（所有包）
bun turbo typecheck

# 运行测试
bun run --cwd packages/opencode test

# 构建 CLI
bun run --cwd packages/opencode build
```

### 第一次运行

```bash
# 1. 在当前目录启动 OpenCode
bun dev

# 2. 首次运行会提示配置 API Key
# 选择一个提供商（如 Anthropic）
# 输入 API Key

# 3. 开始对话
> 帮我创建一个 TypeScript 项目

# 4. Agent 会自动调用工具，创建文件
```

### 数据存储位置

```bash
~/.opencode/
├── config.json            # 全局配置
├── opencode.db            # SQLite 数据库
├── logs/                  # 日志文件
└── mcp/                   # MCP 服务器配置
```

### 调试技巧

**查看日志**：
```bash
# 实时查看日志
tail -f ~/.opencode/logs/opencode.log

# 或者启动时打印日志
bun dev --print-logs
```

**调试服务器**：
```bash
# 启动服务器并开启调试端口
bun --inspect=ws://localhost:6499/ dev serve
```

**调试 TUI**：
```bash
# 设置日志级别为 DEBUG
bun dev --log-level DEBUG
```

---

## 本章小结

### 你学到了什么

1. **AI Coding Agent 的本质**：不只是代码补全，而是能主动调用工具完成任务的智能体

2. **OpenCode 的架构设计**：
   - Monorepo 管理多个包
   - 客户端/服务器分离
   - 多端共享代码

3. **技术栈选择**：
   - Bun：快速、现代化
   - SolidJS：轻量、响应式
   - Hono：简洁、高性能
   - Drizzle ORM：类型安全

4. **三端实现**：
   - CLI（TUI）：终端交互
   - Web：浏览器访问
   - Desktop：原生应用

### 关键代码位置

| 功能 | 文件路径 |
|------|---------|
| CLI 入口 | `packages/opencode/src/index.ts` |
| 服务器 | `packages/opencode/src/server/server.ts` |
| TUI 实现 | `packages/opencode/src/cli/cmd/tui/` |
| Web 应用 | `packages/app/src/` |
| 桌面应用 | `packages/desktop/` |
| SDK | `packages/sdk/js/` |

### 源码阅读路径

1. 先看仓库根目录的 `package.json` 和 workspace 配置，确认这个 monorepo 里有哪些主包。
2. 再读 `packages/opencode/src/index.ts`，理解 CLI 和本地 server 的总入口。
3. 最后顺着 `packages/app/`、`packages/desktop/`、`packages/opencode/src/server/` 各看一个入口文件，建立三端共享后端的整体图。

### 任务

判断 OpenCode 为什么必须围绕共享运行时主链路组织，而不是做成单体 CLI。

### 操作

1. 打开 `packages/opencode/src/index.ts`、`packages/opencode/src/cli/cmd/run.ts`、`packages/opencode/src/server/server.ts`。
2. 画出一条从用户输入到结果回流的最小链路，并标出哪一层负责运行时前置初始化、哪一层负责共享服务边界、哪一层负责模型与工具循环。
3. 再各看一眼 `packages/app/` 或 `packages/desktop/` 的入口，确认它们为什么可以复用同一套后端语义。

### 验收

完成后你应该能清楚说明：

- 为什么 `run` 命令不是直接把 prompt 丢给模型。
- 为什么 `server.ts` 和 `session` 边界比“写一个 CLI 脚本”更重要。
- 为什么多端形态是同一条运行时主链路的不同外壳，而不是三套独立实现。


### 下一篇预告

**第二篇：Agent 核心系统**

我们将深入 `packages/opencode/src/agent/` 目录，学习：
- Agent 是如何定义的？
- 权限系统如何保护敏感操作？
- `primary` 和 `subagent` 模式有什么区别？
- Prompt 工程的最佳实践

---

### 思考题

1. 为什么 OpenCode 选择客户端/服务器分离架构，而不是把所有逻辑放在 CLI 里？
2. Monorepo 的最大优势是什么？有什么缺点？
3. 如果要添加一个新的客户端（比如移动端），需要修改哪些代码？

（提示：答案都在本章的代码示例中）
