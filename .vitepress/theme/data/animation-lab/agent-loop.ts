import type { FlowCanvasConfig, Experiment } from '../../components/animation-lab/type'

export const agentLoopCanvas: FlowCanvasConfig = {
  ariaLabel: 'Agent 运行闭环路径',
  accent: 'teal',
  motion: 'memory',
  nodes: [
    { id: 'user', label: 'User', role: '输入', x: 16, y: 48, mobileX: 22, mobileY: 36 },
    { id: 'planner', label: 'Planner', role: '计划', x: 38, y: 26, mobileX: 50, mobileY: 18 },
    { id: 'llm', label: 'LLM', role: '推理', x: 64, y: 34, mobileX: 78, mobileY: 39 },
    { id: 'tool', label: 'Tool', role: '行动', x: 78, y: 58, mobileX: 78, mobileY: 59 },
    { id: 'observation', label: 'Observation', role: '观察', x: 54, y: 70, mobileX: 50, mobileY: 80 },
    { id: 'memory', label: 'Memory', role: '上下文', x: 28, y: 70, mobileX: 22, mobileY: 59 },
    { id: 'final', label: 'Final Answer', role: '输出', x: 88, y: 15, mobileX: 86, mobileY: 10 },
  ],
  paths: [
    { id: 'user-planner', from: 'user', to: 'planner', d: 'M120 260 C190 220 240 190 315 190' },
    { id: 'planner-llm', from: 'planner', to: 'llm', d: 'M350 190 C430 130 520 130 610 190' },
    { id: 'llm-tool', from: 'llm', to: 'tool', d: 'M640 210 C730 225 790 260 840 330' },
    { id: 'tool-observation', from: 'tool', to: 'observation', d: 'M820 360 C720 415 625 425 530 380' },
    { id: 'observation-memory', from: 'observation', to: 'memory', d: 'M500 395 C430 470 320 470 250 390' },
    { id: 'memory-llm', from: 'memory', to: 'llm', d: 'M265 365 C365 300 500 255 605 220' },
    { id: 'llm-final', from: 'llm', to: 'final', d: 'M640 180 C735 120 830 120 900 185' },
  ],
}

export const agentLoopExperiment: Experiment = {
  id: 'agent-loop',
  title: 'Agent 运行闭环',
  summary: '从输入、计划、工具调用、观察、修正到最终输出，观察一次 Agent 如何在证据驱动下完成任务。',
  kind: 'agent-loop',
  steps: [
    {
      id: 'user-input',
      title: 'User Input',
      description: '用户目标进入系统，Agent 先获得任务边界、上下文入口和本轮要解决的问题。',
      activeNodes: ['user', 'planner'],
      activePaths: ['user-planner'],
      packet: { from: 'user', to: 'planner', label: 'goal' },
      traceEvents: [
        { id: 'input-received', type: 'input', title: '接收目标', detail: '接收用户目标、约束和可用上下文，确立本轮 Agent 运行的起点。', status: 'active' },
      ],
    },
    {
      id: 'plan',
      title: 'Plan',
      description: 'Planner 把目标拆成可执行的下一步，并决定是否需要工具、记忆或补充信息。',
      activeNodes: ['planner', 'llm'],
      activePaths: ['planner-llm'],
      packet: { from: 'planner', to: 'llm', label: 'plan' },
      traceEvents: [
        { id: 'plan-created', type: 'thinking', title: '生成计划', detail: '推断当前假设，锁定下一步动作，明确触发工具调用的理由。', status: 'active' },
      ],
    },
    {
      id: 'tool-call',
      title: 'Tool Call',
      description: '模型把行动意图转成明确工具请求，参数结构化后才会进入外部执行层。',
      activeNodes: ['llm', 'tool'],
      activePaths: ['llm-tool'],
      packet: { from: 'llm', to: 'tool', label: 'call' },
      traceEvents: [
        { id: 'tool-dispatched', type: 'tool-call', title: '调用工具', detail: '携带工具名、结构化参数和调用目标，等待外部执行层响应。', status: 'active' },
      ],
    },
    {
      id: 'observation',
      title: 'Observation',
      description: '工具结果回填为观察，Agent 获得外部世界的新证据，但还不能直接当作最终答案。',
      activeNodes: ['tool', 'observation'],
      activePaths: ['tool-observation'],
      packet: { from: 'tool', to: 'observation', label: 'result' },
      traceEvents: [
        { id: 'observation-returned', type: 'observation', title: '观察结果', detail: '工具返回 stdout、结构化结果或错误信号，注入上下文等待模型评估可信度。', status: 'active' },
      ],
    },
    {
      id: 'repair',
      title: 'Repair / Refine',
      description: 'Agent 根据观察结果更新上下文，修正计划或补充证据，让下一轮推理更接近目标。',
      activeNodes: ['observation', 'memory', 'llm'],
      activePaths: ['observation-memory', 'memory-llm'],
      packet: { from: 'memory', to: 'llm', label: 'context' },
      traceEvents: [
        { id: 'context-refined', type: 'repair', title: '修正上下文', detail: '检测到旧假设与新证据的偏差，更新上下文并明确下一步调整方向。', status: 'active' },
      ],
    },
    {
      id: 'final-answer',
      title: 'Final Answer',
      description: '模型基于最新上下文和已验证证据生成输出，把运行链路收敛为用户可读答案。',
      activeNodes: ['llm', 'final'],
      activePaths: ['llm-final'],
      packet: { from: 'llm', to: 'final', label: 'answer' },
      traceEvents: [
        { id: 'answer-ready', type: 'output', title: '生成输出', detail: '收敛输出最终响应，附带关键推理依据和任务结束状态。', status: 'active' },
      ],
    },
  ],
}
