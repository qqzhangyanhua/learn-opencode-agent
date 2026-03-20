import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

type ModelTier = 'mini' | 'standard' | 'large'
type Complexity = 'simple' | 'medium' | 'complex'

interface ModelConfig {
  id: string
  tier: ModelTier
  inputPricePerMTok: number
  outputPricePerMTok: number
  maxTokens: number
}

interface UsageRecord {
  model: string
  tier: ModelTier
  inputTokens: number
  outputTokens: number
  costUsd: number
  timestamp: number
}

const MODELS: Record<ModelTier, ModelConfig> = {
  mini: {
    id: 'gpt-4o-mini',
    tier: 'mini',
    inputPricePerMTok: 0.15,
    outputPricePerMTok: 0.6,
    maxTokens: 1024,
  },
  standard: {
    id: 'gpt-4o',
    tier: 'standard',
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 10.0,
    maxTokens: 2048,
  },
  large: {
    id: 'gpt-4o',
    tier: 'large',
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 10.0,
    maxTokens: 4096,
  },
}

const COMPLEX_KEYWORDS = [
  '分析',
  '比较',
  '设计',
  '架构',
  '重构',
  '优化',
  'analyze',
  'compare',
  'design',
  'architect',
  'refactor',
  '为什么',
  '权衡',
  '原理',
  '深入',
  'trade-off',
]

const SIMPLE_KEYWORDS = [
  '查询',
  '转换',
  '翻译',
  '格式化',
  '列出',
  'list',
  'convert',
  'translate',
  'format',
  'what is',
  '是什么',
  '几点',
  '多少',
  '定义',
]

function classifyComplexity(message: string, toolCount: number, turnIndex: number): Complexity {
  const length = message.length
  let score = 0

  if (length < 50) score -= 1
  else if (length > 300) score += 1
  if (length > 800) score += 1

  if (toolCount === 0) score -= 1
  else if (toolCount >= 3) score += 1

  const lowerMsg = message.toLowerCase()
  for (const keyword of COMPLEX_KEYWORDS) {
    if (lowerMsg.includes(keyword)) {
      score += 1
      break
    }
  }
  for (const keyword of SIMPLE_KEYWORDS) {
    if (lowerMsg.includes(keyword)) {
      score -= 1
      break
    }
  }

  if (turnIndex >= 5) score += 1

  if (score <= -1) return 'simple'
  if (score >= 2) return 'complex'
  return 'medium'
}

class BudgetTracker {
  private readonly records: UsageRecord[] = []
  private readonly budgetUsd: number

  constructor(budgetUsd: number) {
    this.budgetUsd = budgetUsd
  }

  calculateCost(config: ModelConfig, inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * config.inputPricePerMTok
    const outputCost = (outputTokens / 1_000_000) * config.outputPricePerMTok
    return inputCost + outputCost
  }

  record(config: ModelConfig, inputTokens: number, outputTokens: number): UsageRecord {
    const entry: UsageRecord = {
      model: config.id,
      tier: config.tier,
      inputTokens,
      outputTokens,
      costUsd: this.calculateCost(config, inputTokens, outputTokens),
      timestamp: Date.now(),
    }
    this.records.push(entry)
    return entry
  }

  totalCost(): number {
    return this.records.reduce((sum, record) => sum + record.costUsd, 0)
  }

  remainingBudget(): number {
    return Math.max(0, this.budgetUsd - this.totalCost())
  }

  isOverBudget(): boolean {
    return this.totalCost() >= this.budgetUsd
  }

  printSummary(): void {
    console.log('\n--- Token 用量摘要 ---')
    console.log(`调用次数: ${this.records.length}`)

    const byTier: Record<string, { calls: number; cost: number }> = {}
    for (const record of this.records) {
      const stats = byTier[record.tier] ?? { calls: 0, cost: 0 }
      stats.calls += 1
      stats.cost += record.costUsd
      byTier[record.tier] = stats
    }

    for (const [tier, stats] of Object.entries(byTier)) {
      console.log(`  ${tier}: ${stats.calls} 次, $${stats.cost.toFixed(6)}`)
    }

    console.log(`累计成本: $${this.totalCost().toFixed(6)}`)
    console.log(`剩余预算: $${this.remainingBudget().toFixed(6)}`)
    console.log('---\n')
  }

  getRecords(): ReadonlyArray<UsageRecord> {
    return this.records
  }
}

const COMPLEXITY_TO_TIER: Record<Complexity, ModelTier> = {
  simple: 'mini',
  medium: 'standard',
  complex: 'large',
}

const FALLBACK_CHAINS: Record<ModelTier, ModelTier[]> = {
  large: ['large', 'standard', 'mini'],
  standard: ['standard', 'mini'],
  mini: ['mini'],
}

class ModelRouter {
  private readonly budget: BudgetTracker

  constructor(budget: BudgetTracker) {
    this.budget = budget
  }

