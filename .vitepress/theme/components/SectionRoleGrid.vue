<script setup lang="ts">
import { computed } from 'vue'
import { data as contentIndex } from '../data/content-index.data.js'
import type { SectionRoleGridProps } from './types'

const props = defineProps<SectionRoleGridProps>()

const sections = computed(() => props.sections ?? contentIndex.sectionIndex)
</script>

<template>
  <div class="section-grid">
    <article
      v-for="section in sections"
      :key="section.sectionId"
      class="section-card"
    >
      <div class="section-meta">
        <span class="section-mode">{{ contentIndex.sectionById[section.sectionId].entryMode }}</span>
        <span class="section-count">{{ section.countLabel }}</span>
      </div>
      <h3 class="section-title">{{ section.title }}</h3>
      <p class="section-description">{{ section.roleDescription }}</p>
      <a :href="section.recommendedStart" class="section-link">从这里开始</a>
    </article>
  </div>
</template>

<style scoped>
.section-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0 48px;
}

@media (max-width: 960px) {
  .section-grid {
    grid-template-columns: 1fr;
  }
}

.section-card {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.section-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 0.75rem;
}

.section-mode,
.section-count {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
}

.section-mode {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-count {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.section-title {
  margin: 0 0 10px;
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
}

.section-description {
  margin: 0 0 16px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.section-link {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: none;
}

.section-link:hover {
  text-decoration: underline;
}
</style>
