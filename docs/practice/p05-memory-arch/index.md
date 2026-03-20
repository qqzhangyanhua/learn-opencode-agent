---
title: P5：记忆系统架构
description: 短期/工作/长期记忆三层模型设计，从零实现 Agent 的记忆系统
---

<ProjectCard
  title="你将构建：一个三层记忆系统，让 Agent 能跨会话记住用户信息"
  difficulty="intermediate"
  duration="45 min"
  :prerequisites="['P1', 'P2']"
  :tags="['Memory', 'State Management', 'TypeScript', 'OpenAI SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup)。本章对应示例文件位于 `practice/` 目录，可直接按命令运行。

## 前置准备

开始本章前，请先确认：

- 已阅读 [实践环境准备](/practice/setup)
- 基础依赖已就绪：`openai`
- 环境变量已配置：`OPENAI_API_KEY`
- 建议先完成前置章节：`P1`、`P2`
- 本章建议入口命令：`bun run practice/p05-memory-arch.ts`
- 示例文件位置：`practice/p05-memory-arch.ts`

## 背景与目标

没有记忆时，Agent 有一个根本性的问题：

```
用户（第一天）：你好，我叫张三，我是一名前端工程师。
Agent：你好张三！很高兴认识你。

用户（第二天）：你还记得我叫什么吗？
Agent：对不起，我不知道你的名字，每次对话对我来说都是全新开始。
```

这不是模型的智能问题，而是架构问题。**LLM API 是无状态的（stateless）**——每次调用都是独立请求，模型本身不存储任何上下文。记忆必须由应用层自己管理。

本章目标：实现一套三层记忆架构，让 Agent 能：

1. 在单次对话中维护完整历史（短期记忆）
2. 在当前任务中追踪执行状态（工作记忆）
3. 跨会话持久化关键信息（长期记忆）

## 核心概念

### 为什么 LLM 没有记忆

LLM API 的每次调用都是一次独立的 HTTP 请求：

```
POST /chat/completions
{
  "messages": [...],   // 你传进去的全部上下文
  "model": "gpt-4o"
}
```

模型只能看到你在这次请求里传入的内容。它不会"记住"上次对话——除非你把上次对话作为本次请求的一部分传进去。

这意味着：**记忆的本质是上下文管理**，而不是模型内部状态。

### 三层记忆模型

| 记忆类型 | 生命周期 | 存储位置 | 典型内容 |
|----------|----------|----------|----------|
| 短期记忆（Short-term） | 当前会话 | 内存（`messages` 数组） | 本轮对话消息历史 |
| 工作记忆（Working memory） | 当前任务 | 内存（`state` 对象） | 任务进度、已完成步骤、临时变量 |
| 长期记忆（Long-term） | 跨会话永久 | 磁盘（JSON 文件） | 用户偏好、历史事实、领域知识 |

这三层记忆对应了人类认知系统的经典分层：感官缓冲 → 工作记忆 → 长期记忆。

### 记忆注入机制

长期记忆通过 system prompt 注入：

```
你是一个 AI 助手。

[已知用户信息]
- 姓名：张三
- 职业：前端工程师
- 偏好语言：中文

请在对话中自然地利用这些信息。
```

每次对话开始前，Agent 从磁盘加载长期记忆，拼入 system prompt，模型就能"想起"用户。

### 记忆写入时机

长期记忆的写入需要显式触发——不能让每句话都存，否则会存入大量噪音。常见策略：

- **手动触发**：对话结束时，调用保存函数
- **关键词检测**：用户说"记住我叫..."时立即保存
- **模型提取**：让模型判断哪些信息值得长期保存（P6 详细介绍）

本章采用最简单的**手动触发**方式，建立清晰的架构骨架。

## 动手实现

<RunCommand command="bun run practice/p05-memory-arch.ts" :verified="true" />

### 运行与验证

- 先按前置准备完成依赖、环境变量和本章示例文件
- 执行上面的推荐入口命令
- 将输出与下文的“运行结果”或章节描述对照，确认主链路已经跑通
- 如果遇到命令、依赖、环境变量或样例输入问题，先回到 [实践环境准备](/practice/setup) 排查



### 第一步：定义类型

```ts
// p05-memory-arch.ts
import OpenAI from 'openai'
import { readFile, writeFile } from 'fs/promises'

type MessageParam = OpenAI.ChatCompletionMessageParam
type LongTermStore = Record<string, string>
```

### 第二步：短期记忆

