---
title: 补充：Human-in-the-Loop
description: 工具风险分级与中断恢复——在高风险操作前让人类参与决策，而不是全程自动执行
---

<PracticeProjectGuide project-id="practice-p28-human-in-loop" />

## 背景与目标

P1 到 P23 的 Agent 有一个隐含假设：**工具可以无条件执行**。这在沙箱环境成立，在生产环境会出问题：

```
任务："清理三个月前的旧日志文件"

Agent 执行：
  → list_files("/var/log/app/") → 分析文件名日期
  → execute_shell("rm -rf /var/log/app/2024-*.log")
  → 成功删除 4.2GB

实际问题：
  文件名格式导致日期判断出错，删掉了昨天的审计日志（不可恢复）
```

Agent 的逻辑没有错，工具调用也成功了。但这个操作不可逆，而且 Agent 的判断可能有误。如果在执行删除前有人确认一下，这个事故就不会发生。

**本章目标**：

```
风险分级   →  safe / review / critical，按等级决定是否确认
同步确认   →  critical 操作在终端要求用户输入确认文字
Interrupt  →  遇到高风险操作时暂停 Agent，等待人类审批后继续
```

## 核心概念

### 哪些操作需要确认

不是所有工具调用都需要打扰用户，这样 Agent 会让人烦透。关键是识别高风险操作：

| 风险等级 | 特征 | 例子 |
|---------|------|------|
| `safe` | 只读、可逆 | `read_file`、`web_search`、`list_files` |
| `review` | 写入，但可恢复 | `write_file`、`create_directory` |
| `critical` | 不可逆或高影响 | `delete_file`、`send_email`、`execute_shell`、`deploy` |

判断标准三问：操作可逆吗？影响范围大吗？Agent 的判断依据充分吗？

### Interrupt / Resume 模式

同步确认适合用户实时在场的 CLI 场景。更复杂的场景需要 Interrupt/Resume：

```
Agent 运行 → 遇到 critical 工具 → 保存状态，返回"等待审批"
                                     ↓
                               人类审批（批准/拒绝）
                                     ↓
                               resume(approved) → Agent 继续执行
```

Agent 不是终止了，而是**暂停**在检查点，等待人类决策后继续。

<ApprovalInterruptResumeDemo />

## 动手实现

### 第一步：定义风险注册表和确认机制

```ts
// p28-human-in-loop.ts
import * as readline from 'readline'
import OpenAI from 'openai'

const client = new OpenAI()
const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

type RiskLevel = 'safe' | 'review' | 'critical'

interface ToolConfig {
  riskLevel: RiskLevel
  description: string
}

// 工具风险注册表：集中管理所有工具的风险配置
const toolRegistry: Record<string, ToolConfig> = {
  read_file:     { riskLevel: 'safe',     description: '读取文件内容' },
  list_files:    { riskLevel: 'safe',     description: '列出目录文件' },
  write_file:    { riskLevel: 'review',   description: '写入文件内容' },
  delete_file:   { riskLevel: 'critical', description: '删除文件（不可恢复）' },
  execute_shell: { riskLevel: 'critical', description: '执行 Shell 命令' },
  send_email:    { riskLevel: 'critical', description: '发送邮件（将实际发出）' },
}

// 同步确认：在终端等待用户输入
async function askConfirmation(
  action: string,
  detail: string,
  requireWord?: string  // critical 级别需要输入特定词才确认
): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  return new Promise(resolve => {
    const prompt = requireWord
      ? `\n[高风险] ${action}\n${detail}\n输入 "${requireWord}" 确认，或 Enter 取消：`
      : `\n[确认] ${action}\n${detail}\n继续？(y/N) `

    rl.question(prompt, answer => {
      rl.close()
      resolve(requireWord ? answer.trim() === requireWord : answer.toLowerCase() === 'y')
    })
  })
}
```

### 第二步：实现带风险检查的工具执行器

```ts
// 根据风险等级决定是否需要确认
async function executeWithRiskCheck(
  toolName: string,
  args: Record<string, unknown>,
  executor: () => Promise<string>
): Promise<string> {
  const config = toolRegistry[toolName] ?? { riskLevel: 'review' as const, description: '未知工具' }

  switch (config.riskLevel) {
    case 'safe':
      return executor()  // 直接执行，不打扰用户

    case 'review': {
      const ok = await askConfirmation(
        `${toolName}: ${config.description}`,
        `参数: ${JSON.stringify(args)}`
      )
      return ok ? executor() : '用户取消了操作'
    }

    case 'critical': {
      const ok = await askConfirmation(
        `${toolName}: ${config.description}`,
        `参数: ${JSON.stringify(args, null, 2)}`,
        'CONFIRM'  // critical 级别需要输入 CONFIRM 才执行
      )
      return ok ? executor() : '用户拒绝了高风险操作'
    }
  }
}
```

### 第三步：实现 Interrupt / Resume 模式

