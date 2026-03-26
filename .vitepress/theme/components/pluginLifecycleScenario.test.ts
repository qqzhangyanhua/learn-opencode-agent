import { describe, expect, test } from 'bun:test'

import { pluginLifecycleScenario } from './pluginLifecycleScenario'

describe('pluginLifecycleScenario', () => {
  test('包含第 16 章四步初始化流程的关键节点', () => {
    const titles = pluginLifecycleScenario.steps.map((step) => step.title)

    expect(pluginLifecycleScenario.title).toBe('插件生命周期与热重载')
    expect(titles).toContain('调用插件入口')
    expect(titles).toContain('loadPluginConfig')
    expect(titles).toContain('createManagers')
    expect(titles).toContain('createTools')
    expect(titles).toContain('createHooks')
    expect(titles).toContain('返回 PluginInterface')
  })

  test('覆盖正文中的管理器、技能与热重载语义', () => {
    const details = pluginLifecycleScenario.steps.map((step) => step.detail).join('\n')
    const labels = pluginLifecycleScenario.steps
      .map((step) => step.codeLabel)
      .filter((value): value is string => Boolean(value))

    expect(details.includes('BackgroundManager')).toBe(true)
    expect(details.includes('mergedSkills')).toBe(true)
    expect(details.includes('activePluginDispose')).toBe(true)
    expect(labels.some((label) => label.includes('src/index.ts'))).toBe(true)
  })
})
