import type { HeadConfig } from 'vitepress'

/** Production origin, no trailing slash. */
export const siteUrl = 'https://book.zyh.lol'

export const siteTitle = '从零理解如何构建 AI Agent'

export const siteDescription =
  'OpenCode 源码剖析与 AI Agent 实战电子书。覆盖工具调用、MCP、多 Agent、RAG、生产架构与企业 Agent，边学边做建立工程直觉。'

export const defaultOgImagePath = '/og-default.png'
export const defaultOgImageUrl = `${siteUrl}${defaultOgImagePath}`

/** Internal / agent-only pages: keep published if needed, but do not index. */
const noIndexPathMatchers: RegExp[] = [
  /^project-map\.md$/,
  /^dangerous-areas\.md$/,
  /^debugging\.md$/,
  /^testing\.md$/,
  /^agent-plan-template\.md$/,
  /^superpowers\//,
  /\/_archive\//,
  /^claude-code\/_archive\//
]

/**
 * Map VitePress relativePath to the public site path used in links and sitemap.
 * Assumes cleanUrls: false (default): index pages use trailing slash, others use .html.
 */
export function toSitePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\//, '')

  if (!normalized || normalized === 'index.md') {
    return '/'
  }

  if (normalized.endsWith('/index.md')) {
    return `/${normalized.slice(0, -'index.md'.length)}`
  }

  if (normalized.endsWith('.md')) {
    return `/${normalized.slice(0, -3)}.html`
  }

  return `/${normalized}`
}

export function toCanonicalUrl(relativePath: string): string {
  const path = toSitePath(relativePath)
  if (path === '/') {
    return `${siteUrl}/`
  }
  return `${siteUrl}${path}`
}

export function shouldNoIndex(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  return noIndexPathMatchers.some((pattern) => pattern.test(normalized))
}

export function shouldIncludeInSitemap(url: string): boolean {
  const path = url.replace(siteUrl, '').replace(/^\//, '')
  const blocked = [
    'superpowers/',
    '_archive/',
    'project-map',
    'dangerous-areas',
    'debugging',
    'testing.html',
    'agent-plan-template',
    '404'
  ]
  return !blocked.some((fragment) => path.includes(fragment))
}

function escapeJsonLd(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** Site-relative breadcrumb crumb (UI + JSON-LD share this). */
export type BreadcrumbCrumb = {
  name: string
  /** Site path, e.g. `/practice/` or `/glossary.html`. */
  path: string
  /**
   * When false, the crumb is display-only in UI and omitted from JSON-LD
   * (no real landing page, e.g. new-claude part folders without index).
   * Defaults to true.
   */
  linkable?: boolean
}

/** Top-level content sections used for BreadcrumbList. */
const SECTION_LABELS: Record<string, { name: string; path: string }> = {
  practice: { name: '实践篇', path: '/practice/' },
  intermediate: { name: '中级篇', path: '/intermediate/' },
  'claude-code': { name: 'Claude Code 架构思维', path: '/claude-code/' },
  'hermes-agent': { name: 'Hermes Agent 拆解', path: '/hermes-agent/' },
  'new-claude': { name: 'Claude Code 源码业务流', path: '/new-claude/' },
  'enterprise-agent': { name: '从零设计企业 Agent', path: '/enterprise-agent/' },
  'agent-selection': { name: '智能体选型', path: '/agent-selection/' },
  interview: { name: '面试题专区', path: '/interview/' },
  'animation-lab': { name: '动画实验室', path: '/animation-lab/' },
  discover: { name: '发现中心', path: '/discover/' },
  'learning-paths': { name: '学习路径', path: '/learning-paths/' }
}

const THEORY_SECTION = { name: 'OpenCode 拆解', path: '/00-what-is-ai-agent/' }

const PART_LABELS: Record<string, string> = {
  'part-1-主业务流': 'Part 1 主业务流',
  'part-2-扩展能力流': 'Part 2 扩展能力流',
  'part-3-远程协同流': 'Part 3 远程协同流',
  'part-4-附录': 'Part 4 附录',
  bagua: '八股文',
  fundamentals: '基础概念',
  tools: '工具调用',
  memory: '记忆',
  planning: '规划',
  rag: 'RAG',
  'multi-agent': 'Multi-Agent',
  engineering: '工程化'
}

function isTheoryChapterPath(relativePath: string): boolean {
  const top = relativePath.replace(/\\/g, '/').split('/')[0] ?? ''
  // dirs like 00-what-is-ai-agent, 20-best-practices, oh-prelude
  return /^(0\d|1\d|20)(-|$)/.test(top) || /^oh-[a-z0-9-]+$/.test(top)
}

function humanizeSegment(segment: string): string {
  if (PART_LABELS[segment]) {
    return PART_LABELS[segment]
  }

  return segment
    .replace(/-/g, ' ')
    .replace(/\bindex\b/g, '')
    .trim()
}

function toAbsoluteUrl(path: string): string {
  if (path === '/') {
    return `${siteUrl}/`
  }
  return `${siteUrl}${path}`
}

/** Mid folders that usually ship an index.md landing page. */
function midPathHasIndex(path: string): boolean {
  if (path === '/') {
    return true
  }
  for (const section of Object.values(SECTION_LABELS)) {
    if (section.path === path) {
      return true
    }
  }
  // practice projects, intermediate chapters, interview categories all use index.md
  return (
    /^\/practice\/p\d{2}-[^/]+\/$/.test(path)
    || /^\/intermediate\/\d{2}-[^/]+\/$/.test(path)
    || path.startsWith('/interview/')
  )
}

/**
 * Build breadcrumb crumbs: Home → section → optional mid folders → current page.
 * Section index pages stop at the section crumb (no duplicate self-name).
 * Paths are site-relative for UI links; JSON-LD absolutizes them.
 */
export function buildBreadcrumbItems(
  relativePath: string,
  pageName: string
): BreadcrumbCrumb[] {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\//, '')
  const crumbs: BreadcrumbCrumb[] = [
    { name: '首页', path: '/' }
  ]

  if (!normalized || normalized === 'index.md') {
    return crumbs
  }

  const parts = normalized.replace(/\.md$/, '').split('/')
  const isIndexPage = parts[parts.length - 1] === 'index'
  const top = parts[0] ?? ''

  if (SECTION_LABELS[top]) {
    const section = SECTION_LABELS[top]
    crumbs.push({ name: section.name, path: section.path })

    // Path segments without trailing `index`: section / optional mids / leaf.
    const meaningful = isIndexPage ? parts.slice(0, -1) : parts
    for (let index = 1; index < meaningful.length; index += 1) {
      const segment = meaningful[index]
      if (!segment) {
        continue
      }
      const isLeaf = index === meaningful.length - 1
      const midPathParts = meaningful.slice(0, index + 1)
      const midPath = isLeaf
        ? toSitePath(relativePath)
        : `/${midPathParts.join('/')}/`
      // Mid folders without a real index stay visible but not linked
      // (e.g. new-claude/part-1-*). Leaf paths always have a real page.
      crumbs.push({
        name: isLeaf ? pageName : humanizeSegment(segment),
        path: midPath,
        linkable: isLeaf || midPathHasIndex(midPath)
      })
    }

    return crumbs
  }

  if (isTheoryChapterPath(normalized)) {
    crumbs.push({
      name: THEORY_SECTION.name,
      path: THEORY_SECTION.path
    })
    crumbs.push({
      name: pageName,
      path: toSitePath(relativePath)
    })
    return crumbs
  }

  // Standalone top-level pages: reading-map.md, glossary.md, etc.
  crumbs.push({
    name: pageName,
    path: toSitePath(relativePath)
  })
  return crumbs
}

function buildBreadcrumbJsonLd(items: BreadcrumbCrumb[]): Record<string, unknown> {
  // Skip display-only mids so schema only lists real URLs.
  const schemaItems = items.filter((crumb) => crumb.linkable !== false)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: schemaItems.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: toAbsoluteUrl(crumb.path)
    }))
  }
}

