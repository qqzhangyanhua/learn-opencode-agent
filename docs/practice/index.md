---
layout: home
title: AI Agent 实战手册
description: 23 个项目，每章一个可运行的 TypeScript Agent，从工具调用到生产部署全覆盖
pageClass: practice-page
---

<script setup>
import PracticeTerminalHero from '../../.vitepress/theme/components/PracticeTerminalHero.vue'
import PracticePhaseGrid from '../../.vitepress/theme/components/PracticePhaseGrid.vue'
import PracticeTagCloud from '../../.vitepress/theme/components/PracticeTagCloud.vue'
</script>

<div class="practice-hero-section">

<PracticeTerminalHero />

# AI Agent 实战手册

**23 个项目 · 每章可运行 · Anthropic SDK + TypeScript**

<div class="practice-actions">
  <a href="/practice/p01-minimal-agent/" class="btn-primary">▶ bun run p01</a>
  <a href="#phases" class="btn-secondary">课程大纲</a>
  <a href="/" class="btn-secondary">← 返回理论篇</a>
</div>

</div>

## 课程阶段 {#phases}

<PracticePhaseGrid :phases="[
  { id: 1, title: 'Agent 基础', subtitle: '工具调用 / 多轮对话 / 流式输出 / 错误处理', chapterCount: 4, link: '/practice/p01-minimal-agent/' },
  { id: 2, title: '记忆与知识', subtitle: '记忆系统 / 记忆增强检索 / RAG / GraphRAG', chapterCount: 5, link: '/practice/p05-memory-arch/' },
  { id: 3, title: '推理与规划', subtitle: 'ReAct Loop / Planning / Reflection', chapterCount: 3, link: '/practice/p10-react-loop/' },
  { id: 4, title: '感知扩展', subtitle: '多模态智能体 / MCP 协议接入', chapterCount: 2, link: '/practice/p13-multimodal/' },
  { id: 5, title: '多 Agent 协作', subtitle: '编排模式 / 子 Agent / 通信协议', chapterCount: 3, link: '/practice/p15-multi-agent/' },
  { id: 6, title: '生产化', subtitle: '模型路由 / 安全 / 可观测性 / 评估', chapterCount: 4, link: '/practice/p18-model-routing/' },
  { id: 7, title: '综合实战', subtitle: 'Code Review Agent 完整项目 / 部署清单', chapterCount: 2, link: '/practice/p22-project/' },
]" />

## 技术覆盖

<PracticeTagCloud :tags="[
  'Anthropic SDK', 'Tool Calling', 'Streaming', 'Multi-turn',
  'Memory System', 'RAG', 'GraphRAG', 'Hybrid Retrieval',
  'ReAct', 'Planning', 'Reflection', 'Multimodal',
  'MCP', 'Multi-Agent', 'Cost Control', 'Security',
  'Observability', 'Evaluation', 'Production Deploy',
]" />

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
