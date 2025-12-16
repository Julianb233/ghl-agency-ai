/**
 * Agent Components Index
 *
 * Export all agent-related components for easy import
 */

// Core components
export { AgentDashboard } from './AgentDashboard';
export { ExecutionViewer } from './ExecutionViewer';
export { AgentThinkingViewer } from './AgentThinkingViewer';
export { ExecutionHeader } from './ExecutionHeader';
export { ExecutionHistory } from './ExecutionHistory';
export { PlanDisplay } from './PlanDisplay';
export { TaskInput } from './TaskInput';
export { TaskTemplates, TASK_TEMPLATES } from './TaskTemplates';
export type { TaskTemplate } from './TaskTemplates';
export { ThinkingStepCard } from './ThinkingStepCard';

// Enhanced UX components (Agent 1 implementation)
export {
  EnhancedProgressDisplay,
  CompactProgress,
  useProgressFromSSE,
} from './EnhancedProgressDisplay';
export type { ProgressData, PhaseInfo } from './EnhancedProgressDisplay';

export {
  EnhancedBrowserLiveView,
  useBrowserActions,
} from './EnhancedBrowserLiveView';
export type { BrowserAction } from './EnhancedBrowserLiveView';

export {
  EnhancedReasoningDisplay,
  useReasoningFromSSE,
} from './EnhancedReasoningDisplay';
export type { ReasoningStep, ThinkingStream } from './EnhancedReasoningDisplay';

// Existing enhanced components
export { BrowserLiveView } from './BrowserLiveView';
export { ReasoningChain } from './ReasoningChain';
export { ActionPreview } from './ActionPreview';
export { InteractiveTaskCreator } from './InteractiveTaskCreator';
export { PhaseProgressTimeline } from './PhaseProgressTimeline';
export { ThinkingBubble } from './ThinkingBubble';
