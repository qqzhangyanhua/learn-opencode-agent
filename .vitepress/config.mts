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
      esbuildOptions: {
        tsconfigRaw: {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler'
          }
        }
      }
    }
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '阅读地图', link: '/reading-map' },
      { text: '版本说明', link: '/version-notes' },
      { text: '术语表', link: '/glossary' },
      { text: '本书仓库', link: bookRepository },
      { text: 'OpenCode 源码', link: sourceRepository }
    ],

    sidebar: [
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
    ],

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


