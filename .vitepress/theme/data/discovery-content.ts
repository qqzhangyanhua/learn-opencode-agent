import {
  getContentTypeLabel,
  type ContentType,
  type DiscoveryGoalId
} from './content-meta'
import { learningPathById } from './learning-paths.data'
import { practiceProjectsById } from './practice-projects'

export interface DiscoveryContentLink {
  contentId: string
  href: string
  title: string
  contentType: ContentType
  contentTypeLabel: string
  summary: string
  roleDescription: string
  estimatedTime: string
  difficulty: string
  searchTags: string[]
}

export interface DiscoveryGoalRoute {
  goalId: DiscoveryGoalId
  title: string
  audience: string
  summary: string
  routeLabel: string
  recommendedStart: DiscoveryContentLink
  continueWith: DiscoveryContentLink[]
}

export interface DiscoveryTopicCollection {
  topicId: string
  title: string
  summary: string
  items: DiscoveryContentLink[]
}

const curatedContentById: Record<string, DiscoveryContentLink> = {
  'book-00-agent-intro': {
    contentId: 'book-00-agent-intro',
    href: '/00-what-is-ai-agent/',
    title: '什么是 AI Agent',
    contentType: 'theory',
    contentTypeLabel: getDiscoveryContentTypeLabel('theory'),
    summary: '先建立 Agent、模型、工具和环境之间的最小概念框架。',
    roleDescription: '适合第一次系统理解 Agent 边界时作为起点。',
    estimatedTime: '15 min',
    difficulty: 'beginner',
    searchTags: ['Agent', '入门', '概念框架']
  },
  'book-01-agent-basics': {
    contentId: 'book-01-agent-basics',
    href: '/01-agent-basics/',
    title: 'Agent 基础架构',
    contentType: 'theory',
    contentTypeLabel: getDiscoveryContentTypeLabel('theory'),
    summary: '把模型、工具、记忆、规划和执行循环拆成清晰职责边界。',
    roleDescription: '适合需要先补系统结构感的开发者。',
    estimatedTime: '25 min',
    difficulty: 'beginner',
    searchTags: ['架构', 'Agent 基础', '系统设计']
  },
  'book-03-tool-system': {
    contentId: 'book-03-tool-system',
    href: '/03-tool-system/',
    title: '工具系统',
    contentType: 'theory',
    contentTypeLabel: getDiscoveryContentTypeLabel('theory'),
    summary: '理解模型为什么能行动，以及工具调用如何在工程上落地。',
    roleDescription: '适合补工具边界、权限和协议思维。',
    estimatedTime: '35 min',
    difficulty: 'intermediate',
    searchTags: ['Tool Calling', '工具系统', '函数调用']
  },
  'book-04-session-management': {
    contentId: 'book-04-session-management',
    href: '/04-session-management/',
    title: '会话管理',
    contentType: 'theory',
    contentTypeLabel: getDiscoveryContentTypeLabel('theory'),
    summary: '把消息流、上下文管理和执行循环串成完整主链路。',
    roleDescription: '适合补多轮对话、上下文预算和状态收口。',
    estimatedTime: '35 min',
    difficulty: 'intermediate',
    searchTags: ['Session', '上下文', '会话管理']
  },
  'intermediate-27-planning-mechanism': {
    contentId: 'intermediate-27-planning-mechanism',
    href: '/intermediate/27-planning-mechanism/',
    title: 'Planning 机制',
    contentType: 'intermediate',
    contentTypeLabel: getDiscoveryContentTypeLabel('intermediate'),
    summary: '理解复杂任务为什么需要计划、重规划和任务树。',
    roleDescription: '适合开始处理复杂 Agent 工程问题时阅读。',
    estimatedTime: '30 min',
    difficulty: 'intermediate',
    searchTags: ['Planning', '任务分解', '重规划']
  },
  'intermediate-25-rag-failure-patterns': {
    contentId: 'intermediate-25-rag-failure-patterns',
    href: '/intermediate/25-rag-failure-patterns/',
    title: 'RAG 为什么总是答不准',
    contentType: 'intermediate',
    contentTypeLabel: getDiscoveryContentTypeLabel('intermediate'),
    summary: '把 RAG 的常见失败模式和排查思路讲透。',
    roleDescription: '适合开始把检索系统推向真实应用时阅读。',
    estimatedTime: '25 min',
    difficulty: 'intermediate',
    searchTags: ['RAG', '检索', '失败模式']
  }
}

