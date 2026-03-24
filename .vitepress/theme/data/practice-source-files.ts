/// <reference types="vite/client" />

import { extname } from 'path'

export interface PracticeSourceFileEntry {
  path: string
  code: string
  language: string
}

const PRACTICE_ROOT_GLOB_PREFIX = '../../../practice/'

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.ts': 'ts',
  '.js': 'js',
  '.json': 'json',
  '.sh': 'sh'
}

function normalizePracticePath(globPath: string): string {
  if (globPath.startsWith(PRACTICE_ROOT_GLOB_PREFIX)) {
    return `practice/${globPath.slice(PRACTICE_ROOT_GLOB_PREFIX.length)}`
  }
  return globPath
}

function detectLanguage(filePath: string): string {
  const extension = extname(filePath).toLowerCase()
  return LANGUAGE_BY_EXTENSION[extension] ?? 'text'
}

const practiceSourceModules = import.meta.glob('../../../practice/*.ts', {
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
