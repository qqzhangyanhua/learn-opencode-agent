# 技术栈

**分析日期：** 2026-04-13

## 语言

**主要语言：**
- TypeScript - 站点主题代码、数据装配、实践示例，主要集中在 `.vitepress/theme/**/*.ts`、`practice/*.ts`
- Vue SFC - 交互式教学组件，集中在 `.vitepress/theme/components/*.vue`
- Markdown - 电子书正文与章节内容，集中在 `docs/**/index.md` 及系列专题 `.md`

**次要语言：**
- JavaScript ESM - 内容校验脚本，集中在 `scripts/check-*.mjs`
- Python - 中级专题配套示例，集中在 `docs/intermediate/examples/**`

## 运行时

**开发/构建环境：**
- Bun - 作为依赖安装与主要命令入口，`package.json` 和 `README.md` 都以 `bun install`、`bun run ...` 为主
- Node.js 兼容运行时 - `scripts/check-*.mjs` 使用 `node:fs/promises`、`node:path` 等内置模块
- 浏览器 - VitePress 前端页面与自定义 Vue 组件在浏览器执行

**包管理器：**
- Bun - 存在 `bun.lockb`
- 仓库中同时存在 `pnpm-lock.yaml`，说明历史上或并行存在 pnpm 工作流，但当前主说明文档不以 pnpm 为主

## 框架与核心工具

**站点与 UI：**
- VitePress `^1.5.0` - 静态文档站点框架，主配置在 `.vitepress/config.mts`
- Vue 3 - 由 VitePress 主题层承载，组件注册入口在 `.vitepress/theme/index.ts`
- vitepress-plugin-mermaid `^2.0.17` - Mermaid 图表支持，通过 `withMermaid()` 包装配置

**类型与构建：**
- TypeScript `^5.8.2` - 主题层与数据层类型检查，配置在 `.vitepress/tsconfig.json`
- esbuild - 通过 Vite/VitePress 内部链路使用，在 `.vitepress/config.mts` 显式覆盖 `target`

**教学演示依赖：**
- `openai` `^6.32.0` - 实践示例中的 OpenAI SDK，见 `practice/p01-minimal-agent.ts` 等
- `@modelcontextprotocol/sdk` `^1.27.1` - MCP 客户端/服务端演示，见 `practice/p14-mcp.ts`、`practice/p14-mcp-server.ts`
- `lottie-web` `^5.13.0` - 动画型教学组件依赖，见 `.vitepress/theme/components/animations/lottie/*`
- `mermaid` `^11.13.0` - 图表渲染依赖

## 关键依赖

**站点基础：**
- `vitepress` - 文档站点生成、路由、主题体系
- `typescript` - 主题层和数据层的类型约束
- `vitepress-plugin-mermaid` - 文档中的 Mermaid 图渲染

**教学演示：**
- `openai` - 绝大多数实践项目的模型调用入口
- `@modelcontextprotocol/sdk` - MCP 章节的协议演示
- `lottie-web` - 动画组件表现层

## 配置

**核心配置文件：**
- `package.json` - 命令、依赖与启动入口
- `.vitepress/config.mts` - VitePress 站点配置、导航、边栏、OG 元数据、Mermaid、构建策略
- `.vitepress/tsconfig.json` - 主题层 TypeScript 检查范围
- `.gitignore` - 忽略构建产物与本地环境文件
- `railpack.toml`、`Caddyfile` - 容器/静态服务启动配置

**环境变量：**
- 站点自身未看到强依赖环境变量
- 实践示例依赖 `OPENAI_API_KEY`，并支持 `OPENAI_BASE_URL`、`OPENAI_MODEL`，约定写在 `practice/README.md`

## 平台要求

**开发：**
- 任意支持 Bun 与现代 Node 兼容能力的环境
- 浏览器用于预览 VitePress 站点

**生产：**
- 产物是静态站点，构建输出到 `.vitepress/dist/`
- `package.json` 中提供 `start` 命令，使用 Caddy 托管静态内容

## 事实依据

- 依赖与命令：`package.json`
- 主题配置：`.vitepress/config.mts`
- 主题入口：`.vitepress/theme/index.ts`
- 示例环境约定：`practice/README.md`
- 构建忽略项：`.gitignore`

---
*技术栈分析：2026-04-13*
*依赖升级、包管理策略变化或部署方式调整后应同步更新*
