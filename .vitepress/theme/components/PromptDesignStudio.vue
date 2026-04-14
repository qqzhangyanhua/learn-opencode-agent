<template>
  <div class="p-studio">
    <div class="p-toolbar">
      <div class="p-template-select">
        <label>选择模板</label>
        <select v-model="selectedTemplateId" @change="loadTemplate">
          <option v-for="template in templates" :key="template.id" :value="template.id">
            {{ template.name }}
          </option>
        </select>
      </div>
      <div class="p-actions">
        <button class="p-btn" @click="copyPrompt">
          <span v-if="copied">已复制!</span>
          <span v-else>复制 Prompt</span>
        </button>
        <button class="p-btn" @click="exportJson">导出 JSON</button>
      </div>
    </div>

    <div class="p-main">
      <div class="p-editor">
        <div
          v-for="section in editableSections"
          :key="section.id"
          class="p-section-item"
          :class="{ active: activeSectionId === section.id }"
          @click="activeSectionId = section.id"
        >
          <div class="p-section-header">
            <div class="p-section-meta">
              <input
                type="checkbox"
                v-model="section.enabled"
                :disabled="section.required"
                @change="onInput"
              />
              <span class="p-section-label">{{ section.label }}</span>
              <span v-if="section.required" class="p-tag-req">必填</span>
            </div>
            <span class="p-section-tokens" :class="{ over: isOverLimit(section) }">
              {{ estimateTokens(section.content) }} / {{ section.maxTokens }}
            </span>
          </div>
          <div v-if="section.enabled" class="p-section-body">
            <p class="p-section-desc">{{ section.description }}</p>
            <textarea
              v-model="section.content"
              class="p-textarea"
              placeholder="请输入内容..."
              @input="onInput"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="p-sidebar">
        <div class="p-card">
          <div class="p-card-header">源码装配链</div>
          <div class="p-chain-intro">
            你现在改的不是一段孤立 Prompt，而是会被拼进
            <code>system.ts -> instruction.ts -> prompt.ts -> llm.ts</code>
            这条运行时装配链。
          </div>
          <div class="p-layer-chain">
            <div
              v-for="layer in layerStates"
              :key="layer.id"
              class="p-layer-card"
              :class="layer.state"
            >
              <div class="p-layer-file">{{ layer.file }}</div>
              <div class="p-layer-title">{{ layer.title }}</div>
              <p class="p-layer-summary">{{ layer.summary }}</p>
            </div>
          </div>
        </div>

        <div class="p-card">
          <div class="p-card-header">当前映射</div>
          <div class="p-mapping-topline">
            <span class="p-mapping-section">
              {{ activeSection?.label ?? '角色定义' }}
            </span>
            <span class="p-mapping-arrow">→</span>
            <code class="p-mapping-file">{{ activeSourceMeta.file }}</code>
          </div>
          <p class="p-mapping-copy">{{ activeMappingReason }}</p>
          <div class="p-mapping-callout">
            <strong>为什么在这一层</strong>
            <span>{{ activeSourceMeta.summary }}</span>
          </div>
          <div class="p-mapping-risk">
            <strong>放错层会怎样</strong>
            <span>{{ activeSourceMeta.risk }}</span>
          </div>
          <div class="p-bridge-note">
            <strong>运行时桥接</strong>
            <span>{{ bridgeExplanation }}</span>
          </div>
        </div>

        <div class="p-card preview-card">
          <div class="p-card-header">最终发模结果</div>
          <div class="p-preview-note">
            下面这段不是源码来源本身，而是经过 <code>prompt.ts</code> 收集当前会话上下文后，最终在
            <code>llm.ts</code> 发给模型的结果。
          </div>
          <div class="p-preview-content">
            <div
              v-for="section in assembledSections"
              :key="section.id"
              class="p-preview-section"
              :class="{ highlighted: activeSectionId === section.id }"
            >
              <div class="p-preview-label">## {{ section.label }}</div>
              <pre>{{ section.content || ' (空) ' }}</pre>
            </div>
          </div>
          <div class="p-budget-bar">
            <div class="p-budget-info">
              <span>Token 预算 (估算)</span>
              <span>{{ totalTokens }} / {{ maxBudget }}</span>
            </div>
            <div class="p-meter-bg">
              <div
                class="p-meter-fill"
                :class="budgetStatus"
                :style="{ width: `${Math.min(100, (totalTokens / maxBudget) * 100)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <PromptLintPanel
          :issues="lintIssues"
          @select-section="id => id && (activeSectionId = id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PromptLintIssue, PromptSection, PromptTemplate } from './types'
