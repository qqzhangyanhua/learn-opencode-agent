import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const configContent = readFileSync(path.join(rootDir, '.vitepress', 'config.mts'), 'utf8')
const practiceContent = readFileSync(path.join(rootDir, 'docs', 'practice', 'index.md'), 'utf8')
const intermediateContent = readFileSync(path.join(rootDir, 'docs', 'intermediate', 'index.md'), 'utf8')
const learningPathsContent = readFileSync(path.join(rootDir, 'docs', 'learning-paths', 'index.md'), 'utf8')

const issues = []

const requiredNavTexts = ['学习路径', '实践篇', '中级篇', '阅读地图']
for (const text of requiredNavTexts) {
  if (!configContent.includes(`text: '${text}'`)) {
    issues.push(`顶层导航缺少「${text}」入口`)
  }
}

const rootSidebarLinks = ['/learning-paths/', '/practice/', '/intermediate/', '/reading-map']
for (const link of rootSidebarLinks) {
  if (!configContent.includes(`link: '${link}'`)) {
    issues.push(`根侧边栏缺少 ${link} 入口`)
  }
}

if (!practiceContent.includes('/learning-paths/')) {
  issues.push('实践页缺少返回学习路径的入口')
}

if (!practiceContent.includes('/intermediate/')) {
  issues.push('实践页缺少前往中级篇的入口')
}

if (!intermediateContent.includes('/learning-paths/')) {
  issues.push('中级篇缺少返回学习路径的入口')
}

if (!intermediateContent.includes('/practice/')) {
  issues.push('中级篇缺少返回实践篇的入口')
}

if (!learningPathsContent.includes('/practice/')) {
  issues.push('学习路径页缺少直达实践篇的入口')
}

if (!learningPathsContent.includes('/intermediate/')) {
  issues.push('学习路径页缺少直达中级篇的入口')
}

if (issues.length === 0) {
  console.log('check:navigation-entry 通过')
  process.exit(0)
}

console.error('导航与板块入口校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
