<script setup lang="ts">
defineProps<{
  jsonText: string
  jsonError: string
}>()

const emit = defineEmits<{
  'update:json-text': [value: string]
  'format-json': []
}>()
</script>

<template>
  <section class="json-editor">
    <div class="editor-toolbar">
      <p>原始 JSON 视图</p>
      <button type="button" class="ghost-button" @click="emit('format-json')">格式化 JSON</button>
    </div>

    <textarea
      class="json-textarea"
      :value="jsonText"
      spellcheck="false"
      @input="emit('update:json-text', ($event.target as HTMLTextAreaElement).value)"
    />

    <p v-if="jsonError" class="json-error">{{ jsonError }}</p>
    <p v-else class="json-tip">JSON 解析成功后，结构化视图与运行都会使用最新模板。</p>
  </section>
</template>

<style scoped>
.json-editor {
  display: grid;
  gap: 12px;
}

.editor-toolbar {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 12px 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 92%, white), var(--vp-c-bg-soft));
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.editor-toolbar p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.ghost-button {
  border-radius: 12px;
  padding: 9px 12px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg) 94%, white);
  cursor: pointer;
  font-weight: 600;
}

.json-textarea {
  min-height: 520px;
  width: 100%;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-bg-soft) 86%, white);
  padding: 14px 16px;
  font-family: 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.json-error,
.json-tip {
  margin: 0;
  font-size: 13px;
}

.json-error {
  color: #b42318;
}

.json-tip {
  color: var(--vp-c-text-2);
}
</style>
