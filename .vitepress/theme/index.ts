// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineAsyncComponent } from 'vue'

import StarCTA from './components/StarCTA.vue'
import PracticeTerminalHero from './components/PracticeTerminalHero.vue'
import PracticePhaseGrid from './components/PracticePhaseGrid.vue'
import PracticeTagCloud from './components/PracticeTagCloud.vue'
import PracticeRouteExplorer from './components/PracticeRouteExplorer.vue'
import PracticeProjectSyllabus from './components/PracticeProjectSyllabus.vue'
import PracticeProjectGuide from './components/PracticeProjectGuide.vue'
import PracticeProjectActionPanel from './components/PracticeProjectActionPanel.vue'
import RelatedPracticeProjects from './components/RelatedPracticeProjects.vue'
import DiscoveryTypeBadge from './components/DiscoveryTypeBadge.vue'
import DiscoveryGoalRoutes from './components/DiscoveryGoalRoutes.vue'
import DiscoveryStartGrid from './components/DiscoveryStartGrid.vue'
import DiscoveryTopicHub from './components/DiscoveryTopicHub.vue'
import ProjectCard from './components/ProjectCard.vue'
import RunCommand from './components/RunCommand.vue'
import HomeStartPanel from './components/HomeStartPanel.vue'
import EntryContextBanner from './components/EntryContextBanner.vue'
import ChapterLearningGuide from './components/ChapterLearningGuide.vue'
import ChapterActionPanel from './components/ChapterActionPanel.vue'
import PracticePreview from './components/PracticePreview.vue'

import './custom.css'

const asyncComponent = (loader: Parameters<typeof defineAsyncComponent>[0]) =>
  defineAsyncComponent(loader)

