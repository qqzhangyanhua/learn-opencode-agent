import * as readline from 'readline'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})
const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

type RiskLevel = 'safe' | 'review' | 'critical'
type AgentStatus = 'running' | 'waiting_approval' | 'completed'

interface ToolConfig {
  riskLevel: RiskLevel
  description: string
}

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

const toolRegistry: Record<string, ToolConfig> = {
  read_file: { riskLevel: 'safe', description: '读取文件内容' },
  list_files: { riskLevel: 'safe', description: '列出目录文件' },
  write_file: { riskLevel: 'review', description: '写入文件内容' },
  delete_file: { riskLevel: 'critical', description: '删除文件（不可恢复）' },
  execute_shell: { riskLevel: 'critical', description: '执行 Shell 命令' },
  send_email: { riskLevel: 'critical', description: '发送邮件（将实际发出）' },
}

async function askConfirmation(
  action: string,
  detail: string,
  requireWord?: string,
): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  return new Promise((resolve) => {
    const prompt = requireWord
      ? `\n[高风险] ${action}\n${detail}\n输入 "${requireWord}" 确认，或 Enter 取消：`
      : `\n[确认] ${action}\n${detail}\n继续？(y/N) `

    rl.question(prompt, (answer) => {
      rl.close()
      resolve(requireWord ? answer.trim() === requireWord : answer.toLowerCase() === 'y')
    })
  })
}

async function executeWithRiskCheck(
  toolName: string,
  args: Record<string, unknown>,
  executor: () => Promise<string>,
): Promise<string> {
  const config = toolRegistry[toolName] ?? { riskLevel: 'review' as const, description: '未知工具' }

  switch (config.riskLevel) {
    case 'safe':
      return executor()
    case 'review': {
      const ok = await askConfirmation(
        `${toolName}: ${config.description}`,
        `参数: ${JSON.stringify(args)}`,
      )
      return ok ? executor() : '用户取消了操作'
    }
    case 'critical': {
      const ok = await askConfirmation(
        `${toolName}: ${config.description}`,
        `参数: ${JSON.stringify(args, null, 2)}`,
        'CONFIRM',
      )
      return ok ? executor() : '用户拒绝了高风险操作'
    }
  }
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

  async run(userInput: string): Promise<AgentState> {
    if (userInput.trim()) {
      this.state.messages.push({ role: 'user', content: userInput })
    }
    this.state.status = 'running'

    for (let i = 0; i < 10; i += 1) {
      const response = await client.chat.completions.create({
        model,
        messages: this.state.messages,
        tools: this.getTools(),
        tool_choice: 'auto',
      })

      const message = response.choices[0]?.message
      if (!message) return this.state

      this.state.messages.push(message)

      if (response.choices[0]?.finish_reason === 'stop') {
        this.state.status = 'completed'
        console.log('\n[Agent]', message.content)
        return this.state
      }

      for (const toolCall of message.tool_calls ?? []) {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        const config = toolRegistry[toolCall.function.name]

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

    return this.run('')
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
            required: ['path'],
          },
        },
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
              reason: { type: 'string' },
            },
            required: ['path', 'reason'],
          },
        },
      },
    ]
  }

  private async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    return executeWithRiskCheck(name, args, async () => {
      switch (name) {
        case 'read_file':
          return `文件内容：${args['path']} 的内容...`
        case 'delete_file':
          return `已删除文件：${args['path']}`
        default:
          return `工具 ${name} 执行完成`
      }
    })
  }
}

async function main(): Promise<void> {
  const agent = new InterruptibleAgent('你是文件管理助手，帮用户整理和清理文件。')

  const checkpoint = await agent.run('请删除 /tmp/old-logs/access.log，它已经过期了')

  if (checkpoint.status === 'waiting_approval') {
    console.log('\n--- 等待人类决策 ---')
    const approved = true
    console.log(`审批结果：${approved ? '批准' : '拒绝'}`)
    await agent.resume(approved)
  }
}

main().catch(console.error)
