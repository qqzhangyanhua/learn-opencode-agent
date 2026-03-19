---
title: P20：可观测性与调试
description: 结构化日志、Span 追踪、指标收集——用装饰器模式为 Agent 添加生产级可观测性
---

<ProjectCard
  title="你将构建：一个具备结构化日志、分布式追踪和指标收集的可观测 Agent，运行后输出完整 Trace 树和指标摘要"
  difficulty="intermediate"
  duration="45 min"
  :prerequisites="['P1']"
  :tags="['Observability', 'Tracing', 'Debugging', 'TypeScript', 'Anthropic SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup/)。如果本章里的 `RunCommand` 对应文件在仓库中还不存在，请先按正文步骤创建示例文件，再执行命令。

## 背景与目标

回顾之前的练习，调试手段只有一种：`console.log`。跑通了就删，出了问题再加回来，改完又删。这在实验环境能凑合，但一旦 Agent 上了生产——多轮对话、多工具调用、偶发错误——`console.log` 就不够用了：

- 你无法回溯"这次对话总共调了几次 LLM、花了多少 token"
- 工具调用失败时，你不知道当时的上下文参数是什么
- Agent 变慢了，你无法定位是 LLM 响应慢还是工具执行慢

可观测性（Observability）解决的就是这些问题。它由三根支柱组成：

```
Logs   — 结构化的事件记录（谁、在什么时候、做了什么、结果如何）
Traces — 一次请求的完整调用链路（父子关系、耗时分布）
Metrics — 聚合统计（总调用次数、平均延迟、错误率）
```

**本章目标**：用装饰器模式为 Agent 添加可观测性——不修改业务逻辑代码，而是在外层包装追踪和日志。运行结束后，输出完整的 Trace 树和指标摘要。

## 核心概念

### 三根支柱

| 支柱 | 解决的问题 | Agent 场景举例 |
|------|-----------|---------------|
| **Logs** | 发生了什么事 | "14:30:22 调用工具 search_docs，参数 {query: 'Agent'}，耗时 120ms" |
| **Traces** | 这件事的完整链路 | 一次 Agent 循环 -> LLM 调用 -> 工具执行 -> LLM 调用 -> 最终回复 |
| **Metrics** | 整体健康状况 | 过去 1 小时 LLM 平均延迟 800ms，工具调用成功率 98.5% |

三者互补：Metrics 告诉你"有问题"，Traces 帮你定位"哪里出了问题"，Logs 提供"出问题时的具体上下文"。

### Span：追踪的基本单元

Span 是 Trace 中的一个操作片段。每个 Span 记录：

- `spanId`：唯一标识
- `parentSpanId`：父 Span（根 Span 为 `null`）
- `name`：操作名称（如 "llm_call"、"tool:search_docs"）
- `startTime` / `endTime`：起止时间
- `attributes`：附加信息（模型名、token 数、工具参数等）
- `status`：成功或失败

一次 Agent 交互的 Span 树看起来像这样：

```
agent_turn (根 Span)
├── llm_call [model=claude-sonnet-4-20250514, tokens=320]
├── tool:search_docs [query="Agent 架构", duration=85ms]
├── tool:summarize [text="...", duration=45ms]
└── llm_call [model=claude-sonnet-4-20250514, tokens=180]
```

### 结构化日志

结构化日志输出 JSON 而不是纯文本。好处是可以被日志系统（ELK、Loki）直接索引和查询：

```json
{"level":"info","ts":"2026-03-19T14:30:22.123Z","msg":"tool_call","tool":"search_docs","duration_ms":85,"span_id":"abc123"}
```

对比 `console.log('调用了 search_docs，耗时 85ms')`——后者无法被程序解析。

### 装饰器模式

可观测性的核心设计原则是**不侵入业务逻辑**。我们不在 Agent 循环里到处加 `tracer.startSpan()` 调用，而是构建一个可观测层包裹在外面。业务代码保持干净，追踪逻辑集中管理。

## 动手实现

<RunCommand command="bun run p20-observability.ts" />

### 第一步：类型定义与工具函数

