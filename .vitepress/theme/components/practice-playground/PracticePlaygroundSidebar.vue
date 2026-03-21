<script setup lang="ts">
import type {
  PracticePlaygroundChapter,
  PracticePlaygroundChapterId,
} from './practicePlaygroundTypes'

defineProps<{
  chapters: PracticePlaygroundChapter[]
  selectedChapterId: PracticePlaygroundChapterId
}>()

const emit = defineEmits<{
  'select-chapter': [id: PracticePlaygroundChapterId]
}>()

function selectChapter(id: PracticePlaygroundChapterId) {
  emit('select-chapter', id)
}
</script>

<template>
  <aside class="playground-sidebar">
    <h2 class="sidebar-title">实践章节</h2>
    <ul class="chapter-list">
      <li v-for="chapter in chapters" :key="chapter.id">
        <button
          class="chapter-item"
          :class="{ active: chapter.id === selectedChapterId }"
          type="button"
          @click="selectChapter(chapter.id)"
        >
          <span class="chapter-number">{{ chapter.number }}</span>
          <span class="chapter-name">{{ chapter.title }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.playground-sidebar {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
  background: var(--vp-c-bg-soft);
}

.sidebar-title {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.chapter-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.chapter-item {
  width: 100%;
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 10px;
  text-align: left;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.chapter-item:hover {
  border-color: var(--vp-c-brand-1);
}

.chapter-item.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.chapter-number {
  font-weight: 600;
  min-width: 36px;
}

.chapter-name {
  font-size: 14px;
}
</style>
