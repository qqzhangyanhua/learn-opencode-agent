import type {
  LearningPathDefinition,
  PracticePhaseSummary
} from './content-meta'

export const learningPaths: LearningPathDefinition[] = [
  {
    pathId: 'theory-first',
    title: '先看懂 Agent 主链路',
    goal: '先建立统一概念框架，再逐步进入工具、会话和实践闭环。',
    audience: ['已经会调模型，但还没把 Agent 工程结构看清楚的开发者'],
    recommendedStart: '/00-what-is-ai-agent/',
    entryCriteria: ['想先知道每一章为什么读，再开始动手做项目'],
    outcomes: [
      '知道 Agent、工具系统和会话循环之间的关系',
      '能从 OpenCode 拆解切到第一个可运行实践项目'
    ],
    steps: [
      { order: 1, contentId: 'book-00-agent-intro', reason: '先把 Agent 是什么、不是什讲清楚。' },
      { order: 2, contentId: 'book-01-agent-basics', reason: '把 LLM、Tools、Memory、Planning 和循环的职责拆开。' },
      { order: 3, contentId: 'book-03-tool-system', reason: '理解 Agent 为什么能行动，以及工具协议如何落地。' },
      { order: 4, contentId: 'book-04-session-management', reason: '把消息流、执行循环和上下文管理串成完整主链路。' },
      { order: 5, contentId: 'practice-p01-minimal-agent', reason: '第一次亲手跑通工具调用闭环。' },
      { order: 6, contentId: 'practice-p10-react-loop', reason: '把最小闭环升级成可观察、可调试的推理链。' },
      { order: 7, contentId: 'intermediate-27-planning-mechanism', reason: '理解为什么复杂任务需要计划和重规划。' }
    ]
  },
  {
    pathId: 'practice-first',
    title: '先跑通第一个可运行 Agent',
    goal: '30 秒内找到能直接开练的入口，边做边补理论。',
    audience: ['更偏项目驱动、希望直接抄作业和照着搭的开发者'],
    recommendedStart: '/practice/p01-minimal-agent/',
    entryCriteria: ['已经能调 API，希望先有一个最小可运行项目作为抓手'],
    outcomes: [
      '先拥有一个可运行 Agent，再逐步理解背后的理论结构',
      '知道从 P1 到 Planning 主题的最短迁移路径'
    ],
    steps: [
      { order: 1, contentId: 'practice-p01-minimal-agent', reason: '先把最小可运行成果做出来，建立动手反馈。' },
      { order: 2, contentId: 'book-00-agent-intro', reason: '回头补齐 Agent 边界和概念框架。' },
      { order: 3, contentId: 'book-03-tool-system', reason: '理解刚才那个最小项目里的工具调用为什么能工作。' },
      { order: 4, contentId: 'practice-p10-react-loop', reason: '从工具调用进阶到显式推理链。' },
      { order: 5, contentId: 'book-04-session-management', reason: '把实践里的循环感受映射回正式会话架构。' },
      { order: 6, contentId: 'intermediate-27-planning-mechanism', reason: '进入复杂任务前，先理解规划为何必要。' }
    ]
  },
  {
    pathId: 'engineering-depth',
    title: '从最小闭环走到工程判断',
    goal: '聚焦那些决定 Agent 是否可维护、可协作、可扩展的核心章节。',
    audience: ['已经做过简单 Demo，想补齐工程判断与架构视角的开发者'],
    recommendedStart: '/01-agent-basics/',
    entryCriteria: ['已经理解基础调用，希望尽快进入工程层判断'],
    outcomes: [
      '能把组件、工具、会话和 Planning 视为一套完整工程系统',
      '知道从理论到中级专题的最短深挖路线'
    ],
    steps: [
      { order: 1, contentId: 'book-01-agent-basics', reason: '先收拢核心组件边界，避免后续阅读只看局部。' },
      { order: 2, contentId: 'book-03-tool-system', reason: '理解权限、协议和工具执行边界。' },
      { order: 3, contentId: 'book-04-session-management', reason: '掌握消息结构、上下文压缩和循环收口。' },
      { order: 4, contentId: 'practice-p10-react-loop', reason: '把工程判断放回一个可调试的实际循环里验证。' },
      { order: 5, contentId: 'intermediate-27-planning-mechanism', reason: '把局部循环提升到计划与重规划层面。' }
    ]
  }
]

