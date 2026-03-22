import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = path.join(rootDir, 'docs')
const contractPath = path.join(rootDir, '.vitepress/theme/data/content-meta.ts')

const seedPages = [
  'docs/00-what-is-ai-agent/index.md',
  'docs/01-agent-basics/index.md',
  'docs/03-tool-system/index.md',
  'docs/04-session-management/index.md',
  'docs/practice/p01-minimal-agent/index.md',
  'docs/practice/p10-react-loop/index.md',
  'docs/intermediate/27-planning-mechanism/index.md'
]

function stripWrappingQuotes(value) {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function parseInlineArray(value) {
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '').trim()
  if (!inner) {
    return []
  }

  return inner
    .split(',')
    .map((item) => stripWrappingQuotes(item.trim()))
    .filter(Boolean)
}

function parseScalar(value) {
  return stripWrappingQuotes(value.trim())
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
      frontmatter[currentArrayKey].push(parseScalar(arrayItemMatch[1]))
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

    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = parseInlineArray(value)
      currentArrayKey = null
      continue
    }

    frontmatter[key] = parseScalar(value)
    currentArrayKey = null
  }

  return frontmatter
}

function parseTypeScriptStringArray(source, name) {
  const matcher = new RegExp(`export const ${name} = \\[(.*?)\\] as const`, 's')
  const match = source.match(matcher)
  if (!match) {
    throw new Error(`无法从 content-meta.ts 读取 ${name}`)
  }

  return Array.from(match[1].matchAll(/'([^']+)'/g), (item) => item[1])
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isNonEmptyString(item))
}

function validateArrayField(issues, relativePath, field, value) {
  if (!isNonEmptyStringArray(value)) {
    issues.push(`${relativePath}: 字段 ${field} 必须是非空字符串数组`)
  }
}

async function walkMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkMarkdownFiles(fullPath)
    }

    return entry.name.endsWith('.md') ? [fullPath] : []
  }))

  return files.flat()
}

const contractSource = await readFile(contractPath, 'utf8')
const requiredFields = parseTypeScriptStringArray(contractSource, 'REQUIRED_LEARNING_FRONTMATTER_FIELDS')
const contentTypes = new Set(parseTypeScriptStringArray(contractSource, 'CONTENT_TYPES'))
const contentSeries = new Set(parseTypeScriptStringArray(contractSource, 'CONTENT_SERIES'))
const learningDifficulties = new Set(parseTypeScriptStringArray(contractSource, 'LEARNING_DIFFICULTIES'))
const entryModes = new Set(parseTypeScriptStringArray(contractSource, 'ENTRY_MODES'))

const markdownFiles = await walkMarkdownFiles(docsDir)
const issues = []

for (const file of markdownFiles) {
  const relativePath = path.relative(rootDir, file)
  const raw = await readFile(file, 'utf8')
  const frontmatterBlock = extractFrontmatterBlock(raw)

  if (!frontmatterBlock) {
    if (seedPages.includes(relativePath)) {
      issues.push(`${relativePath}: 缺少 frontmatter`)
    }
    continue
  }

  const frontmatter = parseFrontmatter(frontmatterBlock)
  const isSeedPage = seedPages.includes(relativePath)
  const isLearningPage = isSeedPage || Object.hasOwn(frontmatter, 'contentType')

  if (!isLearningPage) {
    continue
  }

  for (const field of requiredFields) {
    if (!Object.hasOwn(frontmatter, field)) {
      issues.push(`${relativePath}: 缺少字段 ${field}`)
      continue
    }

    const value = frontmatter[field]

    if (['learningGoals', 'prerequisites', 'recommendedNext', 'practiceLinks', 'searchTags'].includes(field)) {
      validateArrayField(issues, relativePath, field, value)
      continue
    }

    if (!isNonEmptyString(value)) {
      issues.push(`${relativePath}: 字段 ${field} 必须是非空字符串`)
    }
  }

  if (Object.hasOwn(frontmatter, 'contentType') && !contentTypes.has(frontmatter.contentType)) {
    issues.push(`${relativePath}: contentType 只能是 ${Array.from(contentTypes).join(' | ')}`)
  }

  if (Object.hasOwn(frontmatter, 'series') && !contentSeries.has(frontmatter.series)) {
    issues.push(`${relativePath}: series 只能是 ${Array.from(contentSeries).join(' | ')}`)
  }

  if (Object.hasOwn(frontmatter, 'difficulty') && !learningDifficulties.has(frontmatter.difficulty)) {
    issues.push(`${relativePath}: difficulty 只能是 ${Array.from(learningDifficulties).join(' | ')}`)
  }

  if (Object.hasOwn(frontmatter, 'entryMode') && !entryModes.has(frontmatter.entryMode)) {
    issues.push(`${relativePath}: entryMode 只能是 ${Array.from(entryModes).join(' | ')}`)
  }

  for (const field of ['recommendedNext', 'practiceLinks']) {
    const value = frontmatter[field]
    if (!Array.isArray(value)) {
      continue
    }

    for (const item of value) {
      if (!item.startsWith('/')) {
        issues.push(`${relativePath}: ${field} 中的路径必须以 / 开头，当前值为 ${item}`)
      }
    }
  }
}

if (issues.length === 0) {
  console.log('check:learning-metadata 通过')
  process.exit(0)
}

console.error('发现 learning metadata 问题：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
