# 从零理解如何构建 AI Agent — OpenCode 源码剖析与实战

基于 VitePress 构建的电子书站点，包含四条主线：

- **OpenCode 拆解**：系统剖析基于 commit 快照的 [OpenCode 源码基线](https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc)，涵盖 AI Agent 基础架构、工具系统、多模型支持、TUI 界面等 24 个章节，以及 oh-my-openagent 插件系统实战
- **Claude Code 架构思维**：以 Claude Code 为案例，从 Agent 定义到运行时主链路、多 Agent 协作、平台化演进，20 章系统拆解，建立完整的 Agent 工程判断框架
- **Claude Code 源码业务流**：以业务流程 + 源码映射 + 复刻抽象的方式，拆解 Claude Code 从入口到工具编排再到远程协同的闭环，分 4 卷 14 章 + 4 篇附录
- **Hermes Agent 拆解**：以 Hermes Agent 源码为案例，12 章主干 + 26 篇附录，从概念校准到 Agent Runtime 全链路，建立工程直觉
- **实践篇**：28 个项目，按阶段拆解 TypeScript Agent 实现，从工具调用到生产部署逐步展开

## 站点入口

| 模块 | 路径 |
|------|------|
| 首页 | `/` |
| OpenCode 拆解 | `/02-agent-core/` |
| Claude Code 架构思维 | `/claude-code/` |
| Claude Code 源码业务流 | `/new-claude/` |
| Hermes Agent 拆解 | `/hermes-agent/` |
| 实践篇 | `/practice/` |
| 中级专题 | `/intermediate/` |
| 阅读地图 | `/reading-map` |
| 术语表 | `/glossary` |

## 章节结构

### OpenCode 拆解（第一至第五部分）

#### 第一部分：AI Agent 基础
| 章节 | 目录 |
|------|------|
| 第1章：什么是 AI Agent | `00-what-is-ai-agent/` |
| 第2章：AI Agent 的核心组件 | `01-agent-basics/` |

#### 第二部分：OpenCode 项目架构
| 章节 | 目录 |
|------|------|
| 第3章：OpenCode 项目介绍 | `02-agent-core/` |

#### 第三部分：Agent 核心机制
| 章节 | 目录 |
|------|------|
| 第4章：工具系统 | `03-tool-system/` |
| 第5章：会话管理 | `04-session-management/` |
| 第6章：多模型支持 | `05-provider-system/` |
| 第7章：MCP 协议集成 | `06-mcp-integration/` |

#### 第四部分：OpenCode 深入主题
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

#### 第五部分：oh-my-openagent 插件系统
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

---

### Claude Code 架构思维（`docs/claude-code/`）

20 章，以 Claude Code 为解剖对象，建立可迁移的 Agent 工程判断框架。

| 章节 | 文件 |
|------|------|
| 第1章：Agent 到底是什么 | `chapter01.md` |
| 第2章：一次对话的完整生命周期 | `chapter02.md` |
| 第3章：工具系统——让模型有手 | `chapter03.md` |
| 第4章：上下文管理——Agent 的记忆 | `chapter04.md` |
| 第5章：规划与推理 | `chapter05.md` |
| 第6章：多 Agent 协作 | `chapter06.md` |
| 第7章：MCP 协议——Agent 的开放接口 | `chapter07.md` |
| 第8章：配置控制面 | `chapter08.md` |
| 第9章：持久化与会话管理 | `chapter09.md` |
| 第10章：安全与权限边界 | `chapter10.md` |
| 第11章：流式输出与实时反馈 | `chapter11.md` |
| 第12章：错误处理与容错策略 | `chapter12.md` |
| 第13章：测试与可观测性 | `chapter13.md` |
| 第14章：多模型支持与路由 | `chapter14.md` |
| 第15章：从应用到平台的架构演进 | `chapter15.md` |
| 第16章：扩展点设计 | `chapter16.md` |
| 第17章：TUI 与多端界面 | `chapter17.md` |
| 第18章：部署与生产化 | `chapter18.md` |
| 第19章：Agent 系统的工程边界 | `chapter19.md` |
| 第20章：判断框架收束 | `chapter20.md` |

---

### Claude Code 源码业务流（`docs/new-claude/`）

基于 `@anthropic-ai/claude-code` 2.1.88 还原源码，分 4 卷 14 章 + 4 篇附录。

