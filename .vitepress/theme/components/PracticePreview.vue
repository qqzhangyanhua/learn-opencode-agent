<script setup lang="ts">
interface Props {
  theoryChapters?: number
  practiceProjects?: number
  practicePhases?: number
  intermediateChapters?: number
}

withDefaults(defineProps<Props>(), {
  theoryChapters: 16,
  practiceProjects: 23,
  practicePhases: 7,
  intermediateChapters: 8
})
</script>

<template>
  <div class="multi-track-container">
    <div class="track-card theory">
      <div class="track-header">
        <div class="track-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <h3>理论篇：源码剖析</h3>
      </div>
      <p class="track-subtitle">{{ theoryChapters }} 章深入解读 OpenCode 架构</p>
      <ul class="track-highlights">
        <li>Agent 核心机制与执行循环</li>
        <li>工具系统与权限管理</li>
        <li>多模型支持与 MCP 协议</li>
        <li>TUI/Web/Desktop 多端架构</li>
        <li>生产化部署与质量保证</li>
      </ul>
      <a href="/00-what-is-ai-agent/" class="track-btn">开始阅读 →</a>
    </div>

    <div class="track-card practice">
      <div class="track-header">
        <div class="track-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </div>
        <h3>实践篇：23 个项目</h3>
      </div>
      <p class="track-subtitle">{{ practiceProjects }} 个可运行示例 · {{ practicePhases }} 个阶段</p>
      <ul class="track-highlights">
        <li>从最小 Agent 到生产部署</li>
        <li>OpenAI SDK + TypeScript</li>
        <li>每章可独立运行验证</li>
        <li>完整 Code Review Agent 项目</li>
        <li>记忆系统、RAG、多 Agent 编排</li>
      </ul>
      <a href="/practice/" class="track-btn primary">立即动手 →</a>
    </div>

    <div class="track-card intermediate">
      <div class="track-header">
        <div class="track-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5Z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        </div>
        <h3>中级篇：工程落地</h3>
      </div>
      <p class="track-subtitle">{{ intermediateChapters }} 个生产环境实战专题</p>
      <ul class="track-highlights">
        <li>RAG 失效模式应对</li>
        <li>多智能体协作机制</li>
        <li>System Prompt 设计</li>
        <li>安全防注入与沙箱设计</li>
        <li>性能优化与成本控制</li>
      </ul>
      <a href="/intermediate/" class="track-btn intermediate-btn">深入架构 →</a>
    </div>
  </div>
</template>

<style scoped>
.multi-track-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin: 32px 0;
}

.track-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 28px;
  transition: all 0.3s ease;
}

.track-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.track-card.practice:hover {
  border-color: #ea580c;
}

.track-card.intermediate:hover {
  border-color: #8b5cf6;
}

.track-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.track-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-brand-1);
}

.track-card.practice .track-icon {
  color: #ea580c;
}

.track-card.intermediate .track-icon {
  color: #8b5cf6;
}

.track-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
}

.track-subtitle {
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

.track-highlights {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.track-highlights li {
  position: relative;
  padding-left: 20px;
  margin-bottom: 10px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
}

.track-highlights li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: var(--vp-c-brand-1);
  font-weight: bold;
}

.track-card.practice .track-highlights li::before {
  color: #ea580c;
}

.track-card.intermediate .track-highlights li::before {
  color: #8b5cf6;
}

.track-btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: transparent;
}

.track-btn:hover {
  background: var(--vp-c-brand-1);
  color: white;
  transform: translateX(2px);
}

.track-btn.primary {
  background: #ea580c;
  color: white;
  border-color: #ea580c;
}

.track-btn.primary:hover {
  background: #c2410c;
  border-color: #c2410c;
  transform: translateX(2px);
}

.track-btn.intermediate-btn {
  background: #8b5cf6;
  color: white;
  border-color: #8b5cf6;
}

.track-btn.intermediate-btn:hover {
  background: #7c3aed;
  border-color: #7c3aed;
  transform: translateX(2px);
}

@media (max-width: 768px) {
  .multi-track-container {
    grid-template-columns: 1fr;
  }

  .track-card {
    padding: 24px;
  }
}
</style>
