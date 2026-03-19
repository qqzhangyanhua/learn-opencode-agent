---
title: P17：Agent 间通信与状态共享
description: 共享黑板、消息传递、Handoff 三种 Agent 协作通信模式——让多个 Agent 不再各自为战
---

<ProjectCard
  title="你将构建：一个多 Agent 协作写作系统，通过共享黑板和消息传递实现研究员-写手-编辑三方协作"
  difficulty="advanced"
  duration="60 min"
  :prerequisites="['P15', 'P16']"
  :tags="['Multi-Agent', 'Communication', 'Blackboard', 'Handoff', 'TypeScript', 'Anthropic SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup/)。如果本章里的 `RunCommand` 对应文件在仓库中还不存在，请先按正文步骤创建示例文件，再执行命令。

## 背景与目标

P15 实现了 Orchestrator-Worker 编排，P16 让 Worker 升级为带工具调用的子 Agent。但两章有一个共同的限制：**Worker 之间是隔离的**。Worker A 不知道 Worker B 的存在，也看不到 Worker B 的中间产出。所有信息必须经过 Orchestrator 中转。

这种隔离在子任务独立时是优势（避免干扰、支持并行），但很多真实场景需要 Agent 之间**协作**而非**并行**：

- **协作写作**：研究员找到的资料需要实时共享给写手，写手写出的段落需要实时提交给编辑审核
- **多步推理**：Agent A 的结论是 Agent B 的输入前提，B 的输出又要反馈给 A 修正
- **流水线协作**：上游 Agent 完成一部分就交给下游，不必等全部完成

这些场景要求 Agent 之间有**通信能力**——要么共享一块公共状态，要么能直接互发消息，要么能将控制权连同上下文一起移交。

**本章目标**：

1. 实现三种 Agent 间通信模式：共享黑板（Shared Blackboard）、消息传递（Message Passing）、Handoff（控制权移交）
2. 用一个协作写作任务串联三种模式：研究员写入黑板 → 写手读取黑板并写初稿 → 编辑通过 Handoff 接手润色
3. 处理并发写入问题：多个 Agent 同时写共享状态时的冲突管理

## 核心概念

### 三种通信模式

| 模式 | 数据流 | 耦合度 | 适用场景 |
|------|--------|--------|----------|
| **Shared Blackboard** | Agent ↔ 公共存储 ↔ Agent | 低 | 多个 Agent 需要读写同一份中间状态 |
| **Message Passing** | Agent A → 消息 → Agent B | 中 | Agent 之间有明确的信息传递需求 |
| **Handoff** | Agent A → (上下文 + 控制权) → Agent B | 高 | 流水线式协作，控制权完全转移 |

**Shared Blackboard** 是最松耦合的方式：Agent 不需要知道其他 Agent 的存在，只需要知道黑板上有哪些 key 可以读写。这和操作系统的共享内存类似——进程之间通过共享内存区域交换数据，不需要知道对方的 PID。

**Message Passing** 是点对点的：Agent A 明确地把一条消息发给 Agent B。比 Blackboard 更精确，但也更紧耦合——A 需要知道 B 的存在。

**Handoff** 是最强的耦合：Agent A 不仅传递数据，还把**控制权**转给 Agent B。A 退出，B 接手继续。Anthropic 在 Claude Code 中大量使用这种模式——主 Agent 把文件编辑任务 handoff 给专门的编辑子 Agent。

### 共享黑板的设计

黑板本质上是一个带版本控制的键值存储。每次写入都带版本号，读取时可以拿到最新版本：

```ts
interface BlackboardEntry {
  value: string
  version: number
  updatedBy: string
  updatedAt: number
}

interface Blackboard {
  entries: Map<string, BlackboardEntry>
  version: number
}
```

版本号解决并发冲突：如果两个 Agent 同时写同一个 key，后写入的会看到版本号已经变了。这不是完美的分布式一致性方案，但对 Agent 协作场景足够——Agent 不是毫秒级并发，而是秒级轮替。

