import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const toolPermissionGateCanvas: FlowCanvasConfig = {
  ariaLabel: '工具调用与权限门路径',
  accent: 'amber',
  motion: 'gate',
  nodes: [
    { id: 'model', label: 'Model', role: '意图', x: 12, y: 48, mobileX: 18, mobileY: 22 },
    { id: 'request', label: 'Tool Request', role: '请求', x: 34, y: 30, mobileX: 52, mobileY: 18 },
    { id: 'gate', label: 'Permission Gate', role: '权限门', x: 58, y: 30, mobileX: 82, mobileY: 38 },
    { id: 'execute', label: 'Executor', role: '执行器', x: 80, y: 50, mobileX: 62, mobileY: 60 },
    { id: 'result', label: 'Result', role: '结果', x: 58, y: 74, mobileX: 28, mobileY: 62 },
    { id: 'model-update', label: 'Model Update', role: '回填', x: 30, y: 72, mobileX: 50, mobileY: 84 },
  ],
  paths: [
    { id: 'model-request', from: 'model', to: 'request', d: 'M120 270 C195 205 260 175 340 168' },
    { id: 'request-gate', from: 'request', to: 'gate', d: 'M350 168 C425 130 515 130 585 168' },
    { id: 'gate-execute', from: 'gate', to: 'execute', d: 'M590 180 C680 220 750 265 800 290' },
    { id: 'execute-result', from: 'execute', to: 'result', d: 'M790 305 C720 385 650 420 580 415' },
    { id: 'result-model-update', from: 'result', to: 'model-update', d: 'M570 415 C470 440 380 430 300 405' },
    { id: 'model-update-model', from: 'model-update', to: 'model', d: 'M290 395 C185 370 125 320 120 280' },
  ],
}

export const toolPermissionGateExperiment: Experiment = {
  id: 'tool-permission-gate',
  title: '工具调用与权限门',
  summary: '展示模型请求、权限检查、执行与结果回填之间的边界。',
  kind: 'tool-permission-gate',
  steps: [
    {
      id: 'model-intent',
      title: 'Model Intent',
      description: '模型先产生工具意图，但还不能直接执行外部动作。',
      activeNodes: ['model', 'request'],
      activePaths: ['model-request'],
      packet: { from: 'model', to: 'request', label: 'intent' },
      traceEvents: [
        { id: 'intent-created', type: 'thinking', title: '形成调用意图', detail: '模型说明想做什么，参数仍需结构化。', status: 'active' },
      ],
    },
    {
      id: 'permission-check',
      title: 'Permission Check',
      description: '工具请求进入权限门，系统检查范围、风险和用户授权。',
      activeNodes: ['request', 'gate'],
      activePaths: ['request-gate'],
      packet: { from: 'request', to: 'gate', label: 'check' },
      traceEvents: [
        { id: 'gate-checking', type: 'tool-call', title: '检查权限', detail: '危险操作会在这里暂停，而不是直接落地。', status: 'active' },
      ],
    },
    {
      id: 'execute-tool',
      title: 'Execute Tool',
      description: '权限通过后，执行器用明确参数运行工具。',
      activeNodes: ['gate', 'execute'],
      activePaths: ['gate-execute'],
      packet: { from: 'gate', to: 'execute', label: 'allow' },
      traceEvents: [
        { id: 'tool-executed', type: 'tool-call', title: '执行工具', detail: '执行层只接收已经通过权限门的结构化请求。', status: 'active' },
      ],
    },
    {
      id: 'return-result',
      title: 'Return Result',
      description: '工具结果回到系统，不直接替代模型判断。',
      activeNodes: ['execute', 'result'],
      activePaths: ['execute-result'],
      packet: { from: 'execute', to: 'result', label: 'result' },
      traceEvents: [
        { id: 'result-returned', type: 'observation', title: '返回结果', detail: '系统记录 stdout、错误或结构化输出。', status: 'active' },
      ],
    },
    {
      id: 'model-update',
      title: 'Model Update',
      description: '结果作为观察回填给模型，模型再决定下一步或最终响应。',
      activeNodes: ['result', 'model-update', 'model'],
      activePaths: ['result-model-update', 'model-update-model'],
      packet: { from: 'result', to: 'model-update', label: 'obs' },
      traceEvents: [
        { id: 'observation-applied', type: 'output', title: '回填观察', detail: '工具世界的事实重新进入模型上下文。', status: 'active' },
      ],
    },
  ],
}
