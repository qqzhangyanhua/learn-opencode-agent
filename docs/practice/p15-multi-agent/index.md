---
title: P15：多 Agent 编排模式
description: Orchestrator-Worker 架构设计 — 一个编排器拆解任务，多个 Worker 并行执行，最终聚合结果
---

<ProjectCard
  title="你将构建：一个 Orchestrator-Worker 多 Agent 系统，支持任务拆解、并行执行与结果聚合"
  difficulty="advanced"
  duration="60 min"
  :prerequisites="['P1', 'P11']"
  :tags="['Multi-Agent', 'Orchestrator', 'Parallel', 'TypeScript', 'Anthropic SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup/)。如果本章里的 `RunCommand` 对应文件在仓库中还不存在，请先按正文步骤创建示例文件，再执行命令。

## 背景与目标

P1 到 P14 的所有 Agent 都是单体的：一个 Agent 实例从头到尾处理一个任务。这在任务可以线性分解时够用，但面对某些场景你会撞上天花板：

**一个 Agent 做不了的事，多个也做不了吗？**

举一个具体的例子：你要对一个开源项目做全面的代码审查，涉及安全性、性能、代码风格三个维度。单 Agent 的做法是在一次对话里依次检查三个维度，但每个维度都需要不同的 system prompt 和评审标准。塞在一个 prompt 里，维度之间会互相干扰——模型在思考安全问题时容易忽略性能细节，反之亦然。

更实际的限制是 **上下文窗口**。三个维度的审查结果可能各自占用数千 Token，单次对话的上下文很快被填满。

解决方案直觉上很自然：**拆成多个 Agent，各管一摊，最后汇总**。这就是多 Agent 编排。

2024 年以来，多 Agent 编排已经成为生产级 AI 应用的标准架构。Anthropic 的 Claude Code 内部使用 Orchestrator 分派子任务给不同的专家 Agent；OpenAI 的 Swarm 框架探索了 Agent 间的控制权移交；CrewAI、AutoGen 等框架把多 Agent 协作做成了开箱即用的 SDK。

**本章目标**：

1. 理解三种主流多 Agent 编排模式的适用场景
2. 实现 Orchestrator-Worker 架构：编排器拆解任务，Worker 并行执行
3. 实现结果聚合：将多个 Worker 的输出整合为最终回答

## 核心概念

### 三种编排模式

多 Agent 系统的编排方式可以归纳为三种基本模式：

| 模式 | 结构 | 适用场景 | 复杂度 |
|------|------|----------|--------|
| **Sequential（顺序链）** | A → B → C | 流水线，前一步的输出是下一步的输入 | 低 |
| **Parallel（并行扇出）** | A → [B, C, D] → A | 独立子任务，可以同时执行 | 中 |
| **Orchestrator-Worker** | O → [W1, W2, ...] → O | 编排器动态决定任务拆分和 Worker 分配 | 高 |

Sequential 最简单：Agent A 处理完交给 Agent B，B 处理完交给 Agent C。适合确定的流水线（比如"翻译 → 校对 → 排版"）。

Parallel 是 Sequential 的扩展：一个任务被拆成多个独立子任务，分别交给不同 Agent 并行执行，结果汇总。适合子任务之间没有依赖关系的场景（比如"同时检查安全、性能、风格"）。

Orchestrator-Worker 是最灵活的：编排器（Orchestrator）本身也是一个 LLM Agent，它动态决定怎么拆任务、分配给谁、执行几轮。适合任务结构事先不确定的场景。

本章实现 **Orchestrator-Worker** 模式，因为它包含了前两种模式的能力——如果编排器决定顺序执行，它就退化成 Sequential；如果决定并行执行，它就是 Parallel。

### Orchestrator 的职责

Orchestrator 不直接完成任何具体工作，它的职责是三件事：

1. **任务拆解**：接收用户的原始请求，将其分解为多个独立的子任务
2. **Worker 分配**：为每个子任务指定执行者（Worker），包括 Worker 的专业领域和 system prompt
3. **结果聚合**：收集所有 Worker 的输出，综合整理为最终回答

Orchestrator 通过工具调用来分派任务。我们给它注册一个 `dispatch_workers` 工具，输入是子任务列表，输出是所有 Worker 的执行结果。这样 Orchestrator 的决策过程对模型来说就是一次普通的工具调用。

### Worker 的设计

