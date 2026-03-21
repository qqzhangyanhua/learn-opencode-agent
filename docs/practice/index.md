---
layout: home
title: AI Agent 实战手册
description: 23 个项目，按章节拆解 TypeScript Agent 实现，从工具调用到生产部署全覆盖
pageClass: practice-page
---

<script setup>
import PracticeTerminalHero from '../../.vitepress/theme/components/PracticeTerminalHero.vue'
import PracticePhaseGrid from '../../.vitepress/theme/components/PracticePhaseGrid.vue'
import PracticeTagCloud from '../../.vitepress/theme/components/PracticeTagCloud.vue'
</script>

<div class="practice-hero-section">

<PracticeTerminalHero />

# AI Agent 实战手册

**23 个项目 · 可跟打实现 · OpenAI SDK + TypeScript**

<div class="practice-actions">
  <a href="/practice/setup" class="btn-secondary">开始前先看</a>
  <a href="/practice/setup#online-mode" class="btn-secondary">在线运行说明</a>
  <a href="/practice/p01-minimal-agent/" class="btn-primary">从 P1 开始</a>
  <a href="#phases" class="btn-secondary">课程大纲</a>
  <a href="#chapter-matrix" class="btn-secondary">章节总表</a>
  <a href="#run-index" class="btn-secondary">运行索引</a>
  <a href="/" class="btn-secondary">← 返回理论篇</a>
</div>

> 第一次进入实践篇，建议先看 [实践环境准备](/practice/setup)。如果你想先在浏览器侧填写 `API Key / baseURL / model` 试跑，再决定要不要搭本地环境，可以直接跳到 [在线运行模式](/practice/setup#online-mode)。当前实践篇已经覆盖 `P1-P23` 的仓库内示例文件，可直接按章节命令运行。

</div>

## 实践篇解决什么问题

实践篇不是把理论篇再讲一遍，而是把“看懂 OpenCode 怎样实现”切换成“如果你自己来做，一个最小可运行 Agent 应该怎么逐步搭出来”。

- 如果你刚读完理论篇第 1-4 章，最适合从 `P1-P4` 开始，把工具调用、多轮对话、流式输出和错误处理亲手跑通。
- 如果你已经在理论篇里理解了会话、模型、工具和服务边界，实践篇就是把这些抽象概念改写成可执行 TypeScript 示例。
- 如果你准备进入中级篇，实践篇里 `P7-P9`、`P15-P17`、`P18-P21` 会分别对应 RAG、多智能体协作和生产化专题。

## 课程阶段 {#phases}

<PracticePhaseGrid :phases="[
  { id: 1, title: 'Agent 基础', subtitle: '工具调用 / 多轮对话 / 流式输出 / 错误处理', chapterCount: 4, link: '/practice/p01-minimal-agent/' },
  { id: 2, title: '记忆与知识', subtitle: '记忆系统 / 记忆增强检索 / RAG / GraphRAG', chapterCount: 5, link: '/practice/p05-memory-arch/' },
  { id: 3, title: '推理与规划', subtitle: 'ReAct Loop / Planning / Reflection', chapterCount: 3, link: '/practice/p10-react-loop/' },
  { id: 4, title: '感知扩展', subtitle: '多模态智能体 / MCP 协议接入', chapterCount: 2, link: '/practice/p13-multimodal/' },
  { id: 5, title: '多 Agent 协作', subtitle: '编排模式 / 子 Agent / 通信协议', chapterCount: 3, link: '/practice/p15-multi-agent/' },
  { id: 6, title: '生产化', subtitle: '模型路由 / 安全 / 可观测性 / 评估', chapterCount: 4, link: '/practice/p18-model-routing/' },
  { id: 7, title: '综合实战', subtitle: 'Code Review Agent 完整项目 / 部署清单', chapterCount: 2, link: '/practice/p22-project/' },
]" />

## 技术覆盖

<PracticeTagCloud :tags="[
  'OpenAI SDK', 'Tool Calling', 'Streaming', 'Multi-turn',
  'Memory System', 'RAG', 'GraphRAG', 'Hybrid Retrieval',
  'ReAct', 'Planning', 'Reflection', 'Multimodal',
  'MCP', 'Multi-Agent', 'Cost Control', 'Security',
  'Observability', 'Evaluation', 'Production Deploy',
]" />

