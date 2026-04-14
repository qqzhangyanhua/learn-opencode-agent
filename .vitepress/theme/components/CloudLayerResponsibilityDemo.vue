<template>
  <div class="clrd-root">
    <div class="clrd-header">
      <div>
        <div class="clrd-title">账号能力穿过哪几层</div>
        <p class="clrd-summary">
          不要先把这些目录都看成“云端后端”。先顺着同一条账号、订阅、模型配置链路，
          看清 <code>function</code>、<code>console</code>、<code>infra</code> 和
          <code>containers / CI</code> 分别负责什么。
        </p>
      </div>
      <div class="clrd-badge">Ch13 · Cloud Layer</div>
    </div>

    <div class="clrd-memory-banner">
      function 负责公共 API，console 负责账号与商业化域，两者不是一回事。
    </div>

    <div class="clrd-main">
      <div class="clrd-left">
        <div class="clrd-panel-title">能力主链</div>
        <div class="clrd-stage-list">
          <button
            v-for="(stage, index) in stages"
            :key="stage.id"
            type="button"
            class="clrd-stage-btn"
            :class="{
              active: activeStageId === stage.id,
              passed: index < activeIndex
            }"
            @click="changeStage(stage.id)"
          >
            <div class="clrd-stage-kicker">0{{ index + 1 }}</div>
            <div class="clrd-stage-copy">
              <div class="clrd-stage-name">{{ stage.chainLabel }}</div>
              <p>{{ stage.chainDescription }}</p>
            </div>
          </button>
        </div>
      </div>

      <div class="clrd-center">
        <div class="clrd-panel-title">当前层判断</div>
        <article class="clrd-focus-card">
          <div class="clrd-focus-kicker">{{ activeStage.chainLabel }}</div>
          <h3>{{ activeStage.title }}</h3>
          <p class="clrd-focus-summary">{{ activeStage.summary }}</p>

          <div class="clrd-focus-grid">
            <article class="clrd-focus-item">
              <div class="clrd-focus-label">这一层最关键的作用</div>
              <p>{{ activeStage.mainAction }}</p>
            </article>
            <article class="clrd-focus-item">
              <div class="clrd-focus-label">为什么不能由下一层替它做</div>
              <p>{{ activeStage.boundaryReason }}</p>
            </article>
          </div>
        </article>
      </div>

      <div class="clrd-right">
        <div class="clrd-panel-title">固定记忆面板</div>
        <div class="clrd-memory-grid">
          <article class="clrd-memory-card">
            <h4>负责什么</h4>
            <p>{{ activeStage.responsibility }}</p>
          </article>
          <article class="clrd-memory-card">
            <h4>不负责什么</h4>
            <p>{{ activeStage.nonResponsibility }}</p>
          </article>
          <article class="clrd-memory-card">
            <h4>典型文件</h4>
            <ul>
              <li v-for="file in activeStage.files" :key="file">{{ file }}</li>
            </ul>
          </article>
        </div>

        <div class="clrd-warning-card">
          <div class="clrd-warning-title">最易混淆提醒</div>
          <p>{{ activeStage.warning }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type StageId = 'need' | 'function' | 'console' | 'infra' | 'delivery'

interface StageMeta {
  id: StageId
  chainLabel: string
  chainDescription: string
  title: string
  summary: string
  mainAction: string
  boundaryReason: string
  responsibility: string
  nonResponsibility: string
  files: string[]
  warning: string
}

const stages: StageMeta[] = [
  {
    id: 'need',
    chainLabel: '需求出现',
    chainDescription: '用户要管账号、订阅、模型配置，先识别这是不是控制台业务域问题。',
    title: '用户要管账号、订阅、模型配置',
    summary: '这是一个云端产品域需求，不是本地 Agent runtime 自己就能解决的问题。',
    mainAction: '先判断这件事属于账号与商业化能力，读者的注意力应该先落到 console 业务域，而不是本地 CLI 或部署细节。',
    boundaryReason: '如果一开始就跳去看 infra 或容器，读者只会记住“怎么部署”，却记不住“为什么要有这一层产品职责”。',
    responsibility: '识别这是账号与商业化相关需求，明确后续应该沿着云端产品层去找答案。',
    nonResponsibility: '不直接决定怎么部署，也不等于本地 Agent 的运行时逻辑。',
    files: ['章节对 packages/console 职责的文字说明'],
    warning: '先分清这是不是控制台业务域问题，再决定往哪一层继续读。'
  },
  {
    id: 'function',
    chainLabel: 'function',
    chainDescription: '公共 API 先把请求接进系统，但它不是账号与商业化业务域本身。',
    title: 'function 提供公共 API 接口',
    summary: '`packages/function` 负责把请求接进云端产品面，处理分享、同步、集成等公共 API。',
    mainAction: '承接公共 API 请求，让外部世界能通过统一入口访问云端产品能力。',
    boundaryReason: '下一层 console 处理的是账号、订阅、工作区等业务规则，不应该反过来替代公共 API 入口。',
    responsibility: '负责公共 API、同步、分享、外部集成入口。',
    nonResponsibility: '不负责账户域模型、订阅计费和控制台业务规则。',
    files: ['packages/function/src/api.ts'],
    warning: 'function 不是 console 的轻量版后端，它解决的是公共 API 问题。'
  },
  {
    id: 'console',
    chainLabel: 'console',
    chainDescription: '真正承接账号、订阅、模型配置等业务域的是 console 产品层。',
    title: 'console 才是账号与商业化业务域',
    summary: '`packages/console` 是独立产品线，不是普通 API 的附属层。',
    mainAction: '承接账号、工作区、订阅、计费、模型配置这些真正的云端业务规则与数据模型。',
    boundaryReason: '下一层 infra 只把资源编排出来，并不定义账户体系、计费规则或模型配置策略。',
    responsibility: '负责账号、工作区、订阅、计费和模型配置等业务域能力。',
    nonResponsibility: '不替代本地 Agent runtime，也不负责统一资源编排。',
    files: ['packages/console/app', 'packages/console/core', 'packages/console/function'],
    warning: 'console 是独立产品层，不是给本地 Agent 打杂的一组云函数。'
  },
  {
    id: 'infra',
    chainLabel: 'infra',
    chainDescription: '业务层确定后，infra 再把 Worker、站点、数据库和认证资源编排起来。',
    title: 'infra 编排资源，不定义业务规则',
    summary: '`sst.config.ts` 和 `infra/*.ts` 负责 stage、资源拓扑和部署边界。',
    mainAction: '把 function 和 console 落成真实可部署的云资源，并保持 stage、域名和依赖关系清晰。',
    boundaryReason: '下一层 containers / CI 只负责稳定构建和交付，不能反过来决定资源拓扑或业务边界。',
    responsibility: '负责 stage、资源编排、部署拓扑和云资源连接。',
    nonResponsibility: '不定义账号订阅规则，也不承接产品业务语义。',
    files: ['sst.config.ts', 'infra/app.ts', 'infra/console.ts'],
    warning: 'infra 负责把业务层部署出来，但它自己不是业务层。'
  },
  {
    id: 'delivery',
    chainLabel: 'containers / CI',
    chainDescription: '最后一层只负责构建、打包和发布，把前面几层稳定送出去。',
    title: 'containers / CI 负责稳定交付',
    summary: '交付层解决的是“怎么稳定发布”，而不是“系统该怎么分层”。',
    mainAction: '把前面几层已有的职责结果通过构建环境、镜像和流水线稳定交付出去。',
    boundaryReason: '它已经是最后一层，不能再承担业务边界或资源定义，否则系统职责会完全混乱。',
    responsibility: '负责构建环境、镜像、发布链路和持续交付。',
    nonResponsibility: '不负责 API 边界，不决定产品职责，也不定义资源拓扑。',
    files: ['packages/containers'],
    warning: 'containers / CI 解决的是怎么交付，不是系统应该怎么分层。'
  }
]

const activeStageId = ref<StageId>('need')

const activeStage = computed(
  () => stages.find((stage) => stage.id === activeStageId.value) ?? stages[0]
)

const activeIndex = computed(() =>
  stages.findIndex((stage) => stage.id === activeStageId.value)
)

function changeStage(stageId: StageId) {
  activeStageId.value = stageId
}
</script>

<style scoped>
.clrd-root {
  margin: 24px 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0)),
    var(--vp-c-bg-soft);
}