### Handoff 的上下文传递

Handoff 不只是"调用另一个 Agent"，关键在于**上下文的完整传递**。接手方需要知道：

1. **任务目标**：你要做什么
2. **前序成果**：之前做了什么、得出了什么结论
3. **约束条件**：有哪些限制和要求

```ts
interface HandoffPayload {
  targetAgent: string
  task: string
  context: string
  constraints: string[]
}
```

## 动手实现

<RunCommand command="bun run p17-agent-comm.ts" />

### 第一步：定义类型和共享黑板

```ts
// p17-agent-comm.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ---- 黑板系统 ----

interface BlackboardEntry {
  value: string
  version: number
  updatedBy: string
  updatedAt: number
}

interface Blackboard {
  entries: Map<string, BlackboardEntry>
  version: number
}

function createBlackboard(): Blackboard {
  return { entries: new Map(), version: 0 }
}

function writeToBlackboard(
  board: Blackboard,
  key: string,
  value: string,
  author: string
): number {
  board.version += 1
  board.entries.set(key, {
    value,
    version: board.version,
    updatedBy: author,
    updatedAt: Date.now(),
  })
  console.log(`  [Blackboard] ${author} wrote "${key}" (v${board.version})`)
  return board.version
}

function readFromBlackboard(
  board: Blackboard,
  key: string
): BlackboardEntry | undefined {
  return board.entries.get(key)
}

function readAllFromBlackboard(board: Blackboard): string {
  const lines: string[] = []
  for (const [key, entry] of board.entries) {
    lines.push(`[${key}] (by ${entry.updatedBy}, v${entry.version}):\n${entry.value}`)
  }
  return lines.join('\n\n')
}

// ---- 消息传递系统 ----

interface AgentMessage {
  from: string
  to: string
  content: string
  timestamp: number
}

interface MessageBus {
  messages: AgentMessage[]
}

function createMessageBus(): MessageBus {
  return { messages: [] }
}

function sendMessage(
  bus: MessageBus,
  from: string,
  to: string,
  content: string
): void {
  bus.messages.push({ from, to, content, timestamp: Date.now() })
  console.log(`  [Message] ${from} → ${to}: ${content.slice(0, 60)}...`)
}

function getMessagesFor(bus: MessageBus, recipient: string): AgentMessage[] {
  return bus.messages.filter(m => m.to === recipient)
}

// ---- Handoff 系统 ----

interface HandoffPayload {
  fromAgent: string
  targetAgent: string
  task: string
  context: string
  constraints: string[]
}
```

### 第二步：实现研究员 Agent

研究员负责根据主题收集信息，并将研究成果写入共享黑板。

```ts
// p17-agent-comm.ts（续）

async function runResearcher(
  topic: string,
  board: Blackboard,
  bus: MessageBus
): Promise<void> {
  console.log('\n[Researcher] 开始研究...')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: [
      '你是一位研究员，专门负责收集和整理信息。',
      '针对给定主题，请提供：',
      '1. 3-5 个核心要点（标记为 KEY_POINTS）',
      '2. 相关的背景数据或事实（标记为 BACKGROUND）',
      '3. 一段简短的摘要（标记为 SUMMARY）',
      '',
      '请用以下格式输出，每个部分用 === 分隔：',
      '=== KEY_POINTS ===',
      '（要点列表）',
      '=== BACKGROUND ===',
      '（背景信息）',
      '=== SUMMARY ===',
      '（摘要）',
    ].join('\n'),
    messages: [
      { role: 'user', content: `请研究以下主题：${topic}` },
    ],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  // 解析研究成果并写入黑板
  const sections = parseSections(text)

  for (const [key, value] of Object.entries(sections)) {
    writeToBlackboard(board, key, value, 'researcher')
  }

  // 通过消息总线通知写手：研究完成
  sendMessage(bus, 'researcher', 'writer', `研究完成，已将 ${Object.keys(sections).length} 个部分写入黑板。请查阅 KEY_POINTS、BACKGROUND、SUMMARY。`)
}

function parseSections(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pattern = /===\s*(\w+)\s*===([\s\S]*?)(?====|\s*$)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const key = match[1].trim()
    const value = match[2].trim()
    if (key && value) {
      result[key] = value
    }
  }

  // 如果解析失败，把整段文本作为 RESEARCH
  if (Object.keys(result).length === 0) {
    result['RESEARCH'] = text
  }

  return result
}
```

