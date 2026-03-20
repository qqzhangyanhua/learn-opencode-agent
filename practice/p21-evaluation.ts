import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

interface DeterministicCheck {
  type: 'keyword' | 'regex' | 'json-valid'
  value: string
  label: string
}

interface TestCase {
  id: string
  input: string
  expectedBehavior: string
  evaluationCriteria: string[]
  deterministicChecks?: DeterministicCheck[]
}

interface JudgeResult {
  score: number
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

interface AgentConfig {
  name: string
  model: string
  systemPrompt: string
}

async function runAgent(
  config: AgentConfig,
  userInput: string,
): Promise<{ output: string; latencyMs: number; tokenUsage: { input: number; output: number } }> {
  const start = Date.now()

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: userInput },
    ],
  })

  return {
    output: (response.choices[0].message.content ?? '').trim(),
    latencyMs: Date.now() - start,
    tokenUsage: {
      input: response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
  }
}

function runDeterministicChecks(output: string, checks: DeterministicCheck[]): CheckResult[] {
  return checks.map((check) => {
    switch (check.type) {
      case 'keyword':
        return {
          label: check.label,
          passed: output.toLowerCase().includes(check.value.toLowerCase()),
        }
      case 'regex': {
        try {
          return {
            label: check.label,
            passed: new RegExp(check.value, 's').test(output),
          }
        } catch {
          return {
            label: check.label,
            passed: false,
          }
        }
      }
      case 'json-valid':
        try {
          JSON.parse(output)
          return { label: check.label, passed: true }
        } catch {
          return { label: check.label, passed: false }
        }
    }
  })
}

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

