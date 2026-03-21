# Technology Stack

**Analysis Date:** 2026-03-21

## Languages

**Primary:**
- TypeScript - 站点主题、交互组件、实践脚本与根目录辅助脚本，集中在 `.vitepress/`、`practice/*.ts`、根目录 `*.ts`
- Markdown - 章节内容与项目文档，集中在 `docs/**/index.md`、`README.md`、`docs/superpowers/**/*.md`

**Secondary:**
- Vue Single File Components - VitePress 自定义组件，集中在 `.vitepress/theme/components/*.vue`
- CSS - 主题样式与组件局部样式，集中在 `.vitepress/theme/custom.css` 和各组件 `<style scoped>`
- JavaScript ESM - 内容校验脚本，集中在 `scripts/*.mjs`
- Python - 仅作为教学示例，位于 `docs/intermediate/examples/**/*.py`

## Runtime

**Environment:**
- Node.js 运行时 - 用于 `vitepress`、`tsc`、校验脚本和绝大多数开发命令
- 浏览器运行时 - 承载 VitePress 页面与交互组件，例如 `.vitepress/theme/components/RunCommand.vue`
- Caddy - 生产静态文件服务，入口在 `Caddyfile`

**Package Manager:**
- 仓库同时保留 `bun.lockb` 与 `pnpm-lock.yaml`
- README 主要使用 `bun dev`、`bun build`、`bun preview`
- `railpack.toml` 的构建命令是 `pnpm run build`
- 现状是“Bun 本地开发 + pnpm/Node 兼容部署”的混合模式，需要改动时先确认目标环境

## Frameworks

**Core:**
- VitePress `^1.5.0` - 文档站点框架，主配置在 `.vitepress/config.mts`
- Vue 3（由 VitePress 提供）- 自定义交互组件与 composable，入口在 `.vitepress/theme/index.ts`

**Content & Visuals:**
- `vitepress-plugin-mermaid` `^2.0.17` - Mermaid 图表支持，接入点在 `.vitepress/config.mts`
- `mermaid` `^11.13.0` - 图表渲染
- `lottie-web` `^5.13.0` - 动画类组件依赖，见 `.vitepress/theme/index.ts`

**Practice & Examples:**
- `openai` `^6.32.0` - 实践脚本默认模型客户端，广泛用于 `practice/*.ts`
- `@modelcontextprotocol/sdk` `^1.27.1` - MCP 相关实践内容依赖

**Build/Dev:**
- TypeScript `^5.8.2` - 类型检查，入口命令 `npm run typecheck`
- Node 原生 `fs/promises`、`path`、`url` - 内容校验脚本基础设施，见 `scripts/check-content.mjs`

## Key Dependencies

**Critical:**
- `vitepress` - 负责文档站点生成、导航、搜索与主题系统
- `openai` - 驱动实践篇脚本里的 Agent 示例
- `@modelcontextprotocol/sdk` - 支持实践篇 MCP 章节
- `vitepress-plugin-mermaid` - 支持教程内 Mermaid 结构图
- `lottie-web` - 支撑动态图解组件

**Infrastructure:**
- `typescript` - 约束 `.vitepress` 与根目录 TypeScript 脚本
- Caddy - 静态部署服务，读取 `.vitepress/dist`

## Configuration

**Environment:**
- `.env` / `.env.example` - 主要提供 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`
- 实践脚本统一通过 `process.env` 读取 OpenAI 兼容配置，例如 `practice/p01-minimal-agent.ts`

**Build:**
- `.vitepress/config.mts` - 站点导航、侧边栏、OG 信息、Mermaid 与 Vite 配置
- `tsconfig.json` - TypeScript 编译范围与 `Bundler` 解析策略
- `package.json` - 开发、构建、预览、校验命令
- `railpack.toml` - 部署平台构建/启动命令
- `Caddyfile` - 生产静态文件根目录与 SPA fallback

## Platform Requirements

**Development:**
- 需要可运行 Node.js 的环境
- 本地推荐按 README 使用 Bun 命令；若使用 pnpm，也要确认锁文件与脚本行为一致
- 若要运行实践脚本，需要可用的 OpenAI 兼容 API 凭据

**Production:**
- 产物是静态站点 `.vitepress/dist`
- 生产服务基于 Caddy，从 `/app/.vitepress/dist` 提供静态内容
- 适合部署到支持 Node 构建 + 静态托管的环境，例如 Railpack

---
*Stack analysis: 2026-03-21*
*Update after major dependency or runtime changes*
