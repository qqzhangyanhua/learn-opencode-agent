import type { FlowScenario, FlowVariant } from './flowScenario'

export interface FlowVariantMeta {
  layoutClass: string
  laneClass: string
  stepGroupClass: string
  sideLabel: string
  relationLabel: string
}

export interface FlowStepRelation {
  direction: 'incoming' | 'outgoing'
  stepId: string
  title: string
  label?: string
  style: 'solid' | 'dashed'
}

const variantMetaMap: Record<FlowVariant, FlowVariantMeta> = {
  timeline: {
    layoutClass: 'layout-timeline',
    laneClass: 'lane-timeline',
    stepGroupClass: 'steps-timeline',
    sideLabel: '当前阶段',
    relationLabel: '流转关系',
  },
  decision: {
    layoutClass: 'layout-decision',
    laneClass: 'lane-decision',
    stepGroupClass: 'steps-decision',
    sideLabel: '当前判断',
    relationLabel: '分支走向',
  },
  topology: {
    layoutClass: 'layout-topology',
    laneClass: 'lane-topology',
    stepGroupClass: 'steps-topology',
    sideLabel: '当前节点',
    relationLabel: '连接关系',
  },
}

export function getFlowVariantMeta(variant: FlowVariant): FlowVariantMeta {
  return variantMetaMap[variant]
}

export function getFlowStepRelations(
  scenario: FlowScenario,
  stepId?: string,
): FlowStepRelation[] {
  if (!stepId) return []

  const stepById = new Map(scenario.steps.map((step) => [step.id, step]))

  return scenario.edges.reduce<FlowStepRelation[]>((relations, edge) => {
    if (edge.to === stepId) {
      const fromStep = stepById.get(edge.from)
      if (!fromStep) return relations
      relations.push({
        direction: 'incoming' as const,
        stepId: fromStep.id,
        title: fromStep.title,
        label: edge.label,
        style: edge.style ?? 'solid',
      })
      return relations
    }

    if (edge.from === stepId) {
      const toStep = stepById.get(edge.to)
      if (!toStep) return relations
      relations.push({
        direction: 'outgoing' as const,
        stepId: toStep.id,
        title: toStep.title,
        label: edge.label,
        style: edge.style ?? 'solid',
      })
      return relations
    }

    return relations
  }, [])
}
