# CLAUDE.md

## 变更记录 (Changelog)

- **2026-03-20 10:00:00** - 补充实践篇完整结构：23 个实践章节（P1-P23）、7 个阶段、3 个实践篇专属组件
- **2026-03-19 16:12:00** - 全量重扫：补全第五部分章节、oh-* 特殊页面、21 个 Vue 组件完整清单、types.ts 类型接口、custom.css 设计系统
- **初始版** - 初始手写文档，覆盖 00-15 章节与 4 个 Vue 组件

---

## 项目概述

VitePress 电子书站点。书名：**从零构建 AI Coding Agent — OpenCode 源码剖析与实战**。

- 基于 VitePress 1.5 + vitepress-plugin-mermaid 构建
- 包管理器：bun（不使用 npm/pnpm）
- 语言：TypeScript + Vue 3 SFC
- 部署：静态构建 + Caddy 伺服

---

## 开发命令

从 `docs/book/` 目录执行：

```bash
bun dev        # 开发服务器（默认端口 5173）
bun build      # 构建静态站点到 .vitepress/dist
bun preview    # 预览构建产物
bun start      # Caddy 伺服（端口 3000，生产用）
```

---

## 项目结构

```
docs/book/
├── .vitepress/
│   ├── config.mts                  # VitePress 主配置（侧边栏、导航、Mermaid、OG meta）
│   ├── tsconfig.json               # TypeScript 配置（覆盖 .vitepress/** 和 docs/**）
│   ├── theme/
│   │   ├── index.ts                # 主题入口，注册全部 Vue 全局组件
│   │   ├── custom.css              # Cyber Teal 设计系统（品牌色、阅读体验变量）
│   │   └── components/
│   │       ├── types.ts            # 所有组件 Props 类型定义（集中管理）
│   │       ├── ReActLoop.vue       # ReAct 执行循环动画
│   │       ├── StreamingDemo.vue   # 流式输出演示
│   │       ├── MessageAccumulator.vue  # 消息累积演示
│   │       ├── PermissionFlow.vue  # 权限流程动画
│   │       ├── McpHandshake.vue    # MCP 握手协议演示
│   │       ├── SseBroadcast.vue    # SSE 广播演示
│   │       ├── ContextCompaction.vue   # 上下文压缩演示
│   │       ├── ProviderFallback.vue    # Provider 故障转移演示
│   │       ├── WorkflowVsAgent.vue # Workflow vs Agent 对比
│   │       ├── LspHover.vue        # LSP Hover 演示
│   │       ├── ConnectionGate.vue  # 连接门控演示
│   │       ├── StarCTA.vue         # Star 召唤行动按钮（各章末尾引导）
│   │       ├── AgentDispatchDemo.vue   # Agent 调度演示（第五部分）
│   │       ├── BackgroundTaskDemo.vue  # 后台任务演示（第五部分）
│   │       ├── RuntimeFallbackDemo.vue # 运行时故障转移演示（第五部分）
│   │       ├── HashlineEditDemo.vue    # Hashline 编辑演示（第五部分）
│   │       ├── TaskDelegationDemo.vue  # 任务委派演示（第五部分）
│   │       ├── SourceSnapshotCard.vue  # 源码快照卡（每章顶部锚定版本）
│   │       ├── RuntimeLifecycleDiagram.vue  # 运行时生命周期图（首页/阅读地图）
│   │       ├── TechStackGrid.vue   # 技术栈网格（首页展示）
│   │       └── LearningPath.vue    # 学习路径（首页核心学习路径）
│   └── dist/                       # 构建输出（已加入 .gitignore）
├── docs/                           # srcDir 内容根目录
│   ├── index.md                    # 首页（layout: home）
│   ├── reading-map.md              # 阅读地图（四阶段路线图）
│   ├── glossary.md                 # 术语表
│   ├── version-notes.md            # 版本说明与源码快照
│   ├── release-checklist.md        # 封版清单
│   ├── oh-my-openagent-plan.md     # oh-my-openagent 规划文档
│   ├── 00-what-is-ai-agent/index.md    # 第1章：什么是 AI Agent
│   ├── 01-agent-basics/index.md        # 第2章：AI Agent 的核心组件
│   ├── 02-agent-core/index.md          # 第3章：OpenCode 项目介绍
│   ├── 03-tool-system/index.md         # 第4章：工具系统
│   ├── 04-session-management/index.md  # 第5章：会话管理
│   ├── 05-provider-system/index.md     # 第6章：多模型支持
│   ├── 06-mcp-integration/index.md     # 第7章：MCP 协议集成
│   ├── 07-tui-interface/index.md       # 第8章：TUI 终端界面
│   ├── 08-http-api-server/index.md     # 第9章：HTTP API 服务器
│   ├── 09-data-persistence/index.md    # 第10章：数据持久化
│   ├── 10-multi-platform-ui/index.md   # 第11章：多端 UI 开发
│   ├── 11-code-intelligence/index.md   # 第12章：代码智能
│   ├── 12-plugins-extensions/index.md  # 第13章：插件与扩展
│   ├── 13-deployment-infrastructure/index.md  # 第14章：部署与基础设施
│   ├── 14-testing-quality/index.md     # 第15章：测试与质量保证
│   ├── 15-advanced-topics/index.md     # 第16章：高级主题与最佳实践
│   ├── oh-prelude/index.md             # 第17章：为什么需要多个 Agent？
│   ├── 16-plugin-overview/index.md     # 第18章：插件系统概述
│   ├── oh-config/index.md              # 第19章：配置系统实战
│   ├── 17-multi-model-orchestration/index.md   # 第20章：多模型编排系统
│   ├── 18-hooks-architecture/index.md  # 第21章：Hooks 三层架构
│   ├── 19-tool-extension/index.md      # 第22章：工具扩展系统
│   ├── oh-flow/index.md                # 第23章：一条消息的完整旅程
│   ├── 20-best-practices/index.md      # 第24章：实战案例与最佳实践
│   └── practice/                       # 实践篇（独立目录）
│       ├── index.md                    # 实践篇首页（layout: home）
│       ├── setup.md                    # 实践环境准备
│       ├── p01-minimal-agent/          # P1：最小 Agent
│       ├── p02-multi-turn/             # P2：多轮对话
│       ├── p03-streaming/              # P3：流式输出
│       ├── p04-error-handling/         # P4：错误处理
│       ├── p05-memory-arch/            # P5：记忆系统架构
│       ├── p06-memory-retrieval/       # P6：记忆增强检索
│       ├── p07-rag-basics/             # P7：RAG 基础
│       ├── p08-graphrag/               # P8：GraphRAG
│       ├── p09-hybrid-retrieval/       # P9：混合检索
│       ├── p10-react-loop/             # P10：ReAct Loop
│       ├── p11-planning/               # P11：Planning
│       ├── p12-reflection/             # P12：Reflection
│       ├── p13-multimodal/             # P13：多模态
│       ├── p14-mcp/                    # P14：MCP 协议
│       ├── p15-multi-agent/            # P15：多 Agent 编排
│       ├── p16-subagent/               # P16：子 Agent
│       ├── p17-agent-comm/             # P17：Agent 通信
│       ├── p18-model-routing/          # P18：模型路由
│       ├── p19-security/               # P19：安全防护
│       ├── p20-observability/          # P20：可观测性
│       ├── p21-evaluation/             # P21：评估测试
│       ├── p22-project/                # P22：完整项目
│       └── p23-production/             # P23：生产部署
├── add-frontmatter.ts              # 工具脚本：为章节补写 frontmatter
├── remove-duplicate-titles.ts      # 工具脚本：移除重复 H1
└── package.json
```