.clrd-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.clrd-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.clrd-summary {
  margin: 8px 0 0;
  max-width: 760px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.clrd-badge {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
  font-size: 12px;
  font-weight: 700;
}

.clrd-memory-banner {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.2);
  color: var(--vp-c-text-1);
  font-weight: 600;
  line-height: 1.6;
}

.clrd-main {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.1fr) minmax(260px, 0.9fr);
  gap: 18px;
  margin-top: 18px;
}

.clrd-panel-title {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.clrd-stage-list {
  display: grid;
  gap: 10px;
}

.clrd-stage-btn {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
}

.clrd-stage-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(14, 165, 233, 0.35);
}

.clrd-stage-btn.active {
  border-color: rgba(14, 165, 233, 0.45);
  background: rgba(14, 165, 233, 0.08);
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.08);
}

.clrd-stage-btn.passed:not(.active) {
  background: rgba(15, 23, 42, 0.02);
}

.clrd-stage-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #0284c7;
}

.clrd-stage-copy strong,
.clrd-stage-name {
  display: block;
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.clrd-stage-copy p,
.clrd-stage-btn p {
  margin: 6px 0 0;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.clrd-focus-card,
.clrd-warning-card,
.clrd-memory-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg);
}

.clrd-focus-card {
  padding: 18px;
}

.clrd-focus-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0284c7;
}

.clrd-focus-card h3 {
  margin: 8px 0 0;
  font-size: 22px;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}

.clrd-focus-summary {
  margin: 10px 0 0;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.clrd-focus-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.clrd-focus-item {
  padding: 14px;
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}

.clrd-focus-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.clrd-focus-item p {
  margin: 8px 0 0;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.clrd-memory-grid {
  display: grid;
  gap: 12px;
}

.clrd-memory-card {
  padding: 14px;
}

.clrd-memory-card h4 {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.clrd-memory-card p,
.clrd-memory-card ul {
  margin: 8px 0 0;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.clrd-memory-card ul {
  padding-left: 18px;
}

.clrd-warning-card {
  margin-top: 12px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.08), rgba(249, 115, 22, 0.03));
}

.clrd-warning-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #c2410c;
}

.clrd-warning-card p {
  margin: 8px 0 0;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}

@media (max-width: 1100px) {
  .clrd-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .clrd-root {
    padding: 16px;
  }

  .clrd-header {
    flex-direction: column;
  }

  .clrd-title {
    font-size: 18px;
  }
}
</style>
