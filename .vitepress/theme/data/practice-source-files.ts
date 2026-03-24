/// <reference types="vite/client" />

export interface PracticeSourceFileEntry {
  path: string
  code: string
  language: string
}

const PRACTICE_SEGMENT = 'practice/'

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.ts': 'ts',
  '.js': 'js',
  '.json': 'json',
  '.sh': 'sh'
}

function normalizePracticePath(globPath: string): string {
  const practiceIndex = globPath.indexOf(PRACTICE_SEGMENT)
  if (practiceIndex >= 0) {
    return `practice/${globPath.slice(practiceIndex + PRACTICE_SEGMENT.length)}`
  }
  const segments = globPath.split('/').filter((segment) => segment.length > 0)
  const fallback = segments[segments.length - 1] ?? globPath
  return `practice/${fallback}`
}

function detectLanguage(filePath: string): string {
  const match = filePath.match(/\.[a-z0-9]+$/i)
  const extension = match ? match[0].toLowerCase() : ''
  return LANGUAGE_BY_EXTENSION[extension] ?? 'text'
}

const practiceSourceModules = import.meta.glob('../../../practice/p*.ts', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const practiceSourceMap = new Map<string, PracticeSourceFileEntry>()

for (const [globPath, code] of Object.entries(practiceSourceModules)) {
  const entryPath = normalizePracticePath(globPath)
  practiceSourceMap.set(entryPath, {
    path: entryPath,
    code,
    language: detectLanguage(entryPath)
  })
}

export function getPracticeSourceFile(path: string): PracticeSourceFileEntry | null {
  return practiceSourceMap.get(path) ?? null
}

export function getPracticeSourceFiles(paths: string[]): PracticeSourceFileEntry[] {
  const entries: PracticeSourceFileEntry[] = []
  for (const requestedPath of paths) {
    const entry = practiceSourceMap.get(requestedPath)
    if (entry) {
      entries.push(entry)
    }
  }
  return entries
}
