---
title: 第四篇：会话管理
description: 第四篇：会话管理的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/session/`
> **前置阅读**：第三篇 工具系统
> **学习目标**：理解会话为什么是 OpenCode 的产品骨架，以及消息、流式输出、压缩、回滚和持久化为什么都必须围绕 session 建模

---

<SourceSnapshotCard
  title="第四篇源码快照"
  description="这一篇先抓会话这根主骨架：一条输入怎样变成持续生长的消息流、怎样被落库、以及怎样在压缩和回滚后继续跑下去。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: '会话入口',
      path: 'packages/opencode/src/session/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/index.ts'
    },
    {
      label: '处理主循环',
      path: 'packages/opencode/src/session/processor.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/processor.ts'
    },
    {
      label: '上下文压缩',
      path: 'packages/opencode/src/session/compaction.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/compaction.ts'
    },
    {
      label: '会话落库模型',
      path: 'packages/opencode/src/session/session.sql.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/session.sql.ts'
    }
  ]"
/>

## 核心概念速览

如果工具系统解决的是“Agent 能做什么”，那么会话系统解决的就是：

**Agent 做过什么、正在做什么、以及之后还能不能接着做。**

在当前仓库里，session 不是简单聊天记录，而是同时承载：

- 用户输入
- assistant 输出
- 工具调用过程
- 子任务关系
- revert 状态
- summary / compaction 状态
- 权限和 todo 等治理信息

所以这一篇最该带着去读的问题是：

**为什么 OpenCode 几乎所有用户可见行为，最后都会落到 session 上。**

## 本章导读

### 这一章解决什么问题

这一章要解决的是：

- session 在 OpenCode 里到底保存什么
- 一条用户输入怎样变成流式 assistant 输出
- 工具调用、子任务、回滚、压缩为什么都挂在会话层
- 长会话如何在可恢复和可继续之间保持平衡

### 必看入口

- [packages/opencode/src/session/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/index.ts)：会话核心入口
- [packages/opencode/src/session/processor.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/processor.ts)：消息处理主链路
- [packages/opencode/src/session/prompt.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/prompt.ts)：提示词组装与上下文进入点
- [packages/opencode/src/session/compaction.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/compaction.ts)：上下文压缩
- [packages/opencode/src/session/revert.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/revert.ts)：回滚与恢复

### 一张图先建立感觉

```text
用户输入
  -> session/index.ts 建会话 / 追加消息
  -> prompt.ts 组装上下文
  -> processor.ts 驱动模型与工具
  -> message / part 持续流式写入
  -> session.sql.ts 落库
  -> compaction / retry / revert 治理长链路
```

### 先抓一条主链路

建议先只顺着这一条线读：

```text
用户输入
  -> session/index.ts 建立和更新会话
  -> processor.ts 驱动模型与工具执行
  -> 流式 part 持续写入
  -> session.sql.ts / storage 落库
  -> compaction / revert 处理长链路和失败路径
