import type { ExperimentCatalogItem } from '../components/animation-lab/type'
import { agentLoopExperiment } from './animation-lab/agent-loop'
import { contextMemoryExperiment } from './animation-lab/context-memory-flow'
import { multiAgentDispatchExperiment } from './animation-lab/multi-agent-dispatch'
import { toolPermissionGateExperiment } from './animation-lab/tool-permission-gate'
import { contextCompactionExperiment } from './animation-lab/context-compaction'
import { errorRecoveryLoopExperiment } from './animation-lab/error-recovery-loop'
import { providerRoutingFallbackExperiment } from './animation-lab/provider-routing-fallback'

export { agentLoopNodes, agentLoopPaths, agentLoopExperiment } from './animation-lab/agent-loop'
export { contextMemoryCanvas, contextMemoryExperiment } from './animation-lab/context-memory-flow'
export { multiAgentDispatchCanvas, multiAgentDispatchExperiment } from './animation-lab/multi-agent-dispatch'
export { toolPermissionGateCanvas, toolPermissionGateExperiment } from './animation-lab/tool-permission-gate'
export { contextCompactionCanvas, contextCompactionExperiment } from './animation-lab/context-compaction'
export { errorRecoveryLoopCanvas, errorRecoveryLoopExperiment } from './animation-lab/error-recovery-loop'
export {
  providerRoutingFallbackCanvas,
  providerRoutingFallbackExperiment,
} from './animation-lab/provider-routing-fallback'

export const animationLabExperiments: ExperimentCatalogItem[] = [
  {
    id: agentLoopExperiment.id,
    title: agentLoopExperiment.title,
    summary: agentLoopExperiment.summary,
    status: 'available',
    experiment: agentLoopExperiment,
  },
  {
    id: contextMemoryExperiment.id,
    title: contextMemoryExperiment.title,
    summary: contextMemoryExperiment.summary,
    status: 'available',
    experiment: contextMemoryExperiment,
  },
  {
    id: multiAgentDispatchExperiment.id,
    title: multiAgentDispatchExperiment.title,
    summary: multiAgentDispatchExperiment.summary,
    status: 'available',
    experiment: multiAgentDispatchExperiment,
  },
  {
    id: toolPermissionGateExperiment.id,
    title: toolPermissionGateExperiment.title,
    summary: toolPermissionGateExperiment.summary,
    status: 'available',
    experiment: toolPermissionGateExperiment,
  },
  {
    id: contextCompactionExperiment.id,
    title: contextCompactionExperiment.title,
    summary: contextCompactionExperiment.summary,
    status: 'available',
    experiment: contextCompactionExperiment,
  },
  {
    id: errorRecoveryLoopExperiment.id,
    title: errorRecoveryLoopExperiment.title,
    summary: errorRecoveryLoopExperiment.summary,
    status: 'available',
    experiment: errorRecoveryLoopExperiment,
  },
  {
    id: providerRoutingFallbackExperiment.id,
    title: providerRoutingFallbackExperiment.title,
    summary: providerRoutingFallbackExperiment.summary,
    status: 'available',
    experiment: providerRoutingFallbackExperiment,
  },
]
