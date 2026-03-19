<script setup lang="ts">
import type { RunCommandProps } from './types'
import { ref } from 'vue'

const props = defineProps<RunCommandProps>()

const copied = ref(false)

function copy() {
  if (typeof navigator === 'undefined') return
  navigator.clipboard.writeText(props.command).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  }).catch(() => {
    // clipboard API unavailable or permission denied — silently ignore
  })
}
</script>

<template>
  <div class="run-command">
    <span class="prompt">$</span>
    <code class="command-text">{{ command }}</code>
    <button class="copy-btn" @click="copy">
      {{ copied ? '已复制' : '复制' }}
    </button>
  </div>
</template>

<style scoped>
.run-command {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1c1917;
  border: 1px solid #292524;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 20px 0;
  font-family: monospace;
}

.prompt {
  color: #f97316;
  font-size: 14px;
  user-select: none;
}

.command-text {
  flex: 1;
  color: #f5f5f4;
  font-size: 14px;
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.copy-btn {
  background: #292524;
  color: #a8a29e;
  border: 1px solid #44403c;
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.copy-btn:hover {
  color: #f97316;
  border-color: #f97316;
}
</style>
