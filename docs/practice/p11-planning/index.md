---
title: P11：Planning 机制 — Plan-and-Execute
description: 实现两阶段 Agent：先用 LLM 将目标分解为有序步骤列表，再逐步执行，支持步骤失败时重新规划
---

<ProjectCard
  title="你将构建：一个 Plan-and-Execute Agent，先规划后执行，支持失败重规划"
  difficulty="advanced"
  duration="60 min"
  :prerequisites="['P10']"
  :tags="['Planning', 'Plan-and-Execute', 'TypeScript', 'OpenAI SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup)。本章对应示例文件位于 `practice/` 目录，可直接按命令运行。

## 前置准备

开始本章前，请先确认：

- 已阅读 [实践环境准备](/practice/setup)
- 基础依赖已就绪：`openai`
- 环境变量已配置：`OPENAI_API_KEY`
- 建议先完成前置章节：`P10`
- 本章建议入口命令：`bun run p11-planning.ts`
- 示例文件位置：`practice/p11-planning.ts`

## 背景与目标

P10 实现了 ReAct Agent：每步先写 `Thought`，再选工具，再看结果，再想下一步。这是一种**边想边做**的模式。

它在短任务上够用，但面对复杂任务时有一个根本性的局限：**模型没有全局视图**。

举一个实际例子："调研 TypeScript 5.0 新特性并写一份简报"。ReAct 的做法是：

```
Thought: 我需要了解 TypeScript 5.0 新特性
Action: web_search
...
Thought: 现在我要整理一下
Action: ...
```

每步都是局部最优的，但模型没有事先想清楚整体要做哪几件事。结果是：容易遗漏步骤、重复搜索、到最后才发现缺少关键信息需要回头补。

**Plan-and-Execute** 把任务拆成两个明确的阶段：

1. **规划阶段**：用 LLM 将目标一次性分解为有序步骤列表（全局视图）
2. **执行阶段**：按步骤逐一执行，每步可以调用工具，步骤间通过上下文传递结果

这和人类处理复杂任务的方式一致：先写提纲，再逐条展开。

**本章目标**：

1. 理解 Plan-and-Execute 与 ReAct 的本质区别
2. 实现 `Planner` 类：将目标转化为 JSON 步骤列表
3. 实现 `Executor` 类：逐步执行，通过上下文传递中间结果
4. 实现重新规划：步骤失败时反馈给规划器，更新剩余计划

## 核心概念

### Plan-and-Execute vs ReAct

两者并非替代关系，而是适用场景不同：

| 维度 | ReAct | Plan-and-Execute |
|------|-------|-----------------|
| 决策视角 | 局部（单步） | 全局（完整计划） |
| 适用场景 | 短任务、探索性任务 | 复杂任务、有明确子目标 |
| 灵活性 | 高（随时调整方向） | 中（计划可修订） |
| 可预测性 | 低（不知道会走多少步） | 高（步骤数提前确定） |
| 调试难度 | 较高（不知道下一步方向） | 较低（计划可审查） |

实际产品里两者经常组合：外层用 Planning 确定整体结构，内层每个步骤用 ReAct 执行。

### 规划阶段：结构化输出

规划器的核心是让 LLM 输出**结构化的步骤列表**，而不是自然语言。

最直接的做法是在 prompt 里要求 JSON 格式，然后解析。主流模型（如 GPT-4o、Claude）在格式遵从上表现稳定，只要 prompt 写清楚，JSON 输出的可靠性很高：

```
你是一个任务规划器。将目标分解为 3-6 个有序步骤。
必须以合法 JSON 数组输出，格式：
[
  {"id": "step_1", "description": "..."},
  {"id": "step_2", "description": "..."}
]
不要输出 JSON 以外的任何内容。
```

### 步骤依赖与上下文传递

执行阶段的关键问题是：**步骤之间如何共享信息**？

比如步骤 1 搜索到了 TypeScript 5.0 的特性列表，步骤 2 需要在此基础上整理，步骤 3 需要用步骤 2 的整理结果来写报告。

最简单的实现是维护一个**累积上下文字符串**，每步执行完后把结果追加进去：

```
[步骤1结果]
搜索到：Decorators, const type parameters...

[步骤2结果]
整理后：1. 装饰器正式标准化...

[步骤3结果]
报告：...
```

