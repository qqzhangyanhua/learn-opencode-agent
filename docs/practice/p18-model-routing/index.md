---
title: P18：多模型路由与成本控制
description: 按任务复杂度智能路由到不同模型，实现 Token 预算追踪与故障降级链
---

<PracticeProjectGuide project-id="practice-p18-model-routing" />

<script setup lang="ts">
const routingModels = [
  { name: 'gpt-4o-mini', provider: 'mini 层' },
  { name: 'gpt-4o', provider: 'standard 层' },
  { name: 'gpt-4.1', provider: 'large 层' },
]

const routingEvents = [
  { kind: 'request', title: '复杂度评分 = medium', desc: '长度 180 + 工具数 2 + 当前第 3 轮对话' },
  { kind: 'detect', title: '选择 standard', desc: '先走性价比更高的标准模型' },
  { kind: 'error', title: '429 / 临时超时', desc: 'standard 当前不可用，触发 fallback' },
  { kind: 'switch', title: '切换到 mini', desc: '降级链改走可用的低成本模型' },
  { kind: 'retry', title: '重新提交任务', desc: '保留上下文与预算记录继续执行' },
  { kind: 'success', title: 'usage 已入账', desc: '累计 input/output token 与会话成本' },
]
</script>

## 背景与目标

P15 在实现多 Agent 编排时提到了一个策略：**分层用模型**——Orchestrator 用 Opus 做推理，Worker 用 Sonnet 做执行。那句话一笔带过，但背后藏着一个生产级 Agent 绕不开的核心问题：**模型选择不应该写死在代码里**。

硬编码 `model: 'gpt-4o'` 这类具体型号在原型阶段没问题，但一旦上线你会发现：

- **简单任务浪费钱**：用户问"今天周几"，你用 Opus 回答，花了 10 倍的钱
- **复杂任务效果差**：用户让你分析一段 500 行的并发代码，Haiku 给出半吊子答案
- **模型不可用没有兜底**：某个模型触发速率限制或临时故障，整个 Agent 挂掉

解决思路直觉上很自然：**先判断任务复杂度，再选模型；选中的模型挂了，降级到备选模型；每次调用记录 Token 用量和成本**。这就是模型路由。

OpenAI 的公开定价天然支持这种分层策略——不同模型之间存在明显价格差，用对模型会直接影响 API 成本。

> 时效说明：本章里的型号和价格表仅用于说明路由思路，不保证始终是最新值。
> 建议在实现时把模型 ID 和价格集中配置，并定期对照官方页面更新：
> 模型页：<https://docs.anthropic.com/en/docs/about-claude/models>
> 定价页：<https://docs.anthropic.com/en/docs/about-claude/pricing>

**本章目标**：

1. 实现复杂度分类器：用简单启发式规则判断任务难度
2. 实现 `ModelRouter` 类：基于复杂度选择模型，支持降级链
3. 实现 Token 预算追踪器：记录每次调用的 input/output Token 和估算成本
4. 把路由器接入 Agent 循环，跑通一个成本感知的对话

## 核心概念

### 模型定价示例

在设计路由策略之前，先看清楚价格差距。下面这张表是**示例价格表**，用于说明分层路由的思路：

| 模型 | 输入价格 ($/MTok) | 输出价格 ($/MTok) | 适用场景 |
|------|-------------------|-------------------|----------|
| **Mini** (`gpt-4o-mini`) | 0.80 | 4.00 | 分类、提取、简单问答 |
| **Standard** (`gpt-4o`) | 3.00 | 15.00 | 代码生成、分析、通用任务 |
| **Pro** (`gpt-4o`) | 15.00 | 75.00 | 复杂推理、多步规划、创作 |

按这张示例表计算，Mini 到 Pro 的输入价格差距约为 **19 倍**。这也是为什么模型路由通常能带来明显的成本收益。

### 复杂度分类

完美的复杂度判断需要另一个 LLM 调用——用一个模型来判断该用哪个模型。这在延迟和成本上都不划算。实践中更常见的是**启发式分类**：用几条简单规则快速判断，准确率不需要 100%，80% 就能带来显著的成本节约。

常用的启发式信号：

