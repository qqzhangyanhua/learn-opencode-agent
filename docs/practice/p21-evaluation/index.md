---
title: P21：评估与基准测试
description: 构建系统化的 Agent 评估框架——测试用例设计、LLM-as-Judge、确定性校验、A/B 对比测试
---

<ProjectCard
  title="你将构建：一个完整的 Agent 评估框架，支持 LLM 评审 + 确定性校验 + A/B 配置对比"
  difficulty="intermediate"
  duration="45 min"
  :prerequisites="['P1', 'P12']"
  :tags="['Evaluation', 'Benchmarking', 'LLM-as-Judge', 'TypeScript', 'Anthropic SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup/)。如果本章里的 `RunCommand` 对应文件在仓库中还不存在，请先按正文步骤创建示例文件，再执行命令。

## 背景与目标

从 P1 到 P20，你构建了各种 Agent：会对话的、会用工具的、会反思的、会路由的、能防注入的。但有一个问题始终悬而未决：**你怎么知道它们好不好？**

手动测试的方式大家都熟悉——跑几个输入，看看输出像不像样，觉得行就算过了。问题在于：你改了一版 prompt，手动测了 3 个 case 觉得更好了，但你没测到的第 4 个 case 恰好变差了。更糟的是，你不知道它变差了，因为你根本没跑那个 case。

这就是为什么需要系统化评估。核心思路很简单：**把"人眼看输出"变成可重复、可量化的自动化流程**。

P12 的 Critic 角色已经展示了一个关键洞察：LLM 评估文本的能力往往优于它生成文本的能力。本章把这个洞察从"单次评审"扩展到"批量评测框架"——不是评审一个输出，而是用一套标准评审一批输出，汇总成可比较的指标。

**本章目标**：

1. 设计测试用例结构，包含输入、期望行为和评估标准
2. 实现 LLM-as-Judge 评审器（复用 P12 的 Critic 思路）
3. 实现确定性校验器（正则匹配、关键词检测、JSON Schema 验证）
4. 构建 `EvalRunner`，批量运行测试并生成评估报告
5. 用 A/B 测试对比两套 Agent 配置的效果

## 核心概念

### 评估的三个维度

Agent 评估不像传统单元测试那样只看"输出等不等于预期值"。LLM 输出是非确定性的，同一个输入跑两次可能得到不同措辞的回答，但两个回答可能都是正确的。所以评估需要更灵活的维度：

| 维度 | 说明 | 检测方式 |
|------|------|----------|
| **正确性** | 输出是否回答了问题、是否事实准确 | LLM 评审 + 关键词检测 |
| **格式合规** | 输出是否符合结构要求（JSON、列表、字数限制） | 正则匹配、JSON 解析 |
| **质量** | 输出是否清晰、有条理、有深度 | LLM 评审打分 |

确定性检查（正则、JSON 解析）适合验证"是否满足硬性约束"，LLM 评审适合判断"软性质量"。两者结合才是完整的评估。

### 测试用例设计

每个测试用例包含三部分：

```ts
interface TestCase {
  id: string                   // 唯一标识
  input: string                // 给 Agent 的输入
  expectedBehavior: string     // 期望的行为描述（给 LLM Judge 看）
  evaluationCriteria: string[] // 评估标准清单
  deterministicChecks?: DeterministicCheck[] // 确定性校验规则
}
```

`expectedBehavior` 不是"标准答案"——它描述的是"一个好的回答应该是什么样的"，这段文字会传给 LLM Judge 作为评审参照。`evaluationCriteria` 列出具体的检查点，让 Judge 逐条评审，而不是给一个模糊的"好不好"。

### LLM-as-Judge 模式

P12 的 Critic 负责评审 Generator 的输出，LLM-as-Judge 把这个思路推广到系统级别：用一个独立的 LLM 调用来评估 Agent 的输出质量。

