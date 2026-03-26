<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const stages = [
  {
    title: '图像先进入 content[]',
    items: ['image_url: dashboard.png', 'text: 这张图里的趋势是什么？'],
    cost: '约 420 tokens',
  },
  {
    title: '继续追加文字上下文',
    items: ['image_url: dashboard.png', 'text: 这张图里的趋势是什么？', 'text: 重点看 Q3 到 Q4 的变化'],
    cost: '约 455 tokens',
  },
  {
    title: '多图混合输入',
    items: ['image_url: dashboard.png', 'image_url: detail.png', 'text: 对比两张图的异常点'],
    cost: '约 860 tokens',
  },
]

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const active = computed(() => stages[current.value])

onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % stages.length
  }, 1700)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="mm-root">
    <div class="mm-header">
      <div class="mm-title">P13 图文消息是同一条 content[]</div>
      <div class="mm-cost">{{ active.cost }}</div>
    </div>

    <div class="mm-flow">
      <div class="mm-message">
        <div class="mm-role">role: user</div>
        <div class="mm-stage">{{ active.title }}</div>
        <div class="mm-items">
          <div
            v-for="item in active.items"
            :key="item"
            class="mm-item"
            :class="{ image: item.startsWith('image_url'), text: item.startsWith('text') }"
          >
            {{ item }}
          </div>
        </div>
      </div>

      <div class="mm-side">
        <div class="mm-card">
          <div class="mm-card-title">核心认知点</div>
          <div class="mm-card-text">模型看到的不是“图片附件”，而是带顺序的多模态内容数组。</div>
        </div>
        <div class="mm-card">
          <div class="mm-card-title">成本信号</div>
          <div class="mm-card-text">图片数量和尺寸一上来，token 成本会比纯文本增长更快。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mm-root {
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}
.mm-header,
.mm-flow {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.mm-header {
  align-items: center;
  margin-bottom: 1rem;
}
.mm-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.mm-cost {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
  font-size: 0.76rem;
  font-weight: 700;
}
.mm-message,
.mm-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}
.mm-message {
  flex: 1;
  padding: 1rem;
}
.mm-role {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.mm-stage {
  margin-top: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.mm-items {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.85rem;
}
.mm-item {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  font-size: 0.76rem;
  border: 1px solid var(--vp-c-divider);
}
.mm-item.image {
  background: rgba(245, 158, 11, 0.08);
  color: #b45309;
}
.mm-item.text {
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
}
.mm-side {
  width: 250px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.mm-card {
  padding: 0.85rem 0.9rem;
}
.mm-card-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.mm-card-text {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
@media (max-width: 768px) {
  .mm-flow {
    flex-direction: column;
  }
  .mm-side {
    width: auto;
  }
}
</style>
