import { createContentLoader } from 'vitepress'
import type { ContentData } from 'vitepress'
import {
  getContentTypeLabel,
  normalizeLearningFrontmatter,
  type LearningContentFrontmatter,
  type SectionId,
  type SectionRoleSummary
} from './content-meta'

export interface ContentNode extends LearningContentFrontmatter {
  title: string
  url: string
  sectionId: SectionId
  contentTypeLabel: string
  sectionTitle: string
  searchDescription: string
  discoveryTags: string[]
}

const SECTION_ORDER: SectionId[] = ['theory', 'practice', 'intermediate']

const SECTION_META: Record<
  SectionId,
  Omit<SectionRoleSummary, 'countLabel'>
> = {
  theory: {
    sectionId: 'theory',
    title: '理论篇',
    roleDescription: '看懂真实 AI Agent 系统为什么这样设计',
    entryMode: 'read-first',
    recommendedStart: '/00-what-is-ai-agent/'
  },
  practice: {
    sectionId: 'practice',
    title: '实践篇',
    roleDescription: '把关键机制亲手跑通并形成实现手感',
    entryMode: 'build-first',
    recommendedStart: '/practice/p01-minimal-agent/'
  },
  intermediate: {
    sectionId: 'intermediate',
    title: '中级篇',
    roleDescription: '处理稳定性、协作、安全与成本等工程专题',
    entryMode: 'bridge',
    recommendedStart: '/intermediate/27-planning-mechanism/'
  }
}

function resolveSectionId(contentType: LearningContentFrontmatter['contentType']): SectionId | null {
  if (contentType === 'theory' || contentType === 'practice' || contentType === 'intermediate') {
    return contentType
  }

  return null
}

function buildCountLabel(sectionId: SectionId, count: number): string {
  if (sectionId === 'theory') {
    return `${count} 个理论章节`
  }

  if (sectionId === 'practice') {
    return `${count} 个实践项目`
  }

  return `${count} 个中级专题`
}

function buildDiscoveryTags(frontmatter: LearningContentFrontmatter, pageTitle: string): string[] {
  return Array.from(new Set([
    frontmatter.navigationLabel,
    frontmatter.shortTitle,
    pageTitle,
    ...frontmatter.searchTags
  ].map((item) => item.trim()).filter(Boolean)))
}

function normalizeContentNode(page: ContentData): ContentNode | null {
  const frontmatter = normalizeLearningFrontmatter(
    (page.frontmatter ?? {}) as Partial<LearningContentFrontmatter>
  )
  const sectionId = resolveSectionId(frontmatter.contentType)

  if (!frontmatter.contentId || !sectionId) {
    return null
  }

  const pageTitle =
    typeof page.frontmatter?.title === 'string' && page.frontmatter.title.trim()
      ? page.frontmatter.title.trim()
      : frontmatter.shortTitle
  const section = SECTION_META[sectionId]
  const discoveryTags = buildDiscoveryTags(frontmatter, pageTitle)

  return {
    ...frontmatter,
    title: pageTitle,
    url: page.url,
    sectionId,
    contentTypeLabel: getContentTypeLabel(frontmatter.contentType),
    sectionTitle: section.title,
    searchDescription: `${section.title} · ${frontmatter.roleDescription || frontmatter.summary}`,
    discoveryTags
  }
}

function buildSectionIndex(contentNodes: ContentNode[]): SectionRoleSummary[] {
  return SECTION_ORDER.map((sectionId) => {
    const count = contentNodes.filter((node) => node.sectionId === sectionId).length

    return {
      ...SECTION_META[sectionId],
      countLabel: buildCountLabel(sectionId, count)
    }
  })
}

function buildSectionById(sectionIndex: SectionRoleSummary[]): Record<SectionId, SectionRoleSummary> {
  return Object.fromEntries(
    sectionIndex.map((section) => [section.sectionId, section])
  ) as Record<SectionId, SectionRoleSummary>
}

export default createContentLoader('**/index.md', {
  transform(rawPages) {
    const contentNodes = rawPages
      .map(normalizeContentNode)
      .filter((node): node is ContentNode => node !== null)
      .sort((left, right) => left.url.localeCompare(right.url))

    const contentById = Object.fromEntries(
      contentNodes.map((node) => [node.contentId, node])
    ) as Record<string, ContentNode>
    const sectionIndex = buildSectionIndex(contentNodes)
    const sectionById = buildSectionById(sectionIndex)

    return {
      contentNodes,
      contentById,
      sectionIndex,
      sectionById
    }
  }
})
