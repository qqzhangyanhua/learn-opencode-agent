import { describe, expect, test } from 'bun:test'

import { testingLayersScenario } from './testingLayersScenario'

describe('testingLayersScenario', () => {
  test('包含第 14 章需要的核心测试层与质量收口阶段', () => {
    const titles = testingLayersScenario.steps.map((step) => step.title)

    expect(testingLayersScenario.title).toBe('Agent 项目的质量分层')
    expect(titles).toContain('代码变更')
    expect(titles).toContain('Typecheck / 脚本校验')
    expect(titles).toContain('Runtime Fixture 测试')
    expect(titles).toContain('前端单元测试')
    expect(titles).toContain('Playwright E2E')
    expect(titles).toContain('质量收口')
  })

  test('覆盖正文中的核心运行方式与环境', () => {
    const labels = testingLayersScenario.steps
      .map((step) => step.codeLabel)
      .filter((value): value is string => Boolean(value))

    expect(labels.some((label) => label.includes('bun test --timeout 30000'))).toBe(true)
    expect(labels.some((label) => label.includes('Happy DOM'))).toBe(true)
    expect(labels.some((label) => label.includes('Playwright'))).toBe(true)
  })
})
