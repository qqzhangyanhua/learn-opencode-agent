export type ContentType = 'theory' | 'practice' | 'intermediate' | 'support'
export type ContentSeries = 'book' | 'practice' | 'intermediate' | 'support'
export type LearningDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type EntryMode = 'read-first' | 'build-first' | 'bridge'
export type SectionId = 'theory' | 'practice' | 'intermediate'
export type LearningPathId = 'theory-first' | 'practice-first' | 'engineering-depth'
export const CONTENT_TYPES = ['theory', 'practice', 'intermediate', 'support'] as const satisfies readonly ContentType[]
export const CONTENT_SERIES = ['book', 'practice', 'intermediate', 'support'] as const satisfies readonly ContentSeries[]
export const LEARNING_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const satisfies readonly LearningDifficulty[]
export const ENTRY_MODES = ['read-first', 'build-first', 'bridge'] as const satisfies readonly EntryMode[]
export const SECTION_IDS = ['theory', 'practice', 'intermediate'] as const satisfies readonly SectionId[]
export const LEARNING_PATH_IDS = ['theory-first', 'practice-first', 'engineering-depth'] as const satisfies readonly LearningPathId[]
export const PRACTICE_PHASE_IDS = [
  'phase-1',
  'phase-2',
  'phase-3',
  'phase-4',
  'phase-5',
  'phase-6',
  'phase-7'
] as const
export const PRACTICE_PHASE_ORDERS = [1, 2, 3, 4, 5, 6, 7] as const
export type PracticePhaseId = typeof PRACTICE_PHASE_IDS[number]
export type PracticePhaseOrder = typeof PRACTICE_PHASE_ORDERS[number]

export interface LearningContentFrontmatter {
  contentType: ContentType
  series: ContentSeries
  contentId: string
  shortTitle: string
  summary: string
  difficulty: LearningDifficulty
  estimatedTime: string
  learningGoals: string[]
  prerequisites: string[]
  recommendedNext: string[]
  practiceLinks: string[]
  searchTags: string[]
  navigationLabel: string
  entryMode: EntryMode
  roleDescription: string
}

export interface LearningPathStep {
  order: number
  contentId: string
  reason: string
}

export interface LearningPathDefinition {
  pathId: LearningPathId
  title: string
  goal: string
  audience: string[]
  recommendedStart: string
  entryCriteria: string[]
  outcomes: string[]
  steps: LearningPathStep[]
}

export interface SectionRoleSummary {
  sectionId: SectionId
  title: string
  roleDescription: string
  entryMode: EntryMode
  recommendedStart: string
  countLabel: string
}

export interface PracticePhaseSummary {
  phaseId: 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'phase-5' | 'phase-6' | 'phase-7'
  order: 1 | 2 | 3 | 4 | 5 | 6 | 7
  title: string
  subtitle: string
  summary: string
  projectCount: number
  projectIds: string[]
  recommendedStart: string
  themeTags: string[]
}

export const REQUIRED_LEARNING_FRONTMATTER_FIELDS = [
  'contentType',
  'series',
  'contentId',
  'shortTitle',
  'summary',
  'difficulty',
  'estimatedTime',
  'learningGoals',
  'prerequisites',
  'recommendedNext',
  'practiceLinks',
  'searchTags',
  'navigationLabel',
  'entryMode',
  'roleDescription'
] as const satisfies readonly (keyof LearningContentFrontmatter)[]

export type RequiredLearningFrontmatterField =
  typeof REQUIRED_LEARNING_FRONTMATTER_FIELDS[number]

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export function normalizePathList(value: unknown): string[] {
  return normalizeStringList(value).map((item) => item.replace(/\/+$/, '') || '/')
}

export function normalizeLearningFrontmatter(
  value: Partial<LearningContentFrontmatter>
): LearningContentFrontmatter {
  return {
    contentType: value.contentType ?? 'support',
    series: value.series ?? 'support',
    contentId: value.contentId?.trim() ?? '',
    shortTitle: value.shortTitle?.trim() ?? '',
    summary: value.summary?.trim() ?? '',
    difficulty: value.difficulty ?? 'beginner',
    estimatedTime: value.estimatedTime?.trim() ?? '',
    learningGoals: normalizeStringList(value.learningGoals),
    prerequisites: normalizeStringList(value.prerequisites),
    recommendedNext: normalizePathList(value.recommendedNext),
    practiceLinks: normalizePathList(value.practiceLinks),
    searchTags: normalizeStringList(value.searchTags),
    navigationLabel: value.navigationLabel?.trim() ?? '',
    entryMode: value.entryMode ?? 'read-first',
    roleDescription: value.roleDescription?.trim() ?? ''
  }
}
