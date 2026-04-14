<template>
  <div class="ecs-root">
    <div class="ecs-header">
      <div>
        <div class="ecs-title">{{ titleText }}</div>
        <p class="ecs-summary">
          先不要急着看技术实现，先按“我要扩展什么能力”来选扩展方式。
          重点先分清：<code>Plugin</code> 解决的是新运行时能力，<code>Skill</code> 解决的是可复用工作流。
        </p>
      </div>
      <div class="ecs-badge">Ch12 · Extension</div>
    </div>

    <div class="ecs-flow-card">
      <div class="ecs-flow-head">
        <div class="ecs-flow-title">扩展选择主链</div>
        <p>从“我想扩展什么能力”出发，而不是先从技术形态出发。</p>
      </div>

      <div class="ecs-flow-chain">
        <div
          v-for="(step, index) in flowSteps"
          :key="step.id"
          class="ecs-flow-step"
          :class="{ active: index <= activeFlowIndex }"
        >
          <div class="ecs-flow-kicker">0{{ index + 1 }}</div>
          <div class="ecs-flow-name">{{ step.label }}</div>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </div>

    <div class="ecs-main">
      <div class="ecs-left">
        <div class="ecs-capability-panel">
          <div class="ecs-panel-title">我想扩展什么能力</div>
          <div class="ecs-capability-list">
            <button
              v-for="capability in capabilities"
              :key="capability.id"
              type="button"
              class="ecs-capability-btn"
              :class="{ active: activeCapabilityId === capability.id }"
              @click="changeCapability(capability.id)"
            >
              <span class="ecs-capability-icon">{{ capability.icon }}</span>
              <span class="ecs-capability-copy">
                <strong>{{ capability.label }}</strong>
                <small>{{ capability.question }}</small>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="ecs-center">
        <div class="ecs-recommend-card">
          <div class="ecs-recommend-head">
            <div>
              <div class="ecs-recommend-kicker">{{ activeCapability?.label }}</div>
              <div class="ecs-recommend-title">{{ activeRecommendation?.solution }}</div>
            </div>
            <span class="ecs-recommend-badge">{{ activeRecommendation?.tier }}</span>
          </div>

          <p class="ecs-recommend-summary">{{ activeRecommendation?.summary }}</p>

          <div class="ecs-recommend-grid">
            <article class="ecs-detail-card">
              <div class="ecs-detail-title">最短理解句</div>
              <p>{{ activeRecommendation?.explain }}</p>
            </article>
            <article class="ecs-detail-card">
              <div class="ecs-detail-title">仓库入口</div>
              <p>{{ activeRecommendation?.entry }}</p>
            </article>
            <article class="ecs-detail-card">
              <div class="ecs-detail-title">最容易混淆的方案</div>
              <p>{{ activeRecommendation?.confusion }}</p>
            </article>
            <article class="ecs-detail-card emphasis">
              <div class="ecs-detail-title">优先级建议</div>
              <p>{{ activeRecommendation?.priority }}</p>
            </article>
          </div>
        </div>
      </div>

      <div class="ecs-right">
        <div class="ecs-memory-grid">
          <article class="ecs-memory-card">
            <h4>这一类为什么首选这个方案</h4>
            <p>{{ recommendationForCapability(activeCapabilityId) }}</p>
          </article>
          <article class="ecs-memory-card">
            <h4>为什么不是 Plugin</h4>
            <p>{{ whyNotPlugin(activeCapabilityId) }}</p>
          </article>
          <article class="ecs-memory-card">
            <h4>为什么不是 Skill</h4>
            <p>{{ whyNotSkill(activeCapabilityId) }}</p>
          </article>
          <article class="ecs-memory-card">
            <h4>最后进入系统的哪个统一入口</h4>
            <p>{{ integrationBoundary(activeCapabilityId) }}</p>
          </article>
        </div>

        <div class="ecs-side-card">
          <div class="ecs-side-title">当前推荐</div>
          <div class="ecs-current-solution">{{ activeRecommendation?.solution }}</div>
          <p>{{ activeRecommendation?.summary }}</p>
        </div>

        <div class="ecs-side-card emphasis">
          <div class="ecs-side-title">一句话记忆</div>
          <p>扩展方式不是按高级不高级选，而是按你要扩展的能力落到最合适的运行时边界。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type CapabilityId = 'prompt' | 'workflow' | 'tool' | 'external' | 'editor'