const asyncGlobalComponents = [
  ['ReActLoop', asyncComponent(() => import('./components/ReActLoop.vue'))],
  ['StreamingDemo', asyncComponent(() => import('./components/StreamingDemo.vue'))],
  ['MessageAccumulator', asyncComponent(() => import('./components/MessageAccumulator.vue'))],
  ['PermissionFlow', asyncComponent(() => import('./components/PermissionFlow.vue'))],
  ['McpHandshake', asyncComponent(() => import('./components/McpHandshake.vue'))],
  ['HttpPermissionGateDemo', asyncComponent(() => import('./components/HttpPermissionGateDemo.vue'))],
  ['SseBroadcast', asyncComponent(() => import('./components/SseBroadcast.vue'))],
  ['ContextCompaction', asyncComponent(() => import('./components/ContextCompaction.vue'))],
  ['ProviderFallback', asyncComponent(() => import('./components/ProviderFallback.vue'))],
  ['WorkflowVsAgent', asyncComponent(() => import('./components/WorkflowVsAgent.vue'))],
  ['LspHover', asyncComponent(() => import('./components/LspHover.vue'))],
  ['ConnectionGate', asyncComponent(() => import('./components/ConnectionGate.vue'))],
  ['AgentDispatchDemo', asyncComponent(() => import('./components/AgentDispatchDemo.vue'))],
  ['BackgroundTaskDemo', asyncComponent(() => import('./components/BackgroundTaskDemo.vue'))],
  ['RuntimeFallbackDemo', asyncComponent(() => import('./components/RuntimeFallbackDemo.vue'))],
  ['HashlineEditDemo', asyncComponent(() => import('./components/HashlineEditDemo.vue'))],
  ['TaskDelegationDemo', asyncComponent(() => import('./components/TaskDelegationDemo.vue'))],
  ['WhatIsAgent', asyncComponent(() => import('./components/animations/css/WhatIsAgent.vue'))],
  ['MultiTurnDialog', asyncComponent(() => import('./components/animations/css/MultiTurnDialog.vue'))],
  ['FunctionCalling', asyncComponent(() => import('./components/animations/lottie/FunctionCalling.vue'))],
  ['FunctionCallingCss', asyncComponent(() => import('./components/animations/css/FunctionCallingCss.vue'))],
  ['MultiAgentCollab', asyncComponent(() => import('./components/animations/lottie/MultiAgentCollab.vue'))],
  ['MemorySystem', asyncComponent(() => import('./components/animations/lottie/MemorySystem.vue'))],
  ['MemorySystemCss', asyncComponent(() => import('./components/animations/css/MemorySystemCss.vue'))],
  ['RagAccuracyDemo', asyncComponent(() => import('./components/RagAccuracyDemo.vue'))],
  ['MultiAgentWorkflowDetailed', asyncComponent(() => import('./components/MultiAgentWorkflowDetailed.vue'))],
  ['MultiAgentModeSimulator', asyncComponent(() => import('./components/MultiAgentModeSimulator.vue'))],
  ['PlanningTreeDemo', asyncComponent(() => import('./components/PlanningTreeDemo.vue'))],
  ['ContextEngineeringExtended', asyncComponent(() => import('./components/ContextEngineeringExtended.vue'))],
  ['PromptDesignStudio', asyncComponent(() => import('./components/PromptDesignStudio.vue'))],
  ['ProductionArchitectureDiagram', asyncComponent(() => import('./components/ProductionArchitectureDiagram.vue'))],
  ['SecurityBoundaryDemo', asyncComponent(() => import('./components/SecurityBoundaryDemo.vue'))],
  ['CostOptimizationDashboard', asyncComponent(() => import('./components/CostOptimizationDashboard.vue'))],
  ['RuntimeLifecycleDiagram', asyncComponent(() => import('./components/RuntimeLifecycleDiagram.vue'))],
  ['HomeExploreLinks', asyncComponent(() => import('./components/HomeExploreLinks.vue'))],
  ['HomeSeriesStrip', asyncComponent(() => import('./components/HomeSeriesStrip.vue'))],
  ['ToolCallingLifecycle', asyncComponent(() => import('./components/ToolCallingLifecycle.vue'))],
  ['RagPipelineDemo', asyncComponent(() => import('./components/RagPipelineDemo.vue'))],
  ['GraphRagDemo', asyncComponent(() => import('./components/GraphRagDemo.vue'))],
  ['StreamingOutputDemo', asyncComponent(() => import('./components/StreamingOutputDemo.vue'))],
  ['ContextWindowDemo', asyncComponent(() => import('./components/ContextWindowDemo.vue'))],
  ['MemoryBankDemo', asyncComponent(() => import('./components/MemoryBankDemo.vue'))],
  ['ErrorRetryDemo', asyncComponent(() => import('./components/ErrorRetryDemo.vue'))],
  ['MemoryLayersDemo', asyncComponent(() => import('./components/MemoryLayersDemo.vue'))],
  ['HybridRetrievalDemo', asyncComponent(() => import('./components/HybridRetrievalDemo.vue'))],
  ['ReActLoopDemo', asyncComponent(() => import('./components/ReActLoopDemo.vue'))],
  ['PlanningExecuteDemo', asyncComponent(() => import('./components/PlanningExecuteDemo.vue'))],
  ['ReflectionCycleDemo', asyncComponent(() => import('./components/ReflectionCycleDemo.vue'))],
  ['AgentCommunicationModesDemo', asyncComponent(() => import('./components/AgentCommunicationModesDemo.vue'))],
  ['TraceSpanTimelineDemo', asyncComponent(() => import('./components/TraceSpanTimelineDemo.vue'))],
  ['EvaluationPipelineDemo', asyncComponent(() => import('./components/EvaluationPipelineDemo.vue'))],
  ['CodeReviewAgentSystemDemo', asyncComponent(() => import('./components/CodeReviewAgentSystemDemo.vue'))],
  ['ContextBudgetCompressionDemo', asyncComponent(() => import('./components/ContextBudgetCompressionDemo.vue'))],
  ['GenerateExecuteRepairLoopDemo', asyncComponent(() => import('./components/GenerateExecuteRepairLoopDemo.vue'))],
  ['ApprovalInterruptResumeDemo', asyncComponent(() => import('./components/ApprovalInterruptResumeDemo.vue'))],
  ['MultimodalMessageFlowDemo', asyncComponent(() => import('./components/MultimodalMessageFlowDemo.vue'))],
  ['PromptLayerComposerDemo', asyncComponent(() => import('./components/PromptLayerComposerDemo.vue'))],
  ['SchemaConstrainedOutputDemo', asyncComponent(() => import('./components/SchemaConstrainedOutputDemo.vue'))],
  ['TransactionEffectQueueDemo', asyncComponent(() => import('./components/TransactionEffectQueueDemo.vue'))],
  ['ExtensionDecisionFlowDemo', asyncComponent(() => import('./components/ExtensionDecisionFlowDemo.vue'))],
  ['ExtensionCapabilitySelector', asyncComponent(() => import('./components/ExtensionCapabilitySelector.vue'))],
  ['CloudLayerResponsibilityDemo', asyncComponent(() => import('./components/CloudLayerResponsibilityDemo.vue'))],
  ['TaskExecutionPathDemo', asyncComponent(() => import('./components/TaskExecutionPathDemo.vue'))],
  ['TestingLayersDemo', asyncComponent(() => import('./components/TestingLayersDemo.vue'))],
  ['LocalCloudTopologyDemo', asyncComponent(() => import('./components/LocalCloudTopologyDemo.vue'))],
  ['TuiProviderFlowDemo', asyncComponent(() => import('./components/TuiProviderFlowDemo.vue'))],
  ['PluginLifecycleDemo', asyncComponent(() => import('./components/PluginLifecycleDemo.vue'))],
  ['ExtensionBestPracticeChecklistDemo', asyncComponent(() => import('./components/ExtensionBestPracticeChecklistDemo.vue'))],
  ['ToolExecutionLifecycleDemo', asyncComponent(() => import('./components/ToolExecutionLifecycleDemo.vue'))],
  ['SessionLoopLifecycleDemo', asyncComponent(() => import('./components/SessionLoopLifecycleDemo.vue'))],
] as const