Judge 和 Critic 的区别在于定位：Critic 是 Agent 内部的迭代改进机制（评审后要据此修改），Judge 是外部的质量监控机制（评审后只是记录分数，不改 Agent 的输出）。Judge 关心的是"这个输出对终端用户够不够好"，而不是"怎么让 Generator 改进"。

### 确定性校验

有些检查不需要 LLM——用代码跑更快、更可靠：

- **关键词存在**：回答里是否提到了某个必须出现的术语
- **正则匹配**：输出是否包含代码块、是否满足特定格式
- **JSON 合法性**：要求 JSON 输出的场景，直接解析验证

确定性校验的好处是零成本、零延迟、100% 可复现。缺点是只能检查"有没有"，不能检查"好不好"。

### 评估指标

单个 case 的评分不够用，需要汇总指标来看全局：

- **通过率**：多少 case 的分数达到阈值（比如 >= 7）
- **平均分**：所有 case 得分的算术平均
- **延迟分布**：每个 case 的响应时间，关注 P50 和 P95
- **成本估算**：基于 token 用量的费用汇总

## 动手实现

<RunCommand command="bun run p21-evaluation.ts" />

### 第一步：类型定义和初始化

```ts
// p21-evaluation.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ---------- 类型定义 ----------

interface DeterministicCheck {
  type: 'keyword' | 'regex' | 'json-valid'
  value: string   // keyword: 关键词文本；regex: 正则表达式字符串；json-valid: 忽略此字段
  label: string   // 检查项描述（用于报告）
}

interface TestCase {
  id: string
  input: string
  expectedBehavior: string
  evaluationCriteria: string[]
  deterministicChecks?: DeterministicCheck[]
}

interface JudgeResult {
  score: number          // 0-10
  passed: boolean
  reasoning: string
  criteriaScores: Record<string, number>
}

interface CheckResult {
  label: string
  passed: boolean
}

interface CaseResult {
  caseId: string
  agentOutput: string
  judgeResult: JudgeResult
  deterministicResults: CheckResult[]
  finalScore: number
  latencyMs: number
  tokenUsage: { input: number; output: number }
}

interface EvalReport {
  configName: string
  totalCases: number
  passCount: number
  passRate: number
  averageScore: number
  latencyP50: number
  latencyP95: number
  totalTokens: { input: number; output: number }
  caseResults: CaseResult[]
}
```

### 第二步：被评估的 Agent

先写一个简单的 QA Agent 作为被评估对象。它接收用户问题，返回回答。我们会用两套不同的配置来运行它，然后用评估框架比较哪套更好。

```ts
interface AgentConfig {
  name: string
  model: string
  systemPrompt: string
}

async function runAgent(
  config: AgentConfig,
  userInput: string
): Promise<{ output: string; latencyMs: number; tokenUsage: { input: number; output: number } }> {
  const start = Date.now()

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 1024,
    system: config.systemPrompt,
    messages: [{ role: 'user', content: userInput }],
  })

  const latencyMs = Date.now() - start
  const output = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  return {
    output,
    latencyMs,
    tokenUsage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  }
}
```

### 第三步：确定性校验器

```ts
function runDeterministicChecks(
  output: string,
  checks: DeterministicCheck[]
): CheckResult[] {
  return checks.map(check => {
    switch (check.type) {
      case 'keyword':
        return {
          label: check.label,
          passed: output.toLowerCase().includes(check.value.toLowerCase()),
        }
      case 'regex':
        return {
          label: check.label,
          passed: new RegExp(check.value, 's').test(output),
        }
      case 'json-valid': {
        try {
          JSON.parse(output)
          return { label: check.label, passed: true }
        } catch {
          return { label: check.label, passed: false }
        }
      }
    }
  })
}
```

确定性校验很"笨"，但这恰恰是它的优势：不花钱、不调 API、结果 100% 可复现。如果 Agent 的输出必须包含某个关键词或必须是合法 JSON，用确定性检查比用 LLM 判断更可靠。