interface CapabilityMeta {
  id: CapabilityId
  label: string
  icon: string
  question: string
}

interface CapabilityRecommendation {
  solution: string
  tier: string
  summary: string
  explain: string
  entry: string
  confusion: string
  priority: string
}

const titleText = '按能力选择扩展方式'

const flowSteps = [
  {
    id: 'capability',
    label: '我想扩展什么能力',
    description: '先从需求本身出发，而不是先从技术选型出发。'
  },
  {
    id: 'solution',
    label: '选对应扩展方式',
    description: '根据能力类型决定更适合 Plugin、Skill、Command、MCP 还是编辑器扩展。'
  },
  {
    id: 'boundary',
    label: '进入统一边界',
    description: '无论哪种方式，最后都要回到统一工具、命令或上下文入口。'
  }
] as const

const capabilities: CapabilityMeta[] = [
  { id: 'prompt', label: '复用提示词', icon: 'C', question: '我只是想复用一段固定提示词吗？' },
  { id: 'workflow', label: '固定工作流', icon: 'S', question: '我想让 Agent 学会一套稳定步骤吗？' },
  { id: 'tool', label: '新工具能力', icon: 'P', question: '我需要给 Agent 增加可执行能力吗？' },
  { id: 'external', label: '外部系统接入', icon: 'M', question: '我需要接 GitHub、Slack 或内部系统吗？' },
  { id: 'editor', label: '编辑器环境接入', icon: 'E', question: '我想把选区、文件、IDE 上下文送进 OpenCode 吗？' }
]

const recommendations: Record<CapabilityId, CapabilityRecommendation> = {
  prompt: {
    solution: 'Command',
    tier: '最低成本',
    summary: '高频复用的一段提示词，优先做成命令模板，而不是上升到 Skill 或 Plugin。',
    explain: 'Command 最适合“复用一段话”，它本质上是可发现、可列出、可调用的正式 Prompt 模板。',
    entry: '.opencode/command/*.md / packages/opencode/src/command/index.ts',
    confusion: '最容易误以为要写 Skill，但如果没有完整工作流和资源装载，先不要上升到 Skill。',
    priority: '先写 Command，成本最低，也最适合先建立扩展手感。'
  },
  workflow: {
    solution: 'Skill',
    tier: '推荐优先',
    summary: '当你想让 Agent 学会一整套稳定步骤时，首选 Skill，而不是直接写 Plugin。',
    explain: 'Skill 解决的是“怎么做”这类流程性知识，把一整套专用操作手册装进系统。',
    entry: '.opencode/skill/**/SKILL.md / packages/opencode/src/skill/skill.ts',
    confusion: '最容易和 Plugin 混淆，但 Skill 不提供新运行时代码能力，它主要注入流程和资源。',
    priority: '面对固定工作流，优先 Skill；只有真的需要执行新逻辑时才考虑 Plugin。'
  },
  tool: {
    solution: 'Plugin Tool',
    tier: '运行时能力',
    summary: '当你想给 Agent 多一个真正可执行的新能力时，才应该进入 Plugin Tool。',
    explain: 'Plugin Tool 解决的是“系统多一个能执行的能力”，例如认证、外部调用或新工具实现。',
    entry: 'packages/plugin/src/* / packages/opencode/src/plugin/index.ts / tool/registry.ts',
    confusion: '最容易和 Skill 混淆，但 Skill 只能教流程，不能替代一个新的运行时工具实现。',
    priority: '如果你要新增可执行能力，再进入 Plugin；否则别一上来就写插件。'
  },
  external: {
    solution: 'MCP 或 Plugin',
    tier: '按边界决定',
    summary: '外部系统接入优先看它是否已有标准化服务边界，有则 MCP，没有再考虑 Plugin。',
    explain: '如果能力天然适合通过外部 server 暴露，MCP 更标准；如果要深入介入本地运行时，再考虑 Plugin。',
    entry: 'mcp/index.ts / plugin/index.ts / tool/registry.ts',
    confusion: '最容易和 Plugin 混淆，关键看能力是“外部服务接入”还是“本地运行时代码扩展”。',
    priority: '先判断是否能走标准化外部接入，再决定是否需要本地插件逻辑。'
  },
  editor: {
    solution: '编辑器扩展',
    tier: '宿主集成',
    summary: '要把文件、选区、IDE 上下文送进 OpenCode，就该落到编辑器扩展，而不是 Skill 或 Plugin。',
    explain: '编辑器扩展解决的是“宿主环境接入”，本质是把 IDE 的上下文桥接给 OpenCode。',
    entry: 'sdks/vscode/src/extension.ts / packages/extensions/zed/',
    confusion: '最容易误以为要写 Plugin，但 Plugin 并不天然拥有 IDE 里的选区、文件树和编辑器交互能力。',
    priority: '只要需求中心在编辑器宿主环境，就直接走编辑器扩展。'
  }
}

