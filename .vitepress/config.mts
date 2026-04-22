import { withMermaid } from 'vitepress-plugin-mermaid'
import { defineConfig } from 'vitepress'
import {
  getContentTypeLabel,
  getEntryModeLabel,
  normalizeLearningFrontmatter
} from './theme/data/content-meta'

const siteTitle = '从零理解如何构建 AI Agent'
const siteDescription = 'OpenCode 源码剖析与实战'
const bookRepository = 'https://github.com/qqzhangyanhua/learn-opencode-agent'
const sourceCommit = 'f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc'
const sourceRepository = `https://github.com/anomalyco/opencode/tree/${sourceCommit}`
const sourceRepositoryLatest = 'https://github.com/anomalyco/opencode/tree/dev'

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function parseInlineArray(value: string): string[] {
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '').trim()
  if (!inner) {
    return []
  }

  return inner
    .split(',')
    .map((item) => stripWrappingQuotes(item.trim()))
    .filter(Boolean)
}

function extractFrontmatterBlock(src: string): string[] | null {
  if (!src.startsWith('---')) {
    return null
  }

  const lines = src.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return null
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === '---') {
      return lines.slice(1, index)
    }
  }

  return null
}

function parseFrontmatter(src: string): Record<string, unknown> {
  const lines = extractFrontmatterBlock(src)
  if (!lines) {
    return {}
  }

  const frontmatter: Record<string, unknown> = {}
  let currentArrayKey: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ')

    if (!line.trim() || line.trim().startsWith('#')) {
      continue
    }

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/)
    if (arrayItemMatch && currentArrayKey) {
      const currentValue = Array.isArray(frontmatter[currentArrayKey])
        ? frontmatter[currentArrayKey] as string[]
        : []
      currentValue.push(stripWrappingQuotes(arrayItemMatch[1].trim()))
      frontmatter[currentArrayKey] = currentValue
      continue
    }

    const fieldMatch = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/)
    if (!fieldMatch) {
      currentArrayKey = null
      continue
    }

    const [, key, rawValue = ''] = fieldMatch
    const value = rawValue.trim()

    if (!value) {
      frontmatter[key] = []
      currentArrayKey = key
      continue
    }

    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = parseInlineArray(value)
      currentArrayKey = null
      continue
    }

    frontmatter[key] = stripWrappingQuotes(value)
    currentArrayKey = null
  }

  return frontmatter
}

function buildSearchPrelude(src: string): string {
  const frontmatter = normalizeLearningFrontmatter(parseFrontmatter(src))
  if (!frontmatter.contentId) {
    return src
  }

  const searchPrelude = [
    '## 学习定位',
    `- 内容类型：${getContentTypeLabel(frontmatter.contentType)}`,
    `- 导航名称：${frontmatter.navigationLabel || frontmatter.shortTitle}`,
    `- 进入方式：${getEntryModeLabel(frontmatter.entryMode)}`,
    frontmatter.roleDescription ? `- 适合场景：${frontmatter.roleDescription}` : '',
    frontmatter.summary ? `- 摘要：${frontmatter.summary}` : '',
    frontmatter.searchTags.length ? `- 主题标签：${frontmatter.searchTags.join(' / ')}` : '',
    frontmatter.learningGoals.length ? `- 你会学到：${frontmatter.learningGoals.join('；')}` : ''
  ].filter(Boolean).join('\n')

  return `${searchPrelude}\n\n${src}`
}

