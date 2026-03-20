import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

interface FileChange {
  filePath: string
  changeType: 'added' | 'modified' | 'deleted'
  hunks: DiffHunk[]
}

interface DiffHunk {
  startLine: number
  endLine: number
  content: string
}

type Severity = 'critical' | 'warning' | 'info'

type Category =
  | 'security'
  | 'quality'
  | 'performance'
  | 'naming'
  | 'error-handling'
  | 'typescript'

interface ReviewFinding {
  file: string
  line: number
  severity: Severity
  category: Category
  message: string
  suggestion: string
}

interface ReviewResult {
  reviewerId: string
  findings: ReviewFinding[]
}

interface ReviewReport {
  summary: string
  totalFindings: number
  critical: number
  warnings: number
  info: number
  findings: ReviewFinding[]
  generatedAt: string
}

function parseDiff(diffText: string): FileChange[] {
  const files: FileChange[] = []
  const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean)

  for (const block of fileBlocks) {
    const lines = block.split('\n')
    const header = lines[0] ?? ''
    const pathMatch = header.match(/b\/(.+)$/)
    if (!pathMatch) continue

    const filePath = pathMatch[1]
    let changeType: FileChange['changeType'] = 'modified'
    if (block.includes('new file mode')) changeType = 'added'
    if (block.includes('deleted file mode')) changeType = 'deleted'

    const hunks: DiffHunk[] = []
    const matches = [...block.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)]

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index]
      const startLine = Number.parseInt(match[1] ?? '0', 10)
      const lineCount = Number.parseInt(match[2] ?? '1', 10)
      const hunkStart = match.index ?? 0
      const nextHunkStart = matches[index + 1]?.index ?? block.length
      const content = block.slice(hunkStart, nextHunkStart).trim()

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

function isFinding(value: unknown): value is ReviewFinding {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['file'] === 'string' &&
    typeof obj['line'] === 'number' &&
    typeof obj['message'] === 'string' &&
    typeof obj['suggestion'] === 'string' &&
    (obj['severity'] === 'critical' || obj['severity'] === 'warning' || obj['severity'] === 'info') &&
    (
      obj['category'] === 'security' ||
      obj['category'] === 'quality' ||
      obj['category'] === 'performance' ||
      obj['category'] === 'naming' ||
      obj['category'] === 'error-handling' ||
      obj['category'] === 'typescript'
    )
  )
}

function extractFindings(response: OpenAI.ChatCompletion, reviewerId: string): ReviewFinding[] {
  const message = response.choices[0]?.message
  if (!message?.tool_calls) return []

  for (const toolCall of message.tool_calls) {
    if (toolCall.type !== 'function') continue
    if (toolCall.function.name !== 'submit_findings') continue

    const input = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
    const findings = input['findings']
    if (!Array.isArray(findings)) return []
    return findings.filter((finding): finding is ReviewFinding => isFinding(finding))
  }

  console.warn(`[${reviewerId}] 未找到 submit_findings 调用`)
  return []
}

async function runSecurityReview(changes: FileChange[]): Promise<ReviewResult> {
  console.log('[SecurityReviewer] 开始安全审查...')

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
        content: `请对以下代码变更进行安全审查：\n\n${buildDiffSummary(changes)}`,
      },
    ],
  })

  const findings = extractFindings(response, 'security-reviewer')
  console.log(`[SecurityReviewer] 完成，发现 ${findings.length} 个安全问题`)
  return { reviewerId: 'security-reviewer', findings }
}

async function runQualityReview(changes: FileChange[]): Promise<ReviewResult> {
  console.log('[QualityReviewer] 开始质量审查...')

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 4096,
    tools: [findingsTool],
    tool_choice: { type: 'function', function: { name: 'submit_findings' } },
    messages: [
      {
        role: 'system',
        content: [
          '你是一位资深代码质量审查专家。',
          '你只关注代码质量问题，不评论安全漏洞。',
          '重点检查：复杂度、命名、错误处理、TypeScript 实践、代码重复、可读性。',
          '如果没有问题，提交空数组。',
          '审查完成后必须调用 submit_findings 工具提交结果。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `请对以下代码变更进行代码质量审查：\n\n${buildDiffSummary(changes)}`,
      },
    ],
  })

  const findings = extractFindings(response, 'quality-reviewer')
  console.log(`[QualityReviewer] 完成，发现 ${findings.length} 个质量问题`)
  return { reviewerId: 'quality-reviewer', findings }
}

function deduplicateFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Map<string, ReviewFinding>()
  const severityRank: Record<Severity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  }

  for (const finding of findings) {
    const key = `${finding.file}:${finding.line}:${finding.category}`
    const existing = seen.get(key)

    if (!existing || severityRank[finding.severity] > severityRank[existing.severity]) {
      seen.set(key, finding)
    }
  }

  return [...seen.values()]
}

function aggregateFindings(results: ReviewResult[]): ReviewFinding[] {
  const allFindings = results.flatMap((result) => result.findings)
  const deduped = deduplicateFindings(allFindings)

  const severityOrder: Record<Severity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return deduped.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    const fileDiff = a.file.localeCompare(b.file)
    if (fileDiff !== 0) return fileDiff
    return a.line - b.line
  })
}

async function generateReport(
  findings: ReviewFinding[],
  fileChanges: FileChange[],
): Promise<ReviewReport> {
  console.log('[ReportGenerator] 生成审查报告...')

  const critical = findings.filter((finding) => finding.severity === 'critical').length
  const warnings = findings.filter((finding) => finding.severity === 'warning').length
  const info = findings.filter((finding) => finding.severity === 'info').length

  if (findings.length === 0) {
    return {
      summary: '本次代码审查未发现明显问题。当前变更在安全性和质量上都处于可接受状态。',
      totalFindings: 0,
      critical: 0,
      warnings: 0,
      info: 0,
      findings: [],
      generatedAt: new Date().toISOString(),
    }
  }

  const filesChanged = fileChanges.map((item) => `${item.filePath} (${item.changeType})`).join(', ')
  const findingsText = findings
    .map(
      (finding, index) =>
        `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.file}:${finding.line} - ${finding.message}`,
    )
    .join('\n')

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: [
          '你是一位代码审查报告撰写专家。',
          '根据结构化发现列表写一段 3-5 句的总结。',
          '总结要突出最严重的问题、整体风险和优先修复方向。',
        ].join('\n'),
      },
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

  const summary =
    response.choices[0]?.message.content?.trim() ?? '无法生成摘要'

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

async function reviewCode(diffText: string): Promise<ReviewReport> {
  console.log('=== Code Review Agent 启动 ===\n')

  console.log('[阶段 1] 解析 diff...')
  const fileChanges = parseDiff(diffText)
  console.log(`  解析完成：${fileChanges.length} 个文件变更`)
  for (const file of fileChanges) {
    console.log(`  - ${file.filePath} (${file.changeType}, ${file.hunks.length} hunks)`)
  }
  console.log('')

  if (fileChanges.length === 0) {
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

  console.log('[阶段 2] 并行分派审查任务...\n')
  const [securityResult, qualityResult] = await Promise.all([
    runSecurityReview(fileChanges),
    runQualityReview(fileChanges),
  ])
  console.log('')

  console.log('[阶段 3] 聚合审查结果...')
  const aggregated = aggregateFindings([securityResult, qualityResult])
  console.log(`  聚合完成：${aggregated.length} 个发现（去重后）\n`)

  console.log('[阶段 4] 生成审查报告...\n')
  return generateReport(aggregated, fileChanges)
}

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

    for (const finding of report.findings) {
      const icon =
        finding.severity === 'critical' ? '[!!!]' : finding.severity === 'warning' ? '[!!]' : '[i]'
      lines.push(`${icon} ${finding.file}:${finding.line}`)
      lines.push(`    分类：${finding.category} | 等级：${finding.severity}`)
      lines.push(`    问题：${finding.message}`)
      lines.push(`    建议：${finding.suggestion}`)
      lines.push('')
    }
  }

  lines.push('═══════════════════════════════════════════')
  return lines.join('\n')
}

async function main(): Promise<void> {
  const report = await reviewCode(sampleDiff)
  console.log(`\n${formatReport(report)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
