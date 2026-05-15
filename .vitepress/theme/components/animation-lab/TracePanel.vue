<script setup lang="ts">
import type { ExperimentStep } from './type'

defineProps<{
  step: ExperimentStep
  stepIndex: number
  totalSteps: number
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <aside class="trace-panel" :class="{ collapsed }" aria-label="运行轨迹面板">
    <button
      class="trace-toggle"
      type="button"
      aria-controls="trace-panel-content"
      :aria-expanded="!collapsed"
      @click="emit('toggle')"
    >
      {{ collapsed ? '展开 Trace' : '收起 Trace' }}
    </button>

    <div v-if="collapsed" id="trace-panel-content" class="trace-rail">
      <span>{{ stepIndex + 1 }}/{{ totalSteps }}</span>
      <strong>{{ step.title }}</strong>
    </div>

    <div v-else id="trace-panel-content" class="trace-body">
      <p class="trace-kicker">TRACE {{ stepIndex + 1 }} / {{ totalSteps }}</p>
      <h3>{{ step.title }}</h3>
      <p>{{ step.description }}</p>
      <ol class="trace-events">
        <li
          v-for="event in step.traceEvents"
          :key="event.id"
          :class="['trace-event', event.type, event.status]"
        >
          <span>{{ event.type }}</span>
          <strong>{{ event.title }}</strong>
          <p>{{ event.detail }}</p>
        </li>
      </ol>
    </div>
  </aside>
</template>

<style scoped>
.trace-panel {
  width: min(360px, 100%);
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: #0b1120;
  color: #e5edf7;
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.24);
}

.trace-panel.collapsed {
  width: 96px;
}

.trace-toggle {
  width: 100%;
  min-height: 34px;
  border: 1px solid rgba(125, 211, 252, 0.32);
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.12);
  color: #dff7ff;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.trace-toggle:hover {
  border-color: rgba(125, 211, 252, 0.66);
  background: rgba(14, 165, 233, 0.2);
  color: #ffffff;
}

.trace-toggle:focus-visible {
  outline: 3px solid rgba(56, 189, 248, 0.44);
  outline-offset: 3px;
}

.trace-rail {
  display: grid;
  gap: 10px;
  justify-items: center;
  margin-top: 14px;
  min-width: 0;
  text-align: center;
}

.trace-rail span {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: #93c5fd;
}

.trace-rail strong {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: #f8fafc;
  font-size: 0.8rem;
  line-height: 1.35;
}

.trace-body {
  min-width: 0;
  margin-top: 18px;
}

.trace-kicker {
  margin: 0 0 8px;
  color: #7dd3fc;
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
}

.trace-body h3 {
  margin: 0;
  border: none;
  color: #f8fafc;
  font-size: 1rem;
  line-height: 1.35;
}

.trace-body > p:not(.trace-kicker) {
  margin: 10px 0 0;
  color: #b6c3d1;
  font-size: 0.84rem;
  line-height: 1.7;
}

.trace-events {
  display: grid;
  gap: 10px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.trace-event {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.82);
}

.trace-event.active {
  border-color: rgba(56, 189, 248, 0.56);
  background: rgba(8, 47, 73, 0.72);
}

.trace-event.done {
  border-color: rgba(45, 212, 191, 0.42);
}

.trace-event.pending {
  opacity: 0.68;
}

.trace-event > span {
  display: inline-flex;
  max-width: 100%;
  margin-bottom: 7px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.trace-event.input > span,
.trace-event.output > span {
  color: #bfdbfe;
}

.trace-event.tool-call > span,
.trace-event.observation > span {
  color: #99f6e4;
}

.trace-event.repair > span {
  color: #fecaca;
}

.trace-event strong {
  display: block;
  color: #f8fafc;
  font-size: 0.84rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.trace-event p {
  margin: 6px 0 0;
  color: #aebccd;
  font-size: 0.76rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .trace-panel,
  .trace-panel.collapsed {
    width: 100%;
  }

  .trace-panel {
    padding: 12px;
  }

  .trace-panel.collapsed {
    display: grid;
    grid-template-columns: minmax(112px, auto) minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .trace-panel.collapsed .trace-rail {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;
    margin-top: 0;
    min-width: 0;
    text-align: left;
  }

  .trace-panel.collapsed .trace-rail span {
    flex: 0 0 auto;
  }

  .trace-panel.collapsed .trace-rail strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
