import { Express, Request, Response, NextFunction } from "express";
import { addConnection, removeConnection, addAgentConnection, removeAgentConnection } from "./sse-manager";
import { sdk } from "./sdk";

// Middleware to authenticate SSE requests
async function authenticateRequest(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await sdk.authenticateRequest(req);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Register SSE routes for real-time progress updates
 */
export function registerSSERoutes(app: Express) {
  /**
   * SSE endpoint for streaming AI browser session progress
   * Client connects to this endpoint with a session ID to receive real-time updates
   */
  app.get("/api/ai/stream/:sessionId", (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;

    console.log(`[SSE Route] Client connecting to stream for session: ${sessionId}`);

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`);

    // Add this connection to the session's client list
    addConnection(sessionId, res);

    // Handle client disconnect
    req.on("close", () => {
      removeConnection(sessionId, res);
      res.end();
    });
  });

  /**
   * SSE endpoint for streaming agent execution progress
   * Client connects to this endpoint with an execution ID to receive real-time updates
   * Requires authentication
   */
  app.get("/api/agent/stream/:executionId", authenticateRequest, async (req: Request & { user?: any }, res: Response) => {
    const executionId = req.params.executionId;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    console.log(`[Agent SSE] Client connecting to stream for execution: ${executionId}, user: ${userId}`);

    // Verify execution belongs to user
    try {
      const { getDb } = await import("../db");
      const { eq, and } = await import("drizzle-orm");
      const { taskExecutions } = await import("../../drizzle/schema-webhooks");

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Database not available" });
        return;
      }

      const [execution] = await db
        .select()
        .from(taskExecutions)
        .where(and(
          eq(taskExecutions.id, parseInt(executionId)),
          eq(taskExecutions.triggeredByUserId, userId)
        ))
        .limit(1);

      if (!execution) {
        res.status(404).json({ error: "Execution not found" });
        return;
      }
    } catch (error) {
      console.error(`[Agent SSE] Error verifying execution:`, error);
      res.status(500).json({ error: "Failed to verify execution" });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Send initial connection confirmation
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ executionId, timestamp: new Date().toISOString() })}\n\n`);

    // Add this connection to the execution's client list
    addAgentConnection(userId, executionId, res);

    // Handle client disconnect
    req.on("close", () => {
      console.log(`[Agent SSE] Client disconnected from execution: ${executionId}`);
      removeAgentConnection(userId, executionId, res);
      res.end();
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat ${Date.now()}\n\n`);
    }, 30000); // Every 30 seconds

    req.on("close", () => {
      clearInterval(heartbeat);
    });
  });
}