```

这样你先看懂“消息为什么会不断长出来”，再去看 compaction、retry、revert 这些后续治理逻辑。

### 初学者阅读顺序

1. 先读 `session/index.ts`，建立 `session -> message -> part` 三层模型。
2. 再读 `processor.ts` 和 `prompt.ts`，理解一轮对话怎样驱动模型与工具。
3. 最后补读 `compaction.ts`、`revert.ts`、`retry.ts`，理解长会话为什么必须有恢复机制。

### 最容易误解的点

- session 不是聊天记录表，它是整个 Agent 运行历史的产品骨架。
- SSE、流式输出、工具过程和 summary 都不是附加功能，而是会话层的一部分。
- compaction 不是“删历史消息”，而是一次有策略的上下文重建。

## 4.1 会话的数据模型设计

### 会话在 OpenCode 里到底承载什么

在 OpenCode 中，**会话不是一段聊天文本，而是一段可持续恢复的运行历史**。落到结构上，可以先记成三层：

- Session：一次完整任务的容器
- Message：一次用户或助手发言
- Part：消息内部可独立流式更新的最小单元

### 数据库 Schema

打开 `packages/opencode/src/session/session.sql.ts`，先看 `SessionTable`：

```typescript
export const SessionTable = sqliteTable("session", {
  id: text().$type<SessionID>().primaryKey(),
  project_id: text().$type<ProjectID>().notNull()
    .references(() => ProjectTable.id, { onDelete: "cascade" }),
  workspace_id: text().$type<WorkspaceID>(),
  parent_id: text().$type<SessionID>(),  // 父会话（subagent 调用）
  slug: text().notNull(),                 // URL 友好的标识符
  directory: text().notNull(),            // 工作目录
  title: text().notNull(),                // 会话标题
  version: text().notNull(),              // OpenCode 版本
  share_url: text(),                      // 分享链接
  summary_additions: integer(),           // 摘要：新增行数
  summary_deletions: integer(),           // 摘要：删除行数
  summary_files: integer(),               // 摘要：修改文件数
  summary_diffs: text({ mode: "json" }).$type<Snapshot.FileDiff[]>(),
  revert: text({ mode: "json" }).$type<{ messageID: MessageID; ... }>(),
  permission: text({ mode: "json" }).$type<PermissionNext.Ruleset>(),
  ...Timestamps,  // time_created, time_updated
  time_compacting: integer(),  // 压缩时间
  time_archived: integer(),    // 归档时间
})
```

这张表里最值得先抓的字段有：
- `parent_id`：如果是 `Subagent` 调用，指向父会话
- `slug`：用于生成分享链接（如 `opncd.ai/s/abc123`）
- `summary_*`：会话摘要（修改了多少文件、多少行）
- `revert`：撤销信息（可以回滚到某个消息）
- `permission`：会话级别的权限覆盖

### Message 表

`session.sql.ts` 里紧接着把 `MessageTable` 单独拆出来：

```typescript
export const MessageTable = sqliteTable("message", {
  id: text().$type<MessageID>().primaryKey(),
  session_id: text().$type<SessionID>().notNull()
    .references(() => SessionTable.id, { onDelete: "cascade" }),
  ...Timestamps,
  data: text({ mode: "json" }).notNull().$type<InfoData>(),
})
```

这里可以先抓住一个设计取向：Message 这一层尽量薄，具体内容更多落在 `data` JSON 里，删除时再通过级联关系跟着 Session 一起清理。

### Part 表

`session.sql.ts` 里再用 `PartTable` 把消息内部结构拆细：

```typescript
export const PartTable = sqliteTable("part", {
  id: text().$type<PartID>().primaryKey(),
  message_id: text().$type<MessageID>().notNull()
    .references(() => MessageTable.id, { onDelete: "cascade" }),
  session_id: text().$type<SessionID>().notNull(),
  ...Timestamps,
  data: text({ mode: "json" }).notNull().$type<PartData>(),
})
```

`Part` 才是真正支撑流式体验的层级。当前常见类型包括：
- `SnapshotPart`：文件快照
- `PatchPart`：文件补丁
- `TextPart`：文本内容
- `ToolPart`：工具调用
- `ReasoningPart`：推理过程（如 o1 模型）
- `FilePart`：文件附件

### 数据模型的层次结构

```
Session (会话)
  ├── Message 1 (用户消息)
  │   ├── Part 1: TextPart ("帮我重构这个函数")
  │   └── Part 2: FilePart (附件)
  ├── Message 2 (助手消息)
  │   ├── Part 1: ReasoningPart (推理过程)
  │   ├── Part 2: TextPart ("我来帮你重构")
  │   ├── Part 3: ToolPart (调用 read 工具)
  │   ├── Part 4: ToolPart (调用 edit 工具)
  │   └── Part 5: TextPart ("重构完成")
  └── Message 3 (用户消息)
      └── Part 1: TextPart ("谢谢")
