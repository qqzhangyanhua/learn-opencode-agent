import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const contextCompactionCanvas: FlowCanvasConfig = {
  ariaLabel: '上下文压缩与摘要生成路径',
  accent: 'teal',
  motion: 'compact',
  nodes: [
    { id: 'window', label: 'Context Window', role: '上下文窗口', x: 15, y: 45, mobileX: 22, mobileY: 18 },
    { id: 'meter', label: 'Token Meter', role: '容量检测', x: 38, y: 22, mobileX: 58, mobileY: 22 },
    { id: 'pruner', label: 'Pruner', role: '裁剪', x: 64, y: 30, mobileX: 82, mobileY: 42 },
    { id: 'summarizer', label: 'Summarizer', role: '摘要器', x: 66, y: 70, mobileX: 58, mobileY: 66 },
    { id: 'prompt', label: 'Next Prompt', role: '重建输入', x: 28, y: 76, mobileX: 28, mobileY: 84 },
  ],
  paths: [
    { id: 'window-meter', from: 'window', to: 'meter', d: 'M150 252 C225 150 300 105 380 125' },
    { id: 'meter-pruner', from: 'meter', to: 'pruner', d: 'M390 125 C480 95 575 115 640 168' },
    { id: 'pruner-summarizer', from: 'pruner', to: 'summarizer', d: 'M650 180 C705 270 710 345 660 392' },
    { id: 'summarizer-prompt', from: 'summarizer', to: 'prompt', d: 'M650 402 C520 455 390 455 280 425' },
    { id: 'prompt-window', from: 'prompt', to: 'window', d: 'M275 415 C170 375 125 315 150 260' },
  ],
}

export const contextCompactionExperiment: Experiment = {
  id: 'context-compaction',
  title: '上下文压缩与摘要生成',
  summary: '观察上下文逼近上限后，系统如何裁剪噪声、生成摘要并重建下一轮 Prompt。',
  kind: 'context-compaction',
  steps: [
    {
      id: 'window-growth',
      title: 'Window Growth',
      description: '多轮消息和工具输出持续进入窗口，Token 使用率开始逼近上限。',
      activeNodes: ['window', 'meter'],
      activePaths: ['window-meter'],
      packet: { from: 'window', to: 'meter', label: 'usage' },
      traceEvents: [
        { id: 'usage-counted', type: 'input', title: '统计窗口容量', detail: '系统持续跟踪消息、工具结果和约束占用。', status: 'active' },
      ],
    },
    {
      id: 'overflow-check',
      title: 'Overflow Check',
      description: '容量检测发现即将溢出，压缩流程被显式触发。',
      activeNodes: ['meter', 'pruner'],
      activePaths: ['meter-pruner'],
      packet: { from: 'meter', to: 'pruner', label: 'limit' },
      traceEvents: [
        { id: 'overflow-detected', type: 'thinking', title: '触发压缩', detail: '超过阈值时先处理上下文，而不是继续堆消息。', status: 'active' },
      ],
    },
    {
      id: 'prune-tool-output',
      title: 'Prune Tool Output',
      description: '长工具输出被折叠，只保留错误、路径、结论和后续需要的证据。',
      activeNodes: ['pruner', 'summarizer'],
      activePaths: ['pruner-summarizer'],
      packet: { from: 'pruner', to: 'summarizer', label: 'facts' },
      traceEvents: [
        { id: 'tool-output-pruned', type: 'repair', title: '裁剪工具输出', detail: '大段 stdout 不再原样占用窗口。', status: 'active' },
      ],
    },
    {
      id: 'summary-built',
      title: 'Summary Built',
      description: '摘要器把保留事实压成可继续推理的状态快照。',
      activeNodes: ['summarizer', 'prompt'],
      activePaths: ['summarizer-prompt'],
      packet: { from: 'summarizer', to: 'prompt', label: 'summary' },
      traceEvents: [
        { id: 'summary-created', type: 'observation', title: '生成摘要', detail: '摘要保留目标、决策、风险和下一步。', status: 'active' },
      ],
    },
    {
      id: 'prompt-rebuilt',
      title: 'Prompt Rebuilt',
      description: '新 Prompt 用摘要替换冗长历史，让下一轮模型调用回到可控窗口。',
      activeNodes: ['prompt', 'window'],
      activePaths: ['prompt-window'],
      packet: { from: 'prompt', to: 'window', label: 'ctx' },
      traceEvents: [
        { id: 'context-restored', type: 'output', title: '重建上下文', detail: '窗口释放空间，但任务连续性被保留下来。', status: 'active' },
      ],
    },
  ],
}