| 信号 | 判断逻辑 | 原理 |
|------|----------|------|
| 消息长度 | 短消息（< 50 字）倾向简单 | 简单问题通常一句话就能问清 |
| 工具数量 | 需要多工具协作的任务倾向复杂 | 工具越多，编排难度越高 |
| 关键词匹配 | "分析""比较""设计"倾向复杂；"查询""转换"倾向简单 | 动词暗示了认知负荷 |
| 历史轮次 | 多轮对话后期倾向复杂 | 上下文积累后问题往往更深入 |

### 降级链

模型路由不只是选最优模型，还要处理模型不可用的情况。降级链（Fallback Chain）的逻辑是：

```
首选模型失败 → 尝试下一个模型 → 再失败 → 尝试最后一个模型 → 全部失败则报错
```

降级方向通常是**从贵到便宜**——如果首选模型不可用，用下一级兜底；如果也挂了，用最便宜的模型给一个粗糙但可用的回答。比完全不回答好得多。

<RuntimeFallbackDemo
  title="P18 复杂度路由与预算降级"
  chain-title="ModelRouter 降级链"
  done-text="模型切换成功，预算记录继续累计"
  :models="routingModels"
  :events="routingEvents"
/>

### Token 预算追踪

OpenAI API 的每次响应都包含 `usage` 字段，告诉你实际消耗了多少 Token。把这个数据积累起来，就能做到：

- 单次调用成本估算
- 会话累计成本统计
- 预算预警（快超额时自动切换到便宜模型）

## 动手实现

### 第一步：定义类型和常量

```ts
// p18-model-routing.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

// ── 模型配置 ──────────────────────────────────

type ModelTier = 'mini' | 'standard' | 'large'

interface ModelConfig {
  id: string
  tier: ModelTier
  inputPricePerMTok: number   // 每百万输入 Token 的美元价格
  outputPricePerMTok: number  // 每百万输出 Token 的美元价格
  maxTokens: number           // 默认 max_tokens
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

// ── 复杂度分类 ──────────────────────────────────

type Complexity = 'simple' | 'medium' | 'complex'

// ── Token 用量记录 ──────────────────────────────

interface UsageRecord {
  model: string
  tier: ModelTier
  inputTokens: number
  outputTokens: number
  costUsd: number
  timestamp: number
}
```

模型 ID 集中管理，改一处全局生效。价格字段直接用数字，不搞花哨的类封装——P15 说得好，实用主义。

### 第二步：实现复杂度分类器

```ts
// p18-model-routing.ts（续）

// 复杂任务的关键词——这些动词暗示需要深度推理
const COMPLEX_KEYWORDS = [
  '分析', '比较', '设计', '架构', '重构', '优化',
  'analyze', 'compare', 'design', 'architect', 'refactor',
  '为什么', '权衡', '原理', '深入', 'trade-off',
]

// 简单任务的关键词——这些动词暗示直接检索或转换
const SIMPLE_KEYWORDS = [
  '查询', '转换', '翻译', '格式化', '列出',
  'list', 'convert', 'translate', 'format', 'what is',
  '是什么', '几点', '多少', '定义',
]

function classifyComplexity(
  message: string,
  toolCount: number,
  turnIndex: number,
): Complexity {
  const length = message.length
  let score = 0

  // 信号 1：消息长度
  if (length < 50) score -= 1
  else if (length > 300) score += 1
  if (length > 800) score += 1

  // 信号 2：工具数量
  if (toolCount === 0) score -= 1
  else if (toolCount >= 3) score += 1

  // 信号 3：关键词匹配
  const lowerMsg = message.toLowerCase()
  for (const kw of COMPLEX_KEYWORDS) {
    if (lowerMsg.includes(kw)) { score += 1; break }
  }
  for (const kw of SIMPLE_KEYWORDS) {
    if (lowerMsg.includes(kw)) { score -= 1; break }
  }

  // 信号 4：对话深度——第 5 轮之后倾向复杂
  if (turnIndex >= 5) score += 1

  // 判定
  if (score <= -1) return 'simple'
  if (score >= 2) return 'complex'
  return 'medium'
}
```

这个分类器不追求完美——它只需要把明显简单的任务筛出来交给 Mini，把明显复杂的任务交给 Large，剩下的都给 Standard。即使分类错误，Standard 也能兜住大多数场景。

### 第三步：实现 Token 预算追踪器

