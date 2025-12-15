/**
 * Tenant Isolation API Examples
 * Demonstrates how to use tenant isolation in Express API routes
 */

import express, { Request, Response, Router } from 'express';
import { requireApiKey, type AuthenticatedRequest } from '../middleware/authMiddleware';
import { tenantContextMiddleware, type TenantRequest } from '../middleware/tenantMiddleware';
import { getAgentMemory } from '../../../services/memory/agentMemory.service';
import { getReasoningBank } from '../../../services/memory/reasoningBank.service';
import { createTenantDataAccess, createTenantWhere } from '../../../services/dbHelpers.service';
import { getTenantService } from '../../../services/tenantIsolation.service';
import { getDb } from '../../../db';
import { documents } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Apply tenant isolation middleware to all routes in this router
router.use(requireApiKey);           // 1. Authenticate user
router.use(tenantContextMiddleware); // 2. Establish tenant context

// ========================================
// EXAMPLE 1: Agent Memory Operations
// ========================================

/**
 * Store agent memory
 * POST /api/v1/memory/store
 *
 * Request body:
 * {
 *   "sessionId": "session-123",
 *   "key": "agent-state",
 *   "value": { "thinking": "reasoning data" },
 *   "ttl": 3600
 * }
 */
router.post('/memory/store', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, key, value, ttl, metadata } = req.body;

    if (!sessionId || !key || !value) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'sessionId, key, and value are required',
      });
      return;
    }

    const agentMemory = getAgentMemory();

    // Store memory - automatically scoped to tenant
    const entryId = await agentMemory.storeContext(
      sessionId,
      key,
      value,
      {
        ttl,
        metadata,
        // userId is auto-injected from tenant context
      }
    );

    res.json({
      success: true,
      entryId,
      tenantContext: req.tenantContext, // For demonstration
    });
  } catch (error) {
    console.error('Store memory error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to store memory',
    });
  }
});

/**
 * Retrieve agent memory
 * GET /api/v1/memory/:sessionId
 */
router.get('/memory/:sessionId', async (req: TenantRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const agentMemory = getAgentMemory();

    // Retrieve memory - automatically filtered by tenant
    const entries = await agentMemory.retrieveContext(sessionId);

    res.json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    console.error('Retrieve memory error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve memory',
    });
  }
});

/**
 * Search agent memory
 * POST /api/v1/memory/search
 *
 * Request body:
 * {
 *   "namespace": "agent-memory",
 *   "type": "context",
 *   "limit": 50
 * }
 */
router.post('/memory/search', async (req: TenantRequest, res: Response) => {
  try {
    const query = req.body;

    const agentMemory = getAgentMemory();

    // Search memory - automatically scoped to tenant
    const results = await agentMemory.searchContext(query);

    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Search memory error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search memory',
    });
  }
});

// ========================================
// EXAMPLE 2: Reasoning Bank Operations
// ========================================

/**
 * Store reasoning pattern
 * POST /api/v1/reasoning/store
 *
 * Request body:
 * {
 *   "pattern": "When user asks for X, do Y",
 *   "result": { "action": "Y", "confidence": 0.9 },
 *   "domain": "customer-support",
 *   "tags": ["faq", "automation"]
 * }
 */
router.post('/reasoning/store', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { pattern, result, domain, tags, metadata } = req.body;

    if (!pattern || !result) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'pattern and result are required',
      });
      return;
    }

    const reasoningBank = getReasoningBank();

    // Store reasoning - automatically scoped to tenant
    const patternId = await reasoningBank.storeReasoning(
      pattern,
      result,
      {
        domain,
        tags,
        metadata,
      }
    );

    res.json({
      success: true,
      patternId,
    });
  } catch (error) {
    console.error('Store reasoning error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to store reasoning pattern',
    });
  }
});

/**
 * Find similar reasoning patterns
 * POST /api/v1/reasoning/search
 *
 * Request body:
 * {
 *   "query": "user asks for help",
 *   "domain": "customer-support",
 *   "minConfidence": 0.7,
 *   "limit": 5
 * }
 */
router.post('/reasoning/search', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { query, domain, minConfidence, limit } = req.body;

    if (!query) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'query is required',
      });
      return;
    }

    const reasoningBank = getReasoningBank();

    // Search reasoning - only within tenant's patterns
    const results = await reasoningBank.findSimilarReasoning(
      query,
      {
        domain,
        minConfidence,
        limit,
      }
    );

    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Search reasoning error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search reasoning patterns',
    });
  }
});

// ========================================
// EXAMPLE 3: Database Operations with Helpers
// ========================================

