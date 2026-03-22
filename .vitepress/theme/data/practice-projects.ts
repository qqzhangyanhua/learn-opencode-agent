import type {
  LearningDifficulty,
  PracticePhaseId,
  PracticePhaseOrder
} from './content-meta'
import { data as learningPathData } from './learning-paths.data.js'

export interface PracticeReferenceLink {
  label: string
  href: string
  description: string
}

export interface PracticeCourseRoute {
  routeId: 'ship-first' | 'engineering-first' | 'capstone-first'
  title: string
  audience: string
  summary: string
  recommendedProjectId: string
  supportingProjectIds: string[]
  milestones: string[]
}

export interface PracticeProjectDefinition {
  projectId: string
  order: number
  shortLabel: string
  title: string
  path: string
  projectTitle: string
  summary: string
  difficulty: LearningDifficulty
  estimatedTime: string
  tags: string[]
  learningGoals: string[]
  prerequisites: string[]
  prerequisiteProjectIds: string[]
  runCommand: string
  sourceFiles: string[]
  supportsPlayground: boolean
  runModeLabel: string
  runModeHint: string
  completionSignals: string[]
  relatedTheory: PracticeReferenceLink[]
  nextProjectIds: string[]
  phaseId: PracticePhaseId
  phaseOrder: PracticePhaseOrder
  phaseTitle: string
  phaseSubtitle: string
  phaseSummary: string
}

type ProjectSeed = Omit<
  PracticeProjectDefinition,
  'phaseId' | 'phaseOrder' | 'phaseTitle' | 'phaseSubtitle' | 'phaseSummary'
>

const THEORY_LINKS = {
  agentIntro: {
    label: '理论篇 00：什么是 AI Agent',
    href: '/00-what-is-ai-agent/',
    description: '把当前项目重新映射回 Agent、模型和工具系统的整体骨架。'
  },
  agentBasics: {
    label: '理论篇 01：Agent 基础架构',
    href: '/01-agent-basics/',
    description: '回看组件边界，理解消息、工具、记忆和规划各自负责什么。'
  },
  toolSystem: {
    label: '理论篇 03：工具系统',
    href: '/03-tool-system/',
    description: '理解为什么模型能行动、工具调用如何在工程上落地。'
  },
  sessionManagement: {
    label: '理论篇 04：会话管理',
    href: '/04-session-management/',
    description: '把消息流、上下文管理和执行循环与当前项目的行为对齐。'
  },
  planningMechanism: {
    label: '中级篇 27：Planning 机制',
    href: '/intermediate/27-planning-mechanism/',
    description: '当单步循环不够时，理解计划、重规划和任务树为何必要。'
  }
} satisfies Record<string, PracticeReferenceLink>

