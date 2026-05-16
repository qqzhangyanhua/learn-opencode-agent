import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const humanApprovalGateCanvas: FlowCanvasConfig = {
  ariaLabel: '人类确认门与高风险动作流程路径',
  accent: 'amber',
  motion: 'gate',
  nodes: [
    { id: 'model', label: 'Model', role: '意图', x: 18, y: 30, mobileX: 20, mobileY: 14 },
    { id: 'risk', label: 'Risk Scan', role: '风险扫描', x: 36, y: 54, mobileX: 34, mobileY: 30 },
    { id: 'gate', label: 'Approval Gate', role: '确认门', x: 54, y: 30, mobileX: 62, mobileY: 20 },
    { id: 'user', label: 'User Confirm', role: '用户确认', x: 52, y: 74, mobileX: 54, mobileY: 56 },
    { id: 'executor', label: 'Executor', role: '执行器', x: 70, y: 54, mobileX: 78, mobileY: 40 },
    { id: 'result', label: 'Result', role: '结果', x: 82, y: 30, mobileX: 58, mobileY: 84 },
  ],
  paths: [
    { id: 'model-risk', from: 'model', to: 'risk', d: 'M180 168 C225 220 300 280 360 302' },
    { id: 'risk-gate', from: 'risk', to: 'gate', d: 'M360 302 C420 260 480 220 540 168' },
    { id: 'gate-user', from: 'gate', to: 'user', d: 'M540 168 C535 250 520 345 520 414' },
    { id: 'user-executor', from: 'user', to: 'executor', d: 'M520 414 C590 392 660 348 700 302' },
    { id: 'executor-result', from: 'executor', to: 'result', d: 'M700 302 C760 260 805 220 820 168' },
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
        { id: 'intent-captured', type: 'input', title: '捕获意图', detail: '接收高风险动作意图，提取动作类型、参数和可能的副作用范围，暂缓执行。', status: 'active' },
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
        { id: 'risk-labelled', type: 'thinking', title: '风险定级', detail: '扫描规则库，推断命中风险等级，明确触发确认门的理由，等待人类介入。', status: 'active' },
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
        { id: 'confirm-pending', type: 'observation', title: '等待确认', detail: '向用户展示动作摘要和影响说明，等待 approve/reject 响应，保持执行暂停状态。', status: 'active' },
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
        { id: 'action-dispatched', type: 'tool-call', title: '放行执行', detail: '用户确认后释放执行，携带确认人身份、确认时间和最终参数发起外部动作。', status: 'active' },
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
        { id: 'result-logged', type: 'output', title: '回填结果', detail: '执行结果回填上下文，无论成功或失败均记录副作用，作为后续决策的可观察证据。', status: 'active' },
      ],
    },
  ],
}
