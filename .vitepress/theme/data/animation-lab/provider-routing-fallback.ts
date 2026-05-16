import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const providerRoutingFallbackCanvas: FlowCanvasConfig = {
  ariaLabel: 'Provider 路由与降级路径',
  accent: 'sky',
  motion: 'route',
  nodes: [
    { id: 'request', label: 'Request', role: '请求', x: 18, y: 48, mobileX: 20, mobileY: 18 },
    { id: 'router', label: 'Router', role: '路由器', x: 44, y: 28, mobileX: 56, mobileY: 22 },
    { id: 'budget', label: 'Budget', role: '策略评估', x: 44, y: 72, mobileX: 78, mobileY: 42 },
    { id: 'primary', label: 'Primary', role: '主 Provider', x: 70, y: 24, mobileX: 62, mobileY: 62 },
    { id: 'fallback', label: 'Fallback', role: '降级 Provider', x: 70, y: 72, mobileX: 30, mobileY: 64 },
    { id: 'response', label: 'Response', role: '响应', x: 82, y: 48, mobileX: 52, mobileY: 86 },
  ],
  paths: [
    { id: 'request-router', from: 'request', to: 'router', d: 'M180 269 C245 190 360 150 440 157' },
    { id: 'router-budget', from: 'router', to: 'budget', d: 'M440 166 C400 280 400 360 440 403' },
    { id: 'router-primary', from: 'router', to: 'primary', d: 'M450 150 C545 95 640 98 700 134' },
    { id: 'primary-fallback', from: 'primary', to: 'fallback', d: 'M710 144 C785 250 785 340 700 403' },
    { id: 'budget-fallback', from: 'budget', to: 'fallback', d: 'M450 405 C545 445 640 435 700 403' },
    { id: 'fallback-response', from: 'fallback', to: 'response', d: 'M710 396 C775 355 820 315 820 269' },
  ],
}

export const providerRoutingFallbackExperiment: Experiment = {
  id: 'provider-routing-fallback',
  title: 'Provider 路由与降级',
  summary: '拆解请求如何根据质量、成本、延迟和失败状态选择模型 Provider，并在故障时切到可用路径。',
  kind: 'provider-routing-fallback',
  steps: [
    {
      id: 'request-enters',
      title: 'Request Enters',
      description: '一次模型请求进入路由层，携带任务类型、上下文规模、质量目标和能力要求。',
      activeNodes: ['request', 'router'],
      activePaths: ['request-router'],
      packet: { from: 'request', to: 'router', label: 'req' },
      traceEvents: [
        { id: 'request-normalized', type: 'input', title: '标准化请求', detail: '接收请求携带的任务类型、上下文长度和质量目标，提取候选 Provider 能力标签。', status: 'active' },
      ],
    },
    {
      id: 'budget-check',
      title: 'Budget Check',
      description: '路由器检查成本、延迟、上下文长度和质量要求，避免简单任务打到昂贵模型。',
      activeNodes: ['router', 'budget'],
      activePaths: ['router-budget'],
      packet: { from: 'router', to: 'budget', label: 'policy' },
      traceEvents: [
        { id: 'budget-evaluated', type: 'thinking', title: '评估策略', detail: '评估预算上限和延迟目标，推断本次路由策略，避免简单任务命中昂贵 Provider。', status: 'active' },
      ],
    },
    {
      id: 'primary-call',
      title: 'Primary Call',
      description: '主 Provider 满足能力和策略要求，系统优先发起调用，同时保留降级候选。',
      activeNodes: ['router', 'primary'],
      activePaths: ['router-primary'],
      packet: { from: 'router', to: 'primary', label: 'call' },
      traceEvents: [
        { id: 'primary-selected', type: 'tool-call', title: '选择主 Provider', detail: '发起首选 Provider 调用，记录模型能力匹配情况和调用开始时间。', status: 'active' },
      ],
    },
    {
      id: 'fallback-route',
      title: 'Fallback Route',
      description: '主 Provider 超时或不可用，路由器按策略切换到满足最低能力的备用路径。',
      activeNodes: ['primary', 'fallback', 'budget'],
      activePaths: ['primary-fallback', 'budget-fallback'],
      packet: { from: 'primary', to: 'fallback', label: 'failover' },
      traceEvents: [
        { id: 'fallback-selected', type: 'repair', title: '触发降级', detail: '检测到主 Provider 失败，按策略触发降级，记录失败原因和备用 Provider 的选择依据。', status: 'active' },
      ],
    },
    {
      id: 'response-returned',
      title: 'Response Returned',
      description: '备用 Provider 返回可用响应，系统把实际来源、降级状态和质量影响写入 Trace。',
      activeNodes: ['fallback', 'response'],
      activePaths: ['fallback-response'],
      packet: { from: 'fallback', to: 'response', label: 'resp' },
      traceEvents: [
        { id: 'response-ready', type: 'output', title: '返回响应', detail: '备用 Provider 返回响应，输出实际来源、响应质量和完整路由路径供复盘。', status: 'active' },
      ],
    },
  ],
}
