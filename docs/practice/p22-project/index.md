---
title: P22：完整项目实战 — Code Review Agent
description: 综合多 Agent 编排、安全检测、结构化输出等技术，从零构建一个生产级 Code Review Agent
---

<ProjectCard
  title="你将构建：一个完整的 Code Review Agent，包含 Diff 解析、多维度并行审查、结果聚合与报告生成的全流水线"
  difficulty="advanced"
  duration="90 min"
  :prerequisites="['P1', 'P10', 'P15', 'P19']"
  :tags="['Project', 'Code Review', 'Multi-Agent', 'TypeScript', 'OpenAI SDK']"
/>

<PracticeProjectGuide project-id="practice-p22-project" />

> 开始前先看：[实践环境准备](/practice/setup)。本章对应示例文件位于 `practice/` 目录，可直接按命令运行。

## 前置准备

开始本章前，请先确认：

- 已阅读 [实践环境准备](/practice/setup)
- 基础依赖已就绪：`openai`
- 环境变量已配置：`OPENAI_API_KEY`
- 建议先完成前置章节：`P1`、`P10`、`P15`、`P19`
- 本章建议入口命令：`bun run p22-project.ts`
- 示例文件位置：`practice/p22-project.ts`

## 背景与目标

前 21 章各自聚焦一个技术点：P1 教你发出第一次 API 调用，P10 实现 ReAct 循环，P15 搭建 Orchestrator-Worker 架构，P19 构建安全防线。每一章都是独立的练习——但真实的 AI Agent 不是由一个技术点构成的，而是所有技术点协同工作的产物。

本章是全书的 **毕业设计**。我们要把散落在各章的技术整合成一个完整的、可运行的、接近生产质量的工具：**Code Review Agent**。

为什么选 Code Review？因为它天然适合多 Agent 架构：

- **输入结构化**：git diff 格式是确定的，可以精确解析
- **维度正交**：安全审查和代码质量审查需要完全不同的专业视角（P15 的核心论点）
- **输出可度量**：每个发现都有明确的文件、行号、严重等级，不是模糊的文本
- **实际有用**：这不是玩具——你可以把它接入 CI/CD 管道，每次 PR 自动审查

**系统的完整流水线**：

```
git diff 文本
    ↓
DiffParser（解析为结构化文件变更）
    ↓
ReviewOrchestrator（分派审查任务）
    ↓
┌─────────────┬─────────────┐
│ SecurityReviewer │ QualityReviewer │   ← 并行执行
└─────────────┴─────────────┘
    ↓
ReviewAggregator（合并、去重、排序）
    ↓
ReportGenerator（生成最终报告）
```

六个组件，各司其职。这正是 Linus 说的"每个函数只做一件事并做好"。

**本章目标**：

1. 实现完整的 Diff 解析器，将 git diff 文本转为结构化数据
2. 复用 P15 的 Orchestrator-Worker 模式，并行分派安全审查和质量审查
3. 用结构化输出（JSON）约束每个审查发现的格式
4. 实现结果聚合：去重、按严重等级排序、合并建议
5. 生成可读的审查报告

## 系统架构

整个系统由六个模块组成，数据单向流动，没有循环依赖：

```
┌──────────────────────────────────────────────┐
│                  Code Review Agent            │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐    ┌───────────────────┐       │
│  │DiffParser│───→│ReviewOrchestrator │       │
│  └──────────┘    └────────┬──────────┘       │
│                           │                  │
│              ┌────────────┼────────────┐     │
│              ▼            ▼            │     │
│     ┌────────────┐ ┌──────────────┐   │     │
│     │ Security   │ │  Quality     │   │     │
│     │ Reviewer   │ │  Reviewer    │   │     │
│     └─────┬──────┘ └──────┬───────┘   │     │
│           │               │           │     │
│           └───────┬───────┘           │     │
│                   ▼                   │     │
│          ┌────────────────┐           │     │
│          │ReviewAggregator│           │     │
│          └───────┬────────┘           │     │
│                  ▼                    │     │
│          ┌────────────────┐           │     │
│          │ReportGenerator │           │     │
│          └────────────────┘           │     │
│                                              │
└──────────────────────────────────────────────┘
```

