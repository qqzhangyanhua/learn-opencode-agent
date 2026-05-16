# CLAUDE.md

## 变更记录 (Changelog)

- **2026-05-16 11:24:43** - 全量增量扫描：发现 5 大新增内容专区（claude-code 22 页、new-claude 20 页、hermes-agent 43 页、enterprise-agent 28 页、interview 17 页）；新增 animation-lab 实验系统（17 组件 + 11 数据文件 + 实验目录）；新增约 35 个 Vue 演示组件（ReActLoopDemo、CodeReviewAgentSystemDemo、GenerateExecuteRepairLoopDemo 等）；新增 5 个 Scenario 测试文件；新增 superpowers/ 40 个规格/计划文档；校验脚本从 11 个增加到 12 个（含 check-animation-lab）；组件总数从约 60 增至约 95
- **2026-03-25 13:07:08** - 全量增量扫描：补全中级篇（第25-32章）、补充实践篇（P24-P28）、发现中心组件系统、学习进度系统、内容元数据框架、11 个校验脚本、全量 Vue 组件清单（共约 60 个）
- **2026-03-20 14:30:00** - 新增动画系统：5 个核心概念动画组件（2个 CSS + 3个 Lottie），包含滚动触发基础设施
- **2026-03-20 10:00:00** - 补充实践篇完整结构：23 个实践章节（P1-P23）、7 个阶段、3 个实践篇专属组件
- **2026-03-19 16:12:00** - 全量重扫：补全第五部分章节、oh-* 特殊页面、21 个 Vue 组件完整清单、types.ts 类型接口、custom.css 设计系统
- **初始版** - 初始手写文档，覆盖 00-15 章节与 4 个 Vue 组件

---

## 项目概述

VitePress 电子书站点。书名：**从零构建 AI Coding Agent — OpenCode 源码剖析与实战**。

- 基于 VitePress 1.5 + vitepress-plugin-mermaid 构建
- 包管理器：bun（本地开发）/ pnpm（部署兼容）
- 语言：TypeScript + Vue 3 SFC
- 部署：静态构建 + Caddy 伺服
- 仓库：`https://github.com/qqzhangyanhua/learn-opencode-agent`

当前站点已扩展为多专区知识库，包含 8 个内容专区：理论篇、实践篇、中级篇、动画实验室、面试题专区、Claude Code 专栏、Hermes Agent 专栏、企业 Agent 专栏。

---

## 开发命令

从 `docs/book/` 目录执行：

```bash
bun dev        # 开发服务器（默认端口 5173）
bun build      # 构建静态站点到 .vitepress/dist
bun preview    # 预览构建产物
bun start      # Caddy 伺服（端口 3000，生产用）

# 严格构建（运行所有 12 个校验脚本后再构建）
bun run build:strict

# 单独运行校验
bun run check:content          # 检查 Markdown 文件完整性、禁止词
bun run check:practice         # 检查实践入口有效性
bun run check:learning-metadata    # 检查 frontmatter 学习元数据
bun run check:learning-paths       # 检查学习路径定义
bun run check:homepage-entry       # 检查首页入口
bun run check:navigation-entry     # 检查导航入口
bun run check:entry-context        # 检查入口上下文 Banner
bun run check:chapter-experience   # 检查章节体验
bun run check:practice-course-experience  # 检查实践课程体验
bun run check:discovery-experience # 检查发现中心体验
bun run check:learning-progress    # 检查学习进度
bun run check:animation-lab        # 检查动画实验室数据与组件一致性

# 类型检查
bun run typecheck
```

---

## 项目结构