## 运行索引 {#run-index}

如果你已经完成环境准备，可以直接从这里复制命令进入任意章节：

如果你当前走的是在线运行模式，建议先从 `P1-P4`、`P10`、`P18` 这类轻量章节开始；像 `P14` 这样的双进程章节，仍然优先使用本地运行模式。

### 先看依赖分组

按当前仓库里的真实示例脚本，第三方依赖可以先这样理解：

| 依赖组 | 章节范围 | 需要安装 |
|--------|----------|----------|
| 通用基础组 | `P1-P23` | `openai` |
| MCP 扩展组 | `P14` | `@modelcontextprotocol/sdk` |

补充说明：

- 除 `P14` 外，其余章节当前都只依赖 `openai` 和 Node 内置模块。
- `P23` 的健康检查示例使用的是 `node:http`，不需要额外安装 Web 框架。

### 章节状态总表 {#chapter-matrix}

如果你还在决定“先学哪章 / 这章会不会跳太快 / 需不需要额外装包”，可以先看这张表：

| 章节 | 主题 | 难度 | 前置章节 | 额外依赖 | 入口脚本 |
|------|------|------|----------|----------|----------|
| P1 | 最小 Agent | beginner | 无 | 无 | `p01-minimal-agent.ts` |
| P2 | 多轮对话 | beginner | `P1` | 无 | `p02-multi-turn.ts` |
| P3 | 流式输出 | beginner | `P1` | 无 | `p03-streaming.ts` |
| P4 | 错误处理与重试 | intermediate | `P1` `P2` | 无 | `p04-error-handling.ts` |
| P5 | 记忆系统架构 | intermediate | `P1` `P2` | 无 | `p05-memory-arch.ts` |
| P6 | 记忆增强检索 | intermediate | `P1` `P5` | 无 | `p06-memory-retrieval.ts` |
| P7 | RAG 基础 | intermediate | `P1` `P5` | 无 | `p07-rag-basics.ts` |
| P8 | GraphRAG | advanced | `P7` | 无 | `p08-graphrag.ts` |
| P9 | 混合检索 | advanced | `P7` `P8` | 无 | `p09-hybrid-retrieval.ts` |
| P10 | ReAct Loop | intermediate | `P1` `P4` | 无 | `p10-react-loop.ts` |
| P11 | Planning | advanced | `P10` | 无 | `p11-planning.ts` |
| P12 | Reflection | intermediate | `P10` | 无 | `p12-reflection.ts` |
| P13 | 多模态 | intermediate | `P1` | 无 | `p13-multimodal.ts` |
| P14 | MCP 协议接入 | advanced | `P1` `P4` | `@modelcontextprotocol/sdk` | `p14-mcp.ts` |
| P15 | 多 Agent 编排 | advanced | `P1` `P11` | 无 | `p15-multi-agent.ts` |
| P16 | 子 Agent 与任务分解 | advanced | `P1` `P15` | 无 | `p16-subagent.ts` |
| P17 | Agent 通信与状态共享 | advanced | `P15` `P16` | 无 | `p17-agent-comm.ts` |
| P18 | 多模型路由与成本控制 | intermediate | `P1` | 无 | `p18-model-routing.ts` |
| P19 | Agent 安全与防注入 | advanced | `P1` `P4` | 无 | `p19-security.ts` |
| P20 | 可观测性与调试 | intermediate | `P1` | 无 | `p20-observability.ts` |
| P21 | 评估与基准测试 | intermediate | `P1` `P12` | 无 | `p21-evaluation.ts` |
| P22 | 完整项目实战 | advanced | `P1` `P10` `P15` `P19` | 无 | `p22-project.ts` |
| P23 | 生产部署清单 | intermediate | `P18` `P19` `P20` | 无 | `p23-production.ts` |

快速建议：

- 如果你是第一次动手，优先按 `P1 -> P4 -> P10 -> P18` 走一遍，再回头扩展记忆、MCP、多 Agent。
- 如果你只想看综合项目，至少先跑通 `P1`、`P10`、`P15`、`P19`，再进 `P22`。
- 如果你当前只是想体验生产化包装，`P18`、`P19`、`P20` 跑完后直接进 `P23` 会更顺。

### 阶段 1：Agent 基础

