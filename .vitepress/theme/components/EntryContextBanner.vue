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
  gap: 16px;
  margin: 24px 0 40px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--vp-c-divider);
  background:
    linear-gradient(180deg, rgba(13, 148, 136, 0.08), transparent 42%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.entry-context-banner.practice {
  background:
    linear-gradient(180deg, rgba(234, 88, 12, 0.12), transparent 42%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.entry-context-banner.intermediate {
  background:
    linear-gradient(180deg, rgba(59, 130, 246, 0.12), transparent 42%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.entry-context-main,
.entry-context-panel {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: rgba(255, 255, 255, 0.58);
}

.dark .entry-context-main,
.dark .entry-context-panel {
  background: rgba(15, 23, 42, 0.55);
}

.entry-context-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.entry-context-badge,
.entry-context-section {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.82rem;
  font-weight: 700;
}

.entry-context-badge {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.entry-context-banner.practice .entry-context-badge {
  background: rgba(234, 88, 12, 0.12);
  color: #c2410c;
}

.entry-context-banner.intermediate .entry-context-badge {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.entry-context-section {
  margin: 0;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.entry-context-summary {
  margin: 0;
  color: var(--vp-c-text-1);
  line-height: 1.85;
}

.entry-context-title {
  margin: 0 0 12px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.entry-context-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.entry-context-list li {
  display: grid;
  gap: 4px;
}

.entry-context-list a {
  color: var(--vp-c-text-1);
  font-weight: 700;
  text-decoration: none;
}

.entry-context-list a:hover {
  color: var(--vp-c-brand-1);
}

.entry-context-list span {
  color: var(--vp-c-text-2);
  line-height: 1.65;
  font-size: 0.92rem;
}

@media (max-width: 1100px) {
  .entry-context-banner {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .entry-context-banner {
    padding: 16px;
    margin-bottom: 32px;
  }

  .entry-context-main,
  .entry-context-panel {
    padding: 16px;
  }
}
</style>
