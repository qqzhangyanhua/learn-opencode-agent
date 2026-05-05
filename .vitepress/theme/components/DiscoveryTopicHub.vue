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
  <div class="topic-hub">
    <section
      v-for="topic in topics"
      :key="topic.topicId"
      class="topic"
    >
      <h3>{{ topic.title }}</h3>
      <p class="summary">{{ topic.summary }}</p>
      <ul>
        <li v-for="item in topic.items" :key="item.contentId">
          <a :href="item.href">{{ item.title }}</a>
          <span>{{ item.summary }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.topic-hub {
  display: grid;
  gap: 18px;
  margin: 12px 0 24px;
}

.topic {
  display: grid;
  gap: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.topic:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.topic h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
  letter-spacing: 0;
}

.summary {
  margin: 0 0 4px;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  line-height: 1.6;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  line-height: 1.6;
}

li a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  flex-shrink: 0;
}

li a:hover {
  text-decoration: underline;
}

li span {
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}
</style>