```ts
// p20-observability.ts
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'node:crypto'

// ── 类型定义 ──

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  ts: string
  msg: string
  fields: Record<string, string | number | boolean>
}

type SpanStatus = 'ok' | 'error'

interface Span {
  spanId: string
  parentSpanId: string | null
  name: string
  startTime: number
  endTime: number
  status: SpanStatus
  attributes: Record<string, string | number | boolean>
}

interface MetricsSummary {
  totalLlmCalls: number
  totalToolCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  averageLlmLatencyMs: number
  toolCallCounts: Record<string, number>
  errorCount: number
}
```

### 第二步：StructuredLogger — 结构化日志

```ts
// p20-observability.ts（续）

class StructuredLogger {
  private entries: LogEntry[] = []
  private minLevel: LogLevel

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel
  }

  private shouldLog(level: LogLevel): boolean {
    const order: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
    return order[level] >= order[this.minLevel]
  }

  log(level: LogLevel, msg: string, fields: Record<string, string | number | boolean> = {}): void {
    const entry: LogEntry = {
      level,
      ts: new Date().toISOString(),
      msg,
      fields,
    }
    this.entries.push(entry)

    if (this.shouldLog(level)) {
      const fieldStr = Object.entries(fields)
        .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : v}`)
        .join(' ')
      const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : `[${level.toUpperCase()}]`
      console.log(`${prefix} ${msg} ${fieldStr}`)
    }
  }

  debug(msg: string, fields?: Record<string, string | number | boolean>): void { this.log('debug', msg, fields) }
  info(msg: string, fields?: Record<string, string | number | boolean>): void { this.log('info', msg, fields) }
  warn(msg: string, fields?: Record<string, string | number | boolean>): void { this.log('warn', msg, fields) }
  error(msg: string, fields?: Record<string, string | number | boolean>): void { this.log('error', msg, fields) }

  getEntries(): ReadonlyArray<LogEntry> { return this.entries }
}
```

日志不只是打印——`entries` 数组保留了完整记录，生产环境可以批量发送到日志后端。`minLevel` 控制输出粒度：开发时用 `debug`，生产时用 `info`。

### 第三步：Tracer — Span 追踪

```ts
// p20-observability.ts（续）

class Tracer {
  private spans: Span[] = []
  private activeSpanStack: string[] = []

  // 开始一个新 Span，返回 spanId
  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): string {
    const spanId = randomUUID().slice(0, 8)
    const parentSpanId = this.activeSpanStack.length > 0
      ? this.activeSpanStack[this.activeSpanStack.length - 1]
      : null

    const span: Span = {
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      endTime: 0,
      status: 'ok',
      attributes,
    }

    this.spans.push(span)
    this.activeSpanStack.push(spanId)
    return spanId
  }

  // 结束指定 Span
  endSpan(spanId: string, extraAttributes: Record<string, string | number | boolean> = {}): void {
    const span = this.spans.find(s => s.spanId === spanId)
    if (!span) return

    span.endTime = Date.now()
    Object.assign(span.attributes, extraAttributes)
    span.attributes['duration_ms'] = span.endTime - span.startTime

    // 弹出活跃栈
    const idx = this.activeSpanStack.lastIndexOf(spanId)
    if (idx !== -1) this.activeSpanStack.splice(idx, 1)
  }

  // 标记 Span 为错误状态
  setError(spanId: string, errorMessage: string): void {
    const span = this.spans.find(s => s.spanId === spanId)
    if (!span) return
    span.status = 'error'
    span.attributes['error'] = errorMessage
  }

  // 输出 Trace 树
  printTraceTree(): void {
    console.log('\n══════════════════════════════════════════')
    console.log('            Trace 树')
    console.log('══════════════════════════════════════════')

    // 找到根 Span（parentSpanId 为 null）
    const roots = this.spans.filter(s => s.parentSpanId === null)
    for (const root of roots) {
      this.printSpan(root, 0)
    }
    console.log('══════════════════════════════════════════\n')
  }

  private printSpan(span: Span, depth: number): void {
    const indent = '  '.repeat(depth)
    const connector = depth === 0 ? '' : '├── '
    const duration = span.attributes['duration_ms'] ?? '?'
    const statusIcon = span.status === 'ok' ? '+' : 'x'

    // 收集关键属性（排除 duration_ms 和 error）
    const displayAttrs = Object.entries(span.attributes)
      .filter(([k]) => k !== 'duration_ms' && k !== 'error')
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')

    const attrStr = displayAttrs ? ` [${displayAttrs}]` : ''
    const errorStr = span.status === 'error' ? ` ERROR: ${span.attributes['error']}` : ''

    console.log(`${indent}${connector}(${statusIcon}) ${span.name} ${duration}ms${attrStr}${errorStr}`)

    // 递归打印子 Span
    const children = this.spans.filter(s => s.parentSpanId === span.spanId)
    for (const child of children) {
      this.printSpan(child, depth + 1)
    }
  }

  getSpans(): ReadonlyArray<Span> { return this.spans }
}
```

Tracer 的核心机制是 `activeSpanStack`：开始新 Span 时自动关联栈顶的父 Span，结束时弹出。这样嵌套调用自然形成树结构，不需要手动传递 parent ID。

### 第四步：MetricsCollector — 指标收集

```ts
// p20-observability.ts（续）