---

## 全书章节结构

### 第一部分：AI Agent 基础
| 章节 | 路径 | 说明 |
|------|------|------|
| 第1章：什么是 AI Agent | `docs/00-what-is-ai-agent/` | LLM 到 Agent 的演进 |
| 第2章：AI Agent 的核心组件 | `docs/01-agent-basics/` | Agent 基础架构 |

### 第二部分：OpenCode 项目架构
| 章节 | 路径 | 说明 |
|------|------|------|
| 第3章：OpenCode 项目介绍 | `docs/02-agent-core/` | 项目总览与核心系统 |

### 第三部分：Agent 核心机制
| 章节 | 路径 | 说明 |
|------|------|------|
| 第4章：工具系统 | `docs/03-tool-system/` | 工具注册、执行、权限 |
| 第5章：会话管理 | `docs/04-session-management/` | 上下文、压缩策略 |
| 第6章：多模型支持 | `docs/05-provider-system/` | Provider 抽象层 |
| 第7章：MCP 协议集成 | `docs/06-mcp-integration/` | MCP 握手与通信 |

### 第四部分：OpenCode 深入主题
| 章节 | 路径 | 说明 |
|------|------|------|
| 第8章：TUI 终端界面 | `docs/07-tui-interface/` | 终端 UI 实现 |
| 第9章：HTTP API 服务器 | `docs/08-http-api-server/` | SSE/REST 接口 |
| 第10章：数据持久化 | `docs/09-data-persistence/` | SQLite/ORM 层 |
| 第11章：多端 UI 开发 | `docs/10-multi-platform-ui/` | Web/Desktop 共享 UI |
| 第12章：代码智能 | `docs/11-code-intelligence/` | LSP 集成 |
| 第13章：插件与扩展 | `docs/12-plugins-extensions/` | 插件系统 |
| 第14章：部署与基础设施 | `docs/13-deployment-infrastructure/` | SST/Cloudflare |
| 第15章：测试与质量保证 | `docs/14-testing-quality/` | 测试策略 |
| 第16章：高级主题与最佳实践 | `docs/15-advanced-topics/` | 多 Agent 协作等 |

