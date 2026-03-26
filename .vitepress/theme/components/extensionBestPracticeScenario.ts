import type { FlowScenario } from './flowScenario'

export const extensionBestPracticeScenario: FlowScenario = {
  title: '扩展最佳实践清单',
  summary: '把新增 Agent、Tool、Hook 的典型接线方式，以及调试、测试和生产约束，压成一条最小可执行清单。',
  lanes: [
    { id: 'agent', label: '新增 Agent' },
    { id: 'tool', label: '新增 Tool' },
    { id: 'hook', label: '新增 Hook' },
    { id: 'verify', label: '验证与生产' },
  ],
  steps: [
    {
      id: 'agent',
      title: '新增 Agent',
      detail: '先写 Agent 工厂，再接 builtin-agents 与 schema。只读 Agent 要用 createAgentToolRestrictions 约束，而不是只靠 prompt 口头说明。',
      lane: 'agent',
      codeLabel: 'src/agents/reviewer.ts / builtin-agents.ts / agent-names.ts',
      emphasis: '关键点：prompt metadata 决定编排器会不会想到这个 Agent。',
    },
    {
      id: 'tool',
      title: '新增 Tool',
      detail: '先实现工具，再注册到工具表。description 要对 AI 友好，注册名通常用 snake_case，敏感信息从环境变量读取。',
      lane: 'tool',
      codeLabel: 'src/tools/github-pr/index.ts / src/plugin/tool-registry.ts',
    },
    {
      id: 'hook',
      title: '新增 Hook',
      detail: '先找同层 Hook 做模板，再新增模块、注册到 create-xxx-hooks.ts，并把名字补进 HookNameSchema。',
      lane: 'hook',
      codeLabel: 'src/hooks/* / create-session-hooks.ts / HookNameSchema',
    },
    {
      id: 'verify',
      title: '调试与测试',
      detail: '用 /tmp/oh-my-opencode.log、doctor、bun test 和配置文件做最小验证，优先确认插件已加载、接口已注册、Hook 确实被调用。',
      lane: 'verify',
      codeLabel: '/tmp/oh-my-opencode.log / bunx oh-my-opencode doctor / bun test',
    },
    {
      id: 'prod',
      title: '生产约束',
      detail: '并发、模型成本和 disabled_hooks / disabled_agents 都是生产配置的一部分，不能只看功能能不能跑通。',
      lane: 'verify',
      codeLabel: 'background_task.concurrency_limits / categories / disabled_*',
      kind: 'commit',
    },
  ],
  edges: [
    { from: 'agent', to: 'tool' },
    { from: 'tool', to: 'hook' },
    { from: 'hook', to: 'verify' },
    { from: 'verify', to: 'prod' },
  ],
}
