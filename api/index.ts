// Vercel serverless function wrapper for Express app
// This file is used by Vercel to handle all requests

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

// @ts-ignore - dist/index.js is generated at build time
import createApp from '../dist/index.js';

// Cache the Express app instance
let app: Express | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set VERCEL environment variable for the app
  process.env.VERCEL = "1";
  process.env.NODE_ENV = "production";
  
  if (!app) {
    app = await createApp();
  }
  
  // app is guaranteed to be non-null here
  if (!app) {
    res.status(500).send('Failed to initialize application');
    return;
  }
  
  // Express apps are functions that take (req, res, next)
  return app(req as any, res as any);
}

