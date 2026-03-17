# 从零构建 AI Coding Agent — OpenCode 源码剖析与实战

基于 VitePress 构建的电子书站点，系统剖析 [OpenCode](https://github.com/anomalyco/opencode/tree/dev) 源码，涵盖 AI Agent 基础架构、工具系统、多模型支持、TUI 界面等 16 个章节。

## 目录结构

```text
.
├── .vitepress/
│   ├── config.mts              # 站点配置（导航、侧边栏、Mermaid 插件）
│   └── theme/
│       ├── index.ts
│       ├── custom.css
│       └── components/
│           ├── LearningPath.vue          # 学习路径导引组件
│           ├── TechStackGrid.vue         # 技术栈网格展示
│           ├── ReActLoop.vue             # ReAct 循环动画演示
│           ├── RuntimeLifecycleDiagram.vue  # 运行时生命周期图
│           ├── StreamingDemo.vue         # 流式输出演示
│           └── SourceSnapshotCard.vue    # 源码快照卡片
├── docs/
│   ├── index.md                # 首页（layout: home）
│   ├── reading-map.md          # 阅读地图
│   ├── version-notes.md        # 版本说明
│   ├── glossary.md             # 术语表
│   ├── release-checklist.md    # 发布清单
│   ├── 00-what-is-ai-agent/
│   ├── 01-agent-basics/
│   ├── 02-agent-core/
│   ├── 03-tool-system/
│   ├── 04-session-management/
│   ├── 05-provider-system/
│   ├── 06-mcp-integration/
│   ├── 07-tui-interface/
│   ├── 08-http-api-server/
│   ├── 09-data-persistence/
│   ├── 10-multi-platform-ui/
│   ├── 11-code-intelligence/
│   ├── 12-plugins-extensions/
│   ├── 13-deployment-infrastructure/
│   ├── 14-testing-quality/
│   └── 15-advanced-topics/
├── add-frontmatter.ts          # 辅助脚本：补充 frontmatter
├── remove-duplicate-titles.ts  # 辅助脚本：移除重复 H1
├── Caddyfile                   # 生产静态服务配置
├── railpack.toml               # Railpack 部署配置
└── package.json
```

## 章节结构

| 章节 | 目录 |
|------|------|
| 第1章：什么是 AI Agent | `00-what-is-ai-agent/` |
| 第2章：AI Agent 的核心组件 | `01-agent-basics/` |
| 第3章：OpenCode 项目介绍 | `02-agent-core/` |
| 第4章：工具系统 | `03-tool-system/` |
| 第5章：会话管理 | `04-session-management/` |
| 第6章：多模型支持 | `05-provider-system/` |
| 第7章：MCP 协议集成 | `06-mcp-integration/` |
| 第8章：TUI 终端界面 | `07-tui-interface/` |
| 第9章：HTTP API 服务器 | `08-http-api-server/` |
| 第10章：数据持久化 | `09-data-persistence/` |
| 第11章：多端 UI 开发 | `10-multi-platform-ui/` |
| 第12章：代码智能 | `11-code-intelligence/` |
| 第13章：插件与扩展 | `12-plugins-extensions/` |
| 第14章：部署与基础设施 | `13-deployment-infrastructure/` |
| 第15章：测试与质量保证 | `14-testing-quality/` |
| 第16章：高级主题与最佳实践 | `15-advanced-topics/` |

## 本地开发

```bash
bun install
bun dev      # 启动开发服务器
bun build    # 构建静态产物到 .vitepress/dist/
bun preview  # 预览构建结果
```

## 生产部署

静态产物由 Caddy 托管，监听 `:3000`：

```bash
# 构建
pnpm run build

# 启动（需要 Caddy）
caddy run --config /Caddyfile --adapter caddyfile
```

使用 Railpack 部署时，构建与启动命令已在 `railpack.toml` 中定义，无需额外配置。

## 辅助页面

| 页面 | 路径 | 用途 |
|------|------|------|
| 阅读地图 | `/reading-map` | 推荐阅读顺序与路径 |
| 版本说明 | `/version-notes` | 对应的 OpenCode 源码版本 |
| 术语表 | `/glossary` | 书中专有名词释义 |
| 发布清单 | `/release-checklist` | 上线前检查项 |

## 维护约定

- 站点导航和侧边栏以 `.vitepress/config.mts` 为准。
- 每个章节页必须有 frontmatter（`title` + `description`），正文不重复一级标题。
- 图表使用 Mermaid（由 `vitepress-plugin-mermaid` 提供），交互动画使用 `.vitepress/theme/components/` 中的 Vue 组件。
- 文中引用的源码路径应与 [OpenCode 仓库](https://github.com/anomalyco/opencode/tree/dev) 真实结构一致。
- 修改正文结构时同步检查辅助页面（阅读地图、术语表）是否仍然成立。