import PromptLintPanel from './PromptLintPanel.vue'

type PromptSourceLayer = 'system' | 'instruction' | 'prompt' | 'llm'
type PromptLayerState = 'current' | 'upstream' | 'downstream'

interface EditableSection extends PromptSection {
  enabled: boolean
}

interface DraftSection {
  id: string
  content: string
  enabled: boolean
}

interface PromptSourceMeta {
  id: PromptSourceLayer
  file: 'system.ts' | 'instruction.ts' | 'prompt.ts' | 'llm.ts'
  title: string
  summary: string
  risk: string
}

const props = defineProps<{ templates: PromptTemplate[]; initialTemplateId?: string }>()

const selectedTemplateId = ref(props.initialTemplateId || props.templates[0]?.id)
const editableSections = ref<EditableSection[]>([])
const activeSectionId = ref('')
const copied = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const maxBudget = 2000

const sourceLayers: PromptSourceMeta[] = [
  {
    id: 'system',
    file: 'system.ts',
    title: '稳定角色基线',
    summary: '这里定义 Agent 长期稳定的身份、角色和行为基线。',
    risk: '如果把长期规则塞到临时上下文里，行为会漂，且不同会话很难保持一致。'
  },
  {
    id: 'instruction',
    file: 'instruction.ts',
    title: '附加指令装配',
    summary: '这里并入项目级、组织级或用户级附加约束，让系统行为按环境收口。',
    risk: '如果把组织约束漏掉，模型会只剩通用人格；但它仍然不能替代权限系统兜底。'
  },
  {
    id: 'prompt',
    file: 'prompt.ts',
    title: '会话入口组装',
    summary: '这里收集当前轮上下文、历史消息和会话状态，把前面的约束带进实际请求。',
    risk: '如果会话入口不负责装配，系统就很难解释“这次为什么这样回答”。'
  },
  {
    id: 'llm',
    file: 'llm.ts',
    title: '最终发模关口',
    summary: '这里把 system、messages 和 tools 一起送进模型，形成真正的调用输入。',
    risk: '如果输出要求只停留在草稿里，没有进入最终请求，格式和边界就不会稳定生效。'
  }
]

function layerForSection(sectionId: string): PromptSourceLayer {
  if (sectionId === 'role' || sectionId === 'rules') return 'system'
  if (sectionId === 'safety') return 'instruction'
  if (sectionId === 'output') return 'llm'
  return 'system'
}

function loadTemplate() {
  const template = props.templates.find(item => item.id === selectedTemplateId.value)
  if (!template) return

  editableSections.value = template.sections.map(section => ({
    ...section,
    enabled: section.required || section.content.length > 0
  }))

  if (editableSections.value.length > 0) {
    activeSectionId.value = editableSections.value[0].id
  }
}

function estimateTokens(text: string) {
  return text ? Math.ceil(text.length / 2.5) : 0
}

const activeSection = computed(
  () => editableSections.value.find(section => section.id === activeSectionId.value) ?? editableSections.value[0] ?? null
)

const activeSourceLayer = computed<PromptSourceLayer>(() => {
  return activeSection.value ? layerForSection(activeSection.value.id) : 'system'
})

const activeSourceMeta = computed(
  () => sourceLayers.find(layer => layer.id === activeSourceLayer.value) ?? sourceLayers[0]
)

const layerStates = computed(() => {
  const currentIndex = sourceLayers.findIndex(layer => layer.id === activeSourceLayer.value)

  return sourceLayers.map((layer, index) => {
    let state: PromptLayerState = 'downstream'

    if (index === currentIndex) state = 'current'
    else if (index < currentIndex) state = 'upstream'

    return {
      ...layer,
      state
    }
  })
})

const activeMappingReason = computed(() => {
  switch (activeSection.value?.id) {
    case 'role':
      return '角色定义更接近 system.ts，因为它决定 Agent 长期是谁、能以什么身份稳定行动。'
    case 'rules':
      return '行为规则更接近 system.ts，因为这类约束应该作为跨会话稳定合同，而不是每轮临时补丁。'
    case 'safety':
      return '安全约束更接近 instruction.ts，因为它常常来自项目级或组织级附加指令，会在运行时并入系统上下文。'
    case 'output':
      return '输出格式更接近 llm.ts，因为它最终要体现在发模前的请求组装里，直接影响模型最后怎么输出。'
    default:
      return '当前内容默认回到 system.ts，因为教学主线必须先从稳定基线开始，而不是从最后发模倒推。'
  }
})

