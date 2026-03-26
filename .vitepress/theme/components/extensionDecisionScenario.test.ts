import { describe, expect, test } from 'bun:test'

import { extensionDecisionScenario } from './extensionDecisionScenario'

describe('extensionDecisionScenario', () => {
  test('包含第 12 章需要的标题和 5 个扩展结果节点', () => {
    expect(extensionDecisionScenario.title).toBe('扩展方式选择器')

    const titles = extensionDecisionScenario.steps.map((step) => step.title)

    expect(titles).toContain('Plugin')
    expect(titles).toContain('Skill')
    expect(titles).toContain('Command')
    expect(titles).toContain('MCP')
    expect(titles).toContain('编辑器扩展')
  })

  test('包含核心判断节点，覆盖正文里的选择路径', () => {
    const titles = extensionDecisionScenario.steps.map((step) => step.title)

    expect(titles).toContain('需要运行逻辑吗？')
    expect(titles).toContain('需要教模型工作流吗？')
    expect(titles).toContain('只是固定提示模板吗？')
    expect(titles).toContain('能力来自外部系统吗？')
  })
})
