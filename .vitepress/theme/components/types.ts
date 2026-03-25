import type {
  ContentType,
  DiscoveryGoalId,
  LearningDifficulty,
  LearningPathDefinition,
  PracticePhaseSummary,
  SectionRoleSummary
} from '../data/content-meta'
import type {
  DiscoveryTopicCollection
} from '../data/discovery-content'
import type {
  PracticeCourseRoute,
  PracticeProjectDefinition
} from '../data/practice-projects'

export type {
  ContentSeries,
  ContentType,
  DiscoveryContentTypeLabel,
  DiscoveryGoalId,
  EntryMode,
  LearningContentFrontmatter,
  LearningDifficulty,
  LearningPathDefinition,
  LearningPathStep,
  PracticePhaseSummary,
  SectionId,
  SectionRoleSummary
} from '../data/content-meta'

export type {
  DiscoveryGoalRoute,
  DiscoveryTopicCollection
} from '../data/discovery-content'

export type {
  PracticeCourseRoute,
  PracticeProjectDefinition,
  PracticeReferenceLink
} from '../data/practice-projects'

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

export interface PracticeRouteExplorerProps {
  routeIds?: PracticeCourseRoute['routeId'][]
}

export interface PracticeProjectSyllabusProps {
  phaseIds?: PracticePhaseSummary['phaseId'][]
}

export interface DiscoveryGoalRoutesProps {
  goalIds?: DiscoveryGoalId[]
}

export interface DiscoveryStartGridProps {
  goalIds?: DiscoveryGoalId[]
}

export interface DiscoveryTopicHubProps {
  topicIds?: DiscoveryTopicCollection['topicId'][]
}

export interface PracticeProjectGuideProps {
  projectId: string
}

export interface PracticeProjectSourceFilesProps {
  projectId: string
  title?: string
}

export const LEARNING_PROGRESS_STATUSES = ['saved', 'active', 'done'] as const
export type LearningProgressStatus = typeof LEARNING_PROGRESS_STATUSES[number]

export interface LearningProgressStatusMeta {
  label: string
  description: string
}

export const LEARNING_PROGRESS_STATUS_META: Record<
  LearningProgressStatus,
  LearningProgressStatusMeta
> = {
  saved: {
    label: '稍后再看',
    description: '先把这页记下来，之后再系统补完。'
  },
  active: {
    label: '从这里继续',
    description: '把这页标成当前正在推进的内容。'
  },
  done: {
    label: '已完成',
    description: '这页已经看完或练完，可以继续下一步。'
  }
}

export interface LearningProgressRecord {
  contentId: string
  contentType: ContentType
  status: LearningProgressStatus
  updatedAt: number
}

export interface LearningProgressToggleProps {
  contentId?: string | null
  contentType: ContentType
  title?: string
  description?: string
}

export interface PracticeProjectActionPanelProps {
  projectId: PracticeProjectDefinition['projectId']
  title?: string
}

export interface RelatedPracticeProjectsProps {
  projectIds?: PracticeProjectDefinition['projectId'][]
  theoryPath?: string
  title?: string
  description?: string
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

// ===== P1: 最小 Agent - 工具调用生命周期 =====

export type ToolCallingPhase = 'declare' | 'decide' | 'execute' | 'integrate'

export interface ToolCallingStep {
  phase: ToolCallingPhase
  title: string
  description: string
  code?: string
  output?: string
}

export interface ToolCallingLifecycleProps {
  autoPlay?: boolean
  playSpeed?: number
}

// ===== P5: MemoryLayersDemo - 三层记忆架构 =====

export type MemoryPhase = 'short' | 'working' | 'long' | 'inject' | 'complete'

export interface MemoryLayersStep {
  phase: MemoryPhase
  title: string
  description: string
  code?: string
  output?: string
}

export interface MemoryLayersDemoProps {
  autoPlay?: boolean
  playSpeed?: number
}

// ===== P6: MemoryBank - 标签记忆检索 =====

export type MemoryRetrievalPhase = 'query' | 'keywords' | 'match' | 'select' | 'inject'

export interface MemoryRetrievalStep {
  phase: MemoryRetrievalPhase
  title: string
  description: string
  code?: string
  output?: string
}

export interface MemoryBankDemoProps {
  autoPlay?: boolean
  playSpeed?: number
}

// ===== P7: RAG 基础 - RAG 流水线演示 =====

export type RagPipelinePhase = 'doc' | 'chunk' | 'vectorize' | 'store' | 'query' | 'search' | 'generate'

export interface RagPipelineStep {
  phase: RagPipelinePhase
  title: string
  description: string
  code?: string
  output?: string
}

export interface RagPipelineDemoProps {
  autoPlay?: boolean
  playSpeed?: number
}

// ===== P9: 混合检索 + RRF 融合 =====

export type HybridRetrievalPhase = 'query' | 'keyword' | 'vector' | 'rrf' | 'merge' | 'inject'

export interface HybridRetrievalDemoProps {
  autoPlay?: boolean
  playSpeed?: number
}

// ===== P8: GraphRAG - 知识图谱遍历 =====

export type GraphNodeType = 'person' | 'project' | 'department' | 'tech'

export interface GraphNode {
  id: string
  label: string
  type: GraphNodeType
  x: number
  y: number
}

export interface GraphEdge {
  from: string
  to: string
  relation: string
}

export type GraphNodeStatus = 'unvisited' | 'current' | 'visited' | 'target'

export interface GraphRagDemoProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  startNodeId: string
  query: string
  autoPlay?: boolean
  playSpeed?: number
}
