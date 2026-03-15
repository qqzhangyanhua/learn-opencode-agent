<script setup lang="ts">
import type { LearningPhase } from './types'

const phases: LearningPhase[] = [
  {
    number: '阶段 1',
    title: '建立全局认知',
    description: '先看懂一次任务怎样跑完，再进入 Agent、工具和会话的内部结构。',
    goal: '把 CLI 入口、会话装配、工具循环和多端外壳放到同一张图里。',
    outcome: '看完后你应该能解释：为什么 OpenCode 不是单体 CLI，而是一套围绕运行时主链路组织的工程系统。',
    chapters: [
      { name: '01 Agent 基础架构', link: '/01-agent-basics/index' },
      { name: '02 Agent 核心系统', link: '/02-agent-core/index' },
      { name: '03 工具系统', link: '/03-tool-system/index' },
      { name: '04 会话管理', link: '/04-session-management/index' }
    ]
  },
  {
    number: '阶段 2',
    title: '进入运行时主链路',
    description: '理解模型、协议、HTTP 与存储怎样把这条主链路做成可运行产品。',
    goal: '把 provider、MCP、HTTP server 和持久化放回同一条请求路径里。',
    outcome: '看完后你应该能解释：一次请求怎样跨过模型抽象、服务边界和数据层，而不是停留在“调用了某个 API”。',
    chapters: [
      { name: '05 多模型支持', link: '/05-provider-system/index' },
      { name: '06 MCP 协议集成', link: '/06-mcp-integration/index' },
      { name: '08 HTTP API 服务器', link: '/08-http-api-server/index' },
      { name: '09 数据持久化', link: '/09-data-persistence/index' }
    ]
  },
  {
    number: '阶段 3',
    title: '理解交互与扩展',
    description: '把 TUI、多端界面、代码智能和扩展体系重新挂回同一后端语义。',
    goal: '理解用户是怎样通过终端、桌面、Web 和扩展生态与同一套运行时协作的。',
    outcome: '看完后你应该能解释：为什么“界面层”不是装饰，而是 Agent 可用性、协作性和扩展性的真实边界。',
    chapters: [
      { name: '07 TUI 终端界面', link: '/07-tui-interface/index' },
      { name: '10 多端 UI 开发', link: '/10-multi-platform-ui/index' },
      { name: '11 代码智能', link: '/11-code-intelligence/index' },
      { name: '12 插件与扩展', link: '/12-plugins-extensions/index' }
    ]
  },
  {
    number: '阶段 4',
    title: '完成工程化闭环',
    description: '最后再看部署、测试和长期演进，把“能跑”变成“能维护”。',
    goal: '把基础设施、质量保证和最佳实践看成工程收口，而不是附录。',
    outcome: '看完后你应该能解释：一个 AI Coding Agent 项目怎样从功能演示走到可发布、可验证、可持续迭代。',
    chapters: [
      { name: '13 部署与基础设施', link: '/13-deployment-infrastructure/index' },
      { name: '14 测试与质量保证', link: '/14-testing-quality/index' },
      { name: '15 高级主题与最佳实践', link: '/15-advanced-topics/index' }
    ]
  }
]
</script>

<template>
  <div class="path-container">
    <div
      v-for="(phase, index) in phases"
      :key="phase.number"
      class="phase-card"
    >
      <div v-if="index < phases.length - 1" class="phase-connector" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div class="phase-header">
        <span class="phase-number">{{ phase.number }}</span>
        <div class="phase-title-group">
          <h3 class="phase-title">{{ phase.title }}</h3>
          <span class="chapter-badge">{{ phase.chapters.length }} 章</span>
        </div>
      </div>

      <p class="phase-desc">{{ phase.description }}</p>

      <dl class="phase-outcomes" :aria-label="`${phase.title}学习目标`">
        <div>
          <dt>这一阶段要看懂</dt>
          <dd>{{ phase.goal }}</dd>
        </div>
        <div>
          <dt>看完后你应该能解释</dt>
          <dd>{{ phase.outcome }}</dd>
        </div>
      </dl>

      <ul class="chapter-list" :aria-label="`${phase.title}章节列表`">
        <li v-for="chapter in phase.chapters" :key="chapter.link">
          <a :href="chapter.link">
            <svg class="arrow-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ chapter.name }}</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.path-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 28px;
  margin-bottom: 60px;
  position: relative;
}

@media (max-width: 768px) {
  .path-container {
    grid-template-columns: 1fr;
  }
}

.phase-card {
  padding: 24px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  box-shadow: var(--card-shadow-light);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
  position: relative;
  overflow: hidden;
}

.phase-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--vp-c-brand-1), #3b82f6);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.phase-card:hover::before {
  opacity: 1;
}

.phase-card:hover {
  transform: translateY(-3px);
  border-color: rgba(13, 148, 136, 0.3);
  box-shadow: var(--card-shadow-hover);
}

.phase-connector {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  color: var(--vp-c-brand-1);
  opacity: 0.4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--vp-c-bg);
  border-radius: 50%;
}

@media (max-width: 768px) {
  .phase-connector {
    display: none;
  }
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.phase-number {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
  min-width: 3.8rem;
  opacity: 0.9;
}

.phase-title-group {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.phase-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.chapter-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.phase-desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
}

.phase-outcomes {
  display: grid;
  gap: 10px;
  margin: 0 0 16px;
}

.phase-outcomes div {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.phase-outcomes dt {
  margin: 0 0 6px;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.phase-outcomes dd {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.chapter-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chapter-list a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  line-height: 1.5;
}

.arrow-icon {
  flex-shrink: 0;
  color: var(--vp-c-brand-1);
  opacity: 0.35;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.chapter-list a:hover {
  color: var(--vp-c-brand-1);
}

.chapter-list a:hover .arrow-icon {
  opacity: 1;
  transform: translateX(1px);
}
</style>
