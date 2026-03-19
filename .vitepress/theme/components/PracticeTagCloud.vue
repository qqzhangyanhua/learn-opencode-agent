<script setup lang="ts">
import type { PracticeTagCloudProps } from './types'

defineProps<PracticeTagCloudProps>()
</script>

<template>
  <div class="tag-cloud">
    <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
  </div>
</template>

<style scoped>
.tag-cloud {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.tag {
  background: #1c1917;
  color: #f97316;
  border: 1px solid #292524;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  transition: border-color 0.15s;
}

.tag:hover {
  border-color: #f97316;
}
</style>
