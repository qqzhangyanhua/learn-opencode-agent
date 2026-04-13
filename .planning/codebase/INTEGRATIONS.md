# 外部集成

**分析日期：** 2026-04-13

## API 与外部服务

**OpenAI 兼容模型接口：**
- 用途：实践示例中的模型推理调用
  - 客户端：`openai` SDK
  - 鉴权：`OPENAI_API_KEY`
  - 入口示例：`practice/p01-minimal-agent.ts`、`practice/p15-multi-agent.ts`、`practice/p28-human-in-loop.ts`
  - 端点配置：支持 `OPENAI_BASE_URL` 覆盖，约定写在 `practice/README.md`

**MCP 本地服务：**
- 用途：MCP 协议章节的客户端/服务端演示
  - SDK：`@modelcontextprotocol/sdk`
  - 集成方式：stdio transport，本地进程通信
  - 相关文件：`practice/p14-mcp.ts`、`practice/p14-mcp-server.ts`
  - 特点：这是教学示例依赖，不是站点线上运行依赖

**GitHub 仓库链接：**
- 用途：站点头部导航与源码引用
  - 本书仓库：在 `.vitepress/config.mts` 的 `bookRepository`
  - OpenCode 源码快照：`.vitepress/config.mts` 中 `sourceRepository`、`sourceRepositoryLatest`
  - 说明：属于外链引用，不涉及 API 调用

## 数据存储

**持久化数据库：**
- 未发现站点自身使用数据库
- 内容数据以 Markdown、TypeScript 数据文件和静态构建产物形式存储

**文件存储：**
- 未发现对象存储或上传链路
- 最终产物为 `.vitepress/dist/` 静态文件

**缓存：**
- 开发缓存位于 `.vitepress/cache/`
- 属于本地构建缓存，不是业务级缓存系统

## 认证与身份

**站点自身：**
- 未发现用户登录、鉴权、会话系统

**实践示例：**
- 示例代码会处理 API Key，但仅用于调用外部模型接口
- 未发现统一身份提供方接入，如 Auth0、Supabase Auth、Firebase Auth

## 监控与可观测

**错误追踪：**
- 未发现 Sentry、Datadog、Bugsnag 等线上错误监控集成

**分析统计：**
- 未发现埋点、行为分析或第三方统计 SDK

**日志：**
- 内容校验脚本通过标准输出/标准错误输出反馈结果，见 `scripts/check-*.mjs`

## CI/CD 与部署

**Hosting：**
- 静态站点部署，`package.json` 的 `start` 使用 `caddy run --config /Caddyfile --adapter caddyfile`
- `railpack.toml` 也指向同一启动命令，说明部署面向容器化静态托管

**CI：**
- 当前仓库未发现 `.github/workflows/`
- 发布前质量把关主要依赖本地命令链：`bun run build:strict`

## 环境配置

**开发环境：**
- 站点本身基本零外部密钥
- 实践示例最关键变量是 `OPENAI_API_KEY`
- 可选变量：`OPENAI_BASE_URL`、`OPENAI_MODEL`

**生产环境：**
- 站点静态托管不强依赖后端密钥
- 若部署时需要 Caddy 特定配置，应以 `Caddyfile` 与容器环境为准

## Webhook 与回调

- 未发现站点自身存在 Webhook 接入
- 文档中出现的 `fetch()`、数据库连接、第三方 API 多为示例代码或书中讲解，不构成本站线上依赖

## 事实依据

- 依赖声明：`package.json`
- 运行说明：`README.md`、`practice/README.md`
- 站点外链配置：`.vitepress/config.mts`
- MCP 示例：`practice/p14-mcp.ts`、`practice/p14-mcp-server.ts`
- 部署启动：`package.json`、`railpack.toml`

---
*外部集成审计：2026-04-13*
*新增真实后端服务、统计平台或 CI 后需要更新*
