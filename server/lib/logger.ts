/**
 * Structured Logging Service
 * Provides pino-based structured logging with service-specific child loggers
 */

import pino from 'pino';

// Determine log level from environment - normalize NODE_ENV by trimming whitespace
const NODE_ENV = (process.env.NODE_ENV || '').trim();
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_PRODUCTION = NODE_ENV === 'production' || process.env.VERCEL === '1';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug');

// Build pino options - completely exclude transport in production to avoid pino-pretty resolution
const pinoOptions: pino.LoggerOptions = {
  level: LOG_LEVEL,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: IS_PRODUCTION ? pino.stdTimeFunctions.isoTime : false,
};

// Only add transport config in development (local) mode
// Completely skip it in production/Vercel to avoid transport resolution issues
if (IS_DEVELOPMENT && !process.env.VERCEL) {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    }
  };
}

// Create base logger
export const logger = pino(pinoOptions);

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
