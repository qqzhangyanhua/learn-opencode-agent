import { describe, expect, test } from 'bun:test'

import { sessionLoopLifecycleScenario } from './sessionLoopLifecycleScenario'

describe('sessionLoopLifecycleScenario', () => {
  test('覆盖第 04 章会话管理的主循环与返回分支', () => {
    expect(sessionLoopLifecycleScenario.title).toBe('Session 主循环与返回分支')
    expect(sessionLoopLifecycleScenario.steps.map((step) => step.id)).toEqual([
      'prompt',
      'processor',
      'stream',
      'tool-call',
      'tool-result',
      'decision',
      'continue',
      'compact',
      'stop',
    ])
  })

  test('包含正文强调的关键文件、压缩和 doom loop 语义', () => {
    const labels = sessionLoopLifecycleScenario.steps
      .map((step) => step.codeLabel)
      .filter(Boolean)

    expect(labels).toContain('session/prompt.ts')
    expect(labels).toContain('session/processor.ts')
    expect(labels).toContain('session/llm.ts · fullStream')
    expect(labels).toContain('MessageV2.ToolPart / updatePartDelta')
    expect(labels).toContain('return "continue" | "compact" | "stop"')
    expect(sessionLoopLifecycleScenario.steps.find((step) => step.id === 'stop')?.detail)
      .toContain('doom loop')
  })
})
