import type { CanvasNode, CanvasPath, Experiment } from '../../components/animation-lab/type'

export const agentLoopNodes: CanvasNode[] = [
  { id: 'user', label: 'User', role: '输入' },
  { id: 'planner', label: 'Planner', role: '计划' },
  { id: 'llm', label: 'LLM', role: '推理' },
  { id: 'tool', label: 'Tool', role: '行动' },
  { id: 'observation', label: 'Observation', role: '观察' },
  { id: 'memory', label: 'Memory', role: '上下文' },
  { id: 'final', label: 'Final Answer', role: '输出' },
]

export const agentLoopPaths: CanvasPath[] = [
  { id: 'user-planner', from: 'user', to: 'planner', d: 'M120 260 C190 220 240 190 315 190' },
  { id: 'planner-llm', from: 'planner', to: 'llm', d: 'M350 190 C430 130 520 130 610 190' },
  { id: 'llm-tool', from: 'llm', to: 'tool', d: 'M640 210 C730 225 790 260 840 330' },
  { id: 'tool-observation', from: 'tool', to: 'observation', d: 'M820 360 C720 415 625 425 530 380' },
  { id: 'observation-memory', from: 'observation', to: 'memory', d: 'M500 395 C430 470 320 470 250 390' },
  { id: 'memory-llm', from: 'memory', to: 'llm', d: 'M265 365 C365 300 500 255 605 220' },
  { id: 'llm-final', from: 'llm', to: 'final', d: 'M640 180 C735 120 830 120 900 185' },
]

export const agentLoopExperiment: Experiment = {
  id: 'agent-loop',
  title: 'Agent 运行闭环',
  summary: '从输入、计划、工具调用、观察、修正到最终输出，观察一次 Agent 如何跑完任务。',
  kind: 'agent-loop',
  steps: [
    {
      id: 'user-input',
      title: 'User Input',
      description: '用户目标进入系统，Agent 获得任务边界。',
      activeNodes: ['user', 'planner'],
      activePaths: ['user-planner'],
      packet: { from: 'user', to: 'planner', label: 'goal' },
      traceEvents: [
        { id: 'input-received', type: 'input', title: '接收目标', detail: '任务被写入当前运行上下文。', status: 'active' },
      ],
    },
    {
      id: 'plan',
      title: 'Plan',
      description: 'Planner 把目标拆成可执行的下一步。',
      activeNodes: ['planner', 'llm'],
      activePaths: ['planner-llm'],
      packet: { from: 'planner', to: 'llm', label: 'plan' },
      traceEvents: [
        { id: 'plan-created', type: 'thinking', title: '生成计划', detail: '模型选择先确认信息，再调用工具。', status: 'active' },
      ],
    },
    {
      id: 'tool-call',
      title: 'Tool Call',
      description: '模型把一段意图转成明确的工具调用。',
      activeNodes: ['llm', 'tool'],
      activePaths: ['llm-tool'],
      packet: { from: 'llm', to: 'tool', label: 'call' },
      traceEvents: [
        { id: 'tool-dispatched', type: 'tool-call', title: '调用工具', detail: '工具输入被结构化，等待执行结果。', status: 'active' },
      ],
    },
    {
      id: 'observation',
      title: 'Observation',
      description: '工具结果回填，Agent 获得外部世界的新证据。',
      activeNodes: ['tool', 'observation'],
      activePaths: ['tool-observation'],
      packet: { from: 'tool', to: 'observation', label: 'result' },
      traceEvents: [
        { id: 'observation-returned', type: 'observation', title: '观察结果', detail: '工具结果进入观察区，等待模型判断。', status: 'active' },
      ],
    },
    {
      id: 'repair',
      title: 'Repair / Refine',
      description: 'Agent 根据观察结果更新上下文，并修正下一步。',
      activeNodes: ['observation', 'memory', 'llm'],
      activePaths: ['observation-memory', 'memory-llm'],
      packet: { from: 'memory', to: 'llm', label: 'context' },
      traceEvents: [
        { id: 'context-refined', type: 'repair', title: '修正上下文', detail: '新证据改变下一步推理路径。', status: 'active' },
      ],
    },
    {
      id: 'final-answer',
      title: 'Final Answer',
      description: '模型基于最新上下文给出稳定输出。',
      activeNodes: ['llm', 'final'],
      activePaths: ['llm-final'],
      packet: { from: 'llm', to: 'final', label: 'answer' },
      traceEvents: [
        { id: 'answer-ready', type: 'output', title: '生成输出', detail: '最终答案写入响应通道。', status: 'active' },
      ],
    },
  ],
}
