<script setup lang="ts">
interface EntryContextLink {
  label: string
  href: string
  hint: string
}

interface EntryContextBannerProps {
  section: string
  summary: string
  badge?: string
  tone?: 'theory' | 'practice' | 'intermediate' | 'neutral'
  nextSteps: EntryContextLink[]
  supportLinks?: EntryContextLink[]
}

const props = withDefaults(defineProps<EntryContextBannerProps>(), {
  badge: '当前位置',
  tone: 'neutral',
  supportLinks: () => []
})
</script>

<template>
  <section class="entry-context-banner" :class="props.tone">
    <div class="entry-context-main">
      <div class="entry-context-header">
        <span class="entry-context-badge">{{ props.badge }}</span>
        <p class="entry-context-section">{{ props.section }}</p>
      </div>

      <p class="entry-context-summary">{{ props.summary }}</p>
    </div>

    <div class="entry-context-panel">
      <p class="entry-context-title">推荐下一步</p>
      <ul class="entry-context-list">
        <li v-for="item in props.nextSteps" :key="`${props.section}-${item.href}`">
          <a :href="item.href">{{ item.label }}</a>
          <span>{{ item.hint }}</span>
        </li>
      </ul>
    </div>

    <div v-if="props.supportLinks.length" class="entry-context-panel support">
      <p class="entry-context-title">辅助入口</p>
      <ul class="entry-context-list">
        <li v-for="item in props.supportLinks" :key="`${props.section}-support-${item.href}`">
          <a :href="item.href">{{ item.label }}</a>
          <span>{{ item.hint }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.entry-context-banner {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin: 24px 0 40px;
  padding: 0;
  border: none;
  background: transparent;
}

.entry-context-main,
.entry-context-panel {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.entry-context-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.entry-context-badge,
.entry-context-section {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

.entry-context-badge {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.entry-context-banner.practice .entry-context-badge {
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
}

.entry-context-banner.intermediate .entry-context-badge {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.entry-context-section {
  margin: 0;
  background: transparent;
  color: var(--vp-c-text-1);
  font-weight: 700;
}

.entry-context-summary {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  font-size: 0.95rem;
}

.entry-context-title {
  margin: 0 0 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.entry-context-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.entry-context-list li {
  display: grid;
  gap: 3px;
}

.entry-context-list a {
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-decoration: none;
  font-size: 0.9rem;
}

.entry-context-list a:hover {
  color: var(--vp-c-brand-1);
}

.entry-context-list span {
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 0.85rem;
}

@media (max-width: 1100px) {
  .entry-context-banner {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .entry-context-banner {
    margin-bottom: 32px;
  }

  .entry-context-main,
  .entry-context-panel {
    padding: 14px;
  }
}
</style>
