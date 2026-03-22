#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const chapters = [
  {
    path: 'docs/02-agent-core/index.md',
    roleDescription: '建立 OpenCode 源码地图，把抽象概念对应到真实代码路径。'
  },
  {
    path: 'docs/05-provider-system/index.md',
    roleDescription: '理解多模型支持的工程实现，掌握 Provider 抽象层设计。'
  },
  {
    path: 'docs/06-mcp-integration/index.md',
    roleDescription: '深入 MCP 协议集成机制，理解工具扩展的标准化方案。'
  },
  {
    path: 'docs/07-tui-interface/index.md',
    roleDescription: '理解终端 UI 的实现原理，掌握 TUI 框架的使用方式。'
  },
  {
    path: 'docs/08-http-api-server/index.md',
    roleDescription: '深入 HTTP API 服务器设计，理解 SSE 流式传输机制。'
  },
  {
    path: 'docs/09-data-persistence/index.md',
    roleDescription: '理解数据持久化方案，掌握 ORM 层的设计与使用。'
  },
  {
    path: 'docs/10-multi-platform-ui/index.md',
    roleDescription: '理解多端 UI 开发策略，掌握代码共享与平台适配。'
  },
  {
    path: 'docs/11-code-intelligence/index.md',
    roleDescription: '深入代码智能实现，理解 LSP 集成与语义分析。'
  },
  {
    path: 'docs/12-plugins-extensions/index.md',
    roleDescription: '理解插件系统架构，掌握扩展机制的设计原则。'
  },
  {
    path: 'docs/13-deployment-infrastructure/index.md',
    roleDescription: '理解部署与基础设施方案，掌握云端部署策略。'
  },
  {
    path: 'docs/14-testing-quality/index.md',
    roleDescription: '理解测试策略与质量保证体系，掌握测试工程实践。'
  },
  {
    path: 'docs/15-advanced-topics/index.md',
    roleDescription: '探索高级主题与最佳实践，提升工程能力与架构视野。'
  },
  {
    path: 'docs/16-plugin-overview/index.md',
    roleDescription: '理解 oh-my-openagent 插件系统总体架构与设计理念。'
  },
  {
    path: 'docs/17-multi-model-orchestration/index.md',
    roleDescription: '深入多模型编排系统，理解模型协作与任务分配机制。'
  },
  {
    path: 'docs/18-hooks-architecture/index.md',
    roleDescription: '理解 Hooks 三层架构设计，掌握生命周期扩展机制。'
  },
  {
    path: 'docs/19-tool-extension/index.md',
    roleDescription: '深入工具扩展系统实现，理解工具注册与执行流程。'
  }
]

async function addRoleDescriptions() {
  for (const chapter of chapters) {
    const fullPath = join(process.cwd(), chapter.path)
    const content = await readFile(fullPath, 'utf-8')

    // 检查是否已经有 roleDescription
    if (content.includes('roleDescription:')) {
      console.log(`跳过 ${chapter.path}（已存在）`)
      continue
    }

    // 在 entryMode 之前插入 roleDescription
    const lines = content.split('\n')
    const newLines = []
    let inserted = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 在 entryMode 或 navigationLabel 之前插入
      if (!inserted && (line.startsWith('entryMode:') || line.startsWith('navigationLabel:'))) {
        newLines.push(`roleDescription: ${chapter.roleDescription}`)
        inserted = true
      }

      newLines.push(line)
    }

    // 如果没找到插入位置，在 frontmatter 结束前插入
    if (!inserted) {
      const finalLines = []
      let inFrontmatter = false
      let dashCount = 0

      for (let i = 0; i < newLines.length; i++) {
        const line = newLines[i]

        if (line.trim() === '---') {
          dashCount++
          if (dashCount === 2 && !inserted) {
            finalLines.push(`roleDescription: ${chapter.roleDescription}`)
            inserted = true
          }
        }

        finalLines.push(line)
      }

      await writeFile(fullPath, finalLines.join('\n'), 'utf-8')
    } else {
      await writeFile(fullPath, newLines.join('\n'), 'utf-8')
    }

    console.log(`✓ 已添加到 ${chapter.path}`)
  }
}

addRoleDescriptions().catch(console.error)
