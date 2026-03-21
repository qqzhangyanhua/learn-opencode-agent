<script setup lang="ts">
import { reactive } from 'vue'
import type {
  PracticePlaygroundTemplate,
  PracticeTemplateMessage,
  PracticeTemplateRole,
  PracticeTemplateTool,
} from './practicePlaygroundTypes'

const MESSAGE_ROLE_OPTIONS: PracticeTemplateRole[] = ['system', 'user', 'assistant', 'tool']

const props = defineProps<{
  template: PracticePlaygroundTemplate
  defaultTemplate: PracticePlaygroundTemplate
}>()

const emit = defineEmits<{
  'update:template': [template: PracticePlaygroundTemplate]
}>()

const toolParameterErrors = reactive<Record<number, string>>({})

function emitTemplate(template: PracticePlaygroundTemplate) {
  emit('update:template', template)
}

function createMessage(): PracticeTemplateMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    content: '',
  }
}

function createTool(): PracticeTemplateTool {
  return {
    type: 'function',
    function: {
      name: 'custom_tool',
      description: '',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  }
}

function isLockedTool(index: number): boolean {
  return Boolean(props.defaultTemplate.tools[index]?.locked)
}

function isToolNameLocked(index: number): boolean {
  return Boolean(props.defaultTemplate.tools[index]?.locked?.name)
}

function isToolParametersLocked(index: number): boolean {
  return Boolean(props.defaultTemplate.tools[index]?.locked?.parameters)
}

function updateSystem(value: string) {
  emitTemplate({
    ...props.template,
    system: value,
  })
}

function updateMessage(
  index: number,
  patch: Partial<PracticeTemplateMessage> & Pick<PracticeTemplateMessage, 'role'>,
) {
  const nextMessages = props.template.messages.map((message, messageIndex) => {
    if (messageIndex !== index) return message

    if (patch.role === 'tool') {
      return {
        ...message,
        ...patch,
        role: 'tool',
        toolCallId: patch.toolCallId ?? ('toolCallId' in message ? message.toolCallId : ''),
      }
    }

    return {
      ...message,
      ...patch,
      role: patch.role,
    }
  })

  emitTemplate({
    ...props.template,
    messages: nextMessages,
  })
}

function addMessage() {
  emitTemplate({
    ...props.template,
    messages: [...props.template.messages, createMessage()],
  })
}

function removeMessage(index: number) {
  emitTemplate({
    ...props.template,
    messages: props.template.messages.filter((_, messageIndex) => messageIndex !== index),
  })
}

function updateTool(index: number, tool: PracticeTemplateTool) {
  const nextTools = props.template.tools.map((currentTool, toolIndex) => {
    return toolIndex === index ? tool : currentTool
  })

  emitTemplate({
    ...props.template,
    tools: nextTools,
  })
}

function addTool() {
  emitTemplate({
    ...props.template,
    tools: [...props.template.tools, createTool()],
  })
}

function removeTool(index: number) {
  if (isLockedTool(index)) return

  emitTemplate({
    ...props.template,
    tools: props.template.tools.filter((_, toolIndex) => toolIndex !== index),
  })
}

function updateToolDescription(index: number, value: string) {
  const currentTool = props.template.tools[index]
  updateTool(index, {
    ...currentTool,
    function: {
      ...currentTool.function,
      description: value,
    },
  })
}

function updateToolName(index: number, value: string) {
  if (isToolNameLocked(index)) return

  const currentTool = props.template.tools[index]
  updateTool(index, {
    ...currentTool,
    function: {
      ...currentTool.function,
      name: value,
    },
  })
}

function updateToolType(index: number, value: string) {
  if (isLockedTool(index)) return

  const currentTool = props.template.tools[index]
  updateTool(index, {
    ...currentTool,
    type: value === 'function' ? 'function' : currentTool.type,
  })
}

function updateToolParameters(index: number, value: string) {
  if (isToolParametersLocked(index)) return

  try {
    const parameters = JSON.parse(value) as Record<string, unknown>
    delete toolParameterErrors[index]
    const currentTool = props.template.tools[index]
    updateTool(index, {
      ...currentTool,
      function: {
        ...currentTool.function,
        parameters,
      },
    })
  } catch (error) {
    toolParameterErrors[index] = error instanceof Error ? error.message : '参数 JSON 解析失败'
  }
}

function updateStream(value: boolean) {
  emitTemplate({
    ...props.template,
    requestOptions: {
      ...props.template.requestOptions,
      stream: value,
    },
  })
}

function updateTemperature(value: string) {
  emitTemplate({
    ...props.template,
    requestOptions: {
      ...props.template.requestOptions,
      temperature: value === '' ? undefined : Number(value),
    },
  })
}

function updateMaxTokens(value: string) {
  emitTemplate({
    ...props.template,
    requestOptions: {
      ...props.template.requestOptions,
      maxTokens: value === '' ? undefined : Number(value),
    },
  })
}

function updateToolChoice(value: string) {
  emitTemplate({
    ...props.template,
    requestOptions: {
      ...props.template.requestOptions,
      toolChoice: value.trim() || undefined,
    },
  })
}
</script>

<template>
  <section class="structured-editor">
    <section class="editor-block">
      <div class="block-header">
        <h3>System</h3>
      </div>
      <textarea
        class="field-textarea"
        :value="template.system"
        placeholder="填写章节共享的 system 提示词"
        @input="updateSystem(($event.target as HTMLTextAreaElement).value)"
      />
    </section>

    <section class="editor-block">
      <div class="block-header">
        <h3>Messages</h3>
        <button type="button" class="ghost-button" @click="addMessage">新增消息</button>
      </div>

      <article
        v-for="(message, index) in template.messages"
        :key="message.id"
        class="card"
      >
        <div class="card-toolbar">
          <strong>消息 {{ index + 1 }}</strong>
          <button type="button" class="ghost-button" @click="removeMessage(index)">删除</button>
        </div>

        <label class="field">
          <span>role</span>
          <select
            :value="message.role"
            @change="
              updateMessage(index, {
                ...message,
                role: ($event.target as HTMLSelectElement).value as PracticeTemplateRole,
              })
            "
          >
            <option
              v-for="role in MESSAGE_ROLE_OPTIONS"
              :key="role"
              :value="role"
            >
              {{ role }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>content</span>
          <textarea
            class="field-textarea"
            :value="message.content"
            @input="
              updateMessage(index, {
                ...message,
                role: message.role,
                content: ($event.target as HTMLTextAreaElement).value,
              })
            "
          />
        </label>

        <label v-if="message.role === 'tool'" class="field">
          <span>toolCallId</span>
          <input
            type="text"
            :value="message.toolCallId || ''"
            @input="
              updateMessage(index, {
                ...message,
                role: 'tool',
                toolCallId: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>
      </article>
    </section>

    <section class="editor-block">
      <div class="block-header">
        <h3>Tools</h3>
        <button type="button" class="ghost-button" @click="addTool">新增工具</button>
      </div>

      <article
        v-for="(tool, index) in template.tools"
        :key="`${tool.function.name}-${index}`"
        class="card"
      >
        <div class="card-toolbar">
          <strong>工具 {{ index + 1 }}</strong>
          <button
            type="button"
            class="ghost-button"
            :disabled="isLockedTool(index)"
            @click="removeTool(index)"
          >
            {{ isLockedTool(index) ? '本章锁定' : '删除工具' }}
          </button>
        </div>

        <label class="field">
          <span>type</span>
          <input
            type="text"
            :value="tool.type"
            :readonly="isLockedTool(index)"
            @change="updateToolType(index, ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="field">
          <span>function.name</span>
          <input
            type="text"
            :value="tool.function.name"
            :readonly="isToolNameLocked(index)"
            @input="updateToolName(index, ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="field">
          <span>function.description</span>
          <textarea
            class="field-textarea"
            :value="tool.function.description"
            @input="updateToolDescription(index, ($event.target as HTMLTextAreaElement).value)"
          />
        </label>

        <label class="field">
          <span>function.parameters</span>
          <textarea
            class="field-textarea code-field"
            :value="JSON.stringify(tool.function.parameters, null, 2)"
            :readonly="isToolParametersLocked(index)"
            @change="updateToolParameters(index, ($event.target as HTMLTextAreaElement).value)"
          />
          <small v-if="toolParameterErrors[index]" class="field-error">
            {{ toolParameterErrors[index] }}
          </small>
          <small v-else-if="isToolParametersLocked(index)" class="field-tip">
            本章参数结构已锁定，仅供查看。
          </small>
        </label>
      </article>
    </section>

    <section class="editor-block">
      <div class="block-header">
        <h3>Request Options</h3>
      </div>

      <div class="options-grid">
        <label class="field checkbox-field">
          <span>stream</span>
          <input
            type="checkbox"
            :checked="Boolean(template.requestOptions.stream)"
            @change="updateStream(($event.target as HTMLInputElement).checked)"
          />
        </label>

        <label class="field">
          <span>temperature</span>
          <input
            type="number"
            step="0.1"
            min="0"
            :value="template.requestOptions.temperature ?? ''"
            @input="updateTemperature(($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="field">
          <span>maxTokens</span>
          <input
            type="number"
            min="1"
            :value="template.requestOptions.maxTokens ?? ''"
            @input="updateMaxTokens(($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="field">
          <span>toolChoice</span>
          <input
            type="text"
            :value="template.requestOptions.toolChoice ?? ''"
            placeholder="auto / none / 自定义"
            @input="updateToolChoice(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </section>
  </section>
</template>

<style scoped>
.structured-editor {
  display: grid;
  gap: 16px;
}

.editor-block {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 92%, white), var(--vp-c-bg-soft));
  display: grid;
  gap: 12px;
}

.block-header,
.card-toolbar {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.block-header h3,
.card-toolbar strong {
  margin: 0;
  font-size: 16px;
  letter-spacing: -0.01em;
}

.card {
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-divider));
  border-radius: 16px;
  padding: 14px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  display: grid;
  gap: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg-soft) 88%, white);
  padding: 10px 12px;
}

.field-textarea {
  min-height: 110px;
  resize: vertical;
}

.code-field {
  font-family: 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
}

.ghost-button {
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  cursor: pointer;
  font-weight: 600;
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-error,
.field-tip {
  font-size: 12px;
}

.field-error {
  color: #b42318;
}

.field-tip {
  color: var(--vp-c-text-2);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.checkbox-field {
  align-content: start;
}

.checkbox-field input {
  width: auto;
}

@media (max-width: 700px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
}
</style>
