---
title: 第2章：AI Agent 的核心组件
description: 深入理解 LLM、Tools、Memory、Planning、Execution Loop 五个核心模块的工作原理与实现
---

> **学习目标**：深入理解 AI Agent 的 5 个核心组件，为阅读 OpenCode 源码建立概念基础
> **前置知识**：第1章"什么是 AI Agent"
> **阅读时间**：25 分钟

---

第1章我们知道了 **AI Agent = LLM + 工具 + 记忆 + 规划 + 执行循环**。

这一章拆开来看每一个模块：它在干什么、怎么实现、OpenCode 里长什么样。

---

## 2.1 LLM：Agent 的大脑

### LLM 如何理解文本

LLM（Large Language Model，大语言模型）是 Agent 的核心决策单元。它的输入和输出都是文本，但内部机制比"读文字"复杂得多。

**Tokenization（分词）**：

LLM 不直接处理字符，而是把文本切成 token（词元）：

```text
"Hello, world!" → ["Hello", ",", " world", "!"]
"写代码"       → ["写", "代码"]
"TypeScript"  → ["Type", "Script"]
```

这意味着一个"词"可能被切成多个 token，一次对话的实际成本取决于 token 数而不是字符数。

**上下文窗口（Context Window）**：

LLM 每次只能看到有限长度的文本，这是它最重要的物理限制之一：

```text
GPT-4：    最多 128K tokens  ≈ 约 100,000 个汉字
Claude 3： 最多 200K tokens  ≈ 约 150,000 个汉字
```

超出窗口的内容会被截断，Agent 系统必须主动管理哪些内容放进去。

**Temperature（温度）**：

控制 LLM 输出的随机性：

```text
temperature = 0.0  → 确定性最强，每次输出相同，适合代码生成
temperature = 0.7  → 平衡创造性和准确性，适合对话
temperature = 1.0  → 最随机，适合创意写作
```

OpenCode 在代码生成场景默认使用低温度，确保输出可预测。

### Function Calling：LLM 调用工具的机制

LLM 本身只能输出文本，但现代 LLM 支持一种特殊的输出格式——**Function Calling（函数调用）**：

```text
普通输出：
"这个函数有问题，你应该修改第15行..."

Function Calling 输出：
{
  "tool_call": {
    "name": "read_file",
    "arguments": { "path": "src/utils.ts" }
  }
}
```

Agent 框架解析这个结构化输出，执行对应的工具，再把结果喂回 LLM。这是 Agent 能"做事"而不只是"说话"的根本机制。

### OpenCode 如何使用 LLM