每个模块的职责边界清晰：

| 模块 | 输入 | 输出 | 是否调用 LLM |
|------|------|------|-------------|
| DiffParser | git diff 文本 | `FileChange[]` | 否（纯解析） |
| ReviewOrchestrator | `FileChange[]` | 分派任务到 Reviewers | 是（决策） |
| SecurityReviewer | 文件变更 + 安全 system prompt | `ReviewFinding[]` | 是 |
| QualityReviewer | 文件变更 + 质量 system prompt | `ReviewFinding[]` | 是 |
| ReviewAggregator | 多个 `ReviewFinding[]` | 去重排序后的 `ReviewFinding[]` | 否（纯逻辑） |
| ReportGenerator | 聚合后的 findings | 格式化报告文本 | 是 |

注意：DiffParser 和 ReviewAggregator **不调用 LLM**。不是所有模块都需要 AI——能用确定性逻辑解决的就用确定性逻辑。这既省钱又可靠。

## 动手实现

<RunCommand command="bun run p22-project.ts" :verified="true" />

### 运行与验证

- 先按前置准备完成依赖和环境变量配置
- 执行上面的推荐入口命令
- 将输出与下文的“运行结果”或章节描述对照，确认主链路已经跑通
- 如果遇到命令、依赖、环境变量或样例输入问题，先回到 [实践环境准备](/practice/setup) 排查

### 快速判断是否跑通

如果主链路正常，你至少会看到下面 4 类关键信号：

- 出现 `=== Code Review Agent 启动 ===`，并完成 4 个阶段日志输出
- `阶段 1` 会解析出 2 个文件变更：`src/api/users.ts` 和 `src/utils/helpers.ts`
- `阶段 2` 会同时出现 `SecurityReviewer` 和 `QualityReviewer` 的开始/完成日志
- 最终输出里会出现 `Code Review Agent 审查报告` 标题，以及 `发现总数 / 严重 / 警告 / 信息` 统计

如果你的输出和示例里的具体问题数量不完全一致，不一定是错误。只要阶段日志完整、报告结构正确、且能识别出至少一部分安全或质量问题，通常就说明链路已经跑通。



### 第一步：类型定义

先把数据结构定好。P15 的经验告诉我们：在多 Agent 系统里，模块之间的接口比模块内部的实现更重要。

```ts
// p22-project.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

// ─── 类型定义 ───

/** Diff 解析后的单个文件变更 */
interface FileChange {
  filePath: string
  changeType: 'added' | 'modified' | 'deleted'
  hunks: DiffHunk[]
}

/** 一个 diff hunk（变更块） */
interface DiffHunk {
  startLine: number
  endLine: number
  content: string
}

/** 审查发现的严重等级 */
type Severity = 'critical' | 'warning' | 'info'

/** 审查发现的分类 */
type Category =
  | 'security'
  | 'quality'
  | 'performance'
  | 'naming'
  | 'error-handling'
  | 'typescript'

/** 单个审查发现 */
interface ReviewFinding {
  file: string
  line: number
  severity: Severity
  category: Category
  message: string
  suggestion: string
}

/** Reviewer 的审查结果 */
interface ReviewResult {
  reviewerId: string
  findings: ReviewFinding[]
}

/** 最终审查报告 */
interface ReviewReport {
  summary: string
  totalFindings: number
  critical: number
  warnings: number
  info: number
  findings: ReviewFinding[]
  generatedAt: string
}
```

类型定义一共 50 行——这就是整个系统的"合同"。每个模块只需要看自己的输入和输出类型就知道该做什么。

### 第二步：DiffParser — 解析 git diff

DiffParser 是纯确定性逻辑，不需要 LLM。git diff 格式是标准的，用正则解析即可。

