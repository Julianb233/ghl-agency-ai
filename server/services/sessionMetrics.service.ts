/**
 * Session Metrics Service
 *
 * Tracks session operations, usage metrics, and calculates costs
 * for browser automation sessions.
 */

interface SessionMetrics {
  sessionId: string;
  userId: number;
  startTime: Date;
  endTime?: Date;
  operations: OperationMetric[];
  totalOperations: number;
  durationMs?: number;
}

interface OperationMetric {
  type: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  durationMs?: number;
}

interface SessionCost {
  sessionDurationMinutes: number;
  operationCount: number;
  estimatedCost: number;
  currency: string;
}

class SessionMetricsService {
  private static instance: SessionMetricsService;
  private metricsCache: Map<string, SessionMetrics> = new Map();

  private constructor() {}

  public static getInstance(): SessionMetricsService {
    if (!SessionMetricsService.instance) {
      SessionMetricsService.instance = new SessionMetricsService();
    }
    return SessionMetricsService.instance;
  }

  /**
   * Track session start
   */
  public async trackSessionStart(sessionId: string, userId: number): Promise<void> {
    const metrics: SessionMetrics = {
      sessionId,
      userId,
      startTime: new Date(),
      operations: [],
      totalOperations: 0,
    };

    this.metricsCache.set(sessionId, metrics);
    console.log(`[SessionMetrics] Started tracking session: ${sessionId}`);
  }

  /**
   * Track an operation within a session
   */
  public async trackOperation(
    sessionId: string,
    operationType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const metrics = this.metricsCache.get(sessionId);
    if (!metrics) {
      console.warn(`[SessionMetrics] Session ${sessionId} not found for tracking`);
      return;
    }

    const operation: OperationMetric = {
      type: operationType,
      timestamp: new Date(),
      metadata,
    };

    metrics.operations.push(operation);
    metrics.totalOperations++;

    console.log(`[SessionMetrics] Tracked operation: ${operationType} for session ${sessionId}`);
  }

  /**
   * Track session end
   */
  public async trackSessionEnd(sessionId: string, status: string): Promise<void> {
    const metrics = this.metricsCache.get(sessionId);
    if (!metrics) {
      console.warn(`[SessionMetrics] Session ${sessionId} not found for end tracking`);
      return;
    }

    metrics.endTime = new Date();
    metrics.durationMs = metrics.endTime.getTime() - metrics.startTime.getTime();

    console.log(`[SessionMetrics] Session ${sessionId} ended with status: ${status}, duration: ${metrics.durationMs}ms`);
  }

  /**
   * Get metrics for a session
   */
  public async getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
    return this.metricsCache.get(sessionId) || null;
  }

  /**
   * Calculate estimated cost for a session
   * Based on Browserbase pricing model
   */
  public async calculateCost(sessionId: string): Promise<SessionCost> {
    const metrics = this.metricsCache.get(sessionId);

    if (!metrics) {
      return {
        sessionDurationMinutes: 0,
        operationCount: 0,
        estimatedCost: 0,
        currency: "USD",
      };
    }

    const endTime = metrics.endTime || new Date();
    const durationMs = endTime.getTime() - metrics.startTime.getTime();
    const durationMinutes = Math.ceil(durationMs / 60000);

    // Browserbase pricing: ~$0.10 per minute (estimate)
    const costPerMinute = 0.10;
    const estimatedCost = durationMinutes * costPerMinute;

    return {
      sessionDurationMinutes: durationMinutes,
      operationCount: metrics.totalOperations,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      currency: "USD",
    };
  }

  /**
   * Get all metrics for a user
   */
  public async getUserMetrics(userId: number): Promise<SessionMetrics[]> {
    const userMetrics: SessionMetrics[] = [];

    for (const metrics of this.metricsCache.values()) {
      if (metrics.userId === userId) {
        userMetrics.push(metrics);
      }
    }

    return userMetrics;
  }

  /**
   * Clear metrics for a session
   */
  public clearSessionMetrics(sessionId: string): void {
    this.metricsCache.delete(sessionId);
  }

  /**
   * Get aggregate stats
   */
  public getAggregateStats(): {
    activeSessions: number;
    totalOperations: number;
  } {
    let totalOperations = 0;
    for (const metrics of this.metricsCache.values()) {
      totalOperations += metrics.totalOperations;
    }

    return {
      activeSessions: this.metricsCache.size,
      totalOperations,
    };
  }
}

// Export singleton instance
export const sessionMetricsService = SessionMetricsService.getInstance();

// Export class for testing
export { SessionMetricsService };