```ts
// 短期记忆：维护当前对话的消息历史
class ShortTermMemory {
  private messages: MessageParam[] = []

  add(role: 'user' | 'assistant', content: string): void {
    this.messages.push({ role, content })
  }

  getAll(): MessageParam[] {
    return [...this.messages]
  }

  clear(): void {
    this.messages = []
  }

  get length(): number {
    return this.messages.length
  }
}
```

短期记忆就是一个消息数组的包装器。它的作用是让多轮对话中，每次 API 调用都能携带完整的历史消息。

### 第三步：工作记忆

```ts
// 工作记忆：追踪当前任务的执行状态
class WorkingMemory {
  private state: Record<string, unknown> = {}

  set(key: string, value: unknown): void {
    this.state[key] = value
  }

  get(key: string): unknown {
    return this.state[key]
  }

  clear(): void {
    this.state = {}
  }

  getSnapshot(): Record<string, unknown> {
    return { ...this.state }
  }
}
```

工作记忆是一个键值存储，用于跟踪任务状态。例如，一个代码审查 Agent 可以用它记录"已审查文件列表"、"当前严重程度计数"等中间状态。

### 第四步：长期记忆

```ts
// 长期记忆：跨会话持久化的 JSON 文件
class LongTermMemory {
  private store: LongTermStore = {}
  private readonly filePath: string

  constructor(filePath: string = 'memory.json') {
    this.filePath = filePath
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      this.store = JSON.parse(raw) as LongTermStore
      console.log(`[长期记忆已加载] ${Object.keys(this.store).length} 条记录`)
    } catch {
      // 文件不存在时从空状态开始，属于正常情况
      this.store = {}
      console.log('[长期记忆] 未找到已有记忆，从空状态开始')
    }
  }

  async save(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.store, null, 2), 'utf-8')
    console.log(`[长期记忆已保存] ${this.filePath}`)
  }

  remember(key: string, value: string): void {
    this.store[key] = value
    console.log(`[长期记忆写入] ${key} = ${value}`)
  }

  recall(key: string): string | undefined {
    return this.store[key]
  }

  getAll(): LongTermStore {
    return { ...this.store }
  }
}
```

长期记忆的核心是 `load()` 和 `save()` 的显式调用。`load()` 在会话开始时执行，`save()` 在提取到关键信息后执行。

### 第五步：组合成 MemoryAgent

```ts
// 组合三层记忆的 Agent
class MemoryAgent {
  private client: OpenAI
  private shortTerm: ShortTermMemory
  private working: WorkingMemory
  private longTerm: LongTermMemory

  constructor(memoryFilePath?: string) {
    this.client = new OpenAI()
    this.shortTerm = new ShortTermMemory()
    this.working = new WorkingMemory()
    this.longTerm = new LongTermMemory(memoryFilePath)
  }

  // 将长期记忆注入 system prompt
  private buildSystemPrompt(): string {
    const longTermData = this.longTerm.getAll()
    const entries = Object.entries(longTermData)

    if (entries.length === 0) {
      return '你是一个有记忆能力的 AI 助手。'
    }

    const memoryLines = entries.map(([k, v]) => `- ${k}：${v}`).join('\n')
    return `你是一个有记忆能力的 AI 助手。

[已知用户信息]
${memoryLines}

请在对话中自然地利用这些已知信息。`
  }

  async init(): Promise<void> {
    await this.longTerm.load()
  }

  async chat(userMessage: string): Promise<string> {
    // 把用户消息加入短期记忆
    this.shortTerm.add('user', userMessage)

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        ...this.shortTerm.getAll(),
      ],
    })

    const assistantText = response.choices[0].message.content ?? ''

    // 把助手回复加入短期记忆，保持对话连贯
    this.shortTerm.add('assistant', assistantText)

    return assistantText
  }

  // 手动提取关键信息存入长期记忆
  remember(key: string, value: string): void {
    this.longTerm.remember(key, value)
  }

  async saveMemory(): Promise<void> {
    await this.longTerm.save()
  }

  // 开启新会话（清空短期记忆和工作记忆，保留长期记忆）
  newSession(): void {
    this.shortTerm.clear()
    this.working.clear()
    console.log('\n[新会话开始] 短期记忆已清空，长期记忆保留')
  }

  getWorkingMemory(): WorkingMemory {
    return this.working
  }
}
```

注意 `buildSystemPrompt()` 的作用：每次对话前重新构建，将最新的长期记忆注入。这是记忆系统的核心机制——不是模型"记住"了，而是我们每次都把记忆"喂给"模型。

### 第六步：主程序演示

