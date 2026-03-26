---
title: 补充：代码执行 Agent
description: 子进程沙箱 + 生成-执行-修正循环——让 Agent 真正"动手"运行代码而不只是说代码
---

<PracticeProjectGuide project-id="practice-p27-code-execution" />

## 背景与目标

从 P1 到 P14，Agent 调用的工具都是预定义的函数。但有一类任务，预定义工具覆盖不了：

```
用户：帮我分析这份销售数据的月度趋势

只会说的 Agent：
  "你可以用 reduce 计算每月总销售额，然后排序..."
  → 用户还得自己去写、去跑

会动手的 Agent：
  → 生成代码
  → 在沙箱里运行
  → 拿到结果：[3月: 120万, 7月: 115万, 11月: 108万]
  → 直接给出结论
```

OpenAI 的 Code Interpreter 就是这个能力的产品化版本。本章从零复现它的核心机制。

**本章目标**：

```
沙箱实现   →  Node.js child_process，带超时和输出限制
工具封装   →  把沙箱包装成 execute_code 工具
修正循环   →  代码报错时模型看到错误信息，自动修正重试
```

## 核心概念

### 为什么需要子进程，而不是 eval

直觉上用 `eval()` 执行代码最简单，但有两个致命问题：

| 问题 | eval | child_process |
|------|------|---------------|
| 死循环 | 卡死整个进程，无法超时终止 | kill 子进程即可，主进程不受影响 |
| 变量隔离 | 模型代码可访问你的所有变量 | 独立进程，完全隔离 |

子进程方案：代码写入临时文件 → fork 子进程运行 → 超时就 kill → 完成后删临时文件。

### 错误反馈的重要性

自动修正不需要额外逻辑——它是 Agent 循环的自然结果：

```
代码执行失败
  → 把完整的 stderr 和 exitCode 放入 tool 消息
  → 模型在下一轮看到错误，生成修正后的代码
  → 再次执行
```

关键是把**原始错误信息**完整传给模型，不要在代码层面过滤或翻译。`TypeError: Cannot read properties of undefined` 比"执行失败"能帮助模型做出更准确的修正。

<GenerateExecuteRepairLoopDemo />

## 动手实现

### 第一步：实现沙箱执行器

```ts
// p27-code-execution.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import OpenAI from 'openai'

const execAsync = promisify(exec)
const client = new OpenAI()
const model = process.env.OPENAI_MODEL ?? 'gpt-4o'

interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

async function executeCode(code: string, timeoutMs = 10_000): Promise<ExecutionResult> {
  // 每次执行用独立临时目录
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sandbox-'))
  const filePath = path.join(tmpDir, 'script.js')

  try {
    await fs.writeFile(filePath, code, 'utf-8')

    const { stdout, stderr } = await execAsync(`node "${filePath}"`, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,  // 1MB 输出上限
      cwd: tmpDir,
    })

    return { stdout, stderr, exitCode: 0, timedOut: false }
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: string
      stderr?: string
      code?: number
      killed?: boolean
    }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? String(err),
      exitCode: typeof e.code === 'number' ? e.code : 1,
      timedOut: e.killed === true,
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

function formatResult(result: ExecutionResult): string {
  if (result.timedOut) {
    return '执行超时（超过10秒）。请检查是否有死循环。'
  }
  const parts: string[] = []
  if (result.stdout.trim()) parts.push(`输出：\n${result.stdout.trim()}`)
  if (result.stderr.trim()) parts.push(`错误：\n${result.stderr.trim()}`)
  if (result.exitCode !== 0) parts.push(`退出码：${result.exitCode}`)
  return parts.join('\n\n') || '执行成功，无输出。'
}
```

### 第二步：定义工具并配置 Agent

```ts
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'execute_code',
      description: `在 Node.js 沙箱中执行 JavaScript 代码，返回 stdout 输出。
