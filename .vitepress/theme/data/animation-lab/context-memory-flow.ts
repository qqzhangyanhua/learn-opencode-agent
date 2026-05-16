import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const contextMemoryCanvas: FlowCanvasConfig = {
  ariaLabel: '上下文与记忆流路径',
  accent: 'teal',
  motion: 'memory',
  nodes: [
    { id: 'turn', label: 'Current Turn', role: '当前输入', x: 12, y: 50, mobileX: 20, mobileY: 22 },
    { id: 'window', label: 'Context Window', role: '短期上下文', x: 35, y: 30, mobileX: 56, mobileY: 20 },
    { id: 'retriever', label: 'Retriever', role: '检索', x: 64, y: 30, mobileX: 82, mobileY: 38 },
    { id: 'memory', label: 'Long Memory', role: '长期记忆', x: 82, y: 58, mobileX: 60, mobileY: 58 },
    { id: 'compact', label: 'Compactor', role: '压缩', x: 42, y: 72, mobileX: 26, mobileY: 61 },
    { id: 'prompt', label: 'Prompt', role: '组装', x: 70, y: 78, mobileX: 50, mobileY: 84 },
  ],
  paths: [
    { id: 'turn-window', from: 'turn', to: 'window', d: 'M120 280 C190 210 260 170 350 170' },
    { id: 'window-retriever', from: 'window', to: 'retriever', d: 'M360 168 C450 120 550 120 640 168' },
    { id: 'retriever-memory', from: 'retriever', to: 'memory', d: 'M650 190 C730 230 790 280 820 330' },
    { id: 'memory-compact', from: 'memory', to: 'compact', d: 'M800 350 C690 435 540 440 425 405' },
    { id: 'compact-prompt', from: 'compact', to: 'prompt', d: 'M430 405 C520 445 625 445 700 420' },
    { id: 'window-prompt', from: 'window', to: 'prompt', d: 'M360 200 C470 285 575 345 690 410' },
  ],
}

export const contextMemoryExperiment: Experiment = {
  id: 'context-memory-flow',
  title: '上下文与记忆流',
  summary: '观察短期上下文、长期记忆与检索证据如何被压缩并组装进 Prompt。',
  kind: 'context-memory-flow',
  steps: [
    {
      id: 'turn-enters-window',
      title: 'Current Turn',
      description: '新一轮输入先进入短期上下文，成为本次推理的起点。',
      activeNodes: ['turn', 'window'],
      activePaths: ['turn-window'],
      packet: { from: 'turn', to: 'window', label: 'turn' },
      traceEvents: [
        { id: 'turn-captured', type: 'input', title: '捕获当前轮次', detail: '用户目标和最近对话被放进上下文窗口。', status: 'active' },
      ],
    },
    {
      id: 'retrieve-evidence',
      title: 'Retrieve Evidence',
      description: '系统根据当前目标触发检索，寻找需要补充的长期证据。',
      activeNodes: ['window', 'retriever'],
      activePaths: ['window-retriever'],
      packet: { from: 'window', to: 'retriever', label: 'query' },
      traceEvents: [
        { id: 'query-built', type: 'thinking', title: '生成检索查询', detail: '短期上下文被转成更窄的证据请求。', status: 'active' },
      ],
    },
    {
      id: 'memory-hit',
      title: 'Memory Hit',
      description: '检索器命中长期记忆，把相关事实带回当前运行。',
      activeNodes: ['retriever', 'memory'],
      activePaths: ['retriever-memory'],
      packet: { from: 'retriever', to: 'memory', label: 'hit' },
      traceEvents: [
        { id: 'memory-returned', type: 'observation', title: '召回长期记忆', detail: '只返回与当前任务相关的证据片段。', status: 'active' },
      ],
    },
    {
      id: 'compact-context',
      title: 'Compact Context',
      description: '旧上下文和召回证据被压缩，避免把无关历史塞进窗口。',
      activeNodes: ['memory', 'compact'],
      activePaths: ['memory-compact'],
      packet: { from: 'memory', to: 'compact', label: 'facts' },
      traceEvents: [
        { id: 'context-compacted', type: 'repair', title: '压缩上下文', detail: '保留目标、约束和证据，丢弃噪声。', status: 'active' },
      ],
    },
    {
      id: 'assemble-prompt',
      title: 'Assemble Prompt',
      description: '短期状态与压缩记忆合并，形成下一次模型调用的输入。',
      activeNodes: ['window', 'compact', 'prompt'],
      activePaths: ['compact-prompt', 'window-prompt'],
      packet: { from: 'compact', to: 'prompt', label: 'ctx' },
      traceEvents: [
        { id: 'prompt-ready', type: 'output', title: '组装 Prompt', detail: '模型拿到的是当前任务所需的最小上下文。', status: 'active' },
      ],
    },
  ],
}
