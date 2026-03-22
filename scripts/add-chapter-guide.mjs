#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const chapters = [
  'docs/02-agent-core/index.md',
  'docs/05-provider-system/index.md',
  'docs/06-mcp-integration/index.md',
  'docs/07-tui-interface/index.md',
  'docs/08-http-api-server/index.md',
  'docs/09-data-persistence/index.md',
  'docs/10-multi-platform-ui/index.md',
  'docs/11-code-intelligence/index.md',
  'docs/12-plugins-extensions/index.md',
  'docs/13-deployment-infrastructure/index.md',
  'docs/14-testing-quality/index.md',
  'docs/15-advanced-topics/index.md',
  'docs/16-plugin-overview/index.md',
  'docs/17-multi-model-orchestration/index.md',
  'docs/18-hooks-architecture/index.md',
  'docs/19-tool-extension/index.md'
]

async function addChapterGuide() {
  for (const chapterPath of chapters) {
    const fullPath = join(process.cwd(), chapterPath)
    const content = await readFile(fullPath, 'utf-8')

    // 检查是否已经有 ChapterLearningGuide
    if (content.includes('<ChapterLearningGuide')) {
      console.log(`跳过 ${chapterPath}（已存在）`)
      continue
    }

    // 找到 frontmatter 结束位置
    const lines = content.split('\n')
    let frontmatterEnd = -1
    let inFrontmatter = false
    let dashCount = 0

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        dashCount++
        if (dashCount === 1) {
          inFrontmatter = true
        } else if (dashCount === 2) {
          frontmatterEnd = i
          break
        }
      }
    }

    if (frontmatterEnd === -1) {
      console.log(`跳过 ${chapterPath}（未找到 frontmatter）`)
      continue
    }

    // 在 frontmatter 后插入组件
    const beforeFrontmatter = lines.slice(0, frontmatterEnd + 1)
    const afterFrontmatter = lines.slice(frontmatterEnd + 1)

    // 移除旧的学习目标、前置知识等块（如果存在）
    let contentStart = 0
    for (let i = 0; i < afterFrontmatter.length; i++) {
      const line = afterFrontmatter[i].trim()
      // 跳过空行
      if (line === '') continue
      // 跳过旧的引用块
      if (line.startsWith('> **学习目标**') ||
          line.startsWith('> **前置知识**') ||
          line.startsWith('> **源码路径**') ||
          line.startsWith('> **阅读时间**')) {
        continue
      }
      // 跳过分隔线
      if (line === '---') {
        contentStart = i + 1
        break
      }
      // 找到实际内容开始
      contentStart = i
      break
    }

    const actualContent = afterFrontmatter.slice(contentStart)

    const newContent = [
      ...beforeFrontmatter,
      '',
      '<ChapterLearningGuide />',
      '',
      ...actualContent
    ].join('\n')

    await writeFile(fullPath, newContent, 'utf-8')
    console.log(`✓ 已添加到 ${chapterPath}`)
  }
}

addChapterGuide().catch(console.error)
