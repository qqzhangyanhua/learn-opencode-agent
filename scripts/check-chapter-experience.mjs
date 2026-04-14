import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const themeIndexPath = path.join(rootDir, '.vitepress', 'theme', 'index.ts')
const chapter25Path = path.join(rootDir, 'docs', 'intermediate', '25-rag-failure-patterns', 'index.md')
const chapter26Path = path.join(rootDir, 'docs', 'intermediate', '26-multi-agent-collaboration', 'index.md')
const chapter28Path = path.join(rootDir, 'docs', 'intermediate', '28-context-engineering', 'index.md')
const chapter29Path = path.join(rootDir, 'docs', 'intermediate', '29-system-prompt-design', 'index.md')
const chapter30Path = path.join(rootDir, 'docs', 'intermediate', '30-production-architecture', 'index.md')
const chapter31Path = path.join(rootDir, 'docs', 'intermediate', '31-safety-boundaries', 'index.md')
const chapter32Path = path.join(rootDir, 'docs', 'intermediate', '32-performance-cost', 'index.md')
const chapter05Path = path.join(rootDir, 'docs', '05-provider-system', 'index.md')
const chapter06Path = path.join(rootDir, 'docs', '06-mcp-integration', 'index.md')
const chapter08Path = path.join(rootDir, 'docs', '08-http-api-server', 'index.md')
const chapter11Path = path.join(rootDir, 'docs', '11-code-intelligence', 'index.md')
const chapter12Path = path.join(rootDir, 'docs', '12-plugins-extensions', 'index.md')
const chapter13Path = path.join(rootDir, 'docs', '13-deployment-infrastructure', 'index.md')
const chapter14Path = path.join(rootDir, 'docs', '14-testing-quality', 'index.md')
const guidePath = path.join(rootDir, '.vitepress', 'theme', 'components', 'ChapterLearningGuide.vue')
const actionPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'ChapterActionPanel.vue')
const practiceGuidePath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectGuide.vue')
const practiceActionPath = path.join(rootDir, '.vitepress', 'theme', 'components', 'PracticeProjectActionPanel.vue')
const contextEngineeringExtendedPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'ContextEngineeringExtended.vue'
)
const providerFallbackPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'ProviderFallback.vue'
)
const securityBoundaryDemoPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'SecurityBoundaryDemo.vue'
)
const ragAccuracyDemoPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'RagAccuracyDemo.vue'
)
const costOptimizationDashboardPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'CostOptimizationDashboard.vue'
)
const promptDesignStudioPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'PromptDesignStudio.vue'
)
const productionArchitectureDiagramPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'ProductionArchitectureDiagram.vue'
)
const planningFlowSimulatorPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'PlanningFlowSimulator.vue'
)
const planningStageBarPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'PlanningStageBar.vue'
)
const multiAgentModeSimulatorPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'MultiAgentModeSimulator.vue'
)
const mcpHandshakePath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'McpHandshake.vue'
)
const httpPermissionGateDemoPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'HttpPermissionGateDemo.vue'
)
const lspEditDiagnosticFlowDemoPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'LspEditDiagnosticFlowDemo.vue'
)
const extensionCapabilitySelectorPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'ExtensionCapabilitySelector.vue'
)
const cloudLayerResponsibilityDemoPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'CloudLayerResponsibilityDemo.vue'
)
const testingFixtureBoundaryDemoPath = path.join(
  rootDir,
  '.vitepress',
  'theme',
  'components',
  'TestingFixtureBoundaryDemo.vue'
)
const guideTargetPages = [
  'docs/00-what-is-ai-agent/index.md',
  'docs/01-agent-basics/index.md',
  'docs/03-tool-system/index.md',
  'docs/04-session-management/index.md',
  'docs/practice/p01-minimal-agent/index.md',
  'docs/practice/p10-react-loop/index.md',
  'docs/intermediate/27-planning-mechanism/index.md'
]
const upgradedPracticePages = new Set([
  'docs/practice/p01-minimal-agent/index.md',
  'docs/practice/p10-react-loop/index.md'
])

const issues = []