const activeCapabilityId = ref<CapabilityId>('workflow')

const activeCapability = computed(() =>
  capabilities.find(capability => capability.id === activeCapabilityId.value) ?? capabilities[0]
)

const activeRecommendation = computed(() => recommendations[activeCapabilityId.value])
const activeFlowIndex = computed(() => 2)

function changeCapability(capabilityId: CapabilityId) {
  activeCapabilityId.value = capabilityId
}

function recommendationForCapability(capabilityId: CapabilityId) {
  const map: Record<CapabilityId, string> = {
    prompt: '因为这类需求本质上只是复用一段提示词，不需要新增运行时代码，也不需要完整工作流装载。',
    workflow: '因为这类需求核心是“教 Agent 按步骤做事”，最适合用 Skill 装载流程和资源，而不是先写运行时插件。',
    tool: '因为这类需求要给 Agent 真正新增一个可执行能力，所以必须落到 Plugin Tool 这类运行时扩展。',
    external: '因为这类需求的关键是把外部系统能力接进来，优先判断它是否适合走标准化 MCP 边界。',
    editor: '因为这类需求的核心在 IDE 宿主环境，不是 Agent 内部流程或工具能力本身。'
  }

  return map[capabilityId]
}

function whyNotPlugin(capabilityId: CapabilityId) {
  const map: Record<CapabilityId, string> = {
    prompt: '只是复用提示词时，直接写 Plugin 成本过高，会把本该是模板的东西升级成运行时代码。',
    workflow: '固定工作流最容易被误写成 Plugin，但如果不需要新代码能力，先写 Plugin 只会增加维护成本。',
    tool: '这一类反而就是 Plugin 最合适的场景，因为确实要新增运行时能力。',
    external: '不是所有外部系统接入都该先写 Plugin；如果已经可以通过标准 server 暴露，MCP 往往更合适。',
    editor: 'Plugin 不天然拥有 IDE 的宿主上下文，所以编辑器集成不该先落到 Plugin。'
  }

  return map[capabilityId]
}

function whyNotSkill(capabilityId: CapabilityId) {
  const map: Record<CapabilityId, string> = {
    prompt: '如果只是单段提示词复用，Skill 会显得过重，因为 Skill 更适合完整工作流而不是单条模板。',
    workflow: '这一类其实就是 Skill 最擅长的场景，因为它要解决的是工作流与操作手册。',
    tool: 'Skill 不能替代新的运行时代码能力，它只能教模型流程，不能真正提供一个工具实现。',
    external: '外部系统接入如果需要真实调用能力，Skill 只能讲方法，不能替代连接与执行本身。',
    editor: 'Skill 只能增强 Agent 的流程理解，不能桥接编辑器里的文件、选区和宿主事件。'
  }

  return map[capabilityId]
}

