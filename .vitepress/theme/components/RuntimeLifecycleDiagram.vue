<script setup lang="ts">
import { computed } from 'vue'
import type { RuntimeLifecycleDiagramProps, RuntimeLifecycleStep } from './types'

const defaultSteps: RuntimeLifecycleStep[] = [
  {
    key: 'prompt',
    title: 'Prompt 输入',
    summary: '用户提出任务，系统先把输入整理成可消费的消息。',
    detail: '入口通常从 CLI、TUI 或 HTTP 请求开始，先决定本轮任务到底要解决什么。'
  },
  {
    key: 'session',
    title: 'Agent / Session',
    summary: '会话装配 Agent、权限、系统提示词和当前上下文。',
    detail: '这里决定角色、模式、消息历史和是否需要继续恢复已有状态。'
  },
  {
    key: 'tools',
    title: 'Tool dispatch',
    summary: '模型拿到可用工具后，进入工具调用与结果回写循环。',
    detail: '工具不是附属物，而是运行时主链路里最容易扩张成本和风险的边界。'
  },
  {
    key: 'provider',
    title: 'Provider / Model',
    summary: 'Provider 抽象把具体模型接进统一的流式执行接口。',
    detail: '这里处理模型解析、认证、参数绑定和多提供商差异。'
  },
  {
    key: 'side-effects',
    title: 'File / Terminal / LSP',
    summary: '真正改变系统状态的地方发生在文件、终端和代码智能能力上。',
    detail: '这是工程边界，不是文案边界；一旦进入这里，就需要权限和恢复机制兜底。'
  },
  {
    key: 'feedback',
    title: 'Result / UI feedback',
    summary: '结果被写回消息流，再反馈到 CLI、TUI、Web 或桌面界面。',
    detail: '这一步决定用户看到的是最终答案、流式事件，还是下一轮可恢复的状态。'
  }
]

const props = withDefaults(defineProps<RuntimeLifecycleDiagramProps>(), {
  title: '全书统一运行时主链路',
  description: '后续 15 篇其实都在拆这条链路的不同片段。先把总图记住，再进入各章细节。',
  highlightKeys: () => []
})

const highlightedKeys = computed(() => new Set(props.highlightKeys))
const resolvedSteps = computed(() => props.steps ?? defaultSteps)
</script>

<template>
  <section class="runtime-diagram" :aria-label="title">
    <header class="runtime-header">
      <p class="runtime-eyebrow">Runtime lifecycle</p>
      <h3 class="runtime-title">{{ title }}</h3>
      <p class="runtime-description">{{ description }}</p>
    </header>

    <ol class="runtime-steps">
      <li
        v-for="(step, index) in resolvedSteps"
        :key="step.key"
        class="runtime-step"
        :class="{ 'is-highlighted': highlightedKeys.has(step.key) }"
      >
        <div class="step-marker" aria-hidden="true">{{ index + 1 }}</div>
        <div class="step-body">
          <div class="step-header">
            <h4>{{ step.title }}</h4>
            <span v-if="highlightedKeys.has(step.key)" class="step-status">推荐先读</span>
            <span class="step-key">{{ step.key }}</span>
          </div>
          <p class="step-summary">{{ step.summary }}</p>
          <p class="step-detail">{{ step.detail }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.runtime-diagram {
  margin: 28px 0 40px;
}

.runtime-header {
  margin-bottom: 22px;
}

.runtime-eyebrow {
  margin: 0 0 6px;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.runtime-title {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
  border: none;
}

.runtime-description {
  margin: 10px 0 0;
  max-width: 780px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.runtime-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}

.runtime-step {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(13, 148, 136, 0.06);
}

.runtime-step.is-highlighted {
  border-color: rgba(13, 148, 136, 0.45);
  background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, rgba(13, 148, 136, 0.08) 100%);
}

.step-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.step-header h4 {
  margin: 0;
  font-size: 1rem;
}

.step-status,
.step-key {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  font-size: 0.72rem;
}

.step-status {
  background: rgba(13, 148, 136, 0.12);
  border-color: rgba(13, 148, 136, 0.28);
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.step-key {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.step-summary,
.step-detail {
  margin: 0;
  line-height: 1.7;
}

.step-summary {
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.step-detail {
  margin-top: 6px;
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .runtime-step {
    grid-template-columns: 1fr;
  }

  .step-marker {
    width: 44px;
    height: 44px;
  }
}

html.dark .runtime-step {
  background: rgba(6, 22, 21, 0.65);
  border-color: rgba(13, 148, 136, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

html.dark .runtime-step.is-highlighted {
  background: rgba(13, 148, 136, 0.15);
  border-color: rgba(13, 148, 136, 0.4);
}
</style>

