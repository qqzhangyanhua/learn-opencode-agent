import type { FlowScenario } from './flowScenario'

export const testingLayersScenario: FlowScenario = {
  title: 'Agent 项目的质量分层',
  summary: '一次代码变更会经过静态门槛、核心运行时、前端单测和 E2E 回归，各层覆盖不同风险面。',
  lanes: [
    { id: 'input', label: '变更输入' },
    { id: 'static', label: '静态门槛' },
    { id: 'runtime', label: '核心运行时' },
    { id: 'frontend', label: '前端状态' },
    { id: 'e2e', label: '真实流程' },
  ],
  steps: [
    {
      id: 'change',
      title: '代码变更',
      detail: '功能新增、修复或重构进入验证链路，目标不是只测 happy path，而是回归边界与时序。',
      lane: 'input',
      emphasis: '关键认识：E2E 不能替代全部测试，类型检查和夹具同样是质量体系的一部分。',
    },
    {
      id: 'typecheck',
      title: 'Typecheck / 脚本校验',
      detail: '先用包级 typecheck 和校验脚本拦住结构错误、元数据问题和显式配置偏差。',
      lane: 'static',
      codeLabel: 'typecheck / check:* scripts',
    },
    {
      id: 'runtime',
      title: 'Runtime Fixture 测试',
      detail: '在 packages/opencode/test 中覆盖工具、权限、session、SSE、锁、超时等行为与边界。',
      lane: 'runtime',
      codeLabel: 'bun test --timeout 30000',
    },
    {
      id: 'frontend',
      title: '前端单元测试',
      detail: '在共享应用层验证状态同步、输入构建、文件树逻辑、权限自动响应和终端面板行为。',
      lane: 'frontend',
      codeLabel: 'Happy DOM + bun test --preload ./happydom.ts ./src',
    },
    {
      id: 'e2e',
      title: 'Playwright E2E',
      detail: '覆盖真实用户路径，让 UI、前端状态、HTTP API 与本地 backend 一起被验证。',
      lane: 'e2e',
      codeLabel: 'Playwright + fixtures.ts + playwright.config.ts',
    },
    {
      id: 'gate',
      title: '质量收口',
      detail: '不同测试层各自负责不同风险面，最终共同构成持续回归的安全网。',
      lane: 'static',
      kind: 'commit',
    },
  ],
  edges: [
    { from: 'change', to: 'typecheck' },
    { from: 'typecheck', to: 'runtime' },
    { from: 'typecheck', to: 'frontend' },
    { from: 'runtime', to: 'e2e' },
    { from: 'frontend', to: 'e2e' },
    { from: 'e2e', to: 'gate' },
  ],
}