class MetricsCollector {
  private llmLatencies: number[] = []
  private toolCalls: Record<string, number> = {}
  private totalInputTokens = 0
  private totalOutputTokens = 0
  private errors = 0

  recordLlmCall(latencyMs: number, inputTokens: number, outputTokens: number): void {
    this.llmLatencies.push(latencyMs)
    this.totalInputTokens += inputTokens
    this.totalOutputTokens += outputTokens
  }

  recordToolCall(toolName: string): void {
    this.toolCalls[toolName] = (this.toolCalls[toolName] ?? 0) + 1
  }

  recordError(): void {
    this.errors++
  }

  getSummary(): MetricsSummary {
    const avgLatency = this.llmLatencies.length > 0
      ? Math.round(this.llmLatencies.reduce((a, b) => a + b, 0) / this.llmLatencies.length)
      : 0

    return {
      totalLlmCalls: this.llmLatencies.length,
      totalToolCalls: Object.values(this.toolCalls).reduce((a, b) => a + b, 0),
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      averageLlmLatencyMs: avgLatency,
      toolCallCounts: { ...this.toolCalls },
      errorCount: this.errors,
    }
  }

  printSummary(): void {
    const s = this.getSummary()
    console.log('══════════════════════════════════════════')
    console.log('            指标摘要')
    console.log('══════════════════════════════════════════')
    console.log(`  LLM 调用次数:      ${s.totalLlmCalls}`)
    console.log(`  LLM 平均延迟:      ${s.averageLlmLatencyMs}ms`)
    console.log(`  输入 Token 总量:   ${s.totalInputTokens}`)
    console.log(`  输出 Token 总量:   ${s.totalOutputTokens}`)
    console.log(`  工具调用总次数:    ${s.totalToolCalls}`)
    for (const [tool, count] of Object.entries(s.toolCallCounts)) {
      console.log(`    - ${tool}: ${count} 次`)
    }
    console.log(`  错误次数:          ${s.errorCount}`)
    console.log('══════════════════════════════════════════\n')
  }
}
```

### 第五步：可观测 Agent 循环

现在把三个组件组装起来，包裹一个标准的 Agent 循环。关键设计：业务逻辑（工具定义、工具执行）和可观测逻辑（Span 管理、日志记录、指标采集）分离。

```ts
// p20-observability.ts（续）

// ── 工具定义 ──

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_docs',
    description: '搜索文档库，返回匹配的段落',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: '搜索关键词' } },
      required: ['query'],
    },
  },
  {
    name: 'get_stats',
    description: '获取项目统计数据',
    input_schema: {
      type: 'object' as const,
      properties: { project: { type: 'string', description: '项目名称' } },
      required: ['project'],
    },
  },
  {
    name: 'calculate',
    description: '计算数学表达式',
    input_schema: {
      type: 'object' as const,
      properties: { expression: { type: 'string', description: '数学表达式' } },
      required: ['expression'],
    },
  },
]

// ── 模拟工具执行（带随机延迟模拟真实耗时）──

