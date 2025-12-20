// Simple debug endpoint - no app import, just Vercel function test
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const testImport = req.query.import === 'true';

  try {
    // Check what's in the dist directory
    const distPath = path.join(process.cwd(), 'dist');
    const distExists = fs.existsSync(distPath);

    let distContents: string[] = [];
    if (distExists) {
      try {
        distContents = fs.readdirSync(distPath);
      } catch (e) {
        distContents = [`Error reading dist: ${e}`];
      }
    }

    // Check for dist/index.js
    const indexPath = path.join(distPath, 'index.js');
    const indexExists = fs.existsSync(indexPath);

    // Basic result
    const result: any = {
      status: 'ok',
      environment: {
        node: process.version,
        cwd: process.cwd(),
        vercel: process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
      },
      dist: {
        exists: distExists,
        contents: distContents,
        indexExists: indexExists,
      },
      envVars: {
        hasDatabase: !!process.env.DATABASE_URL,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      }
    };

    // Try to import and run createApp if requested
    if (testImport && indexExists) {
      try {
        // Dynamic import from absolute path
        const distModule = await import(indexPath);
        result.import = {
          success: true,
          exports: Object.keys(distModule),
          hasCreateApp: typeof distModule.createApp === 'function',
          hasDefault: typeof distModule.default === 'function',
        };

        // Try to call createApp
        if (distModule.createApp) {
          try {
            const app = await distModule.createApp();
            result.createApp = {
              success: true,
              type: typeof app,
            };
          } catch (appError: any) {
            result.createApp = {
              success: false,
              error: appError.message,
              stack: appError.stack?.split('\n').slice(0, 10),
            };
          }
        }
      } catch (importError: any) {
        result.import = {
          success: false,
          error: importError.message,
          stack: importError.stack?.split('\n').slice(0, 10),
        };
      }
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Debug endpoint error',
      message: error.message,
      stack: error.stack,
    });
  }
}