```ts
// p22-project.ts（续）

function parseDiff(diffText: string): FileChange[] {
  const files: FileChange[] = []
  // 按 "diff --git" 分割文件
  const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean)

  for (const block of fileBlocks) {
    const lines = block.split('\n')

    // 提取文件路径
    const pathMatch = lines[0].match(/b\/(.+)$/)
    if (!pathMatch) continue
    const filePath = pathMatch[1]

    // 判断变更类型
    let changeType: FileChange['changeType'] = 'modified'
    if (block.includes('new file mode')) changeType = 'added'
    if (block.includes('deleted file mode')) changeType = 'deleted'

    // 提取 hunks
    const hunks: DiffHunk[] = []
    const hunkRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm
    let match: RegExpExecArray | null

    while ((match = hunkRegex.exec(block)) !== null) {
      const startLine = parseInt(match[1], 10)
      const lineCount = match[2] ? parseInt(match[2], 10) : 1
      const hunkStart = match.index
      // 找到下一个 hunk 或文件结尾
      const nextHunk = block.indexOf('\n@@ ', hunkStart + 1)
      const hunkEnd = nextHunk === -1 ? block.length : nextHunk
      const content = block.slice(hunkStart, hunkEnd).trim()

      hunks.push({
        startLine,
        endLine: startLine + lineCount - 1,
        content,
      })
    }

    files.push({ filePath, changeType, hunks })
  }

  return files
}
```

这个解析器处理了三种变更类型（新增、修改、删除），并提取了每个 hunk 的行号范围和内容。它不完美——生产级别的 diff 解析器会处理更多边界情况——但对我们的 Code Review 场景足够用了。

### 第三步：SecurityReviewer — 安全审查

SecurityReviewer 是一个专注于安全维度的 LLM 调用。它的 system prompt 明确限定了关注点：SQL 注入、XSS、eval 使用、硬编码密钥。P19 中我们学过这些安全检查的原理，现在把它们交给 LLM 来执行。

关键设计：用工具调用的 input schema 约束输出格式，确保每个发现都是结构化的 JSON，而不是自由文本。

```ts
// p22-project.ts（续）

const findingsTool: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'submit_findings',
    description: '提交结构化审查发现列表。',
    parameters: {
      type: 'object',
      properties: {
        findings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string', description: '文件路径' },
              line: { type: 'number', description: '问题所在行号' },
              severity: {
                type: 'string',
                enum: ['critical', 'warning', 'info'],
                description: '问题严重等级',
              },
              category: {
                type: 'string',
                enum: ['security', 'quality', 'performance', 'naming', 'error-handling', 'typescript'],
                description: '问题分类',
              },
              message: { type: 'string', description: '问题描述' },
              suggestion: { type: 'string', description: '修复建议' },
            },
            required: ['file', 'line', 'severity', 'category', 'message', 'suggestion'],
          },
        },
      },
      required: ['findings'],
    },
  },
}

async function runSecurityReview(
  changes: FileChange[]
): Promise<ReviewResult> {
  console.log('[SecurityReviewer] 开始安全审查...')

  const diffSummary = buildDiffSummary(changes)

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 4096,
    tools: [findingsTool],
    tool_choice: { type: 'function', function: { name: 'submit_findings' } },
    messages: [
      {
        role: 'system',
        content: [
          '你是一位资深安全审查专家。',
          '你只关注安全问题，不评论代码风格或性能。',
          '重点检查：SQL 注入、XSS、eval/Function、硬编码密钥、路径遍历、不安全文件操作。',
          '如果没有问题，提交空数组。',
          '审查完成后必须调用 submit_findings 工具提交结果。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `请对以下代码变更进行安全审查：\n\n${diffSummary}`,
      },
    ],
  })

  const findings = extractFindings(response, 'security-reviewer')
  console.log(`[SecurityReviewer] 完成，发现 ${findings.length} 个安全问题`)
  return { reviewerId: 'security-reviewer', findings }
}

function buildDiffSummary(changes: FileChange[]): string {
  return changes
    .map((change) =>
      [
        `--- ${change.filePath} (${change.changeType}) ---`,
        change.hunks.map((hunk) => hunk.content).join('\n'),
      ].join('\n'),
    )
    .join('\n\n')
}
```