```
docs/book/
├── .vitepress/
│   ├── config.mts                  # VitePress 主配置（侧边栏、导航、Mermaid、OG meta、搜索增强）
│   ├── tsconfig.json               # TypeScript 配置（覆盖 .vitepress/** 和 docs/**）
│   ├── vue-shim.d.ts               # Vue SFC 类型声明
│   ├── theme/
│   │   ├── index.ts                # 主题入口，注册全部约 95 个 Vue 全局组件
│   │   ├── custom.css              # Cyber Teal 设计系统（品牌色、阅读体验变量）
│   │   ├── components/             # Vue 全局组件目录（详见下方清单）
│   │   │   ├── types.ts            # 所有组件 Props 类型集中定义（约 800+ 行）
│   │   │   ├── flowScenario.ts     # 流程演示通用场景编排
│   │   │   ├── flowPlayback.ts     # 流程演示通用时间轴控制
│   │   │   ├── flowPlayback.test.ts
│   │   │   ├── extensionDecisionScenario.ts / .test.ts
│   │   │   ├── taskExecutionScenario.ts / .test.ts
│   │   │   ├── testingLayersScenario.ts / .test.ts
│   │   │   ├── localCloudTopologyScenario.ts / .test.ts
│   │   │   ├── hybridRetrievalData.ts
│   │   │   ├── learning-progress/
│   │   │   │   └── learningProgressStorage.ts  # 本地进度持久化（localStorage）
│   │   │   ├── animations/
│   │   │   │   ├── core/
│   │   │   │   │   ├── AnimationContainer.vue
│   │   │   │   │   ├── LottiePlayer.vue
│   │   │   │   │   └── useIntersectionObserver.ts
│   │   │   │   ├── css/
│   │   │   │   │   ├── WhatIsAgent.vue
│   │   │   │   │   ├── MultiTurnDialog.vue
│   │   │   │   │   ├── FunctionCallingCss.vue
│   │   │   │   │   └── MemorySystemCss.vue
│   │   │   │   └── lottie/
│   │   │   │       ├── FunctionCalling.vue
│   │   │   │       ├── MemorySystem.vue
│   │   │   │       ├── MultiAgentCollab.vue
│   │   │   │       └── assets/               # Lottie JSON 动画数据（3 个 .json 文件）
│   │   │   └── animation-lab/              # 动画实验室组件（17 个 Vue + 2 CSS + 1 type.ts）
│   │   │       ├── AnimationLabIndex.vue     # 实验室总览页面
│   │   │       ├── SystemMotionPlayer.vue    # 系统运动播放器
│   │   │       ├── TracePanel.vue           # Trace 事件面板
│   │   │       ├── FlowExperimentCanvas.vue  # 流动实验画布
│   │   │       ├── FlowExperimentCanvas.css / FlowExperimentCanvasMotion.css / FlowExperimentCanvasBase.css
│   │   │       ├── AgentLoopExperiment.vue
│   │   │       ├── ContextMemoryExperiment.vue
│   │   │       ├── MultiAgentDispatchExperiment.vue
│   │   │       ├── ToolPermissionGateExperiment.vue
│   │   │       ├── ContextCompactionExperiment.vue
│   │   │       ├── ErrorRecoveryLoopExperiment.vue
│   │   │       ├── ProviderRoutingFallbackExperiment.vue
│   │   │       ├── RagRetrievalFlowExperiment.vue
│   │   │       ├── HumanApprovalGateExperiment.vue
│   │   │       ├── StructuredOutputValidationExperiment.vue
│   │   │       ├── StreamingInterruptControlExperiment.vue
│   │   │       └── type.ts                 # animation-lab 类型定义
│   │   ├── composables/
│   │   │   ├── useDemoPlayer.ts            # 步骤式演示播放控制
│   │   │   ├── useBudgetMeter.ts           # Token 预算仪表盘
│   │   │   ├── useScenarioSelection.ts     # 场景切换
│   │   │   └── useDependencyGraph.ts       # 依赖图遍历
│   │   └── data/
│   │       ├── content-meta.ts             # 内容元数据类型与规范化函数（核心）
│   │       ├── content-index.data.ts       # VitePress data loader，聚合所有页面元数据
│   │       ├── learning-paths.data.ts      # 学习路径定义 data loader
│   │       ├── practice-projects.ts        # 实践项目定义（28 个项目的完整元数据）
│   │       ├── practice-source-files.ts    # 实践项目源文件映射
│   │       ├── discovery-content.ts        # 发现中心内容路由定义
│   │       ├── animation-lab-experiments.ts # 动画实验室实验目录（11 个实验）
│   │       └── animation-lab/             # 实验数据文件（11 个 .ts）
│   │           ├── agent-loop.ts
│   │           ├── context-memory-flow.ts
│   │           ├── multi-agent-dispatch.ts
│   │           ├── tool-permission-gate.ts
│   │           ├── context-compaction.ts
│   │           ├── error-recovery-loop.ts
│   │           ├── provider-routing-fallback.ts
│   │           ├── rag-retrieval-flow.ts
│   │           ├── human-approval-gate.ts
│   │           ├── structured-output-validation.ts
│   │           └── streaming-interrupt-control.ts
│   └── dist/                       # 构建输出（.gitignore 忽略）
├── docs/                           # srcDir 内容根目录
│   ├── index.md                    # 首页（layout: home）
│   ├── reading-map.md              # 阅读地图（多条阅读路线）
│   ├── glossary.md                 # 术语表
│   ├── version-notes.md            # 版本说明与源码快照
│   ├── release-checklist.md        # 封版清单
│   ├── oh-my-openagent-plan.md     # oh-my-openagent 规划文档
│   ├── 00-what-is-ai-agent/        # 理论篇第1章
│   ├── ...（01 到 20，及 oh-* 特殊章）
│   ├── intermediate/               # 中级篇（第六部分，第25-32章）
│   │   ├── index.md
│   │   ├── 25-rag-failure-patterns/
│   │   ├── ...（26 到 32）
│   │   └── examples/               # Python 教学示例（25-32 章，13 个 .py + 8 个 README）
│   ├── practice/                   # 实践篇（28 个章节，P1-P28）
│   │   ├── index.md
│   │   ├── setup.md
│   │   ├── p01-minimal-agent/ 到 p28-human-in-loop/
│   ├── animation-lab/              # 动画实验室（专区首页，使用 AnimationLabIndex 组件）
│   │   └── index.md
│   ├── interview/                  # Agent 面试题专区（按能力分类 + 八股文）
│   │   ├── index.md
│   │   ├── fundamentals/ tools/ memory/ planning/ rag/ multi-agent/ engineering/
│   │   └── bagua/                 # 八股文子区（9 个分类页面）
│   ├── claude-code/                # Claude Code 架构思维专栏（20 章 + 导读 + 首页）
│   │   ├── index.md
│   │   ├── reading-guide.md
│   │   ├── chapter01.md 到 chapter20.md
│   │   └── _archive/             # 旧版归档（chapter01-15）
│   ├── new-claude/                 # Claude Code 源码业务流专栏（4 部分，20 页）
│   │   ├── index.md
│   │   ├── 00-阅读指南.md
│   │   ├── 01-系统全景与学习路线.md
│   │   ├── part-1-主业务流/（01-06）
│   │   ├── part-2-扩展能力流/（07-10）
│   │   ├── part-3-远程协同流/（11-14）
│   │   └── part-4-附录/（90-92, 99）
│   ├── hermes-agent/               # Hermes Agent 拆解专栏（12 章 + 31 附录 + 首页）
│   │   ├── index.md
│   │   ├── 00-先别急着看代码 到 11-自己做Agent/
│   │   └── 附录A 到 附录AE（字母索引附录）
│   ├── enterprise-agent/           # 企业 Agent 设计专栏（17 章 + 7 工具包 + 导读）
│   │   ├── index.md
│   │   ├── reading-guide.md
│   │   ├── design-checklist.md
│   │   ├── e00-enterprise-agent-constraints 到 e17-ims-copilot-retrospective/
│   │   └── implementation-template/ risk-matrix/ architecture-blueprint/（工具包）
│   └── superpowers/                # 设计规格与实施计划归档（40 个 .md）
│       ├── specs/                  # 设计规格文档（20 个）
│       └── plans/                  # 实施计划文档（20 个）
├── practice/                       # 可运行 TypeScript 实践脚本（24 个文件 + README）
│   ├── p01-minimal-agent.ts 到 p28-human-in-loop.ts
│   └── p14-mcp-server.ts
├── scripts/                        # 内容质量校验脚本（12 个 .mjs 文件）
│   ├── check-content.mjs
│   ├── check-practice-entries.mjs
│   ├── check-learning-metadata.mjs
│   ├── check-learning-paths.mjs
│   ├── check-homepage-entry.mjs
│   ├── check-navigation-entry.mjs
│   ├── check-entry-context.mjs
│   ├── check-chapter-experience.mjs
│   ├── check-practice-course-experience.mjs
│   ├── check-discovery-experience.mjs
│   ├── check-learning-progress.mjs
│   └── check-animation-lab.mjs     # 动画实验室数据/组件一致性校验
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

### 第六部分：中级专题与工程进阶（intermediate/）
| 章节 | 路径 | Python 示例 | 说明 |
|------|------|------------|------|
| 中级篇导读 | `docs/intermediate/` | — | 三条阅读路线入口 |
| 第25章：RAG 为什么总是答不准？ | `docs/intermediate/25-rag-failure-patterns/` | 5 个 .py | RAG 五大翻车场景 |
| 第26章：多智能体协作实战 | `docs/intermediate/26-multi-agent-collaboration/` | 1 个 .py | 多 Agent 分工协同 |
| 第27章：Planning 机制 | `docs/intermediate/27-planning-mechanism/` | 1 个 .py | 多阶段计划执行 |
| 第28章：上下文工程实战 | `docs/intermediate/28-context-engineering/` | 1 个 .py | 上下文策略工程化 |
| 第29章：System Prompt 设计 | `docs/intermediate/29-system-prompt-design/` | 1 个 .py | Prompt 三层结构 |
| 第30章：生产架构 | `docs/intermediate/30-production-architecture/` | 1 个 .py | 架构边界与依赖 |
| 第31章：安全与边界 | `docs/intermediate/31-safety-boundaries/` | 1 个 .py | 安全策略可审计 |
| 第32章：性能与成本 | `docs/intermediate/32-performance-cost/` | 1 个 .py | 成本与性能全链路 |

### 第七部分：实践篇（docs/practice/）

实践篇包含 28 个章节页面（P1-P23 核心 + P24-P28 补充），对应 24 个可运行 TypeScript 脚本，分为 7 个阶段：

#### Phase 1 — Agent 基础
| 章节 | 路径 | 对应脚本 | 说明 |
|------|------|---------|------|
| P1：最小 Agent | `docs/practice/p01-minimal-agent/` | `practice/p01-minimal-agent.ts` | 工具调用核心机制 |
| P2：多轮对话 | `docs/practice/p02-multi-turn/` | `practice/p02-multi-turn.ts` | 上下文管理 |
| P3：流式输出 | `docs/practice/p03-streaming/` | `practice/p03-streaming.ts` | 实时反馈 |
| P4：错误处理 | `docs/practice/p04-error-handling/` | `practice/p04-error-handling.ts` | 重试策略 |
| P24：Prompt Engineering（补充） | `docs/practice/p24-prompt-engineering/` | `practice/p24-prompt-engineering.ts` | System Prompt 三层结构 |
| P25：长上下文管理（补充） | `docs/practice/p25-long-context/` | `practice/p25-long-context.ts` | 长窗口处理 |
| P26：结构化输出（补充） | `docs/practice/p26-structured-output/` | `practice/p26-structured-output.ts` | JSON schema 输出 |

#### Phase 2 — 记忆与知识系统
| 章节 | 路径 | 对应脚本 | 说明 |
|------|------|---------|------|
| P5：记忆系统架构 | `docs/practice/p05-memory-arch/` | `practice/p05-memory-arch.ts` | 三层记忆设计 |
| P6：记忆增强检索 | `docs/practice/p06-memory-retrieval/` | `practice/p06-memory-retrieval.ts` | 记忆检索优化 |
| P7：RAG 基础 | `docs/practice/p07-rag-basics/` | `practice/p07-rag-basics.ts` | 检索增强生成 |
| P8：GraphRAG | `docs/practice/p08-graphrag/` | `practice/p08-graphrag.ts` | 图结构 RAG |
| P9：混合检索 | `docs/practice/p09-hybrid-retrieval/` | `practice/p09-hybrid-retrieval.ts` | 多策略检索 |

#### Phase 3 — 推理与规划
| 章节 | 路径 | 对应脚本 | 说明 |
|------|------|---------|------|
| P10：ReAct Loop | `docs/practice/p10-react-loop/` | `practice/p10-react-loop.ts` | 推理行动循环 |
| P11：Planning | `docs/practice/p11-planning/` | `practice/p11-planning.ts` | 任务规划机制 |
| P12：Reflection | `docs/practice/p12-reflection/` | `practice/p12-reflection.ts` | 反思模式 |

#### Phase 4 — 感知扩展
| 章节 | 路径 | 对应脚本 | 说明 |
|------|------|---------|------|
| P13：多模态 | `docs/practice/p13-multimodal/` | `practice/p13-multimodal.ts` | 多模态智能体 |
| P14：MCP 协议 | `docs/practice/p14-mcp/` | `practice/p14-mcp.ts` + `practice/p14-mcp-server.ts` | MCP 协议接入 |
| P27：代码执行 Agent（补充） | `docs/practice/p27-code-execution/` | `practice/p27-code-execution.ts` | 代码沙箱执行 |

#### Phase 5 — 多 Agent 协作
| 章节 | 路径 | 对应脚本 | 说明 |
|------|------|---------|------|
| P15：多 Agent 编排 | `docs/practice/p15-multi-agent/` | `practice/p15-multi-agent.ts` | 编排模式 |
| P16：子 Agent | `docs/practice/p16-subagent/` | `practice/p16-subagent.ts` | 任务分解 |
| P17：Agent 通信 | `docs/practice/p17-agent-comm/` | `practice/p17-agent-comm.ts` | 状态共享 |
| P28：Human-in-the-Loop（补充） | `docs/practice/p28-human-in-loop/` | `practice/p28-human-in-loop.ts` | 高风险操作人工介入 |

#### Phase 6 — 生产化
| 章节 | 路径 | 对应脚本 | 说明 |
|------|------|---------|------|
| P18：模型路由 | `docs/practice/p18-model-routing/` | `practice/p18-model-routing.ts` | 成本控制 |
| P19：安全防护 | `docs/practice/p19-security/` | `practice/p19-security.ts` | 防注入 |
| P20：可观测性 | `docs/practice/p20-observability/` | `practice/p20-observability.ts` | 调试监控 |
| P21：评估测试 | `docs/practice/p21-evaluation/` | `practice/p21-evaluation.ts` | 基准测试 |

#### Phase 7 — 综合实战
| 章节 | 路径 | 对应脚本 | 说明 |
|------|------|---------|------|
| P22：完整项目 | `docs/practice/p22-project/` | `practice/p22-project.ts` | Code Review Agent |
| P23：生产部署 | `docs/practice/p23-production/` | `practice/p23-production.ts` | 部署清单 |

### 第八部分：Claude Code 架构思维专栏（claude-code/）

从架构师思维角度拆解 Agent 系统的设计原理，共 5 部分 20 章。

| 区块 | 路径 | 章节数 |
|------|------|--------|
| 第一部分：先把 Agent 这件事想明白 | `docs/claude-code/chapter01` - `chapter03` | 3 章 |
| 第二部分：把运行时主链路拆开 | `docs/claude-code/chapter04` - `chapter09` | 6 章 |
| 第三部分：从单 Agent 走向更复杂系统 | `docs/claude-code/chapter10` - `chapter15` | 6 章 |
| 第四部分：从应用走向平台 | `docs/claude-code/chapter16` - `chapter18` | 3 章 |
| 第五部分：工程化闭环与全书收束 | `docs/claude-code/chapter19` - `chapter20` | 2 章 |
| 辅助页面 | `docs/claude-code/index.md`、`reading-guide.md` | — |

`_archive/` 目录保存旧版 1-15 章草稿。

### 第九部分：Claude Code 源码业务流专栏（new-claude/）

从代码执行路径角度拆解 Claude Code 的实现，共 4 部分 20 页。

| 区块 | 路径 | 说明 |
|------|------|------|
| Part 1：主业务流 | `docs/new-claude/part-1-主业务流/` | CLI 启动、初始化、会话、主循环、工具编排、输出渲染（6 章） |
| Part 2：扩展能力流 | `docs/new-claude/part-2-扩展能力流/` | MCP、Skills、Plugins/Hooks、权限策略（4 章） |
| Part 3：远程协同流 | `docs/new-claude/part-3-远程协同流/` | Bridge、Remote Session、后台会话、多代理（4 章） |
| Part 4：附录 | `docs/new-claude/part-4-附录/` | 源码地图、核心文件索引、关键类型、练习题（4 章） |
| 辅助页面 | `docs/new-claude/` | 阅读指南(00)、系统全景(01)、首页(index) |

### 第十部分：Hermes Agent 拆解专栏（hermes-agent/）

对 Anthropic 官方 Hermes Agent 参考实现的逐层拆解，共 12 章 + 31 附录（按字母索引）。

| 区块 | 章节 | 附录 |
|------|------|------|
| 概念准备 | 第1-2章 | — |
| 核心机制 | 第3-6章（run_agent 闭环、工具系统、记忆系统、SessionDB） | — |
| 系统扩展 | 第7-10章（CLI/Gateway、Skills、子Agent、Cron） | — |
| 工程落地 | 第11-12章（安全约束、如何复刻） | — |
| 附录：Prompt 与上下文 | — | 附录 A/B/L/V/W/X/Y（7 篇） |
| 附录：工具与能力层 | — | 附录 E/F/I/K/AD/AE（6 篇） |
| 附录：记忆与会话 | — | 附录 J/N/O/P/Q/S/T（7 篇） |
| 附录：运行时与执行 | — | 附录 C/D/M/R/AA/AB（6 篇） |
| 附录：扩展与接入 | — | 附录 G/H/U/AC/Z（5 篇） |

### 第十一部分：企业 Agent 设计专栏（enterprise-agent/）

从零设计企业级 AI Agent 的完整方法论，共 5 模块 + 17 章 + 7 工具包。

| 模块 | 章节 | 说明 |
|------|------|------|
| 模块 0：企业 Agent 约束 | E00-E01 | 四个本质约束、Chatbot 到企业 Agent |
| 模块 1：意图识别与混合查询 | E02-E04 | 意图分层、混合查询拆解、澄清问题 |
| 模块 2：Policy QA 与企业知识库 | E05-E07 | 企业 RAG、权限过滤、Text-to-SQL 管控 |
| 模块 3：个人数据与操作引导 | E08-E10 | 上下文设计、操作引导、意图到步骤 |
| 模块 4：流程自动化与人机协同 | E11-E13 | Human-in-the-Loop、高风险确认、回滚补偿 |
| 模块 5：生产化收口 | E14-E17 | 观测审计、成本路由、平台演化、IMS 复盘 |
| 落地工具包 | 7 个页面 | 实施模板、风险矩阵、架构蓝图、Python 结构、数据模型、状态机、API 契约 |

### 第十二部分：面试题专区（interview/）

按能力分类的 Agent 面试准备专区。

| 分类 | 路径 | 说明 |
|------|------|------|
| 专区总览 | `docs/interview/index.md` | 题目分类入口 |
| 基础概念 | `docs/interview/fundamentals/` | Agent 基本概念面试题 |
| 工具调用 | `docs/interview/tools/` | Tool Use 高频题 |
| 记忆 | `docs/interview/memory/` | 记忆系统面试题 |
| 规划 | `docs/interview/planning/` | Planning 面试题 |
| RAG | `docs/interview/rag/` | RAG 技术面试题 |
| Multi-Agent | `docs/interview/multi-agent/` | 多 Agent 面试题 |
| 工程化 | `docs/interview/engineering/` | 工程实践面试题 |
| 八股文总览 | `docs/interview/bagua/index.md` | Agent 八股文 |
| 八股文子类 | `docs/interview/bagua/` | agent-basics / core-frameworks / rag / tool-calling / memory / multi-agent / llm-fundamentals / engineering-practice / prompt-engineering（9 个分类） |

### 辅助页面
| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `docs/index.md` | layout: home，含 HomeStartPanel、LearningPath、RuntimeLifecycleDiagram 等 |
| 实践篇首页 | `docs/practice/index.md` | 含 PracticeTerminalHero、PracticePhaseGrid、PracticeTagCloud、PracticeRouteExplorer |
| 中级篇导读 | `docs/intermediate/index.md` | 含 EntryContextBanner，三条阅读路线入口 |
| 实践环境准备 | `docs/practice/setup.md` | 环境配置与依赖安装 |
| 动画实验室 | `docs/animation-lab/index.md` | 含 AnimationLabIndex 组件，11 个交互实验 |
| 阅读地图 | `docs/reading-map.md` | 多阶段课程分级与路线 |
| 术语表 | `docs/glossary.md` | 高频概念统一口径 |
| 版本说明 | `docs/version-notes.md` | 源码快照语义、写作边界 |
| 封版清单 | `docs/release-checklist.md` | 发布前检查项 |
| oh-my-openagent 规划 | `docs/oh-my-openagent-plan.md` | 第五部分规划文档 |

---

## Vue 全局组件清单

所有组件在 `.vitepress/theme/index.ts` 注册，可直接在任意 Markdown 文件中使用。当前注册组件约 95 个（含异步加载）。

### 核心展示组件（首页 / 导航页）
| 组件名 | 文件 | 用途 |
|--------|------|------|
| `LearningPath` | `components/LearningPath.vue` | 多阶段学习路径卡片组（数据从 learning-paths.data.ts 读取） |
| `RuntimeLifecycleDiagram` | `components/RuntimeLifecycleDiagram.vue` | 运行时生命周期图，支持高亮指定步骤 |
| `TechStackGrid` | `components/TechStackGrid.vue` | 首页技术栈网格展示 |
| `SourceSnapshotCard` | `components/SourceSnapshotCard.vue` | 各章顶部源码快照卡 |
| `StarCTA` | `components/StarCTA.vue` | 各章末尾 Star 召唤行动按钮 |
| `HomeStartPanel` | `components/HomeStartPanel.vue` | 首页起始引导面板 |
| `HomeExploreLinks` | `components/HomeExploreLinks.vue` | 首页探索链接 |
| `HomeSeriesStrip` | `components/HomeSeriesStrip.vue` | 首页专栏系列条 |
| `SectionRoleGrid` | `components/SectionRoleGrid.vue` | 各篇章角色定位网格 |

### 章节体验组件
| 组件名 | 文件 | 用途 |
|--------|------|------|
| `EntryContextBanner` | `components/EntryContextBanner.vue` | 各篇章入口上下文说明横幅（section/badge/tone/summary/nextSteps/supportLinks） |
| `ChapterLearningGuide` | `components/ChapterLearningGuide.vue` | 章节学习引导（受众 + 阶段标签） |
| `ChapterActionPanel` | `components/ChapterActionPanel.vue` | 章节行动面板（提供后续操作链接） |
| `LearningProgressToggle` | `components/LearningProgressToggle.vue` | 学习进度切换按钮（saved/active/done，持久化到 localStorage） |

### 实践篇专属组件
| 组件名 | 文件 | 用途 |
|--------|------|------|
| `PracticeTerminalHero` | `components/PracticeTerminalHero.vue` | 实践篇首页终端风格 Hero |
| `PracticePhaseGrid` | `components/PracticePhaseGrid.vue` | 实践篇 7 个阶段网格展示 |
| `PracticeTagCloud` | `components/PracticeTagCloud.vue` | 实践篇技术标签云 |
| `PracticeRouteExplorer` | `components/PracticeRouteExplorer.vue` | 实践路线探索器（ship-first / engineering-first / capstone-first） |
| `PracticeProjectSyllabus` | `components/PracticeProjectSyllabus.vue` | 实践阶段大纲（按 phaseId 渲染） |
| `PracticeProjectGuide` | `components/PracticeProjectGuide.vue` | 实践项目引导（按 projectId 渲染完整项目元数据） |
| `PracticeProjectActionPanel` | `components/PracticeProjectActionPanel.vue` | 实践项目行动面板（运行命令、源文件等） |
| `PracticeProjectSourceFiles` | `components/PracticeProjectSourceFiles.vue` | 实践项目源文件列表（异步加载） |
| `RelatedPracticeProjects` | `components/RelatedPracticeProjects.vue` | 相关实践项目推荐（按 projectIds 渲染） |
| `ProjectCard` | `components/ProjectCard.vue` | 实践章节项目卡片（难度/时长/前置/标签） |
| `RunCommand` | `components/RunCommand.vue` | 运行命令展示（含已验证标识） |
| `PracticePreview` | `components/PracticePreview.vue` | 实践篇预览（首页引用） |

### 发现中心组件
| 组件名 | 文件 | 用途 |
|--------|------|------|
| `DiscoveryTypeBadge` | `components/DiscoveryTypeBadge.vue` | 内容类型徽章（章节/实践项目/进阶专题/辅助页面） |
| `DiscoveryGoalRoutes` | `components/DiscoveryGoalRoutes.vue` | 按目标展示阅读路线（system-learn / engineering-upgrade / build-by-project） |
| `DiscoveryStartGrid` | `components/DiscoveryStartGrid.vue` | 发现中心起始网格 |
| `DiscoveryTopicHub` | `components/DiscoveryTopicHub.vue` | 主题枢纽（按 topicId 渲染内容集合） |

### 交互演示组件（理论篇）
| 组件名 | 文件 | 对应章节 |
|--------|------|----------|
| `ReActLoop` | `components/ReActLoop.vue` | 第2-3章（Agent Loop 动画） |
| `StreamingDemo` | `components/StreamingDemo.vue` | 第3章（流式输出） |
| `MessageAccumulator` | `components/MessageAccumulator.vue` | 第4章（消息累积） |
| `PermissionFlow` | `components/PermissionFlow.vue` | 第4章（权限流程） |
| `McpHandshake` | `components/McpHandshake.vue` | 第7章（MCP 握手） |
| `HttpPermissionGateDemo` | `components/HttpPermissionGateDemo.vue` | 第9章（HTTP 权限门控） |
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

### 中级篇专属演示组件
| 组件名 | 文件 | 对应章节 |
|--------|------|----------|
| `RagAccuracyDemo` | `components/RagAccuracyDemo.vue` | 第25章（RAG 检索准确性） |
| `MultiAgentWorkflowDetailed` | `components/MultiAgentWorkflowDetailed.vue` | 第26章（多智能体协作详细） |
| `MultiAgentModeSimulator` | `components/MultiAgentModeSimulator.vue` | 第26章（多 Agent 模式模拟器） |
| `PlanningTreeDemo` | `components/PlanningTreeDemo.vue` | 第27章（Planning 树） |
| `PlanningTreeNodeItem` | `components/PlanningTreeNodeItem.vue` | 第27章（Planning 树节点子组件） |
| `PlanningFlowSimulator` | `components/PlanningFlowSimulator.vue` | 第27章（Planning 流程模拟器） |
| `ContextEngineeringExtended` | `components/ContextEngineeringExtended.vue` | 第28章（上下文工程） |
| `PromptDesignStudio` | `components/PromptDesignStudio.vue` | 第29章（Prompt 设计工作台） |
| `PromptLintPanel` | `components/PromptLintPanel.vue` | 第29章（Prompt 静态检查面板） |
| `ProductionArchitectureDiagram` | `components/ProductionArchitectureDiagram.vue` | 第30章（生产架构拓扑图） |
| `TopologyNodeLabel` | `components/TopologyNodeLabel.vue` | 第30章（拓扑节点标签子组件） |
| `SecurityBoundaryDemo` | `components/SecurityBoundaryDemo.vue` | 第31章（安全边界演示） |
| `CostOptimizationDashboard` | `components/CostOptimizationDashboard.vue` | 第32章（成本优化仪表盘） |

### 新增中级篇/扩展演示组件
| 组件名 | 文件 | 对应章节/用途 |
|--------|------|-------------|
| `ReActLoopDemo` | `components/ReActLoopDemo.vue` | 第10章（ReAct 循环演示） |
| `PlanningExecuteDemo` | `components/PlanningExecuteDemo.vue` | 第27章（规划执行演示） |
| `ReflectionCycleDemo` | `components/ReflectionCycleDemo.vue` | 第5章（反思循环演示） |
| `AgentCommunicationModesDemo` | `components/AgentCommunicationModesDemo.vue` | 第26章（Agent 通信模式） |
| `TraceSpanTimelineDemo` | `components/TraceSpanTimelineDemo.vue` | 第20章（Trace Span 时间线） |
| `EvaluationPipelineDemo` | `components/EvaluationPipelineDemo.vue` | 第21章（评估流水线） |
| `CodeReviewAgentSystemDemo` | `components/CodeReviewAgentSystemDemo.vue` | P22（Code Review 系统） |
| `ContextBudgetCompressionDemo` | `components/ContextBudgetCompressionDemo.vue` | 第5章（上下文预算压缩） |
| `GenerateExecuteRepairLoopDemo` | `components/GenerateExecuteRepairLoopDemo.vue` | 第27章（生成-执行-修复循环） |
| `ApprovalInterruptResumeDemo` | `components/ApprovalInterruptResumeDemo.vue` | 第11章/P28（审批-中断-恢复） |
| `MultimodalMessageFlowDemo` | `components/MultimodalMessageFlowDemo.vue` | P13（多模态消息流） |
| `PromptLayerComposerDemo` | `components/PromptLayerComposerDemo.vue` | 第29章（Prompt 层合成器） |
| `SchemaConstrainedOutputDemo` | `components/SchemaConstrainedOutputDemo.vue` | P26（Schema 约束输出） |
| `TransactionEffectQueueDemo` | `components/TransactionEffectQueueDemo.vue` | 第30章（事务效果队列） |
| `ExtensionDecisionFlowDemo` | `components/ExtensionDecisionFlowDemo.vue` | 第13章（扩展决策流程） |
| `ExtensionCapabilitySelector` | `components/ExtensionCapabilitySelector.vue` | 第13章（扩展能力选择器） |
| `CloudLayerResponsibilityDemo` | `components/CloudLayerResponsibilityDemo.vue` | 第14章（云层责任划分） |
| `TaskExecutionPathDemo` | `components/TaskExecutionPathDemo.vue` | 第27章（任务执行路径） |
| `TestingLayersDemo` | `components/TestingLayersDemo.vue` | 第15章（测试分层） |
| `LocalCloudTopologyDemo` | `components/LocalCloudTopologyDemo.vue` | 第14章（本地云拓扑） |
| `TuiProviderFlowDemo` | `components/TuiProviderFlowDemo.vue` | 第8章（TUI Provider 流程） |
| `PluginLifecycleDemo` | `components/PluginLifecycleDemo.vue` | 第13章（插件生命周期） |
| `ExtensionBestPracticeChecklistDemo` | `components/ExtensionBestPracticeChecklistDemo.vue` | 第13章（扩展最佳实践） |
| `ToolExecutionLifecycleDemo` | `components/ToolExecutionLifecycleDemo.vue` | 第4章（工具执行生命周期） |
| `SessionLoopLifecycleDemo` | `components/SessionLoopLifecycleDemo.vue` | 第5章（会话循环生命周期） |

### 实践篇演示组件（P1-P9 专属）
| 组件名 | 文件 | 对应章节 |
|--------|------|----------|
| `ToolCallingLifecycle` | `components/ToolCallingLifecycle.vue` | P1（工具调用生命周期） |
| `StreamingOutputDemo` | `components/StreamingOutputDemo.vue` | P3（流式输出演示） |
| `ContextWindowDemo` | `components/ContextWindowDemo.vue` | P2（上下文窗口演示） |
| `ErrorRetryDemo` | `components/ErrorRetryDemo.vue` | P4（错误重试演示） |
| `MemoryLayersDemo` | `components/MemoryLayersDemo.vue` | P5（三层记忆架构） |
| `MemoryBankDemo` | `components/MemoryBankDemo.vue` | P6（标签记忆检索） |
| `RagPipelineDemo` | `components/RagPipelineDemo.vue` | P7（RAG 流水线） |
| `GraphRagDemo` | `components/GraphRagDemo.vue` | P8（知识图谱遍历） |
| `HybridRetrievalDemo` | `components/HybridRetrievalDemo.vue` | P9（混合检索 + RRF 融合） |

### 动画演示组件
| 组件名 | 文件 | 对应章节 |
|--------|------|----------|
| `WhatIsAgent` | `components/animations/css/WhatIsAgent.vue` | 第1-2章（LLM → Agent 演进） |
| `MultiTurnDialog` | `components/animations/css/MultiTurnDialog.vue` | 第5章（多轮对话上下文） |
| `FunctionCallingCss` | `components/animations/css/FunctionCallingCss.vue` | 第4章（工具调用 CSS 动画） |
| `MemorySystemCss` | `components/animations/css/MemorySystemCss.vue` | 第5章（记忆系统 CSS 动画） |
| `FunctionCalling` | `components/animations/lottie/FunctionCalling.vue` | 第4章（工具调用 Lottie 动画） |
| `MultiAgentCollab` | `components/animations/lottie/MultiAgentCollab.vue` | 第16章（多 Agent 协作） |
| `MemorySystem` | `components/animations/lottie/MemorySystem.vue` | 第5章（记忆系统 Lottie 动画） |

### 动画实验室组件（animation-lab/）
| 组件名 | 文件 | 用途 |
|--------|------|------|
| `AnimationLabIndex` | `components/animation-lab/AnimationLabIndex.vue` | 实验室总览页面，渲染 11 个实验入口 |
| `SystemMotionPlayer` | `components/animation-lab/SystemMotionPlayer.vue` | 系统运动演示播放器 |
| `TracePanel` | `components/animation-lab/TracePanel.vue` | Trace 事件追踪面板 |
| `FlowExperimentCanvas` | `components/animation-lab/FlowExperimentCanvas.vue` | 通用流动实验画布（节点 + 路径 + 动画） |
| `AgentLoopExperiment` | `components/animation-lab/AgentLoopExperiment.vue` | Agent 运行闭环实验 |
| `ContextMemoryExperiment` | `components/animation-lab/ContextMemoryExperiment.vue` | 上下文与记忆流实验 |
| `MultiAgentDispatchExperiment` | `components/animation-lab/MultiAgentDispatchExperiment.vue` | 多 Agent 调度实验 |
| `ToolPermissionGateExperiment` | `components/animation-lab/ToolPermissionGateExperiment.vue` | 工具调用与权限门实验 |
| `ContextCompactionExperiment` | `components/animation-lab/ContextCompactionExperiment.vue` | 上下文压缩实验 |
| `ErrorRecoveryLoopExperiment` | `components/animation-lab/ErrorRecoveryLoopExperiment.vue` | 错误恢复与自修复循环实验 |
| `ProviderRoutingFallbackExperiment` | `components/animation-lab/ProviderRoutingFallbackExperiment.vue` | Provider 路由与降级实验 |
| `RagRetrievalFlowExperiment` | `components/animation-lab/RagRetrievalFlowExperiment.vue` | RAG 检索增强流程实验 |
| `HumanApprovalGateExperiment` | `components/animation-lab/HumanApprovalGateExperiment.vue` | 人工确认与高风险操作实验 |
| `StructuredOutputValidationExperiment` | `components/animation-lab/StructuredOutputValidationExperiment.vue` | 结构化输出与校验修复实验 |
| `StreamingInterruptControlExperiment` | `components/animation-lab/StreamingInterruptControlExperiment.vue` | 流式输出与中断控制实验 |

动画实验室支持 11 种实验类型：`agent-loop`、`context-memory-flow`、`multi-agent-dispatch`、`tool-permission-gate`、`context-compaction`、`error-recovery-loop`、`provider-routing-fallback`、`rag-retrieval-flow`、`human-approval-gate`、`structured-output-validation`、`streaming-interrupt-control`。

---

## 数据层（theme/data/）

数据层是内容元数据框架的核心，驱动导航、发现和学习进度等系统化功能。

| 文件 | 职责 | 关键导出 |
|------|------|---------|
| `content-meta.ts` | 内容类型定义、frontmatter 规范化 | `ContentType`、`LearningContentFrontmatter`、`normalizeLearningFrontmatter()` |
| `content-index.data.ts` | VitePress data loader，聚合全站页面元数据 | `data`（所有页面的元数据集合） |
| `learning-paths.data.ts` | 学习路径定义 data loader | 三条路径：theory-first / practice-first / engineering-depth |
| `practice-projects.ts` | 28 个实践项目完整元数据定义 | `practiceProjectsById`、`PracticeProjectDefinition` |
| `practice-source-files.ts` | 实践项目源文件路径映射 | 每个 projectId 对应的可运行脚本路径 |
| `discovery-content.ts` | 发现中心内容路由（按目标分组） | `DiscoveryGoalRoute`、`DiscoveryTopicCollection` |
| `animation-lab-experiments.ts` | 动画实验室实验目录定义（11 个实验） | `animationLabExperiments`（`ExperimentCatalogItem[]`）、各实验 canvas/data 的 re-export |
| `animation-lab/*.ts` | 各实验的数据定义（11 个文件） | 每个文件导出 canvas（nodes/paths）和 experiment（steps/traceEvents） |

### Frontmatter 元数据规范

所有理论篇、实践篇、中级篇章节的 frontmatter 必须包含以下学习元数据字段（由 `check-learning-metadata.mjs` 强制检查）：

```yaml
---
title: 章节标题
description: 章节描述
contentType: theory | practice | intermediate | support
series: book | practice | intermediate | support
contentId: 唯一 ID（如 theory-00-what-is-ai-agent）
shortTitle: 导航简称
summary: 一句话摘要
difficulty: beginner | intermediate | advanced
estimatedTime: 预计阅读时间
learningGoals:
  - 你会学到什么 1
prerequisites:
  - 前置要求
recommendedNext:
  - /next-chapter/
practiceLinks:
  - /practice/p01-minimal-agent/
searchTags:
  - tag1
navigationLabel: 侧边栏导航名称
entryMode: read-first | build-first | bridge
roleDescription: 适合哪类读者
---
```

---

## Composable 清单（theme/composables/）

| 文件 | 功能 |
|------|------|
| `useDemoPlayer.ts` | 步骤式演示的播放/暂停/重置控制 |
| `useBudgetMeter.ts` | Token 预算仪表盘（used/total/warning/danger 阈值） |
| `useScenarioSelection.ts` | 多场景切换（DemoScenarioMeta） |
| `useDependencyGraph.ts` | 依赖图遍历（用于 PlanningTreeDemo 等） |

---

## 类型定义结构（types.ts）

`types.ts` 集中定义所有组件 Props 类型，并从三个数据层文件重新导出类型：
- 从 `content-meta` 导出：`ContentType`、`LearningDifficulty`、`EntryMode` 等核心枚举
- 从 `discovery-content` 导出：`DiscoveryGoalRoute`、`DiscoveryTopicCollection`
- 从 `practice-projects` 导出：`PracticeProjectDefinition`、`PracticeCourseRoute`
- 原生定义：`SourceSnapshotCardProps`、`RuntimeLifecycleDiagramProps`、中级篇各章 Demo Props（Ch25-Ch32）、学习进度类型（`LearningProgressStatus`、`LearningProgressRecord`）、动画系统类型（`AnimationContainerProps`、`LottiePlayerProps`、`AnimationStage`）、动画实验室类型（`Experiment`、`ExperimentStep`、`TraceEvent`、`MotionPacket`、`FlowCanvasConfig`、`FlowCanvasMotion` 等）

---

## VitePress 配置要点

- **srcDir**：`docs` — 所有内容路径相对于 `docs/`
- **侧边栏**：`config.mts` 中手动定义多组侧边栏（按专区划分）：
  - 理论篇（`/`）：六个部分（第一至第六部分，含中级篇索引），顶部含发现中心、动画实验室、实践篇、中级篇、面试题专区入口
  - 实践篇（`/practice/`）：七个阶段 + 5 个补充章节（P24-P28）
  - 中级篇（`/intermediate/`）：8 个专题 + 推荐入口
  - 动画实验室（`/animation-lab/`）：实验室首页 + 11 个实验锚点链接
  - 面试题专区（`/interview/`）：7 个能力分类 + 9 个八股文子类
  - Claude Code（`/claude-code/`）：5 部分 20 章侧边栏
  - Hermes Agent（`/hermes-agent/`）：4 区块 12 章 + 5 组附录侧边栏
  - 企业 Agent（`/enterprise-agent/`）：6 模块 17 章 + 7 工具包侧边栏
  - Claude Code 业务流（`/new-claude/`）：4 部分 20 页侧边栏
- **导航栏**：实践篇 / 中级篇 / 动画实验室 / 面试题专区 / 专栏（下拉：Claude Code 架构思维、Claude Code 源码业务流、Hermes Agent 拆解、从零设计企业 Agent）/ 本书仓库
- **搜索增强**：`_render` 钩子调用 `buildSearchPrelude()` 为每个页面注入结构化学习元数据，提升本地搜索质量
- **Mermaid**：`vitepress-plugin-mermaid` + `withMermaid()` 包装启用
- **OG Meta**：`transformPageData` 钩子自动注入每页 og:title / og:description / twitter:card
- **大纲**：h2-h4 级别，label 为"目录"
- **搜索**：本地搜索（`provider: 'local'`），搜索框提示文案为中文
- **源码锚点**：`sourceCommit: 'f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc'`

---

## 内容质量校验体系（scripts/）

项目建立了 12 个校验脚本，全部通过后方可执行 `build:strict`：

| 脚本 | 检查内容 |
|------|---------|
| `check-content.mjs` | 必要 Markdown 文件存在性（含 `docs/intermediate/index.md`）、禁止词（TODO/FIXME/TBD/待补/需要补充） |
| `check-practice-entries.mjs` | 实践脚本入口有效性（`practice/*.ts` 与 docs 一一对应） |
| `check-learning-metadata.mjs` | 所有章节 frontmatter 的 15 个元数据字段完整性 |
| `check-learning-paths.mjs` | 学习路径定义的 step 指向的 contentId 在全站可解析 |
| `check-homepage-entry.mjs` | 首页组件和入口完整性 |
| `check-navigation-entry.mjs` | 侧边栏所有链接对应页面真实存在 |
| `check-entry-context.mjs` | EntryContextBanner 在中级篇导读等页面正确使用 |
| `check-chapter-experience.mjs` | 章节页面的 ChapterLearningGuide / ChapterActionPanel 使用规范 |
| `check-practice-course-experience.mjs` | 实践章节页面体验组件使用规范 |
| `check-discovery-experience.mjs` | 发现中心组件在对应页面正确使用 |
| `check-learning-progress.mjs` | LearningProgressToggle 在需要的页面中使用 |
| `check-animation-lab.mjs` | 动画实验室数据文件与实际导入一致性、组件注册完整性、布局签名校验 |

---

## 内容约定

- **Frontmatter 必须**：每个章节文件必须有 `title`、`description` 及完整学习元数据（15 个字段）
- **不重复 H1**：VitePress 从 frontmatter 渲染标题，正文不加同名 H1
- **章节命名**：
  - 理论篇：`docs/NN-slug/index.md`（00-20），特殊页 `docs/oh-*/index.md`
  - 中级篇：`docs/intermediate/NN-slug/index.md`（25-32，含 Python 示例 README）
  - 实践篇：`docs/practice/pNN-slug/index.md`（p01-p28）
  - 专栏（claude-code）：`docs/claude-code/chapterNN.md`（直接 .md，无子目录）
  - 专栏（new-claude）：`docs/new-claude/part-N-名称/`（按部分分目录）
  - 专栏（hermes-agent）：`docs/hermes-agent/`（章节和附录均为单层 .md 文件）
  - 专栏（enterprise-agent）：`docs/enterprise-agent/eNN-slug.md`（模块章节 + 工具包）
  - 面试题：`docs/interview/category/index.md`（按分类子目录）
- **辅助页面**：直接放 `docs/` 根下（不带子目录）
- **源码快照卡**：每章顶部应包含 `<SourceSnapshotCard>` 锚定版本
- **章末 CTA**：各章末尾可嵌入 `<StarCTA>` 引导 Star
- **中级篇**：每章开头应有 `<EntryContextBanner>` 提供定位说明
- **实践篇**：每章开头应有 `<PracticeProjectGuide project-id="..." />` 提供项目元数据
- **动画实验室**：页面使用 `<AnimationLabIndex />` 自包含组件，无需额外组件

---

## 工具脚本

位于 `docs/book/` 根目录：

- `add-frontmatter.ts` — 为章节文件批量补写 frontmatter（注意：硬编码的章节列表不含中级篇和补充实践章节，新增章节后需手动更新脚本）
- `remove-duplicate-titles.ts` — 移除 frontmatter 之后重复出现的同名 H1

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
    "shiki": "^1.22.2",
    "typescript": "^5.8.2",
    "vitepress": "^1.5.0",
    "vitepress-plugin-mermaid": "^2.0.17"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "lottie-web": "^5.13.0",
    "openai": "^6.32.0"
  }
}
```

