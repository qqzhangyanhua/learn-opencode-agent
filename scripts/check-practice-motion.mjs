import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const practiceDocsDir = path.join(rootDir, 'docs', 'practice')
const practiceProjectsPath = path.join(rootDir, '.vitepress', 'theme', 'data', 'practice-projects.ts')
const practiceMotionPath = path.join(rootDir, '.vitepress', 'theme', 'data', 'practice-motion', 'index.ts')
const animationLabPath = path.join(rootDir, '.vitepress', 'theme', 'data', 'animation-lab-experiments.ts')

const ignoredPageComponents = new Set([
  'PracticeProjectGuide',
  'PracticeProjectSourceFiles',
  'PracticeProjectActionPanel',
  'StarCTA',
])

function unique(values) {
  return [...new Set(values)]
}

function extractQuotedValues(content, regex) {
  return [...content.matchAll(regex)].map(([, value]) => value)
}

function extractMotionEntries(content) {
  const entries = []
  const entryPattern = /\{\s*projectId: '([^']+)',\s*componentName: '([^']+)',\s*kind: '([^']+)',\s*animationLabExperimentIds: \[([^\]]*)\],\s*notes: '([^']*)',\s*\}/g

  for (const [, projectId, componentName, kind, experimentBlock, notes] of content.matchAll(entryPattern)) {
    entries.push({
      projectId,
      componentName,
      kind,
      animationLabExperimentIds: extractQuotedValues(experimentBlock, /'([^']+)'/g),
      notes,
    })
  }

  return entries
}

async function readPracticePages() {
  const entries = await readdir(practiceDocsDir, { withFileTypes: true })
  const pages = []

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^p\d+/.test(entry.name)) {
      continue
    }

    const filePath = path.join(practiceDocsDir, entry.name, 'index.md')
    const content = await readFile(filePath, 'utf8')
    const projectId = content.match(/<PracticeProjectGuide[^>]+project-id="([^"]+)"/)?.[1] ?? ''
    const componentNames = unique([...content.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)]
      .map((match) => match[1])
      .filter((componentName) => !ignoredPageComponents.has(componentName)))

    pages.push({
      projectId,
      routeName: entry.name,
      relativePath: path.relative(rootDir, filePath),
      componentNames,
    })
  }

  return pages
}

const [practiceProjectsContent, practiceMotionContent, animationLabContent, practicePages] = await Promise.all([
  readFile(practiceProjectsPath, 'utf8'),
  readFile(practiceMotionPath, 'utf8'),
  readFile(animationLabPath, 'utf8'),
  readPracticePages(),
])

const issues = []
const definedProjectIds = new Set(extractQuotedValues(practiceProjectsContent, /projectId:\s*'([^']+)'/g))
const experimentIds = new Set(extractQuotedValues(animationLabContent, /'([^']+)': \[/g))
const motionEntries = extractMotionEntries(practiceMotionContent)
const allowedKinds = new Set(['interactive-demo', 'animation-lab', 'lottie', 'css-motion', 'none'])
const projectIdByPath = new Map(practicePages.map((page) => [`/practice/${page.routeName}/`, page.projectId]))

if (motionEntries.length === 0) {
  issues.push('缺少 practiceMotionEntries 数据')
}

const entriesByProjectId = new Map()
for (const entry of motionEntries) {
  if (!allowedKinds.has(entry.kind)) {
    issues.push(`${entry.projectId} 使用了未知动效类型: ${entry.kind}`)
  }

  if (!definedProjectIds.has(entry.projectId)) {
    issues.push(`practice-motion 引用了不存在的 projectId: ${entry.projectId}`)
  }

  if (!entry.notes.trim()) {
    issues.push(`${entry.projectId} 缺少 notes 说明`)
  }

  for (const experimentId of entry.animationLabExperimentIds) {
    if (!experimentIds.has(experimentId)) {
      issues.push(`${entry.projectId} 引用了不存在的 animation lab 实验: ${experimentId}`)
    }
  }

  const projectEntries = entriesByProjectId.get(entry.projectId) ?? []
  projectEntries.push(entry)
  entriesByProjectId.set(entry.projectId, projectEntries)
}

for (const page of practicePages) {
  if (!page.projectId) {
    issues.push(`${page.relativePath} 缺少 PracticeProjectGuide project-id`)
    continue
  }

  const entries = entriesByProjectId.get(page.projectId) ?? []
  if (entries.length === 0) {
    issues.push(`${page.relativePath} 缺少 practice-motion 记录`)
    continue
  }

  for (const entry of entries) {
    if (entry.kind !== 'none' && !page.componentNames.includes(entry.componentName)) {
      issues.push(`${entry.projectId} 的组件 ${entry.componentName} 未在 ${page.relativePath} 中引用`)
    }
  }
}

for (const projectId of entriesByProjectId.keys()) {
  if (!practicePages.some((page) => page.projectId === projectId)) {
    issues.push(`practice-motion 记录没有对应实践页: ${projectId}`)
  }
}

for (const [, experimentId, linksBlock] of animationLabContent.matchAll(/'([^']+)': \[([\s\S]*?)\],/g)) {
  for (const href of extractQuotedValues(linksBlock, /href: '([^']+)'/g)) {
    const projectId = projectIdByPath.get(href)
    if (!projectId) {
      issues.push(`animation lab 实验 ${experimentId} 链接了未知实践页: ${href}`)
      continue
    }

    const entries = entriesByProjectId.get(projectId) ?? []
    if (!entries.some((entry) => entry.animationLabExperimentIds.includes(experimentId))) {
      issues.push(`${projectId} 缺少 animation lab 反向索引: ${experimentId}`)
    }
  }
}

if (!practiceMotionContent.includes('PracticeMotionEntry[]')) {
  issues.push('practice-motion 索引需要显式声明 PracticeMotionEntry[] 类型')
}

if (issues.length === 0) {
  console.log('check:practice-motion 通过')
  process.exit(0)
}

console.error('实践篇动效索引校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