  selectModel(
    message: string,
    toolCount: number,
    turnIndex: number,
  ): { config: ModelConfig; complexity: Complexity; fallbackChain: ModelTier[] } {
    const remaining = this.budget.remainingBudget()
    const total = remaining + this.budget.totalCost()
    const ratio = total > 0 ? remaining / total : 1

    if (ratio < 0.2) {
      console.log('[Router] 预算不足 20%，强制使用 Mini')
      return {
        config: MODELS.mini,
        complexity: 'simple',
        fallbackChain: ['mini'],
      }
    }

    const complexity = classifyComplexity(message, toolCount, turnIndex)
    const tier = COMPLEXITY_TO_TIER[complexity]
    const fallbackChain = FALLBACK_CHAINS[tier]

    console.log(
      `[Router] 复杂度=${complexity}, 选择=${tier}, 降级链=[${fallbackChain.join(' → ')}]`,
    )

    return { config: MODELS[tier], complexity, fallbackChain }
  }

  async callWithFallback(
    fallbackChain: ModelTier[],
    messages: OpenAI.ChatCompletionMessageParam[],
    tools?: OpenAI.ChatCompletionTool[],
  ): Promise<{ response: OpenAI.ChatCompletion; usedConfig: ModelConfig }> {
    let lastError: Error | null = null

    for (const tier of fallbackChain) {
      const config = MODELS[tier]

      try {
        console.log(`[Router] 尝试 ${config.id}...`)
        const response = await client.chat.completions.create({
          model: config.id,
          max_tokens: config.maxTokens,
          messages,
          ...(tools && tools.length > 0 ? { tools } : {}),
        })

        const usage = this.budget.record(
          config,
          response.usage?.prompt_tokens ?? 0,
          response.usage?.completion_tokens ?? 0,
        )
        console.log(
          `[Router] ${config.tier} 完成: ${usage.inputTokens} in / ${usage.outputTokens} out, $${usage.costUsd.toFixed(6)}`,
        )

        return { response, usedConfig: config }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.log(`[Router] ${config.id} 失败: ${lastError.message}`)

        const isRetryable =
          lastError.message.includes('rate') ||
          lastError.message.includes('overloaded') ||
          lastError.message.includes('529') ||
          lastError.message.includes('503')

        if (!isRetryable) {
          throw lastError
        }
      }
    }

    throw lastError ?? new Error('所有模型均不可用')
  }
}

const calculatorTool: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'calculator',
    description: '执行数学计算',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，如 "2 + 3 * 4"',
        },
      },
      required: ['expression'],
    },
  },
}

function executeCalculator(expression: string): string {
  const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '')
  if (sanitized !== expression) {
    return '错误：表达式包含非法字符'
  }

  try {
    const result = new Function(`return (${sanitized})`)() as number
    return String(result)
  } catch {
    return `错误：无法计算表达式 "${expression}"`
  }
}

async function costAwareAgentLoop(userMessages: string[]): Promise<void> {
  const budget = new BudgetTracker(0.01)
  const router = new ModelRouter(budget)
  const tools: OpenAI.ChatCompletionTool[] = [calculatorTool]

  const systemPrompt = [
    '你是一个成本感知的 AI 助手。',
    '用最简洁的方式回答问题。',
    '如果需要计算，使用 calculator 工具。',
  ].join('\n')

  for (let turn = 0; turn < userMessages.length; turn += 1) {
    const userMsg = userMessages[turn]
    console.log(`\n${'='.repeat(60)}`)
    console.log(`用户 [Turn ${turn}]: ${userMsg}`)
    console.log('='.repeat(60))

    if (budget.isOverBudget()) {
      console.log('[Agent] 预算已耗尽，停止处理')
      break
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ]
    const { fallbackChain } = router.selectModel(userMsg, tools.length, turn)

    let done = false
    while (!done) {
      const { response, usedConfig } = await router.callWithFallback(fallbackChain, messages, tools)

      const message = response.choices[0].message
      const toolCalls = message.tool_calls ?? []

      if (response.choices[0].finish_reason === 'stop' || toolCalls.length === 0) {
        console.log(`\n助手 [${usedConfig.tier}]: ${message.content ?? ''}`)
        done = true
      } else {
        messages.push(message)

        for (const toolCall of toolCalls) {
          if (toolCall.type !== 'function') continue

          if (toolCall.function.name !== 'calculator') {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `未知工具: ${toolCall.function.name}`,
            })
            continue
          }

          const input = JSON.parse(toolCall.function.arguments) as { expression: string }
          const result = executeCalculator(input.expression)
          console.log(`[Tool] calculator("${input.expression}") = ${result}`)

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          })
        }
      }
    }
  }

  budget.printSummary()
}

async function main(): Promise<void> {
  const questions = [
    '今天是星期几？',
    '帮我计算一下，如果每月 API 花费 $150，其中 60% 是简单查询，把简单查询从 Standard 切到 Mini 后每月能省多少钱？假设 Mini 价格是 Standard 的 1/4。',
    '请深入分析 OpenAI GPT-4o-mini、GPT-4o 两个模型在 Agent 场景下的性能与成本权衡，从推理能力、响应延迟、工具调用准确性三个维度进行比较。',
  ]

  await costAwareAgentLoop(questions)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
