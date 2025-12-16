/**
 * Agent Progress Tracker Service
 *
 * Provides real-time progress tracking with:
 * - Step counting and estimation
 * - ETA calculation based on historical data
 * - Progress event emission to SSE
 * - Intelligent time estimates that improve over execution
 */

import { AgentSSEEmitter, emitProgress } from '../_core/agent-sse-events';

// ========================================
// TYPES
// ========================================

export interface ProgressState {
  executionId: string;
  userId: number;
  taskType: string;

  // Step tracking
  currentStep: number;
  totalSteps: number;
  completedSteps: number;

  // Time tracking
  startTime: number;
  lastStepTime: number;
  stepDurations: number[];

  // Current action
  currentAction: string;
  currentPhase: string;

  // Estimates
  estimatedTotalDuration: number;
  estimatedTimeRemaining: number;
  confidence: number; // 0-1, increases as more steps complete

  // History for learning
  phaseHistory: Array<{
    name: string;
    startTime: number;
    endTime?: number;
    steps: number;
  }>;
}

export interface ProgressUpdate {
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  currentAction: string;
  currentPhase?: string;
  confidence?: number;
}

// ========================================
// CONSTANTS
// ========================================

// Average step duration by task type (in ms), used for initial estimates
const AVERAGE_STEP_DURATIONS: Record<string, number> = {
  'ghl_workflow': 15000,    // GHL workflows are complex
  'browser_navigation': 5000,
  'form_filling': 8000,
  'data_extraction': 10000,
  'general': 10000,
};

// Typical step counts by task type
const TYPICAL_STEP_COUNTS: Record<string, number> = {
  'ghl_workflow': 15,
  'browser_navigation': 5,
  'form_filling': 8,
  'data_extraction': 10,
  'general': 12,
};

// ========================================
// PROGRESS TRACKER CLASS
// ========================================

export class AgentProgressTracker {
  private state: ProgressState;
  private emitter: AgentSSEEmitter;

  constructor(
    executionId: string,
    userId: number,
    taskType: string = 'general',
    estimatedSteps?: number
  ) {
    const now = Date.now();
    const typicalSteps = estimatedSteps || TYPICAL_STEP_COUNTS[taskType] || 12;
    const avgDuration = AVERAGE_STEP_DURATIONS[taskType] || 10000;

    this.state = {
      executionId,
      userId,
      taskType,
      currentStep: 0,
      totalSteps: typicalSteps,
      completedSteps: 0,
      startTime: now,
      lastStepTime: now,
      stepDurations: [],
      currentAction: 'Initializing...',
      currentPhase: 'setup',
      estimatedTotalDuration: typicalSteps * avgDuration,
      estimatedTimeRemaining: typicalSteps * avgDuration,
      confidence: 0.3, // Low confidence initially
      phaseHistory: [],
    };

    this.emitter = new AgentSSEEmitter(userId, executionId);

    // Emit initial progress
    this.emitProgressUpdate();
  }

  /**
   * Update the current step
   */
  stepStarted(action: string, phase?: string): void {
    this.state.currentStep++;
    this.state.currentAction = action;

    if (phase && phase !== this.state.currentPhase) {
      this.startPhase(phase);
    }

    this.emitProgressUpdate();
  }

  /**
   * Mark current step as completed
   */
  stepCompleted(): void {
    const now = Date.now();
    const stepDuration = now - this.state.lastStepTime;

    this.state.stepDurations.push(stepDuration);
    this.state.completedSteps++;
    this.state.lastStepTime = now;

    // Update estimates based on actual performance
    this.recalculateEstimates();
    this.emitProgressUpdate();
  }

  /**
   * Update total step estimate (as we learn more about the task)
   */
  updateTotalSteps(newTotal: number): void {
    if (newTotal > 0) {
      this.state.totalSteps = newTotal;
      this.recalculateEstimates();
      this.emitProgressUpdate();
    }
  }

  /**
   * Start a new phase
   */
  startPhase(phaseName: string): void {
    const now = Date.now();

    // End previous phase if exists
    if (this.state.phaseHistory.length > 0) {
      const lastPhase = this.state.phaseHistory[this.state.phaseHistory.length - 1];
      if (!lastPhase.endTime) {
        lastPhase.endTime = now;
        lastPhase.steps = this.state.currentStep;
      }
    }

    // Start new phase
    this.state.currentPhase = phaseName;
    this.state.phaseHistory.push({
      name: phaseName,
      startTime: now,
      steps: 0,
    });

    this.emitProgressUpdate();
  }

  /**
   * Get current progress state
   */
  getProgress(): ProgressUpdate {
    const now = Date.now();
    const elapsed = now - this.state.startTime;
    const percentComplete = Math.min(
      (this.state.completedSteps / Math.max(this.state.totalSteps, 1)) * 100,
      99 // Never show 100% until truly complete
    );

    return {
      currentStep: this.state.currentStep,
      totalSteps: this.state.totalSteps,
      percentComplete: Math.round(percentComplete * 10) / 10,
      elapsedTime: elapsed,
      estimatedTimeRemaining: Math.max(0, this.state.estimatedTimeRemaining),
      currentAction: this.state.currentAction,
      currentPhase: this.state.currentPhase,
      confidence: this.state.confidence,
    };
  }

