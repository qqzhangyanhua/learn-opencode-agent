import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const practiceDir = path.join(rootDir, 'practice')
const markdownTargets = [
  path.join(rootDir, 'practice', 'README.md'),
]

async function walkDocsPractice(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkDocsPractice(fullPath)
    }
    return entry.name.endsWith('.md') ? [fullPath] : []
  }))
  return files.flat()
}

function extractPracticeEntries(content) {
  const matches = content.match(/p\d{2}(?:-[a-z0-9]+)+\.ts/g) ?? []
  return [...new Set(matches)]
}

const docsPracticeFiles = await walkDocsPractice(path.join(rootDir, 'docs', 'practice'))
const targets = [...markdownTargets, ...docsPracticeFiles]

const referencedEntries = new Map()

for (const file of targets) {
  const content = await readFile(file, 'utf8')
  for (const entry of extractPracticeEntries(content)) {
    referencedEntries.set(entry, file)
  }
}

const missingEntries = []

for (const [entry, sourceFile] of referencedEntries) {
  try {
    await stat(path.join(practiceDir, entry))
  } catch {
    missingEntries.push({
      entry,
      source: path.relative(rootDir, sourceFile),
    })
  }
}

if (missingEntries.length === 0) {
  console.log('check:practice 通过')
  process.exit(0)
}

console.error('发现文档引用了不存在的实践脚本：')
for (const issue of missingEntries) {
  console.error(`- ${issue.entry} <- ${issue.source}`)
}

process.exit(1)
