import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const themeIndexPath = path.join(rootDir, '.vitepress', 'theme', 'index.ts')
const practiceIndexPath = path.join(rootDir, 'docs', 'practice', 'index.md')
const practiceDocsDir = path.join(rootDir, 'docs', 'practice')
const practiceRegistryPath = path.join(rootDir, '.vitepress', 'theme', 'data', 'practice-projects.ts')
const routeExplorerPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeRouteExplorer.vue')
const syllabusPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectSyllabus.vue')
const practiceGuidePath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectGuide.vue')
const practiceActionPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectActionPanel.vue')
const practiceSourceFilesPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectSourceFiles.vue')
const relatedPracticeProjectsPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'RelatedPracticeProjects.vue')
const theoryBridgePages = [
  'docs/00-what-is-ai-agent/index.md',
  'docs/03-tool-system/index.md',
  'docs/04-session-management/index.md',
  'docs/intermediate/27-planning-mechanism/index.md'
]

const practicePagePaths = readdirSync(practiceDocsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^p\d+/.test(entry.name))
  .map((entry) => path.join(practiceDocsDir, entry.name, 'index.md'))

const issues = []

if (!existsSync(practiceRegistryPath)) {
  issues.push('缺少 .vitepress/theme/data/practice-projects.ts')
}

if (!existsSync(routeExplorerPath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeRouteExplorer.vue')
}

if (!existsSync(syllabusPath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectSyllabus.vue')
}

if (!existsSync(practiceGuidePath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectGuide.vue')
}

if (!existsSync(practiceActionPath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectActionPanel.vue')
}

if (!existsSync(practiceSourceFilesPath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectSourceFiles.vue')
}

if (!existsSync(relatedPracticeProjectsPath)) {
  issues.push('缺少 .vitepress/theme/components/RelatedPracticeProjects.vue')
}

const themeIndex = readFileSync(themeIndexPath, 'utf8')
if (!themeIndex.includes('PracticeRouteExplorer')) {
  issues.push('主题入口尚未注册 PracticeRouteExplorer')
}

if (!themeIndex.includes('PracticeProjectSyllabus')) {
  issues.push('主题入口尚未注册 PracticeProjectSyllabus')
}

if (!themeIndex.includes('PracticeProjectGuide')) {
  issues.push('主题入口尚未注册 PracticeProjectGuide')
}

if (!themeIndex.includes('PracticeProjectActionPanel')) {
  issues.push('主题入口尚未注册 PracticeProjectActionPanel')
}

if (!themeIndex.includes('PracticeProjectSourceFiles')) {
  issues.push('主题入口尚未注册 PracticeProjectSourceFiles')
}

if (!themeIndex.includes('RelatedPracticeProjects')) {
  issues.push('主题入口尚未注册 RelatedPracticeProjects')
}

const practiceGuideSource = readFileSync(practiceGuidePath, 'utf8')
if (!practiceGuideSource.includes('LearningProgressToggle')) {
  issues.push('PracticeProjectGuide.vue 尚未内嵌 LearningProgressToggle')
}

const packageJson = readFileSync(packageJsonPath, 'utf8')
if (!packageJson.includes('check:practice-course-experience')) {
  issues.push('package.json 尚未声明 check:practice-course-experience')
}

if (!packageJson.includes('bun run check:practice-course-experience')) {
  issues.push('build:strict 尚未接入 check:practice-course-experience')
}

const practiceIndex = readFileSync(practiceIndexPath, 'utf8')
if (!practiceIndex.includes('<PracticeRouteExplorer')) {
  issues.push('docs/practice/index.md 尚未接入 <PracticeRouteExplorer />')
}

if (!practiceIndex.includes('<PracticeProjectSyllabus')) {
  issues.push('docs/practice/index.md 尚未接入 <PracticeProjectSyllabus />')
}

for (const pagePath of practicePagePaths) {
  const pageContent = readFileSync(pagePath, 'utf8')
  const relativePath = path.relative(rootDir, pagePath)

  if (!pageContent.includes('<PracticeProjectGuide')) {
    issues.push(`${relativePath} 尚未接入 <PracticeProjectGuide />`)
  }

  if (!pageContent.includes('<PracticeProjectActionPanel')) {
    issues.push(`${relativePath} 尚未接入 <PracticeProjectActionPanel />`)
  }

  if (!pageContent.includes('<PracticeProjectSourceFiles')) {
    issues.push(`${relativePath} 尚未接入 <PracticeProjectSourceFiles />`)
  }
}

for (const relativePath of theoryBridgePages) {
  const pageContent = readFileSync(path.join(rootDir, relativePath), 'utf8')
  if (!pageContent.includes('<RelatedPracticeProjects')) {
    issues.push(`${relativePath} 尚未接入 <RelatedPracticeProjects />`)
  }
}

if (issues.length === 0) {
  console.log('check:practice-course-experience 通过')
  process.exit(0)
}

console.error('实践篇课程化校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
