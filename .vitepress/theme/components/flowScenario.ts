export type FlowVariant = 'timeline' | 'decision' | 'topology'

export interface FlowLane {
  id: string
  label: string
}

export interface FlowStep {
  id: string
  title: string
  detail: string
  lane: string
  kind?: 'normal' | 'decision' | 'async' | 'commit' | 'warning'
  codeLabel?: string
  emphasis?: string
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
  style?: 'solid' | 'dashed'
}

export interface FlowScenario {
  title: string
  summary: string
  lanes: FlowLane[]
  steps: FlowStep[]
  edges: FlowEdge[]
}