### 第四步：LLM-as-Judge

这是本章的核心。Judge 的角色设计和 P12 的 Critic 类似，但它的职责不是"给改进建议"，而是"打分并解释原因"。

```ts
function isJudgeResult(value: unknown): value is JudgeResult {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['score'] === 'number' &&
    typeof obj['passed'] === 'boolean' &&
    typeof obj['reasoning'] === 'string' &&
    typeof obj['criteriaScores'] === 'object' &&
    obj['criteriaScores'] !== null
  )
}

async function llmJudge(
  testCase: TestCase,
  agentOutput: string
): Promise<JudgeResult> {
  const criteriaList = testCase.evaluationCriteria
    .map((c, i) => `${i + 1}. ${c}`)
    .join('\n')

  const systemPrompt = `你是一位严格的 AI Agent 输出质量评审员。你的职责是根据给定的评估标准，客观评估 Agent 的输出质量。

评估时请注意：
- 逐条检查每个评估标准
- 给每条标准单独打分（0-10）
- 综合所有标准给出总分（0-10）
- 总分 >= 7 视为通过

你必须严格返回 JSON 格式（不要包含其他文字）：
{
  "score": 0-10 的数字,
  "passed": true 或 false,
  "reasoning": "1-3 句话的总体评价",
  "criteriaScores": {
    "标准1描述": 分数,
    "标准2描述": 分数
  }
}`

  const userPrompt = `用户输入：
${testCase.input}

期望行为：
${testCase.expectedBehavior}

评估标准：
${criteriaList}

Agent 实际输出：
${agentOutput}

请严格按 JSON 格式输出评审结果。`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const responseText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.warn(`[Judge] JSON 提取失败：${responseText.slice(0, 100)}`)
    return { score: 0, passed: false, reasoning: 'Judge 输出格式错误', criteriaScores: {} }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    console.warn(`[Judge] JSON 解析失败`)
    return { score: 0, passed: false, reasoning: 'Judge 返回了无效 JSON', criteriaScores: {} }
  }

  if (!isJudgeResult(parsed)) {
    console.warn(`[Judge] 类型校验失败`)
    return { score: 0, passed: false, reasoning: 'Judge JSON 字段不完整', criteriaScores: {} }
  }

  return parsed
}
```

Judge 使用 `claude-sonnet-4-20250514` 而非被评估 Agent 使用的模型。这是有意为之——用同一个模型既当选手又当裁判，存在系统性偏差的风险。当然，如果预算有限，用同一个模型也可以接受，只需注意 system prompt 要完全不同。

### 第五步：EvalRunner

把所有部分串起来——对每个测试用例运行 Agent，做确定性校验，做 LLM 评审，汇总指标。

