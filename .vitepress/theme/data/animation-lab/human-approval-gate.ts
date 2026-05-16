import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const humanApprovalGateCanvas: FlowCanvasConfig = {
  ariaLabel: '人类确认门与高风险动作流程路径',
  accent: 'amber',
  motion: 'gate',
  nodes: [
    { id: 'model', label: 'Model', role: '意图', x: 15, y: 30, mobileX: 15, mobileY: 12 },
    { id: 'risk', label: 'Risk Scan', role: '风险扫描', x: 35, y: 55, mobileX: 30, mobileY: 30 },
    { id: 'gate', label: 'Approval Gate', role: '确认门', x: 55, y: 30, mobileX: 60, mobileY: 18 },
    { id: 'user', label: 'User Confirm', role: '用户确认', x: 55, y: 80, mobileX: 55, mobileY: 55 },
    { id: 'executor', label: 'Executor', role: '执行器', x: 75, y: 55, mobileX: 80, mobileY: 38 },
    { id: 'result', label: 'Result', role: '结果', x: 92, y: 30, mobileX: 50, mobileY: 88 },
  ],
  paths: [
    { id: 'model-risk', from: 'model', to: 'risk', d: 'M150 168 C200 220 280 280 350 308' },
    { id: 'risk-gate', from: 'risk', to: 'gate', d: 'M350 308 C420 260 480 220 550 168' },
    { id: 'gate-user', from: 'gate', to: 'user', d: 'M550 168 C545 250 545 360 550 448' },
    { id: 'user-executor', from: 'user', to: 'executor', d: 'M550 448 C620 410 700 360 750 308' },
    { id: 'executor-result', from: 'executor', to: 'result', d: 'M750 308 C820 260 880 220 920 168' },
  ],
}

export const humanApprovalGateExperiment: Experiment = {
  id: 'human-approval-gate',
  title: '人类确认门与高风险动作',
  summary: '展示高风险动作如何经过风险扫描、人类确认、执行和回填，让 Agent 在关键节点先停下、再动作。',
  kind: 'human-approval-gate',
  steps: [
    {
      id: 'intent-detected',
      title: 'Intent Detected',
      description: '模型生成可能影响外部世界的动作意图，系统先把它当作待审请求，不直接执行。',
      activeNodes: ['model', 'risk'],
      activePaths: ['model-risk'],
      packet: { from: 'model', to: 'risk', label: 'intent' },
      traceEvents: [
        { id: 'intent-captured', type: 'input', title: '捕获意图', detail: '系统记录动作类型、参数和可能的副作用范围。', status: 'active' },
      ],
    },
    {
      id: 'risk-scan',
      title: 'Risk Scan',
      description: '风险扫描层根据规则判断动作影响半径，决定是否需要人类介入。',
      activeNodes: ['risk', 'gate'],
      activePaths: ['risk-gate'],
      packet: { from: 'risk', to: 'gate', label: 'risk' },
      traceEvents: [
        { id: 'risk-labelled', type: 'thinking', title: '风险定级', detail: '系统记录命中规则、风险等级和触发确认门的原因。', status: 'active' },
      ],
    },
    {
      id: 'await-confirm',
      title: 'Await Confirm',
      description: '动作在确认门暂停，等待用户给出 approve、reject 或修改建议。',
      activeNodes: ['gate', 'user'],
      activePaths: ['gate-user'],
      packet: { from: 'gate', to: 'user', label: 'ask' },
      traceEvents: [
        { id: 'confirm-pending', type: 'observation', title: '等待确认', detail: '系统记录展示给用户的动作摘要、影响说明和默认选项。', status: 'active' },
      ],
    },
    {
      id: 'execute-action',
      title: 'Execute Action',
      description: '用户确认后，动作被释放给执行器，按既定参数对外部世界产生影响。',
      activeNodes: ['user', 'executor'],
      activePaths: ['user-executor'],
      packet: { from: 'user', to: 'executor', label: 'go' },
      traceEvents: [
        { id: 'action-dispatched', type: 'tool-call', title: '放行执行', detail: '系统记录确认人、确认时间和最终下发的执行参数。', status: 'active' },
      ],
    },
    {
      id: 'result-feedback',
      title: 'Result Feedback',
      description: '执行结果回填到上下文，无论成功还是失败都成为后续决策的证据。',
      activeNodes: ['executor', 'result'],
      activePaths: ['executor-result'],
      packet: { from: 'executor', to: 'result', label: 'done' },
      traceEvents: [
        { id: 'result-logged', type: 'output', title: '回填结果', detail: '系统记录执行状态、副作用和后续可观察的影响。', status: 'active' },
      ],
    },
  ],
}
