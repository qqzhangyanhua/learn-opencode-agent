export const PRACTICE_PLAYGROUND_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const
export const PRACTICE_PLAYGROUND_RUNNER_TYPES = [
  'tool-call',
  'multi-turn',
  'streaming',
  'react-lite',
  'model-routing',
] as const
export const PRACTICE_PLAYGROUND_IMPLEMENTATION_STATUSES = ['ready', 'coming-soon'] as const

type PracticePlaygroundDifficulty = (typeof PRACTICE_PLAYGROUND_DIFFICULTIES)[number]
type PracticePlaygroundRunnerType = (typeof PRACTICE_PLAYGROUND_RUNNER_TYPES)[number]
type PracticePlaygroundImplementationStatus =
  (typeof PRACTICE_PLAYGROUND_IMPLEMENTATION_STATUSES)[number]

export const PRACTICE_PLAYGROUND_CHAPTERS = [
  {
    id: 'p01-minimal-agent',
    number: 'P1',
    title: '最小 Agent',
    summary: '从一次最小请求开始，建立工具调用的基本心智。',
    difficulty: 'beginner',
    articleHref: '/practice/p01-minimal-agent/',
    runner: 'tool-call',
    playground: {
      status: 'ready',
      description: '使用预置天气问题演示最小工具调用闭环：首次请求、工具执行、二次整合。',
      prompt: '北京今天天气怎么样？适合出去跑步吗？',
      mode: '单次请求 + 本地工具调用',
      outputMode: '显示最终整合回答',
      tools: ['get_weather'],
      highlights: ['先让模型决定是否调用工具', '本地执行天气工具后再发起第二次请求'],
    },
  },
  {
    id: 'p02-multi-turn',
    number: 'P2',
    title: '多轮对话',
    summary: '理解上下文累积，掌握多轮消息管理的核心路径。',
    difficulty: 'beginner',
    articleHref: '/practice/p02-multi-turn/',
    runner: 'multi-turn',
    playground: {
      status: 'ready',
      description: '内置一段 messages 历史，让你直接观察“继续追问”如何被已有上下文约束。',
      prompt: '把刚才的平均值函数改成支持加权平均，并保留口语化解释风格。',
      mode: '预置多轮 messages 历史',
      outputMode: '仅显示多轮上下文后的最终回答',
      tools: [],
      highlights: ['历史里已包含 system、user、assistant 三类消息', '不触发工具调用，重点看上下文累积'],
    },
  },
  {
    id: 'p03-streaming',
    number: 'P3',
    title: '流式输出',
    summary: '观察 token 逐步返回过程，体验流式响应的反馈节奏。',
    difficulty: 'beginner',
    articleHref: '/practice/p03-streaming/',
    runner: 'streaming',
    playground: {
      status: 'ready',
      description: '使用浏览器直连流式响应，结果区会随着文本 delta 逐步增长。',
      prompt: '请分段解释为什么流式输出更适合交互式界面。',
      mode: '浏览器 SSE 文本流式解析',
      outputMode: '文本增量逐步追加到输出区',
      tools: [],
      highlights: ['只演示文本流式，不引入完整工具流', '若流中断，会保留已收到内容并写入调试信息'],
    },
  },
  {
    id: 'p10-react-loop',
    number: 'P10',
    title: 'ReAct Loop',
    summary: '通过思考-行动循环，理解规划与工具协作机制。',
    difficulty: 'intermediate',
    articleHref: '/practice/p10-react-loop/',
    runner: 'react-lite',
    playground: {
      status: 'ready',
      description: '使用教学型简化 ReAct 链路，让你在调试区看到 Thought、Action、Observation 的关键步骤。',
      prompt: '北京和上海今天哪个城市更适合户外跑步？请说明依据。',
      mode: '文本格式 ReAct 教学链路',
      outputMode: '最终回答单独输出，关键推理步骤写入调试区',
      tools: ['get_weather', 'search_web', 'calculate'],
      highlights: ['最多循环 3 次，避免无限思考', '工具只保留最小集合，重点是看链路而不是完整 CLI 仿真'],
    },
  },
  {
    id: 'p18-model-routing',
    number: 'P18',
    title: '多模型路由与成本控制',
    summary: '在效果和成本之间做模型分流，形成可落地策略。',
    difficulty: 'intermediate',
    articleHref: '/practice/p18-model-routing/',
    runner: 'model-routing',
    playground: {
      status: 'ready',
      description: '先做轻量启发式路由判断，再用你当前配置的 model 发起实际请求，重点看“为什么这样选”。',
      prompt: '请比较 ReAct 和普通工具调用在可观测性、实现复杂度、成本上的差异，并给出落地建议。',
      mode: '启发式模型路由演示',
      outputMode: '调试区展示路由理由，回答仍由当前配置模型生成',
      tools: [],
      highlights: ['路由候选是 mini / standard / large', '不会真的切换模型池，实际请求继续使用当前配置模型'],
    },
  },
] as const satisfies readonly {
  id: string
  number: string
  title: string
  summary: string
  difficulty: PracticePlaygroundDifficulty
  articleHref: string
  runner: PracticePlaygroundRunnerType
  playground: {
    status: PracticePlaygroundImplementationStatus
    description: string
    prompt: string
    mode: string
    outputMode: string
    tools: readonly string[]
    highlights: readonly string[]
  }
}[]

type PracticePlaygroundChapterId = (typeof PRACTICE_PLAYGROUND_CHAPTERS)[number]['id']
type PracticePlaygroundChapter = (typeof PRACTICE_PLAYGROUND_CHAPTERS)[number]

export const DEFAULT_PRACTICE_PLAYGROUND_CHAPTER_ID: PracticePlaygroundChapterId = 'p01-minimal-agent'

export function isPracticePlaygroundChapterId(value: string): value is PracticePlaygroundChapterId {
  return PRACTICE_PLAYGROUND_CHAPTERS.some((chapter) => chapter.id === value)
}

export function getPracticePlaygroundChapterById(id: PracticePlaygroundChapterId): PracticePlaygroundChapter {
  const chapter = PRACTICE_PLAYGROUND_CHAPTERS.find((item) => item.id === id)
  if (chapter) return chapter
  return PRACTICE_PLAYGROUND_CHAPTERS[0]
}
