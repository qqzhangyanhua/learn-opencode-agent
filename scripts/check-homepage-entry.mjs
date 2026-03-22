import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const homePagePath = path.join(rootDir, 'docs', 'index.md')
const startPanelPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'HomeStartPanel.vue')

const requiredLabels = ['先看源码', '先做项目', '先补工程判断']
const issues = []

if (!existsSync(homePagePath)) {
  issues.push('缺少 docs/index.md，无法验证首页起步入口')
}

if (!existsSync(startPanelPath)) {
  issues.push('缺少 .vitepress/theme/components/HomeStartPanel.vue')
}

const homePage = existsSync(homePagePath) ? readFileSync(homePagePath, 'utf8') : ''
const startPanel = existsSync(startPanelPath) ? readFileSync(startPanelPath, 'utf8') : ''

if (homePage && !homePage.includes('<HomeStartPanel />')) {
  issues.push('docs/index.md 尚未接入 <HomeStartPanel />')
}

if (startPanel) {
  for (const label of requiredLabels) {
    if (!startPanel.includes(label)) {
      issues.push(`HomeStartPanel.vue 缺少起步卡标签：${label}`)
    }
  }

  if (!startPanel.includes('learningPaths')) {
    issues.push('HomeStartPanel.vue 必须消费 learningPaths 数据源')
  }

  if (!startPanel.includes('sectionById')) {
    issues.push('HomeStartPanel.vue 必须消费 sectionById 数据源')
  }
}

if (issues.length === 0) {
  console.log('check:homepage-entry 通过')
  process.exit(0)
}

console.error('首页入口校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
