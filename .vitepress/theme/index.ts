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
import ProjectCard from './components/ProjectCard.vue'
import RunCommand from './components/RunCommand.vue'
import PracticePreview from './components/PracticePreview.vue'
import WhatIsAgent from './components/animations/css/WhatIsAgent.vue'
import MultiTurnDialog from './components/animations/css/MultiTurnDialog.vue'
import FunctionCalling from './components/animations/lottie/FunctionCalling.vue'
import FunctionCallingCss from './components/animations/css/FunctionCallingCss.vue'
import MultiAgentCollab from './components/animations/lottie/MultiAgentCollab.vue'
import MemorySystem from './components/animations/lottie/MemorySystem.vue'
import MemorySystemCss from './components/animations/css/MemorySystemCss.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ReActLoop', ReActLoop)
    app.component('StreamingDemo', StreamingDemo)
    app.component('MessageAccumulator', MessageAccumulator)
    app.component('PermissionFlow', PermissionFlow)
    app.component('McpHandshake', McpHandshake)
    app.component('SseBroadcast', SseBroadcast)
    app.component('ContextCompaction', ContextCompaction)
    app.component('ProviderFallback', ProviderFallback)
    app.component('WorkflowVsAgent', WorkflowVsAgent)
    app.component('LspHover', LspHover)
    app.component('ConnectionGate', ConnectionGate)
    app.component('StarCTA', StarCTA)
    app.component('AgentDispatchDemo', AgentDispatchDemo)
    app.component('BackgroundTaskDemo', BackgroundTaskDemo)
    app.component('RuntimeFallbackDemo', RuntimeFallbackDemo)
    app.component('HashlineEditDemo', HashlineEditDemo)
    app.component('TaskDelegationDemo', TaskDelegationDemo)
    app.component('PracticeTerminalHero', PracticeTerminalHero)
    app.component('PracticePhaseGrid', PracticePhaseGrid)
    app.component('PracticeTagCloud', PracticeTagCloud)
    app.component('ProjectCard', ProjectCard)
    app.component('RunCommand', RunCommand)
    app.component('PracticePreview', PracticePreview)
    app.component('WhatIsAgent', WhatIsAgent)
    app.component('MultiTurnDialog', MultiTurnDialog)
    app.component('FunctionCalling', FunctionCalling)
    app.component('FunctionCallingCss', FunctionCallingCss)
    app.component('MultiAgentCollab', MultiAgentCollab)
    app.component('MemorySystem', MemorySystem)
    app.component('MemorySystemCss', MemorySystemCss)
  }
} satisfies Theme
