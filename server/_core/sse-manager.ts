import { Response } from "express";
import { EventEmitter } from "events";

// Global event emitter for SSE
export const sseEmitter = new EventEmitter();

// Store active SSE connections
const connections = new Map<string, Response[]>();

// Store agent execution connections (keyed by executionId)
const agentConnections = new Map<string, Map<number, Response[]>>();

export interface ProgressUpdate {
  type: 'session_created' | 'live_view_ready' | 'navigation' | 'action_start' | 'action_complete' | 'error' | 'complete';
  sessionId: string;
  data?: any;
  message?: string;
}

export type AgentSSEEventType =
  | 'execution:started'
  | 'plan:created'
  | 'phase:start'
  | 'thinking'
  | 'tool:start'
  | 'tool:complete'
  | 'phase:complete'
  | 'execution:complete'
  | 'execution:error';

export interface AgentSSEEvent {
  type: AgentSSEEventType;
  executionId: string;
  data: any;
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

// ==================== AGENT SSE FUNCTIONS ====================

/**
 * Add SSE client connection for an agent execution
 */
export function addAgentConnection(userId: number, executionId: string, res: Response) {
  const userKey = `user-${userId}`;

  if (!agentConnections.has(userKey)) {
    agentConnections.set(userKey, new Map());
  }

  const userConnections = agentConnections.get(userKey)!;
  if (!userConnections.has(parseInt(executionId))) {
    userConnections.set(parseInt(executionId), []);
  }

  userConnections.get(parseInt(executionId))!.push(res);

  console.log(`[Agent SSE] Client connected to execution ${executionId} for user ${userId}`);
}

/**
 * Remove SSE client connection for an agent execution
 */
export function removeAgentConnection(userId: number, executionId: string, res: Response) {
  const userKey = `user-${userId}`;
  const userConnections = agentConnections.get(userKey);

  if (userConnections) {
    const clients = userConnections.get(parseInt(executionId));
    if (clients) {
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
      }

      if (clients.length === 0) {
        userConnections.delete(parseInt(executionId));
      }

      if (userConnections.size === 0) {
        agentConnections.delete(userKey);
      }

      console.log(`[Agent SSE] Client disconnected from execution ${executionId}`);
    }
  }
}

/**
 * Send agent event to all clients listening to a specific execution
 */
export function sendAgentEvent(userId: number, executionId: string, event: AgentSSEEvent) {
  const userKey = `user-${userId}`;
  const userConnections = agentConnections.get(userKey);

  if (!userConnections) return;

  const clients = userConnections.get(parseInt(executionId)) || [];
  const eventData = JSON.stringify(event.data);

  clients.forEach(res => {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${eventData}\n\n`);
    } catch (e) {
      console.error(`[Agent SSE] Error sending event to client:`, e);
    }
  });

  console.log(`[Agent SSE] Sent ${event.type} to ${clients.length} clients for execution ${executionId}`);
}

/**
 * Broadcast agent event to all users listening to an execution
 * (Used when multiple users can view the same execution)
 */
export function broadcastAgentEvent(executionId: string, event: AgentSSEEvent) {
  let totalClients = 0;

  agentConnections.forEach((userConnections) => {
    const clients = userConnections.get(parseInt(executionId)) || [];
    const eventData = JSON.stringify(event.data);

    clients.forEach(res => {
      try {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${eventData}\n\n`);
        totalClients++;
      } catch (e) {
        console.error(`[Agent SSE] Error broadcasting event:`, e);
      }
    });
  });

  if (totalClients > 0) {
    console.log(`[Agent SSE] Broadcasted ${event.type} to ${totalClients} clients for execution ${executionId}`);
  }
}

/**
 * Clean up all connections for a specific execution
 */
export function cleanupAgentExecution(userId: number, executionId: string) {
  const userKey = `user-${userId}`;
  const userConnections = agentConnections.get(userKey);

  if (userConnections) {
    const clients = userConnections.get(parseInt(executionId));
    if (clients) {
      clients.forEach(res => {
        try {
          res.end();
        } catch (e) {
          // Ignore errors when closing
        }
      });
      userConnections.delete(parseInt(executionId));
      console.log(`[Agent SSE] Cleaned up execution ${executionId} for user ${userId}`);
    }

    if (userConnections.size === 0) {
      agentConnections.delete(userKey);
    }
  }
}

/**
 * Get the number of active connections for an execution
 */
export function getAgentConnectionCount(executionId: string): number {
  let count = 0;
  agentConnections.forEach((userConnections) => {
    const clients = userConnections.get(parseInt(executionId));
    if (clients) {
      count += clients.length;
    }
  });
  return count;
}
