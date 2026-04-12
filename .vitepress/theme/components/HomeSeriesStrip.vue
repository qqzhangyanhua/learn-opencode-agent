<template>
  <section class="series-strip">
    <p class="series-eyebrow">精选专栏</p>
    <div class="series-grid">
      <a
        v-for="item in series"
        :key="item.href"
        :href="item.href"
        class="series-card"
      >
        <span class="series-card-label">{{ item.label }}</span>
        <span class="series-card-title">{{ item.title }}</span>
        <span class="series-card-desc">{{ item.desc }}</span>
        <span class="series-card-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </span>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
const series = [
  {
    label: 'Claude Code 系列 · 一',
    title: 'Claude Code 架构思维',
    desc: '从源码视角理解 Claude Code 的设计决策与核心模式',
    href: '/claude-code/',
  },
  {
    label: 'Claude Code 系列 · 二',
    title: 'Claude Code 源码业务流',
    desc: '逐层拆解 Agent 主链路、工具调度与会话管理的执行流',
    href: '/new-claude/',
  },
  {
    label: '商业 Agent 拆解',
    title: 'Hermes Agent 拆解',
    desc: '真实商业 Agent 产品的工程实现：架构、记忆与多模态接入',
    href: '/hermes-agent/',
  },
]
</script>

<style scoped>
.series-strip {
  margin: -8px 0 48px;
  text-align: center;
}

.series-eyebrow {
  margin: 0 0 16px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.series-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.series-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 20px 16px;
  border-radius: 16px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%);
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
  text-align: left;
}

.series-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.series-card:hover {
  transform: translateY(-3px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 8px 28px rgba(99, 102, 241, 0.12);
}

.series-card:hover::before {
  opacity: 1;
}

.series-card-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #6366f1;
  text-transform: uppercase;
}

.series-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.series-card-desc {
  font-size: 0.83rem;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.series-card-arrow {
  display: flex;
  align-items: center;
  margin-top: 8px;
  color: #6366f1;
  opacity: 0.5;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.series-card:hover .series-card-arrow {
  opacity: 1;
  transform: translateX(4px);
}

html.dark .series-card {
  border-color: rgba(99, 102, 241, 0.25);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%);
}

html.dark .series-card:hover {
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
}

@media (max-width: 768px) {
  .series-grid {
    grid-template-columns: 1fr;
  }

  .series-strip {
    margin-bottom: 36px;
  }
}
</style>