const projectSeeds: ProjectSeed[] = [
  {
    projectId: 'practice-p01-minimal-agent',
    order: 1,
    shortLabel: 'P1',
    title: '最小 Agent',
    path: '/practice/p01-minimal-agent/',
    projectTitle: '一个可以查询天气的最小 Agent',
    summary: '用最少代码跑通工具调用生命周期，拿到第一个真正可运行的 Agent 闭环。',
    difficulty: 'beginner',
    estimatedTime: '45 min',
    tags: ['OpenAI SDK', 'Tool Calling', 'TypeScript'],
    learningGoals: [
      '跑通用户输入、模型思考、工具执行、最终回复的最小闭环',
      '理解 `tool_calls` 和 `role: tool` 的基本协作方式',
      '建立后续所有实践项目的最小心智模型'
    ],
    prerequisites: ['已阅读实践环境准备', '无，可直接开始'],
    prerequisiteProjectIds: [],
    runCommand: 'bun run p01-minimal-agent.ts',
    sourceFiles: ['practice/p01-minimal-agent.ts'],
    supportsPlayground: true,
    runModeLabel: '在线/本地均可',
    runModeHint: '第一次进入实践篇最适合从这里开始，浏览器试跑和本地运行都很顺手。',
    completionSignals: [
      '终端中能看到工具调用日志和最终回复同时出现',
      '修改天气模拟数据后，模型回答能明显跟着变化',
      '你能解释清楚 `finish_reason === tool_calls` 时循环为什么不能结束'
    ],
    relatedTheory: [THEORY_LINKS.agentIntro, THEORY_LINKS.toolSystem],
    nextProjectIds: ['practice-p02-multi-turn', 'practice-p10-react-loop']
  },
  {
    projectId: 'practice-p02-multi-turn',
    order: 2,
    shortLabel: 'P2',
    title: '多轮对话',
    path: '/practice/p02-multi-turn/',
    projectTitle: '一个支持多轮对话、能自动裁剪历史的 ChatSession',
    summary: '把单次请求升级成可持续对话的会话骨架，并开始感受上下文预算约束。',
    difficulty: 'beginner',
    estimatedTime: '30 min',
    tags: ['OpenAI SDK', 'Context Management', 'TypeScript'],
    learningGoals: [
      '让 Agent 记住最近几轮对话而不是每次从零开始',
      '理解历史裁剪和 token 预算为什么是会话系统的基本工程约束',
      '建立后续记忆系统章节的地基'
    ],
    prerequisites: ['建议先完成 P1'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent'],
    runCommand: 'bun run practice/p02-multi-turn.ts',
    sourceFiles: ['practice/p02-multi-turn.ts'],
    supportsPlayground: true,
    runModeLabel: '在线/本地均可',
    runModeHint: '如果你想先感受多轮上下文效果，可以直接从在线工作台开始。',
    completionSignals: [
      '连续问答后，模型能记住上一轮上下文',
      '历史过长时，日志里能看到裁剪发生但对话仍然连贯',
      '你能说出为什么 system prompt 和最近几轮要优先保留'
    ],
    relatedTheory: [THEORY_LINKS.sessionManagement],
    nextProjectIds: ['practice-p03-streaming', 'practice-p05-memory-arch']
  },
  {
    projectId: 'practice-p03-streaming',
    order: 3,
    shortLabel: 'P3',
    title: '流式输出',
    path: '/practice/p03-streaming/',
    projectTitle: '一个回复逐 token 打印到终端的流式 Agent',
    summary: '把“等全部生成完再显示”升级成边生成边展示，改善交互反馈和调试体验。',
    difficulty: 'beginner',
    estimatedTime: '30 min',
    tags: ['OpenAI SDK', 'Streaming', 'TypeScript'],
    learningGoals: [
      '理解流式响应和普通完成式调用的差异',
      '学会消费文本增量和工具调用增量',
      '掌握面向用户反馈更友好的 Agent 输出方式'
    ],
    prerequisites: ['建议先完成 P1'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent'],
    runCommand: 'bun run p03-streaming.ts',
    sourceFiles: ['practice/p03-streaming.ts'],
    supportsPlayground: true,
    runModeLabel: '在线/本地均可',
    runModeHint: '如果你想先看实时输出效果，优先用在线工作台验证流式体验。',
    completionSignals: [
      '终端内容会逐字出现，而不是等 5 秒后一次性输出',
      '工具调用前后能看到清晰的停顿和恢复',
      '你能解释为什么工具参数需要先完整生成后才能执行'
    ],
    relatedTheory: [THEORY_LINKS.sessionManagement],
    nextProjectIds: ['practice-p04-error-handling', 'practice-p10-react-loop']
  },
  {
    projectId: 'practice-p04-error-handling',
    order: 4,
    shortLabel: 'P4',
    title: '错误处理与重试',
    path: '/practice/p04-error-handling/',
    projectTitle: '一个带指数退避重试的健壮 Agent',
    summary: '让最小闭环开始具备工程韧性，知道失败时怎样重试、降级和收口。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Error Handling', 'Retry', 'OpenAI SDK', 'TypeScript'],
    learningGoals: [
      '掌握指数退避、错误分类和工具失败降级',
      '理解模型调用失败时为什么不能简单无限重试',
      '为后续 MCP、安全、生产化章节打基础'
    ],
    prerequisites: ['建议先完成 P1、P2'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p02-multi-turn'],
    runCommand: 'bun run p04-error-handling.ts',
    sourceFiles: ['practice/p04-error-handling.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '这章更适合在本地观察重试、限流和错误日志，不建议只看静态结果。',
    completionSignals: [
      '模拟失败时能看到重试次数和退避间隔变化',
      '错误不会直接把整个循环打挂，而是有明确的兜底输出',
      '你能区分哪些错误应该重试，哪些错误应该直接失败'
    ],
    relatedTheory: [THEORY_LINKS.toolSystem, THEORY_LINKS.sessionManagement],
    nextProjectIds: ['practice-p10-react-loop', 'practice-p18-model-routing']
  },
  {
    projectId: 'practice-p05-memory-arch',
    order: 5,
    shortLabel: 'P5',
    title: '记忆系统架构',
    path: '/practice/p05-memory-arch/',
    projectTitle: '一个三层记忆系统，让 Agent 能跨会话记住用户信息',
    summary: '从对话历史走向真正的短期、工作、长期记忆分层，建立记忆系统架构感。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Memory', 'State Management', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解短期、工作、长期记忆的职责边界',
      '学会把长期记忆注入 system prompt',
      '为检索增强记忆和 RAG 做结构准备'
    ],
    prerequisites: ['建议先完成 P1、P2'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p02-multi-turn'],
    runCommand: 'bun run practice/p05-memory-arch.ts',
    sourceFiles: ['practice/p05-memory-arch.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '记忆读写和本地文件状态更适合在本地观察完整效果。',
    completionSignals: [
      '新会话中仍能记住先前保存的用户信息',
      '你能指出短期/工作/长期记忆分别存什么',
      '你能解释为什么长期记忆不是“直接塞进 messages 就结束”'
    ],
    relatedTheory: [THEORY_LINKS.agentBasics, THEORY_LINKS.sessionManagement],
    nextProjectIds: ['practice-p06-memory-retrieval', 'practice-p07-rag-basics']
  },
  {
    projectId: 'practice-p06-memory-retrieval',
    order: 6,
    shortLabel: 'P6',
    title: '记忆增强检索',
    path: '/practice/p06-memory-retrieval/',
    projectTitle: '一个带检索能力的 MemoryBank',
    summary: '让记忆系统从“全量注入”走向“按需召回”，开始接近可扩展的真实实现。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Memory', 'Retrieval', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '让长期记忆按标签和相关性被检索出来',
      '理解为什么不是所有记忆都应该一直放进上下文',
      '为 RAG 章节建立检索思维'
    ],
    prerequisites: ['建议先完成 P1、P5'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p05-memory-arch'],
    runCommand: 'bun run practice/p06-memory-retrieval.ts',
    sourceFiles: ['practice/p06-memory-retrieval.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '这章关注检索逻辑和记忆召回，不必优先追求在线演示。',
    completionSignals: [
      '同一份记忆库在不同问题下会召回不同片段',
      '你能看到标签、重要性或相关性对召回结果的影响',
      '你能说明这和 P7 的文档检索有何异同'
    ],
    relatedTheory: [THEORY_LINKS.agentBasics],
    nextProjectIds: ['practice-p07-rag-basics', 'practice-p08-graphrag']
  },
  {
    projectId: 'practice-p07-rag-basics',
    order: 7,
    shortLabel: 'P7',
    title: 'RAG 基础',
    path: '/practice/p07-rag-basics/',
    projectTitle: '一个本地 RAG 系统，把文档分块、向量化、检索后注入上下文',
    summary: '从记忆系统进一步走向文档知识库，让 Agent 能基于外部知识回答问题。',
    difficulty: 'intermediate',
    estimatedTime: '60 min',
    tags: ['RAG', 'Vector Search', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '掌握切块、向量化、检索和注入上下文的基本链路',
      '理解 RAG 与长期记忆的职责差异',
      '为 GraphRAG 和混合检索做前置'
    ],
    prerequisites: ['建议先完成 P1、P5'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p05-memory-arch'],
    runCommand: 'bun run practice/p07-rag-basics.ts',
    sourceFiles: ['practice/p07-rag-basics.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '需要处理文档分块和检索结果，对本地调试更友好。',
    completionSignals: [
      '模型回答开始明显引用外部文档内容',
      '改变切块或检索参数后，回答质量会发生变化',
      '你能解释“为什么检索错了，模型就会答偏”'
    ],
    relatedTheory: [THEORY_LINKS.agentBasics],
    nextProjectIds: ['practice-p08-graphrag', 'practice-p09-hybrid-retrieval']
  },
  {
    projectId: 'practice-p08-graphrag',
    order: 8,
    shortLabel: 'P8',
    title: 'GraphRAG',
    path: '/practice/p08-graphrag/',
    projectTitle: '一个基于知识图谱的 RAG 系统',
    summary: '在普通检索之外增加实体和关系视角，处理多跳推断类问题。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['GraphRAG', 'Knowledge Graph', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解图谱索引和普通向量检索的差异',
      '学会为多跳关系问题组织知识结构',
      '感受复杂检索系统的工程成本'
    ],
    prerequisites: ['建议先完成 P7'],
    prerequisiteProjectIds: ['practice-p07-rag-basics'],
    runCommand: 'bun run p08-graphrag.ts',
    sourceFiles: ['practice/p08-graphrag.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '图谱构建和调试步骤较多，更适合本地逐段观察。',
    completionSignals: [
      '系统能回答依赖实体关系链的复杂问题',
      '你能指出图谱索引和向量索引各自擅长什么',
      '你能判断这类复杂度何时值得引入'
    ],
    relatedTheory: [THEORY_LINKS.agentBasics, THEORY_LINKS.planningMechanism],
    nextProjectIds: ['practice-p09-hybrid-retrieval', 'practice-p10-react-loop']
  },
  {
    projectId: 'practice-p09-hybrid-retrieval',
    order: 9,
    shortLabel: 'P9',
    title: '混合检索',
    path: '/practice/p09-hybrid-retrieval/',
    projectTitle: '一个融合关键词检索与向量检索的混合 RAG 系统',
    summary: '开始用组合检索和排序融合解决单一策略的盲区。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['Hybrid Retrieval', 'RRF', 'RAG', 'TypeScript'],
    learningGoals: [
      '理解关键词检索和向量检索为什么互补',
      '掌握 RRF 这类结果融合思路',
      '建立检索系统调参和诊断的基本感觉'
    ],
    prerequisites: ['建议先完成 P7、P8'],
    prerequisiteProjectIds: ['practice-p07-rag-basics', 'practice-p08-graphrag'],
    runCommand: 'bun run p09-hybrid-retrieval.ts',
    sourceFiles: ['practice/p09-hybrid-retrieval.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '这章更偏检索对比实验，建议本地多改几次参数做观察。',
    completionSignals: [
      '修改融合权重后，排序结果会发生可解释变化',
      '你能说出单路检索的盲点在哪里',
      '你能判断何时需要引入混合检索而不是继续微调一条链路'
    ],
    relatedTheory: [THEORY_LINKS.agentBasics],
    nextProjectIds: ['practice-p10-react-loop', 'practice-p11-planning']
  },
  {
    projectId: 'practice-p10-react-loop',
    order: 10,
    shortLabel: 'P10',
    title: 'ReAct Loop',
    path: '/practice/p10-react-loop/',
    projectTitle: '一个显式推理链的 ReAct Agent',
    summary: '把黑盒工具调用升级成可见、可调试、可复盘的显式推理循环。',
    difficulty: 'intermediate',
    estimatedTime: '60 min',
    tags: ['ReAct', 'Reasoning', 'Agent Loop', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解 Thought / Action / Observation 推理链如何提升可调试性',
      '掌握从普通工具调用过渡到 ReAct 的实现方式',
      '为 Planning 和 Reflection 做桥接'
    ],
    prerequisites: ['建议先完成 P1、P4'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p04-error-handling'],
    runCommand: 'bun run p10-react-loop.ts',
    sourceFiles: ['practice/p10-react-loop.ts'],
    supportsPlayground: true,
    runModeLabel: '在线/本地均可',
    runModeHint: '如果你想先看教学型推理链，在线工作台会更快；调试解析逻辑时再切回本地。',
    completionSignals: [
      '输出中能看到 Thought / Action / Observation 的完整链路',
      '推理链走偏时，你能定位是 prompt、解析还是工具调用的问题',
      '你能说明为什么这章是进入 Planning 的桥'
    ],
    relatedTheory: [THEORY_LINKS.sessionManagement, THEORY_LINKS.planningMechanism],
    nextProjectIds: ['practice-p11-planning', 'practice-p12-reflection']
  },
  {
    projectId: 'practice-p11-planning',
    order: 11,
    shortLabel: 'P11',
    title: 'Planning',
    path: '/practice/p11-planning/',
    projectTitle: '一个 Plan-and-Execute Agent，先规划后执行，支持失败重规划',
    summary: '从单步循环走向任务分解与重规划，让 Agent 开始处理更长链路任务。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['Planning', 'Plan-and-Execute', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解什么时候单步 ReAct 不够，需要显式计划层',
      '掌握先规划、再执行、失败时重规划的链路',
      '为多 Agent 编排和复杂任务拆解打基础'
    ],
    prerequisites: ['建议先完成 P10'],
    prerequisiteProjectIds: ['practice-p10-react-loop'],
    runCommand: 'bun run p11-planning.ts',
    sourceFiles: ['practice/p11-planning.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '这章更适合在本地看任务树、执行顺序和失败时的重规划日志。',
    completionSignals: [
      '控制台能清楚展示 plan、execute、replan 三个阶段',
      '任务失败时系统不会直接终止，而会进入重规划',
      '你能解释为什么规划层不是“多写一个 prompt”这么简单'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism, THEORY_LINKS.sessionManagement],
    nextProjectIds: ['practice-p12-reflection', 'practice-p15-multi-agent']
  },
  {
    projectId: 'practice-p12-reflection',
    order: 12,
    shortLabel: 'P12',
    title: 'Reflection',
    path: '/practice/p12-reflection/',
    projectTitle: '一个带 Reflection 循环的迭代改进 Agent',
    summary: '让 Agent 不只执行，还会评审自己的结果并根据反馈继续修正。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Reflection', 'Self-Evaluation', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解生成、评审、修订三段式循环',
      '掌握基于反馈驱动的迭代改进模式',
      '为评估体系和更稳定的输出打基础'
    ],
    prerequisites: ['建议先完成 P10'],
    prerequisiteProjectIds: ['practice-p10-react-loop'],
    runCommand: 'bun run p12-reflection.ts',
    sourceFiles: ['practice/p12-reflection.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: 'Reflection 的价值来自多轮迭代过程，本地看日志会更完整。',
    completionSignals: [
      '首轮输出和反思后的第二轮输出存在明显改善',
      '你能定位 Reflection prompt 在结果中带来的变化',
      '你能说明它和 P21 评估体系之间的关系'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism],
    nextProjectIds: ['practice-p21-evaluation', 'practice-p22-project']
  },
  {
    projectId: 'practice-p13-multimodal',
    order: 13,
    shortLabel: 'P13',
    title: '多模态',
    path: '/practice/p13-multimodal/',
    projectTitle: '一个能处理图像输入的多模态 Agent',
    summary: '让 Agent 从纯文本走向图像理解，开始接触视觉输入和多模态交互。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Multimodal', 'Vision', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '掌握图像输入在 Agent 中的基本接法',
      '理解多模态输入对提示与输出设计的影响',
      '建立后续工具接入与环境感知扩展的感觉'
    ],
    prerequisites: ['建议先完成 P1'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent'],
    runCommand: 'bun run p13-multimodal.ts',
    sourceFiles: ['practice/p13-multimodal.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '图像输入和文件路径更适合在本地完整走通。',
    completionSignals: [
      '模型能基于图像内容给出具体描述或比较',
      '你能看懂图像消息结构和文本消息结构的差异',
      '你能说明多模态输入为什么会改变 prompt 设计方式'
    ],
    relatedTheory: [THEORY_LINKS.agentBasics],
    nextProjectIds: ['practice-p14-mcp', 'practice-p15-multi-agent']
  },
  {
    projectId: 'practice-p14-mcp',
    order: 14,
    shortLabel: 'P14',
    title: 'MCP 协议接入',
    path: '/practice/p14-mcp/',
    projectTitle: '一个通过 MCP 接入外部工具服务器的 Agent',
    summary: '从内嵌工具走向标准协议接入，理解工具生态和能力外接的工程边界。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['MCP', 'Protocol', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解 MCP client/server 如何协作',
      '掌握 Agent 通过协议接入外部能力的基本模式',
      '感受工具协议标准化带来的复用价值和调试成本'
    ],
    prerequisites: ['建议先完成 P1、P4'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p04-error-handling'],
    runCommand: 'bun run p14-mcp.ts',
    sourceFiles: ['practice/p14-mcp.ts', 'practice/p14-mcp-server.ts'],
    supportsPlayground: false,
    runModeLabel: '双进程本地运行',
    runModeHint: '这章需要 Agent 端和 MCP Server 端分别运行，更适合本地双终端调试。',
    completionSignals: [
      '两个进程能成功握手并完成一次工具调用',
      '你能分清协议层和业务工具实现层的职责',
      '你能说明为什么标准协议会让工具生态更容易复用'
    ],
    relatedTheory: [THEORY_LINKS.toolSystem],
    nextProjectIds: ['practice-p15-multi-agent', 'practice-p19-security']
  },
  {
    projectId: 'practice-p15-multi-agent',
    order: 15,
    shortLabel: 'P15',
    title: '多 Agent 编排',
    path: '/practice/p15-multi-agent/',
    projectTitle: '一个 Orchestrator-Worker 多 Agent 系统',
    summary: '从单 Agent 走向角色分工和并行执行，开始真正感受系统编排。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['Multi-Agent', 'Orchestrator', 'Parallel', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '掌握 Orchestrator-Worker 角色分工',
      '理解任务拆解、并行执行和结果聚合的基本结构',
      '为子 Agent 和协作通信做前置'
    ],
    prerequisites: ['建议先完成 P1、P11'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p11-planning'],
    runCommand: 'bun run p15-multi-agent.ts',
    sourceFiles: ['practice/p15-multi-agent.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '多角色日志和并行执行细节更适合在本地逐段观察。',
    completionSignals: [
      '你能看到编排器分派多个 worker 并汇总结果',
      '不同角色的 system prompt 和职责边界清晰可辨',
      '你能说明为什么不是所有场景都值得上多 Agent'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism, THEORY_LINKS.agentBasics],
    nextProjectIds: ['practice-p16-subagent', 'practice-p17-agent-comm']
  },
  {
    projectId: 'practice-p16-subagent',
    order: 16,
    shortLabel: 'P16',
    title: '子 Agent',
    path: '/practice/p16-subagent/',
    projectTitle: '一个 Orchestrator + SubAgent 系统',
    summary: '把 worker 升级成真正有独立工具和循环的执行体，增强协作深度。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['Sub-Agent', 'Task Decomposition', 'Tool Loop', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解子 Agent 和普通 worker 的差别',
      '掌握带独立工具集和上下文的执行者建模方式',
      '为更复杂的协作和任务树调度打基础'
    ],
    prerequisites: ['建议先完成 P1、P15'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p15-multi-agent'],
    runCommand: 'bun run p16-subagent.ts',
    sourceFiles: ['practice/p16-subagent.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '子 Agent 的状态切换和工具边界更适合在本地完整观察。',
    completionSignals: [
      '子 Agent 会独立完成任务而不是只返回一次性文本',
      '你能看清 orchestrator 和 subagent 之间的数据契约',
      '你能解释它与 P15 的区别和新增复杂度'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism],
    nextProjectIds: ['practice-p17-agent-comm', 'practice-p22-project']
  },
  {
    projectId: 'practice-p17-agent-comm',
    order: 17,
    shortLabel: 'P17',
    title: 'Agent 通信与状态共享',
    path: '/practice/p17-agent-comm/',
    projectTitle: '一个多 Agent 协作写作系统',
    summary: '聚焦多个 Agent 之间如何传递信息、共享状态和做 handoff。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['Multi-Agent', 'Communication', 'Blackboard', 'Handoff', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '掌握共享黑板、消息传递和 handoff 的差异',
      '理解协作系统中状态共享为什么容易出错',
      '为综合项目里的多角色协作做准备'
    ],
    prerequisites: ['建议先完成 P15、P16'],
    prerequisiteProjectIds: ['practice-p15-multi-agent', 'practice-p16-subagent'],
    runCommand: 'bun run p17-agent-comm.ts',
    sourceFiles: ['practice/p17-agent-comm.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '协作日志较多，建议本地从消息和状态流向切入。',
    completionSignals: [
      '多个角色能围绕同一任务交换信息并共享部分状态',
      '你能说出三种通信模式分别适合什么场景',
      '你能解释为什么共享状态不是越多越好'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism],
    nextProjectIds: ['practice-p22-project', 'practice-p23-production']
  },
  {
    projectId: 'practice-p18-model-routing',
    order: 18,
    shortLabel: 'P18',
    title: '多模型路由',
    path: '/practice/p18-model-routing/',
    projectTitle: '一个按任务复杂度自动选择模型的 ModelRouter',
    summary: '开始从“能跑”进入“跑得划算”，把模型选择和成本约束纳入系统设计。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Model Routing', 'Cost Control', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '掌握按任务复杂度路由不同模型的基本思路',
      '理解 token、成本和可靠性之间的权衡',
      '为生产化章节的降级和观测打基础'
    ],
    prerequisites: ['建议先完成 P1'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent'],
    runCommand: 'bun run p18-model-routing.ts',
    sourceFiles: ['practice/p18-model-routing.ts'],
    supportsPlayground: true,
    runModeLabel: '在线/本地均可',
    runModeHint: '想先看路由决策结果时可在线试跑，调成本策略时再切本地。',
    completionSignals: [
      '不同类型任务会被路由到不同模型',
      '日志中能看到 token / cost / fallback 的变化',
      '你能说明什么时候省钱比“永远上大模型”更重要'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism, THEORY_LINKS.agentBasics],
    nextProjectIds: ['practice-p19-security', 'practice-p23-production']
  },
  {
    projectId: 'practice-p19-security',
    order: 19,
    shortLabel: 'P19',
    title: '安全与防注入',
    path: '/practice/p19-security/',
    projectTitle: '一个具备四层安全防线的文档处理 Agent',
    summary: '把安全从附加项提升为设计约束，开始面对 Agent 在真实环境中的攻击面。',
    difficulty: 'advanced',
    estimatedTime: '60 min',
    tags: ['Security', 'Prompt Injection', 'Sandboxing', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '理解输入清洗、权限隔离、输出验证的组合防线',
      '掌握 prompt injection 的基本防御思路',
      '为综合项目和生产部署建立安全底线'
    ],
    prerequisites: ['建议先完成 P1、P4'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p04-error-handling'],
    runCommand: 'bun run p19-security.ts',
    sourceFiles: ['practice/p19-security.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '安全策略需要看完整输入、工具权限和日志，不建议只看结果。',
    completionSignals: [
      '恶意输入不会直接驱动危险工具执行',
      '你能追踪到每层防线分别挡住了什么风险',
      '你能说明为什么安全不能只靠 system prompt'
    ],
    relatedTheory: [THEORY_LINKS.toolSystem, THEORY_LINKS.sessionManagement],
    nextProjectIds: ['practice-p20-observability', 'practice-p22-project']
  },
  {
    projectId: 'practice-p20-observability',
    order: 20,
    shortLabel: 'P20',
    title: '可观测性与调试',
    path: '/practice/p20-observability/',
    projectTitle: '一个具备结构化日志、分布式追踪和指标收集的可观测 Agent',
    summary: '让 Agent 从“会运行”变成“能被观察、能被诊断、能被追责”的系统。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Observability', 'Tracing', 'Debugging', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '掌握日志、trace、指标三个维度的分工',
      '理解为什么复杂 Agent 没有观测就几乎无法调试',
      '为评估和生产部署提供运行时基础'
    ],
    prerequisites: ['建议先完成 P1'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent'],
    runCommand: 'bun run p20-observability.ts',
    sourceFiles: ['practice/p20-observability.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: 'trace 树和结构化日志更适合本地完整观察。',
    completionSignals: [
      '输出中能看到清晰的 trace/span 结构',
      '关键步骤会产生结构化日志和指标摘要',
      '你能用观测信息定位一次异常链路'
    ],
    relatedTheory: [THEORY_LINKS.sessionManagement],
    nextProjectIds: ['practice-p21-evaluation', 'practice-p23-production']
  },
  {
    projectId: 'practice-p21-evaluation',
    order: 21,
    shortLabel: 'P21',
    title: '评估与基准测试',
    path: '/practice/p21-evaluation/',
    projectTitle: '一个完整的 Agent 评估框架',
    summary: '开始用成体系的方式判断 Agent 是否真的变好，而不是只凭感觉调系统。',
    difficulty: 'intermediate',
    estimatedTime: '45 min',
    tags: ['Evaluation', 'Benchmarking', 'LLM-as-Judge', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '掌握基准集、确定性校验和 LLM-as-Judge 的组合方式',
      '理解为什么没有评估就无法稳定迭代 Agent',
      '把 Reflection、观测和生产化连接到一起'
    ],
    prerequisites: ['建议先完成 P1、P12'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p12-reflection'],
    runCommand: 'bun run p21-evaluation.ts',
    sourceFiles: ['practice/p21-evaluation.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '评估需要多次运行和结果对比，本地更适合积累实验记录。',
    completionSignals: [
      '同一系统在不同配置下能得到结构化评估结果',
      '你能区分“看起来更好”和“可被证明更好”',
      '你能说明评估为何是上线前的必要环节'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism],
    nextProjectIds: ['practice-p22-project', 'practice-p23-production']
  },
  {
    projectId: 'practice-p22-project',
    order: 22,
    shortLabel: 'P22',
    title: '完整项目实战',
    path: '/practice/p22-project/',
    projectTitle: '一个生产级 Code Review Agent',
    summary: '把前面学过的工具、规划、多 Agent、安全和结构化输出收束成毕业设计。',
    difficulty: 'advanced',
    estimatedTime: '90 min',
    tags: ['Project', 'Code Review', 'Multi-Agent', 'TypeScript', 'OpenAI SDK'],
    learningGoals: [
      '把多 Agent、安全、结构化输出和聚合逻辑放进一个完整系统',
      '理解综合项目如何把多个局部能力编排成生产链路',
      '为最终生产化包装做好准备'
    ],
    prerequisites: ['建议先完成 P1、P10、P15、P19'],
    prerequisiteProjectIds: ['practice-p01-minimal-agent', 'practice-p10-react-loop', 'practice-p15-multi-agent', 'practice-p19-security'],
    runCommand: 'bun run p22-project.ts',
    sourceFiles: ['practice/p22-project.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '这是综合项目，建议本地完整走完解析、分派、聚合和报告输出。',
    completionSignals: [
      '完整流水线能从 diff 到最终审查报告跑通',
      '你能看懂各模块之间的数据合同和协作边界',
      '你能指出这个系统还缺哪些真实生产能力'
    ],
    relatedTheory: [THEORY_LINKS.planningMechanism, THEORY_LINKS.toolSystem],
    nextProjectIds: ['practice-p23-production']
  },
  {
    projectId: 'practice-p23-production',
    order: 23,
    shortLabel: 'P23',
    title: '生产部署清单',
    path: '/practice/p23-production/',
    projectTitle: '一个 ProductionAgent 包装器',
    summary: '用限流、熔断、超时、降级和健康检查把实验系统包成可上线形态。',
    difficulty: 'intermediate',
    estimatedTime: '30 min',
    tags: ['Production', 'Deployment', 'Checklist', 'TypeScript'],
    learningGoals: [
      '掌握限流、熔断、超时、降级、健康检查五类生产基建',
      '理解“跑通”和“上线可用”之间到底差了什么',
      '为你自己的 Agent 系统准备一份生产化清单'
    ],
    prerequisites: ['建议先完成 P18、P19、P20'],
    prerequisiteProjectIds: ['practice-p18-model-routing', 'practice-p19-security', 'practice-p20-observability'],
    runCommand: 'bun run p23-production.ts',
    sourceFiles: ['practice/p23-production.ts'],
    supportsPlayground: false,
    runModeLabel: '推荐本地运行',
    runModeHint: '生产特性依赖完整日志和健康检查输出，本地观察最直接。',
    completionSignals: [
      '限流、熔断、超时和健康检查都能看到对应日志或状态',
      '你能说明每一层生产防护分别解决什么问题',
      '你可以把这份清单迁移到自己的 Agent 项目里'
    ],
    relatedTheory: [THEORY_LINKS.sessionManagement, THEORY_LINKS.planningMechanism],
    nextProjectIds: []
  }
]

const phaseMetaByProjectId = Object.fromEntries(
  learningPathData.practicePhases.flatMap((phase) =>
    phase.projectIds.map((projectId) => [
      projectId,
      {
        phaseId: phase.phaseId,
        phaseOrder: phase.order,
        phaseTitle: phase.title,
        phaseSubtitle: phase.subtitle,
        phaseSummary: phase.summary
      }
    ])
  )
) as Record<string, Pick<PracticeProjectDefinition, 'phaseId' | 'phaseOrder' | 'phaseTitle' | 'phaseSubtitle' | 'phaseSummary'>>

export const practiceProjects: PracticeProjectDefinition[] = projectSeeds.map((project) => ({
  ...project,
  ...phaseMetaByProjectId[project.projectId]
}))

export const practiceProjectsById = Object.fromEntries(
  practiceProjects.map((project) => [project.projectId, project])
) as Record<string, PracticeProjectDefinition>

export const practiceProjectsByPath = Object.fromEntries(
  practiceProjects.map((project) => [project.path, project])
) as Record<string, PracticeProjectDefinition>

export const practiceRoutes: PracticeCourseRoute[] = [
  {
    routeId: 'ship-first',
    title: '先跑通第一个 Agent',
    audience: '适合已经会调模型，但还没有完整 Agent 手感的人',
    summary: '先拿到一个真实可运行的闭环，再逐步补多轮、错误处理和推理链。',
    recommendedProjectId: 'practice-p01-minimal-agent',
    supportingProjectIds: ['practice-p04-error-handling', 'practice-p10-react-loop'],
    milestones: [
      'P1 跑通工具调用闭环',
      'P4 给循环补上重试与失败收口',
      'P10 把黑盒决策升级成可见推理链'
    ]
  },
  {
    routeId: 'engineering-first',
    title: '先补工程化能力',
    audience: '适合已经做过 Demo，开始关心成本、安全、可观测性的人',
    summary: '跳过“只是能跑”，优先补齐模型路由、安全边界和运行时观测。',
    recommendedProjectId: 'practice-p18-model-routing',
    supportingProjectIds: ['practice-p19-security', 'practice-p20-observability', 'practice-p23-production'],
    milestones: [
      'P18 建立成本与路由判断',
      'P19 补上安全与权限边界',
      'P23 收口成可上线的生产清单'
    ]
  },
  {
    routeId: 'capstone-first',
    title: '先冲综合项目',
    audience: '适合目标很明确，想边做完整项目边回补前置的人',
    summary: '以 P22 为毕业设计目标，先确认最少前置，再回补多 Agent、推理和安全。',
    recommendedProjectId: 'practice-p22-project',
    supportingProjectIds: ['practice-p10-react-loop', 'practice-p15-multi-agent', 'practice-p19-security'],
    milestones: [
      '先确认 P22 需要的最少前置',
      '补齐 P10、P15、P19 三个关键支点',
      '回到 P22 做完整 Code Review Agent'
    ]
  }
]

export function getPracticeProjectById(projectId: string): PracticeProjectDefinition | null {
  return practiceProjectsById[projectId] ?? null
}

export function getPracticeProjectByPath(pathname: string): PracticeProjectDefinition | null {
  return practiceProjectsByPath[pathname] ?? null
}

export function getPracticeProjectsByIds(projectIds: string[]): PracticeProjectDefinition[] {
  return projectIds.flatMap((projectId) => {
    const project = getPracticeProjectById(projectId)
    return project ? [project] : []
  })
}

export function findPracticeProjectsByTheoryPath(theoryPath: string): PracticeProjectDefinition[] {
  return practiceProjects.filter((project) =>
    project.relatedTheory.some((link) => link.href === theoryPath)
  )
}