export function buildPageSeoHead(options: {
  /** Document title shown in browser tab (may include site suffix). */
  pageTitle: string
  /** Bare page name for schema headline / breadcrumb (no site suffix). */
  pageName: string
  pageDescription: string
  relativePath: string
  isHome: boolean
  lastUpdated?: number
}): HeadConfig[] {
  const {
    pageTitle,
    pageName,
    pageDescription,
    relativePath,
    isHome,
    lastUpdated
  } = options

  const canonicalUrl = toCanonicalUrl(relativePath)
  const noIndex = shouldNoIndex(relativePath)
  const ogType = isHome ? 'website' : 'article'

  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: canonicalUrl }],
    ['meta', { property: 'og:title', content: pageTitle }],
    ['meta', { property: 'og:description', content: pageDescription }],
    ['meta', { property: 'og:type', content: ogType }],
    ['meta', { property: 'og:url', content: canonicalUrl }],
    ['meta', { property: 'og:site_name', content: siteTitle }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:image', content: defaultOgImageUrl }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: siteTitle }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: pageTitle }],
    ['meta', { name: 'twitter:description', content: pageDescription }],
    ['meta', { name: 'twitter:image', content: defaultOgImageUrl }]
  ]

  if (noIndex) {
    head.push(['meta', { name: 'robots', content: 'noindex, nofollow' }])
  }

  if (isHome) {
    const websiteLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteTitle,
      description: siteDescription,
      url: `${siteUrl}/`,
      inLanguage: 'zh-CN',
      publisher: {
        '@type': 'Organization',
        name: siteTitle,
        url: siteUrl
      }
    }
    head.push([
      'script',
      { type: 'application/ld+json' },
      escapeJsonLd(JSON.stringify(websiteLd))
    ])
  } else if (!noIndex) {
    const articleLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: pageName,
      description: pageDescription,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      inLanguage: 'zh-CN',
      isPartOf: {
        '@type': 'WebSite',
        name: siteTitle,
        url: `${siteUrl}/`
      },
      image: [defaultOgImageUrl]
    }
    if (lastUpdated) {
      articleLd.dateModified = new Date(lastUpdated).toISOString()
    }
    head.push([
      'script',
      { type: 'application/ld+json' },
      escapeJsonLd(JSON.stringify(articleLd))
    ])

    const breadcrumbItems = buildBreadcrumbItems(relativePath, pageName)
    if (breadcrumbItems.length >= 2) {
      head.push([
        'script',
        { type: 'application/ld+json' },
        escapeJsonLd(JSON.stringify(buildBreadcrumbJsonLd(breadcrumbItems)))
      ])
    }
  }

  return head
}

export const globalSeoHead: HeadConfig[] = [
  ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
  ['meta', { name: 'theme-color', content: '#0f172a' }]
]