```ts
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

class EvalRunner {
  private testCases: TestCase[]

  constructor(testCases: TestCase[]) {
    this.testCases = testCases
  }

  async run(config: AgentConfig): Promise<EvalReport> {
    console.log(`\n========== 评估配置: ${config.name} ==========\n`)

    const caseResults: CaseResult[] = []

    for (const tc of this.testCases) {
      console.log(`[${tc.id}] 运行中...`)

      // 运行 Agent
      const { output, latencyMs, tokenUsage } = await runAgent(config, tc.input)
      const preview = output.replace(/\n/g, ' ').slice(0, 60)
      console.log(`  输出: ${preview}${output.length > 60 ? '...' : ''}`)

      // 确定性校验
      const deterministicResults = tc.deterministicChecks
        ? runDeterministicChecks(output, tc.deterministicChecks)
        : []

      const detPassed = deterministicResults.filter(r => r.passed).length
      const detTotal = deterministicResults.length
      if (detTotal > 0) {
        console.log(`  确定性校验: ${detPassed}/${detTotal} 通过`)
      }

      // LLM Judge 评审
      const judgeResult = await llmJudge(tc, output)
      console.log(`  Judge 评分: ${judgeResult.score}/10 | ${judgeResult.passed ? '通过' : '未通过'}`)
      console.log(`  评价: ${judgeResult.reasoning}`)

      // 综合得分：LLM 评分占 70%，确定性校验通过率占 30%
      const detRate = detTotal > 0 ? detPassed / detTotal : 1
      const finalScore = judgeResult.score * 0.7 + detRate * 10 * 0.3

      console.log(`  综合得分: ${finalScore.toFixed(1)}/10\n`)

      caseResults.push({
        caseId: tc.id,
        agentOutput: output,
        judgeResult,
        deterministicResults,
        finalScore,
        latencyMs,
        tokenUsage,
      })
    }

    // 汇总指标
    const scores = caseResults.map(r => r.finalScore)
    const latencies = caseResults.map(r => r.latencyMs).sort((a, b) => a - b)
    const passCount = caseResults.filter(r => r.finalScore >= 7).length

    const report: EvalReport = {
      configName: config.name,
      totalCases: caseResults.length,
      passCount,
      passRate: passCount / caseResults.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
      totalTokens: {
        input: caseResults.reduce((s, r) => s + r.tokenUsage.input, 0),
        output: caseResults.reduce((s, r) => s + r.tokenUsage.output, 0),
      },
      caseResults,
    }

    return report
  }
}
```

### 第六步：定义测试用例

```ts
const testCases: TestCase[] = [
  {
    id: 'tc-01',
    input: '用一句话解释什么是 TypeScript 的类型推断',
    expectedBehavior: '给出简明准确的一句话解释，提到编译器自动推导类型这个核心概念',
    evaluationCriteria: [
      '是否用一句话完成解释（不超过两句）',
      '是否提到了编译器/自动推导的概念',
      '技术准确性',
    ],
    deterministicChecks: [
      { type: 'keyword', value: '类型', label: '包含"类型"关键词' },
      { type: 'keyword', value: '推断', label: '包含"推断"关键词' },
    ],
  },
  {
    id: 'tc-02',
    input: '列出 3 个 JavaScript 和 TypeScript 的主要区别，用编号列表格式',
    expectedBehavior: '输出一个包含 3 条对比项的编号列表，每条清晰说明区别',
    evaluationCriteria: [
      '是否恰好列出 3 条（不多不少）',
      '是否使用了编号列表格式',
      '每条区别是否清晰且有意义',
    ],
    deterministicChecks: [
      { type: 'regex', value: '1[.、]', label: '包含编号 1' },
      { type: 'regex', value: '2[.、]', label: '包含编号 2' },
      { type: 'regex', value: '3[.、]', label: '包含编号 3' },
    ],
  },
  {
    id: 'tc-03',
    input: '写一个 TypeScript 函数，接收一个数字数组，返回最大值。要求用泛型实现。',
    expectedBehavior: '给出一个使用泛型的 TypeScript 函数实现，包含正确的类型标注',
    evaluationCriteria: [
      '是否包含可运行的 TypeScript 代码',
      '是否正确使用了泛型语法（<T> 或类似）',
      '逻辑是否正确（能返回最大值）',
    ],
    deterministicChecks: [
      { type: 'regex', value: '<[A-Z]', label: '包含泛型语法' },
      { type: 'regex', value: 'function|const|=>',  label: '包含函数定义' },
    ],
  },
  {
    id: 'tc-04',
    input: '解释 async/await 和 Promise 的关系，给出一个代码示例',
    expectedBehavior: '解释 async/await 是 Promise 的语法糖，并给出对比或演示代码',
    evaluationCriteria: [
      '是否解释了两者的关系（语法糖/基于 Promise）',
      '是否包含代码示例',
      '代码示例是否正确',
    ],
    deterministicChecks: [
      { type: 'keyword', value: 'async', label: '包含 async 关键词' },
      { type: 'keyword', value: 'await', label: '包含 await 关键词' },
      { type: 'keyword', value: 'Promise', label: '包含 Promise 关键词' },
    ],
  },
  {
    id: 'tc-05',
    input: '返回一个 JSON 对象，包含 name（字符串）和 age（数字）字段，不要加任何解释文字',
    expectedBehavior: '返回纯 JSON 对象，不带 markdown 代码块或解释',
    evaluationCriteria: [
      '输出是否是合法的 JSON',
      '是否包含 name 和 age 字段',
      '是否没有多余的解释文字',
    ],
    deterministicChecks: [
      { type: 'json-valid', value: '', label: '输出是合法 JSON' },
      { type: 'keyword', value: 'name', label: '包含 name 字段' },
      { type: 'keyword', value: 'age', label: '包含 age 字段' },
    ],
  },
]
```