#### Part 1：主业务流
| 章节 | 文件 |
|------|------|
| 01：CLI 启动与入口分流 | `part-1-主业务流/01-CLI-启动与入口分流.md` |
| 02：初始化、配置、环境、遥测 | `part-1-主业务流/02-初始化-配置-环境-遥测.md` |
| 03：会话上下文与消息模型 | `part-1-主业务流/03-会话上下文与消息模型.md` |
| 04：query 主循环如何驱动整个系统 | `part-1-主业务流/04-query-主循环如何驱动整个系统.md` |
| 05：tool 编排、执行、权限、结果回填 | `part-1-主业务流/05-tool-编排-执行-权限-结果回填.md` |
| 06：输出渲染、stop hooks、任务摘要、请求收尾 | `part-1-主业务流/06-输出渲染-stop-hooks-任务摘要-请求收尾.md` |

#### Part 2：扩展能力流
| 章节 | 文件 |
|------|------|
| 07：MCP 如何把外部能力接进来 | `part-2-扩展能力流/07-MCP-如何把外部能力接进来.md` |
| 08：Skills 如何把方法论接进主流程 | `part-2-扩展能力流/08-Skills-如何把方法论接进主流程.md` |
| 09：Plugins、Hooks 如何做能力扩展 | `part-2-扩展能力流/09-Plugins-Hooks-如何做能力扩展.md` |
| 10：权限、策略、安全边界 | `part-2-扩展能力流/10-权限-策略-安全边界.md` |

#### Part 3：远程协同流
| 章节 | 文件 |
|------|------|
| 11：Bridge 远程控制主链路 | `part-3-远程协同流/11-Bridge-远程控制主链路.md` |
| 12：Remote Session 与连接管理 | `part-3-远程协同流/12-Remote-Session-与连接管理.md` |
| 13：后台会话与并发托管 | `part-3-远程协同流/13-后台会话与并发托管.md` |
| 14：多代理、子任务、协同机制 | `part-3-远程协同流/14-多代理-子任务-协同机制.md` |

#### Part 4：附录
| 附录 | 文件 |
|------|------|
| 90：源码地图（按目录反查系统能力） | `part-4-附录/90-源码地图.md` |
| 91：核心文件索引 | `part-4-附录/91-核心文件索引.md` |
| 92：关键类型与核心抽象 | `part-4-附录/92-关键类型与核心抽象.md` |
| 99：每章练习题与复刻建议 | `part-4-附录/99-每章练习题与复刻建议.md` |

---

### Hermes Agent 拆解（`docs/hermes-agent/`）

12 章主干 + 26 篇附录，从「什么是 Agent」到「怎么自己做一个 Agent」。

#### 主干章节
| 章节 | 文件 |
|------|------|
| 00：先别急着看代码，你到底在学什么是 Agent | `00-先别急着看代码-你到底在学什么是Agent.md` |
| 01：5 分钟看懂 Hermes Agent，先建立全局地图 | `01-5分钟看懂Hermes-Agent-先建立全局地图.md` |
| 02：Hermes Agent 是怎么跑起来的，拆开 run_agent 看执行闭环 | `02-Hermes-Agent-是怎么跑起来的-拆开run_agent看执行闭环.md` |
| 03：工具系统——为什么说 Tool Use 才是 Agent 工程的地基 | `03-工具系统-为什么说Tool-Use才是Agent工程的地基.md` |
| 04：记忆系统——Hermes 为什么不是每次都失忆的 Agent | `04-记忆系统-Hermes为什么不是每次都失忆的Agent.md` |
| 05：SessionDB 与会话系统——Hermes 如何拥有跨会话连续性 | `05-SessionDB与会话系统-Hermes如何拥有跨会话连续性.md` |
| 06：CLI 与 Gateway——为什么一个好 Agent 不能只活在终端里 | `06-CLI与Gateway-为什么一个好Agent不能只活在终端里.md` |
| 07：Skills——Hermes 最像会成长的 Agent 的地方 | `07-Skills-Hermes最像会成长的Agent的地方.md` |
| 08：子 Agent 与并行执行——Hermes 如何把复杂任务拆开做 | `08-子Agent与并行执行-Hermes如何把复杂任务拆开做.md` |
| 09：Cron 后台任务与自动化——从会聊天到会持续工作 | `09-Cron后台任务与自动化-从会聊天到会持续工作.md` |
| 10：安全约束与工程现实——为什么真正能用的 Agent 必须麻烦一点 | `10-安全约束与工程现实-为什么真正能用的Agent必须麻烦一点.md` |
| 11：如果你也想做一个自己的 Agent，应该先抄 Hermes 的哪几层 | `11-如果你也想做一个自己的Agent-应该先抄Hermes的哪几层.md` |