```ts
async function main() {
  const agent = new MemoryAgent('memory.json')
  await agent.init()

  console.log('=== 第一轮会话 ===\n')

  // 用户自我介绍
  const msg1 = '你好，我叫张三，我是一名前端工程师，平时喜欢用 TypeScript。'
  console.log(`用户：${msg1}`)
  const reply1 = await agent.chat(msg1)
  console.log(`Agent：${reply1}\n`)

  // 手动将关键信息存入长期记忆
  agent.remember('user_name', '张三')
  agent.remember('user_profession', '前端工程师')
  agent.remember('preferred_language', 'TypeScript')
  await agent.saveMemory()

  // 工作记忆：记录当前任务状态
  const wm = agent.getWorkingMemory()
  wm.set('onboarding_complete', true)
  wm.set('session_count', 1)

  console.log('\n--- 模拟结束第一次会话，开启第二次会话 ---')
  agent.newSession()

  console.log('\n=== 第二轮会话（新会话，长期记忆已加载） ===\n')

  const msg2 = '你还记得我叫什么名字吗？'
  console.log(`用户：${msg2}`)
  const reply2 = await agent.chat(msg2)
  console.log(`Agent：${reply2}\n`)

  const msg3 = '我最喜欢用哪种编程语言？'
  console.log(`用户：${msg3}`)
  const reply3 = await agent.chat(msg3)
  console.log(`Agent：${reply3}\n`)
}

main().catch(console.error)
```

### 运行结果

```
[长期记忆] 未找到已有记忆，从空状态开始

=== 第一轮会话 ===

用户：你好，我叫张三，我是一名前端工程师，平时喜欢用 TypeScript。
Agent：你好张三！很高兴认识你。前端工程师，还偏爱 TypeScript，那你肯定对类型系统很有感觉。有什么我可以帮你的吗？

[长期记忆写入] user_name = 张三
[长期记忆写入] user_profession = 前端工程师
[长期记忆写入] preferred_language = TypeScript
[长期记忆已保存] memory.json

--- 模拟结束第一次会话，开启第二次会话 ---

[新会话开始] 短期记忆已清空，长期记忆保留

=== 第二轮会话（新会话，长期记忆已加载） ===

用户：你还记得我叫什么名字吗？
Agent：当然记得，你叫张三！

用户：我最喜欢用哪种编程语言？
Agent：你最喜欢用 TypeScript。作为前端工程师，这是个很好的选择。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| LLM 无状态 | 每次 API 调用独立，模型不保存任何状态，记忆必须由应用层管理 |
| 短期记忆 | `messages` 数组，在单次会话中维护对话历史，传给每次 API 调用 |
| 工作记忆 | `state` 键值对，追踪当前任务中间状态，不传给模型 |
| 长期记忆 | 持久化 JSON，通过 system message 注入 `messages` 数组，实现跨会话"记忆" |
| 记忆注入 | `buildSystemPrompt()` 将长期记忆格式化后拼入 system prompt |
| 显式保存 | `remember()` + `saveMemory()` 手动控制写入时机，避免噪音污染 |
| 新会话切换 | `newSession()` 只清短期和工作记忆，长期记忆跨会话保留 |

## 常见问题

**Q: 长期记忆存文件还是数据库？**

文件（JSON）适合单用户、低频写入的场景，实现简单，无依赖。多用户或高并发场景应使用数据库（SQLite、PostgreSQL）。如果需要语义搜索（"找出和编程相关的所有记忆"），则需要向量数据库，详见 P6 和 P7。

**Q: 如何决定什么信息值得存入长期记忆？**

本章使用手动判断。更可靠的方式是让模型来判断：对话结束后，把对话摘要发给模型，问它"哪些信息值得长期记住？"，再把模型的结构化输出存入长期记忆。P6 会实现这个自动提取机制。

**Q: 记忆注入会占用 Token 吗？**

会。System prompt 中的每条长期记忆都消耗输入 Token。记忆条目越多，成本越高，同时也会压缩模型可用的上下文窗口。解决方案是设置记忆条目上限（如最多保留 50 条），或用向量检索只注入最相关的记忆，而不是全量注入。

## 小结与延伸

本章建立了三层记忆系统的骨架：

- **短期记忆**：对话级别，保证多轮上下文连贯
- **工作记忆**：任务级别，追踪执行状态
- **长期记忆**：跨会话持久化，通过 system prompt 注入实现"记忆"

这个架构的局限是明显的：**全量注入所有长期记忆**。当记忆条目增多，这会带来 Token 浪费，也可能引入不相关信息干扰模型。

接下来：

- **P6**：让模型自动提取对话中的关键信息写入长期记忆，以及如何用语义检索只注入相关记忆
- **P7**：引入向量数据库实现真正的 RAG（检索增强生成），彻底解决全量注入问题

<StarCTA />