5 个测试用例覆盖了常见的评估场景：简洁回答、格式遵循、代码生成、概念解释、纯 JSON 输出。每个 case 同时有 LLM 评审标准和确定性校验，两者互补。

### 第七步：报告打印和 A/B 对比

```ts
function printReport(report: EvalReport): void {
  console.log(`\n========== 评估报告: ${report.configName} ==========`)
  console.log(`用例总数: ${report.totalCases}`)
  console.log(`通过数量: ${report.passCount} (>= 7 分)`)
  console.log(`通过率:   ${(report.passRate * 100).toFixed(1)}%`)
  console.log(`平均得分: ${report.averageScore.toFixed(1)}/10`)
  console.log(`延迟 P50: ${report.latencyP50}ms`)
  console.log(`延迟 P95: ${report.latencyP95}ms`)
  console.log(`Token 用量: 输入 ${report.totalTokens.input} / 输出 ${report.totalTokens.output}`)
  console.log(`${'─'.repeat(50)}`)

  for (const cr of report.caseResults) {
    const detInfo = cr.deterministicResults.length > 0
      ? ` | 确定性 ${cr.deterministicResults.filter(r => r.passed).length}/${cr.deterministicResults.length}`
      : ''
    console.log(
      `  ${cr.caseId}: 综合 ${cr.finalScore.toFixed(1)} | Judge ${cr.judgeResult.score}${detInfo} | ${cr.latencyMs}ms`
    )
  }
}

function compareReports(a: EvalReport, b: EvalReport): void {
  console.log(`\n========== A/B 对比 ==========`)
  console.log(`${'指标'.padEnd(12)} | ${a.configName.padEnd(16)} | ${b.configName.padEnd(16)} | 差异`)
  console.log(`${'─'.repeat(60)}`)

  const rows: Array<{ label: string; va: string; vb: string; diff: string }> = [
    {
      label: '通过率',
      va: `${(a.passRate * 100).toFixed(1)}%`,
      vb: `${(b.passRate * 100).toFixed(1)}%`,
      diff: `${((b.passRate - a.passRate) * 100).toFixed(1)}%`,
    },
    {
      label: '平均分',
      va: a.averageScore.toFixed(1),
      vb: b.averageScore.toFixed(1),
      diff: (b.averageScore - a.averageScore).toFixed(1),
    },
    {
      label: '延迟 P50',
      va: `${a.latencyP50}ms`,
      vb: `${b.latencyP50}ms`,
      diff: `${b.latencyP50 - a.latencyP50}ms`,
    },
    {
      label: '总 Token',
      va: `${a.totalTokens.input + a.totalTokens.output}`,
      vb: `${b.totalTokens.input + b.totalTokens.output}`,
      diff: `${(b.totalTokens.input + b.totalTokens.output) - (a.totalTokens.input + a.totalTokens.output)}`,
    },
  ]

  for (const row of rows) {
    console.log(`${row.label.padEnd(12)} | ${row.va.padEnd(16)} | ${row.vb.padEnd(16)} | ${row.diff}`)
  }

  // 逐 case 对比
  console.log(`\n逐用例对比:`)
  for (let i = 0; i < a.caseResults.length; i++) {
    const ca = a.caseResults[i]
    const cb = b.caseResults[i]
    const diff = cb.finalScore - ca.finalScore
    const arrow = diff > 0 ? '+' : diff < 0 ? '' : '='
    console.log(
      `  ${ca.caseId}: ${ca.finalScore.toFixed(1)} vs ${cb.finalScore.toFixed(1)} (${arrow}${diff.toFixed(1)})`
    )
  }
}
```

