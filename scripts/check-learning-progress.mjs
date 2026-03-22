import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const typesPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'types.ts')
const chapterGuidePath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'ChapterLearningGuide.vue'
)
const practiceGuidePath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'PracticeProjectGuide.vue'
)
const storePath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'learning-progress',
  'learningProgressStorage.ts'
)
const togglePath = path.join(rootDir, '.vitepress', 'theme', 'components', 'LearningProgressToggle.vue')

const issues = []

if (!existsSync(typesPath)) {
  issues.push('缺少 .vitepress/theme/components/types.ts')
}

if (!existsSync(storePath)) {
  issues.push('缺少 .vitepress/theme/components/learning-progress/learningProgressStorage.ts')
}

if (!existsSync(togglePath)) {
  issues.push('缺少 .vitepress/theme/components/LearningProgressToggle.vue')
}

if (!existsSync(chapterGuidePath)) {
  issues.push('缺少 .vitepress/theme/components/ChapterLearningGuide.vue')
}

if (!existsSync(practiceGuidePath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectGuide.vue')
}

const packageJson = readFileSync(packageJsonPath, 'utf8')

if (!packageJson.includes('check:learning-progress')) {
  issues.push('package.json 尚未声明 check:learning-progress')
}

if (!packageJson.includes('bun run check:learning-progress')) {
  issues.push('build:strict 尚未接入 check:learning-progress')
}

const typesSource = readFileSync(typesPath, 'utf8')
if (!typesSource.includes('LEARNING_PROGRESS_STATUSES')) {
  issues.push('types.ts 尚未声明 LEARNING_PROGRESS_STATUSES')
}

const storeSource = readFileSync(storePath, 'utf8')
if (!storeSource.includes('LEARNING_PROGRESS_STORAGE_KEY')) {
  issues.push('learningProgressStorage.ts 尚未声明统一 storage key')
}

const chapterGuideSource = readFileSync(chapterGuidePath, 'utf8')
if (!chapterGuideSource.includes('LearningProgressToggle')) {
  issues.push('ChapterLearningGuide.vue 尚未接入 LearningProgressToggle')
}

const practiceGuideSource = readFileSync(practiceGuidePath, 'utf8')
if (!practiceGuideSource.includes('LearningProgressToggle')) {
  issues.push('PracticeProjectGuide.vue 尚未接入 LearningProgressToggle')
}

if (issues.length === 0) {
  console.log('check:learning-progress 通过')
  process.exit(0)
}

console.error('学习进度校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
