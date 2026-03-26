import type { FlowScenario } from './flowScenario'

export const toolExecutionLifecycleScenario: FlowScenario = {
  title: '工具执行主链路',
  summary: '把 tool_call 如何经过 registry、权限门卫、execute 和输出截断，最终回到 LLM 的全过程串成一条可读链路。',
  lanes: [
    { id: 'llm', label: 'LLM / Assistant' },
    { id: 'processor', label: 'processor.ts' },
    { id: 'registry', label: 'Tool Registry' },
    { id: 'permission', label: 'Permission' },
    { id: 'tool', label: 'Tool.define' },
  ],
  steps: [
    {
      id: 'tool-call',
      title: '生成 tool_call',
      detail: 'LLM 根据 description 和 parameters 决定调用哪个工具，并产出 name + args。',
      lane: 'llm',
      codeLabel: 'session/processor.ts',
      emphasis: '这章最容易忽略的点：工具是否会被调用，很多时候先取决于 description 写得对不对。',
    },
    {
      id: 'registry',
      title: 'registry.get(name)',
      detail: 'processor.ts 根据工具名从注册表取回 Tool.Info，对应到真正可执行的工具定义。',
      lane: 'registry',
      codeLabel: 'tool/registry.ts',
    },
    {
      id: 'permission',
      title: '权限检查',
      detail: '执行前先经过 permission/next.ts，命中 allow / deny / ask，危险操作会暂停等待确认。',
      lane: 'permission',
      codeLabel: 'permission/next.ts',
      kind: 'decision',
    },
    {
      id: 'execute',
      title: 'execute(args, ctx)',
      detail: '权限通过后，工具拿到参数和运行时上下文，开始真正访问文件、命令或外部系统。',
      lane: 'tool',
      codeLabel: 'tool/tool.ts · execute(args, ctx)',
    },
    {
      id: 'truncate',
      title: '输出截断与包装',
      detail: 'Tool.define 会在外层统一做参数校验和输出截断，避免超长结果直接塞爆上下文窗口。',
      lane: 'tool',
      codeLabel: 'Tool.define() · Truncate.output()',
      kind: 'warning',
      emphasis: '关键约束：不要把超长输出原样塞回上下文，截断信息本身也是给 LLM 的反馈。',
    },
    {
      id: 'tool-result',
      title: '写回 tool_result',
      detail: '处理后的 title / output / metadata 被包装成 tool_result，再回到主循环继续推理或停止。',
      lane: 'processor',
      codeLabel: 'tool_result -> messages',
      kind: 'commit',
    },
  ],
  edges: [
    { from: 'tool-call', to: 'registry' },
    { from: 'registry', to: 'permission' },
    { from: 'permission', to: 'execute', label: 'allow / 用户确认后' },
    { from: 'execute', to: 'truncate' },
    { from: 'truncate', to: 'tool-result' },
  ],
}