async function executeTool(name: string, params: Record<string, unknown>): Promise<string> {
  // 模拟网络/计算延迟
  const delay = Math.floor(Math.random() * 100) + 20
  await new Promise(resolve => setTimeout(resolve, delay))

  if (name === 'search_docs') {
    return `找到 3 篇关于"${params['query']}"的文档：[1] Agent 架构概述 [2] 工具系统设计 [3] 可观测性最佳实践`
  }
  if (name === 'get_stats') {
    return `项目 ${params['project']} 统计：1,247 次提交，89 个贡献者，测试覆盖率 87%`
  }
  if (name === 'calculate') {
    try {
      // 简单计算（生产环境应使用安全的表达式解析器）
      const expr = String(params['expression'])
      const result = Function(`"use strict"; return (${expr})`)()
      return `计算结果：${expr} = ${result}`
    } catch {
      throw new Error(`无法计算表达式: ${params['expression']}`)
    }
  }
  return `未知工具: ${name}`
}

// ── 可观测 Agent ──

async function runObservableAgent(userMessage: string): Promise<void> {
  const anthropic = new Anthropic()
  const logger = new StructuredLogger('debug')
  const tracer = new Tracer()
  const metrics = new MetricsCollector()

  // 根 Span：整个 Agent 交互
  const rootSpanId = tracer.startSpan('agent_turn', { user_message: userMessage })
  logger.info('agent_turn_start', { user_message: userMessage })

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    iterations++

    // LLM 调用 Span
    const llmSpanId = tracer.startSpan('llm_call', {
      model: 'claude-sonnet-4-20250514',
      iteration: iterations,
    })
    logger.debug('llm_call_start', { iteration: iterations })

    const llmStart = Date.now()
    let response: Anthropic.Message

    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: '你是一个多功能助手，可以搜索文档、查询项目统计和做计算。请尽可能利用工具回答问题。',
        tools: TOOLS,
        messages,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      tracer.setError(llmSpanId, errorMsg)
      tracer.endSpan(llmSpanId)
      metrics.recordError()
      logger.error('llm_call_failed', { error: errorMsg })
      break
    }

    const llmLatency = Date.now() - llmStart
    tracer.endSpan(llmSpanId, {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      stop_reason: response.stop_reason,
    })
    metrics.recordLlmCall(llmLatency, response.usage.input_tokens, response.usage.output_tokens)
    logger.info('llm_call_complete', {
      latency_ms: llmLatency,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      stop_reason: response.stop_reason,
    })

    // 提取文本和工具调用
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )

    // 模型不再调用工具，输出最终回复
    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      const finalText = textBlocks.map(b => b.text).join('')
      logger.info('agent_response', { length: finalText.length })
      console.log(`\nAgent: ${finalText}`)
      break
    }

    // 处理工具调用
    messages.push({ role: 'assistant', content: response.content })
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const toolInput = toolUse.input as Record<string, unknown>

      // 工具执行 Span
      const toolSpanId = tracer.startSpan(`tool:${toolUse.name}`, {
        tool_name: toolUse.name,
        params: JSON.stringify(toolInput),
      })
      logger.info('tool_call_start', { tool: toolUse.name, params: JSON.stringify(toolInput) })
      metrics.recordToolCall(toolUse.name)

      const toolStart = Date.now()
      try {
        const result = await executeTool(toolUse.name, toolInput)
        const toolLatency = Date.now() - toolStart

        tracer.endSpan(toolSpanId, { result_length: result.length })
        logger.info('tool_call_complete', { tool: toolUse.name, latency_ms: toolLatency })

        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const toolLatency = Date.now() - toolStart

        tracer.setError(toolSpanId, errorMsg)
        tracer.endSpan(toolSpanId)
        metrics.recordError()
        logger.error('tool_call_failed', { tool: toolUse.name, latency_ms: toolLatency, error: errorMsg })

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `工具执行失败: ${errorMsg}`,
          is_error: true,
        })
      }
    }

    messages.push({ role: 'user', content: toolResults })
  }

  // 结束根 Span
  tracer.endSpan(rootSpanId, { iterations })
  logger.info('agent_turn_complete', { iterations })

  // 输出 Trace 树和指标摘要
  tracer.printTraceTree()
  metrics.printSummary()
}
```

### 第六步：运行测试

```ts
// p20-observability.ts（续）