#### 附录（A–Z + AA–AD）
26 篇专章，覆盖上下文压缩、Prompt 装配、Interrupt 机制、Tool Registry、Memory Flush、多层上下文装配顺序、Prompt Cache 等深度主题。

---

### 中级专题（`docs/intermediate/`，第六部分）

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

---

### 实践篇（`docs/practice/`）

28 个章节页面，对应 24 个可运行 TypeScript 脚本，分 7 个阶段：

| 阶段 | 章节 |
|------|------|
| Phase 1：Agent 基础 | P1 最小 Agent / P2 多轮对话 / P3 流式输出 / P4 错误处理 / P24 Prompt Engineering / P25 长上下文 / P26 结构化输出 |
| Phase 2：记忆与知识 | P5 记忆系统 / P6 记忆检索 / P7 RAG 基础 / P8 GraphRAG / P9 混合检索 |
| Phase 3：推理与规划 | P10 ReAct Loop / P11 Planning / P12 Reflection |
| Phase 4：感知扩展 | P13 多模态 / P14 MCP 协议 / P27 代码执行 |
| Phase 5：多 Agent 协作 | P15 多 Agent 编排 / P16 子 Agent / P17 Agent 通信 / P28 Human-in-the-Loop |
| Phase 6：生产化 | P18 模型路由 / P19 安全防护 / P20 可观测性 / P21 评估测试 |
| Phase 7：综合实战 | P22 完整项目 / P23 生产部署 |

实践篇脚本可在 `practice/` 目录直接运行，建议先阅读 [实践环境准备](/practice/setup)。

---

## 本地开发

```bash
bun install
bun dev      # 启动开发服务器（默认端口 5173）
bun build    # 构建静态产物到 .vitepress/dist/
bun preview  # 预览构建结果

# 严格构建（运行全部 11 个校验脚本后再构建）
bun run build:strict
```

## 项目结构

```text
.
├── .vitepress/
│   ├── config.mts              # 站点配置（导航、侧边栏、Mermaid、OG meta、搜索增强）
│   └── theme/
│       ├── index.ts            # 主题入口，注册全部约 60 个 Vue 全局组件
│       ├── custom.css          # Cyber Teal 设计系统
│       └── components/
│           ├── types.ts        # 所有组件 Props 类型集中定义
│           └── ...             # 约 60 个 Vue 组件
├── docs/
│   ├── index.md                # 首页
│   ├── claude-code/            # Claude Code 架构思维（20 章）
│   ├── new-claude/             # Claude Code 源码业务流（4 卷 14 章 + 附录）
│   ├── hermes-agent/           # Hermes Agent 拆解（12 章 + 26 附录）
│   ├── practice/               # 实践篇（28 个章节 + setup）
│   ├── intermediate/           # 中级专题（第25-32章）
│   ├── 00-what-is-ai-agent/ ~ 20-best-practices/   # OpenCode 拆解（第1-24章）
│   ├── oh-prelude/ oh-config/ oh-flow/             # oh-my-openagent 特殊章
│   ├── reading-map.md
│   ├── glossary.md
│   └── version-notes.md
├── practice/                   # 可运行 TypeScript 实践脚本（24 个）
├── scripts/                    # 内容质量校验脚本（11 个）
├── Caddyfile                   # 生产静态服务配置
├── railpack.toml               # Railpack 部署配置
└── package.json
```

## 辅助页面

| 页面 | 路径 | 用途 |
|------|------|------|
| 阅读地图 | `/reading-map` | 推荐阅读顺序与路径 |
| 版本说明 | `/version-notes` | 对应的 OpenCode 源码版本 |
| 术语表 | `/glossary` | 书中专有名词释义 |
| 发布清单 | `/release-checklist` | 上线前检查项 |

## 生产部署

静态产物由 Caddy 托管，监听 `:3000`：

```bash
bun run build
caddy run --config /Caddyfile --adapter caddyfile
```

使用 Railpack 部署时，构建与启动命令已在 `railpack.toml` 中定义，无需额外配置。

## 维护约定

- 站点导航和侧边栏以 `.vitepress/config.mts` 为准，三组侧边栏：`/`（主站）、`/practice/`（实践篇）、`/intermediate/`（中级篇）
- 每个章节页必须有 frontmatter（`title` + `description`），正文不重复一级标题
- 图表使用 Mermaid，交互动画使用 `.vitepress/theme/components/` 中的 Vue 组件
- 所有组件 Props 类型集中定义在 `components/types.ts`，不放在 `.vue` 文件内
- 文中引用的 OpenCode 源码路径默认与 [源码基线](https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc) 一致
- 新增章节后同步检查辅助页面（阅读地图、术语表）是否仍然成立