### 第五部分：oh-my-openagent 插件系统
| 章节 | 路径 | 说明 |
|------|------|------|
| 第17章：为什么需要多个 Agent？ | `docs/oh-prelude/` | 多 Agent 编排必要性 |
| 第18章：插件系统概述 | `docs/16-plugin-overview/` | 插件架构总览 |
| 第19章：配置系统实战 | `docs/oh-config/` | 插件配置层 |
| 第20章：多模型编排系统 | `docs/17-multi-model-orchestration/` | 多模型协作机制 |
| 第21章：Hooks 三层架构 | `docs/18-hooks-architecture/` | Hook 分层设计 |
| 第22章：工具扩展系统 | `docs/19-tool-extension/` | 工具扩展机制 |
| 第23章：一条消息的完整旅程 | `docs/oh-flow/` | 端到端消息链路 |
| 第24章：实战案例与最佳实践 | `docs/20-best-practices/` | 生产级实践 |

### 第六部分：实践篇（独立目录）

实践篇位于 `docs/practice/` 目录，包含 23 个可运行的 TypeScript 项目，分为 7 个阶段：

| 阶段 | 章节范围 | 主题 | 章节数 |
|------|----------|------|--------|
| Phase 1 | P1-P4 | Agent 基础 | 4 |
| Phase 2 | P5-P9 | 记忆与知识系统 | 5 |
| Phase 3 | P10-P12 | 推理与规划 | 3 |
| Phase 4 | P13-P14 | 感知扩展 | 2 |
| Phase 5 | P15-P17 | 多 Agent 协作 | 3 |
| Phase 6 | P18-P21 | 生产化 | 4 |
| Phase 7 | P22-P23 | 综合实战 | 2 |

#### Phase 1 — Agent 基础
| 章节 | 路径 | 说明 |
|------|------|------|
| P1：最小 Agent | `docs/practice/p01-minimal-agent/` | 工具调用核心机制 |
| P2：多轮对话 | `docs/practice/p02-multi-turn/` | 上下文管理 |
| P3：流式输出 | `docs/practice/p03-streaming/` | 实时反馈 |
| P4：错误处理 | `docs/practice/p04-error-handling/` | 重试策略 |

