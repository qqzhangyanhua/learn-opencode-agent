// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ReActLoop from './components/ReActLoop.vue'
import StreamingDemo from './components/StreamingDemo.vue'
import MessageAccumulator from './components/MessageAccumulator.vue'
import PermissionFlow from './components/PermissionFlow.vue'
import McpHandshake from './components/McpHandshake.vue'
import SseBroadcast from './components/SseBroadcast.vue'
import ContextCompaction from './components/ContextCompaction.vue'
import ProviderFallback from './components/ProviderFallback.vue'
import WorkflowVsAgent from './components/WorkflowVsAgent.vue'
import LspHover from './components/LspHover.vue'
import ConnectionGate from './components/ConnectionGate.vue'
import StarCTA from './components/StarCTA.vue'
import AgentDispatchDemo from './components/AgentDispatchDemo.vue'
import BackgroundTaskDemo from './components/BackgroundTaskDemo.vue'
import RuntimeFallbackDemo from './components/RuntimeFallbackDemo.vue'
import HashlineEditDemo from './components/HashlineEditDemo.vue'
import TaskDelegationDemo from './components/TaskDelegationDemo.vue'
import PracticeTerminalHero from './components/PracticeTerminalHero.vue'
import PracticePhaseGrid from './components/PracticePhaseGrid.vue'
import PracticeTagCloud from './components/PracticeTagCloud.vue'
import PracticeRouteExplorer from './components/PracticeRouteExplorer.vue'
import PracticeProjectSyllabus from './components/PracticeProjectSyllabus.vue'
import ProjectCard from './components/ProjectCard.vue'
import RunCommand from './components/RunCommand.vue'
import HomeStartPanel from './components/HomeStartPanel.vue'
import EntryContextBanner from './components/EntryContextBanner.vue'
import ChapterLearningGuide from './components/ChapterLearningGuide.vue'
import ChapterActionPanel from './components/ChapterActionPanel.vue'
import PracticePreview from './components/PracticePreview.vue'
import WhatIsAgent from './components/animations/css/WhatIsAgent.vue'
import MultiTurnDialog from './components/animations/css/MultiTurnDialog.vue'
import FunctionCalling from './components/animations/lottie/FunctionCalling.vue'
import FunctionCallingCss from './components/animations/css/FunctionCallingCss.vue'
import MultiAgentCollab from './components/animations/lottie/MultiAgentCollab.vue'
import MemorySystem from './components/animations/lottie/MemorySystem.vue'
import MemorySystemCss from './components/animations/css/MemorySystemCss.vue'
import RagAccuracyDemo from './components/RagAccuracyDemo.vue'
import MultiAgentWorkflowDetailed from './components/MultiAgentWorkflowDetailed.vue'
import PlanningTreeDemo from './components/PlanningTreeDemo.vue'
import ContextEngineeringExtended from './components/ContextEngineeringExtended.vue'
import PromptDesignStudio from './components/PromptDesignStudio.vue'
import ProductionArchitectureDiagram from './components/ProductionArchitectureDiagram.vue'
import SecurityBoundaryDemo from './components/SecurityBoundaryDemo.vue'
import CostOptimizationDashboard from './components/CostOptimizationDashboard.vue'
import './custom.css'

const globalComponents = [
  ['ReActLoop', ReActLoop],
  ['StreamingDemo', StreamingDemo],
  ['MessageAccumulator', MessageAccumulator],
  ['PermissionFlow', PermissionFlow],
  ['McpHandshake', McpHandshake],
  ['SseBroadcast', SseBroadcast],
  ['ContextCompaction', ContextCompaction],
  ['ProviderFallback', ProviderFallback],
  ['WorkflowVsAgent', WorkflowVsAgent],
  ['LspHover', LspHover],
  ['ConnectionGate', ConnectionGate],
  ['StarCTA', StarCTA],
  ['AgentDispatchDemo', AgentDispatchDemo],
  ['BackgroundTaskDemo', BackgroundTaskDemo],
  ['RuntimeFallbackDemo', RuntimeFallbackDemo],
  ['HashlineEditDemo', HashlineEditDemo],
  ['TaskDelegationDemo', TaskDelegationDemo],
  ['PracticeTerminalHero', PracticeTerminalHero],
  ['PracticePhaseGrid', PracticePhaseGrid],
  ['PracticeTagCloud', PracticeTagCloud],
  ['PracticeRouteExplorer', PracticeRouteExplorer],
  ['PracticeProjectSyllabus', PracticeProjectSyllabus],
  ['ProjectCard', ProjectCard],
  ['RunCommand', RunCommand],
  ['HomeStartPanel', HomeStartPanel],
  ['EntryContextBanner', EntryContextBanner],
  ['ChapterLearningGuide', ChapterLearningGuide],
  ['ChapterActionPanel', ChapterActionPanel],
  ['PracticePreview', PracticePreview],
  ['WhatIsAgent', WhatIsAgent],
  ['MultiTurnDialog', MultiTurnDialog],
  ['FunctionCalling', FunctionCalling],
  ['FunctionCallingCss', FunctionCallingCss],
  ['MultiAgentCollab', MultiAgentCollab],
  ['MemorySystem', MemorySystem],
  ['MemorySystemCss', MemorySystemCss],
  ['RagAccuracyDemo', RagAccuracyDemo],
  ['MultiAgentWorkflowDetailed', MultiAgentWorkflowDetailed],
  ['PlanningTreeDemo', PlanningTreeDemo],
  ['ContextEngineeringExtended', ContextEngineeringExtended],
  ['PromptDesignStudio', PromptDesignStudio],
  ['ProductionArchitectureDiagram', ProductionArchitectureDiagram],
  ['SecurityBoundaryDemo', SecurityBoundaryDemo],
  ['CostOptimizationDashboard', CostOptimizationDashboard],
] as const

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    for (const [name, component] of globalComponents) {
      app.component(name, component)
    }
  }
} satisfies Theme
