import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = path.join(rootDir, 'docs')
const contentIndexPath = path.join(rootDir, '.vitepress/theme/data/content-index.data.ts')
const learningPathsPath = path.join(rootDir, '.vitepress/theme/data/learning-paths.data.ts')
const nodeRequire = createRequire(import.meta.url)
const moduleCache = new Map()

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

function walkIndexMarkdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      return walkIndexMarkdownFiles(fullPath)
    }

    return entry.name === 'index.md' ? [fullPath] : []
  })
}

function toPageUrl(relativePath) {
  const withoutDocsPrefix = relativePath.replace(/^docs\//, '')
  if (withoutDocsPrefix === 'index.md') {
    return '/'
  }

  return `/${withoutDocsPrefix.replace(/index\.md$/, '')}`
}

function collectRawPages() {
  return walkIndexMarkdownFiles(docsDir).map((filePath) => {
    const relativePath = path.relative(rootDir, filePath)
    const source = readFileSync(filePath, 'utf8')
    const frontmatterBlock = extractFrontmatterBlock(source)
    const frontmatter = frontmatterBlock ? parseFrontmatter(frontmatterBlock) : {}

    return {
      url: toPageUrl(relativePath),
      frontmatter
    }
  })
}

function resolveModulePath(baseDir, specifier) {
  const resolvedBase = path.resolve(baseDir, specifier)
  const candidates = [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.js`,
    `${resolvedBase}.mjs`,
    path.join(resolvedBase, 'index.ts')
  ]

  const resolved = candidates.find((candidate) => existsSync(candidate))
  if (!resolved) {
    throw new Error(`无法解析模块 ${specifier}`)
  }

  return resolved
}

function loadTsModule(modulePath) {
  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath)
  }

  const source = readFileSync(modulePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    fileName: modulePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText

  const module = { exports: {} }
  const dirname = path.dirname(modulePath)

  const localRequire = (specifier) => {
    if (specifier === 'vitepress') {
      return {
        createContentLoader(pattern, options = {}) {
          return { pattern, options }
        }
      }
    }

    if (specifier.startsWith('.')) {
      return loadTsModule(resolveModulePath(dirname, specifier))
    }

    return nodeRequire(specifier)
  }

  const wrapped = new vm.Script(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled}\n})`,
    { filename: modulePath }
  )

  wrapped.runInThisContext()(
    module.exports,
    localRequire,
    module,
    modulePath,
    dirname
  )

  moduleCache.set(modulePath, module.exports)
  return module.exports
}

const rawPages = collectRawPages()
const contentIndexModule = loadTsModule(contentIndexPath)
const learningPathModule = loadTsModule(learningPathsPath)
const issues = []

if (!contentIndexModule.default?.options?.transform) {
  issues.push('content-index.data.ts 未导出可执行的 createContentLoader 配置')
}

if (!Array.isArray(learningPathModule.learningPaths)) {
  issues.push('learning-paths.data.ts 未导出 learningPaths 数组')
}

if (!Array.isArray(learningPathModule.practicePhases)) {
  issues.push('learning-paths.data.ts 未导出 practicePhases 数组')
}

const contentIndex = contentIndexModule.default?.options?.transform
  ? contentIndexModule.default.options.transform(rawPages)
  : null

if (!contentIndex) {
  issues.push('无法从 content-index.data.ts 生成聚合结果')
}

const contentById = contentIndex?.contentById ?? {}
const sectionIndex = contentIndex?.sectionIndex ?? []
const sectionById = contentIndex?.sectionById ?? {}
const learningPathData = typeof learningPathModule.default?.load === 'function'
  ? learningPathModule.default.load()
  : learningPathModule.default ?? {}
const learningPaths = learningPathModule.learningPaths ?? learningPathData.learningPaths ?? []
const practicePhases = learningPathModule.practicePhases ?? learningPathData.practicePhases ?? []

const expectedSectionOrder = ['theory', 'practice', 'intermediate']
const sectionOrder = sectionIndex.map((section) => section.sectionId)

if (sectionOrder.join('|') !== expectedSectionOrder.join('|')) {
  issues.push(`sectionIndex 顺序必须为 theory -> practice -> intermediate，当前为 ${sectionOrder.join(' -> ') || '空'}`)
}

const sectionByIdKeys = Object.keys(sectionById).sort()
if (sectionByIdKeys.join('|') !== [...expectedSectionOrder].sort().join('|')) {
  issues.push(`sectionById 必须且只能包含 theory/practice/intermediate，当前为 ${sectionByIdKeys.join(', ') || '空'}`)
}

const pathIds = new Set()
for (const learningPath of learningPaths) {
  if (pathIds.has(learningPath.pathId)) {
    issues.push(`learningPaths 存在重复 pathId: ${learningPath.pathId}`)
  }
  pathIds.add(learningPath.pathId)

  if (!Array.isArray(learningPath.steps) || learningPath.steps.length === 0) {
    issues.push(`路径 ${learningPath.pathId} 缺少 steps`)
    continue
  }

  learningPath.steps.forEach((step, index) => {
    const expectedOrder = index + 1
    if (step.order !== expectedOrder) {
      issues.push(`路径 ${learningPath.pathId} 的步骤顺序必须连续递增，期望 ${expectedOrder}，当前 ${step.order}`)
    }

    if (!contentById[step.contentId]) {
      issues.push(`路径 ${learningPath.pathId} 引用了不存在的 contentId: ${step.contentId}`)
    }
  })

  const firstStep = learningPath.steps[0]
  const firstNode = contentById[firstStep.contentId]
  if (firstNode && learningPath.recommendedStart !== firstNode.url) {
    issues.push(`路径 ${learningPath.pathId} 的 recommendedStart 必须等于首个 step 页面 URL，当前 ${learningPath.recommendedStart}，期望 ${firstNode.url}`)
  }
}

const phaseIds = new Set()
const phaseOrders = new Set()
for (const phase of practicePhases) {
  if (phaseIds.has(phase.phaseId)) {
    issues.push(`practicePhases 存在重复 phaseId: ${phase.phaseId}`)
  }
  phaseIds.add(phase.phaseId)

  if (phaseOrders.has(phase.order)) {
    issues.push(`practicePhases 存在重复 order: ${phase.order}`)
  }
  phaseOrders.add(phase.order)

  if (!Array.isArray(phase.projectIds) || phase.projectIds.length !== phase.projectCount) {
    issues.push(`practice phase ${phase.phaseId} 的 projectCount 必须等于 projectIds.length`)
  }
}

if (issues.length === 0) {
  console.log('check:learning-paths 通过')
  process.exit(0)
}

console.error('发现 learning path 问题：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
