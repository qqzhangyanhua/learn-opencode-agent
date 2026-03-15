<script setup lang="ts">
import { computed } from 'vue'
import type { SourceSnapshotCardProps } from './types'

const props = withDefaults(defineProps<SourceSnapshotCardProps>(), {
  title: '源码快照',
  description: '这一章基于同一份 OpenCode 源码基线阅读，先抓这几个入口文件，再沿主链路进入正文。'
})

const shortCommit = computed(() => props.commit.slice(0, 12))
</script>

<template>
  <section class="snapshot-card" :aria-label="title">
    <header class="snapshot-header">
      <div>
        <p class="snapshot-eyebrow">Source baseline</p>
        <h3 class="snapshot-title">{{ title }}</h3>
      </div>
      <p class="snapshot-description">{{ description }}</p>
    </header>

    <dl class="snapshot-meta">
      <div class="snapshot-meta-item">
        <dt>基线仓库</dt>
        <dd>
          <a v-if="repoUrl" :href="repoUrl">{{ repo }}</a>
          <span v-else>{{ repo }}</span>
        </dd>
      </div>
      <div class="snapshot-meta-item">
        <dt>基线分支</dt>
        <dd><code>{{ branch }}</code></dd>
      </div>
      <div class="snapshot-meta-item">
        <dt>基线 commit</dt>
        <dd>
          <code :title="commit">{{ shortCommit }}</code>
        </dd>
      </div>
      <div class="snapshot-meta-item">
        <dt>验证日期</dt>
        <dd>{{ verifiedAt }}</dd>
      </div>
    </dl>

    <div class="snapshot-entries">
      <h4>本章关键入口</h4>
      <ul>
        <li v-for="entry in entries" :key="entry.path">
          <a v-if="entry.href" :href="entry.href">
            <span class="entry-label">{{ entry.label }}</span>
            <code>{{ entry.path }}</code>
          </a>
          <div v-else class="entry-static">
            <span class="entry-label">{{ entry.label }}</span>
            <code>{{ entry.path }}</code>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.snapshot-card {
  margin: 28px 0 36px;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, rgba(13, 148, 136, 0.04) 100%);
  box-shadow: var(--card-shadow-light);
}

.snapshot-header {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.snapshot-eyebrow {
  margin: 0 0 6px;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.snapshot-title {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
  border: none;
}

.snapshot-description {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  max-width: 780px;
}

.snapshot-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 0 0 22px;
}

.snapshot-meta-item {
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
}

.snapshot-meta-item dt {
  margin: 0 0 6px;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.snapshot-meta-item dd {
  margin: 0;
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.snapshot-meta-item a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.snapshot-meta-item a:hover {
  text-decoration: underline;
}

.snapshot-entries h4 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.snapshot-entries ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.snapshot-entries li {
  margin: 0;
}

.snapshot-entries a,
.entry-static {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  text-decoration: none;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.snapshot-entries a:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
  box-shadow: var(--card-shadow-hover);
}

.entry-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.snapshot-entries code {
  color: var(--vp-c-text-2);
  word-break: break-all;
}

@media (max-width: 640px) {
  .snapshot-card {
    padding: 20px;
  }

  .snapshot-meta {
    grid-template-columns: 1fr;
  }
}
</style>
