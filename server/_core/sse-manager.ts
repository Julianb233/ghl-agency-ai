import { Response } from "express";
import { EventEmitter } from "events";

// Global event emitter for SSE
export const sseEmitter = new EventEmitter();

// Store active SSE connections
const connections = new Map<string, Response[]>();

export interface ProgressUpdate {
  type: 'session_created' | 'live_view_ready' | 'navigation' | 'action_start' | 'action_complete' | 'error' | 'complete';
  sessionId: string;
  data?: any;
  message?: string;
}

/**
 * Send progress update to all clients listening to a session
 */
export function sendProgress(sessionId: string, update: ProgressUpdate) {
  const clients = connections.get(sessionId) || [];
  const data = JSON.stringify(update);

  clients.forEach(res => {
    res.write(`data: ${data}\n\n`);
  });

  console.log(`[SSE] Sent update to ${clients.length} clients for session ${sessionId}:`, update.type);
}

/**
 * Add SSE client connection for a session
 */
export function addConnection(sessionId: string, res: Response) {
  if (!connections.has(sessionId)) {
    connections.set(sessionId, []);
  }
  connections.get(sessionId)!.push(res);

  console.log(`[SSE] Client connected to session ${sessionId}. Total clients: ${connections.get(sessionId)!.length}`);
}

/**
 * Remove SSE client connection
 */
export function removeConnection(sessionId: string, res: Response) {
  const clients = connections.get(sessionId);
  if (clients) {
    const index = clients.indexOf(res);
    if (index > -1) {
      clients.splice(index, 1);
    }

    if (clients.length === 0) {
      connections.delete(sessionId);
    }

    console.log(`[SSE] Client disconnected from session ${sessionId}`);
  }
}

/**
 * Clean up old connections
 */
export function cleanupSession(sessionId: string) {
  const clients = connections.get(sessionId);
  if (clients) {
    clients.forEach(res => {
      try {
        res.end();
      } catch (e) {
        // Ignore errors when closing
      }
    });
    connections.delete(sessionId);
    console.log(`[SSE] Cleaned up session ${sessionId}`);
  }
}
