export interface SourceSnapshotEntry {
  label: string
  path: string
  href?: string
}

export interface SourceSnapshotCardProps {
  title?: string
  description?: string
  repo: string
  repoUrl?: string
  branch: string
  commit: string
  verifiedAt: string
  entries: SourceSnapshotEntry[]
}

export interface RuntimeLifecycleStep {
  key: string
  title: string
  summary: string
  detail: string
}

export interface RuntimeLifecycleDiagramProps {
  title?: string
  description?: string
  steps?: RuntimeLifecycleStep[]
  highlightKeys?: string[]
}

export interface TechItem {
  name: string
  category: string
  description: string
}

export interface TechGroup {
  label: string
  items: TechItem[]
}

export interface LearningPathChapter {
  name: string
  link: string
}

export interface LearningPhase {
  number: string
  title: string
  description: string
  goal: string
  outcome: string
  chapters: LearningPathChapter[]
}

export interface PracticePhase {
  id: number
  title: string
  subtitle: string
  chapterCount: number
  link: string
}

export interface PracticePhaseGridProps {
  phases: PracticePhase[]
}

export interface PracticeTagCloudProps {
  tags: string[]
}

export interface ProjectCardProps {
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  prerequisites: string[]
  tags: string[]
}

export interface RunCommandProps {
  command: string
}