async function llmJudge(testCase: TestCase, agentOutput: string): Promise<JudgeResult> {
  const criteriaList = testCase.evaluationCriteria
    .map((criterion, index) => `${index + 1}. ${criterion}`)
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

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const responseText = (response.choices[0].message.content ?? '').trim()
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      score: 0,
      passed: false,
      reasoning: 'Judge 输出格式错误，未提取到 JSON。',
      criteriaScores: {},
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown
    if (isJudgeResult(parsed)) {
      return parsed
    }
  } catch {
    return {
      score: 0,
      passed: false,
      reasoning: 'Judge 返回了无效 JSON。',
      criteriaScores: {},
    }
  }

  return {
    score: 0,
    passed: false,
    reasoning: 'Judge JSON 字段不完整。',
    criteriaScores: {},
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

class EvalRunner {
  private readonly testCases: TestCase[]

  constructor(testCases: TestCase[]) {
    this.testCases = testCases
  }

  async run(config: AgentConfig): Promise<EvalReport> {
    console.log(`\n========== 评估配置: ${config.name} ==========\n`)

    const caseResults: CaseResult[] = []

    for (const testCase of this.testCases) {
      console.log(`[${testCase.id}] 运行中...`)

      const { output, latencyMs, tokenUsage } = await runAgent(config, testCase.input)
      console.log(`  输出预览: ${output.replace(/\n/g, ' ').slice(0, 80)}${output.length > 80 ? '...' : ''}`)

      const deterministicResults = testCase.deterministicChecks
        ? runDeterministicChecks(output, testCase.deterministicChecks)
        : []
      const detPassed = deterministicResults.filter((result) => result.passed).length
      const detTotal = deterministicResults.length

      if (detTotal > 0) {
        console.log(`  确定性校验: ${detPassed}/${detTotal} 通过`)
      }

      const judgeResult = await llmJudge(testCase, output)
      console.log(`  Judge 评分: ${judgeResult.score}/10 | ${judgeResult.passed ? '通过' : '未通过'}`)
      console.log(`  评价: ${judgeResult.reasoning}`)

      const detRate = detTotal > 0 ? detPassed / detTotal : 1
      const finalScore = judgeResult.score * 0.7 + detRate * 10 * 0.3
      console.log(`  综合得分: ${finalScore.toFixed(1)}/10\n`)

      caseResults.push({
        caseId: testCase.id,
        agentOutput: output,
        judgeResult,
        deterministicResults,
        finalScore,
        latencyMs,
        tokenUsage,
      })
    }

    const scores = caseResults.map((result) => result.finalScore)
    const latencies = caseResults.map((result) => result.latencyMs).sort((a, b) => a - b)
    const passCount = caseResults.filter((result) => result.finalScore >= 7).length

    return {
      configName: config.name,
      totalCases: caseResults.length,
      passCount,
      passRate: caseResults.length === 0 ? 0 : passCount / caseResults.length,
      averageScore:
        scores.length === 0 ? 0 : scores.reduce((sum, score) => sum + score, 0) / scores.length,
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
      totalTokens: {
        input: caseResults.reduce((sum, result) => sum + result.tokenUsage.input, 0),
        output: caseResults.reduce((sum, result) => sum + result.tokenUsage.output, 0),
      },
      caseResults,
    }
  }
}

const testCases: TestCase[] = [
  {
    id: 'tc-01',
    input: '用一句话解释什么是 TypeScript 的类型推断。',
    expectedBehavior: '给出简明准确的一句话解释，并提到编译器自动推导类型这个核心概念。',
    evaluationCriteria: [
      '是否用一句话完成解释',
      '是否提到了编译器或自动推导的概念',
      '技术是否准确',
    ],
    deterministicChecks: [
      { type: 'keyword', value: '类型', label: '包含"类型"关键词' },
      { type: 'keyword', value: '推断', label: '包含"推断"关键词' },
    ],
  },
  {
    id: 'tc-02',
    input: '列出 3 个 JavaScript 和 TypeScript 的主要区别，用编号列表格式。',
    expectedBehavior: '输出一个包含 3 条对比项的编号列表，每条清晰说明区别。',
    evaluationCriteria: [
      '是否恰好列出 3 条',
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
    expectedBehavior: '给出一个使用泛型的 TypeScript 函数实现，包含正确的类型标注。',
    evaluationCriteria: [
      '是否包含可运行的 TypeScript 代码',
      '是否正确使用了泛型语法',
      '逻辑是否正确，能返回最大值',
    ],
    deterministicChecks: [
      { type: 'regex', value: '<[A-Z]', label: '包含泛型语法' },
      { type: 'regex', value: 'function|const|=>', label: '包含函数定义' },
    ],
  },
  {
    id: 'tc-04',
    input: '解释 async/await 和 Promise 的关系，给出一个代码示例。',
    expectedBehavior: '解释 async/await 是 Promise 的语法糖，并给出一个正确的代码示例。',
    evaluationCriteria: [
      '是否解释了两者的关系',
      '是否包含代码示例',
      '示例是否正确',
    ],
    deterministicChecks: [
      { type: 'keyword', value: 'async', label: '包含 async 关键词' },
      { type: 'keyword', value: 'await', label: '包含 await 关键词' },
      { type: 'keyword', value: 'Promise', label: '包含 Promise 关键词' },
    ],
  },
  {
    id: 'tc-05',
    input: '返回一个 JSON 对象，包含 name（字符串）和 age（数字）字段，不要加任何解释文字。',
    expectedBehavior: '返回纯 JSON 对象，不带 markdown 代码块或额外解释。',
    evaluationCriteria: [
      '输出是否是合法 JSON',
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

  for (const caseResult of report.caseResults) {
    const detInfo =
      caseResult.deterministicResults.length > 0
        ? ` | 确定性 ${caseResult.deterministicResults.filter((result) => result.passed).length}/${caseResult.deterministicResults.length}`
        : ''
    console.log(
      `  ${caseResult.caseId}: 综合 ${caseResult.finalScore.toFixed(1)} | Judge ${caseResult.judgeResult.score}${detInfo} | ${caseResult.latencyMs}ms`,
    )
  }
}

function compareReports(a: EvalReport, b: EvalReport): void {
  console.log('\n========== A/B 对比 ==========')
  console.log(`${'指标'.padEnd(12)} | ${a.configName.padEnd(16)} | ${b.configName.padEnd(16)} | 差异`)
  console.log(`${'─'.repeat(70)}`)

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
      label: '延迟 P95',
      va: `${a.latencyP95}ms`,
      vb: `${b.latencyP95}ms`,
      diff: `${b.latencyP95 - a.latencyP95}ms`,
    },
    {
      label: '输入 Token',
      va: String(a.totalTokens.input),
      vb: String(b.totalTokens.input),
      diff: String(b.totalTokens.input - a.totalTokens.input),
    },
    {
      label: '输出 Token',
      va: String(a.totalTokens.output),
      vb: String(b.totalTokens.output),
      diff: String(b.totalTokens.output - a.totalTokens.output),
    },
  ]

  for (const row of rows) {
    console.log(
      `${row.label.padEnd(12)} | ${row.va.padEnd(16)} | ${row.vb.padEnd(16)} | ${row.diff}`,
    )
  }

  const winner =
    b.averageScore > a.averageScore ? b.configName : a.averageScore > b.averageScore ? a.configName : '平手'
  console.log(`\n推荐结论: ${winner === '平手' ? '两套配置得分接近，建议继续补充测试集。' : `优先保留 ${winner}。`}`)
}

async function main(): Promise<void> {
  const baselineConfig: AgentConfig = {
    name: 'A-基线配置',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    systemPrompt: '你是一个通用 TypeScript 助手，请直接回答用户问题。',
  }

  const structuredConfig: AgentConfig = {
    name: 'B-结构化配置',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    systemPrompt: [
      '你是一个高质量 TypeScript 助手。',
      '回答时优先保证技术准确性、结构清晰和格式遵循。',
      '如果用户要求列表、JSON 或代码，请严格遵守输出格式。',
    ].join('\n'),
  }

  const runner = new EvalRunner(testCases)
  const reportA = await runner.run(baselineConfig)
  const reportB = await runner.run(structuredConfig)

  printReport(reportA)
  printReport(reportB)
  compareReports(reportA, reportB)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
