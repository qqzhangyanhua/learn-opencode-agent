import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const streamingInterruptControlCanvas: FlowCanvasConfig = {
  ariaLabel: '流式输出与中断控制路径',
  accent: 'sky',
  motion: 'route',
  nodes: [
    { id: 'request', label: 'Request', role: '请求', x: 10, y: 30, mobileX: 15, mobileY: 15 },
    { id: 'stream', label: 'Model Stream', role: '模型流', x: 30, y: 30, mobileX: 40, mobileY: 20 },
    { id: 'buffer', label: 'Token Buffer', role: '缓冲区', x: 50, y: 30, mobileX: 70, mobileY: 25 },
    { id: 'ui', label: 'UI Render', role: '渲染', x: 70, y: 30, mobileX: 90, mobileY: 45 },
    { id: 'interrupt', label: 'Interrupt', role: '中断', x: 50, y: 70, mobileX: 35, mobileY: 60 },
    { id: 'state', label: 'Saved State', role: '状态保存', x: 90, y: 70, mobileX: 70, mobileY: 88 },
  ],
  paths: [
    { id: 'request-stream', from: 'request', to: 'stream', d: 'M100 168 L300 168' },
    { id: 'stream-buffer', from: 'stream', to: 'buffer', d: 'M300 168 L500 168' },
    { id: 'buffer-ui', from: 'buffer', to: 'ui', d: 'M500 168 L700 168' },
    { id: 'ui-interrupt', from: 'ui', to: 'interrupt', d: 'M700 168 C650 270 580 360 500 392' },
    { id: 'interrupt-state', from: 'interrupt', to: 'state', d: 'M500 392 L900 392' },
  ],
}

export const streamingInterruptControlExperiment: Experiment = {
  id: 'streaming-interrupt-control',
  title: '流式输出与中断控制',
  summary: '展示 Token 流如何进入 UI，用户中断后系统如何取消生成、保存状态并支持后续恢复。',
  kind: 'streaming-interrupt-control',
  steps: [
    {
      id: 'stream-starts',
      title: 'Stream Starts',
      description: '请求进入模型，输出不必等完整答案生成完才返回，首批 Token 会先被推送。',
      activeNodes: ['request', 'stream'],
      activePaths: ['request-stream'],
      packet: { from: 'request', to: 'stream', label: 'req' },
      traceEvents: [
        { id: 'stream-opened', type: 'input', title: '打开流', detail: '系统记录请求参数、流连接和首包等待状态。', status: 'active' },
      ],
    },
    {
      id: 'token-buffering',
      title: 'Token Buffering',
      description: 'Token 持续进入缓冲区，系统按片段聚合后再推送给 UI。',
      activeNodes: ['stream', 'buffer'],
      activePaths: ['stream-buffer'],
      packet: { from: 'stream', to: 'buffer', label: 'tok' },
      traceEvents: [
        { id: 'tokens-buffered', type: 'observation', title: '缓冲 Token', detail: '系统记录 token 批次、缓冲长度和推送节奏。', status: 'active' },
      ],
    },
    {
      id: 'ui-rendering',
      title: 'UI Rendering',
      description: '界面逐步渲染内容，同时保留当前生成状态，用户能看到答案正在形成。',
      activeNodes: ['buffer', 'ui'],
      activePaths: ['buffer-ui'],
      packet: { from: 'buffer', to: 'ui', label: 'paint' },
      traceEvents: [
        { id: 'ui-updated', type: 'tool-call', title: '增量渲染', detail: '系统记录已渲染文本、光标位置和当前流状态。', status: 'active' },
      ],
    },
    {
      id: 'user-interrupts',
      title: 'User Interrupts',
      description: '用户中断生成，系统发送取消信号，并停止继续消费后续 Token。',
      activeNodes: ['ui', 'interrupt'],
      activePaths: ['ui-interrupt'],
      packet: { from: 'ui', to: 'interrupt', label: 'stop' },
      traceEvents: [
        { id: 'stream-cancelled', type: 'repair', title: '取消生成', detail: '系统记录取消来源、停止位置和是否还有未消费片段。', status: 'active' },
      ],
    },
    {
      id: 'state-saved',
      title: 'State Saved',
      description: '当前上下文和已生成内容被保存，后续可以恢复、重写或重新发起请求。',
      activeNodes: ['interrupt', 'state'],
      activePaths: ['interrupt-state'],
      packet: { from: 'interrupt', to: 'state', label: 'save' },
      traceEvents: [
        { id: 'partial-saved', type: 'output', title: '保存状态', detail: '系统记录已生成内容、上下文快照和下一次恢复入口。', status: 'active' },
      ],
    },
  ],
}