```

这套拆分的价值在于：

1. 一条消息可以同时容纳文本、推理、工具过程和文件附件
2. 流式输出可以只更新某个 Part，而不用整条消息重写
3. 不同内容类型有稳定结构，后续落库、回滚和渲染都更容易收口

---

## 4.2 消息流处理与状态机

### 消息处理流程

打开 `packages/opencode/src/session/processor.ts`，看消息处理主循环：

```typescript
async process(streamInput: LLM.StreamInput) {
  while (true) {
    const stream = await LLM.stream(streamInput)

    for await (const value of stream.fullStream) {
      input.abort.throwIfAborted()

      switch (value.type) {
        case "start":
          SessionStatus.set(input.sessionID, { type: "busy" })
          break

        case "reasoning-start":
          // 创建 ReasoningPart
          const reasoningPart = {
            id: PartID.ascending(),
            messageID: input.assistantMessage.id,
            sessionID: input.assistantMessage.sessionID,
            type: "reasoning" as const,
            text: "",
            time: { start: Date.now() },
          }
          await Session.updatePart(reasoningPart)
          break

        case "reasoning-delta":
          // 更新推理文本
          part.text += value.text
          await Session.updatePartDelta({
            sessionID: part.sessionID,
            messageID: part.messageID,
            partID: part.id,
            field: "text",
            delta: value.text,
          })
          break

        case "reasoning-end":
          // 结束推理
          part.text = part.text.trimEnd()
          part.time.end = Date.now()
          await Session.updatePart(part)
          break

        case "text-delta":
          // 更新文本内容
          if (!currentText) {
            currentText = {
              id: PartID.ascending(),
              messageID: input.assistantMessage.id,
              sessionID: input.assistantMessage.sessionID,
              type: "text",
              text: "",
            }
            await Session.updatePart(currentText)
          }
          currentText.text += value.textDelta
          await Session.updatePartDelta({
            sessionID: currentText.sessionID,
            messageID: currentText.messageID,
            partID: currentText.id,
            field: "text",
            delta: value.textDelta,
          })
          break

        case "tool-call":
          // 工具调用
          const toolPart = {
            id: PartID.ascending(),
            messageID: input.assistantMessage.id,
            sessionID: input.assistantMessage.sessionID,
            type: "tool",
            tool: value.toolName,
            args: value.args,
            state: { status: "pending" },
          }
          toolcalls[value.toolCallId] = toolPart
          await Session.updatePart(toolPart)
          break

        case "finish":
          // 完成
          SessionStatus.set(input.sessionID, { type: "idle" })
          return { type: "success" }
      }
    }
  }
}
```

**流程图**：

```
用户输入
  ↓
创建 User Message
  ↓
创建 Assistant Message
  ↓
调用 LLM.stream()
  ↓
处理流式事件
  ├─ reasoning-start → 创建 ReasoningPart
  ├─ reasoning-delta → 更新推理文本
  ├─ reasoning-end → 结束推理
  ├─ text-delta → 更新文本
  ├─ tool-call → 创建 ToolPart
  ├─ tool-result → 执行工具，更新 ToolPart
  └─ finish → 完成
```

### 状态机设计

**会话状态**（`session/status.ts`）：
```typescript
type Status =
  | { type: "idle" }           // 空闲
  | { type: "busy" }           // 处理中
  | { type: "compacting" }     // 压缩中
  | { type: "error", error: string }  // 错误
```

**工具调用状态**：
```typescript
type ToolState =
  | { status: "pending" }      // 等待执行
  | { status: "running" }      // 执行中
  | { status: "completed", output: string }  // 完成
  | { status: "error", error: string }       // 错误
```

### 错误处理与重试

看 `session/retry.ts`：

```typescript
export namespace SessionRetry {
  const MAX_RETRIES = 3

