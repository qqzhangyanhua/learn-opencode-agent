import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const errorRecoveryLoopCanvas: FlowCanvasConfig = {
  ariaLabel: '错误恢复与自修复循环路径',
  accent: 'amber',
  motion: 'recover',
  nodes: [
    { id: 'model', label: 'Model', role: '决策', x: 18, y: 28, mobileX: 20, mobileY: 18 },
    { id: 'tool', label: 'Tool', role: '工具', x: 46, y: 20, mobileX: 56, mobileY: 20 },
    { id: 'error', label: 'Error', role: '失败', x: 74, y: 28, mobileX: 78, mobileY: 38 },
    { id: 'analyzer', label: 'Analyzer', role: '分类', x: 78, y: 58, mobileX: 62, mobileY: 62 },
    { id: 'repair', label: 'Repair', role: '修正', x: 46, y: 76, mobileX: 30, mobileY: 64 },
    { id: 'final', label: 'Final', role: '收敛', x: 78, y: 80, mobileX: 52, mobileY: 86 },
  ],
  paths: [
    { id: 'model-tool', from: 'model', to: 'tool', d: 'M180 157 C260 105 370 95 460 112' },
    { id: 'tool-error', from: 'tool', to: 'error', d: 'M470 112 C575 105 675 120 740 157' },
    { id: 'error-analyzer', from: 'error', to: 'analyzer', d: 'M748 166 C810 235 815 300 780 325' },
    { id: 'analyzer-repair', from: 'analyzer', to: 'repair', d: 'M770 334 C680 420 560 440 460 426' },
    { id: 'repair-tool', from: 'repair', to: 'tool', d: 'M450 418 C340 320 350 180 460 120' },
    { id: 'tool-final', from: 'tool', to: 'final', d: 'M470 120 C620 205 740 325 780 448' },
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
      description: '模型带着结构化参数调用工具，进入真实外部执行；这一步开始产生可失败的系统动作。',
      activeNodes: ['model', 'tool'],
      activePaths: ['model-tool'],
      packet: { from: 'model', to: 'tool', label: 'call' },
      traceEvents: [
        { id: 'tool-called', type: 'tool-call', title: '执行工具', detail: '携带工具名、结构化参数和调用上下文，发起本次执行并记录执行编号。', status: 'active' },
      ],
    },
    {
      id: 'error-returned',
      title: 'Error Returned',
      description: '工具返回错误，失败结果被当作观察进入 Trace，而不是被静默吞掉或直接重试。',
      activeNodes: ['tool', 'error'],
      activePaths: ['tool-error'],
      packet: { from: 'tool', to: 'error', label: 'err' },
      traceEvents: [
        { id: 'error-captured', type: 'observation', title: '捕获错误', detail: '工具返回 stderr、退出码和错误类型，失败位置注入 Trace，等待分类处理。', status: 'active' },
      ],
    },
    {
      id: 'classify-error',
      title: 'Classify Error',
      description: '分析器区分参数错误、权限问题、网络失败和不可恢复失败，决定是否进入修复循环。',
      activeNodes: ['error', 'analyzer'],
      activePaths: ['error-analyzer'],
      packet: { from: 'error', to: 'analyzer', label: 'signal' },
      traceEvents: [
        { id: 'error-classified', type: 'thinking', title: '分类失败原因', detail: '分析错误类别和可恢复性，推断允许重试的条件，决策是否进入修复循环。', status: 'active' },
      ],
    },
    {
      id: 'repair-params',
      title: 'Repair Params',
      description: '系统根据错误信号修正参数、缩小执行范围或改换路径，避免盲目重复同一次失败。',
      activeNodes: ['analyzer', 'repair'],
      activePaths: ['analyzer-repair'],
      packet: { from: 'analyzer', to: 'repair', label: 'fix' },
      traceEvents: [
        { id: 'params-repaired', type: 'repair', title: '修正调用', detail: '根据错误信号修改参数，明确修复依据和重试边界，避免重复同一次失败。', status: 'active' },
      ],
    },
    {
      id: 'retry-success',
      title: 'Retry Success',
      description: '修正后的请求再次进入工具，成功观察成为最终响应依据，并保留失败到恢复的完整链路。',
      activeNodes: ['repair', 'tool', 'final'],
      activePaths: ['repair-tool', 'tool-final'],
      packet: { from: 'tool', to: 'final', label: 'ok' },
      traceEvents: [
        { id: 'retry-succeeded', type: 'output', title: '重试成功', detail: '重试成功，输出可交付结果，保留失败到修复的完整路径供复盘。', status: 'active' },
      ],
    },
  ],
}
