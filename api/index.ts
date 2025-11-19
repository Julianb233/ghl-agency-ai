// Vercel serverless function wrapper for Express app
// This file is used by Vercel to handle all requests

import type { VercelRequest, VercelResponse } from '@vercel/node';

// @ts-ignore - dist/index.js is generated at build time
import createApp from '../dist/index.js';

// Cache the Express app instance
let cachedApp: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set VERCEL environment variable for the app
  process.env.VERCEL = "1";
  process.env.NODE_ENV = "production";

  if (!cachedApp) {
    cachedApp = await createApp();
  }

  // app is guaranteed to be non-null here
  if (!cachedApp) {
    res.status(500).send('Failed to initialize application');
    return;
  }

  // Express apps are request handlers: (req, res, next?) => void
  // @ts-ignore - Express app is callable
  return cachedApp(req, res);
}