`tool_choice: { type: 'tool', name: 'submit_findings' }` 强制模型必须调用 `submit_findings` 工具，而不是返回自由文本。这是 P10 中 ReAct 循环的变体——我们不让模型选择是否使用工具，而是强制它使用特定工具来输出结构化结果。

### 第四步：QualityReviewer — 代码质量审查

QualityReviewer 的结构和 SecurityReviewer 完全相同，只是 system prompt 不同。这正是 P15 的 Worker 设计理念：相同的执行框架，不同的专业指令。

```ts
// p22-project.ts（续）

async function runQualityReview(
  changes: FileChange[]
): Promise<ReviewResult> {
  console.log('[QualityReviewer] 开始质量审查...')

  const diffSummary = changes
    .map(f => `--- ${f.filePath} (${f.changeType}) ---\n${
      f.hunks.map(h => h.content).join('\n')
    }`)
    .join('\n\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    system: [
      '你是一位资深代码质量审查专家。',
      '你只关注代码质量问题，不评论安全漏洞。',
      '重点检查以下类别：',
      '- 复杂度：函数过长、嵌套过深（超过3层）、圈复杂度过高',
      '- 命名：变量名/函数名不清晰、缩写过度、命名不一致',
      '- 错误处理：缺少 catch、空 catch 块、错误被静默吞掉',
      '- TypeScript 实践：使用 any 类型、缺少类型标注、类型断言滥用',
      '- 代码重复：明显的复制粘贴代码',
      '- 可读性：魔法数字、缺少注释（对复杂逻辑）、过长的表达式',
      '',
      '如果没有发现质量问题，提交空数组。不要为了凑数而编造问题。',
      '审查完成后，必须调用 submit_findings 工具提交结果。',
    ].join('\n'),
    tools: [findingsTool],
    tool_choice: { type: 'tool', name: 'submit_findings' },
    messages: [
      {
        role: 'user',
        content: `请对以下代码变更进行代码质量审查：\n\n${diffSummary}`,
      },
    ],
  })

  const findings = extractFindings(response, 'quality-reviewer')
  console.log(`[QualityReviewer] 完成，发现 ${findings.length} 个质量问题`)
  return { reviewerId: 'quality-reviewer', findings }
}
```

### 第五步：提取结构化结果

两个 Reviewer 共用同一个结果提取函数。它从 LLM 响应中找到工具调用，解析 JSON，做类型校验。

```ts
// p22-project.ts（续）

function extractFindings(
  response: OpenAI.ChatCompletion,
  reviewerId: string
): ReviewFinding[] {
  for (const block of response.content) {
    if (block.type !== 'tool_use' || block.name !== 'submit_findings') continue

    const input = block.input as { findings: ReviewFinding[] }
    if (!Array.isArray(input.findings)) return []

    // 校验每个 finding 的字段完整性
    return input.findings.filter(f =>
      typeof f.file === 'string' &&
      typeof f.line === 'number' &&
      typeof f.message === 'string' &&
      typeof f.suggestion === 'string' &&
      ['critical', 'warning', 'info'].includes(f.severity) &&
      ['security', 'quality', 'performance', 'naming', 'error-handling', 'typescript']
        .includes(f.category)
    )
  }

  console.warn(`[${reviewerId}] 未找到 submit_findings 调用`)
  return []
}
```

这里有一个防御性编程的细节：即使我们用 `tool_choice` 强制模型调用工具，也不能 100% 信任模型输出的 JSON 结构。`filter` 做了运行时类型校验——这是 P19 输出验证思路的延续。

### 第六步：ReviewAggregator — 结果聚合