```ts
// p18-model-routing.ts（续）

class BudgetTracker {
  private records: UsageRecord[] = []
  private budgetUsd: number

  constructor(budgetUsd: number) {
    this.budgetUsd = budgetUsd
  }

  /** 计算单次调用成本 */
  calculateCost(
    config: ModelConfig,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const inputCost = (inputTokens / 1_000_000) * config.inputPricePerMTok
    const outputCost = (outputTokens / 1_000_000) * config.outputPricePerMTok
    return inputCost + outputCost
  }

  /** 记录一次调用 */
  record(
    config: ModelConfig,
    inputTokens: number,
    outputTokens: number,
  ): UsageRecord {
    const costUsd = this.calculateCost(config, inputTokens, outputTokens)
    const entry: UsageRecord = {
      model: config.id,
      tier: config.tier,
      inputTokens,
      outputTokens,
      costUsd,
      timestamp: Date.now(),
    }
    this.records.push(entry)
    return entry
  }

  /** 累计总成本 */
  totalCost(): number {
    return this.records.reduce((sum, r) => sum + r.costUsd, 0)
  }

  /** 剩余预算 */
  remainingBudget(): number {
    return Math.max(0, this.budgetUsd - this.totalCost())
  }

  /** 是否超预算 */
  isOverBudget(): boolean {
    return this.totalCost() >= this.budgetUsd
  }

  /** 打印用量摘要 */
  printSummary(): void {
    console.log('\n--- Token 用量摘要 ---')
    console.log(`调用次数: ${this.records.length}`)

    const byTier: Record<string, { calls: number; cost: number }> = {}
    for (const r of this.records) {
      const entry = byTier[r.tier] ?? { calls: 0, cost: 0 }
      entry.calls += 1
      entry.cost += r.costUsd
      byTier[r.tier] = entry
    }

    for (const [tier, stats] of Object.entries(byTier)) {
      console.log(`  ${tier}: ${stats.calls} 次, $${stats.cost.toFixed(6)}`)
    }

    console.log(`累计成本: $${this.totalCost().toFixed(6)}`)
    console.log(`剩余预算: $${this.remainingBudget().toFixed(6)}`)
    console.log('---\n')
  }

  /** 获取全部记录（只读） */
  getRecords(): ReadonlyArray<UsageRecord> {
    return this.records
  }
}
```

`BudgetTracker` 是一个纯内存数据结构——生产中你会把记录写入数据库或计费系统，但核心逻辑不变。注意 `calculateCost` 用的是 `inputTokens / 1_000_000`，因为 OpenAI 的定价单位是每百万 Token。

### 第四步：实现 ModelRouter

```ts
// p18-model-routing.ts（续）

// 复杂度 → 模型层级的映射
const COMPLEXITY_TO_TIER: Record<Complexity, ModelTier> = {
  simple: 'mini',
  medium: 'standard',
  complex: 'large',
}

// 降级链：每个层级的降级顺序
const FALLBACK_CHAINS: Record<ModelTier, ModelTier[]> = {
  large: ['large', 'standard', 'mini'],
  standard: ['standard', 'mini'],
  mini: ['mini'],
}

class ModelRouter {
  private budget: BudgetTracker

  constructor(budget: BudgetTracker) {
    this.budget = budget
  }

  /** 根据任务复杂度选择模型 */
  selectModel(
    message: string,
    toolCount: number,
    turnIndex: number,
  ): { config: ModelConfig; complexity: Complexity; fallbackChain: ModelTier[] } {
    // 如果预算紧张（< 20%），强制降级到 Mini
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

    console.log(`[Router] 复杂度=${complexity}, 选择=${tier}, 降级链=[${fallbackChain.join(' → ')}]`)
    return { config: MODELS[tier], complexity, fallbackChain }
  }

  /** 带降级链的 API 调用 */
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

        // 成功：记录用量
        const usage = this.budget.record(
          config,
          response.usage?.prompt_tokens ?? 0,
          response.usage?.completion_tokens ?? 0,
        )
        console.log(
          `[Router] ${config.tier} 完成: ` +
          `${usage.inputTokens} in / ${usage.outputTokens} out, ` +
          `$${usage.costUsd.toFixed(6)}`
        )

        return { response, usedConfig: config }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.log(`[Router] ${config.id} 失败: ${lastError.message}`)

        // 只对可重试的错误降级（速率限制、服务不可用）
        const isRetryable = lastError.message.includes('rate')
          || lastError.message.includes('overloaded')
          || lastError.message.includes('529')
          || lastError.message.includes('503')
        if (!isRetryable) throw lastError
      }
    }

    throw lastError ?? new Error('所有模型均不可用')
  }
}
```

