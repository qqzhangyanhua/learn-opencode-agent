#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const chapters = [
  { path: 'docs/02-agent-core/index.md', contentId: 'book-02-agent-core' },
  { path: 'docs/05-provider-system/index.md', contentId: 'book-05-provider-system' },
  { path: 'docs/06-mcp-integration/index.md', contentId: 'book-06-mcp-integration' },
  { path: 'docs/07-tui-interface/index.md', contentId: 'book-07-tui-interface' },
  { path: 'docs/08-http-api-server/index.md', contentId: 'book-08-http-api-server' },
  { path: 'docs/09-data-persistence/index.md', contentId: 'book-09-data-persistence' },
  { path: 'docs/10-multi-platform-ui/index.md', contentId: 'book-10-multi-platform-ui' },
  { path: 'docs/11-code-intelligence/index.md', contentId: 'book-11-code-intelligence' },
  { path: 'docs/12-plugins-extensions/index.md', contentId: 'book-12-plugins-extensions' },
  { path: 'docs/13-deployment-infrastructure/index.md', contentId: 'book-13-deployment-infrastructure' },
  { path: 'docs/14-testing-quality/index.md', contentId: 'book-14-testing-quality' },
  { path: 'docs/15-advanced-topics/index.md', contentId: 'book-15-advanced-topics' },
  { path: 'docs/16-plugin-overview/index.md', contentId: 'book-16-plugin-overview' },
  { path: 'docs/17-multi-model-orchestration/index.md', contentId: 'book-17-multi-model-orchestration' },
  { path: 'docs/18-hooks-architecture/index.md', contentId: 'book-18-hooks-architecture' },
  { path: 'docs/19-tool-extension/index.md', contentId: 'book-19-tool-extension' }
]

async function addContentFields() {
  for (const chapter of chapters) {
    const fullPath = join(process.cwd(), chapter.path)
    const content = await readFile(fullPath, 'utf-8')

    // 检查是否已经有这些字段
    if (content.includes('contentType:') && content.includes('contentId:')) {
      console.log(`跳过 ${chapter.path}（已存在）`)
      continue
    }

    const lines = content.split('\n')
    const newLines = []
    let inFrontmatter = false
    let dashCount = 0
    let inserted = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.trim() === '---') {
        dashCount++
        if (dashCount === 1) {
          inFrontmatter = true
          newLines.push(line)
          continue
        }
        if (dashCount === 2) {
          // 在 frontmatter 结束前插入
          if (!inserted) {
            newLines.push('contentType: theory')
            newLines.push(`contentId: ${chapter.contentId}`)
            newLines.push('series: book')
            inserted = true
          }
          newLines.push(line)
          continue
        }
      }

      newLines.push(line)
    }

    await writeFile(fullPath, newLines.join('\n'), 'utf-8')
    console.log(`✓ 已添加到 ${chapter.path}`)
  }
}

addContentFields().catch(console.error)
