import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const contextMemoryCanvas: FlowCanvasConfig = {
  ariaLabel: '上下文与记忆流路径',
  accent: 'teal',
  motion: 'memory',
  nodes: [
    { id: 'turn', label: 'Current Turn', role: '当前输入', x: 18, y: 28, mobileX: 20, mobileY: 22 },
    { id: 'window', label: 'Context Window', role: '短期上下文', x: 46, y: 16, mobileX: 56, mobileY: 20 },
    { id: 'retriever', label: 'Retriever', role: '检索', x: 72, y: 28, mobileX: 78, mobileY: 38 },
    { id: 'memory', label: 'Long Memory', role: '长期记忆', x: 76, y: 58, mobileX: 60, mobileY: 58 },
    { id: 'compact', label: 'Compactor', role: '压缩', x: 38, y: 66, mobileX: 28, mobileY: 62 },
    { id: 'prompt', label: 'Prompt', role: '组装', x: 64, y: 82, mobileX: 52, mobileY: 84 },
  ],
  paths: [
    { id: 'turn-window', from: 'turn', to: 'window', d: 'M180 157 C270 95 380 85 460 90' },
    { id: 'window-retriever', from: 'window', to: 'retriever', d: 'M470 92 C570 92 665 118 720 157' },
    { id: 'retriever-memory', from: 'retriever', to: 'memory', d: 'M725 166 C785 235 795 285 760 325' },
    { id: 'memory-compact', from: 'memory', to: 'compact', d: 'M750 332 C620 392 500 405 380 370' },
    { id: 'compact-prompt', from: 'compact', to: 'prompt', d: 'M390 378 C470 438 565 460 640 460' },
    { id: 'window-prompt', from: 'window', to: 'prompt', d: 'M460 100 C420 260 520 395 640 458' },
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
        { id: 'turn-captured', type: 'input', title: '捕获当前轮次', detail: '接收用户目标和最近消息，识别仍然有效的任务约束，作为本轮推理起点。', status: 'active' },
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
        { id: 'query-built', type: 'thinking', title: '生成检索查询', detail: '推断检索意图，生成查询词，定位需要从长期记忆中补齐的信息缺口。', status: 'active' },
      ],
    },
    {
      id: 'memory-hit',
      title: 'Memory Hit',
      description: '检索器命中长期记忆，只把与当前问题有关的事实片段带回当前上下文。',
      activeNodes: ['retriever', 'memory'],
      activePaths: ['retriever-memory'],
      packet: { from: 'retriever', to: 'memory', label: 'hit' },
      traceEvents: [
        { id: 'memory-returned', type: 'observation', title: '召回长期记忆', detail: '长期记忆返回命中来源和相关度评分，提取可引用的证据片段注入当前上下文。', status: 'active' },
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
        { id: 'context-compacted', type: 'repair', title: '压缩上下文', detail: '过滤低价值历史噪声，保留关键事实，生成压缩后的上下文快照。', status: 'active' },
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
        { id: 'prompt-ready', type: 'output', title: '组装 Prompt', detail: '组装最终上下文包，标注证据来源，输出下一次模型调用所需的最小有效输入。', status: 'active' },
      ],
    },
  ],
}