ReviewAggregator 是纯逻辑模块，不调用 LLM。它做三件事：合并、去重、排序。

```ts
// p22-project.ts（续）

function aggregateFindings(results: ReviewResult[]): ReviewFinding[] {
  // 1. 合并所有 findings
  const allFindings = results.flatMap(r => r.findings)

  // 2. 去重：同一文件、同一行、同一类别的发现只保留严重等级最高的
  const deduped = deduplicateFindings(allFindings)

  // 3. 按严重等级排序：critical > warning > info
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return deduped.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    // 同等严重级别按文件名排序
    return a.file.localeCompare(b.file)
  })
}

function deduplicateFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Map<string, ReviewFinding>()
  const severityRank: Record<Severity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  }

  for (const f of findings) {
    // 用 file + line + category 作为去重键
    const key = `${f.file}:${f.line}:${f.category}`
    const existing = seen.get(key)

    if (!existing || severityRank[f.severity] > severityRank[existing.severity]) {
      seen.set(key, f)
    }
  }

  return Array.from(seen.values())
}
```

去重策略很关键：SecurityReviewer 和 QualityReviewer 可能在同一行代码上都发现问题（比如一行 `eval(userInput)` 既是安全问题也是质量问题）。但如果两个 Reviewer 在同一行、同一类别上报告了问题，只保留严重等级更高的那个——这避免了报告里出现重复条目。

### 第七步：ReportGenerator — 报告生成

ReportGenerator 用 LLM 把结构化的 findings 转换成人类可读的报告。它负责写摘要、组织结构、措辞优化。

```ts
// p22-project.ts（续）

async function generateReport(
  findings: ReviewFinding[],
  fileChanges: FileChange[]
): Promise<ReviewReport> {
  console.log('[ReportGenerator] 生成审查报告...')

  const critical = findings.filter(f => f.severity === 'critical').length
  const warnings = findings.filter(f => f.severity === 'warning').length
  const info = findings.filter(f => f.severity === 'info').length

  // 如果没有发现任何问题，直接返回
  if (findings.length === 0) {
    return {
      summary: '本次代码审查未发现问题。所有变更看起来质量良好。',
      totalFindings: 0,
      critical: 0,
      warnings: 0,
      info: 0,
      findings: [],
      generatedAt: new Date().toISOString(),
    }
  }

  // 用 LLM 生成摘要
  const findingsText = findings
    .map((f, i) =>
      `${i + 1}. [${f.severity.toUpperCase()}] ${f.file}:${f.line} — ${f.message}`
    )
    .join('\n')

  const filesChanged = fileChanges
    .map(f => `${f.filePath} (${f.changeType})`)
    .join(', ')

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    system: [
      '你是一位代码审查报告撰写专家。',
      '根据审查发现列表，撰写一段简洁的总结（3-5句话）。',
      '总结应该：突出最严重的问题、给出整体评价、提醒优先修复事项。',
      '不要重复列出每个发现，只写概括性总结。',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: [
          `变更文件：${filesChanged}`,
          `发现数量：${findings.length}（严重 ${critical}，警告 ${warnings}，信息 ${info}）`,
          '',
          '发现列表：',
          findingsText,
        ].join('\n'),
      },
    ],
  })

  const summary = response.content
    .filter((b): b is OpenAI.ChatCompletionMessage => b.type === 'text')
    .map(b => b.text)
    .join('')

  console.log('[ReportGenerator] 报告生成完成')

  return {
    summary,
    totalFindings: findings.length,
    critical,
    warnings,
    info,
    findings,
    generatedAt: new Date().toISOString(),
  }
}
```

### 第八步：ReviewOrchestrator — 编排全流程

Orchestrator 是系统的入口。它按顺序调用 DiffParser，然后并行分派 SecurityReviewer 和 QualityReviewer（P15 的 `Promise.all` 模式），最后聚合并生成报告。