/**
 * Get all documents for current tenant
 * GET /api/v1/documents
 */
router.get('/documents', async (req: TenantRequest, res: Response) => {
  try {
    const dataAccess = createTenantDataAccess();

    // Automatically filtered by tenant userId
    const allDocs = await dataAccess.findAll(documents, {
      limit: 100,
      offset: 0,
    });

    res.json({
      success: true,
      count: allDocs.length,
      documents: allDocs,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve documents',
    });
  }
});

/**
 * Get document by ID
 * GET /api/v1/documents/:id
 */
router.get('/documents/:id', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid document ID',
      });
      return;
    }

    const dataAccess = createTenantDataAccess();

    // Automatically validates tenant ownership
    const doc = await dataAccess.findById(documents, docId);

    if (!doc) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found or access denied',
      });
      return;
    }

    res.json({
      success: true,
      document: doc,
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve document',
    });
  }
});

/**
 * Update document
 * PUT /api/v1/documents/:id
 *
 * Request body:
 * {
 *   "name": "Updated Name",
 *   "metadata": { ... }
 * }
 */
router.put('/documents/:id', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid document ID',
      });
      return;
    }

    const { name, metadata } = req.body;
    const dataAccess = createTenantDataAccess();

    // Automatically validates tenant ownership before update
    const updated = await dataAccess.updateById(
      documents,
      docId,
      {
        name,
        // metadata, // Uncomment if documents table has metadata column
        updatedAt: new Date(),
      }
    );

    if (!updated) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found or access denied',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update document',
    });
  }
});

/**
 * Delete document
 * DELETE /api/v1/documents/:id
 */
router.delete('/documents/:id', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid document ID',
      });
      return;
    }

    const dataAccess = createTenantDataAccess();

    // Automatically validates tenant ownership before delete
    const deleted = await dataAccess.deleteById(documents, docId);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found or access denied',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete document',
    });
  }
});

// ========================================
// EXAMPLE 4: Manual Tenant Filtering
// ========================================

/**
 * Search documents with custom filters
 * POST /api/v1/documents/search
 *
 * Request body:
 * {
 *   "type": "pdf",
 *   "query": "search term"
 * }
 */
router.post('/documents/search', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { type, query } = req.body;

    const db = await getDb();
    if (!db) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Database connection unavailable',
      });
      return;
    }

    // Build conditions with tenant filtering
    const conditions = [];

    if (type) {
      conditions.push(eq(documents.type, type));
    }

    // Use helper to add tenant filter
    const where = createTenantWhere(documents.userId, ...conditions);

    const results = await db
      .select()
      .from(documents)
      .where(where)
      .limit(100);

    res.json({
      success: true,
      count: results.length,
      documents: results,
    });
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search documents',
    });
  }
});

// ========================================
// EXAMPLE 5: Tenant Metadata Endpoint
// ========================================

/**
 * Get current tenant context information
 * GET /api/v1/tenant/info
 */
router.get('/tenant/info', async (req: TenantRequest, res: Response) => {
  try {
    const tenantService = getTenantService();

    const metadata = tenantService.getTenantMetadata();

    res.json({
      success: true,
      tenant: metadata,
      request: {
        tenantContext: req.tenantContext,
      },
    });
  } catch (error) {
    console.error('Get tenant info error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve tenant information',
    });
  }
});

// ========================================
// EXAMPLE 6: Batch Operations
// ========================================

/**
 * Batch create memory entries
 * POST /api/v1/memory/batch
 *
 * Request body:
 * {
 *   "sessionId": "session-123",
 *   "entries": [
 *     { "key": "key1", "value": "value1" },
 *     { "key": "key2", "value": "value2" }
 *   ]
 * }
 */
router.post('/memory/batch', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, entries } = req.body;

    if (!sessionId || !Array.isArray(entries)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'sessionId and entries array are required',
      });
      return;
    }

    const agentMemory = getAgentMemory();
    const entryIds = [];

    // All entries automatically scoped to tenant
    for (const entry of entries) {
      const entryId = await agentMemory.storeContext(
        sessionId,
        entry.key,
        entry.value,
        entry.options || {}
      );
      entryIds.push(entryId);
    }

    res.json({
      success: true,
      count: entryIds.length,
      entryIds,
    });
  } catch (error) {
    console.error('Batch memory error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create memory entries',
    });
  }
});

// Export router
export default router;

/**
 * Usage in main app:
 *
 * import tenantExamplesRouter from './api/rest/examples/tenantIsolationExample';
 * app.use('/api/v1', tenantExamplesRouter);
 */