#### Phase 2 — 记忆与知识系统
| 章节 | 路径 | 说明 |
|------|------|------|
| P5：记忆系统架构 | `docs/practice/p05-memory-arch/` | 记忆系统设计 |
| P6：记忆增强检索 | `docs/practice/p06-memory-retrieval/` | 记忆检索优化 |
| P7：RAG 基础 | `docs/practice/p07-rag-basics/` | 检索增强生成 |
| P8：GraphRAG | `docs/practice/p08-graphrag/` | 图结构 RAG |
| P9：混合检索 | `docs/practice/p09-hybrid-retrieval/` | 多策略检索 |

#### Phase 3 — 推理与规划
| 章节 | 路径 | 说明 |
|------|------|------|
| P10：ReAct Loop | `docs/practice/p10-react-loop/` | 推理行动循环 |
| P11：Planning | `docs/practice/p11-planning/` | 任务规划机制 |
| P12：Reflection | `docs/practice/p12-reflection/` | 反思模式 |

#### Phase 4 — 感知扩展
| 章节 | 路径 | 说明 |
|------|------|------|
| P13：多模态 | `docs/practice/p13-multimodal/` | 多模态智能体 |
| P14：MCP 协议 | `docs/practice/p14-mcp/` | MCP 协议接入 |

#### Phase 5 — 多 Agent 协作
| 章节 | 路径 | 说明 |
|------|------|------|
| P15：多 Agent 编排 | `docs/practice/p15-multi-agent/` | 编排模式 |
| P16：子 Agent | `docs/practice/p16-subagent/` | 任务分解 |
| P17：Agent 通信 | `docs/practice/p17-agent-comm/` | 状态共享 |

#### Phase 6 — 生产化
| 章节 | 路径 | 说明 |
|------|------|------|
| P18：模型路由 | `docs/practice/p18-model-routing/` | 成本控制 |
| P19：安全防护 | `docs/practice/p19-security/` | 防注入 |
| P20：可观测性 | `docs/practice/p20-observability/` | 调试监控 |
| P21：评估测试 | `docs/practice/p21-evaluation/` | 基准测试 |

#### Phase 7 — 综合实战
| 章节 | 路径 | 说明 |
|------|------|------|
| P22：完整项目 | `docs/practice/p22-project/` | Code Review Agent |
| P23：生产部署 | `docs/practice/p23-production/` | 部署清单 |

### 辅助页面
| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `docs/index.md` | layout: home，含 LearningPath、RuntimeLifecycleDiagram、TechStackGrid |
| 实践篇首页 | `docs/practice/index.md` | 实践篇主页，含 PracticeTerminalHero、PracticePhaseGrid、PracticeTagCloud |
| 实践环境准备 | `docs/practice/setup.md` | 环境配置与依赖安装 |
| 阅读地图 | `docs/reading-map.md` | 四阶段课程分级，四条阅读路线（A/B/C/D） |
| 术语表 | `docs/glossary.md` | 高频概念统一口径 |
| 版本说明 | `docs/version-notes.md` | 源码快照语义、写作边界 |
| 封版清单 | `docs/release-checklist.md` | 发布前检查项 |
| oh-my-openagent 规划 | `docs/oh-my-openagent-plan.md` | 第五部分规划文档 |

---

## Vue 全局组件清单

所有组件在 `.vitepress/theme/index.ts` 注册，可直接在任意 Markdown 文件中使用。

### 核心展示组件（首页 / 导航页）

| 组件名 | 文件 | 用途 |
|--------|------|------|
| `LearningPath` | `components/LearningPath.vue` | 首页五阶段学习路径卡片组 |
| `RuntimeLifecycleDiagram` | `components/RuntimeLifecycleDiagram.vue` | 运行时生命周期图，支持高亮指定步骤 |
| `TechStackGrid` | `components/TechStackGrid.vue` | 首页技术栈网格展示 |
| `SourceSnapshotCard` | `components/SourceSnapshotCard.vue` | 各章顶部源码快照卡（仓库/分支/commit/验证时间） |
| `StarCTA` | `components/StarCTA.vue` | 各章末尾 Star 召唤行动按钮 |

### 交互演示组件（正文章节嵌入）

