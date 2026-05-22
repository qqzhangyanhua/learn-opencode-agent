import { describe, expect, test } from 'bun:test'

import { createGraphRagVisitTimer } from './graphRagVisitTimer'

describe('createGraphRagVisitTimer', () => {
  test('clear cancels a pending visit callback', async () => {
    const visitTimer = createGraphRagVisitTimer()
    let visited = false

    visitTimer.schedule(() => {
      visited = true
    }, 5)
    visitTimer.clear()

    await new Promise(resolve => setTimeout(resolve, 15))

    expect(visited).toBe(false)
  })
})
