<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
}>()

const tone = computed(() => {
  if (props.label === '实践项目') return 'practice'
  if (props.label === '进阶专题') return 'intermediate'
  if (props.label === '辅助页面') return 'support'
  return 'theory'
})
</script>

<template>
  <span class="discovery-type-badge" :class="tone">
    {{ label }}
  </span>
</template>

<style scoped>
.discovery-type-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.discovery-type-badge.practice {
  color: #c2410c;
  background: rgba(234, 88, 12, 0.12);
}

.discovery-type-badge.intermediate {
  color: #2563eb;
  background: rgba(59, 130, 246, 0.12);
}

.discovery-type-badge.support {
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
}
</style>
