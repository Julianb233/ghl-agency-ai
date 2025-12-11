import dotenv from "dotenv";
dotenv.config({ override: true });

// Disable pino-pretty transport to prevent bundling issues in production/serverless
// This must be set BEFORE any Stagehand imports happen
process.env.PINO_DISABLE_PRETTY = 'true';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';

console.log("[Config] Environment variables loaded");
