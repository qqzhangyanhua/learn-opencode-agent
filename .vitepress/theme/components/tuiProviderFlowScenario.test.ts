import { describe, expect, test } from 'bun:test'

import { tuiProviderFlowScenario } from './tuiProviderFlowScenario'

describe('tuiProviderFlowScenario', () => {
  test('包含第 07 章 TUI 启动与状态流的关键阶段', () => {
    const titles = tuiProviderFlowScenario.steps.map((step) => step.title)

    expect(tuiProviderFlowScenario.title).toBe('TUI Provider 启动与状态流')
    expect(titles).toContain('run.ts 启动入口')
    expect(titles).toContain('Provider 树挂载')
    expect(titles).toContain('SDKProvider 建立双通道')
    expect(titles).toContain('SSE 事件进入队列')
    expect(titles).toContain('批处理 flush()')
    expect(titles).toContain('SyncProvider 更新 Store')
    expect(titles).toContain('Session / Home 局部刷新')
  })

  test('覆盖正文里的关键文件和运行语义', () => {
    const labels = tuiProviderFlowScenario.steps
      .map((step) => step.codeLabel)
      .filter((value): value is string => Boolean(value))

    expect(labels.some((label) => label.includes('cli/cmd/run.ts'))).toBe(true)
    expect(labels.some((label) => label.includes('cli/cmd/tui/app.tsx'))).toBe(true)
    expect(labels.some((label) => label.includes('context/sdk.tsx'))).toBe(true)
    expect(labels.some((label) => label.includes('context/sync.tsx'))).toBe(true)
  })
})