执行每个步骤时，把完整的上下文一并传给 LLM，让它基于前序结果继续工作。

### 重新规划

步骤失败是常见场景：工具调用超时、返回空结果、模型输出无法解析等。

重新规划的逻辑是：

1. 标记失败步骤的状态为 `failed`
2. 把失败信息（步骤描述 + 错误信息）告知规划器
3. 规划器根据已完成的步骤和失败信息，返回新的**剩余步骤列表**
4. 用新列表替换原有的 pending 步骤

注意重新规划的输入必须包含**已完成步骤的摘要**，否则规划器不知道哪些事情已经做了，会产生重复步骤。

## 动手实现

<RunCommand command="bun run p11-planning.ts" :verified="true" />

### 运行与验证

- 先按前置准备完成依赖和环境变量配置
- 执行上面的推荐入口命令
- 将输出与下文的“运行结果”或章节描述对照，确认主链路已经跑通
- 如果遇到命令、依赖、环境变量或样例输入问题，先回到 [实践环境准备](/practice/setup) 排查



### 第一步：定义数据结构

```ts
// p11-planning.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

// 步骤状态机：pending -> running -> done / failed
interface PlanStep {
  id: string
  description: string
  tool?: string
  status: 'pending' | 'running' | 'done' | 'failed'
  result?: string
}
```

`PlanStep` 是贯穿整个系统的核心数据结构。`tool` 字段是可选的——有些步骤需要调用工具（搜索、文件操作），有些步骤可以直接由 LLM 完成（分析、整理、写作）。

### 第二步：工具实现

```ts
// 工具函数类型
type ToolFunction = (input: Record<string, string>) => Promise<string>

// 模拟文件搜索
async function file_search(input: Record<string, string>): Promise<string> {
  const query = input['query'] ?? ''
  await new Promise(r => setTimeout(r, 100)) // 模拟延迟
  const fakeResults: Record<string, string> = {
    typescript: '找到文件：typescript-5.0-release-notes.md, ts-changelog.md',
    report: '找到文件：report-template.md, sample-report.md',
  }
  for (const [key, value] of Object.entries(fakeResults)) {
    if (query.toLowerCase().includes(key)) return value
  }
  return `未找到与"${query}"相关的文件`
}

// 模拟网络搜索
async function web_search(input: Record<string, string>): Promise<string> {
  const query = input['query'] ?? ''
  await new Promise(r => setTimeout(r, 150)) // 模拟延迟
  const fakeResults: Record<string, string> = {
    'typescript 5': `TypeScript 5.0 主要新特性：
1. Decorators（装饰器）正式进入标准（Stage 3）
2. const type parameters：泛型参数支持 const 修饰
3. 多个配置文件继承（extends 支持数组）
4. bundler 模块解析模式
5. 枚举和命名空间合并改进
6. --verbatimModuleSyntax 标志`,
    'const type parameters': 'const type parameters 允许在推断泛型时保留字面量类型，无需显式写 as const',
    decorators: 'TypeScript 5.0 Decorators 符合 TC39 Stage 3 提案，与旧版 experimentalDecorators 不兼容',
  }
  for (const [key, value] of Object.entries(fakeResults)) {
    if (query.toLowerCase().includes(key)) return value
  }
  return `搜索"${query}"：暂无相关结果`
}

// 模拟写入文件
async function write_report(input: Record<string, string>): Promise<string> {
  const filename = input['filename'] ?? 'report.md'
  const content = input['content'] ?? ''
  await new Promise(r => setTimeout(r, 80)) // 模拟写入延迟
  // 实际项目中这里会写磁盘，这里只打印前 100 字
  const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '')
  return `已写入文件 ${filename}（${content.length} 字符）\n预览：${preview}`
}

const toolRegistry: Record<string, ToolFunction> = {
  file_search,
  web_search,
  write_report,
}

// 从文本中提取第一个完整的 JSON 对象（处理大括号嵌套）
function extractJsonBlock(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return null
}
```

### 第三步：Planner 类

```ts
class Planner {
  // 将目标分解为步骤列表
  async createPlan(goal: string): Promise<PlanStep[]> {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `你是一个任务规划器。将用户目标分解为 3-6 个有序的、可独立执行的步骤。

