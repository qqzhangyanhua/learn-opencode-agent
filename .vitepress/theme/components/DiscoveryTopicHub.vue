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
  gap: 18px;
  margin: 24px 0 32px;
}

.topic-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: 24px;
  border: 1px solid var(--vp-c-divider);
  background:
    radial-gradient(circle at top left, rgba(13, 148, 136, 0.08), transparent 30%),
    linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--card-shadow-light);
}

.topic-copy h3,
.topic-copy p {
  margin: 0;
}

.topic-copy {
  display: grid;
  gap: 10px;
}

.topic-kicker {
  color: var(--vp-c-brand-1);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.topic-item-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.topic-item {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  text-decoration: none;
}

.topic-item:hover {
  border-color: var(--vp-c-brand-1);
}

.topic-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.topic-item-title {
  color: var(--vp-c-text-1);
  font-weight: 700;
}

.topic-item p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
</style>
