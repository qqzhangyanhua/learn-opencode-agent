<template>
  <section class="lsp-flow-root">
    <div class="lsp-flow-header">
      <div>
        <p class="lsp-flow-kicker">Ch11 · LSP</p>
        <h3>LSP 拉起与诊断主链</h3>
      </div>
      <p>
        一次 <code>edit</code> 写文件后，OpenCode 不是等待用户手动编译，而是把文件变更交给 LSP，
        再把诊断结果送回修复链。
      </p>
    </div>

    <div class="lsp-flow-chain" aria-label="LSP 诊断主链">
      <button
        v-for="(stage, index) in stages"
        :key="stage.id"
        type="button"
        class="lsp-flow-stage"
        :class="{ active: activeStageId === stage.id }"
        @click="changeStage(stage.id)"
      >
        <span class="lsp-flow-index">{{ index + 1 }}</span>
        <span>{{ stage.label }}</span>
      </button>
    </div>

    <div class="lsp-flow-body">
      <article class="lsp-flow-main">
        <div class="lsp-flow-main-head">
          <span>{{ activeStage?.label }}</span>
          <strong>{{ activeStage?.owner }}</strong>
        </div>
        <p>{{ activeStage?.detail }}</p>
        <div class="lsp-flow-code">
          {{ activeStage?.code }}
        </div>
      </article>

      <aside class="lsp-flow-memory" aria-label="LSP 记忆字段">
        <article>
          <h4>谁负责把文件变更交给 LSP</h4>
          <p>{{ flowStageLabel('handoff') }}</p>
        </article>
        <article>
          <h4>getClients() 真正在解决什么问题</h4>
          <p>{{ flowStageLabel('clients') }}</p>
        </article>
        <article>
          <h4>为什么不是启动时就拉起所有语言服务器</h4>
          <p>{{ flowStageLabel('lazy') }}</p>
        </article>
        <article>
          <h4>诊断出来后怎么进入后续修复链</h4>
          <p>{{ flowStageLabel('repair') }}</p>
        </article>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type StageId = 'edit' | 'touch' | 'clients' | 'spawn' | 'change' | 'diagnostics'
type MemoryKey = 'handoff' | 'clients' | 'lazy' | 'repair'

interface FlowStage {
  id: StageId
  label: string
  owner: string
  detail: string
  code: string
}

const stages: FlowStage[] = [
  {
    id: 'edit',
    label: 'edit 写文件',
    owner: 'tool/edit.ts',
    detail: '工具先完成真实文件写入。只有文件内容发生变化，后面的诊断链才有输入。',
    code: 'write file -> collect diff'
  },
  {
    id: 'touch',
    label: 'touchFile',
    owner: 'LSP.touchFile',
    detail: 'edit 工具调用 touchFile，把被修改的文件路径交给 LSP 子系统，并决定是否等待诊断。',
    code: 'LSP.touchFile(file, true)'
  },
  {
    id: 'clients',
    label: 'getClients',
    owner: 'lsp/index.ts',
    detail: 'getClients 按扩展名、项目根目录和已启动状态找到该文件应该使用的语言服务器。',
    code: 'getClients(file) -> matching clients'
  },
  {
    id: 'spawn',
    label: '启动/复用客户端',
    owner: 'LSP state',
    detail: '已有客户端直接复用；没有客户端时才按需启动，并用 spawning 防止并发重复启动。',
    code: 'reuse client | spawn language server'
  },
  {
    id: 'change',
    label: 'didChange',
    owner: 'LSPClient',
    detail: '客户端把最新文件内容通过 textDocument/didChange 推给语言服务器。',
    code: 'textDocument/didChange'
  },
  {
    id: 'diagnostics',
    label: 'publishDiagnostics',
    owner: 'Language Server',
    detail: '语言服务器返回诊断后，edit 工具把错误附加到工具结果，模型继续修复。',
    code: 'publishDiagnostics -> edit output'
  }
]

const activeStageId = ref<StageId>('edit')
const activeStage = computed(() => stages.find((stage) => stage.id === activeStageId.value))

function changeStage(stageId: StageId) {
  activeStageId.value = stageId
}

function flowStageLabel(key: MemoryKey) {
  const labels: Record<MemoryKey, string> = {
    handoff: 'edit 工具负责在写文件后调用 LSP.touchFile，把文件变更交给 LSP 子系统。',
    clients: 'getClients() 解决的是“这个文件应该由哪个语言服务器处理，以及是否已有可复用客户端”。',
    lazy: '语言服务器按文件类型和项目根目录懒加载，避免启动时拉起所有语言服务器造成成本和噪音。',
    repair: 'publishDiagnostics 进入诊断缓存后，edit 工具把错误附加到返回值，模型在同一轮继续修复。'
  }

  return labels[key]
}
</script>

<style scoped>
.lsp-flow-root {
  margin: 24px 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.lsp-flow-header {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(260px, 1.2fr);
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.lsp-flow-kicker {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.lsp-flow-header h3,
.lsp-flow-header p {
  margin: 0;
}

.lsp-flow-chain {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.lsp-flow-stage {
  display: grid;
  gap: 6px;
  min-height: 74px;
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.lsp-flow-stage.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
  background: var(--vp-c-brand-soft);
}

.lsp-flow-index {
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.lsp-flow-body {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(260px, 0.9fr);
  gap: 16px;
}

.lsp-flow-main,
.lsp-flow-memory article {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.lsp-flow-main {
  padding: 16px;
}

.lsp-flow-main-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.lsp-flow-main-head span {
  font-weight: 700;
}

.lsp-flow-main-head strong {
  color: var(--vp-c-brand-1);
}

.lsp-flow-code {
  margin-top: 14px;
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-code-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.lsp-flow-memory {
  display: grid;
  gap: 10px;
}

.lsp-flow-memory article {
  padding: 12px;
}

.lsp-flow-memory h4 {
  margin: 0 0 6px;
  font-size: 13px;
}

.lsp-flow-memory p {
  margin: 0;
  color: var(--vp-c-text-2);
}

@media (max-width: 760px) {
  .lsp-flow-header,
  .lsp-flow-body {
    grid-template-columns: 1fr;
  }

  .lsp-flow-chain {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