  export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
      onRetry?: (attempt: number, error: Error) => void
    }
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // 判断是否可重试
        if (!isRetryable(error)) {
          throw error
        }

        // 通知重试
        options.onRetry?.(attempt, error)

        // 指数退避
        await sleep(Math.pow(2, attempt) * 1000)
      }
    }

    throw lastError!
  }

  function isRetryable(error: Error): boolean {
    // 网络错误可重试
    if (error.message.includes("ECONNREFUSED")) return true
    if (error.message.includes("ETIMEDOUT")) return true

    // API 错误根据状态码判断
    if (error instanceof MessageV2.APIError) {
      return error.isRetryable
    }

    return false
  }
}
```

**可重试的错误**：
- 网络错误（连接超时、连接拒绝）
- 429 Too Many Requests
- 500 Internal Server Error
- 503 Service Unavailable

**不可重试的错误**：
- 401 Unauthorized（认证失败）
- 400 Bad Request（参数错误）
- 上下文溢出（Context Overflow）

---

## 4.3 上下文压缩（Compaction）策略

### 压缩在这里解决什么约束

LLM 的上下文窗口始终是硬约束，例如长会话很容易逼近模型上限。

OpenCode 的处理思路不是等彻底溢出再报错，而是提前压缩旧消息，只保留后续推理仍然需要的关键信息。

### 压缩触发条件

`packages/opencode/src/session/compaction.ts` 里先判断是否接近上下文上限：

```typescript
export async function isOverflow(input: {
  tokens: MessageV2.Assistant["tokens"]
  model: Provider.Model
}) {
  const config = await Config.get()
  if (config.compaction?.auto === false) return false

  const context = input.model.limit.context
  if (context === 0) return false  // 无限上下文

  const count = input.tokens.total ||
    input.tokens.input + input.tokens.output +
    input.tokens.cache.read + input.tokens.cache.write

  const reserved = config.compaction?.reserved ??
    Math.min(COMPACTION_BUFFER, ProviderTransform.maxOutputTokens(input.model))

  const usable = input.model.limit.input
    ? input.model.limit.input - reserved
    : context - ProviderTransform.maxOutputTokens(input.model)

  return count >= usable
}
```

从当前实现看，触发逻辑可以概括成：
- 当前 tokens 数量 >= 可用上下文 - 保留空间
- 保留空间默认 20,000 tokens（用于输出）

### 压缩策略：Prune（修剪）

`compaction.ts` 里的 `prune()` 负责先做一轮轻量裁剪：

```typescript
export async function prune(input: { sessionID: SessionID }) {
  const msgs = await Session.messages({ sessionID: input.sessionID })
  let total = 0
  let pruned = 0
  const toPrune = []
  let turns = 0

  // 从最新消息往前遍历
  for (let msgIndex = msgs.length - 1; msgIndex >= 0; msgIndex--) {
    const msg = msgs[msgIndex]
    if (msg.info.role === "user") turns++
    if (turns < 2) continue  // 保护最近 2 轮对话

    // 如果遇到摘要，停止
    if (msg.info.role === "assistant" && msg.info.summary) break

    for (let partIndex = msg.parts.length - 1; partIndex >= 0; partIndex--) {
      const part = msg.parts[partIndex]

      if (part.type === "tool" && part.state.status === "completed") {
        // 跳过受保护的工具（如 skill）
        if (PRUNE_PROTECTED_TOOLS.includes(part.tool)) continue

        // 如果已经压缩过，停止
        if (part.state.time.compacted) break

        const estimate = Token.estimate(part.state.output)
        total += estimate

        // 保护最近 40,000 tokens 的工具调用
        if (total > PRUNE_PROTECT) {
          pruned += estimate
          toPrune.push(part)
        }
      }
    }
  }

  // 如果可以节省超过 20,000 tokens，执行压缩
  if (pruned > PRUNE_MINIMUM) {
    for (const part of toPrune) {
      part.state.time.compacted = Date.now()
      await Session.updatePart(part)
    }
  }
}
```

**Prune 策略**：
1. 保护最近 2 轮对话（不压缩）
2. 保护最近 40,000 tokens 的工具调用
3. 压缩旧的工具调用输出
4. 只有节省超过 20,000 tokens 才执行

**示例**：

```
消息 1 (用户): "分析这个项目"
消息 2 (助手):
  - Part 1: Text "我来分析"
  - Part 2: Tool (read README.md) → 输出 5000 tokens  ← 压缩
  - Part 3: Tool (glob **/*.ts) → 输出 3000 tokens   ← 压缩
  - Part 4: Text "分析完成"
消息 3 (用户): "继续"
消息 4 (助手):
  - Part 1: Tool (read src/index.ts) → 输出 2000 tokens  ← 保留
  - Part 2: Text "..."
```

### 压缩策略：Compaction（摘要）

如果 Prune 还不够，使用 LLM 生成摘要：

```typescript
export async function compact(input: { sessionID: SessionID }) {
  const msgs = await Session.messages({ sessionID: input.sessionID })

  // 1. 选择要压缩的消息（保留最近几轮）
  const toCompress = msgs.slice(0, -10)

  // 2. 调用 compaction Agent 生成摘要
  const summary = await Agent.call({
    agent: "compaction",
    messages: toCompress,
    prompt: "Summarize the conversation so far.",
  })

  // 3. 创建摘要消息
  const summaryMessage = await Session.createMessage({
    sessionID: input.sessionID,
    role: "assistant",
    summary: summary.text,
  })

  // 4. 删除旧消息
  for (const msg of toCompress) {
    await Session.deleteMessage(msg.id)
  }
}
```

**Compaction 策略**：
1. 保留最近 10 轮对话
2. 用 LLM 总结前面的对话
3. 删除旧消息，插入摘要

---

## 4.4 流式响应与 SSE 实现

### 为什么这里必须做流式输出

**传统方式**：
```
用户输入 → 等待 30 秒 → 一次性返回完整响应
```

**流式方式**：
```
用户输入 → 实时显示生成的文本（逐字输出）
```

### SSE（Server-Sent Events）

**位置**：`server/routes/session.ts`

```typescript
app.get("/session/:id/stream", async (c) => {
  const sessionID = c.req.param("id")

  return streamSSE(c, async (stream) => {
    // 订阅会话事件
    const unsubscribe = Bus.subscribe((event) => {
      if (event.type === "session.part.updated") {
        if (event.data.sessionID === sessionID) {
          // 发送 SSE 事件
          stream.writeSSE({
            event: "part-updated",
            data: JSON.stringify(event.data),
          })
        }
      }
    })

    // 保持连接
    await stream.sleep(Number.MAX_SAFE_INTEGER)

    unsubscribe()
  })
})
```

**SSE 格式**：
```
event: part-updated
data: {"sessionID":"...","messageID":"...","partID":"...","field":"text","delta":"Hello"}

event: part-updated
data: {"sessionID":"...","messageID":"...","partID":"...","field":"text","delta":" world"}

event: finish
data: {"sessionID":"..."}
```

### 前端接收 SSE

```typescript
// packages/app/src/session.tsx
const eventSource = new EventSource(`/session/${sessionID}/stream`)

eventSource.addEventListener("part-updated", (event) => {
  const data = JSON.parse(event.data)

  // 更新 UI
  updatePart(data.partID, (part) => {
    if (data.field === "text") {
      part.text += data.delta
    }
  })
})

eventSource.addEventListener("finish", () => {
  eventSource.close()
})
```

### 增量更新机制

看 `session/index.ts`：

```typescript
export async function updatePartDelta(input: {
  sessionID: SessionID
  messageID: MessageID
  partID: PartID
  field: string
  delta: string
}) {
  // 1. 发布事件（通过 SSE 发送给前端）
  await Bus.publish(PartDeltaEvent, {
    sessionID: input.sessionID,
    messageID: input.messageID,
    partID: input.partID,
    field: input.field,
    delta: input.delta,
  })

  // 2. 批量更新数据库（每 100ms 一次）
  batchUpdate(input.partID, input.field, input.delta)
}

const batchUpdate = debounce((partID, field, delta) => {
  // 更新数据库
  Database.update(PartTable)
    .set({ data: /* 追加 delta */ })
    .where(eq(PartTable.id, partID))
}, 100)
```

**设计思想**：
- 实时发送事件给前端（SSE）
- 批量更新数据库（减少写入次数）

---

## 4.5 会话持久化与恢复

### 持久化策略

**SQLite 存储**：
- 位置：`~/.opencode/opencode.db`
- 引擎：Drizzle ORM
- 模式：WAL（Write-Ahead Logging）

**数据写入时机**：
1. 创建会话 → 立即写入
2. 创建消息 → 立即写入
3. 创建 Part → 立即写入
4. 更新 Part → 批量写入（100ms 间隔）

### 会话恢复

```typescript
export async function resume(sessionID: SessionID) {
  // 1. 从数据库加载会话
  const session = await Session.get(sessionID)
  if (!session) throw new NotFoundError("Session not found")

  // 2. 加载所有消息
  const messages = await Session.messages({ sessionID })

  // 3. 恢复工作目录
  Instance.setDirectory(session.directory)

  // 4. 恢复权限
  if (session.permission) {
    PermissionNext.setOverride(sessionID, session.permission)
  }

  // 5. 返回会话状态
  return {
    session,
    messages,
    lastMessage: messages[messages.length - 1],
  }
}
```

### 会话导出与导入

**导出**（`cli/cmd/export.ts`）：

```typescript
export async function exportSession(sessionID: SessionID) {
  const session = await Session.get(sessionID)
  const messages = await Session.messages({ sessionID })

  const data = {
    version: "1.0",
    session: {
      id: session.id,
      title: session.title,
      directory: session.directory,
    },
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.info.role,
      parts: msg.parts,
    })),
  }

  // 写入 JSON 文件
  await Filesystem.write("session.json", JSON.stringify(data, null, 2))
}
```

**导入**（`cli/cmd/import.ts`）：

```typescript
export async function importSession(filePath: string) {
  const data = JSON.parse(await Filesystem.readText(filePath))

  // 1. 创建新会话
  const session = await Session.create({
    projectID: Instance.project.id,
    directory: data.session.directory,
    title: data.session.title,
  })

  // 2. 导入消息
  for (const msg of data.messages) {
    await Session.createMessage({
      sessionID: session.id,
      role: msg.role,
      parts: msg.parts,
    })
  }

  return session
}
```

---

## 本章小结

### 核心概念

1. **会话的三层结构**
   - Session：会话元数据
   - Message：消息（用户/助手）
   - Part：消息的组成部分（文本/工具/推理）

2. **消息流处理**
   - 流式事件：reasoning/text/tool-call/finish
   - 状态机：idle → busy → idle
   - 错误重试：指数退避，最多 3 次

3. **上下文压缩**
   - Prune：删除旧工具调用输出
   - Compaction：用 LLM 生成摘要
   - 触发条件：tokens 接近上下文限制

4. **流式响应**
   - SSE：Server-Sent Events
   - 增量更新：实时发送 delta
   - 批量写入：减少数据库压力

5. **持久化与恢复**
   - SQLite + Drizzle ORM
   - 导出/导入：JSON 格式
   - 会话恢复：加载状态 + 恢复环境

### 关键代码位置

| 功能 | 文件路径 |
|------|---------|
| 数据库 Schema | `packages/opencode/src/session/session.sql.ts` |
| 会话管理 | `packages/opencode/src/session/index.ts` |
| 消息处理器 | `packages/opencode/src/session/processor.ts` |
| 上下文压缩 | `packages/opencode/src/session/compaction.ts` |
| 消息定义 | `packages/opencode/src/session/message-v2.ts` |
| 重试逻辑 | `packages/opencode/src/session/retry.ts` |

### 设计模式总结

#### 1. 事件驱动架构

```typescript
// 发布事件
await Bus.publish(PartUpdatedEvent, { partID, delta })

