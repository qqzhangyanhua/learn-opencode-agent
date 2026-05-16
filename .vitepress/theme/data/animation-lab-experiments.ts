import type { ExperimentCatalogItem } from '../components/animation-lab/type'
import { agentLoopExperiment } from './animation-lab/agent-loop'
import { toolPermissionGateExperiment } from './animation-lab/tool-permission-gate'
import { errorRecoveryLoopExperiment } from './animation-lab/error-recovery-loop'
import { contextMemoryExperiment } from './animation-lab/context-memory-flow'
import { contextCompactionExperiment } from './animation-lab/context-compaction'
import { providerRoutingFallbackExperiment } from './animation-lab/provider-routing-fallback'
import { multiAgentDispatchExperiment } from './animation-lab/multi-agent-dispatch'
import { ragRetrievalFlowExperiment } from './animation-lab/rag-retrieval-flow'
import { humanApprovalGateExperiment } from './animation-lab/human-approval-gate'
import { structuredOutputValidationExperiment } from './animation-lab/structured-output-validation'
import { streamingInterruptControlExperiment } from './animation-lab/streaming-interrupt-control'

export { agentLoopCanvas, agentLoopExperiment } from './animation-lab/agent-loop'
export { contextMemoryCanvas, contextMemoryExperiment } from './animation-lab/context-memory-flow'
export { multiAgentDispatchCanvas, multiAgentDispatchExperiment } from './animation-lab/multi-agent-dispatch'
export { toolPermissionGateCanvas, toolPermissionGateExperiment } from './animation-lab/tool-permission-gate'
export { contextCompactionCanvas, contextCompactionExperiment } from './animation-lab/context-compaction'
export { errorRecoveryLoopCanvas, errorRecoveryLoopExperiment } from './animation-lab/error-recovery-loop'
export {
  providerRoutingFallbackCanvas,
  providerRoutingFallbackExperiment,
} from './animation-lab/provider-routing-fallback'
export { ragRetrievalFlowCanvas, ragRetrievalFlowExperiment } from './animation-lab/rag-retrieval-flow'
export { humanApprovalGateCanvas, humanApprovalGateExperiment } from './animation-lab/human-approval-gate'
export {
  structuredOutputValidationCanvas,
  structuredOutputValidationExperiment,
} from './animation-lab/structured-output-validation'
export {
  streamingInterruptControlCanvas,
  streamingInterruptControlExperiment,
} from './animation-lab/streaming-interrupt-control'

export const animationLabExperiments: ExperimentCatalogItem[] = [
  {
    id: agentLoopExperiment.id,
    title: agentLoopExperiment.title,
    summary: agentLoopExperiment.summary,
    status: 'available',
    experiment: agentLoopExperiment,
  },
  {
    id: toolPermissionGateExperiment.id,
    title: toolPermissionGateExperiment.title,
    summary: toolPermissionGateExperiment.summary,
    status: 'available',
    experiment: toolPermissionGateExperiment,
  },
  {
    id: errorRecoveryLoopExperiment.id,
    title: errorRecoveryLoopExperiment.title,
    summary: errorRecoveryLoopExperiment.summary,
    status: 'available',
    experiment: errorRecoveryLoopExperiment,
  },
  {
    id: contextMemoryExperiment.id,
    title: contextMemoryExperiment.title,
    summary: contextMemoryExperiment.summary,
    status: 'available',
    experiment: contextMemoryExperiment,
  },
  {
    id: contextCompactionExperiment.id,
    title: contextCompactionExperiment.title,
    summary: contextCompactionExperiment.summary,
    status: 'available',
    experiment: contextCompactionExperiment,
  },
  {
    id: providerRoutingFallbackExperiment.id,
    title: providerRoutingFallbackExperiment.title,
    summary: providerRoutingFallbackExperiment.summary,
    status: 'available',
    experiment: providerRoutingFallbackExperiment,
  },
  {
    id: multiAgentDispatchExperiment.id,
    title: multiAgentDispatchExperiment.title,
    summary: multiAgentDispatchExperiment.summary,
    status: 'available',
    experiment: multiAgentDispatchExperiment,
  },
  {
    id: ragRetrievalFlowExperiment.id,
    title: ragRetrievalFlowExperiment.title,
    summary: ragRetrievalFlowExperiment.summary,
    status: 'available',
    experiment: ragRetrievalFlowExperiment,
  },
  {
    id: humanApprovalGateExperiment.id,
    title: humanApprovalGateExperiment.title,
    summary: humanApprovalGateExperiment.summary,
    status: 'available',
    experiment: humanApprovalGateExperiment,
  },
  {
    id: structuredOutputValidationExperiment.id,
    title: structuredOutputValidationExperiment.title,
    summary: structuredOutputValidationExperiment.summary,
    status: 'available',
    experiment: structuredOutputValidationExperiment,
  },
  {
    id: streamingInterruptControlExperiment.id,
    title: streamingInterruptControlExperiment.title,
    summary: streamingInterruptControlExperiment.summary,
    status: 'available',
    experiment: streamingInterruptControlExperiment,
  },
]