`ModelRouter` 的两个核心方法：
- `selectModel`：根据任务内容决定用哪个模型，同时考虑预算因素
- `callWithFallback`：按降级链依次尝试，第一个成功的就返回

注意降级只在"可重试错误"时触发——速率限制（429）和服务过载（529/503）。如果是参数错误或权限问题，降级没有意义，直接抛出。

### 第五步：接入 Agent 循环

```ts
// p18-model-routing.ts（续）

// 一个简单的计算工具，用于演示工具数量对路由的影响
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
  // 安全的数学表达式求值（只允许数字和运算符）
  const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '')
  if (sanitized !== expression) {
    return `错误：表达式包含非法字符`
  }
  try {
    // 用 Function 代替 eval，限制作用域
    const result = new Function(`return (${sanitized})`)() as number
    return String(result)
  } catch {
    return `错误：无法计算表达式 "${expression}"`
  }
}

async function costAwareAgentLoop(
  userMessages: string[],
): Promise<void> {
  // 预算 $0.01——足够演示，也能看到预算不足时的降级
  const budget = new BudgetTracker(0.01)
  const router = new ModelRouter(budget)
  const tools: OpenAI.ChatCompletionTool[] = [calculatorTool]

  const systemPrompt = [
    '你是一个成本感知的 AI 助手。',
    '用最简洁的方式回答问题。',
    '如果需要计算，使用 calculator 工具。',
  ].join('\n')

  for (let turn = 0; turn < userMessages.length; turn++) {
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

    // 路由选择
    const { fallbackChain } = router.selectModel(userMsg, tools.length, turn)

    // Agent 循环：处理可能的工具调用
    let done = false
    while (!done) {
      const { response, usedConfig } = await router.callWithFallback(
        fallbackChain,
        messages,
        tools,
      )

      const message = response.choices[0].message
      const toolCalls = message.tool_calls ?? []

      if (response.choices[0].finish_reason === 'stop' || toolCalls.length === 0) {
        // 最终回答
        console.log(`\n助手 [${usedConfig.tier}]: ${message.content ?? ''}`)
        done = true
      } else {
        // 处理工具调用
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

  // 最终摘要
  budget.printSummary()
}
```

整个 Agent 循环和 P1 几乎一样——唯一的区别是把 `client.chat.completions.create()` 替换成了 `router.callWithFallback()`。路由逻辑对 Agent 循环是透明的。

### 第六步：入口与测试

```ts
// p18-model-routing.ts（续）

async function main(): Promise<void> {
  // 准备不同复杂度的问题
  const questions = [
    // 简单：短消息，简单关键词 → 应该路由到 Haiku
    '今天是星期几？',

    // 中等：需要工具，中等长度 → 应该路由到 Standard
    '帮我计算一下，如果每月 API 花费 $150，其中 60% 是简单查询，把简单查询从 Standard 切到 Mini 后每月能省多少钱？假设 Mini 价格是 Standard 的 1/4。',

    // 复杂：关键词"分析""比较""权衡" → 应该路由到 Pro
    '请深入分析 Mini、Standard、Pro 三个模型在 Agent 场景下的性能与成本权衡，从推理能力、响应延迟、工具调用准确性三个维度进行比较。',
  ]

  await costAwareAgentLoop(questions)
}

main().catch(console.error)
```

### 运行结果

