import { describe, expect, test } from 'bun:test'

import { toolExecutionLifecycleScenario } from './toolExecutionLifecycleScenario'

describe('toolExecutionLifecycleScenario', () => {
  test('覆盖第 03 章工具系统的主执行链路', () => {
    expect(toolExecutionLifecycleScenario.title).toBe('工具执行主链路')
    expect(toolExecutionLifecycleScenario.steps.map((step) => step.id)).toEqual([
      'tool-call',
      'registry',
      'permission',
      'execute',
      'truncate',
      'tool-result',
    ])
  })

  test('包含正文强调的关键源码边界与约束点', () => {
    const labels = toolExecutionLifecycleScenario.steps
      .map((step) => step.codeLabel)
      .filter(Boolean)

    expect(labels).toContain('session/processor.ts')
    expect(labels).toContain('tool/registry.ts')
    expect(labels).toContain('permission/next.ts')
    expect(labels).toContain('tool/tool.ts · execute(args, ctx)')
    expect(labels).toContain('Tool.define() · Truncate.output()')
    expect(toolExecutionLifecycleScenario.steps.find((step) => step.id === 'truncate')?.emphasis)
      .toContain('不要把超长输出原样塞回上下文')
  })
})