适合数据处理、计算和分析。限制：无网络访问，10秒超时，1MB输出上限。
如果代码出错，分析错误信息后修正重试。`,
      parameters: {
        type: 'object',
        properties: {
          explanation: { type: 'string', description: '这段代码做什么（一句话）' },
          code: { type: 'string', description: '要执行的 JavaScript 代码，用 console.log 输出结果' }
        },
        required: ['explanation', 'code']
      }
    }
  }
]

interface CodeInput {
  explanation: string
  code: string
}

const systemPrompt = `你是数据分析助手，用 JavaScript 代码处理数据和计算。
遇到数据处理问题时，使用 execute_code 工具生成并运行代码。
代码出错时，仔细阅读错误信息，修正后重试，最多重试3次。`
```

### 第三步：运行 Agent 循环

```ts
async function runCodeAgent(query: string): Promise<void> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ]

  for (let i = 0; i < 8; i++) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
    })

    const message = response.choices[0].message
    messages.push(message)

    if (response.choices[0].finish_reason === 'stop') {
      console.log(`\nAgent: ${message.content}`)
      return
    }

    for (const toolCall of message.tool_calls ?? []) {
      if (toolCall.function.name !== 'execute_code') continue

      const input = JSON.parse(toolCall.function.arguments) as CodeInput
      console.log(`\n[执行] ${input.explanation}`)

      const result = await executeCode(input.code)
      const formatted = formatResult(result)
      console.log(`[结果] ${formatted.slice(0, 300)}`)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: formatted,
      })
    }
  }
}

async function main(): Promise<void> {
  await runCodeAgent(`
    月度销售数据（万元）：
    1月:45, 2月:38, 3月:52, 4月:61, 5月:58, 6月:73,
    7月:69, 8月:82, 9月:78, 10月:91, 11月:105, 12月:118

    请分析：全年总额和月均、增速最快的月份、上下半年对比。
  `)
}

main().catch(console.error)
```

### 运行结果

```
[执行] 计算全年销售统计数据

[结果] 输出：
全年总销售额：870 万元，月均：72.5 万元
环比增速最快：三月（36.8%）
上半年：327 万元，下半年：543 万元，下半年增长 66.1%

Agent: 根据分析结果：
- 全年总销售额 870 万元，月均 72.5 万元
- 三月增速最快（36.8%），可能与春季促销相关
- 下半年销售额比上半年高 66.1%，业务明显提速
- 整体呈上升趋势，建议重点关注下半年业务驱动因素
```

如果代码有语法错误，模型会看到 stderr，在下一次 `execute_code` 调用里生成修正后的代码，自动重试。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `child_process.exec` | 子进程执行，可超时终止，崩溃不影响主进程 |
| `maxBuffer: 1MB` | 防止模型生成打印大量数据的代码撑爆内存 |
| `HOME: tmpDir` | 把 HOME 重定向到临时目录，减少文件系统访问范围 |
| `finally` 清理 | 无论成功失败都删除临时文件，避免文件堆积 |
| 完整错误传递 | 把 stderr 和 exitCode 原样给模型，模型据此修正 |
| 自动修正 | 不需要额外逻辑——错误进入对话历史，模型下轮自然修正 |

## 常见问题

**Q: 子进程能访问我的文件系统和环境变量吗？**

默认能。本章把 HOME 重定向到临时目录减少了意外写入，但没有完全隔离。如果需要更严格的安全性，生产环境建议用 Docker 容器隔离；本章方案适合低风险内部工具和学习场景。

**Q: 如何支持 Python 代码？**

把 `node "${filePath}"` 换成 `python3 "${filePath}"`，文件名改为 `script.py`，工具描述里说明接受 Python 代码即可。

**Q: 超时时间设多长合适？**

数据分析场景 10 秒通常够。注意：超时越长，一次失败的等待成本越高。如果重试上限是 5 次，10 秒超时意味着最坏情况等待 50 秒。根据场景在超时时间和重试次数之间权衡。

## 小结与延伸

代码执行 Agent 把 ReAct 循环（P10）的"行动"从"调用预定义工具"升级为"生成并运行任意代码"——任何可以用代码表达的计算，Agent 都能完成，而不需要提前把每种计算都封装成工具。

接下来：

- **P15**：多 Agent 编排——让规划 Agent 分解任务，代码执行 Agent 负责每个子任务
- **P19**：安全防护——深入研究沙箱安全、提示注入防护和代码执行的风险边界

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p27-code-execution" />
<PracticeProjectActionPanel project-id="practice-p27-code-execution" />
