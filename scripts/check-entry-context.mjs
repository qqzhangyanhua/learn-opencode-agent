import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bannerPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'EntryContextBanner.vue')
const themeIndexPath = path.join(rootDir, '.vitepress', 'theme', 'index.ts')
const targetPages = [
  ['阅读地图', path.join(rootDir, 'docs', 'reading-map.md')],
  ['实践页', path.join(rootDir, 'docs', 'practice', 'index.md')],
  ['中级篇', path.join(rootDir, 'docs', 'intermediate', 'index.md')]
]

const issues = []

if (!existsSync(bannerPath)) {
  issues.push('缺少 EntryContextBanner.vue 统一组件')
}

const themeIndex = readFileSync(themeIndexPath, 'utf8')
if (!themeIndex.includes('EntryContextBanner')) {
  issues.push('主题入口尚未注册 EntryContextBanner')
}

for (const [label, pagePath] of targetPages) {
  const content = readFileSync(pagePath, 'utf8')
  if (!content.includes('<EntryContextBanner')) {
    issues.push(`${label}尚未接入 <EntryContextBanner />`)
  }
}

if (existsSync(bannerPath)) {
  const bannerContent = readFileSync(bannerPath, 'utf8')
  const requiredTokens = ['section', 'summary', 'nextSteps', 'supportLinks']
  for (const token of requiredTokens) {
    if (!bannerContent.includes(token)) {
      issues.push(`EntryContextBanner.vue 缺少 ${token} 配置能力`)
    }
  }
}

if (issues.length === 0) {
  console.log('check:entry-context 通过')
  process.exit(0)
}

console.error('入口上下文提示校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
