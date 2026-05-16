import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const multiAgentDispatchCanvas: FlowCanvasConfig = {
  ariaLabel: '多 Agent 调度路径',
  accent: 'sky',
  motion: 'dispatch',
  nodes: [
    { id: 'coordinator', label: 'Coordinator', role: '调度器', x: 14, y: 44, mobileX: 20, mobileY: 18 },
    { id: 'planner', label: 'Planner', role: '计划 Agent', x: 40, y: 22, mobileX: 56, mobileY: 20 },
    { id: 'coder', label: 'Coder', role: '实现 Agent', x: 66, y: 30, mobileX: 82, mobileY: 40 },
    { id: 'reviewer', label: 'Reviewer', role: '审查 Agent', x: 66, y: 68, mobileX: 62, mobileY: 64 },
    { id: 'merge', label: 'Merge', role: '汇总', x: 38, y: 76, mobileX: 26, mobileY: 64 },
    { id: 'answer', label: 'Answer', role: '交付', x: 86, y: 50, mobileX: 50, mobileY: 86 },
  ],
  paths: [
    { id: 'coordinator-planner', from: 'coordinator', to: 'planner', d: 'M140 246 C220 150 300 110 400 125' },
    { id: 'planner-coder', from: 'planner', to: 'coder', d: 'M405 125 C495 95 590 115 660 165' },
    { id: 'planner-reviewer', from: 'planner', to: 'reviewer', d: 'M415 145 C525 210 605 285 660 378' },
    { id: 'coder-reviewer', from: 'coder', to: 'reviewer', d: 'M665 185 C705 250 705 320 665 380' },
    { id: 'reviewer-merge', from: 'reviewer', to: 'merge', d: 'M645 395 C545 445 465 445 385 425' },
    { id: 'merge-answer', from: 'merge', to: 'answer', d: 'M395 420 C550 475 735 405 860 280' },
  ],
}

export const multiAgentDispatchExperiment: Experiment = {
  id: 'multi-agent-dispatch',
  title: '多 Agent 调度',
  summary: '拆解任务分发、并行协作、审查与结果汇总的运行轨迹。',
  kind: 'multi-agent-dispatch',
  steps: [
    {
      id: 'dispatch-plan',
      title: 'Dispatch Plan',
      description: '调度器先把任务交给计划 Agent，确定分工边界。',
      activeNodes: ['coordinator', 'planner'],
      activePaths: ['coordinator-planner'],
      packet: { from: 'coordinator', to: 'planner', label: 'brief' },
      traceEvents: [
        { id: 'brief-sent', type: 'input', title: '下发任务摘要', detail: '只传递目标和约束，不暴露无关上下文。', status: 'active' },
      ],
    },
    {
      id: 'parallel-work',
      title: 'Parallel Work',
      description: '计划 Agent 把不同子任务分派给实现和审查链路。',
      activeNodes: ['planner', 'coder', 'reviewer'],
      activePaths: ['planner-coder', 'planner-reviewer'],
      packet: { from: 'planner', to: 'coder', label: 'task' },
      traceEvents: [
        { id: 'work-split', type: 'thinking', title: '拆分并行任务', detail: '可独立推进的部分被分配给不同角色。', status: 'active' },
      ],
    },
    {
      id: 'review-pass',
      title: 'Review Pass',
      description: '实现结果进入审查 Agent，检查风险、遗漏和接口一致性。',
      activeNodes: ['coder', 'reviewer'],
      activePaths: ['coder-reviewer'],
      packet: { from: 'coder', to: 'reviewer', label: 'diff' },
      traceEvents: [
        { id: 'review-started', type: 'tool-call', title: '提交审查', detail: '实现产物被转成可审查的变更摘要。', status: 'active' },
      ],
    },
    {
      id: 'merge-findings',
      title: 'Merge Findings',
      description: '审查反馈和实现结果汇总，形成一个统一交付面。',
      activeNodes: ['reviewer', 'merge'],
      activePaths: ['reviewer-merge'],
      packet: { from: 'reviewer', to: 'merge', label: 'notes' },
      traceEvents: [
        { id: 'findings-merged', type: 'repair', title: '汇总反馈', detail: '冲突和重复结论在汇总阶段被消解。', status: 'active' },
      ],
    },
    {
      id: 'deliver-answer',
      title: 'Deliver Answer',
      description: '调度器输出最终结果，用户只看到收敛后的答案。',
      activeNodes: ['merge', 'answer'],
      activePaths: ['merge-answer'],
      packet: { from: 'merge', to: 'answer', label: 'final' },
      traceEvents: [
        { id: 'answer-delivered', type: 'output', title: '交付结果', detail: '并行过程被折叠成清晰的最终说明。', status: 'active' },
      ],
    },
  ],
}
