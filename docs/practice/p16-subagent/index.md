---
title: P16：子 Agent 与任务分解
description: 将 Worker 升级为拥有独立工具和多轮循环的子 Agent，让编排器调度真正有"手脚"的执行者
---

<PracticeProjectGuide project-id="practice-p16-subagent" />

## 背景与目标

P15 的 Orchestrator-Worker 架构解决了"一个 Agent 做不了的事，多个 Agent 分头做"的问题。但回头看 P15 的 Worker 实现，你会发现一个本质限制：

**Worker 只是单次 LLM 调用，没有工具，没有循环。**

P15 的 `runWorker` 函数发一次请求、拿到文本、结束。Worker 只能"想"，不能"做"。如果子任务是"搜索三篇相关论文并总结"，Worker 没有 web_search 工具可用，只能凭自身知识硬编——这和你直接在一个 prompt 里问没有区别。

现实中的子任务往往需要多步执行：搜索 → 阅读 → 再搜索 → 总结。这要求 Worker 自身就是一个完整的 Agent，有自己的工具集、自己的 Agent 循环、自己的停止条件。

这就是子 Agent（Sub-Agent）的概念：**Orchestrator 分派的不再是一段文字指令，而是一个有手有脚的独立 Agent 实例**。每个子 Agent 可以调用工具多次、自主决定何时完成，最后把结果交还给 Orchestrator。

类比一下：P15 像一个项目经理给实习生布置作业，实习生只能口头回答；P16 的项目经理把任务交给有经验的工程师，每个工程师有自己的电脑、自己的开发工具，独立完成后交付成果。

**本章目标**：

1. 实现 `SubAgent` 类：拥有独立的工具集、system prompt 和完整的 Agent 循环
2. 让 Orchestrator 动态创建并调度多个异构子 Agent（不同工具集）
3. 实现超时控制和结果收集机制

## 核心概念

### 从 Worker 到 SubAgent：关键差异

P15 的 Worker 和本章的 SubAgent 本质区别在于是否拥有自己的工具循环：

| 维度 | P15 Worker | P16 SubAgent |
|------|-----------|-------------|
| LLM 调用次数 | 1 次 | 多次（循环直到完成） |
| 工具能力 | 无 | 有独立工具集 |
| 自主决策 | 无，被动回答 | 有，自行决定调用什么工具、循环几次 |
| 适合任务 | 纯分析、纯推理 | 需要信息获取、多步操作的任务 |
| 实现复杂度 | 一个函数调用 | 一个完整的 Agent 类 |

核心洞察是：**当子任务需要"做事"而不只是"回答"时，Worker 必须升级为 SubAgent**。

### 异构工具集

不同子 Agent 可以（也应该）拥有不同的工具集。一个负责"搜索资料"的子 Agent 需要 `web_search` 工具；一个负责"分析代码"的子 Agent 需要 `read_file` 工具。给每个子 Agent 只配备它需要的工具，好处有二：

1. **减少干扰**：工具越少，模型选择正确工具的概率越高
2. **安全隔离**：负责搜索的子 Agent 不应该有写文件的权限

```ts
// 搜索专家：只有搜索和总结工具
const researchTools = [webSearchTool, summarizeTool]

// 代码分析专家：只有读文件和分析工具
const codeTools = [readFileTool, analyzeCodeTool]
```

### 超时与安全退出

子 Agent 有自己的循环，这意味着它可能陷入死循环——反复调用工具却无法得出结论。生产环境必须有两层保护：

1. **最大循环次数**：子 Agent 执行超过 N 轮后强制停止，返回当前已有的结果
2. **总时间限制**：用 `Promise.race` 对每个子 Agent 施加时间上限

```ts
// 两层保护都不可少
const MAX_ITERATIONS = 10  // 防止无限循环
const TIMEOUT_MS = 30_000  // 防止单个子 Agent 卡住整个系统
```

## 动手实现

### 第一步：定义类型和模拟工具

我们用模拟工具来演示异构子 Agent。真实场景中这些工具会调用实际 API，但核心调度逻辑完全相同。

