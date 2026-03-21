import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const requiredFiles = [
  'docs/index.md',
  'docs/reading-map.md',
  'docs/practice/index.md',
  'docs/intermediate/index.md',
  'docs/version-notes.md',
  'docs/release-checklist.md',
]

const blockedPatterns = [
  { name: 'TODO', regex: /\bTODO\b/g },
  { name: 'FIXME', regex: /\bFIXME\b/g },
  { name: 'TBD', regex: /\bTBD\b/g },
  { name: '待补', regex: /待补/g },
  { name: '需要补充', regex: /需要补充/g },
]

const allowLinePatterns = [
  /创建一个 TODO 应用/,
  /搜索 `TODO`、`待补`、`需要补充`、`TBD`/,
]

async function walkMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.worktrees')) {
        return []
      }
      return walkMarkdownFiles(fullPath)
    }
    return entry.name.endsWith('.md') ? [fullPath] : []
  }))

  return files.flat()
}

async function ensureRequiredFiles() {
  const missingFiles = []
  for (const file of requiredFiles) {
    try {
      await stat(path.join(rootDir, file))
    } catch {
      missingFiles.push(file)
    }
  }
  return missingFiles
}

async function checkBlockedPatterns() {
  const targets = [
    path.join(rootDir, 'README.md'),
    ...await walkMarkdownFiles(path.join(rootDir, 'docs')),
    path.join(rootDir, 'practice', 'README.md'),
  ]

  const issues = []

  for (const file of targets) {
    const content = await readFile(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      if (allowLinePatterns.some((pattern) => pattern.test(line))) {
        return
      }
      for (const pattern of blockedPatterns) {
        if (pattern.regex.test(line)) {
          issues.push({
            file: path.relative(rootDir, file),
            line: index + 1,
            token: pattern.name,
            content: line.trim(),
          })
        }
        pattern.regex.lastIndex = 0
      }
    })
  }

  return issues
}

const missingFiles = await ensureRequiredFiles()
const issues = await checkBlockedPatterns()

if (missingFiles.length === 0 && issues.length === 0) {
  console.log('check:content 通过')
  process.exit(0)
}

if (missingFiles.length > 0) {
  console.error('缺少关键页面：')
  for (const file of missingFiles) {
    console.error(`- ${file}`)
  }
}

if (issues.length > 0) {
  console.error('发现疑似未收口文案：')
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} [${issue.token}] ${issue.content}`)
  }
}

process.exit(1)
