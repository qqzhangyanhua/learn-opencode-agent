import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const themeIndexPath = path.join(rootDir, '.vitepress', 'theme', 'index.ts')
const practiceIndexPath = path.join(rootDir, 'docs', 'practice', 'index.md')
const practiceRegistryPath = path.join(rootDir, '.vitepress', 'theme', 'data', 'practice-projects.ts')
const routeExplorerPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeRouteExplorer.vue')
const syllabusPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectSyllabus.vue')

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

const themeIndex = readFileSync(themeIndexPath, 'utf8')
if (!themeIndex.includes('PracticeRouteExplorer')) {
  issues.push('主题入口尚未注册 PracticeRouteExplorer')
}

if (!themeIndex.includes('PracticeProjectSyllabus')) {
  issues.push('主题入口尚未注册 PracticeProjectSyllabus')
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

if (issues.length === 0) {
  console.log('check:practice-course-experience 通过')
  process.exit(0)
}

console.error('实践篇课程化校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
