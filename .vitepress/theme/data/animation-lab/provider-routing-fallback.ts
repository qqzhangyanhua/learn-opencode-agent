import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const providerRoutingFallbackCanvas: FlowCanvasConfig = {
  ariaLabel: 'Provider 路由与降级路径',
  accent: 'sky',
  motion: 'route',
  nodes: [
    { id: 'request', label: 'Request', role: '请求', x: 12, y: 48, mobileX: 20, mobileY: 18 },
    { id: 'router', label: 'Router', role: '路由器', x: 36, y: 30, mobileX: 56, mobileY: 22 },
    { id: 'budget', label: 'Budget', role: '成本/延迟', x: 36, y: 70, mobileX: 82, mobileY: 42 },
    { id: 'primary', label: 'Primary', role: '主 Provider', x: 64, y: 24, mobileX: 62, mobileY: 62 },
    { id: 'fallback', label: 'Fallback', role: '降级 Provider', x: 66, y: 72, mobileX: 28, mobileY: 64 },
    { id: 'response', label: 'Response', role: '响应', x: 88, y: 48, mobileX: 50, mobileY: 86 },
  ],
  paths: [
    { id: 'request-router', from: 'request', to: 'router', d: 'M120 270 C205 205 285 170 360 168' },
    { id: 'router-budget', from: 'router', to: 'budget', d: 'M360 182 C330 275 330 345 360 392' },
    { id: 'router-primary', from: 'router', to: 'primary', d: 'M370 160 C465 95 555 90 640 134' },
    { id: 'primary-fallback', from: 'primary', to: 'fallback', d: 'M650 145 C725 250 725 335 660 402' },
    { id: 'budget-fallback', from: 'budget', to: 'fallback', d: 'M370 405 C465 450 570 448 660 405' },
    { id: 'fallback-response', from: 'fallback', to: 'response', d: 'M675 400 C765 365 845 315 880 270' },
  ],
}

export const providerRoutingFallbackExperiment: Experiment = {
  id: 'provider-routing-fallback',
  title: 'Provider 路由与降级',
  summary: '拆解请求如何根据能力、成本和失败状态选择模型 Provider，并在故障时切到可用路径。',
  kind: 'provider-routing-fallback',
  steps: [
    {
      id: 'request-enters',
      title: 'Request Enters',
      description: '一次模型请求进入路由层，携带任务类型、上下文规模和能力要求。',
      activeNodes: ['request', 'router'],
      activePaths: ['request-router'],
      packet: { from: 'request', to: 'router', label: 'req' },
      traceEvents: [
        { id: 'request-normalized', type: 'input', title: '标准化请求', detail: '不同上层调用先被整理成统一路由输入。', status: 'active' },
      ],
    },
    {
      id: 'budget-check',
      title: 'Budget Check',
      description: '路由器检查成本、延迟和上下文长度，避免把简单任务打到昂贵模型。',
      activeNodes: ['router', 'budget'],
      activePaths: ['router-budget'],
      packet: { from: 'router', to: 'budget', label: 'policy' },
      traceEvents: [
        { id: 'budget-evaluated', type: 'thinking', title: '评估策略', detail: '模型选择先看真实约束，而不是固定写死。', status: 'active' },
      ],
    },
    {
      id: 'primary-call',
      title: 'Primary Call',
      description: '主 Provider 满足能力要求，系统优先发起调用。',
      activeNodes: ['router', 'primary'],
      activePaths: ['router-primary'],
      packet: { from: 'router', to: 'primary', label: 'call' },
      traceEvents: [
        { id: 'primary-selected', type: 'tool-call', title: '选择主 Provider', detail: '请求进入首选模型服务。', status: 'active' },
      ],
    },
    {
      id: 'fallback-route',
      title: 'Fallback Route',
      description: '主 Provider 超时或不可用，路由器切换到满足最低能力的备用路径。',
      activeNodes: ['primary', 'fallback', 'budget'],
      activePaths: ['primary-fallback', 'budget-fallback'],
      packet: { from: 'primary', to: 'fallback', label: 'failover' },
      traceEvents: [
        { id: 'fallback-selected', type: 'repair', title: '触发降级', detail: '失败被显式记录，并按策略选择备用 Provider。', status: 'active' },
      ],
    },
    {
      id: 'response-returned',
      title: 'Response Returned',
      description: '备用 Provider 返回可用响应，系统把实际来源和降级状态写入 Trace。',
      activeNodes: ['fallback', 'response'],
      activePaths: ['fallback-response'],
      packet: { from: 'fallback', to: 'response', label: 'resp' },
      traceEvents: [
        { id: 'response-ready', type: 'output', title: '返回响应', detail: '用户得到结果，系统保留 provider 路径用于复盘。', status: 'active' },
      ],
    },
  ],
}
