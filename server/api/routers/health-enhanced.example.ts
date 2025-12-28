/**
 * Enhanced Health Check Router - Example Implementation
 *
 * This file demonstrates how to add comprehensive health checks
 * for all critical services in Bottleneck Bots.
 *
 * To implement:
 * 1. Copy relevant checks to server/api/routers/health.ts
 * 2. Update imports and context references
 * 3. Test locally before deploying
 * 4. Configure external monitoring to use new endpoints
 */

import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { sql } from "drizzle-orm";
import { circuitBreakerRegistry } from "../../lib/circuitBreaker";

/**
 * Enhanced Health Router with Comprehensive Checks
 */
export const enhancedHealthRouter = router({
  /**
   * Single comprehensive health check endpoint
   * Suitable for external monitoring services (BetterStack, UptimeRobot, etc.)
   *
   * Returns:
   * - Overall status (healthy/degraded/unhealthy)
   * - Individual service checks with latencies
   * - Version and environment information
   * - System uptime
   *
   * @example
   * ```bash
   * curl https://bottleneckbot.com/api/trpc/health.comprehensive
   *
   * Response:
   * {
   *   "status": "healthy",
   *   "timestamp": "2025-12-18T10:30:00.000Z",
   *   "checks": {
   *     "database": { "healthy": true, "latency": 45 },
   *     "redis": { "healthy": true, "latency": 12 },
   *     "browserbase": { "healthy": true, "latency": 234 }
   *   },
   *   "version": "1.0.0",
   *   "uptime": 86400
   * }
   * ```
   */
  comprehensive: publicProcedure.query(async ({ ctx }) => {
    const startTime = Date.now();
    const checks: Record<string, any> = {};

    // ==========================================
    // 1. DATABASE HEALTH CHECK
    // ==========================================
    try {
      const dbStart = Date.now();
      await ctx.db.execute(sql`SELECT 1 as health_check`);
      const dbLatency = Date.now() - dbStart;

      checks.database = {
        healthy: dbLatency < 500, // Flag if >500ms
        latency: dbLatency,
        status: dbLatency < 100 ? 'excellent' : dbLatency < 500 ? 'good' : 'slow',
      };
    } catch (error: any) {
      checks.database = {
        healthy: false,
        error: error.message,
        status: 'error',
      };
    }

    // ==========================================
    // 2. REDIS HEALTH CHECK
    // ==========================================
    if (ctx.redis) {
      try {
        const redisStart = Date.now();
        await ctx.redis.ping();
        const redisLatency = Date.now() - redisStart;

        checks.redis = {
          healthy: redisLatency < 100,
          latency: redisLatency,
          status: redisLatency < 50 ? 'excellent' : redisLatency < 100 ? 'good' : 'slow',
        };
      } catch (error: any) {
        checks.redis = {
          healthy: false,
          error: error.message,
          status: 'error',
        };
      }
    } else {
      checks.redis = {
        healthy: true,
        status: 'not_configured',
        note: 'Redis is optional for this deployment',
      };
    }

    // ==========================================
    // 3. BROWSERBASE API HEALTH CHECK
    // ==========================================
    if (process.env.BROWSERBASE_API_KEY) {
      try {
        const bbStart = Date.now();
        const response = await fetch('https://api.browserbase.com/v1/sessions?limit=1', {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.BROWSERBASE_API_KEY,
          },
        });
        const bbLatency = Date.now() - bbStart;

        checks.browserbase = {
          healthy: response.ok && bbLatency < 2000,
          latency: bbLatency,
          status: response.ok ? 'operational' : 'error',
          httpStatus: response.status,
        };
      } catch (error: any) {
        checks.browserbase = {
          healthy: false,
          error: error.message,
          status: 'error',
        };
      }
    } else {
      checks.browserbase = {
        healthy: false,
        status: 'not_configured',
        warning: 'BROWSERBASE_API_KEY not set',
      };
    }

    // ==========================================
    // 4. CIRCUIT BREAKER STATUS
    // ==========================================
    try {
      const allHealth = circuitBreakerRegistry.getAllHealth();
      const unhealthyCircuits = Object.entries(allHealth)
        .filter(([_, health]) => !health.healthy)
        .map(([name, health]) => ({ name, state: health.state }));

      checks.circuitBreakers = {
        healthy: unhealthyCircuits.length === 0,
        totalCircuits: Object.keys(allHealth).length,
        unhealthyCount: unhealthyCircuits.length,
        unhealthyCircuits,
        status: unhealthyCircuits.length === 0 ? 'all_operational' : 'some_degraded',
      };
    } catch (error: any) {
      checks.circuitBreakers = {
        healthy: false,
        error: error.message,
        status: 'error',
      };
    }

    // ==========================================
    // 5. AI MODEL AVAILABILITY CHECK
    // ==========================================
    const aiModels = {
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
    };

    const availableModels = Object.entries(aiModels)
      .filter(([_, key]) => !!key)
      .map(([name]) => name);

    checks.aiModels = {
      healthy: availableModels.length > 0,
      available: availableModels,
      count: availableModels.length,
      status: availableModels.length > 0 ? 'operational' : 'no_models_configured',
      warning: availableModels.length === 0 ? 'No AI model API keys configured' : undefined,
    };

    // ==========================================
    // 6. STUCK BROWSER SESSIONS CHECK
    // ==========================================
    try {
      const { browserSessions } = await import('../../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const activeSessions = await ctx.db.query.browserSessions.findMany({
        where: eq(browserSessions.status, 'running'),
      });

      // Sessions running for >30 minutes are considered stuck
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const stuckSessions = activeSessions.filter(
        (s) => s.createdAt < thirtyMinutesAgo
      );

      checks.browserSessions = {
        healthy: stuckSessions.length < 3, // Warn if 3+ stuck sessions
        active: activeSessions.length,
        stuck: stuckSessions.length,
        status: stuckSessions.length === 0 ? 'normal' : 'stuck_sessions_detected',
        warning:
          stuckSessions.length > 0
            ? `${stuckSessions.length} sessions running >30 minutes`
            : undefined,
      };
    } catch (error: any) {
      checks.browserSessions = {
        healthy: true, // Don't fail overall health if this check fails
        error: error.message,
        status: 'check_failed',
        note: 'Could not query browser sessions - may be normal in development',
      };
    }

    // ==========================================
    // OVERALL HEALTH DETERMINATION
    // ==========================================
    const criticalChecks = ['database', 'browserbase', 'aiModels'];
    const criticalHealthy = criticalChecks.every(
      (check) => checks[check]?.healthy !== false
    );

    const allHealthy = Object.values(checks).every(
      (check: any) => check.healthy !== false
    );

    const status = allHealthy
      ? 'healthy'
      : criticalHealthy
      ? 'degraded'
      : 'unhealthy';

    const totalLatency = Date.now() - startTime;

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
      metadata: {
        totalCheckLatency: totalLatency,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
        platform: process.platform,
      },
    };
  }),

  /**
   * Database-specific health check
   * Tests connection, query performance, and connection pool status
   */
  database: publicProcedure.query(async ({ ctx }) => {
    const checks = [];

    // Check 1: Simple query test
    try {
      const start = Date.now();
      await ctx.db.execute(sql`SELECT 1 as health_check`);
      const latency = Date.now() - start;

      checks.push({
        name: 'simple_query',
        healthy: latency < 500,
        latency,
      });
    } catch (error: any) {
      checks.push({
        name: 'simple_query',
        healthy: false,
        error: error.message,
      });
    }

    // Check 2: Count records in a table (tests read access)
    try {
      const { users } = await import('../../../drizzle/schema');
      const start = Date.now();
      const result = await ctx.db.select().from(users).limit(1);
      const latency = Date.now() - start;

      checks.push({
        name: 'table_access',
        healthy: latency < 1000,
        latency,
        recordsFound: result.length,
      });
    } catch (error: any) {
      checks.push({
        name: 'table_access',
        healthy: false,
        error: error.message,
      });
    }

    const allHealthy = checks.every((c) => c.healthy);

    return {
      healthy: allHealthy,
      timestamp: new Date().toISOString(),
      checks,
      connectionPool: {
        // Add connection pool stats if available
        note: 'Connection pool metrics not yet implemented',
      },
    };
  }),

  /**
   * Redis-specific health check
   * Tests connection, latency, and memory usage
   */
  redisHealth: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.redis) {
      return {
        healthy: true,
        status: 'not_configured',
        message: 'Redis is optional for this deployment',
      };
    }

    try {
      // Ping test
      const pingStart = Date.now();
      await ctx.redis.ping();
      const pingLatency = Date.now() - pingStart;

      // Get Redis info
      const info = await ctx.redis.info('server');

      // Test get/set operations
      const testKey = `health_check_${Date.now()}`;
      const setStart = Date.now();
      await ctx.redis.set(testKey, 'test', 'EX', 60); // Expires in 60s
      const setValue = await ctx.redis.get(testKey);
      await ctx.redis.del(testKey);
      const operationLatency = Date.now() - setStart;

      return {
        healthy: pingLatency < 100 && operationLatency < 200,
        timestamp: new Date().toISOString(),
        metrics: {
          pingLatency,
          operationLatency,
          status: pingLatency < 50 ? 'excellent' : pingLatency < 100 ? 'good' : 'slow',
        },
        serverInfo: info,
        testPassed: setValue === 'test',
      };
    } catch (error: any) {
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message,
        status: 'error',
      };
    }
  }),

  /**
   * System resource health check
   * Memory usage, CPU load, disk space (if accessible)
   */
  systemResources: publicProcedure.query(async () => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Convert bytes to MB
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMemoryMB = memUsage.rss / 1024 / 1024;

    // Calculate heap usage percentage
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    const healthy = heapUsagePercent < 90; // Flag if heap usage >90%

    return {
      healthy,
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: `${heapUsedMB.toFixed(2)} MB`,
        heapTotal: `${heapTotalMB.toFixed(2)} MB`,
        heapUsagePercent: `${heapUsagePercent.toFixed(1)}%`,
        rss: `${rssMemoryMB.toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        note: 'CPU usage in microseconds since process start',
      },
      process: {
        uptime: `${(process.uptime() / 60).toFixed(1)} minutes`,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
      warnings:
        heapUsagePercent > 80
          ? [`High memory usage: ${heapUsagePercent.toFixed(1)}%`]
          : [],
    };
  }),

  /**
   * Minimal endpoint for simple liveness probes
   * Use this for Kubernetes/Docker health checks that need fast responses
   */
  ping: publicProcedure.query(async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }),
});

/**
 * USAGE EXAMPLES
 *
 * 1. Add to your main health router:
 *
 * ```typescript
 * // In server/api/routers/health.ts
 * import { enhancedHealthRouter } from './health-enhanced.example';
 *
 * export const healthRouter = router({
 *   ...existingEndpoints,
 *   ...enhancedHealthRouter,
 * });
 * ```
 *
 * 2. Configure external monitoring:
 *
 * ```yaml
 * # BetterStack configuration
 * monitors:
 *   - name: "Bottleneck Bots - Comprehensive Health"
 *     url: "https://bottleneckbot.com/api/trpc/health.comprehensive"
 *     method: GET
 *     interval: 60
 *     expected_status_codes: [200]
 *     response_body_contains: '"status":"healthy"'
 * ```
 *
 * 3. Test locally:
 *
 * ```bash
 * # Start dev server
 * pnpm dev
 *
 * # Test comprehensive health
 * curl http://localhost:3000/api/trpc/health.comprehensive
 *
 * # Test database health
 * curl http://localhost:3000/api/trpc/health.database
 *
 * # Test Redis health
 * curl http://localhost:3000/api/trpc/health.redisHealth
 * ```
 */