### 第三步：实现写手 Agent

写手从黑板读取研究成果，撰写初稿，然后将初稿写回黑板。

```ts
// p17-agent-comm.ts（续）

async function runWriter(
  topic: string,
  board: Blackboard,
  bus: MessageBus
): Promise<void> {
  console.log('\n[Writer] 开始写作...')

  // 从消息总线获取研究员的通知
  const notifications = getMessagesFor(bus, 'writer')
  console.log(`  [Writer] 收到 ${notifications.length} 条消息`)

  // 从黑板读取所有研究成果
  const research = readAllFromBlackboard(board)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: [
      '你是一位专业写手，擅长将研究资料转化为流畅、有说服力的文章。',
      '根据提供的研究资料，撰写一篇 300-500 字的中文短文。',
      '要求：',
      '- 结构清晰：引言、正文（2-3 段）、结论',
      '- 语言流畅自然，不要罗列要点',
      '- 融合所有研究发现，不要遗漏关键信息',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: `主题：${topic}\n\n以下是研究团队的资料：\n\n${research}`,
      },
    ],
  })

  const draft = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  // 将初稿写入黑板
  writeToBlackboard(board, 'DRAFT', draft, 'writer')

  // 通知编辑：初稿完成
  sendMessage(bus, 'writer', 'editor', '初稿已完成并写入黑板 DRAFT，请审阅润色。')
}
```

### 第四步：实现编辑 Agent（Handoff 模式）

编辑通过 Handoff 接收写手的成果和完整上下文，进行最终润色。

```ts
// p17-agent-comm.ts（续）

function createHandoff(
  board: Blackboard,
  bus: MessageBus
): HandoffPayload {
  const draft = readFromBlackboard(board, 'DRAFT')
  const keyPoints = readFromBlackboard(board, 'KEY_POINTS')

  // 收集编辑收到的所有消息作为额外上下文
  const editorMessages = getMessagesFor(bus, 'editor')
  const messageContext = editorMessages
    .map(m => `[${m.from}]: ${m.content}`)
    .join('\n')

  return {
    fromAgent: 'writer',
    targetAgent: 'editor',
    task: '润色和定稿：检查文章的逻辑连贯性、语言表达、信息准确性',
    context: [
      '## 初稿',
      draft?.value ?? '（无初稿）',
      '',
      '## 核心要点（供校验）',
      keyPoints?.value ?? '（无要点）',
      '',
      '## 协作消息',
      messageContext || '（无消息）',
    ].join('\n'),
    constraints: [
      '保持原文的核心观点和结构',
      '修正语法和表达问题',
      '确保所有核心要点都被覆盖',
      '最终输出只包含润色后的文章正文',
    ],
  }
}

async function runEditor(handoff: HandoffPayload): Promise<string> {
  console.log('\n[Editor] 通过 Handoff 接手任务...')
  console.log(`  [Editor] 来自: ${handoff.fromAgent}`)
  console.log(`  [Editor] 任务: ${handoff.task}`)
  console.log(`  [Editor] 约束: ${handoff.constraints.length} 条`)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: [
      '你是一位资深编辑，负责文章的最终润色和定稿。',
      '',
      '你的任务：',
      handoff.task,
      '',
      '约束条件：',
      ...handoff.constraints.map(c => `- ${c}`),
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: handoff.context,
      },
    ],
  })

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}
```

