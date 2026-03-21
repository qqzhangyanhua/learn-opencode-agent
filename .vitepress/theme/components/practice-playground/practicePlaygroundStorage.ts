import {
  createDefaultPracticePlaygroundConfig,
  type PracticePlaygroundConfig,
} from './practicePlaygroundTypes'

export const PRACTICE_PLAYGROUND_STORAGE_KEY = 'practice-playground-config'

interface PracticePlaygroundStoredConfig extends PracticePlaygroundConfig {
  updatedAt: number
}

function getStorageSafely(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeConfig(raw: unknown): PracticePlaygroundConfig {
  const fallback = createDefaultPracticePlaygroundConfig()
  if (!raw || typeof raw !== 'object') return fallback

  const payload = raw as Partial<PracticePlaygroundStoredConfig>

  return {
    apiKey: typeof payload.apiKey === 'string' ? payload.apiKey : fallback.apiKey,
    baseURL: typeof payload.baseURL === 'string' ? payload.baseURL : fallback.baseURL,
    model: typeof payload.model === 'string' ? payload.model : fallback.model,
  }
}

export function loadPracticePlaygroundConfig(): PracticePlaygroundConfig {
  const storage = getStorageSafely()
  if (!storage) return createDefaultPracticePlaygroundConfig()

  try {
    const raw = storage.getItem(PRACTICE_PLAYGROUND_STORAGE_KEY)
    if (!raw) return createDefaultPracticePlaygroundConfig()
    const parsed = JSON.parse(raw)
    return normalizeConfig(parsed)
  } catch {
    return createDefaultPracticePlaygroundConfig()
  }
}

export function savePracticePlaygroundConfig(config: PracticePlaygroundConfig): boolean {
  const storage = getStorageSafely()
  if (!storage) return false

  try {
    const storedConfig: PracticePlaygroundStoredConfig = {
      ...config,
      updatedAt: Date.now(),
    }
    storage.setItem(PRACTICE_PLAYGROUND_STORAGE_KEY, JSON.stringify(storedConfig))
    return true
  } catch {
    return false
  }
}

export function clearPracticePlaygroundConfig(): boolean {
  const storage = getStorageSafely()
  if (!storage) return false

  try {
    storage.removeItem(PRACTICE_PLAYGROUND_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