```ts
// p22-project.ts（续）

async function reviewCode(diffText: string): Promise<ReviewReport> {
  console.log('=== Code Review Agent 启动 ===\n')

  // 阶段 1：解析 Diff
  console.log('[阶段 1] 解析 diff...')
  const fileChanges = parseDiff(diffText)
  console.log(`  解析完成：${fileChanges.length} 个文件变更`)
  for (const f of fileChanges) {
    console.log(`  - ${f.filePath} (${f.changeType}, ${f.hunks.length} hunks)`)
  }
  console.log()

  if (fileChanges.length === 0) {
    console.log('没有检测到文件变更，跳过审查。')
    return {
      summary: '未检测到文件变更。',
      totalFindings: 0,
      critical: 0,
      warnings: 0,
      info: 0,
      findings: [],
      generatedAt: new Date().toISOString(),
    }
  }

  // 阶段 2：并行审查
  console.log('[阶段 2] 并行分派审查任务...\n')
  const [securityResult, qualityResult] = await Promise.all([
    runSecurityReview(fileChanges),
    runQualityReview(fileChanges),
  ])
  console.log()

  // 阶段 3：聚合结果
  console.log('[阶段 3] 聚合审查结果...')
  const aggregated = aggregateFindings([securityResult, qualityResult])
  console.log(`  聚合完成：${aggregated.length} 个发现（去重后）\n`)

  // 阶段 4：生成报告
  console.log('[阶段 4] 生成审查报告...\n')
  const report = await generateReport(aggregated, fileChanges)

  return report
}
```

注意阶段 2 用的是 `Promise.all`——SecurityReviewer 和 QualityReviewer 同时执行，总耗时等于较慢的那个，而不是两者之和。这是 P15 并行扇出模式的直接应用。

### 第九步：测试用例 — 一段有问题的 diff

最后，用一段精心构造的 diff 来测试整个系统。这段 diff 包含了多种问题：安全漏洞、代码质量问题、TypeScript 反模式。

```ts
// p22-project.ts（续）

const sampleDiff = `diff --git a/src/api/users.ts b/src/api/users.ts
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -1,5 +1,42 @@
+import { db } from '../db'
+import { Request, Response } from 'express'
+
+const API_SECRET = 'sk-proj-abc123xyz789'
+
+export async function getUser(req: Request, res: Response) {
+  const userId = req.params.id
+  // 直接拼接 SQL，没有参数化查询
+  const query = "SELECT * FROM users WHERE id = '" + userId + "'"
+  const result = await db.raw(query)
+  res.json(result)
+}
+
+export async function searchUsers(req: any, res: any) {
+  const keyword = req.query.q
+  const html = '<div class="results">' + keyword + '</div>'
+  res.send(html)
+}
+
+export function processData(data: any) {
+  let result = ''
+  for (let i = 0; i < data.items.length; i++) {
+    try {
+      const item = data.items[i]
+      if (item.type === 'code') {
+        if (item.language === 'javascript') {
+          if (item.trusted) {
+            eval(item.content)
+          }
+        }
+      }
+      result += JSON.stringify(item)
+    } catch(e) {}
+  }
+  return result
+}
+
+export function validateToken(token: string): boolean {
+  if (token === API_SECRET) return true
+  return false
+}
diff --git a/src/utils/helpers.ts b/src/utils/helpers.ts
new file mode 100644
--- /dev/null
+++ b/src/utils/helpers.ts
@@ -0,0 +1,15 @@
+export function fmt(d: any) {
+  const x = new Date(d)
+  return x.getFullYear() + '-' + (x.getMonth()+1) + '-' + x.getDate()
+}
+
+export function calc(a: any, b: any, op: any) {
+  if (op == '+') return a + b
+  if (op == '-') return a - b
+  if (op == '*') return a * b
+  if (op == '/') return a / b
+  return null
+}
+
+export const TIMEOUT = 300000
+export const MAX = 999999
`

function formatReport(report: ReviewReport): string {
  const lines: string[] = []

  lines.push('╔══════════════════════════════════════════╗')
  lines.push('║        Code Review Agent 审查报告        ║')
  lines.push('╚══════════════════════════════════════════╝')
  lines.push('')
  lines.push(`生成时间：${report.generatedAt}`)
  lines.push(`发现总数：${report.totalFindings}`)
  lines.push(`  严重：${report.critical}  警告：${report.warnings}  信息：${report.info}`)
  lines.push('')
  lines.push('── 摘要 ──')
  lines.push(report.summary)
  lines.push('')

  if (report.findings.length > 0) {
    lines.push('── 详细发现 ──')
    lines.push('')

    for (const f of report.findings) {
      const icon = f.severity === 'critical' ? '[!!!]'
        : f.severity === 'warning' ? '[!!]'
        : '[i]'
      lines.push(`${icon} ${f.file}:${f.line}`)
      lines.push(`    分类：${f.category} | 等级：${f.severity}`)
      lines.push(`    问题：${f.message}`)
      lines.push(`    建议：${f.suggestion}`)
      lines.push('')
    }
  }

  lines.push('═══════════════════════════════════════════')
  return lines.join('\n')
}

// 主函数
async function main() {
  const report = await reviewCode(sampleDiff)
  console.log('\n' + formatReport(report))
}

main().catch(console.error)
```

