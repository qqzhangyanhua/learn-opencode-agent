import type { FlowScenario } from './flowScenario'

export const localCloudTopologyScenario: FlowScenario = {
  title: '本地与云端的产品拓扑',
  summary: '区分本地多入口、共享核心、本地 server、云端产品面与基础设施编排之间的真实边界。',
  lanes: [
    { id: 'local', label: '本地产品面' },
    { id: 'core', label: '共享核心' },
    { id: 'cloud', label: '云端产品面' },
    { id: 'infra', label: '基础设施' },
  ],
  steps: [
    {
      id: 'local-apps',
      title: '本地多入口',
      detail: '本地部分不是单一 CLI，而是 packages/opencode、packages/app、packages/desktop 三个入口围绕同一套核心语义展开。',
      lane: 'local',
      codeLabel: 'packages/opencode / packages/app / packages/desktop',
      emphasis: '关键认识：云端不是来替代本地 Agent，而是承接分享、同步、账号和控制台等产品能力。',
    },
    {
      id: 'server',
      title: '本地 server',
      detail: '本地 server 是多端共享的后端能力边界，TUI、Web、VS Code 扩展都复用它的服务语义。',
      lane: 'core',
      codeLabel: 'packages/opencode/src/server',
    },
    {
      id: 'function',
      title: 'packages/function',
      detail: '云端公共 API 面向分享、同步、WebSocket 与外部平台集成，不等同于本地 server。',
      lane: 'cloud',
      codeLabel: 'packages/function/src/api.ts',
    },
    {
      id: 'console',
      title: 'packages/console',
      detail: '控制台是另一条独立产品线，承担账户、工作区、计费、模型配置等云端产品职责。',
      lane: 'cloud',
      codeLabel: 'packages/console/app / core / function',
    },
    {
      id: 'infra',
      title: 'sst.config.ts / infra',
      detail: 'SST 和 Cloudflare 资源定义负责 stage 隔离、Worker、StaticSite、Durable Object 等基础设施编排。',
      lane: 'infra',
      codeLabel: 'sst.config.ts / infra/app.ts / Cloudflare',
      kind: 'commit',
    },
  ],
  edges: [
    { from: 'local-apps', to: 'server' },
    { from: 'server', to: 'function', style: 'dashed', label: '服务语义相关，但不是同一层' },
    { from: 'function', to: 'infra' },
    { from: 'console', to: 'infra' },
  ],
}