```ts
// p16-subagent.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

// ========== 类型定义 ==========

interface ToolDefinition {
  schema: OpenAI.ChatCompletionTool
  execute: (input: Record<string, string>) => Promise<string>
}

interface SubAgentConfig {
  name: string
  systemPrompt: string
  tools: ToolDefinition[]
  maxIterations: number
}

interface SubAgentResult {
  agentName: string
  output: string
  iterations: number
  toolCalls: string[]
}

interface SubTaskSpec {
  id: string
  title: string
  description: string
  agentType: 'research' | 'code'
}
```

### 第二步：定义两套工具

一套给"搜索专家"，一套给"代码分析专家"，互不重叠。

```ts
// p16-subagent.ts（续）

// ========== 搜索专家的工具集 ==========

const webSearchTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'web_search',
      description: '搜索网络获取相关信息，返回搜索结果摘要',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
        },
        required: ['query'],
      },
    },
  },
  execute: async (input) => {
    return `搜索 "${input.query}" 的结果：
1. 相关技术文章：深入理解 ${input.query} 的核心原理与最佳实践
2. 官方文档：${input.query} API 参考手册
3. 社区讨论：${input.query} 在生产环境中的常见问题与解决方案`
  },
}

const summarizeTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'summarize',
      description: '将一段文本压缩为结构化摘要',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '需要总结的文本' },
          focus: { type: 'string', description: '总结的侧重点' },
        },
        required: ['text'],
      },
    },
  },
  execute: async (input) => {
    const focus = input.focus ? `（侧重 ${input.focus}）` : ''
    return `摘要${focus}：${input.text.slice(0, 100)}...（已压缩为关键信息）`
  },
}

// ========== 代码分析专家的工具集 ==========

const readFileTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取指定路径的文件内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
        },
        required: ['path'],
      },
    },
  },
  execute: async (input) => {
    return `// 文件: ${input.path}
function processData(items: string[]) {
  return items.filter(Boolean).map((item) => item.trim())
}

export { processData }`
  },
}

const analyzeCodeTool: ToolDefinition = {
  schema: {
    type: 'function',
    function: {
      name: 'analyze_code',
      description: '对一段代码执行静态分析，返回问题列表',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: '要分析的代码' },
          dimension: {
            type: 'string',
            description: '分析维度：security | performance | quality',
          },
        },
        required: ['code', 'dimension'],
      },
    },
  },
  execute: async (input) => {
    return `[${input.dimension}] 分析完成：
- 发现 2 个潜在问题
- 建议：增加输入验证、添加错误处理
- 严重程度：中等`
  },
}
```

### 第三步：实现 SubAgent 类

这是本章的核心。每个 SubAgent 实例拥有独立的消息历史、工具集和 Agent 循环，调用工具直到任务完成或达到上限。

```ts
// p16-subagent.ts（续）

class SubAgent {
  private readonly config: SubAgentConfig
  private messages: OpenAI.ChatCompletionMessageParam[] = []
  private callLog: string[] = []
  private lastAssistantText = ''

  constructor(config: SubAgentConfig) {
    this.config = config
  }

  async run(task: string): Promise<SubAgentResult> {
    console.log(`  [${this.config.name}] 启动，任务: ${task.slice(0, 60)}...`)

    this.messages = [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: task },
    ]
    this.callLog = []
    this.lastAssistantText = ''
    const toolSchemas = this.config.tools.map((tool) => tool.schema)
    let iterations = 0

    while (iterations < this.config.maxIterations) {
      iterations += 1

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        tools: toolSchemas,
        messages: this.messages,
      })

      const message = response.choices[0].message
      this.lastAssistantText = message.content ?? ''

      const toolCalls = message.tool_calls ?? []

      // 没有工具调用 → Agent 认为任务完成
      if (response.choices[0].finish_reason === 'stop' || toolCalls.length === 0) {
        console.log(
          `  [${this.config.name}] 完成，${iterations} 轮，${this.callLog.length} 次工具调用`,
        )
        return {
          agentName: this.config.name,
          output: this.lastAssistantText,
          iterations,
          toolCalls: [...this.callLog],
        }
      }

      // 执行每个工具调用
      this.messages.push(message)

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue

        const toolDef = this.config.tools.find((tool) => {
          if (tool.schema.type === 'function') {
            return tool.schema.function.name === toolCall.function.name
          }
          return false
        })
        if (!toolDef) {
          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `错误：未知工具 ${toolCall.function.name}`,
          })
          continue
        }

        this.callLog.push(toolCall.function.name)
        console.log(`  [${this.config.name}] 调用工具: ${toolCall.function.name}`)

        const input = JSON.parse(toolCall.function.arguments) as Record<string, string>
        const result = await toolDef.execute(input)

        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
    }

    // 达到最大迭代次数，强制返回当前已有的结果
    console.log(
      `  [${this.config.name}] 达到最大迭代次数 (${this.config.maxIterations})，强制返回`,
    )

    return {
      agentName: this.config.name,
      output: this.lastAssistantText || '（子 Agent 未能在限定轮次内完成任务）',
      iterations: this.config.maxIterations,
      toolCalls: [...this.callLog],
    }
  }
}
```

