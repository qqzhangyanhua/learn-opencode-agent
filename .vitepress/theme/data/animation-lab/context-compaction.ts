import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const contextCompactionCanvas: FlowCanvasConfig = {
  ariaLabel: '上下文压缩与摘要生成路径',
  accent: 'teal',
  motion: 'compact',
  nodes: [
    { id: 'window', label: 'Context Window', role: '上下文窗口', x: 15, y: 15, mobileX: 22, mobileY: 18 },
    { id: 'meter', label: 'Token Meter', role: '容量检测', x: 85, y: 15, mobileX: 58, mobileY: 22 },
    { id: 'pruner', label: 'Pruner', role: '裁剪', x: 85, y: 85, mobileX: 82, mobileY: 42 },
    { id: 'summarizer', label: 'Summarizer', role: '摘要器', x: 15, y: 85, mobileX: 58, mobileY: 66 },
    { id: 'prompt', label: 'Next Prompt', role: '重建输入', x: 50, y: 50, mobileX: 28, mobileY: 84 },
  ],
  paths: [
    { id: 'window-meter', from: 'window', to: 'meter', d: 'M150 84 L850 84' },
    { id: 'meter-pruner', from: 'meter', to: 'pruner', d: 'M850 84 L850 476' },
    { id: 'pruner-summarizer', from: 'pruner', to: 'summarizer', d: 'M850 476 L150 476' },
    { id: 'summarizer-prompt', from: 'summarizer', to: 'prompt', d: 'M150 476 C150 476 150 280 500 280' },
    { id: 'prompt-window', from: 'prompt', to: 'window', d: 'M500 280 C500 280 150 280 150 84' },
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
      description: '多轮消息和工具输出持续进入窗口，Token 使用率逼近上限，系统开始关注容量风险。',
      activeNodes: ['window', 'meter'],
      activePaths: ['window-meter'],
      packet: { from: 'window', to: 'meter', label: 'usage' },
      traceEvents: [
        { id: 'usage-counted', type: 'input', title: '统计窗口容量', detail: '系统记录消息、工具结果、约束和摘要各自占用的 Token。', status: 'active' },
      ],
    },
    {
      id: 'overflow-check',
      title: 'Overflow Check',
      description: '容量检测发现即将溢出，压缩流程被显式触发，避免下一次模型调用超出窗口。',
      activeNodes: ['meter', 'pruner'],
      activePaths: ['meter-pruner'],
      packet: { from: 'meter', to: 'pruner', label: 'limit' },
      traceEvents: [
        { id: 'overflow-detected', type: 'thinking', title: '触发压缩', detail: '系统记录触发阈值、风险来源和需要优先处理的内容块。', status: 'active' },
      ],
    },
    {
      id: 'prune-tool-output',
      title: 'Prune Tool Output',
      description: '长工具输出被折叠，只保留错误、路径、结论和后续需要的证据，降低噪声占用。',
      activeNodes: ['pruner', 'summarizer'],
      activePaths: ['pruner-summarizer'],
      packet: { from: 'pruner', to: 'summarizer', label: 'facts' },
      traceEvents: [
        { id: 'tool-output-pruned', type: 'repair', title: '裁剪工具输出', detail: '系统记录裁剪规则、保留片段和被替换的大段输出。', status: 'active' },
      ],
    },
    {
      id: 'summary-built',
      title: 'Summary Built',
      description: '摘要器把保留事实压成可继续推理的状态快照，让任务连续性不依赖完整历史。',
      activeNodes: ['summarizer', 'prompt'],
      activePaths: ['summarizer-prompt'],
      packet: { from: 'summarizer', to: 'prompt', label: 'summary' },
      traceEvents: [
        { id: 'summary-created', type: 'observation', title: '生成摘要', detail: '系统记录目标、决策、风险、证据和下一步的摘要版本。', status: 'active' },
      ],
    },
    {
      id: 'prompt-rebuilt',
      title: 'Prompt Rebuilt',
      description: '新 Prompt 用摘要替换冗长历史，让下一轮模型调用回到可控窗口并保持任务连续。',
      activeNodes: ['prompt', 'window'],
      activePaths: ['prompt-window'],
      packet: { from: 'prompt', to: 'window', label: 'ctx' },
      traceEvents: [
        { id: 'context-restored', type: 'output', title: '重建上下文', detail: '系统记录释放的窗口空间、注入的摘要和新的上下文入口。', status: 'active' },
      ],
    },
  ],
}
