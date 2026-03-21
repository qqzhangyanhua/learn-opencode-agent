# 从零构建 AI Coding Agent — OpenCode 源码剖析与实战

基于 VitePress 构建的电子书站点，包含两条主线：

- 理论篇：系统剖析基于 commit 快照的 [OpenCode 源码基线](https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc)，涵盖 AI Agent 基础架构、工具系统、多模型支持、TUI 界面等 24 个章节，以及 oh-my-openagent 插件系统实战
- 实践篇：23 个项目，按章节拆解 TypeScript Agent 实现，从工具调用到生产部署逐步展开

默认阅读入口以 commit 锚定源码为准，只有在需要追踪 OpenCode 最新实现时，才额外回到 [`dev` 分支](https://github.com/anomalyco/opencode/tree/dev) 对照差异。

## 先说明实践篇的当前定位

实践篇现在的定位是 **可跟打 + 可直接运行的仓库内示例**。

这意味着：

- 文档中的 `bun run pxx-*.ts` 是已经落在仓库根目录的推荐示例入口命名
- 当前仓库已经提供 `P1-P23` 对应示例文件，可直接按章节命令运行
- 开始实践前，建议先阅读 [实践环境准备](/practice/setup)

如果你从仓库首页进入，建议这样走：

1. 先看理论篇：理解 OpenCode 的源码结构和工程边界
2. 再看实践篇：按 P1 -> P23 的顺序，把核心 Agent 模式逐步跑通并对照实现

## 站点入口

- 首页：`/`
- 实践篇：`/practice/`
- 实践环境准备：`/practice/setup`
- 阅读地图：`/reading-map`
- 版本说明：`/version-notes`
- 术语表：`/glossary`

## 目录结构

```text
.
├── .vitepress/
│   ├── config.mts              # 站点配置（导航、侧边栏、Mermaid 插件、OG meta）
│   └── theme/
│       ├── index.ts            # 主题入口，注册全部 Vue 全局组件
│       ├── custom.css          # Cyber Teal 设计系统
│       └── components/
│           ├── types.ts                    # 所有组件 Props 类型定义
│           ├── LearningPath.vue            # 首页学习路径卡片组
│           ├── TechStackGrid.vue           # 首页技术栈网格展示
│           ├── RuntimeLifecycleDiagram.vue # 运行时生命周期图
│           ├── SourceSnapshotCard.vue      # 各章源码快照卡
│           ├── StarCTA.vue                 # 各章末尾 Star 引导按钮
│           ├── ReActLoop.vue               # ReAct 循环动画演示
│           ├── StreamingDemo.vue           # 流式输出演示
│           ├── MessageAccumulator.vue      # 消息累积演示
│           ├── PermissionFlow.vue          # 权限流程动画
│           ├── McpHandshake.vue            # MCP 握手演示
│           ├── SseBroadcast.vue            # SSE 广播演示
│           ├── ContextCompaction.vue       # 上下文压缩演示
│           ├── ProviderFallback.vue        # Provider 故障转移演示
│           ├── WorkflowVsAgent.vue         # Workflow vs Agent 对比
│           ├── LspHover.vue               # LSP Hover 演示
│           ├── ConnectionGate.vue          # 连接门控演示
│           ├── AgentDispatchDemo.vue       # Agent 调度演示（第五部分）
│           ├── BackgroundTaskDemo.vue      # 后台任务演示（第五部分）
│           ├── RuntimeFallbackDemo.vue     # 运行时故障转移演示（第五部分）
│           ├── HashlineEditDemo.vue        # Hashline 编辑演示（第五部分）
│           └── TaskDelegationDemo.vue      # 任务委派演示（第五部分）
├── docs/
│   ├── index.md                # 首页（layout: home）
│   ├── practice/               # 实践篇（23 个项目 + setup 页面）
│   ├── reading-map.md          # 阅读地图
│   ├── version-notes.md        # 版本说明
│   ├── glossary.md             # 术语表
│   ├── release-checklist.md    # 发布清单
│   ├── oh-my-openagent-plan.md # oh-my-openagent 规划文档
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
│   ├── 15-advanced-topics/
│   ├── oh-prelude/
│   ├── 16-plugin-overview/
│   ├── oh-config/
│   ├── 17-multi-model-orchestration/
│   ├── 18-hooks-architecture/
│   ├── 19-tool-extension/
│   ├── oh-flow/
│   ├── 20-best-practices/
│   └── intermediate/              # 中级篇（25-32章）
│       ├── index.md
│       ├── 25-rag-failure-patterns/
│       ├── 26-multi-agent-collaboration/
│       ├── 27-planning-mechanism/
│       ├── 28-context-engineering/
│       ├── 29-system-prompt-design/
│       ├── 30-production-architecture/
│       ├── 31-safety-boundaries/
│       ├── 32-performance-cost/
│       └── examples/              # 教学示例占位目录
├── add-frontmatter.ts          # 辅助脚本：批量补充 frontmatter
├── remove-duplicate-titles.ts  # 辅助脚本：移除重复 H1
├── Caddyfile                   # 生产静态服务配置
├── railpack.toml               # Railpack 部署配置
└── package.json
```

## 章节结构

### 第一部分：AI Agent 基础
| 章节 | 目录 |
|------|------|
| 第1章：什么是 AI Agent | `00-what-is-ai-agent/` |
| 第2章：AI Agent 的核心组件 | `01-agent-basics/` |

### 第二部分：OpenCode 项目架构
| 章节 | 目录 |
|------|------|
| 第3章：OpenCode 项目介绍 | `02-agent-core/` |

### 第三部分：Agent 核心机制
| 章节 | 目录 |
|------|------|
| 第4章：工具系统 | `03-tool-system/` |
| 第5章：会话管理 | `04-session-management/` |
| 第6章：多模型支持 | `05-provider-system/` |
| 第7章：MCP 协议集成 | `06-mcp-integration/` |

### 第四部分：OpenCode 深入主题
| 章节 | 目录 |
|------|------|
| 第8章：TUI 终端界面 | `07-tui-interface/` |
| 第9章：HTTP API 服务器 | `08-http-api-server/` |
| 第10章：数据持久化 | `09-data-persistence/` |
| 第11章：多端 UI 开发 | `10-multi-platform-ui/` |
| 第12章：代码智能 | `11-code-intelligence/` |
| 第13章：插件与扩展 | `12-plugins-extensions/` |
| 第14章：部署与基础设施 | `13-deployment-infrastructure/` |
| 第15章：测试与质量保证 | `14-testing-quality/` |
| 第16章：高级主题与最佳实践 | `15-advanced-topics/` |

### 第五部分：oh-my-openagent 插件系统
| 章节 | 目录 |
|------|------|
| 第17章：为什么需要多个 Agent？ | `oh-prelude/` |
| 第18章：插件系统概述 | `16-plugin-overview/` |
| 第19章：配置系统实战 | `oh-config/` |
| 第20章：多模型编排系统 | `17-multi-model-orchestration/` |
| 第21章：Hooks 三层架构 | `18-hooks-architecture/` |
| 第22章：工具扩展系统 | `19-tool-extension/` |
| 第23章：一条消息的完整旅程 | `oh-flow/` |
| 第24章：实战案例与最佳实践 | `20-best-practices/` |

### 第六部分：中级篇
| 章节 | 目录 |
|------|------|
| 第25章：RAG 为什么总是答不准？ | `intermediate/25-rag-failure-patterns/` |
| 第26章：多 Agent 协作 | `intermediate/26-multi-agent-collaboration/` |
| 第27章：规划机制 | `intermediate/27-planning-mechanism/` |
| 第28章：上下文工程 | `intermediate/28-context-engineering/` |
| 第29章：System Prompt 设计 | `intermediate/29-system-prompt-design/` |
| 第30章：生产架构与部署 | `intermediate/30-production-architecture/` |
| 第31章：安全边界与高风险控制 | `intermediate/31-safety-boundaries/` |
| 第32章：性能与成本控制 | `intermediate/32-performance-cost/` |

## 本地开发

```bash
bun install
bun dev      # 启动开发服务器（默认端口 5173）
bun build    # 构建静态产物到 .vitepress/dist/
bun preview  # 预览构建结果
```

如果你只想阅读站点，到这里就够了。

如果你要跟着实践篇动手写代码，再继续看 [实践环境准备](/practice/setup)。

## 实践篇运行边界

实践篇涉及 `@anthropic-ai/sdk`、`ANTHROPIC_API_KEY` 等运行条件，但这些不是阅读文档站点的必需条件。

请区分两种模式：

- 阅读模式：只启动 VitePress 站点，不要求安装实践示例依赖
- 跟打模式：直接运行仓库内示例文件，并按章节继续修改、实验、扩展，外加安装依赖与配置环境变量

推荐先从 [实践环境准备](/practice/setup) 开始，再进入 [P1：最小 Agent](/practice/p01-minimal-agent/)。

## 生产部署

静态产物由 Caddy 托管，监听 `:3000`：

```bash
# 构建
bun run build

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
- 所有组件 Props 类型集中定义在 `components/types.ts`，不放在 `.vue` 文件内。
- 文中引用的源码路径默认应与 [OpenCode 源码基线](https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc) 一致；只有在明确说明“追踪最新实现”时才引用 [`dev` 分支](https://github.com/anomalyco/opencode/tree/dev)。
- 修改正文结构时同步检查辅助页面（阅读地图、术语表）是否仍然成立。
