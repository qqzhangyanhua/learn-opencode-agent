import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const configPath = path.join(rootDir, '.vitepress', 'config.mts')
const discoveryDataPath = path.join(rootDir, '.vitepress', 'theme', 'data', 'discovery-content.ts')

const issues = []

if (!existsSync(discoveryDataPath)) {
  issues.push('缺少 .vitepress/theme/data/discovery-content.ts')
}

const configContent = readFileSync(configPath, 'utf8')
if (!configContent.includes("provider: 'local'")) {
  issues.push('search.provider 必须继续使用 local')
}

if (!configContent.includes('_render')) {
  issues.push('本地搜索尚未接入 _render 语义增强')
}

if (!configContent.includes('detailedView')) {
  issues.push('本地搜索尚未显式配置 detailedView')
}

const packageJson = readFileSync(packageJsonPath, 'utf8')
if (!packageJson.includes('check:discovery-experience')) {
  issues.push('package.json 尚未声明 check:discovery-experience')
}

if (!packageJson.includes('bun run check:discovery-experience')) {
  issues.push('build:strict 尚未接入 check:discovery-experience')
}

if (existsSync(discoveryDataPath)) {
  const discoveryData = readFileSync(discoveryDataPath, 'utf8')
  const requiredExports = [
    'discoveryGoalRoutes',
    'discoveryTopicCollections',
    'getDiscoveryContentTypeLabel'
  ]

  for (const exportName of requiredExports) {
    if (!discoveryData.includes(exportName)) {
      issues.push(`discovery-content.ts 缺少 ${exportName} 导出`)
    }
  }
}

if (issues.length === 0) {
  console.log('check:discovery-experience 通过')
  process.exit(0)
}

console.error('搜索与发现体验校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