| 章节 | 页面 | 运行命令 |
|------|------|----------|
| P1 | [最小 Agent](/practice/p01-minimal-agent/) | `bun run p01-minimal-agent.ts` |
| P2 | [多轮对话](/practice/p02-multi-turn/) | `bun run p02-multi-turn.ts` |
| P3 | [流式输出](/practice/p03-streaming/) | `bun run p03-streaming.ts` |
| P4 | [错误处理](/practice/p04-error-handling/) | `bun run p04-error-handling.ts` |

### 阶段 2：记忆与知识

| 章节 | 页面 | 运行命令 |
|------|------|----------|
| P5 | [记忆架构](/practice/p05-memory-arch/) | `bun run p05-memory-arch.ts` |
| P6 | [记忆检索](/practice/p06-memory-retrieval/) | `bun run p06-memory-retrieval.ts` |
| P7 | [RAG 基础](/practice/p07-rag-basics/) | `bun run p07-rag-basics.ts` |
| P8 | [GraphRAG](/practice/p08-graphrag/) | `bun run p08-graphrag.ts` |
| P9 | [混合检索](/practice/p09-hybrid-retrieval/) | `bun run p09-hybrid-retrieval.ts` |

### 阶段 3：推理与规划

| 章节 | 页面 | 运行命令 |
|------|------|----------|
| P10 | [ReAct Loop](/practice/p10-react-loop/) | `bun run p10-react-loop.ts` |
| P11 | [Planning](/practice/p11-planning/) | `bun run p11-planning.ts` |
| P12 | [Reflection](/practice/p12-reflection/) | `bun run p12-reflection.ts` |

### 阶段 4：感知扩展

| 章节 | 页面 | 运行命令 |
|------|------|----------|
| P13 | [多模态](/practice/p13-multimodal/) | `bun run p13-multimodal.ts` |
| P14 | [MCP 协议接入](/practice/p14-mcp/) | `bun run p14-mcp.ts` |

### 阶段 5：多 Agent 协作

| 章节 | 页面 | 运行命令 |
|------|------|----------|
| P15 | [多 Agent 编排](/practice/p15-multi-agent/) | `bun run p15-multi-agent.ts` |
| P16 | [Sub-Agent](/practice/p16-subagent/) | `bun run p16-subagent.ts` |
| P17 | [Agent 通信](/practice/p17-agent-comm/) | `bun run p17-agent-comm.ts` |

### 阶段 6：生产化

| 章节 | 页面 | 运行命令 |
|------|------|----------|
| P18 | [模型路由](/practice/p18-model-routing/) | `bun run p18-model-routing.ts` |
| P19 | [安全防护](/practice/p19-security/) | `bun run p19-security.ts` |
| P20 | [可观测性](/practice/p20-observability/) | `bun run p20-observability.ts` |
| P21 | [评估体系](/practice/p21-evaluation/) | `bun run p21-evaluation.ts` |

### 阶段 7：综合实战

| 章节 | 页面 | 运行命令 |
|------|------|----------|
| P22 | [Code Review Agent](/practice/p22-project/) | `bun run p22-project.ts` |
| P23 | [生产部署清单](/practice/p23-production/) | `bun run p23-production.ts` |

补充说明：

- 全书统一使用 `bun run pxx-*.ts` 作为标准命令格式。
- `P14` 章节除了 `p14-mcp.ts` 外，还需要 `practice/p14-mcp-server.ts` 配合运行，建议分两个终端分别执行：
  - `bun run p14-mcp-server.ts`
  - `bun run p14-mcp.ts`
- 运行前仍建议先看 [实践环境准备](/practice/setup)，重点确认依赖，以及 `API Key / baseURL / model` 是否已经准备好。

<style scoped>
.practice-hero-section {
  text-align: center;
  padding: 60px 24px 40px;
}

.practice-hero-section h1 {
  font-size: 2.4em;
  font-weight: 700;
  color: #f5f5f4;
  margin: 16px 0 8px;
  letter-spacing: -0.02em;
}

.practice-hero-section p {
  color: #a8a29e;
  font-size: 15px;
  margin-bottom: 28px;
}

.practice-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

.btn-primary {
  background: #ea580c;
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.2s, transform 0.2s;
}

.btn-primary:hover {
  background: #c2410c;
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  color: #a8a29e;
  border: 1px solid #44403c;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}

.btn-secondary:hover {
  border-color: #f97316;
  color: #f97316;
}
</style>
