#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const chapters = [
  {
    path: 'docs/intermediate/25-rag-failure-patterns/index.md',
    contentId: 'intermediate-25-rag-failure-patterns',
    roleDescription: '理解 RAG 系统常见故障模式，掌握排查与修复方法。'
  },
  {
    path: 'docs/intermediate/26-multi-agent-collaboration/index.md',
    contentId: 'intermediate-26-multi-agent-collaboration',
    roleDescription: '深入多 Agent 协作机制，理解任务分配与状态同步。'
  },
  {
    path: 'docs/intermediate/28-context-engineering/index.md',
    contentId: 'intermediate-28-context-engineering',
    roleDescription: '掌握上下文工程技巧，优化 Token 使用与信息密度。'
  },
  {
    path: 'docs/intermediate/29-system-prompt-design/index.md',
    contentId: 'intermediate-29-system-prompt-design',
    roleDescription: '理解 System Prompt 设计原则，提升 Agent 行为稳定性。'
  },
  {
    path: 'docs/intermediate/30-production-architecture/index.md',
    contentId: 'intermediate-30-production-architecture',
    roleDescription: '理解生产环境架构设计，掌握可靠性与可扩展性策略。'
  },
  {
    path: 'docs/intermediate/31-safety-boundaries/index.md',
    contentId: 'intermediate-31-safety-boundaries',
    roleDescription: '建立安全边界机制，防范注入攻击与权限滥用。'
  },
  {
    path: 'docs/intermediate/32-performance-cost/index.md',
    contentId: 'intermediate-32-performance-cost',
    roleDescription: '优化性能与成本，理解 Token 计费与缓存策略。'
  }
]

async function addIntermediateChapterGuide() {
  for (const chapter of chapters) {
    const fullPath = join(process.cwd(), chapter.path)
    const content = await readFile(fullPath, 'utf-8')

    // 检查是否已经有 ChapterLearningGuide
    if (content.includes('<ChapterLearningGuide')) {
      console.log(`跳过 ${chapter.path}（已存在）`)
      continue
    }

    const lines = content.split('\n')
    const newLines = []
    let frontmatterEnd = -1
    let dashCount = 0
    let afterFrontmatter = []

    // 找到 frontmatter 结束位置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        dashCount++
        if (dashCount === 2) {
          frontmatterEnd = i
          break
        }
      }
    }

    if (frontmatterEnd === -1) {
      console.log(`跳过 ${chapter.path}（未找到 frontmatter）`)
      continue
    }

    // 处理 frontmatter
    const frontmatterLines = lines.slice(0, frontmatterEnd)

    // 检查并添加缺失的字段
    let hasContentType = false
    let hasContentId = false
    let hasSeries = false
    let hasRoleDescription = false

    for (const line of frontmatterLines) {
      if (line.startsWith('contentType:')) hasContentType = true
      if (line.startsWith('contentId:')) hasContentId = true
      if (line.startsWith('series:')) hasSeries = true
      if (line.startsWith('roleDescription:')) hasRoleDescription = true
    }

    // 构建新的 frontmatter
    newLines.push(...frontmatterLines)
    if (!hasContentType) newLines.push('contentType: intermediate')
    if (!hasContentId) newLines.push(`contentId: ${chapter.contentId}`)
    if (!hasSeries) newLines.push('series: book')
    if (!hasRoleDescription) newLines.push(`roleDescription: ${chapter.roleDescription}`)
    newLines.push('---')
    newLines.push('')
    newLines.push('<ChapterLearningGuide />')
    newLines.push('')

    // 处理 frontmatter 后的内容，跳过旧的引用块
    afterFrontmatter = lines.slice(frontmatterEnd + 1)
    let contentStart = 0

    for (let i = 0; i < afterFrontmatter.length; i++) {
      const line = afterFrontmatter[i].trim()
      // 跳过空行
      if (line === '') continue
      // 跳过旧的引用块
      if (line.startsWith('> **对应路径**') ||
          line.startsWith('> **前置阅读**') ||
          line.startsWith('> **学习目标**')) {
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

    newLines.push(...afterFrontmatter.slice(contentStart))

    await writeFile(fullPath, newLines.join('\n'), 'utf-8')
    console.log(`✓ 已添加到 ${chapter.path}`)
  }
}

addIntermediateChapterGuide().catch(console.error)
