import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const streamingInterruptControlCanvas: FlowCanvasConfig = {
  ariaLabel: '流式输出与中断控制路径',
  accent: 'sky',
  motion: 'route',
  nodes: [
    { id: 'request', label: 'Request', role: '请求', x: 16, y: 28, mobileX: 18, mobileY: 15 },
    { id: 'stream', label: 'Model Stream', role: '模型流', x: 46, y: 18, mobileX: 44, mobileY: 20 },
    { id: 'buffer', label: 'Token Buffer', role: '缓冲区', x: 76, y: 28, mobileX: 72, mobileY: 30 },
    { id: 'ui', label: 'UI Render', role: '渲染', x: 80, y: 56, mobileX: 84, mobileY: 50 },
    { id: 'interrupt', label: 'Interrupt', role: '中断', x: 54, y: 78, mobileX: 42, mobileY: 68 },
    { id: 'state', label: 'Saved State', role: '状态保存', x: 82, y: 82, mobileX: 72, mobileY: 88 },
  ],
  paths: [
    { id: 'request-stream', from: 'request', to: 'stream', d: 'M160 157 C250 84 365 84 460 101' },
    { id: 'stream-buffer', from: 'stream', to: 'buffer', d: 'M470 104 C580 72 700 94 760 157' },
    { id: 'buffer-ui', from: 'buffer', to: 'ui', d: 'M770 164 C835 220 830 270 800 314' },
    { id: 'ui-interrupt', from: 'ui', to: 'interrupt', d: 'M790 322 C720 415 625 452 540 438' },
    { id: 'interrupt-state', from: 'interrupt', to: 'state', d: 'M550 438 C650 488 770 488 820 460' },
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
        { id: 'stream-opened', type: 'input', title: '打开流', detail: '发起流式请求，建立流连接，等待模型推送首批 Token。', status: 'active' },
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
        { id: 'tokens-buffered', type: 'observation', title: '缓冲 Token', detail: 'Token 持续写入缓冲区，记录批次长度和推送节奏，平滑向 UI 层输出。', status: 'active' },
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
        { id: 'ui-updated', type: 'tool-call', title: '增量渲染', detail: '增量更新 UI，追踪已渲染文本和光标位置，保持生成状态对用户可见。', status: 'active' },
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
        { id: 'stream-cancelled', type: 'repair', title: '取消生成', detail: '接收中断信号，发送取消请求，记录停止位置和未消费片段，清理流连接。', status: 'active' },
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
        { id: 'partial-saved', type: 'output', title: '保存状态', detail: '保存已生成内容和上下文快照，输出恢复入口，支持后续重写或重新发起请求。', status: 'active' },
      ],
    },
  ],
}
