/**
 * add-frontmatter.ts
 * 为章节文件批量补写 frontmatter（跳过已有 frontmatter 的文件）
 *
 * 运行：
 *   bun add-frontmatter.ts [--dry-run]
 *
 * --dry-run 只打印需要处理的文件，不写入
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOCS_DIR = resolve((import.meta as any).dir ?? new URL('.', import.meta.url).pathname, 'docs')
const DRY_RUN = process.argv.includes('--dry-run')

// ==================== Frontmatter 定义 ====================

interface ChapterMeta {
  path: string           // 相对于 docs/ 的路径
  frontmatter: string    // YAML frontmatter 块内容（不含 --- 分隔符）
}

// ----- 理论篇（第一至第五部分）-----
const THEORY_CHAPTERS: ChapterMeta[] = [
  {
    path: '00-what-is-ai-agent/index.md',
    frontmatter: `title: 第1章：什么是 AI Agent
description: 从 LLM 到 Agent 的演进，理解 AI Agent 的本质与核心能力
contentType: theory
series: book
contentId: book-00-agent-intro`,
  },
  {
    path: '01-agent-basics/index.md',
    frontmatter: `title: 第2章：AI Agent 的核心组件
description: Agent 基础架构：感知、记忆、规划与行动四层模型的系统解析
contentType: theory
series: book
contentId: book-01-agent-basics`,
  },
  {
    path: '02-agent-core/index.md',
    frontmatter: `title: 第3章：OpenCode 项目介绍
description: OpenCode 总览：Monorepo 架构、核心模块分工与客户端/服务器分离模式
contentType: theory
series: book
contentId: book-02-agent-core`,
  },
  {
    path: '03-tool-system/index.md',
    frontmatter: `title: 第4章：工具系统
description: 工具注册、执行与权限：OpenCode 工具系统的设计思路与实现细节
contentType: theory
series: book
contentId: book-03-tool-system`,
  },
  {
    path: '04-session-management/index.md',
    frontmatter: `title: 第5章：会话管理
description: 多轮对话的上下文管理、消息压缩策略与会话生命周期
contentType: theory
series: book
contentId: book-04-session-management`,
  },
  {
    path: '05-provider-system/index.md',
    frontmatter: `title: 第6章：多模型支持
description: Provider 抽象层：如何支持 Claude、OpenAI、Google 等多个模型提供商
contentType: theory
series: book
contentId: book-05-provider-system`,
  },
  {
    path: '06-mcp-integration/index.md',
    frontmatter: `title: 第7章：MCP 协议集成
description: Model Context Protocol 握手、工具发现与跨进程通信机制
contentType: theory
series: book
contentId: book-06-mcp-integration`,
  },
  {
    path: '07-tui-interface/index.md',
    frontmatter: `title: 第8章：TUI 终端界面
description: 基于 Ink 的终端 UI 实现：组件树、事件循环与权限弹窗设计
contentType: theory
series: book
contentId: book-07-tui-interface`,
  },
  {
    path: '08-http-api-server/index.md',
    frontmatter: `title: 第9章：HTTP API 服务器
description: SSE 事件流、REST 接口与连接门控：OpenCode 服务器层的设计
contentType: theory
series: book
contentId: book-08-http-api-server`,
  },
  {
    path: '09-data-persistence/index.md',
    frontmatter: `title: 第10章：数据持久化
description: SQLite、Drizzle ORM 与会话/消息/权限记录的持久化策略
contentType: theory
series: book
contentId: book-09-data-persistence`,
  },
  {
    path: '10-multi-platform-ui/index.md',
    frontmatter: `title: 第11章：多端 UI 开发
description: Web、桌面与 CLI 共享 UI 层：SolidJS 组件与 Tauri 跨平台方案
contentType: theory
series: book
contentId: book-10-multi-platform-ui`,
  },
  {
    path: '11-code-intelligence/index.md',
    frontmatter: `title: 第12章：代码智能
description: LSP 集成：语言服务器协议如何为 Agent 提供符号感知与诊断能力
contentType: theory
series: book
contentId: book-11-code-intelligence`,
  },
  {
    path: '12-plugins-extensions/index.md',
    frontmatter: `title: 第13章：插件与扩展
description: OpenCode 插件系统的架构设计与扩展点机制
contentType: theory
series: book
contentId: book-12-plugins-extensions`,
  },
  {
    path: '13-deployment-infrastructure/index.md',
    frontmatter: `title: 第14章：部署与基础设施
description: SST、Cloudflare 与 IaC：OpenCode 的云端部署架构
contentType: theory
series: book
contentId: book-13-deployment-infrastructure`,
  },
  {
    path: '14-testing-quality/index.md',
    frontmatter: `title: 第15章：测试与质量保证
description: 单元测试、E2E 测试与内容校验：OpenCode 的测试策略全景
contentType: theory
series: book
contentId: book-14-testing-quality`,
  },
  {
    path: '15-advanced-topics/index.md',
    frontmatter: `title: 第16章：高级主题与最佳实践
description: 多 Agent 协作、上下文预算与生产化最佳实践
contentType: theory
series: book
contentId: book-15-advanced-topics`,
  },
  {
    path: 'oh-prelude/index.md',
    frontmatter: `title: 第17章：为什么需要多个 Agent？
description: 多 Agent 编排的必要性：单 Agent 的边界与多 Agent 协作的价值
contentType: theory
series: book
contentId: book-oh-prelude`,
  },
  {
    path: '16-plugin-overview/index.md',
    frontmatter: `title: 第18章：插件系统概述
description: oh-my-openagent 插件系统的架构总览与扩展模式
contentType: theory
series: book
contentId: book-16-plugin-overview`,
  },
  {
    path: 'oh-config/index.md',
    frontmatter: `title: 第19章：配置系统实战
description: 插件配置层的设计与实现：从声明到运行时的完整链路
contentType: theory
series: book
contentId: book-oh-config`,
  },
  {
    path: '17-multi-model-orchestration/index.md',
    frontmatter: `title: 第20章：多模型编排系统
description: 多模型协作机制：任务分发、结果合并与模型间通信
contentType: theory
series: book
contentId: book-17-multi-model-orchestration`,
  },
  {
    path: '18-hooks-architecture/index.md',
    frontmatter: `title: 第21章：Hooks 三层架构
description: Hook 分层设计：全局 / 会话 / 工具三层 Hook 的职责与实现
contentType: theory
series: book
contentId: book-18-hooks-architecture`,
  },
  {
    path: '19-tool-extension/index.md',
    frontmatter: `title: 第22章：工具扩展系统
description: 工具扩展机制：如何为 Agent 添加自定义工具与工具组合
contentType: theory
series: book
contentId: book-19-tool-extension`,
  },
  {
    path: 'oh-flow/index.md',
    frontmatter: `title: 第23章：一条消息的完整旅程
description: 端到端消息链路：从用户输入到 Agent 响应的完整处理流程
contentType: theory
series: book
contentId: book-oh-flow`,
  },
  {
    path: '20-best-practices/index.md',
    frontmatter: `title: 第24章：实战案例与最佳实践
description: 生产级 Agent 的实战案例与工程最佳实践总结
contentType: theory
series: book
contentId: book-20-best-practices`,
  },
]

// ----- 中级篇（第六部分，第25-32章）-----
const INTERMEDIATE_CHAPTERS: ChapterMeta[] = [
  {
    path: 'intermediate/25-rag-failure-patterns/index.md',
    frontmatter: `title: 第25章：RAG 为什么总是答不准？
description: 从五个高频翻车场景切入，理解 RAG 系统为何会答偏、漏答、编造，以及如何用工程手段逐个修复。
contentType: intermediate
contentId: intermediate-25-rag-failure-patterns
series: book
roleDescription: 理解 RAG 系统常见故障模式，掌握排查与修复方法。`,
  },
  {
    path: 'intermediate/26-multi-agent-collaboration/index.md',
    frontmatter: `title: 第26章：多 Agent 协作的真实挑战
description: 多 Agent 系统中的编排模式、状态共享与通信协议设计。
contentType: intermediate
contentId: intermediate-26-multi-agent-collaboration
series: book
roleDescription: 掌握多 Agent 协作的核心模式，理解状态共享与任务分发机制。`,
  },
  {
    path: 'intermediate/27-planning-mechanism/index.md',
    frontmatter: `title: 第27章：Planning 机制深度解析
description: 从 ReAct 到 Plan-and-Execute，理解 Agent 规划机制的演进与实现原理。
contentType: intermediate
contentId: intermediate-27-planning-mechanism
series: book
roleDescription: 理解规划机制的核心思路，掌握任务分解与执行策略。`,
  },
  {
    path: 'intermediate/28-context-engineering/index.md',
    frontmatter: `title: 第28章：上下文工程实战
description: Prompt 不够用了？用选、排、压、拼四步方法系统管理 Agent 的上下文质量。
contentType: intermediate
contentId: intermediate-28-context-engineering
series: book
roleDescription: 掌握上下文工程的四步方法，系统管理 Agent 上下文质量。`,
  },
  {
    path: 'intermediate/29-system-prompt-design/index.md',
    frontmatter: `title: 第29章：System Prompt 设计
description: 理解 System Prompt 为什么是 Agent 的行为合同，而不是一句"你是一个助手"，并把它放回 OpenCode 的上下文装配主链里。
contentType: intermediate
contentId: intermediate-29-system-prompt-design
series: book
roleDescription: 理解 System Prompt 设计原则，提升 Agent 行为稳定性。`,
  },
  {
    path: 'intermediate/30-production-architecture/index.md',
    frontmatter: `title: 第30章：生产架构与部署
description: 从"能跑的 Demo"到"可持续运行的产品"，理解 Agent 生产架构真正要补齐的是哪些边界、状态和闭环。
contentType: intermediate
contentId: intermediate-30-production-architecture
series: book
roleDescription: 理解生产环境架构设计，掌握可靠性与可扩展性策略。`,
  },
  {
    path: 'intermediate/31-safety-boundaries/index.md',
    frontmatter: `title: 第31章：安全边界与高风险控制
description: 把高风险 Agent 的安全问题拆成风险分级、确认机制、最小权限和运行时边界，而不是把一切都压给 Prompt。
contentType: intermediate
contentId: intermediate-31-safety-boundaries
series: book
roleDescription: 建立安全边界机制，防范注入攻击与权限滥用。`,
  },
  {
    path: 'intermediate/32-performance-cost/index.md',
    frontmatter: `title: 第32章：性能与成本控制
description: 理解 Agent 的性能与成本为什么首先是架构问题，而不是"等更强模型出来"以后自然解决的问题。
contentType: intermediate
contentId: intermediate-32-performance-cost
series: book
roleDescription: 优化性能与成本，理解 Token 计费与缓存策略。`,
  },
]

// ----- 实践篇（p01-p28）-----
const PRACTICE_CHAPTERS: ChapterMeta[] = [
  {
    path: 'practice/p01-minimal-agent/index.md',
    frontmatter: `title: P1：最小 Agent — 工具调用核心机制
description: 用 80 行 TypeScript 构建你的第一个可运行 Agent，理解工具调用的完整生命周期
contentType: practice
series: practice
contentId: practice-p01-minimal-agent`,
  },
  {
    path: 'practice/p02-multi-turn/index.md',
    frontmatter: `title: P2：多轮对话 — 上下文管理
description: 实现多轮对话的上下文保持，理解消息历史如何影响 Agent 行为
contentType: practice
series: practice
contentId: practice-p02-multi-turn`,
  },
  {
    path: 'practice/p03-streaming/index.md',
    frontmatter: `title: P3：流式输出 — 实时反馈
description: 实现流式响应，让 Agent 能够实时推送生成内容
contentType: practice
series: practice
contentId: practice-p03-streaming`,
  },
  {
    path: 'practice/p04-error-handling/index.md',
    frontmatter: `title: P4：错误处理 — 重试与降级策略
description: 构建健壮的 Agent：超时处理、重试策略与优雅降级
contentType: practice
series: practice
contentId: practice-p04-error-handling`,
  },
  {
    path: 'practice/p05-memory-arch/index.md',
    frontmatter: `title: P5：记忆系统架构
description: 设计 Agent 的记忆层：短期、长期与情节记忆的分层管理
contentType: practice
series: practice
contentId: practice-p05-memory-arch`,
  },
  {
    path: 'practice/p06-memory-retrieval/index.md',
    frontmatter: `title: P6：记忆增强检索
description: 用向量检索增强 Agent 记忆，实现相关历史的精准召回
contentType: practice
series: practice
contentId: practice-p06-memory-retrieval`,
  },
  {
    path: 'practice/p07-rag-basics/index.md',
    frontmatter: `title: P7：RAG 基础 — 检索增强生成
description: 从零实现 RAG 管道：文档分块、嵌入检索与 Prompt 注入
contentType: practice
series: practice
contentId: practice-p07-rag-basics`,
  },
  {
    path: 'practice/p08-graphrag/index.md',
    frontmatter: `title: P8：GraphRAG — 图结构知识检索
description: 用图结构增强 RAG：实体关系建模与多跳推理
contentType: practice
series: practice
contentId: practice-p08-graphrag`,
  },
  {
    path: 'practice/p09-hybrid-retrieval/index.md',
    frontmatter: `title: P9：混合检索 — 多策略融合
description: 组合语义检索与关键词检索，提升知识库问答的召回质量
contentType: practice
series: practice
contentId: practice-p09-hybrid-retrieval`,
  },
  {
    path: 'practice/p10-react-loop/index.md',
    frontmatter: `title: P10：ReAct Loop — 推理行动循环
description: 实现 ReAct 模式：让 Agent 在推理与行动之间迭代，解决复杂任务
contentType: practice
series: practice
contentId: practice-p10-react-loop`,
  },
  {
    path: 'practice/p11-planning/index.md',
    frontmatter: `title: P11：Planning — 任务规划机制
description: 实现 Plan-and-Execute：Agent 先规划再执行，应对多步骤复杂任务
contentType: practice
series: practice
contentId: practice-p11-planning`,
  },
  {
    path: 'practice/p12-reflection/index.md',
    frontmatter: `title: P12：Reflection — 反思模式
description: 让 Agent 对自身输出进行批判与改进，实现自我纠错能力
contentType: practice
series: practice
contentId: practice-p12-reflection`,
  },
  {
    path: 'practice/p13-multimodal/index.md',
    frontmatter: `title: P13：多模态 Agent
description: 扩展 Agent 的感知边界：处理图像、文档与混合媒体输入
contentType: practice
series: practice
contentId: practice-p13-multimodal`,
  },
  {
    path: 'practice/p14-mcp/index.md',
    frontmatter: `title: P14：MCP 协议接入
description: 用 Model Context Protocol 连接外部工具服务，扩展 Agent 的工具能力
contentType: practice
series: practice
contentId: practice-p14-mcp`,
  },
  {
    path: 'practice/p15-multi-agent/index.md',
    frontmatter: `title: P15：多 Agent 编排
description: 构建多 Agent 协作系统：主 Agent 调度、子 Agent 执行与结果聚合
contentType: practice
series: practice
contentId: practice-p15-multi-agent`,
  },
  {
    path: 'practice/p16-subagent/index.md',
    frontmatter: `title: P16：子 Agent — 任务分解
description: 实现任务分解与子 Agent 委派，让复杂任务并行执行
contentType: practice
series: practice
contentId: practice-p16-subagent`,
  },
  {
    path: 'practice/p17-agent-comm/index.md',
    frontmatter: `title: P17：Agent 通信 — 状态共享
description: 多 Agent 间的消息传递、状态同步与共享上下文管理
contentType: practice
series: practice
contentId: practice-p17-agent-comm`,
  },
  {
    path: 'practice/p18-model-routing/index.md',
    frontmatter: `title: P18：模型路由与成本控制
description: 根据任务复杂度路由到不同模型，实现性能与成本的动态平衡
contentType: practice
series: practice
contentId: practice-p18-model-routing`,
  },
  {
    path: 'practice/p19-security/index.md',
    frontmatter: `title: P19：Agent 安全与防注入
description: 防范 Prompt 注入、输入清洗、输出验证与纵深防御策略
contentType: practice
series: practice
contentId: practice-p19-security`,
  },
  {
    path: 'practice/p20-observability/index.md',
    frontmatter: `title: P20：可观测性与调试
description: 为 Agent 添加追踪、日志与调试能力，让系统行为可见可测
contentType: practice
series: practice
contentId: practice-p20-observability`,
  },
  {
    path: 'practice/p21-evaluation/index.md',
    frontmatter: `title: P21：评估与测试 — 基准测试
description: 构建 Agent 评估框架：自动化测试、基准对比与质量回归
contentType: practice
series: practice
contentId: practice-p21-evaluation`,
  },
  {
    path: 'practice/p22-project/index.md',
    frontmatter: `title: P22：完整项目 — Code Review Agent
description: 综合运用所学，构建一个可用于真实代码审查的完整 Agent 项目
contentType: practice
series: practice
contentId: practice-p22-project`,
  },
  {
    path: 'practice/p23-production/index.md',
    frontmatter: `title: P23：生产部署清单
description: Agent 上线前的完整检查清单：安全、可观测性、成本控制与容灾
contentType: practice
series: practice
contentId: practice-p23-production`,
  },
  // 补充实践章节（p24-p28）
  {
    path: 'practice/p24-prompt-engineering/index.md',
    frontmatter: `title: 补充：Prompt Engineering 基础
description: System Prompt 三层结构、Few-Shot 示例、Chain-of-Thought——写出真正让模型按预期工作的提示词
contentType: practice
series: practice
contentId: practice-p24-prompt-engineering`,
  },
  {
    path: 'practice/p25-long-context/index.md',
    frontmatter: `title: 补充：长上下文处理
description: 应对超长文档与多轮历史：滑动窗口、摘要压缩与关键信息保留策略
contentType: practice
series: practice
contentId: practice-p25-long-context`,
  },
  {
    path: 'practice/p26-structured-output/index.md',
    frontmatter: `title: 补充：结构化输出
description: 用 JSON Schema 约束模型输出，实现可解析、可验证的 Agent 响应
contentType: practice
series: practice
contentId: practice-p26-structured-output`,
  },
  {
    path: 'practice/p27-code-execution/index.md',
    frontmatter: `title: 补充：代码执行 Agent
description: 构建能安全运行代码的 Agent：沙箱隔离、输出捕获与错误恢复
contentType: practice
series: practice
contentId: practice-p27-code-execution`,
  },
  {
    path: 'practice/p28-human-in-loop/index.md',
    frontmatter: `title: 补充：Human-in-the-Loop
description: 在 Agent 工作流中嵌入人工确认节点，平衡自动化与人工监督
contentType: practice
series: practice
contentId: practice-p28-human-in-loop`,
  },
]

const ALL_CHAPTERS: ChapterMeta[] = [
  ...THEORY_CHAPTERS,
  ...INTERMEDIATE_CHAPTERS,
  ...PRACTICE_CHAPTERS,
]

// ==================== 核心逻辑 ====================

function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---')
}

function addFrontmatter(content: string, frontmatter: string): string {
  return `---\n${frontmatter.trim()}\n---\n\n${content.trimStart()}`
}

function processChapter(meta: ChapterMeta): 'skipped' | 'updated' | 'not-found' {
  const filePath = join(DOCS_DIR, meta.path)
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return 'not-found'
  }

  if (hasFrontmatter(content)) {
    return 'skipped'
  }

  if (!DRY_RUN) {
    writeFileSync(filePath, addFrontmatter(content, meta.frontmatter), 'utf-8')
  }
  return 'updated'
}

// ==================== 主入口 ====================

let updated = 0
let skipped = 0
let notFound = 0

if (DRY_RUN) {
  console.log('[dry-run] 不写入文件，只列出需要处理的章节\n')
}

for (const chapter of ALL_CHAPTERS) {
  const result = processChapter(chapter)
  if (result === 'updated') {
    updated++
    console.log(`  [ADD]  ${chapter.path}`)
  } else if (result === 'skipped') {
    skipped++
  } else {
    notFound++
    console.log(`  [404]  ${chapter.path}`)
  }
}

console.log(`\n完成：新增 ${updated} 个，已有 frontmatter 跳过 ${skipped} 个，文件不存在 ${notFound} 个`)
if (notFound > 0) {
  console.log('提示：404 表示文件路径不存在，请检查章节目录是否已创建')
}
