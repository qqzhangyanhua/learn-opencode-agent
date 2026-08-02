import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  evaluateSeoCopy,
  qualityOnlyIssues
} from './lib/seo-copy-quality.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = path.join(rootDir, 'docs')
const debtFilePath = path.join(rootDir, 'scripts', 'seo-copy-debt.txt')

/** Directory names skipped entirely while walking. */
const skippedDirectoryNames = new Set([
  '_archive',
  'superpowers',
  'public',
  'node_modules'
])

/**
 * Published but noindex / agent-internal pages: not part of SEO CTR corpus.
 * Paths are relative to docs/.
 */
const noIndexDocsPaths = new Set([
  'project-map.md',
  'dangerous-areas.md',
  'debugging.md',
  'testing.md',
  'agent-plan-template.md',
  'oh-my-openagent-plan.md'
])

function stripWrappingQuotes(value) {
  if (
    (value.startsWith("'") && value.endsWith("'"))
    || (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function extractFrontmatterBlock(content) {
  if (!content.startsWith('---')) {
    return null
  }

  const lines = content.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return null
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === '---') {
      return lines.slice(1, index)
    }
  }

  return null
}

function parseFrontmatter(lines) {
  const frontmatter = {}
  let currentArrayKey = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ')

    if (!line.trim() || line.trim().startsWith('#')) {
      continue
    }

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/)
    if (arrayItemMatch && currentArrayKey) {
      const current = Array.isArray(frontmatter[currentArrayKey])
        ? frontmatter[currentArrayKey]
        : []
      current.push(stripWrappingQuotes(arrayItemMatch[1].trim()))
      frontmatter[currentArrayKey] = current
      continue
    }

    const fieldMatch = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/)
    if (!fieldMatch) {
      currentArrayKey = null
      continue
    }

    const [, key, rawValue = ''] = fieldMatch
    const value = rawValue.trim()

    if (!value) {
      frontmatter[key] = []
      currentArrayKey = key
      continue
    }

    frontmatter[key] = stripWrappingQuotes(value)
    currentArrayKey = null
  }

  return frontmatter
}

function shouldSkipDocsRelativePath(docsRelativePath) {
  const normalized = docsRelativePath.replace(/\\/g, '/')
  if (noIndexDocsPaths.has(normalized)) {
    return true
  }
  if (normalized.startsWith('intermediate/examples/')) {
    return true
  }
  return false
}

async function walkMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (skippedDirectoryNames.has(entry.name)) {
        return []
      }
      return walkMarkdownFiles(fullPath)
    }
    return entry.name.endsWith('.md') ? [fullPath] : []
  }))
  return nested.flat()
}

async function loadDebtAllowlist() {
  try {
    const raw = await readFile(debtFilePath, 'utf8')
    const paths = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    return new Set(paths)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return new Set()
    }
    throw error
  }
}

const debtAllowlist = await loadDebtAllowlist()
const markdownFiles = await walkMarkdownFiles(docsDir)
const failures = []
const seenDebtHits = new Set()

for (const file of markdownFiles) {
  const repoRelativePath = path.relative(rootDir, file).replace(/\\/g, '/')
  const docsRelativePath = path.relative(docsDir, file).replace(/\\/g, '/')

  if (shouldSkipDocsRelativePath(docsRelativePath)) {
    continue
  }

  const raw = await readFile(file, 'utf8')
  const block = extractFrontmatterBlock(raw)
  if (!block) {
    failures.push(`${repoRelativePath}: 缺少 frontmatter（需要 title 与 description）`)
    continue
  }

  const frontmatter = parseFrontmatter(block)
  const evaluation = evaluateSeoCopy({
    title: frontmatter.title,
    description: frontmatter.description
  })

  if (evaluation.ok) {
    if (debtAllowlist.has(repoRelativePath)) {
      failures.push(
        `${repoRelativePath}: 已在 seo-copy-debt 中但文案已达标，请从 scripts/seo-copy-debt.txt 移除`
      )
    }
    continue
  }

  // Missing required fields: never allowlisted.
  if (!evaluation.hasRequiredFields) {
    for (const issue of evaluation.issues) {
      if (issue === 'missing_title') {
        failures.push(`${repoRelativePath}: 缺少 title`)
      }
      if (issue === 'missing_description') {
        failures.push(`${repoRelativePath}: 缺少 description`)
      }
    }
    continue
  }

  const qualityIssues = qualityOnlyIssues(evaluation.issues)
  if (qualityIssues.length === 0) {
    continue
  }

  if (debtAllowlist.has(repoRelativePath)) {
    seenDebtHits.add(repoRelativePath)
    continue
  }

  for (const issue of qualityIssues) {
    if (issue.startsWith('description_too_short:')) {
      failures.push(
        `${repoRelativePath}: description 过短（${issue.split(':')[1]}，要求 ${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH}）`
      )
      continue
    }
    if (issue.startsWith('description_too_long:')) {
      failures.push(
        `${repoRelativePath}: description 过长（${issue.split(':')[1]}，要求 ${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH}）`
      )
      continue
    }
    if (issue.startsWith('forbidden_phrase:')) {
      failures.push(
        `${repoRelativePath}: description 含禁止模板句「${issue.slice('forbidden_phrase:'.length)}」`
      )
      continue
    }
    if (issue === 'title_echo') {
      failures.push(`${repoRelativePath}: description 几乎复读 title`)
      continue
    }
    failures.push(`${repoRelativePath}: ${issue}`)
  }
}

// Stale debt paths that no longer exist still fail to keep the list honest.
for (const debtPath of debtAllowlist) {
  if (seenDebtHits.has(debtPath)) {
    continue
  }
  // May be stale-success (already reported) or missing file
  const absolute = path.join(rootDir, debtPath)
  try {
    await readFile(absolute, 'utf8')
    // File exists and was not counted as a debt hit => either ok (stale success already pushed)
    // or skipped path incorrectly listed
  } catch {
    failures.push(`${debtPath}: seo-copy-debt 条目指向不存在的文件，请删除`)
  }
}

if (failures.length > 0) {
  console.error('check:seo-copy 失败：')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  console.error(
    `\n规则：title/description 必填；description 长度 ${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH}；禁止模板腔。\n`
    + '已知历史债务见 scripts/seo-copy-debt.txt（Wave A/B 修复后应删除对应行）。'
  )
  process.exit(1)
}

console.log(
  `check:seo-copy 通过（已扫描公开页；债务白名单 ${debtAllowlist.size} 条，待 Wave A/B 消化）`
)
