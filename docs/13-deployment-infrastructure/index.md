---
title: 第十三篇：部署与基础设施
description: 第十三篇：部署与基础设施的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`sst.config.ts`、`infra/`、`packages/function/`、`packages/console/`、`packages/containers/`
> **前置阅读**：第一篇 Agent 基础架构、第八篇 HTTP API 服务器、第十篇 多端 UI 开发
> **学习目标**：理解 OpenCode 不只是一个本地 CLI，而是一套同时覆盖本地运行时、云端 API、控制台与基础设施编排的多层系统

---

<SourceSnapshotCard
  title="第十三篇源码快照"
  description="这一篇先抓 OpenCode 不是单机 CLI 这件事：本地运行时、云端 API、控制台和 SST 基础设施是怎样被拆层并一起交付的。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: 'SST 总入口',
      path: 'sst.config.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/sst.config.ts'
    },
    {
      label: '应用资源编排',
      path: 'infra/app.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/infra/app.ts'
    },
    {
      label: 'Console 资源编排',
      path: 'infra/console.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/infra/console.ts'
    },
    {
      label: '云端 API 入口',
      path: 'packages/function/src/api.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/function/src/api.ts'
    }
  ]"
/>

## 核心概念速览

这一篇最容易写偏的地方，是把 OpenCode 误写成“一个部署到 Cloudflare 的 AI 工具”。

真实情况更接近下面这张图：

```text
本地运行时
  - packages/opencode   -> CLI / TUI / 本地 server
  - packages/app        -> Web 客户端
  - packages/desktop    -> 桌面端

云端产品侧
  - packages/function   -> 分享、同步、外部集成 API
  - packages/console    -> 账号、计费、订阅、模型控制台

基础设施层
  - sst.config.ts
  - infra/app.ts
  - infra/console.ts
  - infra/enterprise.ts

交付层
  - packages/containers
  - GitHub Actions / 发布流程
```

所以这一篇更适合回答四个问题：

1. 本地开发时到底跑了哪些进程
2. 为什么云端还要拆出 `function` 和 `console`
3. SST 在这个仓库里实际管理哪些资源
4. 容器和 CI/CD 在整体链路里负责什么

---

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- OpenCode 的“运行”为什么分成本地运行时、云端产品、基础设施和交付层
- `packages/function`、`packages/console`、`infra/` 在整体架构里分别扮演什么角色
- SST 在这个仓库里到底编排了哪些资源
- 容器、发布、CI/CD 为什么也是系统设计的一部分

### 必看入口

