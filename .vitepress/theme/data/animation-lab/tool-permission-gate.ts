import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const toolPermissionGateCanvas: FlowCanvasConfig = {
  ariaLabel: '工具调用与权限门路径',
  accent: 'amber',
  motion: 'gate',
  nodes: [
    { id: 'model', label: 'Model', role: '意图', x: 15, y: 50, mobileX: 18, mobileY: 22 },
    { id: 'request', label: 'Tool Request', role: '请求', x: 35, y: 50, mobileX: 52, mobileY: 18 },
    { id: 'gate', label: 'Permission Gate', role: '权限门', x: 55, y: 50, mobileX: 82, mobileY: 38 },
    { id: 'execute', label: 'Executor', role: '执行器', x: 75, y: 30, mobileX: 62, mobileY: 60 },
    { id: 'result', label: 'Result', role: '结果', x: 92, y: 50, mobileX: 28, mobileY: 62 },
    { id: 'model-update', label: 'Model Update', role: '回填', x: 50, y: 80, mobileX: 50, mobileY: 84 },
  ],
  paths: [
    { id: 'model-request', from: 'model', to: 'request', d: 'M150 280 L350 280' },
    { id: 'request-gate', from: 'request', to: 'gate', d: 'M350 280 L550 280' },
    { id: 'gate-execute', from: 'gate', to: 'execute', d: 'M550 280 C650 280 650 168 750 168' },
    { id: 'execute-result', from: 'execute', to: 'result', d: 'M750 168 C850 168 920 168 920 280' },
    { id: 'result-model-update', from: 'result', to: 'model-update', d: 'M920 280 C920 448 700 448 500 448' },
    { id: 'model-update-model', from: 'model-update', to: 'model', d: 'M500 448 C300 448 150 448 150 280' },
  ],
}

export const toolPermissionGateExperiment: Experiment = {
  id: 'tool-permission-gate',
  title: '工具调用与权限门',
  summary: '展示模型请求如何经过结构化、权限检查、执行隔离与结果回填，避免意图直接变成外部动作。',
  kind: 'tool-permission-gate',
  steps: [
    {
      id: 'model-intent',
      title: 'Model Intent',
      description: '模型根据当前目标判断需要外部工具，并先生成调用意图；此时请求还未授权，也未进入执行层。',
      activeNodes: ['model', 'request'],
      activePaths: ['model-request'],
      packet: { from: 'model', to: 'request', label: 'intent' },
      traceEvents: [
        { id: 'intent-created', type: 'thinking', title: '形成调用意图', detail: '系统记录工具目标、候选参数和风险信号，等待结构化与权限检查。', status: 'active' },
      ],
    },
    {
      id: 'permission-check',
      title: 'Permission Check',
      description: '工具请求进入权限门，系统检查操作范围、风险等级和用户授权，再决定是否放行。',
      activeNodes: ['request', 'gate'],
      activePaths: ['request-gate'],
      packet: { from: 'request', to: 'gate', label: 'check' },
      traceEvents: [
        { id: 'gate-checking', type: 'tool-call', title: '检查权限', detail: '系统记录权限结果、阻断原因或需要用户确认的高风险动作。', status: 'active' },
      ],
    },
    {
      id: 'execute-tool',
      title: 'Execute Tool',
      description: '权限通过后，执行器只接收已授权的结构化参数，并在隔离边界内运行工具。',
      activeNodes: ['gate', 'execute'],
      activePaths: ['gate-execute'],
      packet: { from: 'gate', to: 'execute', label: 'allow' },
      traceEvents: [
        { id: 'tool-executed', type: 'tool-call', title: '执行工具', detail: '系统记录实际执行参数、运行环境和工具调用状态。', status: 'active' },
      ],
    },
    {
      id: 'return-result',
      title: 'Return Result',
      description: '工具结果回到系统，作为观察进入上下文；结果本身不会直接替代模型判断。',
      activeNodes: ['execute', 'result'],
      activePaths: ['execute-result'],
      packet: { from: 'execute', to: 'result', label: 'result' },
      traceEvents: [
        { id: 'result-returned', type: 'observation', title: '返回结果', detail: '系统记录 stdout、错误、结构化输出和执行是否成功。', status: 'active' },
      ],
    },
    {
      id: 'model-update',
      title: 'Model Update',
      description: '结果作为观察回填给模型，模型结合原目标判断下一步行动或生成最终响应。',
      activeNodes: ['result', 'model-update', 'model'],
      activePaths: ['result-model-update', 'model-update-model'],
      packet: { from: 'result', to: 'model-update', label: 'obs' },
      traceEvents: [
        { id: 'observation-applied', type: 'output', title: '回填观察', detail: '系统记录工具事实如何影响计划、上下文和响应状态。', status: 'active' },
      ],
    },
  ],
}