要求：
- 步骤要具体，每步只做一件事
- 步骤之间有明确的依赖顺序
- 必须以合法 JSON 数组输出，不要输出任何其他内容
- 格式如下：
[
  {"id": "step_1", "description": "步骤描述"},
  {"id": "step_2", "description": "步骤描述"}
]`,
        },
        { role: 'user', content: `目标：${goal}` },
      ],
    })

    const text = response.choices[0].message.content ?? ''

    return this.parseSteps(text)
  }

  // 步骤失败后，根据已完成情况和失败信息重新规划剩余步骤
  async revisePlan(
    completedSteps: PlanStep[],
    failedStep: PlanStep,
    error: string,
  ): Promise<PlanStep[]> {
    const completedSummary = completedSteps
      .filter(s => s.status === 'done')
      .map(s => `- ${s.description}：${(s.result ?? '').slice(0, 80)}`)
      .join('\n')

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `你是一个任务规划器。任务执行过程中某个步骤失败了，你需要重新规划剩余步骤。

要求：
- 不要重复已完成的步骤
- 考虑失败原因，调整策略
- 必须以合法 JSON 数组输出，不要输出任何其他内容
- 格式如下：
[
  {"id": "step_revised_1", "description": "步骤描述"},
  {"id": "step_revised_2", "description": "步骤描述"}
]`,
        },
        {
          role: 'user',
          content: `已完成的步骤：
${completedSummary || '无'}

失败步骤：${failedStep.description}
失败原因：${error}

请规划剩余需要执行的步骤（不含已完成的）。`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''

    return this.parseSteps(text)
  }

  // 解析 LLM 输出的 JSON 步骤列表
  private parseSteps(text: string): PlanStep[] {
    // 提取 JSON 数组（处理模型可能输出的额外文字）
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.warn('[Planner] 无法找到 JSON 数组，原始输出：', text.slice(0, 200))
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      console.warn('[Planner] JSON 解析失败：', jsonMatch[0].slice(0, 200))
      return []
    }

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is { id: string; description: string } => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>)['id'] === 'string' &&
          typeof (item as Record<string, unknown>)['description'] === 'string'
        )
      })
      .map(item => ({
        id: item.id,
        description: item.description,
        status: 'pending' as const,
      }))
  }
}
```

### 第四步：Executor 类

```ts
class Executor {
  // 执行单个步骤，context 包含前序步骤的累积结果
  async executeStep(step: PlanStep, context: string): Promise<string> {
    const systemPrompt = `你是一个任务执行器。根据步骤描述完成具体任务。

${
  Object.keys(toolRegistry).length > 0
    ? `可用工具（如需要，在回复中以 TOOL_CALL: 开头，格式如下）：
TOOL_CALL: {"tool": "工具名", "input": {"参数名": "参数值"}}

可用工具列表：
- file_search：搜索本地文件，参数：{"query": "搜索词"}
- web_search：搜索网络信息，参数：{"query": "搜索词"}
- write_report：写入文件，参数：{"filename": "文件名", "content": "内容"}

如果不需要工具，直接输出执行结果即可。`
    : '直接输出执行结果。'
}

注意：
- 只完成当前步骤要求的任务
- 输出要具体、完整，供后续步骤使用`

    const userContent = `${context ? `前序步骤结果：\n${context}\n\n` : ''}当前步骤：${step.description}`

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })

    const text = response.choices[0].message.content ?? ''

    // 检查是否需要调用工具
    const marker = 'TOOL_CALL:'
    const markerIndex = text.indexOf(marker)
    if (markerIndex !== -1) {
      const jsonStr = extractJsonBlock(text.slice(markerIndex + marker.length))
      if (!jsonStr) {
        return `[工具调用解析失败]\n模型原始输出：${text}`
      }
      return this.handleToolCall(jsonStr, text)
    }

    return text
  }

  private async handleToolCall(jsonStr: string, fullText: string): Promise<string> {
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return `[工具调用解析失败]\n模型原始输出：${fullText}`
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>)['tool'] !== 'string'
    ) {
      return `[工具调用格式错误]\n原始：${jsonStr}`
    }

    const { tool, input } = parsed as { tool: string; input: Record<string, string> }
    const toolFn = toolRegistry[tool]

    if (!toolFn) {
      return `[未知工具: ${tool}]，可用工具：${Object.keys(toolRegistry).join(', ')}`
    }

    try {
      const result = await toolFn(input ?? {})
      return result
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return `[工具 ${tool} 执行失败]: ${errMsg}`
    }
  }
}
```