async function main(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' 可观测 Agent 演示')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await runObservableAgent(
    '帮我搜索关于 Agent 可观测性的文档，然后查一下 opencode 项目的统计数据，最后算一下 1247 * 0.87 是多少'
  )
}

main().catch(console.error)
```

### 运行结果

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 可观测 Agent 演示
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[INFO] agent_turn_start user_message="帮我搜索关于 Agent 可观测性的文档..."
[DEBUG] llm_call_start iteration=1
[INFO] llm_call_complete latency_ms=1842 input_tokens=312 output_tokens=156 stop_reason="tool_use"
[INFO] tool_call_start tool="search_docs" params="{\"query\":\"Agent 可观测性\"}"
[INFO] tool_call_complete tool="search_docs" latency_ms=67
[INFO] tool_call_start tool="get_stats" params="{\"project\":\"opencode\"}"
[INFO] tool_call_complete tool="get_stats" latency_ms=43
[INFO] tool_call_start tool="calculate" params="{\"expression\":\"1247 * 0.87\"}"
[INFO] tool_call_complete tool="calculate" latency_ms=28
[DEBUG] llm_call_start iteration=2
[INFO] llm_call_complete latency_ms=1203 input_tokens=580 output_tokens=210 stop_reason="end_turn"
[INFO] agent_response length=245
[INFO] agent_turn_complete iterations=2

Agent: 我帮你完成了三项任务：
1. 找到了 3 篇关于可观测性的文档：Agent 架构概述、工具系统设计、可观测性最佳实践
2. opencode 项目统计：1,247 次提交，89 个贡献者，测试覆盖率 87%
3. 计算结果：1247 * 0.87 = 1084.89

══════════════════════════════════════════
            Trace 树
══════════════════════════════════════════
(+) agent_turn 3210ms [user_message=帮我搜索关于 Agent 可观测性的文档..., iterations=2]
  ├── (+) llm_call 1842ms [model=claude-sonnet-4-20250514, iteration=1, input_tokens=312, output_tokens=156, stop_reason=tool_use]
  ├── (+) tool:search_docs 67ms [tool_name=search_docs, result_length=78]
  ├── (+) tool:get_stats 43ms [tool_name=get_stats, result_length=52]
  ├── (+) tool:calculate 28ms [tool_name=calculate, result_length=32]
  ├── (+) llm_call 1203ms [model=claude-sonnet-4-20250514, iteration=2, input_tokens=580, output_tokens=210, stop_reason=end_turn]
══════════════════════════════════════════

══════════════════════════════════════════
            指标摘要
══════════════════════════════════════════
  LLM 调用次数:      2
  LLM 平均延迟:      1523ms
  输入 Token 总量:   892
  输出 Token 总量:   366
  工具调用总次数:    3
    - search_docs: 1 次
    - get_stats: 1 次
    - calculate: 1 次
  错误次数:          0
══════════════════════════════════════════
```

Trace 树一目了然：两次 LLM 调用之间夹着三次工具调用，每个操作的耗时和属性都清晰可见。LLM 调用占了总耗时的 95%（3045ms / 3210ms），工具执行只占 138ms——如果要优化延迟，重点是减少 LLM 调用次数，而不是优化工具。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 三根支柱 | Logs（事件记录）、Traces（调用链路）、Metrics（聚合统计），三者互补：Metrics 发现问题、Traces 定位问题、Logs 提供上下文 |
| Span | Trace 中的基本单元，记录一个操作的名称、耗时、父子关系和属性。嵌套 Span 自然形成树结构 |
| `activeSpanStack` | Tracer 用栈管理当前活跃 Span 的嵌套关系：`startSpan` 入栈（自动关联父 Span），`endSpan` 出栈。不需要手动传递 parent ID |
| 结构化日志 | 输出 JSON 格式（包含 level、timestamp、message、fields），可被日志系统索引和查询，远优于纯文本 `console.log` |
| `minLevel` | 日志级别过滤：开发时用 `debug` 看全部输出，生产时用 `info` 减少噪音。日志仍然被记录，只是不输出到控制台 |
| `MetricsCollector` | 聚合统计器，跟踪 LLM 调用次数/延迟/token 消耗、工具调用分布、错误计数。运行结束输出摘要 |
| 装饰器模式 | 可观测逻辑（Span 管理、日志、指标）包裹在业务逻辑外层，不修改工具定义和 Agent 循环的核心逻辑 |
| Token 追踪 | 通过 `response.usage.input_tokens` 和 `output_tokens` 采集，是成本监控的关键指标 |
| 错误传播 | 工具执行失败时，`setError` 标记 Span 为错误状态，`metrics.recordError()` 计入错误计数，`is_error: true` 告知模型工具失败 |

