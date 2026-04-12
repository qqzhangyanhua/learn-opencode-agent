<script setup lang="ts">
import { computed } from 'vue'
import { discoveryTopicCollections } from '../data/discovery-content.js'
import type { DiscoveryTopicHubProps } from './types'

const props = defineProps<DiscoveryTopicHubProps>()

const topics = computed(() => {
  if (!props.topicIds?.length) {
    return discoveryTopicCollections
  }

  return discoveryTopicCollections.filter((topic) => props.topicIds?.includes(topic.topicId))
})
</script>

<template>
  <section class="discovery-topic-hub">
    <article
      v-for="topic in topics"
      :key="topic.topicId"
      class="topic-card"
    >
      <div class="topic-copy">
        <p class="topic-kicker">按主题继续逛</p>
        <h3>{{ topic.title }}</h3>
        <p>{{ topic.summary }}</p>
      </div>

      <div class="topic-item-list">
        <a
          v-for="item in topic.items"
          :key="item.contentId"
          :href="item.href"
          class="topic-item"
        >
          <div class="topic-item-head">
            <span class="topic-item-title">{{ item.title }}</span>
            <DiscoveryTypeBadge :label="item.contentTypeLabel" />
          </div>
          <p>{{ item.summary }}</p>
        </a>
      </div>
    </article>
  </section>
</template>

<style scoped>
.discovery-topic-hub {
  display: grid;
  gap: 16px;
  margin: 12px 0 20px;
}

.topic-card {
  display: grid;
  gap: 8px;
}

.topic-copy h3,
.topic-copy p {
  margin: 0;
}

.topic-copy {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.topic-kicker {
  display: none;
}

.topic-copy h3 {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.topic-copy > p {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.topic-item-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 6px;
}

.topic-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  text-decoration: none;
  transition: background 0.15s;
}

.topic-item:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand-1);
}

.topic-item-head {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
}

.topic-item-title {
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
  font-weight: 500;
}

.topic-item p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  line-height: 1.5;
}
</style>
