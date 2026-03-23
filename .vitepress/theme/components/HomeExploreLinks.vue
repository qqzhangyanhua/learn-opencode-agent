<template>
  <section class="explore-links">
    <p class="explore-eyebrow">继续探索</p>
    <div class="explore-grid">
      <a
        v-for="link in links"
        :key="link.href"
        :href="link.href"
        class="explore-card"
      >
        <span class="explore-card-title">{{ link.title }}</span>
        <span class="explore-card-desc">{{ link.desc }}</span>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
const links = [
  { href: '/discover/', title: '发现中心', desc: '了解站点结构、技术栈和学习收益' },
  { href: '/learning-paths/', title: '学习路径', desc: '按目标选择完整学习路线' },
  { href: '/reading-map', title: '阅读地图', desc: '按主题或难度选择阅读顺序' },
]
</script>

<style scoped>
.explore-links {
  margin: 40px 0 64px;
  text-align: center;
}

.explore-eyebrow {
  margin: 0 0 20px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.explore-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.explore-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.06);
}

.explore-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.12);
}

.explore-card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.explore-card-desc {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

html.dark .explore-card {
  background: rgba(6, 22, 21, 0.65);
  border-color: rgba(13, 148, 136, 0.2);
}

html.dark .explore-card:hover {
  background: rgba(13, 148, 136, 0.12);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 900px) {
  .explore-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .explore-grid {
    grid-template-columns: 1fr;
  }
}
</style>