const syncGlobalComponents = [
  ['StarCTA', StarCTA],
  ['PracticeTerminalHero', PracticeTerminalHero],
  ['PracticePhaseGrid', PracticePhaseGrid],
  ['PracticeTagCloud', PracticeTagCloud],
  ['PracticeRouteExplorer', PracticeRouteExplorer],
  ['PracticeProjectSyllabus', PracticeProjectSyllabus],
  ['PracticeProjectGuide', PracticeProjectGuide],
  ['PracticeProjectActionPanel', PracticeProjectActionPanel],
  ['RelatedPracticeProjects', RelatedPracticeProjects],
  ['DiscoveryTypeBadge', DiscoveryTypeBadge],
  ['DiscoveryGoalRoutes', DiscoveryGoalRoutes],
  ['DiscoveryStartGrid', DiscoveryStartGrid],
  ['DiscoveryTopicHub', DiscoveryTopicHub],
  ['ProjectCard', ProjectCard],
  ['RunCommand', RunCommand],
  ['HomeStartPanel', HomeStartPanel],
  ['EntryContextBanner', EntryContextBanner],
  ['ChapterLearningGuide', ChapterLearningGuide],
  ['ChapterActionPanel', ChapterActionPanel],
  ['PracticePreview', PracticePreview],
] as const

const AsyncPracticeProjectSourceFiles = asyncComponent(() =>
  import('./components/PracticeProjectSourceFiles.vue')
)
const AsyncPlanningFlowSimulator = asyncComponent(() =>
  import('./components/PlanningFlowSimulator.vue')
)

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    for (const [name, component] of syncGlobalComponents) {
      app.component(name, component)
    }

    for (const [name, component] of asyncGlobalComponents) {
      app.component(name, component)
    }

    app.component('PracticeProjectSourceFiles', AsyncPracticeProjectSourceFiles)
    app.component('PlanningFlowSimulator', AsyncPlanningFlowSimulator)
  }
} satisfies Theme
