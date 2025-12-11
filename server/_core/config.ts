import dotenv from "dotenv";
dotenv.config({ override: true });

// Disable pino-pretty transport to prevent bundling issues in production/serverless
// This must be set BEFORE any Stagehand imports happen
process.env.PINO_DISABLE_PRETTY = 'true';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';

// Additional pino configuration for serverless environments
// Force pino to use stdout stream instead of worker thread transports
if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // In serverless, prevent pino from using worker threads
  process.env.PINO_WORKER = 'false';
}

console.log("[Config] Environment variables loaded");
