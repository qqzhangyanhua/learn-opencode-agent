import { describe, expect, test } from 'bun:test'

import { taskExecutionScenario } from './taskExecutionScenario'

describe('taskExecutionScenario', () => {
  test('包含第 02 章主链路需要的 8 个关键阶段', () => {
    const titles = taskExecutionScenario.steps.map((step) => step.title)

    expect(taskExecutionScenario.title).toBe('一次任务的完整代码路径')
    expect(titles).toContain('用户输入任务')
    expect(titles).toContain('入口初始化')
    expect(titles).toContain('进入共享服务边界')
    expect(titles).toContain('创建或获取会话')
    expect(titles).toContain('System Prompt 装配')
    expect(titles).toContain('主执行循环')
    expect(titles).toContain('工具执行')
    expect(titles).toContain('消息持久化与回流')
  })

  test('覆盖正文中的核心源码边界', () => {
    const codeLabels = taskExecutionScenario.steps
      .map((step) => step.codeLabel)
      .filter((value): value is string => Boolean(value))

    expect(codeLabels.some((label) => label.includes('src/index.ts'))).toBe(true)
    expect(codeLabels.some((label) => label.includes('server/server.ts'))).toBe(true)
    expect(codeLabels.some((label) => label.includes('session/prompt.ts'))).toBe(true)
    expect(codeLabels.some((label) => label.includes('session/processor.ts'))).toBe(true)
  })
})