const bridgeExplanation = computed(() => {
  if (activeSourceLayer.value === 'llm') {
    return '你现在看的这部分已经离最终请求很近了，但它仍需要经过 prompt.ts 拼上当前会话上下文后，才会进入 llm.ts。'
  }

  if (activeSourceLayer.value === 'instruction') {
    return '这一层补的是附加约束，之后还要经过 prompt.ts 合并本轮上下文，再由 llm.ts 送进模型。'
  }

  return '这一层先定义稳定基线，随后 instruction.ts 会补附加约束，prompt.ts 会收集本轮上下文，最后 llm.ts 才真正发模。'
})

const isOverLimit = (section: EditableSection) => estimateTokens(section.content) > section.maxTokens

const assembledSections = computed(() => editableSections.value.filter(section => section.enabled))

const totalTokens = computed(() =>
  assembledSections.value.reduce((total, section) => total + estimateTokens(section.content), 0)
)

const budgetStatus = computed(() => {
  const ratio = totalTokens.value / maxBudget
  if (ratio > 1) return 'danger'
  if (ratio > 0.8) return 'warning'
  return 'brand'
})

const lintIssues = computed(() => {
  const issues: PromptLintIssue[] = []

  editableSections.value.forEach(section => {
    if (section.required && section.enabled && !section.content.trim()) {
      issues.push({
        id: `err-req-${section.id}`,
        severity: 'error',
        sectionId: section.id,
        message: `缺少必填内容: ${section.label}`,
        suggestion: '这一层内容太薄时，运行时装配出来的行为合同会失去稳定锚点。'
      })
    }

    if (section.enabled && isOverLimit(section)) {
      issues.push({
        id: `warn-limit-${section.id}`,
        severity: 'warning',
        sectionId: section.id,
        message: `${section.label} 超出 Token 限制`,
        suggestion: `建议精简描述，当前估算 ${estimateTokens(section.content)} tokens，上限 ${section.maxTokens}。`
      })
    }
  })

  const hasSafety = editableSections.value.some(section => section.enabled && section.label.includes('安全'))
  if (!hasSafety) {
    issues.push({
      id: 'warn-safety',
      severity: 'warning',
      sectionId: 'safety',
      message: '缺少安全约束章节',
      suggestion: '这意味着 instruction.ts 层缺少附加边界，但它仍不能替代权限系统兜底。'
    })
  }

  const hasFormat = editableSections.value.some(
    section => section.enabled && (section.label.includes('格式') || section.label.includes('输出'))
  )
  if (!hasFormat) {
    issues.push({
      id: 'info-format',
      severity: 'info',
      sectionId: 'output',
      message: '建议添加输出格式要求',
      suggestion: '如果输出约束没有进入最终发模结果，llm.ts 收到的请求就很难保持稳定格式。'
    })
  }

  return issues
})

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saveDraft()
  }, 300)
}

function saveDraft() {
  const data = {
    templateId: selectedTemplateId.value,
    sections: editableSections.value.map(section => ({
      id: section.id,
      content: section.content,
      enabled: section.enabled
    }))
  }
  localStorage.setItem('prompt-studio-draft', JSON.stringify(data))
}

function loadDraft() {
  const saved = localStorage.getItem('prompt-studio-draft')
  if (!saved) {
    loadTemplate()
    return
  }

  try {
    const data = JSON.parse(saved)
    selectedTemplateId.value = data.templateId
    const template = props.templates.find(item => item.id === data.templateId)

    if (!template) {
      loadTemplate()
      return
    }

    editableSections.value = template.sections.map(section => {
      const draft = data.sections.find((draftSection: DraftSection) => draftSection.id === section.id)
      return {
        ...section,
        content: draft ? draft.content : section.content,
        enabled: draft ? draft.enabled : (section.required || section.content.length > 0)
      }
    })
    activeSectionId.value = editableSections.value[0]?.id || ''
  } catch {
    loadTemplate()
  }
}