for (const project of Object.values(practiceProjectsById)) {
  curatedContentById[project.projectId] = {
    contentId: project.projectId,
    href: project.path,
    title: project.shortLabel ? `${project.shortLabel}：${project.title}` : project.title,
    contentType: 'practice',
    contentTypeLabel: getDiscoveryContentTypeLabel('practice'),
    summary: project.summary,
    roleDescription: project.phaseSummary,
    estimatedTime: project.estimatedTime,
    difficulty: project.difficulty,
    searchTags: project.tags
  }
}

function resolveContentLink(contentId: string): DiscoveryContentLink {
  const content = curatedContentById[contentId]

  if (!content) {
    throw new Error(`未找到 discovery 内容 ${contentId}`)
  }

  return content
}

export function getDiscoveryContentTypeLabel(contentType: ContentType): string {
  return getContentTypeLabel(contentType)
}

export const discoveryGoalRoutes: DiscoveryGoalRoute[] = [
  {
    goalId: 'system-learn',
    title: '系统入门 AI Agent',
    audience: '适合已经会调用模型，但还没有把 Agent 主链路系统串起来的开发者',
    summary: '先建立统一概念框架，再进入第一个最小可运行项目，避免只会抄代码却不知道为什么这样设计。',
    routeLabel: learningPathById['theory-first'].title,
    recommendedStart: resolveContentLink('book-00-agent-intro'),
    continueWith: [
      resolveContentLink('book-03-tool-system'),
      resolveContentLink('book-04-session-management'),
      resolveContentLink('practice-p01-minimal-agent')
    ]
  },
  {
    goalId: 'engineering-upgrade',
    title: '补齐工程化能力',
    audience: '适合已经做过基础 Demo，开始关心工具边界、上下文、规划和生产约束的开发者',
    summary: '从关键理论与工程专题切入，优先补系统判断，而不是继续堆更多零散技巧。',
    routeLabel: learningPathById['engineering-depth'].title,
    recommendedStart: resolveContentLink('book-01-agent-basics'),
    continueWith: [
      resolveContentLink('book-03-tool-system'),
      resolveContentLink('intermediate-27-planning-mechanism'),
      resolveContentLink('practice-p18-model-routing')
    ]
  },
  {
    goalId: 'build-by-project',
    title: '边学边做项目',
    audience: '适合希望先抄作业、先跑通一个项目，再回头补原理的开发者',
    summary: '先拿到可运行反馈，再按需要回补理论与中级专题，始终保持动手驱动。',
    routeLabel: learningPathById['practice-first'].title,
    recommendedStart: resolveContentLink('practice-p01-minimal-agent'),
    continueWith: [
      resolveContentLink('practice-p10-react-loop'),
      resolveContentLink('practice-p22-project'),
      resolveContentLink('intermediate-27-planning-mechanism')
    ]
  }
]

export const discoveryTopicCollections: DiscoveryTopicCollection[] = [
  {
    topicId: 'tool-system',
    title: '工具调用与执行循环',
    summary: '从“模型为什么能行动”一路串到最小 Agent 闭环与显式推理链。',
    items: [
      resolveContentLink('book-03-tool-system'),
      resolveContentLink('practice-p01-minimal-agent'),
      resolveContentLink('practice-p10-react-loop')
    ]
  },
  {
    topicId: 'session-memory',
    title: '会话、上下文与记忆',
    summary: '把多轮对话、上下文压缩和记忆检索作为同一类工程问题理解。',
    items: [
      resolveContentLink('book-04-session-management'),
      resolveContentLink('practice-p02-multi-turn'),
      resolveContentLink('practice-p05-memory-arch'),
      resolveContentLink('practice-p07-rag-basics')
    ]
  },
  {
    topicId: 'planning',
    title: '规划、反思与多 Agent',
    summary: '从单步循环升级到任务拆解、重规划和多角色协作。',
    items: [
      resolveContentLink('intermediate-27-planning-mechanism'),
      resolveContentLink('practice-p11-planning'),
      resolveContentLink('practice-p12-reflection'),
      resolveContentLink('practice-p15-multi-agent')
    ]
  }
]