每个 Worker 是一个独立的 LLM 调用，有自己的 system prompt 和上下文。Worker 之间互不可见——Worker A 不知道 Worker B 的存在，也看不到 Worker B 的输出。这种隔离是刻意的：

- **避免干扰**：专注于自己的子任务，不被其他维度的信息分散注意力
- **并行友好**：没有依赖关系，可以用 `Promise.all` 同时执行
- **可替换**：每个 Worker 的实现可以独立调整，换 prompt、换模型，不影响其他 Worker

Worker 的 system prompt 需要高度聚焦。一个负责"安全审查"的 Worker 不应该评论代码风格，即使它看到了风格问题。范围越窄，输出质量越高。

### 任务拆解的结构化输出

让 Orchestrator 返回结构化的任务列表，而不是自由文本。我们用工具调用的 input schema 来约束输出格式：

```ts
// Orchestrator 调用 dispatch_workers 工具时的输入结构
interface DispatchInput {
  tasks: Array<{
    id: string           // 子任务标识，如 "security", "performance"
    title: string        // 子任务名称
    description: string  // 详细的执行指令
    expertise: string    // Worker 的专业领域（用于生成 system prompt）
  }>
}
```

用 `id` 而不是数组下标来标识子任务，因为聚合阶段需要按语义引用（"安全审查发现了……"），而不是按序号。

## 动手实现

<RunCommand command="bun run p15-multi-agent.ts" />

### 第一步：定义类型和配置

```ts
// p15-multi-agent.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// 子任务描述（Orchestrator 输出）
interface SubTask {
  id: string
  title: string
  description: string
  expertise: string
}

// Worker 执行结果
interface WorkerResult {
  taskId: string
  title: string
  output: string
}
```

### 第二步：实现 Worker

Worker 是一个纯函数：接收子任务描述，返回执行结果。每个 Worker 是一次独立的 LLM 调用，system prompt 根据 `expertise` 动态生成。

```ts
// p15-multi-agent.ts（续）

async function runWorker(task: SubTask): Promise<WorkerResult> {
  console.log(`[Worker:${task.id}] 开始执行: ${task.title}`)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: [
      `你是一位专注于「${task.expertise}」的专家。`,
      '请严格围绕分配给你的任务进行分析，不要涉及其他维度。',
      '输出格式：先给出核心结论（1-2句），再列出具体发现（要点列表）。',
    ].join('\n'),
    messages: [
      { role: 'user', content: task.description },
    ],
  })

  const output = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  console.log(`[Worker:${task.id}] 完成 (${output.length} chars)\n`)

  return {
    taskId: task.id,
    title: task.title,
    output,
  }
}
```

注意 Worker 用的是 `claude-sonnet-4-20250514` 而不是 Opus——Worker 执行的是聚焦子任务，Sonnet 的性价比更高。Orchestrator 需要更强的推理能力来做任务拆解，所以用更强的模型。这种**分层用模型**的策略在生产中非常常见。

### 第三步：实现 dispatch 工具

这个工具是 Orchestrator 和 Worker 之间的桥梁：接收 Orchestrator 拆解出的子任务列表，并行启动所有 Worker，收集结果后返回。

```ts
// p15-multi-agent.ts（续）

// dispatch_workers 工具的 input schema
const dispatchToolSchema: Anthropic.Tool = {
  name: 'dispatch_workers',
  description: '将任务分派给多个专家 Worker 并行执行。每个 Worker 独立工作，互不可见。执行完成后返回所有 Worker 的结果。',
  input_schema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '子任务唯一标识，如 "security"、"performance"',
            },
            title: {
              type: 'string',
              description: '子任务名称',
            },
            description: {
              type: 'string',
              description: '给 Worker 的详细执行指令，要包含足够的上下文',
            },
            expertise: {
              type: 'string',
              description: 'Worker 的专业领域，如 "安全审计"、"性能优化"',
            },
          },
          required: ['id', 'title', 'description', 'expertise'],
        },
        description: '要分派的子任务列表',
      },
    },
    required: ['tasks'],
  },
}

// 执行 dispatch：并行启动所有 Worker
async function executeDispatch(tasks: SubTask[]): Promise<string> {
  console.log(`\n[Orchestrator] 分派 ${tasks.length} 个子任务，并行执行...\n`)

  // Promise.all 并行执行所有 Worker
  const results = await Promise.all(tasks.map(runWorker))

  // 将结果格式化为文本，供 Orchestrator 聚合
  const formatted = results
    .map(r => [
      `### ${r.title} (${r.taskId})`,
      '',
      r.output,
    ].join('\n'))
    .join('\n\n---\n\n')

  return formatted
}
```

`Promise.all` 是关键——所有 Worker 的 LLM 调用同时发出，总耗时等于最慢的那个 Worker，而不是所有 Worker 耗时之和。如果有 3 个 Worker 各需要 3 秒，串行要 9 秒，并行只要 3 秒。

### 第四步：实现 Orchestrator 主循环

Orchestrator 本身也是一个 Agent 循环：发送用户请求，模型决定是否调用 `dispatch_workers`，调用后拿到结果再做聚合。

```ts
// p15-multi-agent.ts（续）

