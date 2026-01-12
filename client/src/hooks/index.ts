/**
 * Hooks barrel export
 * Centralized exports for all application hooks
 */

// Keyboard & Input
export {
  useKeyboardShortcut,
  formatShortcut,
  isMac,
  type ShortcutConfig,
} from './useKeyboardShortcut';

export {
  useKeyboardShortcuts,
  formatShortcutKey,
  getDefaultShortcuts,
  type UseKeyboardShortcutsOptions,
  type UseKeyboardShortcutsReturn,
} from './useKeyboardShortcuts';

// 3D & Animation
export { use3DMouseTracking } from './use3DMouseTracking';
export { useParallax } from './useParallax';
export { useScrollAnimation } from './useScrollAnimation';
export { useReducedMotion } from './useReducedMotion';

// AI & Agents
export { useAI } from './useAI';
export { useAICalling } from './useAICalling';
export { useAgentExecution } from './useAgentExecution';
export { useAgentSSE } from './useAgentSSE';

// Browser & Automation
export { useBrowserAutomation } from './useBrowserAutomation';
export { useBrowserSession } from './useBrowserSession';
export { useBrowserSessions } from './useBrowserSessions';

// Forms & Validation
export { useFormValidation } from './useFormValidation';
export { useComposition } from './useComposition';

// Data & Operations
export { useBulkOperations } from './useBulkOperations';
export { useLeadEnrichment } from './useLeadEnrichment';

// User & Auth
export { useAuth } from './useAuth';
export { useCredits } from './useCredits';
export { useConversionTracking } from './useConversionTracking';

// UI & Interactions
export { useIsMobile } from './useMobile';
export { useNotifications } from './useNotifications';
export { useTour } from './useTour';
export { useQuiz } from './useQuiz';
export { useQuizTimer } from './useQuizTimer';

// Utilities
export { usePersistFn } from './usePersistFn';
