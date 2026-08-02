import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  evaluateSeoCopy,
  measureDescriptionLength,
  qualityOnlyIssues
} from './seo-copy-quality.mjs'

test('measureDescriptionLength counts unicode code points', () => {
  assert.equal(measureDescriptionLength('什么是 AI Agent'), 12)
  assert.equal(measureDescriptionLength('  abc  '), 3)
})

test('rejects missing title or description', () => {
  const result = evaluateSeoCopy({ title: '', description: '' })
  assert.equal(result.ok, false)
  assert.equal(result.hasRequiredFields, false)
  assert.deepEqual(result.issues, ['missing_title', 'missing_description'])
})

test('accepts a solid description in band without boilerplate', () => {
  const description = '什么是 AI Agent？从 LLM 到工具调用与执行循环，厘清 Agent、Chatbot 与工作流的边界，建立可落地的最小定义。'
  const result = evaluateSeoCopy({
    title: '什么是 AI Agent',
    description
  })
  assert.equal(result.ok, true)
  assert.equal(result.hasRequiredFields, true)
  assert.ok(result.length >= DESCRIPTION_MIN_LENGTH)
  assert.ok(result.length <= DESCRIPTION_MAX_LENGTH)
  assert.deepEqual(result.issues, [])
})

test('flags description shorter than minimum', () => {
  const result = evaluateSeoCopy({
    title: '术语表',
    description: '太短了'
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.startsWith('description_too_short:')))
})

test('flags description longer than maximum', () => {
  const long = '测'.repeat(DESCRIPTION_MAX_LENGTH + 5)
  const result = evaluateSeoCopy({
    title: '长描述页',
    description: long
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.startsWith('description_too_long:')))
})

test('flags forbidden template phrases', () => {
  const result = evaluateSeoCopy({
    title: 'Hermes 工具系统',
    description: '工具系统很重要。基于 Hermes Agent 拆解专栏，结合源码讲清设计动机与边界。'
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.includes('基于 Hermes Agent 拆解专栏')))
  assert.ok(result.issues.some((issue) => issue.includes('结合源码讲清设计动机与边界')))
})

test('flags title echo descriptions', () => {
  const title = '第 5 章：工具不是外挂，而是 Agent 的手和脚'
  const result = evaluateSeoCopy({
    title,
    description: `${title}。`
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.includes('title_echo'))
})

test('qualityOnlyIssues drops missing-field errors', () => {
  assert.deepEqual(
    qualityOnlyIssues(['missing_title', 'description_too_short:10', 'missing_description']),
    ['description_too_short:10']
  )
})