**相比旧文档新增**：`shiki: ^1.22.2`（代码高亮增强）

---

## AI 使用指引

### 修改或新增章节

**理论篇章节**：
1. 在 `docs/NN-slug/index.md` 中写内容，确保有完整 frontmatter（含 15 个学习元数据字段）
2. 在 `config.mts` 的 `sidebar['/']` 对应分区添加侧边栏条目
3. 在 `practice-projects.ts` 中更新 `relatedTheory` 引用（如适用）

**中级篇章节**：
1. 在 `docs/intermediate/NN-slug/index.md` 写内容，开头加 `<EntryContextBanner>`
2. 在 `config.mts` 的 `sidebar['/intermediate/']` 和 `sidebar['/']` 两处都需要添加条目
3. 创建对应的 Vue 演示组件（放 `components/` 下），Props 类型写入 `types.ts` 对应章节分区

**实践篇章节**：
1. 在 `docs/practice/pNN-slug/index.md` 写内容，开头加 `<PracticeProjectGuide project-id="..." />`
2. 在 `practice-projects.ts` 中新增项目定义（`PracticeProjectDefinition`）
3. 在 `config.mts` 的 `sidebar['/practice/']` 对应 Phase 添加条目
4. 如有可运行脚本，在 `practice/pNN-slug.ts` 中创建
5. 在 `practice-source-files.ts` 中注册源文件映射