// 订阅事件
Bus.subscribe((event) => {
  if (event.type === "part-updated") {
    // 处理更新
  }
})
```

**好处**：
- 解耦组件
- 支持多个订阅者（SSE、日志、插件）

#### 2. 批量更新模式

```typescript
const batchUpdate = debounce((partID, field, delta) => {
  // 批量写入数据库
}, 100)
```

**好处**：
- 减少数据库写入次数
- 提高性能

#### 3. 分层存储模式

```
内存（实时）
  ↓ 批量写入
SQLite（持久化）
  ↓ 导出
JSON（备份/分享）
```

**好处**：
- 实时响应
- 数据安全
- 可移植

### 源码阅读路径

1. 先读 `packages/opencode/src/session/index.ts`，看 `Session.Info`、`messages()`、`updateMessage()` 这些核心入口。
2. 再读 `packages/opencode/src/session/processor.ts` 和 `prompt.ts`，理解一条用户消息怎样变成流式 assistant 输出。
3. 最后读 `compaction.ts` 和 `revert.ts`，理解长会话和错误路径为什么也是会话系统的一部分。

### 任务

判断 OpenCode 的会话系统为什么首先是一条持续生长的消息协议，而不只是把聊天记录写进数据库。

### 操作

1. 打开 `packages/opencode/src/session/index.ts`，画出 `session -> message -> part` 三层关系，并各写一句它们分别保存什么。
2. 再读 `packages/opencode/src/session/processor.ts` 和 `prompt.ts`，顺着一条用户输入追到最终 assistant 输出与消息落库的位置。
3. 最后读 `compaction.ts` 和 `revert.ts`，确认长会话压缩和状态回退为什么也属于会话主链路的一部分。

### 验收

完成后你应该能说明：

- 为什么会话层真正管理的是消息生命周期，而不是单纯的历史文本。
- 为什么 `processor.ts`、`prompt.ts` 和落库结构必须一起理解。
- 为什么压缩、回退和恢复路径不是补丁，而是长链路系统的基础能力。

### 下一篇预告

**第五篇：多模型支持（Provider System）**

我们将深入 `packages/opencode/src/provider/` 目录，学习：
- 提供商抽象层设计
- 统一的 AI SDK 接口
- 模型能力适配与转换
- 添加新提供商的完整流程
- 本地模型集成实践

---

### 思考题

1. 为什么 Part 表需要同时存储 `message_id` 和 `session_id`？
2. Prune 和 Compaction 有什么区别？什么时候用哪个？
3. 为什么要用 SSE 而不是 WebSocket？

（提示：答案都在本章的代码示例中）
