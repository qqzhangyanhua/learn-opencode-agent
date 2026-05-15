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
  steps: ExperimentStep[]
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