async function orchestrate(userMessage: string): Promise<string> {
  console.log(`用户: ${userMessage}\n`)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  const systemPrompt = [
    '你是一个任务编排器（Orchestrator）。你的职责是：',
    '1. 分析用户的请求，将其拆解为多个独立的子任务',
    '2. 使用 dispatch_workers 工具将子任务分派给专家 Worker',
    '3. 收到 Worker 的结果后，综合整理为一份完整、连贯的最终回答',
    '',
    '拆解原则：',
    '- 每个子任务应该是独立的，Worker 之间互不可见',
    '- 子任务的 description 要包含足够的上下文，Worker 只能看到自己的任务描述',
    '- 为每个子任务指定准确的 expertise，确保 Worker 聚焦于自己的专业领域',
    '- 如果任务不需要拆解（太简单），直接回答即可，不必强行分派',
    '',
    '聚合原则：',
    '- 不要简单拼接 Worker 的输出，要提炼和整合',
    '- 如果多个 Worker 的发现有冲突，指出分歧并给出你的判断',
    '- 最终回答应该是一份结构清晰的综合报告',
  ].join('\n')

  // Orchestrator 的 Agent 循环
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [dispatchToolSchema],
      messages,
    })

    // 检查是否有工具调用
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      // 模型完成了聚合，返回最终文本
      const finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
      return finalText
    }

    // 将 assistant 消息加入历史
    messages.push({ role: 'assistant', content: response.content })

    // 处理 dispatch_workers 工具调用
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === 'dispatch_workers') {
        const input = toolUse.input as { tasks: SubTask[] }
        const result = await executeDispatch(input.tasks)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        })
      }
    }

    messages.push({ role: 'user', content: toolResults })
  }
}
```

### 第五步：入口与测试

```ts
// p15-multi-agent.ts（续）

async function main(): Promise<void> {
  const codeToReview = `
function processUserData(data: any) {
  const result = eval(data.expression)

  const allUsers = []
  for (let i = 0; i < 1000000; i++) {
    allUsers.push(fetch('/api/user/' + i))
  }

  let output = ''
  for (const user of allUsers) {
    output = output + JSON.stringify(user) + '\\n'
  }

  return result + output
}
  `.trim()

  const answer = await orchestrate(
    `请对以下 TypeScript 代码进行全面审查，涵盖安全性、性能和代码质量三个维度：\n\n\`\`\`ts\n${codeToReview}\n\`\`\``
  )

  console.log('\n========== 最终报告 ==========\n')
  console.log(answer)
}

main().catch(console.error)
```

### 运行结果

```
用户: 请对以下 TypeScript 代码进行全面审查...

[Orchestrator] 分派 3 个子任务，并行执行...

[Worker:security] 开始执行: 安全性审查
[Worker:performance] 开始执行: 性能审查
[Worker:quality] 开始执行: 代码质量审查
[Worker:security] 完成 (487 chars)
[Worker:performance] 完成 (523 chars)
[Worker:quality] 完成 (412 chars)

========== 最终报告 ==========

## 代码审查综合报告

### 严重问题

1. **eval() 注入漏洞（安全）**：直接对用户输入执行 eval()，攻击者可执行任意代码。
   必须移除 eval，改用安全的表达式解析库。

2. **百万次串行 HTTP 请求（性能）**：循环发起 1,000,000 次 fetch 请求，
   会耗尽内存和网络连接。应改为分页查询或批量 API。

### 中等问题

3. **字符串拼接（性能）**：循环内用 += 拼接字符串，每次创建新字符串对象。
   应使用数组 push + join。

4. **any 类型（质量）**：参数类型为 any，失去类型安全保护。
   应定义明确的接口类型。

### 建议