function integrationBoundary(capabilityId: CapabilityId) {
  const map: Record<CapabilityId, string> = {
    prompt: '最终会进入 Command.list() 这类统一命令入口，作为正式可发现的命令模板被消费。',
    workflow: '最终会被 Skill 系统装载，并进一步汇入命令入口或通过 SkillTool 被 Agent 调用。',
    tool: '最终仍然要进入 tool/registry.ts 这类统一工具边界，不能绕开权限和会话系统直接挂逻辑。',
    external: '最终不是走 MCP 的 tool/prompt 边界，就是回到本地统一工具注册边界。',
    editor: '最终会通过编辑器扩展把宿主环境上下文送入 OpenCode，再进入统一会话和命令链。'
  }

  return map[capabilityId]
}
</script>

<style scoped>
.ecs-root {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 20px;
  margin: 24px 0;
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.08), transparent 26%),
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 94%, white), var(--vp-c-bg));
  font-size: 13px;
  display: grid;
  gap: 16px;
}

.ecs-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.ecs-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.ecs-summary {
  margin: 8px 0 0;
  max-width: 56rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.ecs-summary code {
  font-family: var(--vp-font-family-mono);
}

.ecs-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
}

.ecs-flow-card,
.ecs-capability-panel,
.ecs-recommend-card,
.ecs-memory-card,
.ecs-side-card,
.ecs-detail-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-bg) 95%, white);
  padding: 14px;
}

.ecs-flow-head {
  display: grid;
  gap: 6px;
}

.ecs-flow-title,
.ecs-panel-title,
.ecs-side-title,
.ecs-detail-title,
.ecs-memory-card h4 {
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
}

.ecs-flow-head p,
.ecs-memory-card p,
.ecs-side-card p,
.ecs-detail-card p,
.ecs-recommend-summary {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.ecs-flow-chain {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.ecs-flow-step {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 12px;
  opacity: 0.55;
}

.ecs-flow-step.active {
  opacity: 1;
  border-color: rgba(249, 115, 22, 0.45);
  background: rgba(249, 115, 22, 0.08);
}

.ecs-flow-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #c2410c;
  text-transform: uppercase;
}

.ecs-flow-name {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.ecs-flow-step p {
  margin: 8px 0 0;
}

.ecs-main {
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.1fr) minmax(300px, 0.9fr);
  gap: 16px;
}

.ecs-capability-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.ecs-capability-btn {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.ecs-capability-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(249, 115, 22, 0.35);
}

.ecs-capability-btn.active {
  border-color: rgba(249, 115, 22, 0.55);
  background: rgba(249, 115, 22, 0.08);
}

.ecs-capability-icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.ecs-capability-copy {
  display: grid;
  gap: 4px;
}

.ecs-capability-copy strong {
  color: var(--vp-c-text-1);
}

.ecs-capability-copy small {
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.ecs-recommend-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.ecs-recommend-kicker {
  font-size: 12px;
  font-weight: 700;
  color: #c2410c;
}

.ecs-recommend-title {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.ecs-recommend-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  white-space: nowrap;
}

.ecs-recommend-summary {
  margin: 12px 0 0;
}

.ecs-recommend-grid,
.ecs-memory-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ecs-detail-card.emphasis,
.ecs-side-card.emphasis {
  background:
    linear-gradient(135deg, rgba(249, 115, 22, 0.08), transparent 70%),
    color-mix(in srgb, var(--vp-c-bg) 95%, white);
}

.ecs-memory-card p {
  margin: 8px 0 0;
}

.ecs-current-solution {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

@media (max-width: 1400px) {
  .ecs-main {
    grid-template-columns: 1fr;
  }

  .ecs-left,
  .ecs-center,
  .ecs-right {
    max-width: 100%;
  }
}

@media (max-width: 760px) {
  .ecs-flow-chain,
  .ecs-recommend-grid,
  .ecs-memory-grid {
    grid-template-columns: 1fr;
  }

  .ecs-root {
    padding: 16px;
  }
}
</style>