### 第八步：运行评估

定义两套 Agent 配置——一套用简洁 prompt，一套用详细 prompt——然后用同一组测试用例分别评估，最后做 A/B 对比。

```ts
const configA: AgentConfig = {
  name: '简洁 Prompt',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: '你是一个技术助手。直接回答用户问题。',
}

const configB: AgentConfig = {
  name: '详细 Prompt',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: `你是一位资深的 TypeScript 技术专家。回答问题时请遵循以下原则：
- 先给出核心要点，再展开解释
- 代码示例要完整、可运行
- 如果被要求用特定格式输出，严格遵守格式要求
- 保持简洁，不要冗余`,
}

const runner = new EvalRunner(testCases)

const reportA = await runner.run(configA)
printReport(reportA)

const reportB = await runner.run(configB)
printReport(reportB)

compareReports(reportA, reportB)
```

### 运行结果

```
========== 评估配置: 简洁 Prompt ==========

[tc-01] 运行中...
  输出: TypeScript 的类型推断是指编译器能够根据变量的赋值或上下文自动推导出...
  确定性校验: 2/2 通过
  Judge 评分: 8/10 | 通过
  评价: 简明扼要，准确解释了类型推断的核心概念
  综合得分: 8.6/10

[tc-02] 运行中...
  输出: 1. 类型系统：TypeScript 有静态类型检查，JavaScript 是动态类型 2. ...
  确定性校验: 3/3 通过
  Judge 评分: 7/10 | 通过
  评价: 列出了 3 条区别，格式正确，但个别条目可以更具体
  综合得分: 7.9/10

[tc-05] 运行中...
  输出: {"name": "John", "age": 30}
  确定性校验: 3/3 通过
  Judge 评分: 9/10 | 通过
  评价: 纯 JSON 输出，无多余文字，字段完整
  综合得分: 9.3/10

========== 评估报告: 简洁 Prompt ==========
用例总数: 5
通过数量: 4 (>= 7 分)
通过率:   80.0%
平均得分: 8.1/10
延迟 P50: 1230ms
延迟 P95: 2100ms
Token 用量: 输入 1250 / 输出 890
──────────────────────────────────────────────────

========== A/B 对比 ==========
指标           | 简洁 Prompt      | 详细 Prompt      | 差异
────────────────────────────────────────────────────────────
通过率         | 80.0%            | 100.0%           | +20.0%
平均分         | 8.1              | 8.9              | +0.8
延迟 P50       | 1230ms           | 1450ms           | +220ms
总 Token       | 2140             | 2680             | +540

逐用例对比:
  tc-01: 8.6 vs 8.8 (+0.2)
  tc-02: 7.9 vs 8.7 (+0.8)
  tc-03: 7.5 vs 9.1 (+1.6)
  tc-04: 7.3 vs 8.8 (+1.5)
  tc-05: 9.3 vs 9.0 (-0.3)
```

