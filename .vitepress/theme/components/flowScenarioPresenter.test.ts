import { describe, expect, test } from 'bun:test'

import type { FlowScenario } from './flowScenario'
import { getFlowStepRelations, getFlowVariantMeta } from './flowScenarioPresenter'

const sampleScenario: FlowScenario = {
  title: '示例',
  summary: '用于测试关系提取',
  lanes: [
    { id: 'input', label: '输入' },
    { id: 'core', label: '核心' },
  ],
  steps: [
    { id: 'start', title: '开始', detail: '收到请求', lane: 'input' },
    { id: 'decide', title: '判断', detail: '决定是否执行', lane: 'core' },
    { id: 'done', title: '完成', detail: '输出结果', lane: 'core' },
  ],
  edges: [
    { from: 'start', to: 'decide', label: '进入主流程' },
    { from: 'decide', to: 'done', style: 'dashed', label: '允许执行' },
  ],
}

describe('getFlowVariantMeta', () => {
  test('为不同动画语义返回不同的展示元数据', () => {
    expect(getFlowVariantMeta('timeline')).toEqual({
      layoutClass: 'layout-timeline',
      laneClass: 'lane-timeline',
      stepGroupClass: 'steps-timeline',
      sideLabel: '当前阶段',
      relationLabel: '流转关系',
    })

    expect(getFlowVariantMeta('decision')).toEqual({
      layoutClass: 'layout-decision',
      laneClass: 'lane-decision',
      stepGroupClass: 'steps-decision',
      sideLabel: '当前判断',
      relationLabel: '分支走向',
    })

    expect(getFlowVariantMeta('topology')).toEqual({
      layoutClass: 'layout-topology',
      laneClass: 'lane-topology',
      stepGroupClass: 'steps-topology',
      sideLabel: '当前节点',
      relationLabel: '连接关系',
    })
  })
})

describe('getFlowStepRelations', () => {
  test('提取当前节点的前驱与后继关系，并带上标题和标签', () => {
    expect(getFlowStepRelations(sampleScenario, 'decide')).toEqual([
      {
        direction: 'incoming',
        stepId: 'start',
        title: '开始',
        label: '进入主流程',
        style: 'solid',
      },
      {
        direction: 'outgoing',
        stepId: 'done',
        title: '完成',
        label: '允许执行',
        style: 'dashed',
      },
    ])
  })

  test('未知节点返回空关系数组', () => {
    expect(getFlowStepRelations(sampleScenario, 'missing')).toEqual([])
  })
})
