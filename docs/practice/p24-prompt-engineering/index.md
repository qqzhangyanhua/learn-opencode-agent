---
title: 补充：Prompt Engineering 基础
description: System Prompt 三层结构、Few-Shot 示例、Chain-of-Thought——写出真正让模型按预期工作的提示词
---

<PracticeProjectGuide project-id="practice-p24-prompt-engineering" />

## 背景与目标

同样的 Agent 代码，同样的模型，你和另一个人问了同样的问题——他拿到清晰、准确、格式规范的输出，你拿到一团废话。

问题不在代码，不在模型，在 Prompt。

最常见的 system prompt 写法：

```
'你是一个代码审查助手。'
```

模型收到后会做它认为合理的任何事——有时候好，有时候完全偏题。这不是模型的问题，而是指令太模糊，模型无法推断你真正需要什么。

**本章目标**：

```
System Prompt 三层结构  →  角色 + 约束 + 输出格式
Few-Shot 示例          →  用例子固定输出格式和风格
Chain-of-Thought       →  触发显式推理，提升复杂任务准确率
```

## 核心概念

### System Prompt 的三层结构

有效的 system prompt 包含三层，缺一不可：

<PromptLayerComposerDemo />

| 层级 | 作用 | 举例 |
|------|------|------|
| 角色定义 | 你是谁，面向什么用户 | "你是 TypeScript 代码审查专家，服务中级开发者" |
| 行为约束 | 不做什么，如何处理边界 | "只审查代码质量，不评论业务逻辑" |
| 输出格式 | 期望什么结构 | "按 critical/warning/suggestion 分组，末尾给评分" |

只有角色没有约束和格式，模型会自由发挥。三层同时具备，输出才可预期。

### Few-Shot 的工作原理

模型不只学指令，也学**例子**。在 `messages` 数组里用 `user`/`assistant` 对模拟示例，模型下次回答时会模仿例子的格式和风格：

```
[system] 你是信息提取助手，输出 JSON...
[user]   示例输入 A
[assistant] { "result": "示例输出 A" }   ← 例子
[user]   真实输入 B                       ← 模型会模仿例子的格式
```

**关键原则**：2-3 个高质量例子胜过 10 个模糊例子。例子质量差比没有例子更糟——模型会把错误格式也学进去。

### Chain-of-Thought 为什么有效

LLM 生成 token 是顺序的，每个 token 依赖前面所有 token。让模型先写出推理步骤，这些步骤本身成为生成最终答案的上下文，准确率因此显著提升。

对比：

```
不加 CoT：判断这段代码有没有并发问题 → 回答可能是直觉式的
加 CoT：  先分析执行顺序，再分析并发场景，再给出结论 → 推理过程成为证据
```

触发 CoT 的常用写法：**"请一步步分析"**、**"先分析 X，再分析 Y，最后给出结论"**。

## 动手实现

### 第一步：写有三层结构的 System Prompt

```ts
// p24-prompt-engineering.ts
import OpenAI from 'openai'

const client = new OpenAI()

// 弱版本：只有角色
const weakPrompt = `你是一个代码审查助手。`

// 强版本：三层结构
const strongPrompt = `你是一个专注于 TypeScript 的代码审查专家，服务中级开发者。

行为约束：
- 只审查代码质量（类型安全、错误处理、性能、安全性），不评论业务逻辑
- 代码片段不完整时，明确指出哪些部分无法评估
- 发现安全漏洞时优先指出，放在最前

分析步骤：
1. 识别代码主要功能
2. 检查类型安全和运行时错误风险
3. 检查错误处理完整性
4. 检查安全漏洞
5. 综合评分

输出格式：
- 整体评价（1-2句）
- 问题列表（按 critical / warning / suggestion 分组，每项附改进建议）
- 综合评分（1-10）`
```

### 第二步：加入 Few-Shot 示例

```ts
// Few-Shot 示例固定输出格式
const fewShotExample: OpenAI.ChatCompletionMessageParam[] = [
  {
    role: 'user',
    content: `审查这段代码：