function copyPrompt() {
  const text = assembledSections.value
    .map(section => `## ${section.label}\n${section.content}`)
    .join('\n\n')

  navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function exportJson() {
  const data = {
    name: 'Custom Prompt',
    sections: assembledSections.value.map(section => ({
      id: section.id,
      label: section.label,
      content: section.content
    }))
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'prompt-design.json'
  anchor.click()
}

onMounted(() => {
  loadDraft()
})
</script>

<style scoped>
.p-studio {
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 24px 0;
  min-height: 760px;
}

.p-toolbar {
  padding: 12px 20px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.p-template-select {
  display: flex;
  align-items: center;
  gap: 12px;
}

.p-template-select label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.p-template-select select {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.p-actions {
  display: flex;
  gap: 8px;
}

.p-btn {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.p-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.p-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.p-editor {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-right: 1px solid var(--vp-c-divider);
}

.p-section-item {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s ease;
  cursor: pointer;
  background: var(--vp-c-bg-soft);
}

.p-section-item.active {
  border-color: rgba(13, 148, 136, 0.45);
  background: var(--vp-c-bg);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.p-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.p-section-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.p-section-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.p-tag-req {
  font-size: 10px;
  padding: 1px 6px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--vp-c-danger-1);
  border-radius: 999px;
}

.p-section-tokens {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}

.p-section-tokens.over {
  color: var(--vp-c-danger-1);
}

.p-section-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 10px;
  line-height: 1.55;
}

.p-textarea {
  width: 100%;
  height: 120px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
  resize: vertical;
  color: var(--vp-c-text-1);
}

.p-textarea:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.p-sidebar {
  width: 380px;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
}

.p-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.p-card-header {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  border-bottom: 1px solid var(--vp-c-divider);
  letter-spacing: 0.05em;
}

.p-chain-intro,
.p-preview-note,
.p-mapping-copy {
  margin: 0;
  padding: 14px 14px 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.p-chain-intro code,
.p-preview-note code,
.p-mapping-file {
  font-family: var(--vp-font-family-mono);
}

.p-layer-chain {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.p-layer-card {
  position: relative;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  transition: all 0.2s ease;
}

.p-layer-card:not(:last-child)::after {
  content: '↓';
  position: absolute;
  left: 16px;
  bottom: -18px;
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.p-layer-card.current {
  border-color: rgba(13, 148, 136, 0.45);
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(13, 148, 136, 0.05));
}

.p-layer-card.upstream {
  border-color: rgba(59, 130, 246, 0.22);
  background: rgba(59, 130, 246, 0.04);
}

.p-layer-card.downstream {
  opacity: 0.88;
}

.p-layer-file {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin-bottom: 4px;
}

.p-layer-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.p-layer-summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.p-mapping-topline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 14px 0;
}

.p-mapping-section {
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.p-mapping-arrow {
  color: var(--vp-c-text-3);
}

.p-mapping-file {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.1);
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}

.p-mapping-callout,
.p-mapping-risk,
.p-bridge-note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px;
  padding: 12px;
  border-radius: 10px;
}

.p-mapping-callout {
  background: rgba(20, 184, 166, 0.08);
}

.p-mapping-risk {
  background: rgba(245, 158, 11, 0.08);
}

.p-bridge-note {
  background: rgba(59, 130, 246, 0.08);
}

.p-mapping-callout strong,
.p-mapping-risk strong,
.p-bridge-note strong {
  font-size: 12px;
  color: var(--vp-c-text-1);
}

.p-mapping-callout span,
.p-mapping-risk span,
.p-bridge-note span {
  font-size: 12px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.preview-card {
  overflow: hidden;
}

.p-preview-content {
  max-height: 280px;
  overflow-y: auto;
  padding: 16px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
}

.p-preview-section {
  margin-bottom: 16px;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.p-preview-section.highlighted {
  background: rgba(20, 184, 166, 0.08);
  outline: 1px solid rgba(13, 148, 136, 0.35);
}

.p-preview-label {
  color: var(--vp-c-brand-1);
  font-weight: 700;
  margin-bottom: 6px;
  font-size: 11px;
}

.p-preview-section pre {
  margin: 0;
  white-space: pre-wrap;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

.p-budget-bar {
  padding: 16px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.p-budget-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 8px;
  color: var(--vp-c-text-2);
}

.p-meter-bg {
  height: 8px;
  background: var(--vp-c-divider);
  border-radius: 999px;
  overflow: hidden;
}

.p-meter-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.p-meter-fill.brand {
  background: var(--vp-c-brand-1);
}

.p-meter-fill.warning {
  background: var(--vp-c-warning-1);
}

.p-meter-fill.danger {
  background: var(--vp-c-danger-1);
}

@media (max-width: 1100px) {
  .p-sidebar {
    width: 360px;
  }
}

@media (max-width: 960px) {
  .p-studio {
    min-height: 0;
  }

  .p-main {
    flex-direction: column;
  }

  .p-sidebar {
    width: 100%;
    border-top: 1px solid var(--vp-c-divider);
    border-left: none;
  }

  .p-editor {
    border-right: none;
  }
}
</style>