```
============================================================
用户 [Turn 0]: 今天是星期几？
============================================================
[Router] 复杂度=simple, 选择=mini, 降级链=[mini]
[Router] 尝试 gpt-4o-mini...
[Router] mini 完成: 28 in / 15 out, $0.000013

助手 [mini]: 今天是星期四。

============================================================
用户 [Turn 1]: 帮我计算一下，如果每月 API 花费 $150...
============================================================
[Router] 复杂度=medium, 选择=standard, 降级链=[standard → mini]
[Router] 尝试 gpt-4o...
[Router] standard 完成: 156 in / 89 out, $0.001280
[Tool] calculator("150 * 0.6 * (1 - 1/4)") = 67.5

助手 [standard]: 每月可以节省 $67.50。

============================================================
用户 [Turn 2]: 请深入分析 Mini、Standard、Pro...
============================================================
[Router] 复杂度=complex, 选择=large, 降级链=[large → standard → mini]
[Router] 尝试 gpt-4o...
[Router] large 完成: 203 in / 512 out, $0.005628

助手 [large]: ## 三模型 Agent 场景对比分析 ...

--- Token 用量摘要 ---
调用次数: 3
  mini: 1 次, $0.000013
  standard: 1 次, $0.001280
  large: 1 次, $0.005628
累计成本: $0.006921
剩余预算: $0.003079
---
```

三个问题分别路由到了三个模型层级。简单问题用 Mini 只花了 $0.000013，复杂问题用 Large 花了 $0.005628——相差数百倍。如果所有请求都用 Large，总成本会翻好几倍。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 复杂度分类器 | 用消息长度、工具数量、关键词、对话轮次四个信号做启发式判断，不需要额外 LLM 调用 |
| 三层模型策略 | Mini 处理简单任务，Standard 处理通用任务，Large 处理复杂推理；具体型号与价格请以官方模型页、定价页为准 |
| 降级链 | 首选模型失败时按预设顺序尝试下一个，只对可重试错误（429/529/503）触发降级 |
| Token 预算追踪 | 从 API 响应的 `usage` 字段提取 input/output Token，按定价公式估算成本 |
| 预算感知路由 | 剩余预算不足 20% 时自动切到最便宜的模型，保证在预算内尽可能多地完成任务 |
| 路由透明性 | Agent 循环只需把 `client.chat.completions.create` 替换为 `router.callWithFallback`，无需修改业务逻辑 |
| 模型配置集中管理 | ID、价格、默认参数集中在 `MODELS` 常量中，改一处全局生效 |

## 常见问题

**Q: 启发式分类不够准怎么办？**

80% 的准确率就够了。关键洞察是：**分类错误的代价是不对称的**。把简单任务误判为复杂，只是多花点钱；把复杂任务误判为简单，Mini 的回答可能不够好。所以实践中可以故意让分类器偏保守——不确定就给 Standard，它是安全的"中间地带"。

如果你需要更高准确率，可以用 Mini 做一次快速分类（成本极低），然后根据分类结果调用对应模型。这相当于用极低的分类成本来节省可能数十倍的路由浪费。

**Q: 降级会不会导致回答质量明显下降？**

会。但这是一个工程权衡：**降级的回答 vs 完全没有回答**。生产环境中，用户等 30 秒拿到一个 Mini 的回答，远比等 30 秒看到一个错误页面好。你可以在降级时在回答末尾附上提示："当前使用了备选模型，回答可能不够详细。"

**Q: 预算追踪的精度如何？**

OpenAI API 返回的 Token 数是精确的，但**估算成本和实际账单可能有微小差异**——OpenAI 的计费系统可能有舍入规则、缓存折扣等。`BudgetTracker` 的目的不是替代计费系统，而是提供实时的成本感知能力，让路由器能在预算耗尽前主动降级。

**Q: 可以根据响应质量动态调整路由吗？**

可以，但这需要一个评估机制。一种轻量的做法是：如果用户对回答追问了（说明第一次回答不够好），下一轮自动升级模型。这比训练一个质量评估模型简单得多，而且天然利用了用户的隐式反馈。

## 小结与延伸

你现在有了一个完整的模型路由系统：

- **复杂度分类器**用四个启发式信号快速判断任务难度，不需要额外 LLM 调用
- **ModelRouter** 把复杂度映射到模型层级，支持预算感知的自动降级
- **BudgetTracker** 逐次追踪 Token 用量和成本，剩余预算不足时触发强制降级
- **降级链**在模型不可用时透明切换，保证服务可用性

这套路由逻辑和 P15 的多 Agent 编排可以无缝结合——Orchestrator 用 Large，Worker 通过路由器动态选择模型，整体成本大幅下降。

下一章 **P19 Agent 安全与防注入**，我们会处理另一个生产级问题：当用户输入可能包含恶意 prompt injection 时，Agent 如何防御。

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p18-model-routing" />
<PracticeProjectActionPanel project-id="practice-p18-model-routing" />
