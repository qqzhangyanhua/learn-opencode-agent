import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const contextMemoryCanvas: FlowCanvasConfig = {
  ariaLabel: '上下文与记忆流路径',
  accent: 'teal',
  motion: 'memory',
  nodes: [
    { id: 'turn', label: 'Current Turn', role: '当前输入', x: 20, y: 20, mobileX: 20, mobileY: 22 },
    { id: 'window', label: 'Context Window', role: '短期上下文', x: 40, y: 20, mobileX: 56, mobileY: 20 },
    { id: 'retriever', label: 'Retriever', role: '检索', x: 60, y: 20, mobileX: 82, mobileY: 38 },
    { id: 'memory', label: 'Long Memory', role: '长期记忆', x: 80, y: 20, mobileX: 60, mobileY: 58 },
    { id: 'compact', label: 'Compactor', role: '压缩', x: 50, y: 60, mobileX: 26, mobileY: 61 },
    { id: 'prompt', label: 'Prompt', role: '组装', x: 50, y: 85, mobileX: 50, mobileY: 84 },
  ],
  paths: [
    { id: 'turn-window', from: 'turn', to: 'window', d: 'M200 112 L400 112' },
    { id: 'window-retriever', from: 'window', to: 'retriever', d: 'M400 112 L600 112' },
    { id: 'retriever-memory', from: 'retriever', to: 'memory', d: 'M600 112 L800 112' },
    { id: 'memory-compact', from: 'memory', to: 'compact', d: 'M800 112 C800 250 650 336 500 336' },
    { id: 'compact-prompt', from: 'compact', to: 'prompt', d: 'M500 336 L500 476' },
    { id: 'window-prompt', from: 'window', to: 'prompt', d: 'M400 112 C400 250 450 336 500 336' },
  ],
}

export const contextMemoryExperiment: Experiment = {
  id: 'context-memory-flow',
  title: '上下文与记忆流',
  summary: '观察当前输入、短期上下文、长期记忆与检索证据如何被筛选、压缩并组装进 Prompt。',
  kind: 'context-memory-flow',
  steps: [
    {
      id: 'turn-enters-window',
      title: 'Current Turn',
      description: '新一轮输入先进入短期上下文，和最近对话一起构成本次推理的起点。',
      activeNodes: ['turn', 'window'],
      activePaths: ['turn-window'],
      packet: { from: 'turn', to: 'window', label: 'turn' },
      traceEvents: [
        { id: 'turn-captured', type: 'input', title: '捕获当前轮次', detail: '系统记录用户目标、最近消息和仍然有效的任务约束。', status: 'active' },
      ],
    },
    {
      id: 'retrieve-evidence',
      title: 'Retrieve Evidence',
      description: '系统根据当前目标触发检索，把短期上下文转成更窄的问题去寻找长期证据。',
      activeNodes: ['window', 'retriever'],
      activePaths: ['window-retriever'],
      packet: { from: 'window', to: 'retriever', label: 'query' },
      traceEvents: [
        { id: 'query-built', type: 'thinking', title: '生成检索查询', detail: '系统记录检索意图、查询词和需要补齐的信息缺口。', status: 'active' },
      ],
    },
    {
      id: 'memory-hit',
      title: 'Memory Hit',
      description: '检索器命中长期记忆，只把与当前问题有关的事实片段带回当前运行。',
      activeNodes: ['retriever', 'memory'],
      activePaths: ['retriever-memory'],
      packet: { from: 'retriever', to: 'memory', label: 'hit' },
      traceEvents: [
        { id: 'memory-returned', type: 'observation', title: '召回长期记忆', detail: '系统记录命中来源、相关度和可引用的证据片段。', status: 'active' },
      ],
    },
    {
      id: 'compact-context',
      title: 'Compact Context',
      description: '旧上下文和召回证据被压缩，保留目标、约束与事实，避免无关历史挤占窗口。',
      activeNodes: ['memory', 'compact'],
      activePaths: ['memory-compact'],
      packet: { from: 'memory', to: 'compact', label: 'facts' },
      traceEvents: [
        { id: 'context-compacted', type: 'repair', title: '压缩上下文', detail: '系统记录被保留的事实、被丢弃的噪声和压缩后的状态。', status: 'active' },
      ],
    },
    {
      id: 'assemble-prompt',
      title: 'Assemble Prompt',
      description: '短期状态与压缩记忆合并，形成下一次模型调用所需的最小有效输入。',
      activeNodes: ['window', 'compact', 'prompt'],
      activePaths: ['compact-prompt', 'window-prompt'],
      packet: { from: 'compact', to: 'prompt', label: 'ctx' },
      traceEvents: [
        { id: 'prompt-ready', type: 'output', title: '组装 Prompt', detail: '系统记录最终上下文包、证据来源和下一次调用入口。', status: 'active' },
      ],
    },
  ],
}
