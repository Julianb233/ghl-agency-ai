/**
 * Structured Logging Service
 * Provides pino-based structured logging with service-specific child loggers
 */

import pino from 'pino';

// Determine log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create base logger with appropriate transport
export const logger = pino({
  level: LOG_LEVEL,
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  // Add timestamp in production
  timestamp: process.env.NODE_ENV === 'production'
    ? pino.stdTimeFunctions.isoTime
    : false,
});

// Create child loggers for each service
export const serviceLoggers = {
  vapi: logger.child({ service: 'vapi' }),
  email: logger.child({ service: 'email' }),
  enrichment: logger.child({ service: 'enrichment' }),
  workflow: logger.child({ service: 'workflow' }),
  cache: logger.child({ service: 'cache' }),
  queue: logger.child({ service: 'queue' }),
  cron: logger.child({ service: 'cron' }),
  seo: logger.child({ service: 'seo' }),
  ads: logger.child({ service: 'ads' }),
  rag: logger.child({ service: 'rag' }),
  api: logger.child({ service: 'api' }),
  webhook: logger.child({ service: 'webhook' }),
  browser: logger.child({ service: 'browser' }),
  oauth: logger.child({ service: 'oauth' }),
  onboarding: logger.child({ service: 'onboarding' }),
  pdf: logger.child({ service: 'pdf' }),
  task: logger.child({ service: 'task' }),
  platform: logger.child({ service: 'platform' }),
  session: logger.child({ service: 'session' }),
  websocket: logger.child({ service: 'websocket' }),
  worker: logger.child({ service: 'worker' }),
  apify: logger.child({ service: 'apify' }),
  deployment: logger.child({ service: 'deployment' }),
};

/**
 * Create a request-scoped logger with request ID
 */
export function createRequestLogger(requestId: string, service?: string) {
  const baseLogger = service ? serviceLoggers[service as keyof typeof serviceLoggers] || logger : logger;
  return baseLogger.child({ requestId });
}

/**
 * Create a user-scoped logger
 */
export function createUserLogger(userId: number, service?: string) {
  const baseLogger = service ? serviceLoggers[service as keyof typeof serviceLoggers] || logger : logger;
  return baseLogger.child({ userId });
}

/**
 * Log levels available:
 * - trace: Very detailed debug information
 * - debug: Debug information
 * - info: General informational messages
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal error messages (will cause process exit)
 */

export default logger;
