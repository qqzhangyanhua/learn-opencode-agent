import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const multiAgentDispatchCanvas: FlowCanvasConfig = {
  ariaLabel: '多 Agent 调度路径',
  accent: 'sky',
  motion: 'dispatch',
  nodes: [
    { id: 'coordinator', label: 'Coordinator', role: '调度器', x: 18, y: 46, mobileX: 20, mobileY: 18 },
    { id: 'planner', label: 'Planner', role: '计划 Agent', x: 43, y: 26, mobileX: 56, mobileY: 20 },
    { id: 'coder', label: 'Coder', role: '实现 Agent', x: 70, y: 20, mobileX: 78, mobileY: 40 },
    { id: 'reviewer', label: 'Reviewer', role: '审查 Agent', x: 58, y: 64, mobileX: 62, mobileY: 64 },
    { id: 'merge', label: 'Merge', role: '汇总', x: 34, y: 78, mobileX: 28, mobileY: 64 },
    { id: 'answer', label: 'Answer', role: '交付', x: 86, y: 50, mobileX: 50, mobileY: 86 },
  ],
  paths: [
    { id: 'coordinator-planner', from: 'coordinator', to: 'planner', d: 'M180 258 C255 190 355 145 430 146' },
    { id: 'planner-coder', from: 'planner', to: 'coder', d: 'M435 140 C525 94 635 90 700 112' },
    { id: 'planner-reviewer', from: 'planner', to: 'reviewer', d: 'M435 154 C510 245 570 318 580 358' },
    { id: 'coder-reviewer', from: 'coder', to: 'reviewer', d: 'M700 125 C720 220 670 310 580 360' },
    { id: 'reviewer-merge', from: 'reviewer', to: 'merge', d: 'M575 370 C495 438 405 448 340 437' },
    { id: 'merge-answer', from: 'merge', to: 'answer', d: 'M350 430 C545 430 770 330 860 280' },
  ],
}

export const multiAgentDispatchExperiment: Experiment = {
  id: 'multi-agent-dispatch',
  title: '多 Agent 调度',
  summary: '展示任务如何分发给多个 Agent，观察并行协作、审查与结果汇总的完整运行轨迹。',
  kind: 'multi-agent-dispatch',
  steps: [
    {
      id: 'dispatch-plan',
      title: 'Dispatch Plan',
      description: '调度器先把任务交给计划 Agent，判断任务是否可拆分，并确定分工边界。',
      activeNodes: ['coordinator', 'planner'],
      activePaths: ['coordinator-planner'],
      packet: { from: 'coordinator', to: 'planner', label: 'brief' },
      traceEvents: [
        { id: 'brief-sent', type: 'input', title: '下发任务摘要', detail: '接收任务目标和约束，识别可并行的工作单元，下发给计划 Agent 确认分工边界。', status: 'active' },
      ],
    },
    {
      id: 'parallel-work',
      title: 'Parallel Work',
      description: '计划 Agent 把互不阻塞的子任务分派给实现和审查链路，让多个角色并行推进。',
      activeNodes: ['planner', 'coder', 'reviewer'],
      activePaths: ['planner-coder', 'planner-reviewer'],
      packet: { from: 'planner', to: 'coder', label: 'task' },
      traceEvents: [
        { id: 'work-split', type: 'thinking', title: '拆分并行任务', detail: '划定子任务边界和依赖关系，分配各 Agent 的责任范围，释放互不阻塞的并行路径。', status: 'active' },
      ],
    },
    {
      id: 'review-pass',
      title: 'Review Pass',
      description: '实现结果进入审查 Agent，检查风险、遗漏和接口一致性，再决定是否需要返工。',
      activeNodes: ['coder', 'reviewer'],
      activePaths: ['coder-reviewer'],
      packet: { from: 'coder', to: 'reviewer', label: 'diff' },
      traceEvents: [
        { id: 'review-started', type: 'tool-call', title: '提交审查', detail: '提交变更摘要和风险点，要求审查 Agent 核对接口契约和边界条件。', status: 'active' },
      ],
    },
    {
      id: 'merge-findings',
      title: 'Merge Findings',
      description: '审查反馈和实现结果汇总，冲突结论被消解，形成一个统一交付面。',
      activeNodes: ['reviewer', 'merge'],
      activePaths: ['reviewer-merge'],
      packet: { from: 'reviewer', to: 'merge', label: 'notes' },
      traceEvents: [
        { id: 'findings-merged', type: 'repair', title: '汇总反馈', detail: '合并审查反馈，去重冲突结论，标注仍需说明的残余风险。', status: 'active' },
      ],
    },
    {
      id: 'deliver-answer',
      title: 'Deliver Answer',
      description: '调度器输出最终结果，把多条工作流汇总为用户可理解、可执行的收敛答案。',
      activeNodes: ['merge', 'answer'],
      activePaths: ['merge-answer'],
      packet: { from: 'merge', to: 'answer', label: 'final' },
      traceEvents: [
        { id: 'answer-delivered', type: 'output', title: '交付结果', detail: '汇总多 Agent 贡献，输出最终答案，将协作过程收敛为用户可理解的交付结果。', status: 'active' },
      ],
    },
  ],
}