### 第五步：PlanAndExecuteAgent 主流程

```ts
class PlanAndExecuteAgent {
  private planner: Planner
  private executor: Executor
  private maxRevisions: number

  constructor(maxRevisions = 2) {
    this.planner = new Planner()
    this.executor = new Executor()
    this.maxRevisions = maxRevisions
  }

  async run(goal: string): Promise<void> {
    console.log(`目标: ${goal}\n`)

    // 阶段1：规划
    console.log('[规划中...]')
    let steps = await this.planner.createPlan(goal)

    if (steps.length === 0) {
      console.log('[规划失败] 无法生成有效步骤，退出。')
      return
    }

    console.log('计划:')
    steps.forEach(s => {
      console.log(`  ${s.id}: ${s.description}`)
    })
    console.log('')

    // 阶段2：逐步执行
    let context = ''
    let revisionCount = 0

    let i = 0
    while (i < steps.length) {
      const step = steps[i]
      step.status = 'running'

      console.log(`[执行 ${step.id}: ${step.description}]`)

      try {
        const result = await this.executor.executeStep(step, context)
        step.status = 'done'
        step.result = result

        // 把结果追加到累积上下文
        context += `\n[${step.id} 结果]\n${result}\n`

        console.log(`结果: ${result.slice(0, 120)}${result.length > 120 ? '...' : ''}`)
        console.log('')

        i++
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        step.status = 'failed'

        console.log(`[步骤失败] ${step.description}`)
        console.log(`错误: ${errMsg}`)

        if (revisionCount >= this.maxRevisions) {
          console.log(`[已达最大重规划次数 ${this.maxRevisions}，停止执行]`)
          break
        }

        // 重新规划剩余步骤
        console.log('\n[重新规划中...]')
        revisionCount++

        const revisedSteps = await this.planner.revisePlan(steps, step, errMsg)

        if (revisedSteps.length === 0) {
          console.log('[重规划失败] 无法生成新步骤，停止执行。')
          break
        }

        console.log('修订后的剩余步骤:')
        revisedSteps.forEach(s => console.log(`  ${s.id}: ${s.description}`))
        console.log('')

        // 用修订步骤替换剩余的 pending 步骤
        steps = [...steps.slice(0, i + 1), ...revisedSteps]
        i++ // 跳过失败步骤，从修订步骤开始
      }
    }

    // 输出执行摘要
    const doneCount = steps.filter(s => s.status === 'done').length
    const failedCount = steps.filter(s => s.status === 'failed').length

    console.log('---')
    console.log(`执行完成。成功: ${doneCount} 步，失败: ${failedCount} 步`)

    if (doneCount > 0 && failedCount === 0) {
      console.log('\n任务完成!')
    }
  }
}

// 运行示例
const agent = new PlanAndExecuteAgent()
await agent.run('调研 TypeScript 5.0 新特性并写一份简报')
```

### 运行结果