运行后你会看到类似这样的输出（具体发现取决于模型的判断）：

```
=== Code Review Agent 启动 ===

[阶段 1] 解析 diff...
  解析完成：2 个文件变更
  - src/api/users.ts (modified, 1 hunks)
  - src/utils/helpers.ts (added, 1 hunks)

[阶段 2] 并行分派审查任务...

[SecurityReviewer] 开始安全审查...
[QualityReviewer] 开始质量审查...
[SecurityReviewer] 完成，发现 5 个安全问题
[QualityReviewer] 完成，发现 6 个质量问题

[阶段 3] 聚合审查结果...
  聚合完成：10 个发现（去重后）

[阶段 4] 生成审查报告...

[ReportGenerator] 报告生成完成

╔══════════════════════════════════════════╗
║        Code Review Agent 审查报告        ║
╚══════════════════════════════════════════╝

生成时间：2026-03-19T12:00:00.000Z
发现总数：10
  严重：4  警告：4  信息：2

── 摘要 ──
本次审查发现了多个严重安全漏洞，需要立即处理。最紧急的是 SQL 注入漏洞和
硬编码 API 密钥，这两个问题在生产环境中会直接导致数据泄露。此外，eval() 的
使用和 XSS 漏洞也是高优先级修复项。代码质量方面，多处使用 any 类型和空 catch
块，建议在修复安全问题后一并改进。

── 详细发现 ──

[!!!] src/api/users.ts:9
    分类：security | 等级：critical
    问题：SQL 注入漏洞 — 直接将用户输入拼接到 SQL 查询字符串中
    建议：使用参数化查询：db.raw('SELECT * FROM users WHERE id = ?', [userId])

[!!!] src/api/users.ts:4
    分类：security | 等级：critical
    问题：硬编码 API 密钥 — API_SECRET 明文写在源码中
    建议：使用环境变量：process.env.API_SECRET，并将密钥从代码历史中清除

[!!!] src/api/users.ts:27
    分类：security | 等级：critical
    问题：使用 eval() 执行动态代码，即使有 trusted 检查也不安全
    建议：移除 eval，使用安全的替代方案（如 JSON.parse 或 AST 解析）

...
═══════════════════════════════════════════
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| 全流水线架构 | Diff 解析 → 并行审查 → 结果聚合 → 报告生成，数据单向流动，无循环依赖 |
| 确定性与 LLM 混合 | DiffParser 和 ReviewAggregator 用纯逻辑实现，只在需要理解语义的环节调用 LLM |
| 结构化输出 | 用 `tool_choice` 强制模型通过工具调用返回 JSON，避免自由文本的解析困难 |
| 并行扇出 | SecurityReviewer 和 QualityReviewer 用 `Promise.all` 并行执行，互不可见（P15） |
| 运行时类型校验 | 即使有 schema 约束，仍对模型输出做运行时 `filter` 校验（P19 防御思维） |
| 去重与排序 | 同一位置、同一类别的发现只保留最高严重等级，避免报告冗余 |
| Worker 隔离 | 每个 Reviewer 有独立的 system prompt 和上下文，专注于自己的维度 |
| 报告生成分离 | 数据收集（Reviewer）和呈现（ReportGenerator）分离，各自可独立迭代 |

## 常见问题

**Q: 为什么不把所有检查放在一个 prompt 里，而要拆成两个 Reviewer？**

这是 P15 讨论过的核心问题。单 prompt 方案的问题在于**维度干扰**——当你让模型同时关注安全和质量时，它倾向于在两个维度之间来回切换，每个维度的深度都会下降。更实际的限制是 prompt 长度：安全审查的检查清单和质量审查的检查清单加在一起会非常长，模型容易忽略后面的指令。

拆成两个 Reviewer 后：
- 每个 Reviewer 的 system prompt 更短、更聚焦
- 并行执行节省时间
- 可以独立调优（比如给 SecurityReviewer 换一个更擅长安全的模型）

代价是多一次 LLM 调用的成本和延迟。但因为是并行的，延迟增加有限；成本方面，两个 Sonnet 调用的价格远低于一个 Opus 调用。

**Q: 如果要添加第三个 Reviewer（比如 PerformanceReviewer）需要改多少代码？**

几乎只需要三步：

1. 写一个 `runPerformanceReview` 函数（复制 `runQualityReview` 改 system prompt）
2. 在 `reviewCode` 的 `Promise.all` 里加一项
3. 完毕——ReviewAggregator 和 ReportGenerator 不需要任何改动

这就是良好架构的价值：新增一个维度是 O(1) 的改动，不会影响现有代码。

**Q: DiffParser 能处理所有 git diff 格式吗？**

不能。当前实现处理了最常见的情况（文件新增、修改、删除），但不支持二进制文件、重命名检测（`rename from/to`）、权限变更等。生产环境建议使用成熟的 diff 解析库（如 `parse-diff`），而不是自己写正则。本章自己实现是为了让你理解 diff 格式的结构。

**Q: 如何把这个 Agent 接入 CI/CD？**

核心改动是输入和输出的适配：

- **输入**：用 `git diff HEAD~1` 或 `git diff main...feature-branch` 获取真实 diff，替换 `sampleDiff`
- **输出**：把 `ReviewReport` 转换为 GitHub PR Comment 或 GitLab MR Note 的格式
- **失败条件**：如果 `report.critical > 0`，让 CI 流程返回非零退出码，阻止合并

加上 P4 的错误处理（重试、超时）和 P20 的可观测性（日志、耗时追踪），这就是一个可以上线的工具。

## 小结与延伸

你现在有了一个完整的 Code Review Agent。回顾一下它整合了哪些技术：

- **P1 基础调用**：每个 Reviewer 都是一次 `client.chat.completions.create`
- **P10 ReAct 循环**：`tool_choice` 强制工具调用，结构化输出
- **P15 多 Agent 编排**：Orchestrator 分派任务，Worker 并行执行
- **P19 安全防御**：运行时类型校验，不信任模型输出的结构

更重要的是架构层面的收获：

- **确定性逻辑和 LLM 各司其职**：不要让 LLM 做正则能做的事
- **模块边界清晰**：类型定义就是合同，每个模块只看自己的输入输出
- **可扩展性内建**：加一个 Reviewer 不需要改其他模块

这不是终点。下一章 **P23 生产部署与运维** 会讨论如何把这样的 Agent 部署到生产环境：容器化、监控、成本控制、灰度发布。你的 Code Review Agent 已经具备了生产级的代码结构，P23 会补上生产级的运维能力。

<StarCTA />

<PracticeProjectActionPanel project-id="practice-p22-project" />
