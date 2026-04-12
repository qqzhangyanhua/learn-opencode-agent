---
layout: home
title: AI Agent 实战手册
description: 23 个项目，按章节拆解 TypeScript Agent 实现，从工具调用到生产部署全覆盖
pageClass: practice-page
---

<script setup>
import PracticeTerminalHero from '../../.vitepress/theme/components/PracticeTerminalHero.vue'
import PracticeRouteExplorer from '../../.vitepress/theme/components/PracticeRouteExplorer.vue'
import PracticeProjectSyllabus from '../../.vitepress/theme/components/PracticeProjectSyllabus.vue'

const bannerNextSteps = [
  { label: '选择适合你的学习路线', href: '#course-routes', hint: '根据你的背景和目标，选择最合适的起点。' }
]

const bannerSupportLinks = [
  { label: '回到发现中心', href: '/discover/', hint: '如果你还没决定是先做项目还是先补理论，先回统一入口重新判断。' },
  { label: '查看学习路径', href: '/learning-paths/', hint: '按“先看源码 / 先做项目 / 先补工程判断”三条路线重新选起点。' },
  { label: '完成基础后去中级篇', href: '/intermediate/', hint: '当你已经跑过基础项目并开始关心工程判断时，继续进入中级专题。' },
  { label: '回到阅读地图', href: '/reading-map', hint: '重新判断是否该先做项目，还是先回去补理论主链路。' }
]
</script>

<div class="practice-hero-section">

<PracticeTerminalHero />

# AI Agent 实战手册

**23 个项目 · 可跟练实现 · OpenAI SDK + TypeScript**

<div class="practice-actions">
  <a href="/practice/p01-minimal-agent/" class="btn-primary">开始学习</a>
  <a href="/practice/setup" class="btn-secondary">实践环境准备</a>
</div>

> 这里不是项目目录，而是整套 AI Agent 跟练课程的入口。第一次进入实践篇，推荐先在下面选一条路线；如果你还没准备好环境，再先看 [实践环境准备](/practice/setup)。

</div>

## 30 秒选一条起步路线 {#course-routes}

<PracticeRouteExplorer />

<EntryContextBanner
  section="实践篇"
  badge="当前位置"
  tone="practice"
  summary="你现在在全站的项目跟练入口。这里负责把OpenCode 拆解里抽象的 Agent 结构拆成可运行项目，并在完成基础闭环后把你送往中级专题。"
  :next-steps="bannerNextSteps"
  :support-links="bannerSupportLinks"
/>

<PracticeProjectSyllabus />

<style scoped>
.practice-hero-section {
  text-align: center;
  padding: 60px 24px 40px;
}

.practice-hero-section h1 {
  font-size: 2.4em;
  font-weight: 700;
  color: #f5f5f4;
  margin: 16px 0 8px;
  letter-spacing: -0.02em;
}

.practice-hero-section p {
  color: #a8a29e;
  font-size: 15px;
  margin-bottom: 28px;
}

.practice-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

.btn-primary {
  background: #ea580c;
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.2s, transform 0.2s;
}

.btn-primary:hover {
  background: #c2410c;
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  color: #a8a29e;
  border: 1px solid #44403c;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}

.btn-secondary:hover {
  border-color: #f97316;
  color: #f97316;
}
</style>
