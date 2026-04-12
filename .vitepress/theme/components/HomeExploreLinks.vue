<template>
  <section class="explore-links">
    <div class="explore-section">
      <p class="explore-eyebrow">继续探索</p>
      <div class="explore-grid explore-grid-3">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="explore-card"
        >
          <span class="explore-card-title">{{ link.title }}</span>
          <span class="explore-card-desc">{{ link.desc }}</span>
        </a>
      </div>
    </div>

    <div class="explore-section">
      <p class="explore-eyebrow">延伸专栏</p>
      <div class="explore-grid explore-grid-3">
        <a
          v-for="link in seriesLinks"
          :key="link.href"
          :href="link.href"
          class="explore-card series"
        >
          <span class="explore-card-title">{{ link.title }}</span>
          <span class="explore-card-desc">{{ link.desc }}</span>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const navLinks = [
  { href: '/discover/', title: '发现中心', desc: '了解站点结构、技术栈和学习收益' },
  { href: '/learning-paths/', title: '学习路径', desc: '按目标选择完整学习路线' },
  { href: '/reading-map', title: '阅读地图', desc: '按主题或难度选择阅读顺序' },
]

const seriesLinks = [
  { href: '/claude-code/', title: 'Claude Code 架构思维', desc: '从源码视角理解 Claude Code 的设计决策' },
  { href: '/new-claude/', title: 'Claude Code 源码业务流', desc: '逐层拆解核心业务链路与执行流' },
  { href: '/hermes-agent/', title: 'Hermes Agent 拆解', desc: '真实商业 Agent 产品的工程实现分析' },
]
</script>

<style scoped>
.explore-links {
  margin: 40px 0 64px;
  display: grid;
  gap: 32px;
}

.explore-section {
  text-align: center;
}

.explore-eyebrow {
  margin: 0 0 16px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.explore-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.explore-card.series {
  border-color: rgba(99, 102, 241, 0.2);
  background: rgba(245, 245, 255, 0.55);
}

.explore-card.series:hover {
  background: rgba(245, 245, 255, 0.85);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.12);
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

html.dark .explore-card.series {
  background: rgba(10, 10, 25, 0.65);
  border-color: rgba(99, 102, 241, 0.25);
}

html.dark .explore-card.series:hover {
  background: rgba(99, 102, 241, 0.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 900px) {
  .explore-grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .explore-grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
