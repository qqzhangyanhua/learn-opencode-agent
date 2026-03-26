import { describe, expect, test } from 'bun:test'

import { extensionBestPracticeScenario } from './extensionBestPracticeScenario'

describe('extensionBestPracticeScenario', () => {
  test('包含第 20 章三类扩展实践与验证收口', () => {
    const titles = extensionBestPracticeScenario.steps.map((step) => step.title)

    expect(extensionBestPracticeScenario.title).toBe('扩展最佳实践清单')
    expect(titles).toContain('新增 Agent')
    expect(titles).toContain('新增 Tool')
    expect(titles).toContain('新增 Hook')
    expect(titles).toContain('调试与测试')
    expect(titles).toContain('生产约束')
  })

  test('覆盖正文中的关键注册点与约束原则', () => {
    const details = extensionBestPracticeScenario.steps.map((step) => step.detail).join('\n')
    const labels = extensionBestPracticeScenario.steps
      .map((step) => step.codeLabel)
      .filter((value): value is string => Boolean(value))

    expect(details.includes('createAgentToolRestrictions')).toBe(true)
    expect(details.includes('snake_case')).toBe(true)
    expect(details.includes('HookNameSchema')).toBe(true)
    expect(labels.some((label) => label.includes('builtin-agents'))).toBe(true)
  })
})