OpenCode 使用 [Vercel AI SDK](https://sdk.vercel.ai) 统一多个 LLM 提供商的接口：

```typescript
// packages/opencode/src/session/llm.ts（简化示意）
import { generateText, streamText } from "ai"

// 调用 LLM，传入工具定义
const result = await streamText({
  model: currentModel,        // 当前选择的模型
  messages: chatHistory,      // 对话历史
  tools: availableTools,      // 可用工具列表
  system: systemPrompt,       // 系统提示词
})

// 处理流式输出
for await (const chunk of result.fullStream) {
  if (chunk.type === "text-delta") {
    // 文本片段
  }
  if (chunk.type === "tool-call") {
    // LLM 决定调用工具
    await executeTool(chunk.toolName, chunk.args)
  }
}
```

**关键设计**：OpenCode 不自己写 HTTP 请求调 Claude/GPT，而是通过 AI SDK 的统一抽象层，让上层逻辑不关心底层是哪个模型。

---

## 2.2 Tools：Agent 的手

### 工具的本质

Tool（工具）是 Agent 与外部世界交互的唯一通道。没有工具，Agent 只能说话；有了工具，Agent 可以读文件、运行代码、搜索网络——做任何能被 API 封装的事情。

一个工具由三部分组成：

```typescript
interface Tool {
  name: string          // 名称，LLM 用这个名字决定调用哪个工具
  description: string   // 描述，LLM 根据这段文字理解工具的用途
  parameters: Schema    // 参数定义，JSON Schema 格式
  execute: Function     // 实际执行逻辑
}
```

**description 极其重要**。LLM 不会看代码，只会看 description 来决定要不要调用这个工具。写得不清楚，工具就会被误用或不被使用。

### 工具的类型

一个实用的 Agent 通常需要这几类工具：

**文件系统工具**：
```typescript
read_file(path)           // 读取文件内容
write_file(path, content) // 写入文件
list_directory(path)      // 列出目录内容
```

**代码执行工具**：
```typescript
bash(command)             // 执行 Shell 命令
run_tests()               // 运行测试套件
```

**搜索工具**：
```typescript
grep(pattern, path)       // 搜索文件内容
find_files(pattern)       // 按名称搜索文件
web_search(query)         // 搜索网络
```

**编辑工具**：
```typescript
edit_file(path, old, new) // 精确替换文件内容
```

### OpenCode 的工具注册机制

OpenCode 在 `packages/opencode/src/tool/` 目录管理所有工具，核心是一个工具注册表：

```typescript
// packages/opencode/src/tool/registry.ts（简化示意）
const registry = new Map<string, Tool>()

// 注册工具
registry.set("read", ReadTool)
registry.set("write", WriteTool)
registry.set("bash", BashTool)
registry.set("grep", GrepTool)
registry.set("glob", GlobTool)
registry.set("edit", EditTool)

// 按权限过滤工具
function getToolsForSession(permissions: Permission[]) {
  return [...registry.values()].filter(
    tool => permissions.includes(tool.requiredPermission)
  )
}
```

**权限系统**：OpenCode 的工具有权限级别，`bash` 工具（可以执行任意命令）需要用户显式授权，而 `read_file` 工具默认可用。这是一个重要的安全设计。

### 工具执行的完整流程

```text
1. LLM 输出 tool_call: { name: "read", args: { path: "src/index.ts" } }
2. Agent 框架解析 tool_call
3. 从 registry 找到 "read" 工具
4. 检查权限是否满足
5. 执行 ReadTool.execute({ path: "src/index.ts" })
6. 获取结果：文件内容字符串
7. 构造 tool_result 消息：{ role: "tool", content: "..." }
8. 将 tool_result 加入对话历史
9. 继续调用 LLM（LLM 现在能看到工具执行结果）
```

这个流程在 OpenCode 的 `processor.ts` 里实现，我们在第4章会深入分析。

---

## 2.3 Memory：Agent 的记忆

### 为什么 Agent 需要记忆

纯粹的 LLM 调用是无状态的——每次请求独立，不知道上一次说了什么。对于需要多轮交互完成的任务，Agent 必须自己维护状态。

记忆分两种，解决不同问题：

| 类型 | 作用域 | 存储方式 | 典型用途 |
|------|--------|----------|----------|
| 短期记忆 | 当前会话 | 内存中的数组 | 对话历史、工具结果 |
| 长期记忆 | 跨会话 | 数据库 / 向量库 | 用户偏好、项目知识 |

### 短期记忆：对话历史

短期记忆就是 `messages` 数组——当前会话中所有消息的有序列表：

```typescript
type Message =
  | { role: "user";      content: string }
  | { role: "assistant"; content: string | ToolCall[] }
  | { role: "tool";      toolCallId: string; content: string }

// 一次典型的 Agent 对话历史
const messages: Message[] = [
  { role: "user",      content: "帮我读取 config.ts 文件" },
  { role: "assistant", content: [{ type: "tool_call", name: "read", args: { path: "config.ts" } }] },
  { role: "tool",      toolCallId: "call_1", content: "export const port = 3000..." },
  { role: "assistant", content: "文件已读取，当前配置的端口是 3000。" },
  { role: "user",      content: "把端口改成 8080" },
  // Agent 现在知道要改的是 config.ts，因为对话历史里有上下文
]
```

**关键点**：LLM 每次调用时，都会把完整的 messages 数组作为输入。这就是"Agent 记得之前说了什么"的实现机制——它不是真的记忆，而是每次都把历史重新发给 LLM。

### 上下文窗口管理

随着对话变长，messages 可能超出 LLM 的上下文窗口。OpenCode 用结构化消息模型解决这个问题：

```typescript
// packages/opencode/src/session/message-v2.ts（概念示意）
type MessagePart =
  | { type: "text";      text: string }
  | { type: "reasoning"; reasoning: string }  // 模型的思考过程
  | { type: "tool";      toolCall: ToolCall }
  | { type: "file";      path: string; content: string }

// 每条消息由多个 part 组成，而不是一个大字符串
// 这让 Agent 框架可以按需选择、截断、压缩哪些内容
```

这个设计的价值在于：框架可以智能地决定"这条消息里的 file 部分太大，先丢掉；reasoning 部分不关键，也丢掉；只保留 tool 结果和最终文本"——而不是粗暴地截断字符串。

### 长期记忆：跨会话持久化

长期记忆需要持久化存储。OpenCode 用 SQLite 数据库保存会话历史：

```typescript
// 会话和消息都持久化到数据库
// 下次打开 OpenCode，上次的对话历史仍然存在
// 这让 Agent 可以"继续上次的任务"

const sessions = await db.select()
  .from(sessionTable)
  .where(eq(sessionTable.workspaceId, currentWorkspace))
  .orderBy(desc(sessionTable.updatedAt))
```

更高级的长期记忆是向量数据库（Vector Database）——把知识转成向量存储，用语义相似度检索。OpenCode 目前侧重代码智能（LSP），向量记忆是更复杂的扩展方向。

---

## 2.4 Planning：Agent 的规划

### 为什么需要规划

简单任务不需要规划——"读这个文件"、"写入那个内容"，一步就完成。

复杂任务需要拆解——"帮我重构整个认证模块"涉及十几个文件、几十个步骤，如果 Agent 没有规划能力，很可能做到一半迷失方向。

规划解决两个问题：
1. **任务分解**：把复杂任务切成可执行的小步骤
2. **进度追踪**：知道已经完成了什么、下一步是什么

### ReAct 模式：最常见的规划方法

ReAct（**Re**asoning + **Act**ing）是当前最主流的 Agent 规划模式。它通过 System Prompt 让 LLM 显式输出思考过程：

```text
System Prompt 指令：
"在每次行动前，先写出你的思考：
  Thought: <分析当前情况，决定下一步>
  Action: <要调用的工具>
  Action Input: <工具参数>
然后等待 Observation，再继续。"

实际对话：
Thought: 用户想重构认证模块，我需要先了解当前的代码结构
Action: list_directory
Action Input: src/auth/

Observation: [login.ts, register.ts, middleware.ts, types.ts]

Thought: 需要看每个文件的内容才能制定重构方案
Action: read_file
Action Input: src/auth/login.ts

Observation: [文件内容...]

Thought: 发现登录逻辑和验证逻辑混在一起，应该分离...
```

显式的 Thought 步骤让 LLM 的决策更可靠——它被迫先思考再行动，而不是直接猜一个工具调用。

### OpenCode 的 Agent 定义

OpenCode 把规划能力直接编码进 Agent 的 System Prompt。在 `packages/opencode/src/agent/` 目录，每个 Agent 都有明确定义的行为准则：

```typescript
// packages/opencode/src/agent/agent.ts（概念示意）
const primaryAgent = {
  name: "primary",
  system: `你是 OpenCode，一个 AI 编码助手。

  行为准则：
  1. 修改代码前，先读取文件了解现有内容
  2. 执行危险操作（删除文件、运行命令）前，先确认
  3. 完成任务后，总结做了什么、为什么这样做
  4. 如果任务太复杂，拆分成步骤逐步执行

  工作流程：
  - 分析：理解用户需求
  - 探索：读取相关文件
  - 规划：制定修改方案
  - 执行：逐步实施
  - 验证：运行测试确认
  `,
}
```

这就是 OpenCode 的"规划系统"——不是独立的规划模块，而是通过精心设计的 System Prompt 让 LLM 自然地遵循工作流程。

### subagent 模式

复杂任务还可以用 Multi-Agent 方式：一个 primary agent 负责规划，多个 subagent 各自执行具体任务：

```text
primary agent：
  "这个任务需要：
   1. 重构后端 API（交给 subagent-1）
   2. 更新前端组件（交给 subagent-2）
   3. 更新文档（交给 subagent-3）"

subagent-1：专注执行后端重构
subagent-2：专注执行前端更新
subagent-3：专注更新文档
```

OpenCode 支持 `primary` 和 `subagent` 两种模式，我们在第二部分会详细分析。

---

## 2.5 Execution Loop：Agent 的工作循环

### Loop 的基本结构

Execution Loop（执行循环）是把前四个组件串联起来的控制逻辑：

```typescript
// 伪代码，展示 Agent Loop 的核心结构
async function agentLoop(userMessage: string) {
  // 把用户消息加入历史
  messages.push({ role: "user", content: userMessage })

  while (true) {
    // 1. 调用 LLM，传入当前对话历史 + 工具定义
    const response = await llm.call({
      messages,
      tools: availableTools,
    })

    // 2. 把 LLM 响应加入历史
    messages.push({ role: "assistant", content: response })

    // 3. 检查是否需要调用工具
    if (response.type === "text") {
      // LLM 直接输出文本 = 任务完成
      return response.text
    }

    if (response.type === "tool_call") {
      // LLM 要调用工具
      const toolResult = await executeTool(
        response.toolName,
        response.toolArgs
      )

      // 4. 把工具结果加入历史
      messages.push({ role: "tool", content: toolResult })

      // 5. 继续循环（LLM 会看到工具结果，决定下一步）
      continue
    }
  }
}
```

这个循环有一个关键特性：**LLM 每次调用时看到的是完整的对话历史**，包括之前所有的工具调用和结果。这就是为什么 Agent 能"记得"它已经读了哪些文件、执行了哪些命令。

### 循环的终止条件

Loop 什么时候停下来？三种情况：

1. **LLM 输出纯文本**（无工具调用）：任务完成，返回结果
2. **达到最大步骤数**：防止无限循环，`max_steps = 50`
3. **遇到错误**：工具执行失败且无法恢复

```typescript
// OpenCode 的循环终止逻辑（简化）
const MAX_STEPS = 50
let stepCount = 0

while (stepCount < MAX_STEPS) {
  const response = await llm.call(...)

  if (response.finishReason === "stop") {
    // LLM 决定停止，任务完成
    break
  }

  if (response.finishReason === "tool-calls") {
    // LLM 要调用工具，继续循环
    await executeToolCalls(response.toolCalls)
    stepCount++
    continue
  }
}
```

### 流式输出

OpenCode 用流式输出（Streaming）改善用户体验——不是等 LLM 完整回复后再显示，而是一边生成一边展示：

```typescript
// 流式处理：实时展示 LLM 的输出
for await (const chunk of result.fullStream) {
  switch (chunk.type) {
    case "text-delta":
      // 实时展示文字
      ui.appendText(chunk.textDelta)
      break
    case "reasoning":
      // 展示思考过程（如果模型支持）
      ui.appendReasoning(chunk.textDelta)
      break
    case "tool-call":
      // 展示工具调用
      ui.showToolCall(chunk.toolName, chunk.args)
      break
    case "tool-result":
      // 展示工具结果
      ui.showToolResult(chunk.result)
      break
  }
}
```

这是 OpenCode TUI 能实时显示"Agent 在做什么"的底层机制。

### OpenCode 的实际 Loop

OpenCode 的 Loop 在 `packages/opencode/src/session/processor.ts` 实现。相比伪代码，它多处理了：

- **step 边界**：把多个工具调用组织成"步骤"，方便用户追踪进度
- **事件发布**：每个 reasoning/tool call/tool result 都作为事件广播，让 CLI/Web/Desktop 同步更新 UI
- **错误恢复**：工具执行失败时，把错误信息作为 tool_result 发回 LLM，让它决定如何处理
- **权限确认**：高风险操作在执行前暂停，等待用户确认

```text
OpenCode 的完整 Loop 流程：

用户发送消息
  ↓
processor.ts 启动循环
  ↓
llm.ts 调用模型（传入 system prompt + messages + tools）
  ↓
流式接收响应
  ├── text-delta → 广播事件，TUI/Web 实时更新
  ├── reasoning  → 广播事件，显示思考过程
  └── tool-call  → 检查权限 → 执行工具 → 广播结果 → 加入 messages
  ↓
LLM 返回 finish_reason = "stop"
  ↓
保存消息到数据库
  ↓
循环结束
```

---

## 2.6 五个组件的协作

单独看每个组件还不够，真正重要的是它们如何协作：

```text
┌─────────────────────────────────────────────────────┐
│                  Execution Loop                      │
│                                                      │
│  ┌──────────┐   调用   ┌──────────────────────────┐ │
│  │   LLM    │ ──────→  │     Tools Registry        │ │
│  │  (决策)  │ ←──────  │  read / write / bash /... │ │
│  └──────────┘   结果   └──────────────────────────┘ │
│       ↑                                              │
│       │ 对话历史                                     │
│  ┌──────────┐                                        │
│  │  Memory  │                                        │
│  │ (短期/长期)│                                      │
│  └──────────┘                                        │
│       ↑                                              │
│       │ 系统提示词                                   │
│  ┌──────────┐                                        │
│  │ Planning │                                        │
│  │(ReAct规划)│                                       │
│  └──────────┘                                        │
└─────────────────────────────────────────────────────┘
```

**一次典型任务的完整流程**：

```text
用户：帮我找出 src/ 目录下所有使用了 any 类型的地方

第1轮：
  Planning（System Prompt）指导 LLM："先理解任务范围"
  LLM → 调用 glob("src/**/*.ts")
  Memory 记录：工具调用 + 结果（32个文件）

第2轮：
  Memory 提供：对话历史（知道有32个文件）
  LLM → 调用 grep("any", "src/")
  Memory 记录：工具调用 + 结果（发现15处）

第3轮：
  Memory 提供：完整历史（文件列表 + grep结果）
  LLM → 输出文本（汇总报告）
  Loop 检测到 finish_reason = "stop"，退出

最终输出：
  "在 src/ 目录下共发现 15 处 any 类型使用：
   - src/utils/parser.ts:23 - 参数类型未定义
   - src/api/handler.ts:45 - 返回值类型不明确
   ..."
```

每个组件各司其职，缺少任何一个，这个任务都无法完成。

---

## 本章小结

五个组件的核心职责：

| 组件 | 职责 | OpenCode 对应位置 |
|------|------|------------------|
| LLM | 理解意图、决策行动、生成文本 | `session/llm.ts`，通过 Vercel AI SDK |
| Tools | 与外部世界交互 | `tool/registry.ts`，`tool/*.ts` |
| Memory | 维护对话状态、持久化历史 | `session/message-v2.ts`，SQLite |
| Planning | 指导工作流程（ReAct） | `agent/agent.ts`，System Prompt |
| Execution Loop | 串联所有组件，控制循环 | `session/processor.ts` |

### 思考题

1. 为什么 LLM 的上下文窗口限制会影响 Agent 的设计？如果上下文无限大，Memory 组件还需要吗？
2. Tool 的 `description` 对 Agent 行为影响有多大？试想如果把 `read_file` 的描述改成"执行危险操作"，会发生什么？
3. ReAct 模式要求 LLM 显式输出 `Thought:`，这个步骤能省略吗？有什么代价？

---

## 下一章预告

**第3章：OpenCode 项目介绍**

我们将从"理论概念"进入"具体代码"，建立 OpenCode 仓库的整体认知：
- 项目目录结构与模块分工
- 一次任务的完整代码路径
- 客户端/服务器分离架构的设计动机