### 第五步：编排完整流程

三个 Agent 按顺序协作：研究员 → 写手 → 编辑。它们通过黑板共享数据，通过消息总线通知进度，最后通过 Handoff 完成控制权转移。

```ts
// p17-agent-comm.ts（续）

async function main(): Promise<void> {
  const topic = 'TypeScript 类型系统在大型项目中的实际价值'

  console.log(`主题: ${topic}`)
  console.log('='.repeat(50))

  // 初始化共享基础设施
  const board = createBlackboard()
  const bus = createMessageBus()

  // 阶段 1：研究员收集资料 → 写入黑板
  await runResearcher(topic, board, bus)

  // 阶段 2：写手读取黑板 → 撰写初稿 → 写回黑板
  await runWriter(topic, board, bus)

  // 阶段 3：构造 Handoff → 编辑接手润色
  const handoff = createHandoff(board, bus)
  const finalArticle = await runEditor(handoff)

  // 输出最终成果
  console.log('\n' + '='.repeat(50))
  console.log('最终成果')
  console.log('='.repeat(50))
  console.log(finalArticle)

  // 输出协作统计
  console.log('\n' + '-'.repeat(50))
  console.log('协作统计')
  console.log('-'.repeat(50))
  console.log(`黑板条目: ${board.entries.size}`)
  console.log(`黑板版本: ${board.version}`)
  console.log(`消息总数: ${bus.messages.length}`)
  console.log(`Handoff 约束: ${handoff.constraints.length} 条`)

  for (const [key, entry] of board.entries) {
    console.log(`  [${key}] by ${entry.updatedBy} (v${entry.version}, ${entry.value.length} chars)`)
  }
}

main().catch(console.error)
```

### 运行结果

```
主题: TypeScript 类型系统在大型项目中的实际价值
==================================================

[Researcher] 开始研究...
  [Blackboard] researcher wrote "KEY_POINTS" (v1)
  [Blackboard] researcher wrote "BACKGROUND" (v2)
  [Blackboard] researcher wrote "SUMMARY" (v3)

[Writer] 开始写作...
  [Writer] 收到 1 条消息
  [Message] researcher → writer: 研究完成，已将 3 个部分写入黑板...
  [Blackboard] writer wrote "DRAFT" (v4)
  [Message] writer → editor: 初稿已完成并写入黑板 DRAFT，请审阅润色。

[Editor] 通过 Handoff 接手任务...
  [Editor] 来自: writer
  [Editor] 任务: 润色和定稿：检查文章的逻辑连贯性、语言表达、信息准确性
  [Editor] 约束: 4 条

==================================================
最终成果
==================================================
TypeScript 类型系统在大型项目中的实际价值

在软件工程的实践中，类型系统的价值往往要到项目规模扩大后才真正显现...
（润色后的完整文章）

--------------------------------------------------
协作统计
--------------------------------------------------
黑板条目: 4
黑板版本: 4
消息总数: 2
Handoff 约束: 4 条
  [KEY_POINTS] by researcher (v1, 342 chars)
  [BACKGROUND] by researcher (v2, 518 chars)
  [SUMMARY] by researcher (v3, 156 chars)
  [DRAFT] by writer (v4, 723 chars)
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| Shared Blackboard | 公共键值存储，Agent 通过 key 读写共享状态，互不需要知道对方的存在 |
| 版本控制 | 每次写入递增版本号，记录作者和时间戳，解决并发写入的可追溯性 |
| Message Passing | 点对点消息，用于 Agent 之间的进度通知和协调，比黑板更精确 |
| Handoff | 控制权移交：不只传数据，还传任务目标、上下文和约束条件 |
| 松耦合设计 | 研究员不知道写手的存在，只管往黑板写数据；写手不知道编辑会接手 |
| 协作流水线 | 研究 → 写作 → 编辑，每阶段的输出通过黑板/Handoff 传递给下一阶段 |
| 上下文完整性 | Handoff 包含 task + context + constraints 三要素，接手方有足够信息开始工作 |
| 协作统计 | 黑板版本和消息数量可作为多 Agent 系统的可观测性指标 |

## 常见问题

**Q: 如果两个 Agent 同时写黑板的同一个 key 怎么办？**

当前实现是"后写者胜"——版本号自增，最后一次写入覆盖之前的。这在 Agent 顺序执行时没有问题。如果你需要真正的并行写入（比如 P15 的 `Promise.all` 场景），有两种策略：

```ts
// 策略 1：分 key 写入，避免冲突
// 每个 Agent 写自己专属的 key
writeToBlackboard(board, 'research_security', result, 'security-agent')
writeToBlackboard(board, 'research_performance', result, 'perf-agent')