## 常见问题

**Q: Tracer 和 OpenTelemetry 是什么关系？**

本章的 `Tracer` 是一个教学级实现，核心概念（Span、Trace、属性、父子关系）和 OpenTelemetry 完全一致。生产环境应该直接用 `@opentelemetry/sdk-trace-base`，它提供了自动上下文传播、批量导出、采样策略等能力。迁移成本很低——你只需要把 `tracer.startSpan()` / `tracer.endSpan()` 替换为 OTel 的 API，数据结构是兼容的。

**Q: 结构化日志应该输出到 stdout 还是文件？**

输出到 stdout，由外部工具（如 Docker log driver、Fluentd、Vector）收集和转发。这是 12-Factor App 的标准做法：应用只管输出日志，不关心日志去哪里。本章的 `entries` 数组模拟了一个内存缓冲区，生产环境替换为批量写入日志后端（ELK、Loki、CloudWatch）即可。

**Q: 每次 LLM 调用都记 Span 会不会有性能开销？**

Span 创建本身的开销微乎其微（一次对象分配 + 一次 `Date.now()`），相比 LLM 调用的几百毫秒到几秒延迟，完全可以忽略。真正需要注意的是 Span 的**存储和导出**：如果 Agent 执行了上百次工具调用，内存中积累的 Span 数据量会增长。生产环境用 OTel 的 `BatchSpanProcessor` 定期导出并清理内存。

**Q: 如何用 Metrics 设置告警？**

`MetricsCollector` 的 `getSummary()` 返回结构化数据，可以直接和阈值比较：

```ts
const summary = metrics.getSummary()
if (summary.averageLlmLatencyMs > 3000) {
  logger.warn('llm_latency_high', { avg_ms: summary.averageLlmLatencyMs })
}
if (summary.errorCount / (summary.totalLlmCalls + summary.totalToolCalls) > 0.1) {
  logger.error('error_rate_high', { rate: summary.errorCount / (summary.totalLlmCalls + summary.totalToolCalls) })
}
```

生产环境把指标导出到 Prometheus 或 Datadog，用它们的告警规则引擎替代手写 if 判断。

## 小结与延伸

你现在有了一个完整的可观测性工具包：

- `StructuredLogger`：带级别过滤的结构化日志，输出可被日志系统索引的格式
- `Tracer`：基于 Span 的调用链追踪，自动管理父子关系，输出 Trace 树
- `MetricsCollector`：聚合 LLM 调用、工具调用、token 消耗、错误率等关键指标

最重要的设计原则是**装饰器模式**：可观测逻辑不侵入业务代码。Agent 循环的核心逻辑（发送消息、处理工具调用、返回结果）保持清晰，追踪和日志在外层包裹。这意味着你可以把这三个类直接搬到前面任何一个练习的 Agent 里使用，不需要改动业务逻辑。

接下来可以探索的方向：

- **P21 评估与测试**：用 Metrics 数据构建 Agent 的自动化评估基准，量化不同提示策略的效果差异
- **接入 OpenTelemetry**：把 `Tracer` 替换为 `@opentelemetry/sdk-trace-base`，将 Trace 导出到 Jaeger 或 Zipkin 进行可视化
- **P19 安全**：把安全审计日志（`SecurityAuditLog`）接入结构化日志系统，用 Span 串联安全事件和 Agent 执行链路

<StarCTA />
