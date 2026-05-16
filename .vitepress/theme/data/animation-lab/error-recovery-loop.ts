import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const errorRecoveryLoopCanvas: FlowCanvasConfig = {
  ariaLabel: '错误恢复与自修复循环路径',
  accent: 'amber',
  motion: 'recover',
  nodes: [
    { id: 'model', label: 'Model', role: '决策', x: 12, y: 46, mobileX: 20, mobileY: 18 },
    { id: 'tool', label: 'Tool', role: '工具', x: 34, y: 22, mobileX: 56, mobileY: 20 },
    { id: 'error', label: 'Error', role: '失败', x: 60, y: 26, mobileX: 82, mobileY: 40 },
    { id: 'analyzer', label: 'Analyzer', role: '分类', x: 76, y: 58, mobileX: 62, mobileY: 62 },
    { id: 'repair', label: 'Repair', role: '修正', x: 48, y: 76, mobileX: 28, mobileY: 64 },
    { id: 'final', label: 'Final', role: '收敛', x: 86, y: 36, mobileX: 50, mobileY: 86 },
  ],
  paths: [
    { id: 'model-tool', from: 'model', to: 'tool', d: 'M120 258 C195 160 270 110 340 124' },
    { id: 'tool-error', from: 'tool', to: 'error', d: 'M350 124 C445 100 540 112 600 146' },
    { id: 'error-analyzer', from: 'error', to: 'analyzer', d: 'M605 160 C690 230 745 295 760 325' },
    { id: 'analyzer-repair', from: 'analyzer', to: 'repair', d: 'M750 340 C650 435 560 445 480 425' },
    { id: 'repair-tool', from: 'repair', to: 'tool', d: 'M470 415 C355 350 315 235 340 135' },
    { id: 'tool-final', from: 'tool', to: 'final', d: 'M355 130 C525 70 735 125 860 202' },
  ],
}

export const errorRecoveryLoopExperiment: Experiment = {
  id: 'error-recovery-loop',
  title: '错误恢复与自修复循环',
  summary: '展示工具失败后，Agent 如何分类错误、修正参数、重试并收敛到可交付结果。',
  kind: 'error-recovery-loop',
  steps: [
    {
      id: 'tool-attempt',
      title: 'Tool Attempt',
      description: '模型带着结构化参数调用工具，进入一次真实外部执行。',
      activeNodes: ['model', 'tool'],
      activePaths: ['model-tool'],
      packet: { from: 'model', to: 'tool', label: 'call' },
      traceEvents: [
        { id: 'tool-called', type: 'tool-call', title: '执行工具', detail: '系统记录工具名、参数和调用上下文。', status: 'active' },
      ],
    },
    {
      id: 'error-returned',
      title: 'Error Returned',
      description: '工具返回错误，失败结果被当作观察，而不是被静默吞掉。',
      activeNodes: ['tool', 'error'],
      activePaths: ['tool-error'],
      packet: { from: 'tool', to: 'error', label: 'err' },
      traceEvents: [
        { id: 'error-captured', type: 'observation', title: '捕获错误', detail: 'stderr、退出码和错误类型进入 Trace。', status: 'active' },
      ],
    },
    {
      id: 'classify-error',
      title: 'Classify Error',
      description: '分析器区分参数错误、权限问题、网络失败和不可恢复失败。',
      activeNodes: ['error', 'analyzer'],
      activePaths: ['error-analyzer'],
      packet: { from: 'error', to: 'analyzer', label: 'signal' },
      traceEvents: [
        { id: 'error-classified', type: 'thinking', title: '分类失败原因', detail: '只有可恢复错误才进入修正循环。', status: 'active' },
      ],
    },
    {
      id: 'repair-params',
      title: 'Repair Params',
      description: '系统根据错误信号修正参数或缩小执行范围。',
      activeNodes: ['analyzer', 'repair'],
      activePaths: ['analyzer-repair'],
      packet: { from: 'analyzer', to: 'repair', label: 'fix' },
      traceEvents: [
        { id: 'params-repaired', type: 'repair', title: '修正调用', detail: '修正的是明确错误，不做盲目重试。', status: 'active' },
      ],
    },
    {
      id: 'retry-success',
      title: 'Retry Success',
      description: '修正后的请求再次进入工具，成功结果收敛为最终响应依据。',
      activeNodes: ['repair', 'tool', 'final'],
      activePaths: ['repair-tool', 'tool-final'],
      packet: { from: 'tool', to: 'final', label: 'ok' },
      traceEvents: [
        { id: 'retry-succeeded', type: 'output', title: '重试成功', detail: '最终答案引用成功观察，而不是掩盖曾经失败。', status: 'active' },
      ],
    },
  ],
}
