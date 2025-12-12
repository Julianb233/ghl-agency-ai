/**
 * Code Generator API Routes
 *
 * RESTful API endpoints for AI-powered code generation
 */

import { Router, Request, Response } from 'express';
import { codeGeneratorService } from '../services/code-generator.service';
import type { ProjectContext } from '../services/code-generator.service';

const router = Router();

/**
 * POST /api/code-generator/component
 * Generate a React component
 */
router.post('/component', async (req: Request, res: Response) => {
  try {
    const { prompt, projectId, techStack, existingFiles, features } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const context: ProjectContext = {
      projectId: projectId || 0,
      techStack: techStack || 'React 19 + TypeScript + Tailwind CSS',
      existingFiles: existingFiles || [],
      features: features || {},
    };

    const result = await codeGeneratorService.generateComponent(prompt, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Component generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate component',
    });
  }
});

/**
 * POST /api/code-generator/page
 * Generate a complete page with components
 */
router.post('/page', async (req: Request, res: Response) => {
  try {
    const { prompt, projectId, techStack, existingFiles, features } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const context: ProjectContext = {
      projectId: projectId || 0,
      techStack: techStack || 'React 19 + TypeScript + Tailwind CSS + React Router',
      existingFiles: existingFiles || [],
      features: features || {},
    };

    const result = await codeGeneratorService.generatePage(prompt, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Page generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate page',
    });
  }
});

/**
 * POST /api/code-generator/modify
 * Modify an existing file
 */
router.post('/modify', async (req: Request, res: Response) => {
  try {
    const { filePath, instruction, projectId, techStack, existingFiles } = req.body;

    if (!filePath || !instruction) {
      return res.status(400).json({ error: 'filePath and instruction are required' });
    }

    if (!existingFiles || !Array.isArray(existingFiles) || existingFiles.length === 0) {
      return res.status(400).json({ error: 'existingFiles array is required' });
    }

    const context: ProjectContext = {
      projectId: projectId || 0,
      techStack: techStack || 'React 19 + TypeScript + Tailwind CSS',
      existingFiles,
    };

    const result = await codeGeneratorService.modifyFile(
      filePath,
      instruction,
      context
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('File modification error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to modify file',
    });
  }
});

/**
 * POST /api/code-generator/project
 * Generate a complete full-stack project
 */
router.post('/project', async (req: Request, res: Response) => {
  try {
    const { description, techStack } = req.body;

    if (!description || !techStack) {
      return res.status(400).json({ error: 'description and techStack are required' });
    }

    const result = await codeGeneratorService.generateFullProject(
      description,
      techStack
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Project generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate project',
    });
  }
});

/**
 * POST /api/code-generator/analyze
 * Analyze an existing project
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { projectId, techStack, existingFiles, features } = req.body;

    if (!existingFiles || !Array.isArray(existingFiles) || existingFiles.length === 0) {
      return res.status(400).json({ error: 'existingFiles array is required' });
    }

    const context: ProjectContext = {
      projectId: projectId || 0,
      techStack: techStack || 'React 19 + TypeScript + Tailwind CSS',
      existingFiles,
      features: features || {},
    };

    const result = await codeGeneratorService.analyzeProject(context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Project analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze project',
    });
  }
});

/**
 * POST /api/code-generator/stream
 * Generate code with streaming (SSE)
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { prompt, projectId, techStack, existingFiles, features } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const context: ProjectContext = {
      projectId: projectId || 0,
      techStack: techStack || 'React 19 + TypeScript + Tailwind CSS',
      existingFiles: existingFiles || [],
      features: features || {},
    };

    const result = await codeGeneratorService.generateWithStreaming(
      prompt,
      context,
      (chunk) => {
        // Send chunk via SSE
        res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`);
      }
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming generation error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to generate code'
    })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/code-generator/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'code-generator',
    status: 'healthy',
    model: 'claude-3-5-sonnet-20241022',
  });
});

export default router;
