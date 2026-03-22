import { CONTENT_TYPES, type ContentType } from '../../data/content-meta'
import {
  LEARNING_PROGRESS_STATUSES,
  type LearningProgressRecord,
  type LearningProgressStatus
} from '../types'

export const LEARNING_PROGRESS_STORAGE_KEY = 'ai-agent-learning-progress'

interface LearningProgressPayload {
  contentId: string
  contentType: ContentType
  status: LearningProgressStatus
}

type LearningProgressMap = Record<string, LearningProgressRecord>

function getStorageSafely(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeContentId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeContentType(value: unknown): ContentType {
  return CONTENT_TYPES.includes(value as ContentType) ? (value as ContentType) : 'support'
}

function normalizeStatus(value: unknown): LearningProgressStatus | null {
  return LEARNING_PROGRESS_STATUSES.includes(value as LearningProgressStatus)
    ? (value as LearningProgressStatus)
    : null
}

function normalizeUpdatedAt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function normalizeRecord(raw: unknown): LearningProgressRecord | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const payload = raw as Partial<LearningProgressRecord>
  const contentId = normalizeContentId(payload.contentId)
  const status = normalizeStatus(payload.status)

  if (!contentId || !status) {
    return null
  }

  return {
    contentId,
    contentType: normalizeContentType(payload.contentType),
    status,
    updatedAt: normalizeUpdatedAt(payload.updatedAt)
  }
}

function serializeRecord(payload: LearningProgressPayload): LearningProgressRecord | null {
  const contentId = normalizeContentId(payload.contentId)
  const status = normalizeStatus(payload.status)

  if (!contentId || !status) {
    return null
  }

  return {
    contentId,
    contentType: normalizeContentType(payload.contentType),
    status,
    updatedAt: Date.now()
  }
}

export function canUseLearningProgressStorage(): boolean {
  return getStorageSafely() !== null
}

export function loadLearningProgressMap(): LearningProgressMap {
  const storage = getStorageSafely()
  if (!storage) {
    return {}
  }

  try {
    const raw = storage.getItem(LEARNING_PROGRESS_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.values(parsed).reduce<LearningProgressMap>((records, item) => {
      const normalized = normalizeRecord(item)
      if (!normalized) {
        return records
      }

      records[normalized.contentId] = normalized
      return records
    }, {})
  } catch {
    return {}
  }
}

export function getLearningProgressRecord(contentId: string): LearningProgressRecord | null {
  const normalizedContentId = normalizeContentId(contentId)
  if (!normalizedContentId) {
    return null
  }

  return loadLearningProgressMap()[normalizedContentId] ?? null
}

export function saveLearningProgressStatus(
  payload: LearningProgressPayload
): LearningProgressRecord | null {
  const storage = getStorageSafely()
  if (!storage) {
    return null
  }

  const nextRecord = serializeRecord(payload)
  if (!nextRecord) {
    return null
  }

  try {
    const currentRecords = loadLearningProgressMap()
    currentRecords[nextRecord.contentId] = nextRecord
    storage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(currentRecords))
    return nextRecord
  } catch {
    return null
  }
}
