import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const practiceDir = path.join(rootDir, 'practice')
const practiceProjectsFile = path.join(rootDir, '.vitepress', 'theme', 'data', 'practice-projects.ts')
const learningPathsFile = path.join(rootDir, '.vitepress', 'theme', 'data', 'learning-paths.data.ts')
const markdownTargets = [
  path.join(rootDir, 'practice', 'README.md'),
]

async function walkDocsPractice(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkDocsPractice(fullPath)
    }
    return entry.name.endsWith('.md') ? [fullPath] : []
  }))
  return files.flat()
}

function extractPracticeEntries(content) {
  const matches = content.match(/p\d{2}(?:-[a-z0-9]+)+\.ts/g) ?? []
  return [...new Set(matches)]
}

function extractPracticeProjectIds(content) {
  const matches = content.matchAll(/<PracticeProject(?:Guide|SourceFiles|ActionPanel)[^>]+project-id="([^"]+)"/g)
  return [...new Set([...matches].map((match) => match[1]))]
}

function extractDefinedProjectIds(content) {
  const matches = content.matchAll(/projectId:\s*'([^']+)'/g)
  return new Set([...matches].map((match) => match[1]))
}

function extractPracticePhasesBlock(content) {
  const declaration = 'export const practicePhases'
  const declarationIndex = content.indexOf(declaration)
  if (declarationIndex === -1) {
    return ''
  }

  const assignmentIndex = content.indexOf('=', declarationIndex)
  if (assignmentIndex === -1) {
    return ''
  }

  const arrayStartIndex = content.indexOf('[', assignmentIndex)
  if (arrayStartIndex === -1) {
    return ''
  }

  let depth = 0
  for (let index = arrayStartIndex; index < content.length; index += 1) {
    const char = content[index]
    if (char === '[') {
      depth += 1
    }
    if (char === ']') {
      depth -= 1
      if (depth === 0) {
        return content.slice(arrayStartIndex, index + 1)
      }
    }
  }

  return ''
}

function extractPhaseProjectIds(content) {
  const practicePhasesBlock = extractPracticePhasesBlock(content)
  const matches = practicePhasesBlock.matchAll(/'practice-p\d{2}-[^']+'/g)
  return new Set([...matches].map((match) => match[0].slice(1, -1)))
}

const docsPracticeFiles = await walkDocsPractice(path.join(rootDir, 'docs', 'practice'))
const targets = [...markdownTargets, ...docsPracticeFiles]

const referencedEntries = new Map()
const referencedProjectIds = new Map()
const definedProjectIds = extractDefinedProjectIds(await readFile(practiceProjectsFile, 'utf8'))
const phaseProjectIds = extractPhaseProjectIds(await readFile(learningPathsFile, 'utf8'))

for (const file of targets) {
  const content = await readFile(file, 'utf8')
  for (const entry of extractPracticeEntries(content)) {
    referencedEntries.set(entry, file)
  }
  for (const projectId of extractPracticeProjectIds(content)) {
    referencedProjectIds.set(projectId, file)
  }
}

const missingEntries = []
const missingProjectIds = []
const missingPhaseProjectIds = []

for (const [entry, sourceFile] of referencedEntries) {
  try {
    await stat(path.join(practiceDir, entry))
  } catch {
    missingEntries.push({
      entry,
      source: path.relative(rootDir, sourceFile),
    })
  }
}

for (const [projectId, sourceFile] of referencedProjectIds) {
  if (!definedProjectIds.has(projectId)) {
    missingProjectIds.push({
      projectId,
      source: path.relative(rootDir, sourceFile),
    })
  }
}

for (const [projectId, sourceFile] of referencedProjectIds) {
  if (!phaseProjectIds.has(projectId)) {
    missingPhaseProjectIds.push({
      projectId,
      source: path.relative(rootDir, sourceFile),
    })
  }
}

if (missingEntries.length === 0 && missingProjectIds.length === 0 && missingPhaseProjectIds.length === 0) {
  console.log('check:practice 通过')
  process.exit(0)
}

if (missingEntries.length > 0) {
  console.error('发现文档引用了不存在的实践脚本：')
}
for (const issue of missingEntries) {
  console.error(`- ${issue.entry} <- ${issue.source}`)
}

if (missingProjectIds.length > 0) {
  console.error('发现实践页面引用了不存在的项目元数据：')
}
for (const issue of missingProjectIds) {
  console.error(`- ${issue.projectId} <- ${issue.source}`)
}

if (missingPhaseProjectIds.length > 0) {
  console.error('发现实践页面引用了未加入实践阶段列表的项目：')
}
for (const issue of missingPhaseProjectIds) {
  console.error(`- ${issue.projectId} <- ${issue.source}`)
}

process.exit(1)