  /**
   * Mark execution as complete
   */
  complete(success: boolean): void {
    const now = Date.now();

    this.state.currentStep = this.state.totalSteps;
    this.state.completedSteps = this.state.totalSteps;
    this.state.estimatedTimeRemaining = 0;
    this.state.currentAction = success ? 'Completed successfully' : 'Execution failed';
    this.state.confidence = 1;

    // End final phase
    if (this.state.phaseHistory.length > 0) {
      const lastPhase = this.state.phaseHistory[this.state.phaseHistory.length - 1];
      if (!lastPhase.endTime) {
        lastPhase.endTime = now;
        lastPhase.steps = this.state.currentStep;
      }
    }

    this.emitProgressUpdate();
  }

  /**
   * Recalculate time estimates based on actual performance
   */
  private recalculateEstimates(): void {
    const now = Date.now();
    const elapsed = now - this.state.startTime;

    if (this.state.stepDurations.length > 0) {
      // Calculate average step duration from actual data
      const avgStepDuration = this.state.stepDurations.reduce((a, b) => a + b, 0)
        / this.state.stepDurations.length;

      // Calculate remaining steps
      const remainingSteps = Math.max(0, this.state.totalSteps - this.state.completedSteps);

      // Use weighted average: actual data + historical baseline
      // As we get more data, rely more on actual performance
      const dataWeight = Math.min(this.state.stepDurations.length / 5, 0.9);
      const baselineWeight = 1 - dataWeight;

      const baselineDuration = AVERAGE_STEP_DURATIONS[this.state.taskType] || 10000;
      const weightedAvgDuration = (avgStepDuration * dataWeight) + (baselineDuration * baselineWeight);

      this.state.estimatedTimeRemaining = Math.round(remainingSteps * weightedAvgDuration);
      this.state.estimatedTotalDuration = elapsed + this.state.estimatedTimeRemaining;

      // Increase confidence as we complete more steps
      this.state.confidence = Math.min(0.3 + (this.state.completedSteps / this.state.totalSteps) * 0.7, 0.95);
    } else {
      // No data yet, use baseline
      const baselineDuration = AVERAGE_STEP_DURATIONS[this.state.taskType] || 10000;
      const remainingSteps = Math.max(0, this.state.totalSteps - this.state.completedSteps);
      this.state.estimatedTimeRemaining = remainingSteps * baselineDuration;
    }
  }

  /**
   * Emit progress update via SSE
   */
  private emitProgressUpdate(): void {
    const progress = this.getProgress();

    emitProgress(
      this.state.userId,
      this.state.executionId,
      {
        currentStep: progress.currentStep,
        totalSteps: progress.totalSteps,
        percentComplete: progress.percentComplete,
        elapsedTime: progress.elapsedTime,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        currentAction: progress.currentAction,
      }
    );
  }

  /**
   * Get execution statistics for learning
   */
  getStats(): {
    totalDuration: number;
    avgStepDuration: number;
    stepCount: number;
    phases: Array<{ name: string; duration: number; steps: number }>;
  } {
    const totalDuration = Date.now() - this.state.startTime;
    const avgStepDuration = this.state.stepDurations.length > 0
      ? this.state.stepDurations.reduce((a, b) => a + b, 0) / this.state.stepDurations.length
      : 0;

    const phases = this.state.phaseHistory.map((p) => ({
      name: p.name,
      duration: (p.endTime || Date.now()) - p.startTime,
      steps: p.steps,
    }));

    return {
      totalDuration,
      avgStepDuration,
      stepCount: this.state.completedSteps,
      phases,
    };
  }
}

// ========================================
// FACTORY FUNCTION
// ========================================

/**
 * Create a progress tracker for an execution
 */
export function createProgressTracker(
  executionId: string,
  userId: number,
  taskType?: string,
  estimatedSteps?: number
): AgentProgressTracker {
  return new AgentProgressTracker(executionId, userId, taskType, estimatedSteps);
}

/**
 * Infer task type from description
 */
export function inferTaskType(taskDescription: string): string {
  const lower = taskDescription.toLowerCase();

  if (lower.includes('ghl') || lower.includes('gohighlevel') || lower.includes('high level')) {
    return 'ghl_workflow';
  }
  if (lower.includes('navigate') || lower.includes('go to') || lower.includes('open')) {
    return 'browser_navigation';
  }
  if (lower.includes('fill') || lower.includes('form') || lower.includes('input') || lower.includes('enter')) {
    return 'form_filling';
  }
  if (lower.includes('extract') || lower.includes('scrape') || lower.includes('get data')) {
    return 'data_extraction';
  }

  return 'general';
}

/**
 * Estimate step count from task description
 */
export function estimateStepCount(taskDescription: string, taskType: string): number {
  // Count action words to estimate complexity
  const actionWords = ['click', 'navigate', 'fill', 'type', 'select', 'submit', 'wait',
                       'extract', 'download', 'upload', 'login', 'logout', 'create',
                       'delete', 'update', 'search', 'filter', 'scroll'];

  let actionCount = 0;
  const lower = taskDescription.toLowerCase();

  for (const word of actionWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      actionCount += matches.length;
    }
  }

  // Estimate steps: at least typical count, more if many actions mentioned
  const baseline = TYPICAL_STEP_COUNTS[taskType] || 12;
  return Math.max(baseline, actionCount * 2);
}