// 策略 2：乐观锁，写入时检查版本
function writeWithVersionCheck(
  board: Blackboard,
  key: string,
  value: string,
  author: string,
  expectedVersion: number
): boolean {
  const current = board.entries.get(key)
  if (current && current.version !== expectedVersion) {
    console.log(`  [Blackboard] 版本冲突: 期望 v${expectedVersion}，实际 v${current.version}`)
    return false
  }
  writeToBlackboard(board, key, value, author)
  return true
}
```

生产环境中，策略 1（分 key）几乎总是更好的选择——消除冲突比解决冲突更 Linus。

**Q: Blackboard 和 Message Passing 什么时候该用哪个？**

判断标准是**数据的性质**：

- **状态数据**用 Blackboard：研究成果、初稿、配置等需要持久化、可被多方读取的数据
- **事件通知**用 Message Passing：完成通知、进度更新、错误报告等一次性的信号

混用是常见模式：Agent 把数据写入黑板，然后通过消息通知相关方"数据已更新"。这和数据库 + 消息队列的组合是一个思路。

**Q: Handoff 和直接调用另一个 Agent 有什么区别？**

区别在于**上下文的完整性**。直接调用另一个 Agent，你需要手动拼接 prompt。Handoff 把这个过程结构化了：

```ts
// 直接调用：你需要自己组织上下文
const result = await runEditor(`请润色这篇文章：${draft}。注意要保持原文观点...`)

// Handoff：结构化的上下文传递
const handoff: HandoffPayload = {
  fromAgent: 'writer',
  targetAgent: 'editor',
  task: '润色和定稿',
  context: `初稿：${draft}\n要点：${keyPoints}`,
  constraints: ['保持原文观点', '修正语法'],
}
const result = await runEditor(handoff)
```

Handoff 的优势在规模化时更明显：当你有几十种 Agent 之间互相移交时，结构化的 payload 比自由文本更容易维护和调试。

**Q: 这三种模式可以组合使用吗？**

本章的示例就是三种模式的组合：

1. 研究员和写手通过 **Blackboard** 共享研究资料
2. 研究员和写手通过 **Message Passing** 通知进度
3. 写手通过 **Handoff** 将控制权移交给编辑

实际项目中几乎不会只用一种模式。一个好的经验法则是：用 Blackboard 做数据层，用 Message Passing 做协调层，用 Handoff 做控制流层。三层分离，各司其职。

## 小结与延伸

本章实现了三种 Agent 间通信模式：

- **Shared Blackboard**：带版本控制的键值存储，Agent 通过 key 共享中间状态
- **Message Passing**：点对点消息总线，用于进度通知和协调
- **Handoff**：结构化的控制权移交，包含任务、上下文和约束条件

三种模式分别对应不同的耦合度和使用场景，组合使用构成了完整的多 Agent 协作基础设施。

P15-P17 构成了多 Agent 系统的完整基础：编排（P15）、子 Agent（P16）、通信（P17）。下一章 **P18 模型路由与成本优化** 会讨论另一个生产级问题——当你有多个 Agent 时，如何为每个 Agent 选择最合适的模型，在质量和成本之间找到平衡。

<StarCTA />
