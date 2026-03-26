export interface FlowPlaybackStep {
  id: string
}

export interface FlowPlayback {
  currentIndex: () => number
  currentStepId: () => string | undefined
  visibleStepIds: () => string[]
  progress: () => { current: number; total: number }
  isAtStart: () => boolean
  isAtEnd: () => boolean
  next: () => void
  prev: () => void
  restart: () => void
}

export function createFlowPlayback(steps: FlowPlaybackStep[]): FlowPlayback {
  let index = 0

  const clamp = (value: number) => {
    if (steps.length === 0) return 0
    return Math.min(Math.max(value, 0), steps.length - 1)
  }

  return {
    currentIndex: () => index,
    currentStepId: () => steps[index]?.id,
    visibleStepIds: () => steps.slice(0, index + 1).map((step) => step.id),
    progress: () => ({
      current: steps.length === 0 ? 0 : index + 1,
      total: steps.length,
    }),
    isAtStart: () => index === 0,
    isAtEnd: () => steps.length === 0 || index === steps.length - 1,
    next: () => {
      index = clamp(index + 1)
    },
    prev: () => {
      index = clamp(index - 1)
    },
    restart: () => {
      index = 0
    },
  }
}