关键设计点：

- `callLog` 记录所有工具调用，便于 Orchestrator 了解子 Agent 做了什么
- 达到 `maxIterations` 时不是抛错，而是返回当前已有的部分结果——有些信息总比没有强
- 每个 SubAgent 实例独立持有 `messages`，不同子 Agent 的对话互不干扰

### 第四步：Orchestrator 调度子 Agent

Orchestrator 根据子任务的 `agentType` 创建对应配置的 SubAgent 实例，并行启动。

```ts
// p16-subagent.ts（续）

// 类型守卫：验证子任务结构
function isSubTaskSpec(value: unknown): value is SubTaskSpec {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    typeof obj['description'] === 'string' &&
    (obj['agentType'] === 'research' || obj['agentType'] === 'code')
  )
}

function createSubAgent(task: SubTaskSpec): SubAgent {
  const configs: Record<SubTaskSpec['agentType'], SubAgentConfig> = {
    research: {
      name: `研究员-${task.id}`,
      systemPrompt: [
        '你是一名研究专家。你的任务是搜索和整理资料。',
        '工作流程：1) 用 web_search 搜索相关信息 2) 用 summarize 整理关键发现 3) 输出结构化的研究报告。',
        '务必至少搜索两次以确保信息全面，然后输出最终结论。',
      ].join('\n'),
      tools: [webSearchTool, summarizeTool],
      maxIterations: 8,
    },
    code: {
      name: `代码审查员-${task.id}`,
      systemPrompt: [
        '你是一名代码审查专家。你的任务是分析代码质量。',
        '工作流程：1) 用 read_file 读取目标代码 2) 用 analyze_code 从指定维度分析 3) 输出审查报告。',
        '报告格式：先列出发现的问题，再给出改进建议。',
      ].join('\n'),
      tools: [readFileTool, analyzeCodeTool],
      maxIterations: 6,
    },
  }

  return new SubAgent(configs[task.agentType])
}

// 带超时的子 Agent 执行
async function runWithTimeout(
  agent: SubAgent,
  task: string,
  timeoutMs: number,
): Promise<SubAgentResult> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('SubAgent 超时')), timeoutMs)
  })

  return Promise.race([agent.run(task), timeout])
}

// Orchestrator 主函数
async function orchestrate(userMessage: string): Promise<string> {
  console.log(`用户: ${userMessage}\n`)

  // 第一阶段：让 Orchestrator 拆解任务
  const planResponse = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          '你是一个任务编排器。分析用户请求，将其拆解为子任务列表。',
          '每个子任务必须包含 id、title、description 和 agentType。',
          'agentType 只能是 "research"（需要搜索资料）或 "code"（需要分析代码）。',
          '用 JSON 格式输出子任务数组，不要输出其他内容。',
          '格式：[{"id":"...","title":"...","description":"...","agentType":"research|code"}]',
        ].join('\n'),
      },
      { role: 'user', content: userMessage },
    ],
  })

  const planText = planResponse.choices[0].message.content ?? ''

  // 提取 JSON（容忍 markdown 代码块包裹）
  const jsonMatch = planText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return `编排器未能拆解任务。原始输出：${planText}`
  }

  let parsedTasks: unknown
  try {
    parsedTasks = JSON.parse(jsonMatch[0])
  } catch {
    return `编排器输出的 JSON 解析失败：${jsonMatch[0]}`
  }

  const tasks = Array.isArray(parsedTasks)
    ? parsedTasks.filter((task) => isSubTaskSpec(task))
    : []

  console.log(`[Orchestrator] 拆解为 ${tasks.length} 个子任务：`)
  tasks.forEach((task) => console.log(`  - [${task.agentType}] ${task.title}`))
  console.log('')

  // 第二阶段：并行启动子 Agent
  const TIMEOUT_MS = 60_000

  const settled = await Promise.allSettled(
    tasks.map((task) => {
      const agent = createSubAgent(task)
      return runWithTimeout(agent, task.description, TIMEOUT_MS)
    }),
  )

  // 收集结果
  const results: SubAgentResult[] = []
  const failures: Array<{ taskId: string; error: string }> = []

  for (let index = 0; index < settled.length; index += 1) {
    const outcome = settled[index]
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value)
    } else {
      failures.push({
        taskId: tasks[index]?.id ?? `unknown-${index}`,
        error: String(outcome.reason),
      })
    }
  }

  // 第三阶段：聚合结果
  const workerOutputs = results
    .map((result) =>
      [
        `### ${result.agentName}`,
        `工具调用: ${result.toolCalls.join(' → ') || '无'}`,
        `迭代次数: ${result.iterations}`,
        '',
        result.output,
      ].join('\n'),
    )
    .join('\n\n---\n\n')

  const failureReport =
    failures.length > 0
      ? `\n\n### 失败的子任务\n${failures.map((failure) => `- ${failure.taskId}: ${failure.error}`).join('\n')}`
      : ''

  const synthesisResponse = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          '你是一个报告聚合专家。将多个子 Agent 的输出整合为一份结构清晰的综合报告。提炼核心发现，去除重复，解决冲突。',
      },
      {
        role: 'user',
        content: `以下是各子 Agent 的执行结果：\n\n${workerOutputs}${failureReport}\n\n请整合为一份综合报告。`,
      },
    ],
  })

  return synthesisResponse.choices[0].message.content ?? ''
}
```

注意与 P15 的关键差异：

- P15 的 Worker 是单次 `chat.completions.create` 调用，这里的 SubAgent 有完整的 `while` 循环
- 使用 `Promise.allSettled` 而非 `Promise.all`——单个子 Agent 超时不会拖垮全局
- 结果中包含 `toolCalls` 和 `iterations`，Orchestrator 能看到每个子 Agent"做了什么"而不仅仅是"说了什么"

### 第五步：入口与测试

```ts
// p16-subagent.ts（续）