if (!existsSync(guidePath)) {
  issues.push('缺少 .vitepress/theme/components/ChapterLearningGuide.vue')
}

if (!existsSync(actionPath)) {
  issues.push('缺少 .vitepress/theme/components/ChapterActionPanel.vue')
}

if (!existsSync(practiceGuidePath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectGuide.vue')
}

if (!existsSync(practiceActionPath)) {
  issues.push('缺少 .vitepress/theme/components/PracticeProjectActionPanel.vue')
}

if (!existsSync(contextEngineeringExtendedPath)) {
  issues.push('缺少 .vitepress/theme/components/ContextEngineeringExtended.vue')
}

if (!existsSync(providerFallbackPath)) {
  issues.push('缺少 .vitepress/theme/components/ProviderFallback.vue')
}

if (!existsSync(securityBoundaryDemoPath)) {
  issues.push('缺少 .vitepress/theme/components/SecurityBoundaryDemo.vue')
}

if (!existsSync(ragAccuracyDemoPath)) {
  issues.push('缺少 .vitepress/theme/components/RagAccuracyDemo.vue')
}

if (!existsSync(costOptimizationDashboardPath)) {
  issues.push('缺少 .vitepress/theme/components/CostOptimizationDashboard.vue')
}

if (!existsSync(promptDesignStudioPath)) {
  issues.push('缺少 .vitepress/theme/components/PromptDesignStudio.vue')
}

if (!existsSync(productionArchitectureDiagramPath)) {
  issues.push('缺少 .vitepress/theme/components/ProductionArchitectureDiagram.vue')
}

if (!existsSync(planningFlowSimulatorPath)) {
  issues.push('缺少 .vitepress/theme/components/PlanningFlowSimulator.vue')
}

if (!existsSync(planningStageBarPath)) {
  issues.push('缺少 .vitepress/theme/components/PlanningStageBar.vue')
}

if (!existsSync(multiAgentModeSimulatorPath)) {
  issues.push('缺少 .vitepress/theme/components/MultiAgentModeSimulator.vue')
}

if (!existsSync(mcpHandshakePath)) {
  issues.push('缺少 .vitepress/theme/components/McpHandshake.vue')
}

if (!existsSync(httpPermissionGateDemoPath)) {
  issues.push('缺少 .vitepress/theme/components/HttpPermissionGateDemo.vue')
}

if (!existsSync(lspEditDiagnosticFlowDemoPath)) {
  issues.push('缺少 .vitepress/theme/components/LspEditDiagnosticFlowDemo.vue')
}

if (!existsSync(extensionCapabilitySelectorPath)) {
  issues.push('缺少 .vitepress/theme/components/ExtensionCapabilitySelector.vue')
}

if (!existsSync(cloudLayerResponsibilityDemoPath)) {
  issues.push('缺少 .vitepress/theme/components/CloudLayerResponsibilityDemo.vue')
}

if (!existsSync(testingFixtureBoundaryDemoPath)) {
  issues.push('缺少 .vitepress/theme/components/TestingFixtureBoundaryDemo.vue')
}

const themeIndex = readFileSync(themeIndexPath, 'utf8')
if (!themeIndex.includes('ChapterLearningGuide')) {
  issues.push('主题入口尚未注册 ChapterLearningGuide')
}

if (!themeIndex.includes('ChapterActionPanel')) {
  issues.push('主题入口尚未注册 ChapterActionPanel')
}

if (!themeIndex.includes('PlanningFlowSimulator')) {
  issues.push('主题入口尚未注册 PlanningFlowSimulator')
}

const packageJson = readFileSync(packageJsonPath, 'utf8')
const contextEngineeringExtended = existsSync(contextEngineeringExtendedPath)
  ? readFileSync(contextEngineeringExtendedPath, 'utf8')
  : ''
const providerFallback = existsSync(providerFallbackPath)
  ? readFileSync(providerFallbackPath, 'utf8')
  : ''
const securityBoundaryDemo = existsSync(securityBoundaryDemoPath)
  ? readFileSync(securityBoundaryDemoPath, 'utf8')
  : ''
const ragAccuracyDemo = existsSync(ragAccuracyDemoPath)
  ? readFileSync(ragAccuracyDemoPath, 'utf8')
  : ''
const costOptimizationDashboard = existsSync(costOptimizationDashboardPath)
  ? readFileSync(costOptimizationDashboardPath, 'utf8')
  : ''
const promptDesignStudio = existsSync(promptDesignStudioPath)
  ? readFileSync(promptDesignStudioPath, 'utf8')
  : ''
const productionArchitectureDiagram = existsSync(productionArchitectureDiagramPath)
  ? readFileSync(productionArchitectureDiagramPath, 'utf8')
  : ''
const planningFlowSimulator = existsSync(planningFlowSimulatorPath)
  ? readFileSync(planningFlowSimulatorPath, 'utf8')
  : ''
const planningStageBar = existsSync(planningStageBarPath)
  ? readFileSync(planningStageBarPath, 'utf8')
  : ''
const multiAgentModeSimulator = existsSync(multiAgentModeSimulatorPath)
  ? readFileSync(multiAgentModeSimulatorPath, 'utf8')
  : ''
const mcpHandshake = existsSync(mcpHandshakePath)
  ? readFileSync(mcpHandshakePath, 'utf8')
  : ''
const httpPermissionGateDemo = existsSync(httpPermissionGateDemoPath)
  ? readFileSync(httpPermissionGateDemoPath, 'utf8')
  : ''
const lspEditDiagnosticFlowDemo = existsSync(lspEditDiagnosticFlowDemoPath)
  ? readFileSync(lspEditDiagnosticFlowDemoPath, 'utf8')
  : ''
const extensionCapabilitySelector = existsSync(extensionCapabilitySelectorPath)
  ? readFileSync(extensionCapabilitySelectorPath, 'utf8')
  : ''
const cloudLayerResponsibilityDemo = existsSync(cloudLayerResponsibilityDemoPath)
  ? readFileSync(cloudLayerResponsibilityDemoPath, 'utf8')
  : ''

if (!packageJson.includes('check:chapter-experience')) {
  issues.push('package.json 尚未声明 check:chapter-experience')
}

if (!packageJson.includes('bun run check:chapter-experience')) {
  issues.push('build:strict 尚未接入 check:chapter-experience')
}

if (!planningStageBar.includes('defineEmits')) {
  issues.push('PlanningStageBar 尚未声明阶段切换事件')
}

if (!planningStageBar.includes("emit('select-screen'")) {
  issues.push('PlanningStageBar 尚未发出 select-screen 事件')
}

if (!planningStageBar.includes('<button')) {
  issues.push('PlanningStageBar 尚未使用可点击按钮承载阶段项')
}

if (!planningFlowSimulator.includes('@select-screen=')) {
  issues.push('PlanningFlowSimulator 尚未接收阶段条的 select-screen 事件')
}

if (!planningFlowSimulator.includes('function changeScreen(')) {
  issues.push('PlanningFlowSimulator 尚未实现阶段切换处理函数')
}

if (!multiAgentModeSimulator.includes('function changeMode(')) {
  issues.push('MultiAgentModeSimulator 尚未实现模式切换处理函数')
}

if (!multiAgentModeSimulator.includes('function changeStage(')) {
  issues.push('MultiAgentModeSimulator 尚未实现阶段切换处理函数')
}

if (!multiAgentModeSimulator.includes('function modeDecisionOwner(')) {
  issues.push('MultiAgentModeSimulator 尚未实现模式说明映射处理函数')
}

for (const label of ['谁负责决策', '最适合的任务', '最容易出的问题', '结果怎么回来']) {
  if (!multiAgentModeSimulator.includes(label)) {
    issues.push(`MultiAgentModeSimulator 尚未声明模式说明字段：${label}`)
  }
}

if (!contextEngineeringExtended.includes('function changeStage(')) {
  issues.push('ContextEngineeringExtended 尚未实现四阶段切换处理函数')
}

if (!providerFallback.includes('function flowStageLabel(')) {
  issues.push('ProviderFallback 尚未实现统一调用链说明映射函数')
}

for (const label of ['谁在做统一', '统一的是什么', '为什么上层不用感知厂商', '失败后怎么回退']) {
  if (!providerFallback.includes(label)) {
    issues.push(`ProviderFallback 尚未声明统一调用链说明字段：${label}`)
  }
}

if (!mcpHandshake.includes('function flowStageLabel(')) {
  issues.push('McpHandshake 尚未实现 MCP 接入主链说明映射函数')
}

for (const label of ['谁是 Client，谁是 Server', 'OpenCode 接进来的到底是什么', 'tools/list 之后发生了什么', '为什么 Agent 后面能直接调用']) {
  if (!mcpHandshake.includes(label)) {
    issues.push(`McpHandshake 尚未声明 MCP 记忆字段：${label}`)
  }
}

for (const stageLabel of ['读取配置', '选 transport', '建立连接', '发现工具', '转换协议', '注入 registry', 'Agent 调用']) {
  if (!mcpHandshake.includes(stageLabel)) {
    issues.push(`McpHandshake 尚未声明 MCP 接入阶段：${stageLabel}`)
  }
}

if (!httpPermissionGateDemo.includes('function flowStageLabel(')) {
  issues.push('HttpPermissionGateDemo 尚未实现权限守门说明映射函数')
}

for (const label of ['谁在做守门', '拦住的依据是什么', '被拦住后请求停在哪里', '放行后为什么 Handler 可以更简单']) {
  if (!httpPermissionGateDemo.includes(label)) {
    issues.push(`HttpPermissionGateDemo 尚未声明权限记忆字段：${label}`)
  }
}

for (const stageLabel of ['HTTP 请求', '权限中间件', '路由匹配', 'Handler', '响应返回']) {
  if (!httpPermissionGateDemo.includes(stageLabel)) {
    issues.push(`HttpPermissionGateDemo 尚未声明权限主链阶段：${stageLabel}`)
  }
}

if (!lspEditDiagnosticFlowDemo.includes('function flowStageLabel(')) {
  issues.push('LspEditDiagnosticFlowDemo 尚未实现 LSP 主链说明映射函数')
}

for (const label of ['谁负责把文件变更交给 LSP', 'getClients() 真正在解决什么问题', '为什么不是启动时就拉起所有语言服务器', '诊断出来后怎么进入后续修复链']) {
  if (!lspEditDiagnosticFlowDemo.includes(label)) {
    issues.push(`LspEditDiagnosticFlowDemo 尚未声明 LSP 记忆字段：${label}`)
  }
}

for (const stageLabel of ['edit 写文件', 'touchFile', 'getClients', '启动/复用客户端', 'didChange', 'publishDiagnostics']) {
  if (!lspEditDiagnosticFlowDemo.includes(stageLabel)) {
    issues.push(`LspEditDiagnosticFlowDemo 尚未声明 LSP 主链阶段：${stageLabel}`)
  }
}

if (!extensionCapabilitySelector.includes('function recommendationForCapability(')) {
  issues.push('ExtensionCapabilitySelector 尚未实现扩展推荐映射函数')
}

if (!extensionCapabilitySelector.includes('function whyNotPlugin(')) {
  issues.push('ExtensionCapabilitySelector 尚未实现 Plugin 反向解释函数')
}

if (!extensionCapabilitySelector.includes('function whyNotSkill(')) {
  issues.push('ExtensionCapabilitySelector 尚未实现 Skill 反向解释函数')
}

for (const label of ['这一类为什么首选这个方案', '为什么不是 Plugin', '为什么不是 Skill', '最后进入系统的哪个统一入口']) {
  if (!extensionCapabilitySelector.includes(label)) {
    issues.push(`ExtensionCapabilitySelector 尚未声明扩展记忆字段：${label}`)
  }
}

for (const stageLabel of ['我想扩展什么能力', '选对应扩展方式', '进入统一边界']) {
  if (!extensionCapabilitySelector.includes(stageLabel)) {
    issues.push(`ExtensionCapabilitySelector 尚未声明扩展主链阶段：${stageLabel}`)
  }
}

if (!cloudLayerResponsibilityDemo.includes('function 负责公共 API，console 负责账号与商业化域，两者不是一回事。')) {
  issues.push('CloudLayerResponsibilityDemo 尚未声明主记忆句')
}

for (const label of ['负责什么', '不负责什么', '典型文件']) {
  if (!cloudLayerResponsibilityDemo.includes(label)) {
    issues.push(`CloudLayerResponsibilityDemo 尚未声明职责记忆字段：${label}`)
  }
}

for (const stageLabel of ['需求出现', 'function', 'console', 'infra', 'containers / CI']) {
  if (!cloudLayerResponsibilityDemo.includes(stageLabel)) {
    issues.push(`CloudLayerResponsibilityDemo 尚未声明职责主链阶段：${stageLabel}`)
  }
}

if (!promptDesignStudio.includes('function layerForSection(')) {
  issues.push('PromptDesignStudio 尚未实现源码装配映射处理函数')
}

for (const sourceLabel of ['system.ts', 'instruction.ts', 'prompt.ts', 'llm.ts']) {
  if (!promptDesignStudio.includes(sourceLabel)) {
    issues.push(`PromptDesignStudio 尚未声明源码装配层：${sourceLabel}`)
  }
}

for (const stageLabel of ['选', '排', '压', '拼']) {
  if (!contextEngineeringExtended.includes(stageLabel)) {
    issues.push(`ContextEngineeringExtended 尚未声明阶段标识：${stageLabel}`)
  }
}

if (!securityBoundaryDemo.includes('function changeStage(')) {
  issues.push('SecurityBoundaryDemo 尚未实现四阶段切换处理函数')
}

for (const stageLabel of ['风险分级', '最小权限', '确认机制', '运行时校验']) {
  if (!securityBoundaryDemo.includes(stageLabel)) {
    issues.push(`SecurityBoundaryDemo 尚未声明阶段标识：${stageLabel}`)
  }
}

if (!ragAccuracyDemo.includes('function changeStage(')) {
  issues.push('RagAccuracyDemo 尚未实现五阶段切换处理函数')
}

for (const stageLabel of ['召回单元', '相似度判断', '关键词召回', '回答边界', '冲突治理']) {
  if (!ragAccuracyDemo.includes(stageLabel)) {
    issues.push(`RagAccuracyDemo 尚未声明阶段标识：${stageLabel}`)
  }
}

if (!costOptimizationDashboard.includes('function changeStage(')) {
  issues.push('CostOptimizationDashboard 尚未实现四阶段切换处理函数')
}

for (const stageLabel of ['复杂度识别', '模型路由', '预算控制', '可观测性']) {
  if (!costOptimizationDashboard.includes(stageLabel)) {
    issues.push(`CostOptimizationDashboard 尚未声明阶段标识：${stageLabel}`)
  }
}

if (!productionArchitectureDiagram.includes('function changeStage(')) {
  issues.push('ProductionArchitectureDiagram 尚未实现四阶段切换处理函数')
}

for (const stageLabel of ['统一入口', '会话编排', '执行边界', '恢复闭环']) {
  if (!productionArchitectureDiagram.includes(stageLabel)) {
    issues.push(`ProductionArchitectureDiagram 尚未声明阶段标识：${stageLabel}`)
  }
}

if (existsSync(chapter25Path)) {
  const chapter25Content = readFileSync(chapter25Path, 'utf8')
  if (!chapter25Content.includes('<RagAccuracyDemo')) {
    issues.push('第25章尚未接入 RagAccuracyDemo')
  }
}

if (existsSync(chapter05Path)) {
  const chapter05Content = readFileSync(chapter05Path, 'utf8')
  if (!chapter05Content.includes('<ProviderFallback')) {
    issues.push('第05章尚未接入 ProviderFallback')
  }
}

if (existsSync(chapter06Path)) {
  const chapter06Content = readFileSync(chapter06Path, 'utf8')
  if (!chapter06Content.includes('<McpHandshake')) {
    issues.push('第06章尚未接入 McpHandshake')
  }
}

if (existsSync(chapter08Path)) {
  const chapter08Content = readFileSync(chapter08Path, 'utf8')
  if (!chapter08Content.includes('<HttpPermissionGateDemo')) {
    issues.push('第08章尚未接入 HttpPermissionGateDemo')
  }
}

if (existsSync(chapter11Path)) {
  const chapter11Content = readFileSync(chapter11Path, 'utf8')
  if (!chapter11Content.includes('<LspEditDiagnosticFlowDemo')) {
    issues.push('第11章尚未接入 LspEditDiagnosticFlowDemo')
  }
}

if (existsSync(chapter12Path)) {
  const chapter12Content = readFileSync(chapter12Path, 'utf8')
  if (!chapter12Content.includes('<ExtensionCapabilitySelector')) {
    issues.push('第12章尚未接入 ExtensionCapabilitySelector')
  }
}

if (existsSync(chapter13Path)) {
  const chapter13Content = readFileSync(chapter13Path, 'utf8')
  if (!chapter13Content.includes('<CloudLayerResponsibilityDemo')) {
    issues.push('第13章尚未接入 CloudLayerResponsibilityDemo')
  }
}

if (existsSync(chapter26Path)) {
  const chapter26Content = readFileSync(chapter26Path, 'utf8')
  if (!chapter26Content.includes('<MultiAgentModeSimulator')) {
    issues.push('第26章尚未接入 MultiAgentModeSimulator 试点组件')
  }
}

if (existsSync(chapter28Path)) {
  const chapter28Content = readFileSync(chapter28Path, 'utf8')
  if (!chapter28Content.includes('<ContextEngineeringExtended')) {
    issues.push('第28章尚未接入 ContextEngineeringExtended')
  }
}

if (existsSync(chapter29Path)) {
  const chapter29Content = readFileSync(chapter29Path, 'utf8')
  if (!chapter29Content.includes('<PromptDesignStudio')) {
    issues.push('第29章尚未接入 PromptDesignStudio')
  }
}

if (existsSync(chapter30Path)) {
  const chapter30Content = readFileSync(chapter30Path, 'utf8')
  if (!chapter30Content.includes('<ProductionArchitectureDiagram')) {
    issues.push('第30章尚未接入 ProductionArchitectureDiagram')
  }
}

if (existsSync(chapter31Path)) {
  const chapter31Content = readFileSync(chapter31Path, 'utf8')
  if (!chapter31Content.includes('<SecurityBoundaryDemo')) {
    issues.push('第31章尚未接入 SecurityBoundaryDemo')
  }
}

if (existsSync(chapter32Path)) {
  const chapter32Content = readFileSync(chapter32Path, 'utf8')
  if (!chapter32Content.includes('<CostOptimizationDashboard')) {
    issues.push('第32章尚未接入 CostOptimizationDashboard')
  }
}

for (const relativePath of guideTargetPages) {
  const pageContent = readFileSync(path.join(rootDir, relativePath), 'utf8')
  const allowPracticeUpgrade = upgradedPracticePages.has(relativePath)
  const hasGuide =
    pageContent.includes('<ChapterLearningGuide') ||
    (allowPracticeUpgrade && pageContent.includes('<PracticeProjectGuide'))
  const hasAction =
    pageContent.includes('<ChapterActionPanel') ||
    (allowPracticeUpgrade && pageContent.includes('<PracticeProjectActionPanel'))

  if (!hasGuide) {
    issues.push(`${relativePath} 尚未接入章节或实践导览组件`)
  }

  if (!hasAction) {
    issues.push(`${relativePath} 尚未接入章节或实践行动组件`)
  }

  if (pageContent.includes('<ChapterActionPanel') && !pageContent.includes('actionItems')) {
    issues.push(`${relativePath} 尚未声明 ChapterActionPanel.actionItems`)
  }
  if (
    relativePath === 'docs/intermediate/27-planning-mechanism/index.md' &&
    !pageContent.includes('<PlanningFlowSimulator')
  ) {
    issues.push('第27章尚未接入 PlanningFlowSimulator 试点组件')
  }
}

if (issues.length === 0) {
  console.log('check:chapter-experience 通过')
  process.exit(0)
}

console.error('章节体验校验未通过：')
for (const issue of issues) {
  console.error(`- ${issue}`)
}

process.exit(1)