**补充实践章节（P24-P28 模式）**：
- 不创建独立的 `practice/*.ts` 脚本，只有文档页面
- 挂在对应 Phase 的补充位置（侧边栏标注"补充："前缀）

**新增专栏章节**：
1. 在 `docs/column-name/` 下创建 .md 文件（按专栏约定命名）
2. 在 `config.mts` 中新增专属 sidebar 分组：`'/column-name/'`
3. 如果专栏需要导航栏入口：添加到 `themeConfig.nav` 或"专栏"下拉菜单

### 新增 Vue 组件

1. 在 `.vitepress/theme/components/` 创建 `.vue` 文件
2. Props 类型定义**必须**写入 `types.ts`（按章节分区，加注释）；animation-lab 子组件类型写入 `components/animation-lab/type.ts`
3. 在 `theme/index.ts` 的 `asyncGlobalComponents` 数组中注册（异步组件）或 `syncGlobalComponents`（同步组件）
4. 单文件不超过 500 行，超出则拆分子组件
5. 如果组件有配套数据文件，放 `theme/data/` 对应目录

### 新增动画实验室实验

1. 在 `theme/data/animation-lab/` 创建实验数据文件（导出 `Experiment` 和 `FlowCanvasConfig`）
2. 在 `theme/components/animation-lab/` 创建对应的实验组件
3. 在 `animation-lab-experiments.ts` 中注册实验到 `animationLabExperiments` 数组
4. 在 `scripts/check-animation-lab.mjs` 的 `animationDataFiles` 中添加映射
5. 在 `config.mts` 的 `sidebar['/animation-lab/']` 中添加实验锚点链接

