import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const themeIndexPath = path.join(rootDir, '.vitepress', 'theme', 'index.ts')
const guidePath = path.join(rootDir, '.vitepress', 'theme', 'components', 'ChapterLearningGuide.vue')
const actionPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'ChapterActionPanel.vue')

const issues = []

if (!existsSync(guidePath)) {
  issues.push('缺少 .vitepress/theme/components/ChapterLearningGuide.vue')
}

if (!existsSync(actionPath)) {
  issues.push('缺少 .vitepress/theme/components/ChapterActionPanel.vue')
}

const themeIndex = readFileSync(themeIndexPath, 'utf8')
if (!themeIndex.includes('ChapterLearningGuide')) {
  issues.push('主题入口尚未注册 ChapterLearningGuide')
}

if (!themeIndex.includes('ChapterActionPanel')) {
  issues.push('主题入口尚未注册 ChapterActionPanel')
}

const packageJson = readFileSync(packageJsonPath, 'utf8')
if (!packageJson.includes('check:chapter-experience')) {
  issues.push('package.json 尚未声明 check:chapter-experience')
}

if (!packageJson.includes('bun run check:chapter-experience')) {
  issues.push('build:strict 尚未接入 check:chapter-experience')
}

if (issues.length === 0) {
  console.log('check:chapter-experience 通过')
  process.exit(0)
}

console.error('章节体验校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
