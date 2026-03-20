import { withMermaid } from 'vitepress-plugin-mermaid'
import { defineConfig } from 'vitepress'

const siteTitle = '从零构建 AI Coding Agent'
const siteDescription = 'OpenCode 源码剖析与实战'
const bookRepository = 'https://github.com/qqzhangyanhua/learn-opencode-agent'
const sourceRepository = 'https://github.com/anomalyco/opencode/tree/dev'

export default withMermaid(defineConfig({
  srcDir: 'docs',
  title: siteTitle,
  description: siteDescription,
  lang: 'zh-CN',
  lastUpdated: true,
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
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler'
        }
      }
    },
    optimizeDeps: {
      include: ['mermaid', 'dayjs'],
      esbuildOptions: {
        tsconfigRaw: {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler'
          }
        }
      }
    },
    ssr: {
      noExternal: ['mermaid']
    }
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '实践篇', link: '/practice/', activeMatch: '/practice/' },
      { text: '中级篇', link: '/intermediate/' },
      { text: '阅读地图', link: '/reading-map' },
      { text: '版本说明', link: '/version-notes' },
      { text: '术语表', link: '/glossary' },
      { text: '本书仓库', link: bookRepository },
      { text: 'OpenCode 源码', link: sourceRepository }
    ],

    sidebar: {
      '/practice/': [
        { text: '← 返回理论篇', link: '/' },
        { text: '开始前先看', link: '/practice/setup' },
        { text: '课程介绍', link: '/practice/' },
        {
          text: 'Phase 1 — Agent 基础',
          collapsed: false,
          items: [
            { text: 'P1：最小 Agent — 工具调用核心机制', link: '/practice/p01-minimal-agent/' },
            { text: 'P2：多轮对话与上下文管理', link: '/practice/p02-multi-turn/' },
            { text: 'P3：流式输出与实时反馈', link: '/practice/p03-streaming/' },
            { text: 'P4：错误处理与重试策略', link: '/practice/p04-error-handling/' },
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
          ]
        },
        {
          text: 'Phase 5 — 多 Agent 协作',
          collapsed: false,
          items: [
            { text: 'P15：多 Agent 编排模式', link: '/practice/p15-multi-agent/' },
            { text: 'P16：子 Agent 与任务分解', link: '/practice/p16-subagent/' },
            { text: 'P17：Agent 间通信与状态共享', link: '/practice/p17-agent-comm/' },
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
      '/': [
        { text: '阅读地图', link: '/reading-map' },
        { text: '版本说明', link: '/version-notes' },
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
      provider: 'local'
    }
  }
}))
