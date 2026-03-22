import type {
  LearningDifficulty,
  LearningPathDefinition,
  PracticePhaseSummary,
  SectionRoleSummary
} from '../data/content-meta'

export type {
  ContentSeries,
  ContentType,
  EntryMode,
  LearningContentFrontmatter,
  LearningDifficulty,
  LearningPathDefinition,
  LearningPathStep,
  PracticePhaseSummary,
  SectionId,
  SectionRoleSummary
} from '../data/content-meta'

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

export interface LearningPathProps {
  pathIds?: LearningPathDefinition['pathId'][]
}

export interface LearningPhase {
  number: string
  title: string
  description: string
  goal: string
  outcome: string
  chapters: LearningPathChapter[]
}

export interface SectionRoleGridProps {
  sections?: SectionRoleSummary[]
}

export interface PracticePhaseGridProps {
  phases?: PracticePhaseSummary[]
}

export interface PracticeTagCloudProps {
  tags: string[]
}

export interface ProjectCardProps {
  title: string
  difficulty: LearningDifficulty
  duration: string
  prerequisites: string[]
  tags: string[]
}

export interface RunCommandProps {
  command: string
  hint?: string
  verified?: boolean
}

export interface TrackHighlight {
  icon: string
  text: string
}

export interface PracticePreviewProps {
  theoryChapters?: number
  practiceProjects?: number
  practicePhases?: number
}

export interface ChapterActionItem {
  title: string
  description: string
  href?: string
}

export interface ChapterLearningGuideProps {
  audience?: string[]
  stageLabel?: string
}

export interface ChapterActionPanelProps {
  title?: string
  actionItems?: ChapterActionItem[]
}

// ===== 动画系统类型 =====

export interface AnimationContainerProps {
  title?: string
  statusText?: string
}

export interface LottiePlayerProps {
  animationData: object
  autoplay?: boolean
  loop?: boolean
  speed?: number
}

export interface AnimationStage {
  key: string
  label: string
  duration: number
}

export interface UseIntersectionObserverOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

// ===== 中级篇通用工具类型 =====

export type DemoTone = 'positive' | 'negative' | 'neutral' | 'info' | 'success' | 'warning' | 'danger'
export type DemoPlaybackStatus = 'idle' | 'playing' | 'paused' | 'completed'
export type DemoStepStatus = 'pending' | 'active' | 'done' | 'blocked'

export interface DemoBudget {
  used: number
  total: number
  reserved?: number
  warningAt?: number
  dangerAt?: number
}

export interface DemoScenarioMeta {
  id: string
  label: string
  tone: DemoTone
}

// ===== Ch25: RAG 检索准确性 =====

export interface RagChunk {
  id: string
  source: string
  text: string
  score: number
  isRelevant: boolean
}

export interface RagScenario {
  meta: DemoScenarioMeta
  query: string
  chunks: RagChunk[]
  expectedAnswer: string
  evaluation: string
}

export interface RagAccuracyDemoProps {
  scenarios: RagScenario[]
  autoPlay?: boolean
}

// ===== Ch26: 多智能体协作 =====

export interface AgentInfo {
  id: string
  name: string
  role: string
}

export type AgentMessageType = 'task' | 'result' | 'tool_call' | 'tool_result' | 'decision'

export interface AgentMessage {
  from: string
  to: string
  type: AgentMessageType
  content: string
  metadata?: Record<string, string | number>
}

export interface MultiAgentWorkflowDetailedProps {
  agents: AgentInfo[]
  messages: AgentMessage[]
  playSpeed?: number
  autoPlay?: boolean
}

// ===== Ch27: Planning 机制 =====

export interface PlanTaskNode {
  id: string
  title: string
  description: string
  status: DemoStepStatus
  priority: 'p0' | 'p1' | 'p2'
  estimatedTokens: number
  dependsOn: string[]
  children?: PlanTaskNode[]
}

export interface PlanningTreeDemoProps {
  tasks: PlanTaskNode[]
  autoPlay?: boolean
  playSpeed?: number
}

// ===== Ch28: 上下文工程 =====

export interface ContextCandidate {
  id: string
  label: string
  type: string
  relevanceScore: number
  recencyScore: number
  tokens: number
  preview?: string
}

export interface ContextEngineeringExtendedProps {
  candidates: ContextCandidate[]
  tokenBudget?: number
}

// ===== Ch29: System Prompt 设计 =====

export interface PromptSection {
  id: string
  label: string
  description: string
  required: boolean
  maxTokens: number
  content: string
}

export type PromptLintSeverity = 'info' | 'warning' | 'error'

export interface PromptLintIssue {
  id: string
  severity: PromptLintSeverity
  sectionId: string
  message: string
  suggestion: string
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  tags: string[]
  sections: PromptSection[]
}

export interface PromptDesignStudioProps {
  templates: PromptTemplate[]
  initialTemplateId?: string
}

// ===== Ch30: 生产架构 =====

export type TopologyNodeStatus = 'healthy' | 'degraded' | 'down'

export interface TopologyNode {
  id: string
  label: string
  role: string
  x: number
  y: number
  width: number
  height: number
  status: TopologyNodeStatus
}

export interface TopologyLink {
  source: string
  target: string
  type?: 'data' | 'control' | 'alert'
}

export interface ProductionArchitectureDiagramProps {
  title: string
  nodes: TopologyNode[]
  links: TopologyLink[]
  viewBoxWidth: number
  viewBoxHeight: number
  showLegend?: boolean
}

// ===== Ch31: 安全与边界 =====

export interface SecurityRule {
  id: string
  name: string
  level: 'critical' | 'high' | 'medium'
  description: string
  triggerKeyword?: string
}

export interface SecurityScenario {
  meta: DemoScenarioMeta
  input: string
  attackVector?: string
  expectedVerdict: 'allow' | 'block'
  reason: string
  recommendation?: string
}

export interface SecurityBoundaryDemoProps {
  scenarios: SecurityScenario[]
  rules: SecurityRule[]
}

// ===== Ch32: 性能与成本 =====

export interface CostBreakdownItem {
  label: string
  category: string
  costUsd: number
  tokens: number
}

export interface CostTip {
  id: string
  title: string
  description: string
  estimatedSaving: string
}

export interface CostScenario {
  meta: DemoScenarioMeta
  baseline: CostBreakdownItem[]
  optimized: CostBreakdownItem[]
  tips?: CostTip[]
}

export interface CostOptimizationDashboardProps {
  scenarios: CostScenario[]
}
