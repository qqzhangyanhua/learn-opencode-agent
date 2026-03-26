import { describe, expect, test } from 'bun:test'

import { localCloudTopologyScenario } from './localCloudTopologyScenario'

describe('localCloudTopologyScenario', () => {
  test('包含第 13 章需要的本地与云端核心节点', () => {
    const titles = localCloudTopologyScenario.steps.map((step) => step.title)

    expect(localCloudTopologyScenario.title).toBe('本地与云端的产品拓扑')
    expect(titles).toContain('本地多入口')
    expect(titles).toContain('本地 server')
    expect(titles).toContain('packages/function')
    expect(titles).toContain('packages/console')
    expect(titles).toContain('sst.config.ts / infra')
  })

  test('覆盖正文中的关键目录与基础设施语义', () => {
    const labels = localCloudTopologyScenario.steps
      .map((step) => step.codeLabel)
      .filter((value): value is string => Boolean(value))

    expect(labels.some((label) => label.includes('packages/opencode'))).toBe(true)
    expect(labels.some((label) => label.includes('packages/app'))).toBe(true)
    expect(labels.some((label) => label.includes('packages/desktop'))).toBe(true)
    expect(labels.some((label) => label.includes('Cloudflare'))).toBe(true)
  })
})
