/**
 * Pure SEO copy-quality rules for published book pages.
 * Used by check-seo-copy.mjs and unit tests.
 */

export const DESCRIPTION_MIN_LENGTH = 55
export const DESCRIPTION_MAX_LENGTH = 120

/** Boilerplate phrases banned in SERP descriptions (P1 writing standard). */
export const FORBIDDEN_DESCRIPTION_PHRASES = [
  '基于 Hermes Agent 拆解专栏',
  '基于 Claude Code 源码业务流专栏',
  '基于 Claude Code 架构思维专栏',
  '结合源码讲清设计动机与边界',
  '梳理关键设计决策、运行时边界与可复用工程判断',
  '源码拆解「',
  '专栏源码拆解'
]

/**
 * Count description length in Unicode code points (Chinese + Latin).
 * @param {string} description
 * @returns {number}
 */
export function measureDescriptionLength(description) {
  return [...String(description).trim()].length
}

/**
 * @param {{ title?: unknown, description?: unknown }} input
 * @returns {{
 *   ok: boolean,
 *   hasRequiredFields: boolean,
 *   length: number,
 *   issues: string[]
 * }}
 */
export function evaluateSeoCopy(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const issues = []

  if (!title) {
    issues.push('missing_title')
  }
  if (!description) {
    issues.push('missing_description')
  }

  const hasRequiredFields = Boolean(title && description)
  if (!hasRequiredFields) {
    return {
      ok: false,
      hasRequiredFields: false,
      length: description ? measureDescriptionLength(description) : 0,
      issues
    }
  }

  const length = measureDescriptionLength(description)
  if (length < DESCRIPTION_MIN_LENGTH) {
    issues.push(`description_too_short:${length}`)
  }
  if (length > DESCRIPTION_MAX_LENGTH) {
    issues.push(`description_too_long:${length}`)
  }

  for (const phrase of FORBIDDEN_DESCRIPTION_PHRASES) {
    if (description.includes(phrase)) {
      issues.push(`forbidden_phrase:${phrase}`)
    }
  }

  const normalizedDescription = description.replace(/。+$/u, '')
  if (
    normalizedDescription === title
    || (
      normalizedDescription.startsWith(title)
      && normalizedDescription.length - title.length < 8
    )
  ) {
    issues.push('title_echo')
  }

  return {
    ok: issues.length === 0,
    hasRequiredFields: true,
    length,
    issues
  }
}

/**
 * Quality-only issues can be temporarily allowlisted as Wave A/B debt.
 * Missing title/description can never be allowlisted.
 * @param {string[]} issues
 * @returns {string[]}
 */
export function qualityOnlyIssues(issues) {
  return issues.filter(
    (issue) => issue !== 'missing_title' && issue !== 'missing_description'
  )
}