- [sst.config.ts](https://github.com/anomalyco/opencode/blob/dev/sst.config.ts)：基础设施总入口
- [infra/app.ts](https://github.com/anomalyco/opencode/blob/dev/infra/app.ts)：应用侧资源编排
- [infra/console.ts](https://github.com/anomalyco/opencode/blob/dev/infra/console.ts)：控制台侧资源编排
- [packages/function/src/api.ts](https://github.com/anomalyco/opencode/blob/dev/packages/function/src/api.ts)：云端公共 API 入口
- [packages/console/core/src/drizzle/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/console/core/src/drizzle/index.ts)：Console 核心数据访问入口

### 先抓一条主链路

建议先看这条线：

```text
本地 opencode / app / desktop
  -> 云端 packages/function 提供分享、同步、外部集成
  -> packages/console 承担账号、订阅、模型控制台
  -> sst.config.ts + infra/*.ts 编排云端资源
  -> containers / CI-CD 负责构建和交付
```

先看懂“系统被分成了几层”，再去分别研究 Cloudflare、SST、容器和控制台细节。

### 初学者阅读顺序

1. 先读 `sst.config.ts` 和 `infra/app.ts`，建立基础设施总图。
2. 再读 `packages/function/src/api.ts` 和 `packages/console/core/src/*`，区分云端公共 API 与控制台产品域。
3. 最后补看 `infra/console.ts`、`infra/enterprise.ts` 以及发布相关目录，理解交付层是怎么接上的。

### 最容易误解的点

- OpenCode 不等于“一个部署到 Cloudflare 的 AI 工具”，本地运行时仍然是核心产品面。
- `packages/opencode/src/server` 和 `packages/function/src/api.ts` 不是同类服务端。
- 基础设施层不是附属物，它直接反映了产品边界和资源切分方式。

## 13.1 本地运行时与开发环境

### 先分清“本地 OpenCode”和“云端 OpenCode”

如果只看产品表层，很容易把 OpenCode 理解成“一个 CLI，再加一点云端能力”。但从仓库结构看，本地部分本身就已经拆成了多入口：

- `packages/opencode`：本地 CLI / TUI / server
- `packages/app`：本地 Web 客户端
- `packages/desktop`：桌面端

根目录脚本也直接说明了这一点：

- `bun run dev` -> 进入 `packages/opencode`
- `bun run dev:web` -> 进入 `packages/app`
- `bun run dev:desktop` -> 进入 `packages/desktop`

所以本地开发更准确的理解是：**围绕同一套核心语义，按不同终端选择不同入口。**

### 为什么这件事对 Agent 初学者重要

这会直接影响你对“Agent 到底运行在哪里”的判断。

在当前仓库里：

- 真正的 Agent 核心在 `packages/opencode`
- Web / Desktop 更多是客户端壳层
- 本地 server 是多端共享的后端能力边界

这也解释了为什么前面几篇里你会看到：

- TUI 调本地 server
- VS Code 扩展调本地 opencode 端口
- Web 端复用同样的服务语义

换句话说，**本地运行时本身就是架构层的一部分**；云端不是来替代它，而是承接分享、同步、账号和控制台等产品侧能力。

### 本地开发更像“多入口单核心”

这个仓库的一个核心特点，是把前端入口拆开，但尽量让后端语义一致：

| 入口 | 主要位置 | 角色 |
| --- | --- | --- |
| CLI / TUI | `packages/opencode` | Agent 核心、本地服务、终端交互 |
| Web | `packages/app` | 浏览器端 UI |
| Desktop | `packages/desktop` | 桌面壳层，复用 UI |

对读者来说，理解这一层之后，再看云端部分就不会困惑：

云端不是拿来“替代本地 Agent”，而是给本地 Agent 之外的产品能力提供稳定落点。

---

## 13.2 SST 与 Cloudflare 部署

### `sst.config.ts` 是基础设施入口，不是业务入口

当前仓库的基础设施入口很清晰，就在 [sst.config.ts](https://github.com/anomalyco/opencode/blob/dev/sst.config.ts)：

```ts
export default $config({
  app(input) {
    return {
      name: "opencode",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "cloudflare",
      providers: {
        stripe: { apiKey: process.env.STRIPE_SECRET_KEY! },
        planetscale: "0.4.1",
      },
    }
  },
  async run() {
    await import("./infra/app.js")
    await import("./infra/console.js")
    await import("./infra/enterprise.js")
  },
})
```

这段配置能看出三件事：

1. 默认部署目标是 Cloudflare
2. Stripe 和 PlanetScale 是基础设施级依赖，不是业务代码里临时接入的 SDK
3. 基础设施按 `app / console / enterprise` 三条线拆模块

### Stage 不是附属概念，而是资源隔离策略

这个配置里非常值得初学者学习的一点，是 stage 设计：

- 生产环境资源默认 `retain`
- 生产环境默认 `protect`
- 非生产环境允许回收

这体现的是一个非常典型的基础设施思路：

**环境隔离不是靠约定，而是靠 IaC 默认值保证。**

### `infra/app.ts` 管的是公开产品面

[infra/app.ts](https://github.com/anomalyco/opencode/blob/dev/infra/app.ts) 主要负责三类资源：

1. `api.<domain>` 对应的 Cloudflare Worker
2. `docs.<domain>` 对应的文档站点
3. `app.<domain>` 对应的 Web 客户端

关键代码很直观：

```ts
export const api = new sst.cloudflare.Worker("Api", {
  domain: `api.${domain}`,
  handler: "packages/function/src/api.ts",
  url: true,
})

new sst.cloudflare.x.Astro("Web", {
  domain: "docs." + domain,
  path: "packages/web",
})

new sst.cloudflare.StaticSite("WebApp", {
  domain: "app." + domain,
  path: "packages/app",
})
```

这也说明 OpenCode 的“产品前台”并不是一个单体站点，而是拆成：

- API
- 文档
- App

### Durable Object 在这里扮演同步和分享角色

`infra/app.ts` 里最值得点出来的是 `SYNC_SERVER` 绑定：

```ts
args.bindings = $resolve(args.bindings).apply((bindings) => [
  ...bindings,
  {
    name: "SYNC_SERVER",
    type: "durable_object_namespace",
    className: "SyncServer",
  },
])
```

这说明 Cloudflare Durable Object 在这个系统里不是装饰性功能，而是承担了会话同步 / 分享相关能力的状态核心。

也就是说，云端 API 这部分并不只是“普通 REST 接口”，它还承载了实时状态同步。

---

## 13.3 `packages/function` 与 `packages/console` 的云端架构

### `packages/function` 更像产品级公共 API

[packages/function/src/api.ts](https://github.com/anomalyco/opencode/blob/dev/packages/function/src/api.ts) 这部分非常值得单独讲，因为它和 `packages/opencode/src/server/` 不是一回事。

本地 `server/` 更偏向本地运行时和客户端协作；  
而 `packages/function/src/api.ts` 则是云端产品面向外部的能力，例如：

- share create/delete/sync
- Durable Object WebSocket
- R2 持久化共享数据
- Feishu / Discord / GitHub 等外部集成

这说明仓库里存在两套“服务端”语义：

1. **本地 Agent 服务端**
2. **云端产品服务端**

如果电子书不把这点讲清楚，初学者会很容易把 `packages/opencode/src/server` 和 `packages/function/src/api.ts` 混为一谈。

### `packages/console` 是另一条完全不同的产品线

`packages/console` 这一组目录也很重要：

- `packages/console/app`：控制台前端（SolidStart）
- `packages/console/core`：数据库与业务核心
- `packages/console/function`：认证与日志处理 Worker
- `packages/console/mail`：邮件模板（JSX Email）
- `packages/console/resource`：资源定义

它说明 OpenCode 不只是“本地编码 Agent”，同时还在建设一个云端控制台产品。

### Console Core 的架构设计

[packages/console/core](https://github.com/anomalyco/opencode/blob/dev/packages/console/core) 是控制台的业务核心，采用经典的分层架构：

**1. Schema 层**（`src/schema/`）：
- `account.sql.ts` - 账户表结构
- `user.sql.ts` - 用户表结构
- `workspace.sql.ts` - 工作区表结构
- `billing.sql.ts` - 计费表结构
- `model.sql.ts` - 模型配置表
- `provider.sql.ts` - 提供商配置表
- `key.sql.ts` - API Key 管理表
- `auth.sql.ts` - 认证信息表
- `benchmark.sql.ts` - 性能基准表
- `ip.sql.ts` - IP 管理表

**2. 业务逻辑层**（`src/`）：
- `account.ts` - 账户管理
- `user.ts` - 用户管理
- `workspace.ts` - 工作区管理
- `billing.ts` - 计费逻辑
- `subscription.ts` - 订阅管理
- `model.ts` - 模型配置
- `provider.ts` - 提供商管理
- `key.ts` - API Key 管理
- `black.ts` - 黑名单管理

**3. 基础设施层**（`src/`）：
- `drizzle/` - ORM 配置与类型
- `aws.ts` - AWS 服务集成
- `context.ts` - 请求上下文
- `actor.ts` - 操作者身份
- `identifier.ts` - ID 生成（ULID）
- `lite.ts` - 轻量级客户端

**4. 工具层**（`src/util/`）：
- `date.ts` - 日期处理
- `price.ts` - 价格计算
- `log.ts` - 日志工具
- `memo.ts` - 缓存工具
- `fn.ts` - 通用函数
- `env.cloudflare.ts` - Cloudflare 环境变量

### Console 的数据库策略

**为什么用 PlanetScale/PostgreSQL 而不是 SQLite**：

| 维度 | 本地 Agent (SQLite) | Console (PlanetScale/PostgreSQL) |
|------|---------------------|----------------------------------|
| 使用场景 | 单用户、本地优先 | 多用户、云端协作 |
| 并发需求 | 低（单进程） | 高（多租户） |
| 数据规模 | 小（个人项目） | 大（所有用户） |
| 备份恢复 | 文件复制 | 自动备份、PITR |
| 扩展性 | 垂直扩展 | 水平扩展 |
| 运维成本 | 零配置 | 托管服务 |

这不是技术栈不统一，而是**不同运行场景选不同存储**。

### Console 的业务域模型

**1. 账户与用户体系**：
```typescript
Account (账户)
  ├── User (用户)
  │   ├── email, name, avatar
  │   └── createdAt, updatedAt
  ├── Workspace (工作区)
  │   ├── name, slug
  │   └── members, settings
  └── Subscription (订阅)
      ├── plan: 'free' | 'pro' | 'enterprise'
      ├── status: 'active' | 'canceled' | 'past_due'
      └── stripeSubscriptionId
```

**2. 计费与配额**：
```typescript
Billing (计费)
  ├── Usage (使用量)
  │   ├── tokens, requests
  │   └── date, modelId
  ├── Limit (限制)
  │   ├── maxTokens, maxRequests
  │   └── period: 'daily' | 'monthly'
  └── Payment (支付记录)
      ├── amount, currency
      └── stripePaymentId
```

**3. 模型与提供商**：
```typescript
Model (模型配置)
  ├── name, provider
  ├── enabled, pricing
  └── capabilities

Provider (提供商)
  ├── name, type
  ├── apiEndpoint
  └── authConfig
```

**4. API Key 管理**：
```typescript
Key (API Key)
  ├── accountId, workspaceId
  ├── key (加密存储)
  ├── permissions
  └── expiresAt
```

### Console 的迁移管理

Console Core 有 **60+ 数据库迁移文件**，说明这是一个持续演进的系统：

```bash
migrations/
├── 20250902065410_fluffy_raza/          # 初始 Schema
├── 20250903035359_serious_whistler/     # 添加用户表
├── ...
└── 20260224043338_nifty_starjammers/    # 最新迁移
```

**迁移管理命令**：
```bash
bun db                    # 进入 Drizzle Kit shell
bun db-dev                # Dev 环境
bun db-prod               # 生产环境

# 在 shell 中执行
drizzle-kit generate      # 生成迁移
drizzle-kit migrate       # 执行迁移
drizzle-kit push          # 推送 Schema
```

### Console 的模型与限制配置

Console 提供了一套完整的模型配置管理流程：

```bash
# 更新模型配置
bun update-models

# 推送到不同环境
bun promote-models-to-dev
bun promote-models-to-prod

# 从环境拉取配置
bun pull-models-from-dev
bun pull-models-from-prod

# 限制配置同理
bun update-limits
bun promote-limits-to-dev
bun promote-limits-to-prod
```

这套流程说明 Console 把“模型配置”当成了一种需要版本管理和环境隔离的资源。

### Console 承担的产品职责

这条产品线承担的核心职责：

1. **用户与账号管理**：注册、登录、权限、团队
2. **Workspace 管理**：多工作区、成员管理、设置
3. **模型与配额控制**：模型启用/禁用、使用限制、配额管理
4. **计费与订阅**：Stripe 集成、订阅管理、支付记录
5. **API Key 管理**：密钥生成、权限控制、过期管理
6. **运营后台能力**：用户管理、数据统计、黑名单管理

### `infra/console.ts` 体现的是“产品后台基础设施”

[infra/console.ts](https://github.com/anomalyco/opencode/blob/dev/infra/console.ts) 里最明显的三类资源是：

1. **PlanetScale 数据库**：多租户数据存储
2. **Auth Worker**：认证与授权服务
3. **Console 应用**：SolidStart 前端应用

比如：

```ts
const cluster = planetscale.getDatabaseOutput(...)

export const auth = new sst.cloudflare.Worker("AuthApi", {
  handler: "packages/console/function/src/auth.ts",
})

new sst.cloudflare.x.SolidStart("Console", {
  path: "packages/console/app",
})
```

这一层和本地 Agent 没有直接等价关系，它是产品商业化和运营化所需的基础设施。

**Console 基础设施的完整架构**：

```text
┌─────────────────────────────────────────────────────────┐
│                   Console 前端                           │
│              (SolidStart + Cloudflare Pages)            │
│  - 用户界面                                              │
│  - 工作区管理                                            │
│  - 订阅与计费                                            │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Auth Worker │    │ Log Processor│    │ Stripe       │
│  (认证授权)   │    │  (日志处理)   │    │ Webhook      │
└──────────────┘    └──────────────┘    └──────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PlanetScale DB  │
                    │  (PostgreSQL)    │
                    │  - account       │
                    │  - user          │
                    │  - workspace     │
                    │  - billing       │
                    │  - model         │
                    │  - provider      │
                    └──────────────────┘
```

**关键设计决策**：

1. **认证独立部署**：Auth Worker 单独部署，可以独立扩展和更新
2. **日志异步处理**：Log Processor 异步处理日志，不阻塞主流程
3. **Stripe Webhook**：支付事件通过 Webhook 异步处理
4. **数据库托管**：使用 PlanetScale 托管服务，自动备份和扩展

---

## 13.4 容器、发布与 CI/CD

### 容器并不是主运行方式，但仍然很重要

仓库里有专门的 `packages/containers/`：

- `base/Dockerfile`
- `bun-node/Dockerfile`
- `rust/Dockerfile`
- `tauri-linux/Dockerfile`
- `publish/Dockerfile`

这说明容器在当前项目里的定位更偏向：

1. 构建环境标准化
2. 发布流程支撑
3. 跨平台产物制作

而不是“所有开发都必须 Docker 化”。

### 为什么会有多种容器镜像

从目录名就能看出来，每个镜像职责不同：

- `base`：通用基础环境
- `bun-node`：兼顾 Bun 和 Node 的构建场景
- `rust`：为桌面或原生相关构建准备
- `tauri-linux`：桌面端 Linux 打包
- `publish`：发布链路

这和前面讲的多端结构是对应的。  
项目支持 CLI、Web、Desktop，自然也会需要多种交付环境。

### CI/CD 在这里的真正价值

对这个仓库来说，CI/CD 不是简单地跑测试后发布。

它至少承担三种职责：

1. 保证多包 monorepo 的构建稳定性
2. 保证多目标产物的发布链路一致
3. 把云端基础设施与应用发布串起来

所以你在写这一篇时，重点不该只是“GitHub Actions 怎么写”，而是：

**为什么多端、多包、多基础设施的项目必须把发布流程工程化。**

---

## 13.5 监控、日志与扩展性

### 当前基础设施已经明显在为运营态做准备

从 `infra/app.ts` 和 `infra/console.ts` 可以直接看到几种生产特征：

- Worker `logpush`
- Log Processor Worker
- Stripe Webhook
- Auth Worker
- 多个 Secret / Linkable 资源
- Console 与 API 分域部署

这些都说明这个仓库已经不是“个人工具仓库”阶段，而是产品化基础设施形态。

### 扩展性的关键不只是横向扩容

这一层如果只写“负载均衡、缓存、水平扩展”会比较空。

更贴近当前仓库的扩展性，其实体现在：

1. **域职责拆分**：`api`、`docs`、`app`、`auth`、`console`
2. **资源拆分**：R2、KV、Durable Object、PlanetScale、Stripe
3. **代码包拆分**：本地 Agent、云端 function、console core、containers
4. **环境拆分**：prod / dev / stage

这类拆分能力，决定了项目能不能持续演进，而不是某一个组件单点性能有多强。

### 对电子书读者最有价值的视角

如果你的目标读者是 Agent 开发初学者，我建议这一篇最终强调的是：

- 本地 Agent 能跑起来，不代表整个产品架构就完成了
- 一个成熟 Agent 产品通常还需要分享、认证、控制台、计费、运营、日志
- 这些能力往往不该堆进主进程，而应该拆到独立包和独立基础设施里

---

## 本章小结

### 这一篇最重要的认识

1. OpenCode 的基础设施不是只有 Cloudflare 部署
2. 本地运行时、本地 server、云端 function、console 是四层不同职责
3. SST 在这里管理的是产品级资源编排，不是替代应用业务代码
4. `packages/function` 与 `packages/opencode/src/server` 不是同一类服务端
5. PlanetScale、R2、KV、Durable Object、Stripe 共同组成了云端产品面

### 关键代码位置

| 模块 | 位置 | 建议重点 |
|------|------|---------|
| 基础设施入口 | `sst.config.ts` | stage、provider、模块入口 |
| 产品前台资源 | `infra/app.ts` | API Worker、Docs、WebApp、Durable Object |
| 控制台资源 | `infra/console.ts` | PlanetScale、Auth、Console、Stripe |
| 云端公共 API | `packages/function/src/api.ts` | share/sync、DO、外部集成 |
| 控制台核心 | `packages/console/core` | 云端数据库与业务域模型 |
| Console Schema | `packages/console/core/src/schema/` | 数据库表结构定义 |
| Console 业务逻辑 | `packages/console/core/src/` | account、user、workspace、billing 等 |
| Console 迁移 | `packages/console/core/migrations/` | 60+ 数据库迁移文件 |
| 容器 | `packages/containers` | 构建与发布环境拆分 |

### 源码阅读路径

1. 先读 `sst.config.ts` 和 `infra/` 下的主入口，建立本地运行时与云端资源的总图。
2. 再看 `packages/console/core/CLAUDE.md`，理解 Console 的整体架构和职责。
3. 然后读 `packages/console/core/src/schema/`，了解数据库表结构设计。
4. 接着看 `packages/console/core/src/` 下的业务逻辑文件（account、user、workspace、billing 等）。
5. 分别看 `packages/function/` 和 `packages/console/core/`，区分“云端公共 API”和“控制台业务域”。
6. 最后看 `packages/containers/` 或发布相关脚本，理解构建环境为什么也被单独成包。

### 任务

判断 OpenCode 的部署与基础设施为什么不能被简化成“把一个应用部署到 Cloudflare”，而必须拆成本地运行时、云端 API、Console 和 IaC 资源编排几层。

### 操作

1. 打开 `sst.config.ts` 与 `infra/app.ts`，整理基础设施总入口怎样把 `app / console / enterprise` 三条线拆开。
2. 再读 `packages/function/src/api.ts` 与 `packages/console/core/src/`，分别写出“云端公共 API”和“控制台业务域”各自解决什么问题。
3. 最后以“分享 session”或“登录控制台”为例，画出请求会经过哪几个包和哪些基础设施资源。

### 验收

完成后你应该能说明：

- 为什么 `packages/opencode/src/server`、`packages/function/src/api.ts`、`packages/console/core` 不能混成一个统一后端。
- 为什么 SST 在这里管理的是资源编排，而不是替代业务架构设计。
- 如果你只做本地 Agent 原型，哪些云端层可以先不做，但哪些边界最好从一开始就留出来。

### 下一篇预告

理解了运行时和基础设施之后，再看测试体系会更清楚：

- 本地核心该怎么测
- 云端逻辑该怎么测
- 多端 UI 与 E2E 如何衔接
- 哪些层适合单测，哪些层必须做集成测试

这就是第十四篇要解决的问题。

### 思考题

1. 为什么 `packages/opencode/src/server`、`packages/function/src/api.ts`、`packages/console/core` 这三层不能被混成一个“统一后端”？
2. SST 在这个仓库里真正提供的价值是什么，为什么它不能替代应用层业务设计？
3. 如果你只做一个本地 Agent 原型，哪些云端层可以先不做，但哪些边界最好一开始就预留？
