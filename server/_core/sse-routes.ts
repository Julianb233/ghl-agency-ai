import { Express, Request, Response } from "express";
import { addConnection, removeConnection } from "./sse-manager";

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
}
