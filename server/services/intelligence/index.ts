/**
 * Intelligence Services Index
 *
 * Centralized exports for all intelligence-related services
 */

// Failure Recovery
export {
  failureRecoveryService,
  createFailureRecoveryService,
  type FailureContext,
  type FailureAttempt,
  type PageState,
  type ErrorType,
  type RecoveryStrategy,
  type RecoveryResult,
  type FailurePattern,
} from './failureRecovery.service';

// Strategy Adaptation
export {
  strategyAdaptationService,
  createStrategyAdaptationService,
  type ExecutionContext,
  type PageAnalysis,
  type PageType,
  type Strategy,
  type StrategySettings,
  type SitePerformance,
  type StrategyRecommendation,
  type AdaptationEvent,
} from './strategyAdaptation.service';
