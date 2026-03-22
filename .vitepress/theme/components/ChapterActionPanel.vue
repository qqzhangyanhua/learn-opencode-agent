<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as contentIndex } from '../data/content-index.data.js'
import type { ChapterActionItem, ChapterActionPanelProps } from './types'

const props = withDefaults(defineProps<ChapterActionPanelProps>(), {
  title: '读完这一章，下一步做什么',
  actionItems: () => []
})

const { frontmatter } = useData()

function normalizePathList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function resolveNodeByUrl(url: string) {
  return contentIndex.contentNodes.find((node) => node.url === url) ?? null
}

const recommendedItems = computed<ChapterActionItem[]>(() => {
  const links = [
    ...normalizePathList(frontmatter.value.recommendedNext),
    ...normalizePathList(frontmatter.value.practiceLinks)
  ]

  const seen = new Set<string>()

  return links.flatMap((href) => {
    if (seen.has(href)) {
      return []
    }
    seen.add(href)

    const node = resolveNodeByUrl(href)
    if (!node) {
      return [{ title: href, description: '继续沿学习路径进入下一章或对应入口。', href }]
    }

    const section = contentIndex.sectionById[node.sectionId]

    return [{
      title: node.navigationLabel || node.shortTitle || node.title,
      description: `${section.title} · ${node.roleDescription}`,
      href
    }]
  })
})

const actionItems = computed(() => props.actionItems)
</script>

<template>
  <section class="chapter-action-panel">
    <div class="action-panel-column">
      <h2>{{ title }}</h2>
      <ul class="action-list">
        <li v-for="item in recommendedItems" :key="`${item.title}-${item.href}`">
          <a v-if="item.href" :href="item.href">{{ item.title }}</a>
          <span v-else>{{ item.title }}</span>
          <p>{{ item.description }}</p>
        </li>
      </ul>
    </div>

    <div class="action-panel-column">
      <h2>本章行动任务</h2>
      <ul class="action-list">
        <li v-for="item in actionItems" :key="`${item.title}-${item.description}`">
          <a v-if="item.href" :href="item.href">{{ item.title }}</a>
          <span v-else>{{ item.title }}</span>
          <p>{{ item.description }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.chapter-action-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 40px 0 24px;
}

.action-panel-column {
  padding: 20px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.action-panel-column h2 {
  margin: 0 0 14px;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
}

.action-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 14px;
}

.action-list li {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}

.action-list a,
.action-list span {
  display: inline-block;
  margin-bottom: 6px;
  color: var(--vp-c-text-1);
  font-weight: 700;
  text-decoration: none;
}

.action-list a:hover {
  color: var(--vp-c-brand-1);
}

.action-list p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

@media (max-width: 960px) {
  .chapter-action-panel {
    grid-template-columns: 1fr;
  }
}
</style>