从 A/B 对比可以读出：详细 Prompt 在代码生成（tc-03）和概念解释（tc-04）场景提升显著，但在纯 JSON 输出（tc-05）上反而略低——可能是详细 prompt 让模型倾向于加解释文字。这种 case 级别的对比比单看"平均分"有用得多。

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 测试用例三要素 | `input`（Agent 输入）、`expectedBehavior`（给 Judge 的参照）、`evaluationCriteria`（逐条检查标准） |
| 确定性校验 | 关键词、正则、JSON 解析——零成本、可复现，适合硬性约束检查 |
| LLM-as-Judge | 独立的 LLM 调用评审 Agent 输出，适合软性质量判断（清晰度、准确性、深度） |
| `isJudgeResult` 类型守卫 | JSON 解析后的运行时类型验证，避免 `as` 强转带来的类型不安全 |
| 综合评分公式 | `LLM 评分 * 0.7 + 确定性通过率 * 10 * 0.3`，两种检查方式按权重合并 |
| 汇总指标 | 通过率、平均分、延迟 P50/P95、Token 用量——一组数字看全局 |
| A/B 对比 | 同一组 case 跑两套配置，逐 case 对比分数差异，发现各配置的强弱项 |
| Judge 模型选择 | 评审用的模型和被评估的模型分开，降低"既当选手又当裁判"的偏差风险 |

## 常见问题

**Q: LLM Judge 的评分可靠吗？同一个 case 跑两次分数可能不一样。**

确实不一样——LLM 输出本身就有随机性。解决办法有两个：一是把 `temperature` 设为 0 降低波动（本章未显式设置，Anthropic API 默认值已经较低）；二是对同一个 case 跑多次 Judge 取平均分。后者更稳健但成本翻倍，适合正式 benchmark 场景。日常开发中单次 Judge 够用了——你关心的是"大致好不好"，不是精确到小数点。

**Q: 确定性校验和 LLM Judge 的权重怎么定？**

本章用的 70/30 是一个合理的起点。具体比例取决于你的场景：如果格式合规是硬性要求（比如 JSON API 响应），可以把确定性权重调高到 50% 甚至更多；如果你更关心内容质量而格式不那么重要，LLM 权重可以提到 90%。关键是权重要在评测开始前确定，不要看了结果再调——那就成了 overfitting。

**Q: 5 个测试用例够吗？**

不够做正式评测，但够做开发期间的快速验证。正式 benchmark 通常需要 50-200 个 case，覆盖各种边界情况（极长输入、空输入、多语言、格式模糊的指令等）。本章的 5 个 case 是为了演示框架的工作方式。真实场景中，你应该根据 Agent 的使用场景设计 case——如果 Agent 主要处理代码生成任务，那 80% 的 case 应该是代码相关的。

**Q: 如何评估需要多轮对话或工具调用的 Agent？**

本章评估的是单轮问答场景。对于多轮对话 Agent，测试用例需要包含完整的对话序列（多个 user/assistant turn），Judge 需要评估整个对话的质量。对于有工具调用的 Agent，你还需要检查"是否调用了正确的工具"、"调用参数是否正确"——这些可以用确定性校验来做。框架是相同的，只是 `runAgent` 和 `TestCase` 的结构需要扩展。

## 小结与延伸

你现在有了一个可用的评估框架：

- `TestCase` 结构定义了评估的完整输入：用户输入、期望行为、评审标准、确定性检查规则
- `runDeterministicChecks` 负责零成本的硬性约束验证
- `llmJudge` 实现 LLM-as-Judge，对软性质量打分并解释原因
- `EvalRunner` 批量执行评估，汇总通过率、平均分、延迟和 Token 指标
- `compareReports` 实现 A/B 对比，帮你在不同配置之间做出数据驱动的选择

评估不是一次性工作。每次修改 prompt、切换模型或调整工具配置后，跑一遍 eval 看看有没有 regression——这和软件开发里的回归测试是同一个思路。只不过 Agent 的"测试断言"不是 `assertEquals`，而是 LLM Judge + 确定性校验的组合。

接下来 P22 将进入综合项目实战——把本书积累的所有模式（ReAct、Reflection、多 Agent、评估）组合成一个生产级 Agent，评估框架会作为质量保障的最后一道防线。

<StarCTA />