```ts
type AgentStatus = 'running' | 'waiting_approval' | 'completed'

interface PendingAction {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}

interface AgentState {
  messages: OpenAI.ChatCompletionMessageParam[]
  pendingAction: PendingAction | null
  status: AgentStatus
}

class InterruptibleAgent {
  private state: AgentState

  constructor(systemPrompt: string) {
    this.state = {
      messages: [{ role: 'system', content: systemPrompt }],
      pendingAction: null,
      status: 'running',
    }
  }

  // 运行直到遇到 critical 操作，然后暂停
  async run(userInput: string): Promise<AgentState> {
    this.state.messages.push({ role: 'user', content: userInput })
    this.state.status = 'running'

    for (let i = 0; i < 10; i++) {
      const response = await client.chat.completions.create({
        model,
        messages: this.state.messages,
        tools: this.getTools(),
        tool_choice: 'auto',
      })

      const message = response.choices[0].message
      this.state.messages.push(message)

      if (response.choices[0].finish_reason === 'stop') {
        this.state.status = 'completed'
        console.log('\n[Agent]', message.content)
        return this.state
      }

      for (const toolCall of message.tool_calls ?? []) {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        const config = toolRegistry[toolCall.function.name]

        // critical 操作：保存状态，暂停等待审批
        if (config?.riskLevel === 'critical') {
          this.state.status = 'waiting_approval'
          this.state.pendingAction = {
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            args,
          }
          console.log(`\n[暂停] 需要审批操作：${toolCall.function.name}`)
          console.log('原因：', message.content)
          console.log('参数：', JSON.stringify(args, null, 2))
          return this.state
        }

        // safe/review 操作：直接执行
        const result = await this.executeTool(toolCall.function.name, args)
        this.state.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
    }

    this.state.status = 'completed'
    return this.state
  }

  // 人类审批后继续执行
  async resume(approved: boolean): Promise<AgentState> {
    if (this.state.status !== 'waiting_approval' || !this.state.pendingAction) {
      throw new Error('Agent 当前不在等待审批状态')
    }

    const { toolCallId, toolName, args } = this.state.pendingAction
    this.state.pendingAction = null

    const toolResult = approved
      ? await this.executeTool(toolName, args)
      : '操作被审核员拒绝，请换一种方式完成任务'

    this.state.messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: toolResult,
    })

    // 继续执行
    return this.run('')  // 空输入，继续之前的任务
  }

  private getTools(): OpenAI.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: '读取文件内容',
          parameters: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_file',
          description: '永久删除文件，不可恢复',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              reason: { type: 'string' }
            },
            required: ['path', 'reason']
          }
        }
      }
    ]
  }

  private async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    // 实际工具实现（此处为示例）
    switch (name) {
      case 'read_file': return `文件内容：${args['path']} 的内容...`
      case 'delete_file': return `已删除文件：${args['path']}`
      default: return `工具 ${name} 执行完成`
    }
  }
}

async function main(): Promise<void> {
  const agent = new InterruptibleAgent('你是文件管理助手，帮用户整理和清理文件。')

  const checkpoint = await agent.run('请删除 /tmp/old-logs/access.log，它已经过期了')

  if (checkpoint.status === 'waiting_approval') {
    // 模拟人类审批决策（实际场景可以是 HTTP API 回调、Slack 消息等）
    console.log('\n--- 等待人类决策 ---')
    const approved = true  // 人类批准了
    console.log(`审批结果：${approved ? '批准' : '拒绝'}`)

    await agent.resume(approved)
  }
}

main().catch(console.error)
```

### 运行结果

```
[暂停] 需要审批操作：delete_file
原因：我将删除 /tmp/old-logs/access.log，因为你说它已经过期了。
参数：{
  "path": "/tmp/old-logs/access.log",
  "reason": "用户确认文件已过期"
}

--- 等待人类决策 ---
审批结果：批准

[Agent] 已成功删除过期日志文件 /tmp/old-logs/access.log。
```

如果审批结果是拒绝，Agent 会收到拒绝消息，可能会改变策略或通知用户无法完成操作。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 风险注册表 | 集中管理每个工具的风险等级，而不是在工具执行时临时判断 |
| `safe` 直接执行 | 只读操作不打扰用户，避免 Agent 变得烦人 |
| `critical` 需要输入确认词 | 比点 y/n 更有仪式感，让用户真正注意到高风险 |
| 状态保存 | Interrupt/Resume 的关键——暂停时完整保存 messages 和 pendingAction |
| `resume(false)` | 拒绝不等于 Agent 终止，而是让 Agent 知道"这个操作被拒绝了" |

## 常见问题

**Q: 所有 critical 操作都要暂停吗？会不会太频繁？**

由你来定义什么是 critical。本章示例把"删文件"定为 critical，但如果你的 Agent 的主要工作就是整理文件，频繁确认会破坏体验。可以加入"批量授权"机制——用户说"这次任务里的文件删除操作都批准"，之后同类操作不再单独确认。

**Q: 生产环境里，人类审批如何实现？**

本章用 readline 模拟了同步等待。实际生产环境：Agent 暂停时把 `checkpoint` 状态序列化存数据库，通过 Slack/邮件通知审批人；审批人点击批准/拒绝后，系统调用 `agent.resume(approved)` 继续执行。这里的 Interrupt/Resume 模式对此是天然支持的。

**Q: resume 后 Agent 怎么知道从哪里继续？**

`messages` 数组包含了完整对话历史，包括被暂停时的最后一条 assistant 消息（含 tool_calls）和刚刚加入的 tool 结果。模型拿到这个历史，自然知道刚才执行了什么操作，接下来该做什么。

## 小结与延伸

Human-in-the-Loop 不是对 AI 能力的否定，而是对高风险决策的工程保护。随着 Agent 能操作的资源越来越多（文件系统、数据库、邮件、部署流水线），合理的人机协作边界会变得越来越重要。

接下来：

- **P19**：安全防护——HITL 和安全防护是一对互补手段，前者防止正常功能被误用，后者防止恶意注入
- **P22**：完整项目——Code Review Agent 里 `approvable: false` 的 PR 需要人工二次确认，就是 HITL 的一个实际应用

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p28-human-in-loop" />
<PracticeProjectActionPanel project-id="practice-p28-human-in-loop" />