### 数据层变更

- 修改 `practice-projects.ts` 后，相关校验脚本会自动检查一致性
- 修改 `content-meta.ts` 类型后，需同步更新 `types.ts` 的重新导出声明
- `content-index.data.ts` 是 VitePress data loader，自动扫描全站 frontmatter，不需要手动维护
- 修改 `animation-lab-experiments.ts` 后，`check-animation-lab.mjs` 会验证数据一致性

### 调试构建问题

- Mermaid 相关报错：检查 `vite.ssr.noExternal` 和 `optimizeDeps.include` 配置
- 类型错误：检查 `.vitepress/tsconfig.json`（target ES2022 / moduleResolution Bundler）
- 校验失败：`bun run build:strict` 会在第一个失败的脚本处停止，单独运行对应 `check:*` 命令快速定位
- 内容路径问题：所有链接相对于 `srcDir: docs`，不是项目根目录
- 动画实验室布局异常：检查 `FlowExperimentCanvasBase.css` / `FlowExperimentCanvasMotion.css` 中的 CSS 变量定义

### 常见任务

- **查看全书导航结构**：读取 `.vitepress/config.mts` 的 `sidebar` 配置（多组：`/`、`/practice/`、`/intermediate/`、`/animation-lab/`、`/interview/`、`/claude-code/`、`/hermes-agent/`、`/enterprise-agent/`、`/new-claude/`）
- **查看导航栏**：读取 `.vitepress/config.mts` 的 `themeConfig.nav`（首页 / 实践篇 / 中级篇 / 动画实验室 / 面试题专区 / 专栏下拉 / 本书仓库）
- **查看组件注册情况**：读取 `.vitepress/theme/index.ts`（约 95 个组件，含 26 个同步 + 67 个异步 + 2 个单独异步）
- **查看 Props 类型**：读取 `.vitepress/theme/components/types.ts`（约 800+ 行，按章节分区注释）
- **查看动画实验室类型**：读取 `.vitepress/theme/components/animation-lab/type.ts`
- **查看实践项目元数据**：读取 `.vitepress/theme/data/practice-projects.ts`
- **查看学习路径定义**：读取 `.vitepress/theme/data/learning-paths.data.ts`
- **查看内容元数据规范**：读取 `.vitepress/theme/data/content-meta.ts`
- **查看动画实验定义**：读取 `.vitepress/theme/data/animation-lab-experiments.ts` 及各 `animation-lab/*.ts`
- **更新源码快照版本**：修改 `config.mts` 的 `sourceCommit` 常量，并同步 `docs/version-notes.md`
- **实践篇环境配置**：查看 `docs/practice/setup.md`
- **中级篇入口回链**：查看 `docs/intermediate/index.md` 中的回链表格
- **动画实验室入口**：查看 `docs/animation-lab/index.md`（使用 `<AnimationLabIndex />` 组件）
- **设计规格与计划**：查看 `docs/superpowers/specs/` 和 `docs/superpowers/plans/`
