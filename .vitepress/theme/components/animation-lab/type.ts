export type TraceEventType =
  | 'input'
  | 'thinking'
  | 'tool-call'
  | 'observation'
  | 'repair'
  | 'output'

export type TraceEventStatus = 'pending' | 'active' | 'done'

export interface MotionPacket {
  from: string
  to: string
  label: string
}

export interface TraceEvent {
  id: string
  type: TraceEventType
  title: string
  detail: string
  status: TraceEventStatus
}

export interface ExperimentStep {
  id: string
  title: string
  description: string
  activeNodes: string[]
  activePaths: string[]
  packet?: MotionPacket
  traceEvents: TraceEvent[]
}

export interface Experiment {
  id: string
  title: string
  summary: string
  kind: ExperimentKind
  steps: ExperimentStep[]
}

export type ExperimentKind =
  | 'agent-loop'
  | 'context-memory-flow'
  | 'multi-agent-dispatch'
  | 'tool-permission-gate'
  | 'context-compaction'
  | 'error-recovery-loop'
  | 'provider-routing-fallback'
  | 'rag-retrieval-flow'
  | 'human-approval-gate'
  | 'structured-output-validation'
  | 'streaming-interrupt-control'

export type ExperimentStatus = 'available' | 'coming-soon'

export interface ExperimentCatalogItem {
  id: string
  title: string
  summary: string
  status: ExperimentStatus
  experiment?: Experiment
}

export interface CanvasNode {
  id: string
  label: string
  role: string
}

export interface CanvasPath {
  id: string
  from: string
  to: string
  d: string
}

export interface FlowCanvasNode extends CanvasNode {
  x: number
  y: number
  mobileX?: number
  mobileY?: number
}

export interface FlowCanvasConfig {
  ariaLabel: string
  nodes: FlowCanvasNode[]
  paths: CanvasPath[]
  accent: 'sky' | 'teal' | 'amber' | 'indigo' | 'rose'
  motion: FlowCanvasMotion
}

export type FlowCanvasMotion = 'memory' | 'dispatch' | 'gate' | 'compact' | 'recover' | 'route'
