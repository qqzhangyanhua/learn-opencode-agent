import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const themeIndexPath = path.join(rootDir, '.vitepress', 'theme', 'index.ts')
const guidePath = path.join(rootDir, '.vitepress', 'theme', 'components', 'ChapterLearningGuide.vue')
const actionPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'ChapterActionPanel.vue')
const practiceGuidePath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectGuide.vue')
const practiceActionPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectActionPanel.vue')
const guideTargetPages = [
  'docs/00-what-is-ai-agent/index.md',
  'docs/01-agent-basics/index.md',
  'docs/03-tool-system/index.md',
  'docs/04-session-management/index.md',
  'docs/practice/p01-minimal-agent/index.md',
  'docs/practice/p10-react-loop/index.md',
  'docs/intermediate/27-planning-mechanism/index.md'
]
const upgradedPracticePages = new Set([
  'docs/practice/p01-minimal-agent/index.md',
  'docs/practice/p10-react-loop/index.md'
])

const issues = []

if (!existsSync(guidePath)) {
  issues.push('缺少 .vitepress/theme/components/ChapterLearningGuide.vue')
}

if (!existsSync(actionPath)) {
  issues.push('缺少 .vitepress/theme/components/ChapterActionPanel.vue')
}

if (!existsSync(practiceGuidePath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectGuide.vue')
}

if (!existsSync(practiceActionPath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectActionPanel.vue')
}

const themeIndex = readFileSync(themeIndexPath, 'utf8')
if (!themeIndex.includes('ChapterLearningGuide')) {
  issues.push('主题入口尚未注册 ChapterLearningGuide')
}

if (!themeIndex.includes('ChapterActionPanel')) {
  issues.push('主题入口尚未注册 ChapterActionPanel')
}

if (!themeIndex.includes('PlanningFlowSimulator')) {
  issues.push('主题入口尚未注册 PlanningFlowSimulator')
}

const packageJson = readFileSync(packageJsonPath, 'utf8')
if (!packageJson.includes('check:chapter-experience')) {
  issues.push('package.json 尚未声明 check:chapter-experience')
}

if (!packageJson.includes('bun run check:chapter-experience')) {
  issues.push('build:strict 尚未接入 check:chapter-experience')
}

for (const relativePath of guideTargetPages) {
  const pageContent = readFileSync(path.join(rootDir, relativePath), 'utf8')
  const allowPracticeUpgrade = upgradedPracticePages.has(relativePath)
  const hasGuide =
    pageContent.includes('<ChapterLearningGuide') ||
    (allowPracticeUpgrade && pageContent.includes('<PracticeProjectGuide'))
  const hasAction =
    pageContent.includes('<ChapterActionPanel') ||
    (allowPracticeUpgrade && pageContent.includes('<PracticeProjectActionPanel'))

  if (!hasGuide) {
    issues.push(`${relativePath} 尚未接入章节或实践导览组件`)
  }

  if (!hasAction) {
    issues.push(`${relativePath} 尚未接入章节或实践行动组件`)
  }

  if (pageContent.includes('<ChapterActionPanel') && !pageContent.includes('actionItems')) {
    issues.push(`${relativePath} 尚未声明 ChapterActionPanel.actionItems`)
  }

  if (
    relativePath === 'docs/intermediate/27-planning-mechanism/index.md' &&
    !pageContent.includes('<PlanningFlowSimulator')
  ) {
    issues.push('第27章尚未接入 PlanningFlowSimulator 试点组件')
  }
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