| 组件名 | 文件 | 对应章节 |
|--------|------|----------|
| `ReActLoop` | `components/ReActLoop.vue` | 第2-3章（Agent Loop 动画） |
| `StreamingDemo` | `components/StreamingDemo.vue` | 第3章（流式输出） |
| `MessageAccumulator` | `components/MessageAccumulator.vue` | 第4章（消息累积） |
| `PermissionFlow` | `components/PermissionFlow.vue` | 第4章（权限流程） |
| `McpHandshake` | `components/McpHandshake.vue` | 第7章（MCP 握手） |
| `SseBroadcast` | `components/SseBroadcast.vue` | 第9章（SSE 广播） |
| `ContextCompaction` | `components/ContextCompaction.vue` | 第5章（上下文压缩） |
| `ProviderFallback` | `components/ProviderFallback.vue` | 第6章（Provider 故障转移） |
| `WorkflowVsAgent` | `components/WorkflowVsAgent.vue` | 第1章（Workflow vs Agent 对比） |
| `LspHover` | `components/LspHover.vue` | 第12章（LSP Hover） |
| `ConnectionGate` | `components/ConnectionGate.vue` | 第9章（连接门控） |

### 第五部分专属组件

| 组件名 | 文件 | 对应章节 |
|--------|------|----------|
| `AgentDispatchDemo` | `components/AgentDispatchDemo.vue` | 第20章（Agent 调度） |
| `BackgroundTaskDemo` | `components/BackgroundTaskDemo.vue` | 第20-21章（后台任务） |
| `RuntimeFallbackDemo` | `components/RuntimeFallbackDemo.vue` | 第20章（运行时故障转移） |
| `HashlineEditDemo` | `components/HashlineEditDemo.vue` | 第22章（Hashline 编辑） |
| `TaskDelegationDemo` | `components/TaskDelegationDemo.vue` | 第21章（任务委派） |

### 实践篇专属组件

| 组件名 | 文件 | 用途 |
|--------|------|------|
| `PracticeTerminalHero` | `components/PracticeTerminalHero.vue` | 实践篇首页终端风格 Hero |
| `PracticePhaseGrid` | `components/PracticePhaseGrid.vue` | 实践篇 7 个阶段网格展示 |
| `PracticeTagCloud` | `components/PracticeTagCloud.vue` | 实践篇技术标签云 |
| `ProjectCard` | `components/ProjectCard.vue` | 实践篇章节项目卡片（难度/时长/前置/标签） |
| `RunCommand` | `components/RunCommand.vue` | 运行命令展示（含已验证标识） |
| `PracticePreview` | `components/PracticePreview.vue` | 实践篇预览（首页引用） |

### 类型定义

所有组件 Props 类型集中定义在 `.vitepress/theme/components/types.ts`：

- `SourceSnapshotEntry` / `SourceSnapshotCardProps`
- `RuntimeLifecycleStep` / `RuntimeLifecycleDiagramProps`
- `TechItem` / `TechGroup`
- `LearningPathChapter` / `LearningPhase`

---

## VitePress 配置要点

- **srcDir**：`docs` — 所有内容路径相对于 `docs/`
- **侧边栏**：在 `config.mts` 中手动定义，不自动生成，包含：
  - 理论篇侧边栏（`/`）：五个部分（第一至第五部分）
  - 实践篇侧边栏（`/practice/`）：七个阶段（Phase 1-7），共 23 个章节
- **导航栏**：首页 / 实践篇 / 阅读地图 / 版本说明 / 术语表 / 书仓库 / 源码仓库
- **Mermaid**：通过 `vitepress-plugin-mermaid` + `withMermaid()` 包装启用
- **OG Meta**：`transformPageData` 钩子自动注入每页 og:title / og:description / twitter:card
- **站点信息**：
  - 书名仓库：`https://github.com/qqzhangyanhua/learn-opencode-agent`
  - 源码仓库：`https://github.com/anomalyco/opencode/tree/dev`
- **搜索**：本地搜索（`provider: 'local'`），无外部依赖
- **大纲**：h2-h4 级别，label 为"目录"

---

## 内容约定

