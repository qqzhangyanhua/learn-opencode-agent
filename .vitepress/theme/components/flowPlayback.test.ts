import { describe, expect, test } from 'bun:test'

import { createFlowPlayback } from './flowPlayback'

describe('createFlowPlayback', () => {
  test('初始化时指向第一个步骤并暴露可见步骤集合', () => {
    const playback = createFlowPlayback([
      { id: 'step-1' },
      { id: 'step-2' },
      { id: 'step-3' },
    ])

    expect(playback.currentStepId()).toBe('step-1')
    expect(playback.visibleStepIds()).toEqual(['step-1'])
    expect(playback.progress()).toEqual({ current: 1, total: 3 })
  })

  test('next 会推进步骤，但不会越过最后一步', () => {
    const playback = createFlowPlayback([
      { id: 'step-1' },
      { id: 'step-2' },
    ])

    playback.next()
    expect(playback.currentStepId()).toBe('step-2')
    expect(playback.visibleStepIds()).toEqual(['step-1', 'step-2'])

    playback.next()
    expect(playback.currentStepId()).toBe('step-2')
    expect(playback.isAtEnd()).toBe(true)
  })

  test('prev 与 restart 可以回退并重置到起点', () => {
    const playback = createFlowPlayback([
      { id: 'step-1' },
      { id: 'step-2' },
      { id: 'step-3' },
    ])

    playback.next()
    playback.next()
    expect(playback.currentStepId()).toBe('step-3')

    playback.prev()
    expect(playback.currentStepId()).toBe('step-2')

    playback.restart()
    expect(playback.currentStepId()).toBe('step-1')
    expect(playback.visibleStepIds()).toEqual(['step-1'])
    expect(playback.isAtStart()).toBe(true)
  })
})
