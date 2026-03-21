# External Integrations

**Analysis Date:** 2026-03-21

## APIs & External Services

**LLM API:**
- OpenAI 兼容接口 - 为实践篇脚本提供模型调用能力
  - SDK/Client: `openai` npm 包，调用点见 `practice/p01-minimal-agent.ts`、`practice/p20-observability.ts`、`practice/p23-production.ts`
  - Auth: `OPENAI_API_KEY` 环境变量
  - Endpoint: `OPENAI_BASE_URL` 可覆盖默认 OpenAI 地址，支持代理、Azure 或本地兼容服务
  - Models: `OPENAI_MODEL` 默认多处回退到 `gpt-4o` 或 `gpt-4o-mini`

**Source Repositories:**
- GitHub 仓库链接 - 文档内容大量引用外部源码基线
  - 本书仓库链接配置在 `.vitepress/config.mts` 的 `bookRepository`
  - OpenCode 源码基线与 `dev` 分支链接同样在 `.vitepress/config.mts`
  - 这是内容层面的外部依赖，不是运行时 SDK 集成

## Data Storage

**Databases:**
- 无应用数据库
  - 站点本身是静态文档站
  - 实践脚本示例主要以内存数据结构、控制台输出或本地文件处理为主

**File Storage:**
- 本地文件系统
  - 文档源文件位于 `docs/`
  - 构建产物位于 `.vitepress/dist`
  - 缓存位于 `.vitepress/cache`

**Caching:**
- 无显式缓存服务（无 Redis、Memcached 等接入）
- VitePress 自身构建缓存位于 `.vitepress/cache/`，属于本地构建产物

## Authentication & Identity

**Auth Provider:**
- 无站点用户认证系统
- 仓库里的“鉴权”仅出现在实践篇示例代码和文档案例中，不服务于本仓库站点本身

**OAuth Integrations:**
- 无仓库级 OAuth 集成

## Monitoring & Observability

**Error Tracking:**
- 未发现 Sentry、Datadog、Bugsnag 等真实接入

**Analytics:**
- 未发现埋点 SDK 或第三方统计接入

**Logs:**
- 本地主要依赖 VitePress、Node 脚本和 Caddy 的标准输出
- 校验脚本直接使用 `console.log` / `console.error`，见 `scripts/check-content.mjs`

## CI/CD & Deployment

**Hosting:**
- Caddy - 提供静态文件服务
  - 配置文件: `Caddyfile`
  - 根目录: `/app/.vitepress/dist`
  - 路由策略: `try_files {path} /index.html`

**Build Platform:**
- Railpack
  - 配置文件: `railpack.toml`
  - Build: `pnpm run build`
  - Start: `caddy run --config /Caddyfile --adapter caddyfile`

**CI Pipeline:**
- 仓库中未发现 `.github/workflows/`
- 当前自动化更像“本地执行校验脚本”，而非正式 CI 流水线

## Environment Configuration

**Development:**
- 关键变量: `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`
- 模板文件: `.env.example`
- 实际密钥文件: `.env`（已被 `.gitignore` 忽略）

**Staging:**
- 未发现单独 staging 配置

**Production:**
- 未发现专用 secrets 管理器配置
- 部署时需要至少提供构建环境和静态服务环境

## Webhooks & Callbacks

**Incoming:**
- 未发现真实 webhook 入口

**Outgoing:**
- 未发现服务端回调或第三方 webhook 推送

## Integration Notes

- 这个仓库的外部依赖核心是“模型 API + 外部源码引用 + 静态部署服务”
- 对仓库本身最敏感的外部边界是 `.env` 中的模型凭据与 README/文档中引用的外部源码链接
- 若后续引入搜索、评论、分析统计或托管评论系统，应先更新这里并补充部署与隐私边界

---
*Integration audit: 2026-03-21*
*Update when adding/removing external services*
