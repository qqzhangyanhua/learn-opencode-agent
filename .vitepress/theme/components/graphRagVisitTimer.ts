export interface GraphRagVisitTimer {
  schedule(callback: () => void, delayMs: number): void
  clear(): void
}

export function createGraphRagVisitTimer(): GraphRagVisitTimer {
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    schedule(callback, delayMs) {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        callback()
      }, delayMs)
    },
    clear() {
      if (timer === null) return
      clearTimeout(timer)
      timer = null
    },
  }
}
