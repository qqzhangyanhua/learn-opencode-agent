# CLAUDE.md

## 变更记录 (Changelog)

- **2026-03-20 14:30:00** - 新增动画系统：5 个核心概念动画组件（2个 CSS + 3个 Lottie），包含滚动触发基础设施
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

### 动画演示组件

| 组件名 | 文件 | 对应章节 |
|--------|------|----------|
| `WhatIsAgent` | `components/animations/css/WhatIsAgent.vue` | 第1-2章（LLM → Agent 演进） |
| `MultiTurnDialog` | `components/animations/css/MultiTurnDialog.vue` | 第5章（多轮对话上下文） |
| `FunctionCalling` | `components/animations/lottie/FunctionCalling.vue` | 第4章（工具调用流程） |
| `MultiAgentCollab` | `components/animations/lottie/MultiAgentCollab.vue` | 第16章（多 Agent 协作） |
| `MemorySystem` | `components/animations/lottie/MemorySystem.vue` | 第5章（记忆系统） |

### 类型定义

所有组件 Props 类型集中定义在 `.vitepress/theme/components/types.ts`：

- `SourceSnapshotEntry` / `SourceSnapshotCardProps`
- `RuntimeLifecycleStep` / `RuntimeLifecycleDiagramProps`
- `TechItem` / `TechGroup`
- `LearningPathChapter` / `LearningPhase`
- `AnimationContainerProps` / `LottiePlayerProps` / `AnimationStage` / `UseIntersectionObserverOptions`

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
  },
  "dependencies": {
    "lottie-web": "^5.13.0"
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

<!-- GSD:project-start source:PROJECT.md -->
## Project

**AI Agent 产品化学习站**

这是一个面向中文开发者的 AI Agent 学习站，基于现有 VitePress 电子书仓库继续演进。它不再只是“章节文档集合”，而是要逐步成为一个更像课程产品的学习入口，让用户能快速选路线、理解当前阶段该学什么，并边学边做项目。

当前仓库已经具备理论篇、实践篇、中级篇、交互演示组件和可运行示例代码，下一步重点不是从零搭内容，而是把这些内容组织成更强的信息架构、学习路径和实践闭环。

**Core Value:** 让想系统学习 AI Agent 的中文开发者在 30 秒内知道从哪里开始，并能沿着清晰路径持续学下去。

### Constraints

- **Tech stack**: 继续基于 VitePress、Vue 组件和现有 Markdown 内容体系演进 — 避免推倒重来
- **Product scope**: v1 只做内容产品化和学习路径升级 — 控制复杂度，优先验证核心价值
- **No auth**: 不做登录、云端进度和账号相关能力 — 避免过早引入后端系统
- **Brownfield**: 需要兼容现有章节、实践脚本和导航资产 — 变更必须考虑存量内容迁移成本
- **Audience**: 明确服务中文开发者 — 内容、导航和命名应保持中文优先
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript - 站点主题、交互组件、实践脚本与根目录辅助脚本，集中在 `.vitepress/`、`practice/*.ts`、根目录 `*.ts`
- Markdown - 章节内容与项目文档，集中在 `docs/**/index.md`、`README.md`、`docs/superpowers/**/*.md`
- Vue Single File Components - VitePress 自定义组件，集中在 `.vitepress/theme/components/*.vue`
- CSS - 主题样式与组件局部样式，集中在 `.vitepress/theme/custom.css` 和各组件 `<style scoped>`
- JavaScript ESM - 内容校验脚本，集中在 `scripts/*.mjs`
- Python - 仅作为教学示例，位于 `docs/intermediate/examples/**/*.py`
## Runtime
- Node.js 运行时 - 用于 `vitepress`、`tsc`、校验脚本和绝大多数开发命令
- 浏览器运行时 - 承载 VitePress 页面与交互组件，例如 `.vitepress/theme/components/RunCommand.vue`
- Caddy - 生产静态文件服务，入口在 `Caddyfile`
- 仓库同时保留 `bun.lockb` 与 `pnpm-lock.yaml`
- README 主要使用 `bun dev`、`bun build`、`bun preview`
- `railpack.toml` 的构建命令是 `pnpm run build`
- 现状是“Bun 本地开发 + pnpm/Node 兼容部署”的混合模式，需要改动时先确认目标环境
## Frameworks
- VitePress `^1.5.0` - 文档站点框架，主配置在 `.vitepress/config.mts`
- Vue 3（由 VitePress 提供）- 自定义交互组件与 composable，入口在 `.vitepress/theme/index.ts`
- `vitepress-plugin-mermaid` `^2.0.17` - Mermaid 图表支持，接入点在 `.vitepress/config.mts`
- `mermaid` `^11.13.0` - 图表渲染
- `lottie-web` `^5.13.0` - 动画类组件依赖，见 `.vitepress/theme/index.ts`
- `openai` `^6.32.0` - 实践脚本默认模型客户端，广泛用于 `practice/*.ts`
- `@modelcontextprotocol/sdk` `^1.27.1` - MCP 相关实践内容依赖
- TypeScript `^5.8.2` - 类型检查，入口命令 `npm run typecheck`
- Node 原生 `fs/promises`、`path`、`url` - 内容校验脚本基础设施，见 `scripts/check-content.mjs`
## Key Dependencies
- `vitepress` - 负责文档站点生成、导航、搜索与主题系统
- `openai` - 驱动实践篇脚本里的 Agent 示例
- `@modelcontextprotocol/sdk` - 支持实践篇 MCP 章节
- `vitepress-plugin-mermaid` - 支持教程内 Mermaid 结构图
- `lottie-web` - 支撑动态图解组件
- `typescript` - 约束 `.vitepress` 与根目录 TypeScript 脚本
- Caddy - 静态部署服务，读取 `.vitepress/dist`
## Configuration
- `.env` / `.env.example` - 主要提供 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`
- 实践脚本统一通过 `process.env` 读取 OpenAI 兼容配置，例如 `practice/p01-minimal-agent.ts`
- `.vitepress/config.mts` - 站点导航、侧边栏、OG 信息、Mermaid 与 Vite 配置
- `tsconfig.json` - TypeScript 编译范围与 `Bundler` 解析策略
- `package.json` - 开发、构建、预览、校验命令
- `railpack.toml` - 部署平台构建/启动命令
- `Caddyfile` - 生产静态文件根目录与 SPA fallback
## Platform Requirements
- 需要可运行 Node.js 的环境
- 本地推荐按 README 使用 Bun 命令；若使用 pnpm，也要确认锁文件与脚本行为一致
- 若要运行实践脚本，需要可用的 OpenAI 兼容 API 凭据
- 产物是静态站点 `.vitepress/dist`
- 生产服务基于 Caddy，从 `/app/.vitepress/dist` 提供静态内容
- 适合部署到支持 Node 构建 + 静态托管的环境，例如 Railpack
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Markdown 章节使用 `index.md` 作为目录入口，目录名承担路由语义，例如 `docs/08-http-api-server/index.md`
- Vue 组件使用 `PascalCase.vue`，例如 `RunCommand.vue`、`PlanningTreeDemo.vue`
- composable 使用 `useXxx.ts`
- 实践脚本使用 `pNN-topic.ts`，按教程顺序编号
- TypeScript/Vue 内部函数统一 `camelCase`
- 事件处理/交互函数偏好动词命名，如 `copy()`、`play()`、`restart()`
- 异步函数不额外加 `async` 前缀，例如 `runAgent`
- 普通变量与常量多数使用 `camelCase`
- 真正常量会使用 `UPPER_SNAKE_CASE`，例如实践脚本中配置类常量
- 组件 props 常命名为 `props`，响应式状态常用 `ref(...)`
- TypeScript interface/type 采用 `PascalCase`
- Props 类型集中到 `.vitepress/theme/components/types.ts`
- 不使用 `IUser` 这类 `I` 前缀接口命名
## Code Style
- 全仓库 TypeScript/Vue 普遍使用单引号、无分号、2 空格缩进
- 对象/数组/参数尾逗号常见于多行结构
- 代码风格更接近 Prettier 默认输出，但仓库中未发现显式 `.prettierrc`
- 未发现 ESLint 配置文件
- 现有质量门槛主要依赖 `tsc` 和自定义内容检查脚本
- 构建前严格检查入口是 `package.json` 中的 `build:strict`
## Import Organization
- 通常按逻辑分组，但没有强制的排序工具痕迹
- `import type` 被实际使用，例如 `.vitepress/theme/index.ts`
- 未发现自定义路径别名
- 主要使用相对路径，如 `./components/RunCommand.vue`、`../components/types`
## Error Handling
- CLI/脚本层以 fail-fast 为主，错误通过 `console.error` 输出并设置退出码
- 交互组件对非关键失败做静默降级，例如复制失败时仅忽略
- 实践脚本常在最外层 `.catch(...)` 中统一处理异常
- 未发现自定义 Error 类体系
- 大部分代码直接抛出原生异常或依赖 Promise rejection
- 校验脚本在检测失败时直接 `process.exit(1)`
## Logging
- 仓库级日志工具不存在
- 主要使用 `console.log` / `console.error`
- 构建与校验脚本输出中文、面向作者可读的诊断信息
- 实践脚本输出教学型日志，例如 `Tool call:`、`Tool result:`
- 文档站组件很少做运行时日志打印
## Comments
- 组件和脚本里会写“为什么要这样做”的注释
- 注释语言以中文为主，偶尔有英文技术说明
- 明显逻辑通常不写冗余注释
- 未形成统一的 JSDoc 体系
- 类型定义更多依赖 TypeScript interface 直接表达
- 仓库通过 `scripts/check-content.mjs` 明确阻止 `TODO` / `FIXME` / `TBD` 残留进入文档
- 这说明项目对“未收口内容”有硬性约束
## Function Design
- 组件与 composable 倾向中小函数，复杂页面逻辑拆为多个独立组件
- 实践脚本允许出现较长教学型函数，但仍以“单文件可读”为目标
- 参数较少时直接列出；结构复杂时使用对象与类型注解
- 组件 props 用 `defineProps` + `withDefaults`
- 常用早返回降低嵌套深度
- composable 以对象形式返回状态和方法，例如 `useDemoPlayer`
## Module Design
- Vue 组件多为默认导出
- TypeScript 工具和 composable 更偏好命名导出
- 类型定义集中导出，供多个组件共享
- 未见大规模 barrel file 体系
- 主题层通过 `.vitepress/theme/index.ts` 做集中注册，而不是目录级 re-export
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- 以 Markdown 章节为主体，交互能力通过 VitePress 主题层注入
- 站点本身是静态输出，动态行为仅存在于浏览器端组件
- 实践篇代码与文档共存于同一仓库，形成“文档解释 + 代码示例”双轨结构
- 缺少传统后端服务层，主要是内容编排与前端展示工程
## Layers
- Purpose: 承载理论篇、实践篇、中级篇和补充页面的实际内容
- Contains: Markdown 章节、frontmatter、源码链接、Mermaid 图、内嵌组件引用
- Location: `docs/**`, `README.md`, `practice/README.md`
- Depends on: 主题组件层提供展示能力
- Used by: VitePress 构建流程
- Purpose: 提供站点视觉系统、交互组件、全局注册和 composable
- Contains: Vue 组件、TypeScript 类型、全局样式、辅助 hooks
- Location: `.vitepress/theme/index.ts`, `.vitepress/theme/components/*`, `.vitepress/theme/composables/*`, `.vitepress/theme/custom.css`
- Depends on: Vue/VitePress 运行时和组件 props 类型
- Used by: Markdown 页面中的自定义标签与首页布局
- Purpose: 保证内容完整性、实践入口一致性和部署可运行
- Contains: 内容校验脚本、练习入口校验脚本、构建配置、部署配置
- Location: `scripts/*.mjs`, `package.json`, `tsconfig.json`, `railpack.toml`, `Caddyfile`
- Depends on: Node.js、TypeScript、VitePress CLI
- Used by: 本地开发、发布前检查、部署平台
- Purpose: 提供与文档配套的可运行示例和教学样例
- Contains: `practice/*.ts` 项目、`docs/intermediate/examples/**` Python/README 示例
- Depends on: OpenAI 兼容 API、Node.js 执行环境
- Used by: 实践篇读者、文档作者验证示例
## Data Flow
- 站点无统一后端状态
- 交互组件多采用局部响应式状态，例如 `.vitepress/theme/composables/useDemoPlayer.ts`
- 构建状态体现在本地缓存目录 `.vitepress/cache`
## Key Abstractions
- Purpose: 每个章节目录都是独立内容单元
- Examples: `docs/02-agent-core/index.md`, `docs/intermediate/27-planning-mechanism/index.md`
- Pattern: 目录即路由，`index.md` 作为页面入口
- Purpose: 把复杂示意图、动画、交互演示从 Markdown 正文中解耦出来
- Examples: `RunCommand`, `RuntimeLifecycleDiagram`, `PlanningTreeDemo`
- Pattern: 在 `.vitepress/theme/index.ts` 中全局注册后，由 Markdown 直接使用
- Purpose: 给每个实践项目一个可直接运行的入口
- Examples: `practice/p01-minimal-agent.ts`, `practice/p22-project.ts`
- Pattern: 单文件脚本，对应单个教程主题
## Entry Points
- Location: `.vitepress/config.mts`
- Triggers: `vitepress dev/build/preview`
- Responsibilities: 定义站点元数据、导航、侧边栏、Vite 行为与 Mermaid 集成
- Location: `.vitepress/theme/index.ts`
- Triggers: VitePress 启动主题时
- Responsibilities: 扩展默认主题、注册全局组件、加载全局样式
- Location: `scripts/check-content.mjs`, `scripts/check-practice-entries.mjs`
- Triggers: `build:strict` 或手动执行
- Responsibilities: 防止遗漏页面、未收口文案和无效实践入口引用
- Location: `practice/*.ts`
- Triggers: 用户按文档命令执行脚本
- Responsibilities: 演示各章节的 Agent 能力或工程模式
## Error Handling
- 校验脚本在发现问题时 `process.exit(1)`，例如 `scripts/check-content.mjs`
- Vue 组件常用早返回和 Promise `catch` 做局部兜底，例如 `.vitepress/theme/components/RunCommand.vue`
- 实践脚本通常在入口 `.catch` 中设置 `process.exitCode = 1`
## Cross-Cutting Concerns
- frontmatter、导航、阅读地图和实践入口需要同步维护
- 一切最终都要可编译为静态产物 `.vitepress/dist`
- 文档、示意图与示例代码三者必须相互对齐，否则读者会在“能读不能跑”和“能跑但看不懂”之间失衡
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
