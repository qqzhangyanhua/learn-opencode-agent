import { defineConfig } from 'vitepress'

const siteTitle = '从零构建 AI Coding Agent'
const siteDescription = 'OpenCode 源码剖析与实战'
const bookRepository = 'https://github.com/qqzhangyanhua/learn-opencode-agent'
const sourceRepository = 'https://github.com/anomalyco/opencode/tree/dev'

export default defineConfig({
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
      { text: '第一篇：Agent 基础架构', link: '/01-agent-basics/index' },
      { text: '第二篇：Agent 核心系统', link: '/02-agent-core/index' },
      { text: '第三篇：工具系统', link: '/03-tool-system/index' },
      { text: '第四篇：会话管理', link: '/04-session-management/index' },
      { text: '第五篇：多模型支持', link: '/05-provider-system/index' },
      { text: '第六篇：MCP 协议集成', link: '/06-mcp-integration/index' },
      { text: '第七篇：TUI 终端界面', link: '/07-tui-interface/index' },
      { text: '第八篇：HTTP API 服务器', link: '/08-http-api-server/index' },
      { text: '第九篇：数据持久化', link: '/09-data-persistence/index' },
      { text: '第十篇：多端 UI 开发', link: '/10-multi-platform-ui/index' },
      { text: '第十一篇：代码智能', link: '/11-code-intelligence/index' },
      { text: '第十二篇：插件与扩展', link: '/12-plugins-extensions/index' },
      { text: '第十三篇：部署与基础设施', link: '/13-deployment-infrastructure/index' },
      { text: '第十四篇：测试与质量保证', link: '/14-testing-quality/index' },
      { text: '第十五篇：高级主题与最佳实践', link: '/15-advanced-topics/index' },
      { text: '发布清单', link: '/release-checklist' }
    ],

    socialLinks: [
      { icon: 'github', link: bookRepository }
    ],

    editLink: {
      pattern: `${bookRepository}/edit/main/docs/book/docs/:path`,
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
})
