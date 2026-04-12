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
  margin: 20px 0 36px;
  padding: 16px 20px;
  border-left: 3px solid var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  border-radius: 0 6px 6px 0;
}

.entry-context-banner.intermediate {
  border-left-color: #3b82f6;
}

.entry-context-banner.practice {
  border-left-color: #ea580c;
}

.entry-context-main {
  margin-bottom: 14px;
}

.entry-context-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.entry-context-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.entry-context-banner.intermediate .entry-context-badge {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.entry-context-banner.practice .entry-context-badge {
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
}

.entry-context-section {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.entry-context-summary {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.entry-context-panel {
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 12px;
  margin-top: 12px;
}

.entry-context-title {
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.entry-context-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
}

.entry-context-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entry-context-list a {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.entry-context-list a:hover {
  color: var(--vp-c-brand-1);
}

.entry-context-list span {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  line-height: 1.5;
}
</style>