```
目标: 调研 TypeScript 5.0 新特性并写一份简报

[规划中...]
计划:
  step_1: 搜索 TypeScript 5.0 新特性信息
  step_2: 整理关键特性列表
  step_3: 撰写简报文档

[执行 step_1: 搜索 TypeScript 5.0 新特性信息]
结果: TypeScript 5.0 主要新特性：
1. Decorators（装饰器）正式进入标准（Stage 3）
2. const type parameters：泛型参数支持 const 修饰
3. 多个配置文件继承（extends 支持数组）
4. bundler 模块解析模式
5. 枚举和命名空间合并改进
6. --verbatimModuleSyntax 标志

[执行 step_2: 整理关键特性列表]
结果: TypeScript 5.0 关键特性整理：

**核心语言特性**
1. Decorators（装饰器）：符合 TC39 Stage 3 标准，取代 experimentalDecorators
2. const type parameters：推断泛型时保留字面量类型，无需 as const

**工程化改进**
3. extends 支持数组：一个 tsconfig 可以继承多个基础配置
4. bundler 模块解析：专为打包器场景设计，替代 node16/nodenext

**其他**
5. 枚举和命名空间合并改进
6. --verbatimModuleSyntax：强制显式 import type，避免副作用...

[执行 step_3: 撰写简报文档]
结果: 已写入文件 typescript-5.0-brief.md（486 字符）
预览：# TypeScript 5.0 新特性简报

## 概述
TypeScript 5.0 于 2023 年 3 月正式发布，带来了多项重要的语言特性和工程化改进...

---
执行完成。成功: 3 步，失败: 0 步

任务完成!
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 规划与执行分离 | `Planner` 只负责分解步骤，`Executor` 只负责执行，职责清晰 |
| JSON 结构化输出 | 规划结果要求 JSON 格式，用正则提取后解析，比纯文本解析可靠 |
| `parseSteps` 防御性解析 | 用类型守卫（type guard）过滤格式不合法的步骤，避免运行时崩溃 |
| 累积上下文 | 每步结果追加到 `context` 字符串，执行下一步时完整传入，保证步骤间信息流通 |
| `TOOL_CALL:` 格式约定 | Executor 通过文本前缀约定触发工具调用，避免对 API 工具参数的依赖 |
| 失败重规划 | 步骤失败时调用 `revisePlan`，传入已完成步骤摘要，避免重复工作 |
| `maxRevisions` 保护 | 限制重规划次数，防止无限循环（步骤持续失败导致无限重规划） |
| 状态机 | `PlanStep.status` 的四态设计（pending / running / done / failed）便于调试和监控 |

## 常见问题

**Q: 规划结果不稳定（每次步骤数量和内容不同）怎么办？**

LLM 的规划结果本质上有随机性，temperature 越高越明显。几个改进方向：

1. 在 system prompt 里明确约束步骤数量（如"必须恰好输出 4 个步骤"）和步骤格式
2. 降低 `temperature`（OpenAI API 默认为 1.0，规划场景可以降到 0.3-0.5）
3. 对规划结果做结构化校验，不满足预期时重试（最多 2-3 次）
4. 如果任务类型固定，考虑使用**预定义模板**替代 LLM 规划，LLM 只负责填写参数

对于需要高度可预测结果的生产场景，人工定义步骤模板 + LLM 填充参数往往比纯 LLM 规划更稳定。

**Q: 步骤粒度多细合适？**

步骤粒度是 Planning 最难拿捏的设计决策。过粗和过细都有问题：

- **过粗**（3步完成一个大项目）：每步需要做太多事，执行器容易迷失方向，错误难以定位
- **过细**（20步完成一个简单任务）：上下文快速膨胀（每步结果都追加进去），后期步骤的 prompt 可能超出 context 限制

实践经验：
- 一个步骤的执行时间应该在 5-30 秒之间（对于需要 LLM 响应的步骤）
- 一个步骤的描述应该能用一句话说清楚且不产生歧义
- 步骤数控制在 5-10 个，超出时考虑分层规划（大步骤内部再规划子步骤）

**Q: 能并行执行步骤吗？**

可以，但需要在规划阶段明确标记哪些步骤没有依赖关系。一种做法是在 `PlanStep` 上增加 `dependsOn: string[]` 字段，让 LLM 在规划时输出依赖图，执行时用拓扑排序决定并行组。

不过并行执行会带来新问题：上下文合并（多个步骤的结果需要合并后才能传给依赖它们的下一步）和错误处理（一个并行步骤失败时其他步骤是否继续）。这是 P15 多 Agent 协作的话题，建议先把串行版本跑稳再考虑并行。

## 小结与延伸

你现在有了一个完整的 Plan-and-Execute Agent：

- `Planner.createPlan` 将目标一次性分解为有序步骤，建立全局视图
- `Executor.executeStep` 基于累积上下文逐步执行，步骤间信息流通
- `Planner.revisePlan` 在失败时重新规划剩余步骤，保持任务连续性
- `PlanAndExecuteAgent.run` 编排完整流程，包含状态跟踪和保护机制

Plan-and-Execute 解决了 ReAct 缺乏全局视图的问题，但它引入了新的挑战：规划质量决定了执行效果，而 LLM 规划并不总是最优的。

接下来可以探索的方向：

- **P12 Reflection**：执行完成后增加自我反思步骤，让 Agent 评估执行结果是否真正达成目标，必要时重新规划
- **P15 Multi-Agent**：让多个专门化的 Agent 分别负责不同类型的步骤，规划器分配任务而不是自己执行
- **P20 Observability**：把规划和执行的每个环节接入结构化日志，在生产环境中追踪 Agent 的决策链路

<StarCTA />