async function main(): Promise<void> {
  const answer = await orchestrate(
    '帮我调研 TypeScript 的装饰器（Decorator）特性：' +
    '1) 搜索装饰器的最新 TC39 提案状态和主流框架支持情况；' +
    '2) 分析 src/decorators.ts 文件中的装饰器实现是否有性能或安全问题。'
  )

  console.log('\n========== 综合报告 ==========\n')
  console.log(answer)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

### 运行结果

```
用户: 帮我调研 TypeScript 的装饰器（Decorator）特性...

[Orchestrator] 拆解为 2 个子任务：
  - [research] 装饰器 TC39 提案与框架支持调研
  - [code] 装饰器实现代码审查

  [研究员-tc39] 启动，任务: 搜索 TypeScript 装饰器的 TC39 提案状态...
  [代码审查员-code-review] 启动，任务: 读取并分析 src/decorators.ts...
  [研究员-tc39] 调用工具: web_search
  [代码审查员-code-review] 调用工具: read_file
  [研究员-tc39] 调用工具: web_search
  [代码审查员-code-review] 调用工具: analyze_code
  [研究员-tc39] 调用工具: summarize
  [代码审查员-code-review] 完成，3 轮，2 次工具调用
  [研究员-tc39] 完成，4 轮，3 次工具调用

========== 综合报告 ==========

## TypeScript 装饰器调研报告

### 1. TC39 提案现状
装饰器提案已进入 Stage 3，TypeScript 5.0+ 原生支持新语法...

### 2. 代码审查发现
src/decorators.ts 中存在 2 个中等问题：
- 缺少输入验证，可能导致运行时错误
- 建议添加错误边界处理...
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| SubAgent vs Worker | Worker 是单次 LLM 调用，SubAgent 是完整的 Agent 循环（工具 + 多轮对话） |
| 异构工具集 | 不同子 Agent 配备不同工具，减少干扰、提升安全隔离 |
| 最大迭代次数 | 防止子 Agent 陷入死循环，达到上限时返回部分结果而非报错 |
| 超时控制 | `Promise.race` 对每个子 Agent 施加时间上限，避免整个系统被拖住 |
| `Promise.allSettled` | 单个子 Agent 失败不影响其他子 Agent，Orchestrator 收到成功和失败的完整报告 |
| 工具调用日志 | SubAgent 记录调用了哪些工具，Orchestrator 能了解"过程"而非只看"结论" |
| 三阶段调度 | 拆解 → 并行执行 → 聚合，每个阶段职责清晰 |

## 常见问题

**Q: 子 Agent 的模型一定要比 Orchestrator 弱吗？**

不一定。P15 提到的"分层用模型"是成本优化策略，不是硬性要求。如果某个子任务特别复杂（比如需要深度推理的数学证明），你完全可以给它分配更强的模型。关键原则是**按任务难度选模型**，而不是按角色选。

```ts
// 可以在 SubAgentConfig 中指定模型
interface SubAgentConfig {
  name: string
  model: string  // 每个子 Agent 可以用不同模型
  systemPrompt: string
  tools: ToolDefinition[]
  maxIterations: number
}
```

**Q: 子 Agent 之间可以共享工具吗？**

可以，但要谨慎。共享工具意味着两个子 Agent 可能同时调用同一个有副作用的工具（比如写文件），导致竞态条件。如果工具是只读的（搜索、读文件），共享没问题；如果工具有副作用（写文件、发请求），要么加锁，要么给每个子 Agent 独立实例。

**Q: 子 Agent 执行到一半超时了，已经获取的中间结果怎么办？**

当前实现中，超时会直接 reject，中间结果丢失。生产环境的改进思路是让 SubAgent 在每轮循环后缓存中间状态：

```ts
class SubAgent {
  private partialResults: string[] = []

  async run(task: string): Promise<SubAgentResult> {
    // 每轮循环后保存中间文本
    // 超时时返回已有的 partialResults
  }
}
```

P4 的错误处理策略在这里可以结合使用——超时后用部分结果生成降级报告。

**Q: 递归子 Agent（子 Agent 再创建子 Agent）可行吗？**

技术上完全可行——SubAgent 的工具列表里可以包含一个 `dispatch_sub_agents` 工具。但实践中要非常小心：递归深度必须有硬性上限，否则成本和延迟会指数膨胀。除非任务本身有天然的递归结构（比如遍历树形目录），否则两层（Orchestrator → SubAgent）通常足够。

## 小结与延伸

你现在有了一个真正"有手有脚"的多 Agent 系统：

- SubAgent 类封装了完整的 Agent 循环，拥有独立的工具集和消息历史
- Orchestrator 动态拆解任务、创建异构子 Agent、并行调度
- 超时控制和 `Promise.allSettled` 确保系统鲁棒性
- 工具调用日志让 Orchestrator 能理解子 Agent 的执行过程

P15 → P16 的升级路径很清晰：Worker 从"只能说"变成"能说也能做"。这是构建复杂 AI 系统的关键一步——绝大多数生产级 Agent 框架（LangGraph、CrewAI、OpenAI Agents SDK）的子 Agent 都是这个模式。

下一章 **P17 Agent 间通信** 将解决另一个问题：目前子 Agent 之间完全隔离，如果子任务 B 的执行依赖子任务 A 的中间结果怎么办？我们会实现共享状态和消息传递机制，让子 Agent 从"各干各的"升级为"协作完成"。

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p16-subagent" />
<PracticeProjectActionPanel project-id="practice-p16-subagent" />