async function getUser(id: string) {
  const result = await db.query(\`SELECT * FROM users WHERE id = \${id}\`)
  return result[0]
}`
  },
  {
    role: 'assistant',
    content: `**整体评价**：存在严重安全漏洞，需立即修复。

**问题列表**：

critical:
- SQL 注入漏洞：直接拼接用户输入到 SQL 语句
  改进：使用参数化查询 \`db.query('SELECT * FROM users WHERE id = ?', [id])\`

warning:
- 未处理空结果：\`result[0]\` 可能是 \`undefined\`
  改进：返回类型改为 \`User | undefined\`，调用方做判断

suggestion:
- 缺少返回类型注解，建议标注 \`Promise<User | undefined>\`

**综合评分**：3/10`
  }
]
```

### 第三步：用 CoT 触发显式推理

```ts
async function reviewCode(code: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: strongPrompt },
    ...fewShotExample,
    { role: 'user', content: `审查这段代码：\n\n${code}` }
  ]

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages,
  })

  console.log(response.choices[0].message.content)
}

// 测试：并发问题，CoT 步骤会帮模型发现 read-modify-write 竞争
const testCode = `
async function updateUserBalance(userId: string, amount: number) {
  const user = await db.getUser(userId)
  user.balance += amount
  await db.saveUser(user)
}`

reviewCode(testCode).catch(console.error)
```

### 运行结果

```
**整体评价**：存在并发安全问题，生产环境中多个并发请求会导致数据覆盖。

**问题列表**：

critical:
- 并发竞争（read-modify-write 问题）：两个请求同时读到相同的 balance，
  各自加上 amount 后写回，其中一次修改会被覆盖
  改进：使用数据库层的原子操作 UPDATE users SET balance = balance + $1

warning:
- 未处理 getUser 返回 null 的情况
  改进：加 if (!user) throw new Error(`User ${userId} not found`)

**综合评分**：4/10
```

CoT 步骤（分析执行顺序 → 推导并发场景）让模型发现了并发问题，而不是简单地说"代码看起来没问题"。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| System Prompt 三层 | 角色 + 行为约束 + 输出格式，缺一则输出不可预期 |
| Few-Shot 位置 | 在 `messages` 数组里作为 `user`/`assistant` 对，放在真实输入之前 |
| Few-Shot 质量 | 2-3 个高质量 > 10 个模糊，例子有错模型也会学 |
| CoT 触发 | "请一步步分析" 或直接列出分析维度，让推理过程出现在输出里 |
| CoT 适用场景 | 逻辑推理、安全分析、数学计算；简单问答不需要 |

## 常见问题

**Q: System prompt 写多长合适？**

够用为止。过长的 system prompt 会降低模型对每条指令的关注度（注意力被稀释）。测试时把每条约束逐条验证——如果某条约束去掉后模型行为没有变化，说明它是多余的。

**Q: Few-Shot 示例里的 assistant 消息算输入 token 吗？**

算。每个 Few-Shot 例子都会计入每次请求的 token 消耗。2-3 个例子通常不影响成本；如果例子非常详细（每个 500 token），10 个例子就会增加 5000 token 的固定成本。

**Q: 加了 CoT 之后，响应变慢了怎么办？**

CoT 会让模型输出更多 token，延迟自然增加。权衡方式：只对准确率要求高的操作（安全审查、复杂推理）用 CoT，对简单问答关闭。也可以用流式输出（P3）改善用户感知延迟。

## 小结与延伸

Prompt Engineering 不是一次性工作——它是随 Agent 上线后持续调整的工程过程。每次发现模型输出不符合预期，先想"是哪层出了问题"：角色不清晰、约束不够明确、还是输出格式没定义。

接下来：

- **P10**：ReAct Loop——在复杂推理场景下，CoT 演化为完整的 Thought/Action/Observation 三段式
- **P26**：结构化输出——当输出格式需要机器解析而不只是人读时，用 Zod schema 替代 prompt 约束

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p24-prompt-engineering" />
<PracticeProjectActionPanel project-id="practice-p24-prompt-engineering" />