5. **缺少错误处理**：fetch 请求没有 catch，任一请求失败会导致整体崩溃。
6. **缺少输入验证**：data 参数没有校验，应在入口处验证数据结构。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| Orchestrator-Worker 模式 | Orchestrator 负责任务拆解和结果聚合，Worker 负责具体执行，职责分离 |
| `dispatch_workers` 工具 | 把多 Agent 分派抽象为一次工具调用，对 Orchestrator 来说就是"调用工具，拿到结果" |
| Worker 隔离 | 每个 Worker 是独立的 LLM 调用，有自己的 system prompt 和上下文，互不可见 |
| `Promise.all` 并行 | 所有 Worker 同时执行，总耗时 = max(各 Worker 耗时)，而非 sum |
| 分层用模型 | Orchestrator 用强模型（Opus）做推理和聚合，Worker 用性价比模型（Sonnet）做执行 |
| 结构化任务拆解 | 通过工具 input schema 约束 Orchestrator 的输出格式，确保可解析 |
| 动态拆解 | Orchestrator 根据请求内容动态决定拆成几个子任务、每个子任务的专业方向 |
| 聚合不是拼接 | Orchestrator 收到 Worker 结果后要整合、去重、排序、解决冲突，不是简单粘贴 |

## 常见问题

**Q: 什么时候该用多 Agent，什么时候单 Agent 就够了？**

判断标准是**子任务之间是否需要不同的专业视角**。如果一个任务的所有部分都需要同样的上下文和推理模式，单 Agent 更高效——多 Agent 的通信开销（编排 + 聚合各消耗一次 LLM 调用）是实打实的成本。

多 Agent 的优势出现在三种场景：
- **维度正交**：子任务之间需要不同的评估标准（安全 vs 性能 vs 风格）
- **上下文隔离**：子任务的上下文互相干扰，分开处理效果更好
- **并行加速**：子任务独立，可以同时执行节省时间

**Q: Worker 用不同的模型可以吗？**

完全可以，这正是多 Agent 的优势之一。你可以根据子任务的特性选择最合适的模型：

```ts
async function runWorker(task: SubTask): Promise<WorkerResult> {
  // 根据任务类型选择模型
  const model = task.expertise.includes('代码')
    ? 'claude-sonnet-4-20250514'   // 代码任务用 Sonnet
    : 'claude-haiku-4-5-20251001'  // 简单分析用 Haiku

  const response = await anthropic.messages.create({
    model,
    // ...
  })
  // ...
}
```

在 P18（模型路由）中会系统地讨论这个话题。

**Q: 如果某个 Worker 执行失败了怎么办？**

当前实现用 `Promise.all`，一个失败全部失败。生产环境通常用 `Promise.allSettled` 来容错：

```ts
const settled = await Promise.allSettled(tasks.map(runWorker))

const results: WorkerResult[] = []
const failures: Array<{ taskId: string; error: string }> = []

for (let i = 0; i < settled.length; i++) {
  const outcome = settled[i]
  if (outcome.status === 'fulfilled') {
    results.push(outcome.value)
  } else {
    failures.push({
      taskId: tasks[i].id,
      error: String(outcome.reason),
    })
  }
}

// 把成功结果和失败信息一起返回给 Orchestrator
// Orchestrator 可以决定是否重试失败的子任务
```

P4 的重试策略在这里也适用——可以对失败的 Worker 做指数退避重试。

**Q: Orchestrator 可以做多轮分派吗？比如先分派一轮，看到结果后再分派第二轮？**

可以。因为 Orchestrator 本身是一个 Agent 循环，只要模型在第一轮聚合后觉得信息不够，它可以再次调用 `dispatch_workers` 启动新的 Worker。这在需要**迭代深入**的场景中很有用：第一轮做粗粒度扫描，发现问题后第二轮针对具体问题深入分析。

## 小结与延伸

你现在有了一个 Orchestrator-Worker 多 Agent 系统：

- Orchestrator 接收用户请求，用 LLM 动态拆解为多个子任务
- `dispatch_workers` 工具并行启动所有 Worker，隔离执行
- Worker 各自独立完成分析，Orchestrator 收到结果后整合为最终报告
- 分层用模型策略降低总成本

这是多 Agent 编排的基础架构。接下来两章会在此基础上扩展：

- **P16 子 Agent 与任务分解**：Worker 自身也是一个完整的 Agent（带工具调用和多轮循环），而不只是单次 LLM 调用
- **P17 Agent 间通信**：Worker 之间可以共享中间状态，支持协作而非纯并行

<StarCTA />