export const learningPathById = Object.fromEntries(
  learningPaths.map((path) => [path.pathId, path])
) as Record<LearningPathDefinition['pathId'], LearningPathDefinition>

export const practicePhases: PracticePhaseSummary[] = [
  {
    phaseId: 'phase-1',
    order: 1,
    title: 'Agent 基础',
    subtitle: '工具调用 / 多轮对话 / 流式输出 / 错误处理',
    summary: '先把最小 Agent 跑起来，建立对工具调用和基本对话循环的直觉。',
    projectCount: 4,
    projectIds: [
      'practice-p01-minimal-agent',
      'practice-p02-multi-turn',
      'practice-p03-streaming',
      'practice-p04-error-handling'
    ],
    recommendedStart: '/practice/p01-minimal-agent/',
    themeTags: ['Tool Calling', 'Multi-turn', 'Streaming', 'Error Handling']
  },
  {
    phaseId: 'phase-2',
    order: 2,
    title: '记忆与知识',
    subtitle: '记忆系统 / 记忆增强检索 / RAG / GraphRAG',
    summary: '把短对话扩展成可长期积累、可检索、可引用知识的系统能力。',
    projectCount: 5,
    projectIds: [
      'practice-p05-memory-arch',
      'practice-p06-memory-retrieval',
      'practice-p07-rag-basics',
      'practice-p08-graphrag',
      'practice-p09-hybrid-retrieval'
    ],
    recommendedStart: '/practice/p05-memory-arch/',
    themeTags: ['Memory', 'RAG', 'GraphRAG', 'Hybrid Retrieval']
  },
  {
    phaseId: 'phase-3',
    order: 3,
    title: '推理与规划',
    subtitle: 'ReAct Loop / Planning / Reflection',
    summary: '把单步工具调用升级成显式推理、计划生成和自我反思闭环。',
    projectCount: 3,
    projectIds: [
      'practice-p10-react-loop',
      'practice-p11-planning',
      'practice-p12-reflection'
    ],
    recommendedStart: '/practice/p10-react-loop/',
    themeTags: ['ReAct', 'Planning', 'Reflection']
  },
  {
    phaseId: 'phase-4',
    order: 4,
    title: '感知扩展',
    subtitle: '多模态智能体 / MCP 协议接入',
    summary: '让 Agent 从文本世界走向多模态输入和外部能力接入。',
    projectCount: 2,
    projectIds: [
      'practice-p13-multimodal',
      'practice-p14-mcp'
    ],
    recommendedStart: '/practice/p13-multimodal/',
    themeTags: ['Multimodal', 'MCP']
  },
  {
    phaseId: 'phase-5',
    order: 5,
    title: '多 Agent 协作',
    subtitle: '编排模式 / 子 Agent / 通信协议',
    summary: '从单 Agent 迈向多角色协作、任务拆解和状态共享。',
    projectCount: 3,
    projectIds: [
      'practice-p15-multi-agent',
      'practice-p16-subagent',
      'practice-p17-agent-comm'
    ],
    recommendedStart: '/practice/p15-multi-agent/',
    themeTags: ['Multi-Agent', 'Sub-Agent', 'Communication']
  },
  {
    phaseId: 'phase-6',
    order: 6,
    title: '生产化',
    subtitle: '模型路由 / 安全 / 可观测性 / 评估',
    summary: '把 Demo 打磨成真实系统需要的成本、安全、监控和评估能力。',
    projectCount: 4,
    projectIds: [
      'practice-p18-model-routing',
      'practice-p19-security',
      'practice-p20-observability',
      'practice-p21-evaluation'
    ],
    recommendedStart: '/practice/p18-model-routing/',
    themeTags: ['Routing', 'Security', 'Observability', 'Evaluation']
  },
  {
    phaseId: 'phase-7',
    order: 7,
    title: '综合实战',
    subtitle: 'Code Review Agent 完整项目 / 部署清单',
    summary: '把前面学过的能力收束进一个完整项目与上线清单里。',
    projectCount: 2,
    projectIds: [
      'practice-p22-project',
      'practice-p23-production'
    ],
    recommendedStart: '/practice/p22-project/',
    themeTags: ['Capstone', 'Deployment']
  }
]

export default {
  watch: [],
  load() {
    return {
      learningPaths,
      learningPathById,
      practicePhases
    }
  }
}