- **Frontmatter 必须**：每个章节文件必须有 `title` 和 `description`
- **不重复 H1**：VitePress 从 frontmatter 渲染标题，正文不加同名 H1
- **章节命名**：
  - 理论篇：`docs/NN-slug/index.md`（00-20），特殊页 `docs/oh-*/index.md`
  - 实践篇：`docs/practice/pNN-slug/index.md`（p01-p23）
- **辅助页面**：直接放 `docs/` 根下（不带子目录）
- **源码快照卡**：每章顶部应包含 `<SourceSnapshotCard>` 锚定版本
- **章末 CTA**：各章末尾可嵌入 `<StarCTA>` 引导 Star

---

## 工具脚本

两个 TypeScript 工具，位于 `docs/book/` 根目录：

- `add-frontmatter.ts` — 为章节文件批量补写 frontmatter（硬编码 01-15 章列表，第五部分章节需手动处理）
- `remove-duplicate-titles.ts` — 移除 frontmatter 之后重复出现的同名 H1

注意：两个脚本均硬编码章节列表，新增/删除章节后需手动同步更新。

---

## 设计系统

`custom.css` 实现 Cyber Teal 设计系统：

- 品牌色：`--vp-c-brand-1: #0d9488`（Teal）
- Hero 渐变：Teal → Blue（`#0d9488` → `#3b82f6`）
- 内容宽度：`--content-max-width: 780px`
- 行高：`--content-line-height: 1.85`
- 支持亮色/暗色模式

---

## 依赖

```json
{
  "devDependencies": {
    "mermaid": "^11.13.0",
    "typescript": "^5.8.2",
    "vitepress": "^1.5.0",
    "vitepress-plugin-mermaid": "^2.0.17"
  }
}
```

---

## AI 使用指引

### 修改或新增章节

**理论篇章节**：
1. 在 `docs/NN-slug/index.md` 中写内容，确保有 `title` 和 `description` frontmatter
2. 在 `.vitepress/config.mts` 的 `sidebar['/']` 区块中添加 `{ text: '...', link: '/NN-slug/' }`
3. 导航/外部链接引用使用相对路径如 `/01-agent-basics/`（相对于 `docs/`）

**实践篇章节**：
1. 在 `docs/practice/pNN-slug/index.md` 中写内容，确保有 `title` 和 `description` frontmatter
2. 在 `.vitepress/config.mts` 的 `sidebar['/practice/']` 区块中添加到对应 Phase
3. 链接使用 `/practice/pNN-slug/` 格式

**交互演示**：
需要交互演示时，先创建 Vue 组件，再在 `theme/index.ts` 中注册，然后直接在 Markdown 中使用

### 新增 Vue 组件

1. 在 `.vitepress/theme/components/` 创建 `.vue` 文件
2. Props 类型定义**必须**写入 `types.ts`，不放在 `.vue` 文件内
3. 在 `theme/index.ts` 的 `enhanceApp` 中注册 `app.component('Name', Component)`
4. 单文件不超过 500 行，超出则拆分子组件

### 调试构建问题

- Mermaid 相关报错：检查 `vite.ssr.noExternal` 和 `optimizeDeps.include` 配置
- 类型错误：检查 `.vitepress/tsconfig.json`，编译器选项 target ES2022 / moduleResolution Bundler
- 内容路径问题：所有链接相对于 `srcDir: docs`，不是项目根目录

### 常见任务

- **查看全书导航结构**：阅读 `.vitepress/config.mts` 的 `sidebar` 配置
- **查看理论篇结构**：查看 `sidebar['/']` 配置（五个部分，24 章）
- **查看实践篇结构**：查看 `sidebar['/practice/']` 配置（七个阶段，23 章）
- **查看组件注册情况**：阅读 `.vitepress/theme/index.ts`
- **查看 Props 类型**：阅读 `.vitepress/theme/components/types.ts`
- **更新源码快照版本**：修改 `docs/version-notes.md` 的 `SourceSnapshotCard` props 及各章节的快照卡
- **实践篇环境配置**：查看 `docs/practice/setup.md`