export default withMermaid(defineConfig({
  srcDir: 'docs',
  title: siteTitle,
  description: siteDescription,
  lang: 'zh-CN',
  lastUpdated: true,
  ignoreDeadLinks: [
    /\/docs\//,
    /\/plugins\//,
    /\/scripts\//,
    /\/\.github\//,
    /\/\.devcontainer\//,
    /^\/CLAUDE$/,
    /restored-src/,
  ],
  transformPageData(pageData) {
    const pageTitle = pageData.frontmatter.layout === 'home'
      ? siteTitle
      : pageData.title
        ? `${pageData.title} | ${siteTitle}`
        : siteTitle
    const pageDescription = typeof pageData.description === 'string' && pageData.description
      ? pageData.description
      : siteDescription

    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['meta', { property: 'og:title', content: pageTitle }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:locale', content: 'zh_CN' }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
      ['meta', { name: 'twitter:title', content: pageTitle }],
      ['meta', { name: 'twitter:description', content: pageDescription }]
    )
  },

  vite: {
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          target: 'ES2022'
        }
      }
    },
    optimizeDeps: {
      include: ['mermaid', 'dayjs'],
      esbuildOptions: {
        tsconfigRaw: {
          compilerOptions: {
            target: 'ES2022'
          }
        }
      }
    },
    ssr: {
      noExternal: ['mermaid']
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        onwarn(warning, warn) {
          // lottie-web uses eval internally; suppress the known false positive
          if (warning.code === 'EVAL' && warning.id?.includes('lottie')) return
          warn(warning)
        }
      }
    }
  },

  themeConfig: {
    nav: [
      { text: '实践篇', link: '/practice/', activeMatch: '/practice/' },
      { text: '中级篇', link: '/intermediate/', activeMatch: '/intermediate/' },
      { text: '面试题专区', link: '/interview/', activeMatch: '/interview/' },
      {
        text: '专栏',
        items: [
          { text: 'Claude Code 架构思维', link: '/claude-code/' },
          { text: 'Claude Code 源码业务流', link: '/new-claude/' },
          { text: 'Hermes Agent 拆解', link: '/hermes-agent/' },
        ],
      },
      { text: '本书仓库', link: bookRepository },
    ],

    sidebar: {
      '/claude-code/': [
        { text: '← 返回首页', link: '/' },
        { text: '课程介绍', link: '/claude-code/' },
        { text: '阅读指南', link: '/claude-code/reading-guide' },
        {
          text: '第一部分：先把 Agent 这件事想明白',
          collapsed: false,
          items: [
            { text: '第1章：Agent 到底是什么，不是什么', link: '/claude-code/chapter01' },
            { text: '第2章：Agent 的最小组成单元', link: '/claude-code/chapter02' },
            { text: '第3章：从一次请求看懂 Agent 的闭环', link: '/claude-code/chapter03' },
          ]
        },
        {
          text: '第二部分：把运行时主链路拆开',
          collapsed: false,
          items: [
            { text: '第4章：模型在 Agent 里到底负责什么', link: '/claude-code/chapter04' },
            { text: '第5章：工具不是外挂，而是 Agent 的手和脚', link: '/claude-code/chapter05' },
            { text: '第6章：记忆、状态与上下文，不是一个东西', link: '/claude-code/chapter06' },
            { text: '第7章：上下文为什么总会失控', link: '/claude-code/chapter07' },
            { text: '第8章：规划不是写给人看的漂亮计划', link: '/claude-code/chapter08' },
            { text: '第9章：什么时候该停，什么时候该问人', link: '/claude-code/chapter09' },
          ]
        },
        {
          text: '第三部分：从单 Agent 走向更复杂系统',
          collapsed: false,
          items: [
            { text: '第10章：什么时候真的需要多 Agent', link: '/claude-code/chapter10' },
            { text: '第11章：为什么 Agent 需要一层协议来接外部世界', link: '/claude-code/chapter11' },
            { text: '第12章：配置不是参数堆，而是运行时控制面', link: '/claude-code/chapter12' },
            { text: '第13章：为什么 Agent 一旦产品化，迟早会走向服务化', link: '/claude-code/chapter13' },
            { text: '第14章：持久化不是顺手存一下，而是让 Agent 真正拥有长期状态', link: '/claude-code/chapter14' },
            { text: '第15章：交互承载层不是界面皮肤，而是 Agent 的协作表面', link: '/claude-code/chapter15' },
          ]
        },
        {
          text: '第四部分：从应用走向平台',
          collapsed: false,
          items: [
            { text: '第16章：什么时候一个 Agent 应用开始平台化', link: '/claude-code/chapter16' },
            { text: '第17章：扩展点不是一堆名词，而是平台的能力接口', link: '/claude-code/chapter17' },
            { text: '第18章：多 Agent 一旦落地，真正难的是编排而不是数量', link: '/claude-code/chapter18' },
          ]
        },
        {
          text: '第五部分：工程化闭环与全书收束',
          collapsed: false,
          items: [
            { text: '第19章：一个 Agent 系统怎样才算真的能长期活着', link: '/claude-code/chapter19' },
            { text: '第20章：把整本书收束成一个判断框架', link: '/claude-code/chapter20' },
          ]
        },
      ],
      '/hermes-agent/': [
        { text: '← 返回首页', link: '/' },
        { text: '课程介绍', link: '/hermes-agent/' },
        {
          text: '概念准备',
          collapsed: false,
          items: [
            { text: '第1章：先别急着看代码：你到底在学什么是 Agent', link: '/hermes-agent/00-先别急着看代码-你到底在学什么是Agent' },
            { text: '第2章：5 分钟看懂 Hermes Agent', link: '/hermes-agent/01-5分钟看懂Hermes-Agent-先建立全局地图' },
          ]
        },
        {
          text: '核心机制',
          collapsed: false,
          items: [
            { text: '第3章：拆开 run_agent 看执行闭环', link: '/hermes-agent/02-Hermes-Agent-是怎么跑起来的-拆开run_agent看执行闭环' },
            { text: '第4章：工具系统', link: '/hermes-agent/03-工具系统-为什么说Tool-Use才是Agent工程的地基' },
            { text: '第5章：记忆系统', link: '/hermes-agent/04-记忆系统-Hermes为什么不是每次都失忆的Agent' },
            { text: '第6章：SessionDB 与会话系统', link: '/hermes-agent/05-SessionDB与会话系统-Hermes如何拥有跨会话连续性' },
          ]
        },
        {
          text: '系统扩展',
          collapsed: false,
          items: [
            { text: '第7章：CLI 与 Gateway', link: '/hermes-agent/06-CLI与Gateway-为什么一个好Agent不能只活在终端里' },
            { text: '第8章：Skills 技能体系', link: '/hermes-agent/07-Skills-Hermes最像会成长的Agent的地方' },
            { text: '第9章：子 Agent 与并行执行', link: '/hermes-agent/08-子Agent与并行执行-Hermes如何把复杂任务拆开做' },
            { text: '第10章：Cron 后台任务与自动化', link: '/hermes-agent/09-Cron后台任务与自动化-从会聊天到会持续工作' },
          ]
        },
        {
          text: '工程落地',
          collapsed: false,
          items: [
            { text: '第11章：安全约束与工程现实', link: '/hermes-agent/10-安全约束与工程现实-为什么真正能用的Agent必须麻烦一点' },
            { text: '第12章：自己做 Agent 先抄哪几层', link: '/hermes-agent/11-如果你也想做一个自己的Agent-应该先抄Hermes的哪几层' },
          ]
        },
        {
          text: '附录：Prompt 与上下文',
          collapsed: true,
          items: [
            { text: '附录 A：上下文压缩与 Prompt 稳定性', link: '/hermes-agent/附录A-上下文压缩与Prompt稳定性-为什么Agent不是上下文越长越好' },
            { text: '附录 B：Prompt Builder 专章', link: '/hermes-agent/附录B-Prompt-Builder专章-系统提示词为什么在Hermes里是一条装配流水线' },
            { text: '附录 L：Context Compression 后状态恢复', link: '/hermes-agent/附录L-Context-Compression后状态恢复专章-Hermes为什么压缩上下文不等于删历史' },
            { text: '附录 V：Ephemeral System Prompt', link: '/hermes-agent/附录V-Ephemeral-System-Prompt专章-Hermes为什么自己保留临时system通道却不把它当长期前缀' },
            { text: '附录 W：多层上下文装配顺序', link: '/hermes-agent/附录W-多层上下文装配顺序专章-Hermes一次API调用前到底按什么顺序拼上下文' },
            { text: '附录 X：Prompt Cache', link: '/hermes-agent/附录X-Prompt-Cache专章-Hermes为什么很多边界设计最后都指向前缀稳定' },
            { text: '附录 Y：Trajectory 与 Prompt 边界', link: '/hermes-agent/附录Y-Trajectory与Prompt边界专章-Hermes为什么有些上下文给模型看却故意不入轨迹' },
          ]
        },
        {
          text: '附录：工具与能力层',
          collapsed: true,
          items: [
            { text: '附录 E：Terminal 工具与执行环境', link: '/hermes-agent/附录E-Terminal工具与执行环境-Hermes为什么不直接subprocess-run' },
            { text: '附录 F：Code Execution 与 Terminal 的边界', link: '/hermes-agent/附录F-Code-Execution与Terminal的边界-Hermes为什么同时保留两套执行能力' },
            { text: '附录 I：Tool / Toolset / Skill 的边界', link: '/hermes-agent/附录I-Tool与Toolset和Skill的边界-Hermes为什么要把能力拆成三层' },
            { text: '附录 K：Agent Loop 接管工具', link: '/hermes-agent/附录K-Agent-Loop接管工具专章-Hermes为什么有些工具不能走普通Registry-Dispatch' },
            { text: '附录 AD：Tool Registry 与插件注册', link: '/hermes-agent/附录AD-Tool-Registry与插件注册专章-Hermes为什么工具系统不是一堆if-else而是一条统一注册总线' },
            { text: '附录 AE：Skills Prompt 生成', link: '/hermes-agent/附录AE-Skills-Prompt生成专章-Hermes为什么系统提示词里的技能索引要跟着当前可用tools和toolsets动态变化' },
          ]
        },
        {
          text: '附录：记忆与会话',
          collapsed: true,
          items: [
            { text: '附录 J：Memory / Skill / Session Search 的边界', link: '/hermes-agent/附录J-Memory与Skill和Session-Search的边界-Hermes怎么区分事实记忆历史检索和流程沉淀' },
            { text: '附录 N：会话持久化边界', link: '/hermes-agent/附录N-会话持久化边界专章-Hermes为什么SessionDB-Gateway-Transcript-ACP-Session和API-Responses-Store不是一回事' },
            { text: '附录 O：Session Search', link: '/hermes-agent/附录O-Session-Search专章-Hermes为什么查的是正式会话账本而不是当前Transcript或Memory' },
            { text: '附录 P：Session Lineage', link: '/hermes-agent/附录P-Resume-Branch-Compression的Session-Lineage专章-Hermes怎么把一段对话长成一棵会话树' },
            { text: '附录 Q：Tool Call 持久化', link: '/hermes-agent/附录Q-Tool-Call持久化专章-Hermes为什么不只存最终回答而要存消息-工具调用-工具结果-推理痕迹' },
            { text: '附录 S：Memory Flush', link: '/hermes-agent/附录S-Memory-Flush专章-Hermes为什么记忆沉淀不是每轮顺手改system-prompt' },
            { text: '附录 T：Prefetch Recall', link: '/hermes-agent/附录T-Prefetch-Recall专章-Hermes为什么把外部记忆召回做成API-call-time临时注入而不是并回system-prompt' },
          ]
        },
        {
          text: '附录：运行时与执行',
          collapsed: true,
          items: [
            { text: '附录 C：测试一个 Agent Runtime', link: '/hermes-agent/附录C-测试一个Agent-Runtime-Hermes为什么不是只靠Demo验证' },
            { text: '附录 D：模型切换与 Provider Fallback', link: '/hermes-agent/附录D-模型切换与Provider-Fallback-Hermes怎么把模型差异变成运行时策略' },
            { text: '附录 M：多入口同一 Runtime', link: '/hermes-agent/附录M-多入口同一Runtime专章-Hermes为什么CLI-Gateway-ACP和API-Server共用一颗Agent内核' },
            { text: '附录 R：Auxiliary Model', link: '/hermes-agent/附录R-Auxiliary-Model专章-Hermes为什么不让主模型包办摘要压缩视觉和副任务' },
            { text: '附录 AA：Interrupt 与 Queue', link: '/hermes-agent/附录AA-Interrupt与Queue专章-Hermes为什么消息平台里的新消息不能直接塞进正在运行的Agent回合' },
            { text: '附录 AB：Activity 与 Inactivity Timeout', link: '/hermes-agent/附录AB-Activity与Inactivity-Timeout专章-Hermes为什么不是给Agent一个固定超时而是盯住它是否还在推进' },
          ]
        },
        {
          text: '附录：扩展与接入',
          collapsed: true,
          items: [
            { text: '附录 G：Gateway 会话注入', link: '/hermes-agent/附录G-Gateway会话注入专章-Hermes怎么把消息来源变成运行时上下文' },
            { text: '附录 H：Skills 运行时', link: '/hermes-agent/附录H-Skills运行时专章-Hermes为什么不把技能直接塞进system-prompt' },
            { text: '附录 U：Plugin Hook 注入边界', link: '/hermes-agent/附录U-Plugin-Hook注入边界专章-Hermes为什么不开放system-prompt给插件随便改' },
            { text: '附录 AC：Skill 与 Plugin 加载', link: '/hermes-agent/附录AC-Skill与Plugin加载专章-Hermes怎么把可扩展能力接进运行时而不是简单读目录拼提示词' },
            { text: '附录 Z：Gateway Agent Cache', link: '/hermes-agent/附录Z-Gateway-Agent-Cache专章-Hermes为什么在消息平台里宁可缓存整颗AIAgent也不愿每条消息重建一次运行时' },
          ]
        },
      ],
      '/new-claude/': [
        { text: '← 返回首页', link: '/' },
        { text: '课程介绍', link: '/new-claude/' },
        { text: '阅读指南', link: '/new-claude/00-阅读指南' },
        { text: '系统全景与学习路线', link: '/new-claude/01-系统全景与学习路线' },
        {
          text: 'Part 1：主业务流',
          collapsed: false,
          items: [
            { text: '01 CLI 启动与入口分流', link: '/new-claude/part-1-主业务流/01-CLI-启动与入口分流' },
            { text: '02 初始化、配置、环境、遥测', link: '/new-claude/part-1-主业务流/02-初始化-配置-环境-遥测' },
            { text: '03 会话上下文与消息模型', link: '/new-claude/part-1-主业务流/03-会话上下文与消息模型' },
            { text: '04 query：主循环如何驱动整个系统', link: '/new-claude/part-1-主业务流/04-query-主循环如何驱动整个系统' },
            { text: '05 tool：编排、执行、权限、结果回填', link: '/new-claude/part-1-主业务流/05-tool-编排-执行-权限-结果回填' },
            { text: '06 输出渲染、Stop Hooks、任务摘要、请求收尾', link: '/new-claude/part-1-主业务流/06-输出渲染-stop-hooks-任务摘要-请求收尾' },
          ]
        },
        {
          text: 'Part 2：扩展能力流',
          collapsed: false,
          items: [
            { text: '07 MCP：如何把外部能力接进来', link: '/new-claude/part-2-扩展能力流/07-MCP-如何把外部能力接进来' },
            { text: '08 Skills：如何把方法论接进主流程', link: '/new-claude/part-2-扩展能力流/08-Skills-如何把方法论接进主流程' },
            { text: '09 Plugins / Hooks：如何做能力扩展', link: '/new-claude/part-2-扩展能力流/09-Plugins-Hooks-如何做能力扩展' },
            { text: '10 权限、策略、安全边界', link: '/new-claude/part-2-扩展能力流/10-权限-策略-安全边界' },
          ]
        },
        {
          text: 'Part 3：远程协同流',
          collapsed: false,
          items: [
            { text: '11 Bridge：远程控制主链路', link: '/new-claude/part-3-远程协同流/11-Bridge-远程控制主链路' },
            { text: '12 Remote Session：会话接管与连接管理', link: '/new-claude/part-3-远程协同流/12-Remote-Session-与连接管理' },
            { text: '13 后台会话与并发托管', link: '/new-claude/part-3-远程协同流/13-后台会话与并发托管' },
            { text: '14 多代理、子任务与协同机制', link: '/new-claude/part-3-远程协同流/14-多代理-子任务-协同机制' },
          ]
        },
        {
          text: 'Part 4：附录',
          collapsed: false,
          items: [
            { text: '90 源码地图：按目录反查系统能力', link: '/new-claude/part-4-附录/90-源码地图-按目录反查系统能力' },
            { text: '91 核心文件索引', link: '/new-claude/part-4-附录/91-核心文件索引' },
            { text: '92 关键类型与核心抽象', link: '/new-claude/part-4-附录/92-关键类型与核心抽象' },
            { text: '99 每章练习题与复刻建议', link: '/new-claude/part-4-附录/99-每章练习题与复刻建议' },
          ]
        },
      ],
      '/practice/': [
        { text: '← 返回首页', link: '/' },
        { text: '课程介绍', link: '/practice/' },
        { text: '从 P1 开始', link: '/practice/p01-minimal-agent/' },
        { text: '下一步去中级篇', link: '/intermediate/' },
        { text: '开始前先看', link: '/practice/setup' },
        {
          text: 'Phase 1 — Agent 基础',
          collapsed: false,
          items: [
            { text: 'P1：最小 Agent — 工具调用核心机制', link: '/practice/p01-minimal-agent/' },
            { text: 'P2：多轮对话与上下文管理', link: '/practice/p02-multi-turn/' },
            { text: 'P3：流式输出与实时反馈', link: '/practice/p03-streaming/' },
            { text: 'P4：错误处理与重试策略', link: '/practice/p04-error-handling/' },
            { text: '补充：Prompt Engineering 基础', link: '/practice/p24-prompt-engineering/' },
            { text: '补充：长上下文管理', link: '/practice/p25-long-context/' },
            { text: '补充：结构化输出', link: '/practice/p26-structured-output/' },
          ]
        },
        {
          text: 'Phase 2 — 记忆与知识系统',
          collapsed: false,
          items: [
            { text: 'P5：记忆系统架构', link: '/practice/p05-memory-arch/' },
            { text: 'P6：记忆增强检索', link: '/practice/p06-memory-retrieval/' },
            { text: 'P7：RAG 基础', link: '/practice/p07-rag-basics/' },
            { text: 'P8：GraphRAG', link: '/practice/p08-graphrag/' },
            { text: 'P9：混合检索策略', link: '/practice/p09-hybrid-retrieval/' },
          ]
        },
        {
          text: 'Phase 3 — 推理与规划',
          collapsed: false,
          items: [
            { text: 'P10：ReAct Loop 实现', link: '/practice/p10-react-loop/' },
            { text: 'P11：Planning 机制', link: '/practice/p11-planning/' },
            { text: 'P12：Reflection 模式', link: '/practice/p12-reflection/' },
          ]
        },
        {
          text: 'Phase 4 — 感知扩展',
          collapsed: false,
          items: [
            { text: 'P13：多模态智能体', link: '/practice/p13-multimodal/' },
            { text: 'P14：MCP 协议接入', link: '/practice/p14-mcp/' },
            { text: '补充：代码执行 Agent', link: '/practice/p27-code-execution/' },
          ]
        },
        {
          text: 'Phase 5 — 多 Agent 协作',
          collapsed: false,
          items: [
            { text: 'P15：多 Agent 编排模式', link: '/practice/p15-multi-agent/' },
            { text: 'P16：子 Agent 与任务分解', link: '/practice/p16-subagent/' },
            { text: 'P17：Agent 间通信与状态共享', link: '/practice/p17-agent-comm/' },
            { text: '补充：Human-in-the-Loop', link: '/practice/p28-human-in-loop/' },
          ]
        },
        {
          text: 'Phase 6 — 生产化',
          collapsed: false,
          items: [
            { text: 'P18：多模型路由与成本控制', link: '/practice/p18-model-routing/' },
            { text: 'P19：Agent 安全与防注入', link: '/practice/p19-security/' },
            { text: 'P20：可观测性与调试', link: '/practice/p20-observability/' },
            { text: 'P21：评估与基准测试', link: '/practice/p21-evaluation/' },
          ]
        },
        {
          text: 'Phase 7 — 综合实战',
          collapsed: false,
          items: [
            { text: 'P22：完整项目实战 — Code Review Agent', link: '/practice/p22-project/' },
            { text: 'P23：生产部署清单', link: '/practice/p23-production/' },
          ]
        },
      ],
      '/intermediate/': [
        { text: '← 返回首页', link: '/' },
        { text: '回到实践篇', link: '/practice/' },
        { text: '中级篇导读', link: '/intermediate/' },
        { text: '先读 Planning 机制', link: '/intermediate/27-planning-mechanism/' },
        {
          text: '中级专题',
          collapsed: false,
          items: [
            { text: '第25章：RAG 为什么总是答不准？', link: '/intermediate/25-rag-failure-patterns/' },
            { text: '第26章：多智能体协作实战', link: '/intermediate/26-multi-agent-collaboration/' },
            { text: '第27章：Planning 机制', link: '/intermediate/27-planning-mechanism/' },
            { text: '第28章：上下文工程实战', link: '/intermediate/28-context-engineering/' },
            { text: '第29章：System Prompt 设计', link: '/intermediate/29-system-prompt-design/' },
            { text: '第30章：生产架构', link: '/intermediate/30-production-architecture/' },
            { text: '第31章：安全与边界', link: '/intermediate/31-safety-boundaries/' },
            { text: '第32章：性能与成本', link: '/intermediate/32-performance-cost/' },
          ]
        },
      ],
      '/interview/': [
        { text: '← 返回首页', link: '/' },
        { text: '专区总览', link: '/interview/' },
        {
          text: '能力分类',
          collapsed: false,
          items: [
            { text: '基础概念', link: '/interview/fundamentals/' },
            { text: '工具调用', link: '/interview/tools/' },
            { text: '记忆', link: '/interview/memory/' },
            { text: '规划', link: '/interview/planning/' },
            { text: 'RAG', link: '/interview/rag/' },
            { text: 'Multi-Agent', link: '/interview/multi-agent/' },
            { text: '工程化', link: '/interview/engineering/' },
          ]
        },
      ],
      '/': [
        { text: '发现中心', link: '/discover/' },
        { text: '实践篇总览', link: '/practice/' },
        { text: '中级篇导读', link: '/intermediate/' },
        { text: '面试题专区', link: '/interview/' },
        { text: '术语表', link: '/glossary' },
        {
          text: '第一部分：AI Agent 基础',
          collapsed: false,
          items: [
            { text: '第1章：什么是 AI Agent', link: '/00-what-is-ai-agent/' },
            { text: '第2章：AI Agent 的核心组件', link: '/01-agent-basics/' },
          ]
        },
        {
          text: '第二部分：OpenCode 项目架构',
          collapsed: false,
          items: [
            { text: '第3章：OpenCode 项目介绍', link: '/02-agent-core/' },
          ]
        },
        {
          text: '第三部分：Agent 核心机制',
          collapsed: false,
          items: [
            { text: '第4章：工具系统', link: '/03-tool-system/' },
            { text: '第5章：会话管理', link: '/04-session-management/' },
            { text: '第6章：多模型支持', link: '/05-provider-system/' },
            { text: '第7章：MCP 协议集成', link: '/06-mcp-integration/' },
          ]
        },
        {
          text: '第四部分：OpenCode 深入主题',
          collapsed: false,
          items: [
            { text: '第8章：TUI 终端界面', link: '/07-tui-interface/' },
            { text: '第9章：HTTP API 服务器', link: '/08-http-api-server/' },
            { text: '第10章：数据持久化', link: '/09-data-persistence/' },
            { text: '第11章：多端 UI 开发', link: '/10-multi-platform-ui/' },
            { text: '第12章：代码智能', link: '/11-code-intelligence/' },
            { text: '第13章：插件与扩展', link: '/12-plugins-extensions/' },
            { text: '第14章：部署与基础设施', link: '/13-deployment-infrastructure/' },
            { text: '第15章：测试与质量保证', link: '/14-testing-quality/' },
            { text: '第16章：高级主题与最佳实践', link: '/15-advanced-topics/' },
          ]
        },
        {
          text: '第五部分：oh-my-openagent 插件系统',
          collapsed: false,
          items: [
            { text: '第17章：为什么需要多个 Agent？', link: '/oh-prelude/' },
            { text: '第18章：插件系统概述', link: '/16-plugin-overview/' },
            { text: '第19章：配置系统实战', link: '/oh-config/' },
            { text: '第20章：多模型编排系统', link: '/17-multi-model-orchestration/' },
            { text: '第21章：Hooks 三层架构', link: '/18-hooks-architecture/' },
            { text: '第22章：工具扩展系统', link: '/19-tool-extension/' },
            { text: '第23章：一条消息的完整旅程', link: '/oh-flow/' },
            { text: '第24章：实战案例与最佳实践', link: '/20-best-practices/' },
          ]
        },
        {
          text: '第六部分：中级专题与工程进阶',
          collapsed: false,
          items: [
            { text: '中级篇导读', link: '/intermediate/' },
            { text: '第25章：RAG 为什么总是答不准？', link: '/intermediate/25-rag-failure-patterns/' },
            { text: '第26章：多智能体协作实战', link: '/intermediate/26-multi-agent-collaboration/' },
            { text: '第27章：Planning 机制', link: '/intermediate/27-planning-mechanism/' },
            { text: '第28章：上下文工程实战', link: '/intermediate/28-context-engineering/' },
            { text: '第29章：System Prompt 设计', link: '/intermediate/29-system-prompt-design/' },
            { text: '第30章：生产架构', link: '/intermediate/30-production-architecture/' },
            { text: '第31章：安全与边界', link: '/intermediate/31-safety-boundaries/' },
            { text: '第32章：性能与成本', link: '/intermediate/32-performance-cost/' },
          ]
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: bookRepository }
    ],

    editLink: {
      pattern: `${bookRepository}/edit/main/docs/:path`,
      text: '在本书仓库中编辑此页'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },

    outline: {
      level: [2, 4],
      label: '目录'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: '搜索章节 / 项目 / 专题',
            buttonAriaLabel: '搜索章节、实践项目和进阶专题'
          },
          modal: {
            noResultsText: '没有找到匹配内容，试试换一个主题词，或先去发现中心按目标选路线。'
          }
        },
        _render(src) {
          return buildSearchPrelude(src)
        }
      }
    }
  }
}))
