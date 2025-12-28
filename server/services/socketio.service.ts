/**
 * Socket.IO Service
 * Real-time bidirectional communication for agent orchestration
 *
 * Handles:
 * - Agent status updates (thinking, acting, observing)
 * - Live streaming of agent responses
 * - User connection management
 * - Room-based messaging (per user, per session)
 */

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

// Event types for agent communication
export interface AgentEvent {
  type: "thinking" | "acting" | "observing" | "complete" | "error" | "stream";
  agentId: string;
  sessionId: string;
  data: {
    step?: string;
    message?: string;
    chunk?: string;
    progress?: number;
    tool?: string;
    result?: unknown;
    error?: string;
  };
  timestamp: Date;
}

export interface UserSession {
  userId: number;
  socketId: string;
  connectedAt: Date;
  activeAgentSessions: Set<string>;
}

class SocketIOService {
  private io: Server | null = null;
  private userSessions: Map<number, Set<string>> = new Map(); // userId -> Set<socketId>
  private socketToUser: Map<string, number> = new Map(); // socketId -> userId
  private agentSessions: Map<string, Set<string>> = new Map(); // agentSessionId -> Set<socketId>

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    console.log("[SocketIO] Server initialized");
    return this.io;
  }

  /**
   * Setup connection and event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      console.log(`[SocketIO] Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on("authenticate", (data: { userId: number }) => {
        this.registerUserSocket(data.userId, socket);
      });

      // Handle agent session subscription
      socket.on("subscribe:agent", (data: { sessionId: string }) => {
        this.subscribeToAgentSession(socket, data.sessionId);
      });

      socket.on("unsubscribe:agent", (data: { sessionId: string }) => {
        this.unsubscribeFromAgentSession(socket, data.sessionId);
      });

      // Handle client-side agent control
      socket.on("agent:stop", (data: { sessionId: string }) => {
        this.emitToAgentSession(data.sessionId, "control:stop", {});
      });

      socket.on("agent:pause", (data: { sessionId: string }) => {
        this.emitToAgentSession(data.sessionId, "control:pause", {});
      });

      socket.on("agent:resume", (data: { sessionId: string }) => {
        this.emitToAgentSession(data.sessionId, "control:resume", {});
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`[SocketIO] Client disconnected: ${socket.id} (${reason})`);
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Register a socket for a user
   */
  private registerUserSocket(userId: number, socket: Socket): void {
    // Add to user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(socket.id);
    this.socketToUser.set(socket.id, userId);

    // Join user's room
    socket.join(`user:${userId}`);

    console.log(`[SocketIO] User ${userId} authenticated on socket ${socket.id}`);
    socket.emit("authenticated", { userId, socketId: socket.id });
  }

  /**
   * Subscribe socket to an agent session
   */
  private subscribeToAgentSession(socket: Socket, sessionId: string): void {
    if (!this.agentSessions.has(sessionId)) {
      this.agentSessions.set(sessionId, new Set());
    }
    this.agentSessions.get(sessionId)!.add(socket.id);
    socket.join(`agent:${sessionId}`);

    console.log(`[SocketIO] Socket ${socket.id} subscribed to agent session ${sessionId}`);
    socket.emit("subscribed:agent", { sessionId });
  }

  /**
   * Unsubscribe socket from an agent session
   */
  private unsubscribeFromAgentSession(socket: Socket, sessionId: string): void {
    const sockets = this.agentSessions.get(sessionId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.agentSessions.delete(sessionId);
      }
    }
    socket.leave(`agent:${sessionId}`);

    console.log(`[SocketIO] Socket ${socket.id} unsubscribed from agent session ${sessionId}`);
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: Socket): void {
    const userId = this.socketToUser.get(socket.id);

    // Clean up user sessions
    if (userId !== undefined) {
      const userSockets = this.userSessions.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSessions.delete(userId);
        }
      }
      this.socketToUser.delete(socket.id);
    }

    // Clean up agent sessions
    for (const [sessionId, sockets] of this.agentSessions.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.agentSessions.delete(sessionId);
      }
    }
  }

  // ============================================
  // Public API for Agent Events
  // ============================================

  /**
   * Emit agent thinking event
   */
  emitAgentThinking(sessionId: string, agentId: string, step: string): void {
    this.emitAgentEvent({
      type: "thinking",
      agentId,
      sessionId,
      data: { step },
      timestamp: new Date(),
    });
  }

  /**
   * Emit agent acting event (tool use)
   */
  emitAgentActing(sessionId: string, agentId: string, tool: string, message: string): void {
    this.emitAgentEvent({
      type: "acting",
      agentId,
      sessionId,
      data: { tool, message },
      timestamp: new Date(),
    });
  }

  /**
   * Emit agent observing event (tool result)
   */
  emitAgentObserving(sessionId: string, agentId: string, result: unknown): void {
    this.emitAgentEvent({
      type: "observing",
      agentId,
      sessionId,
      data: { result },
      timestamp: new Date(),
    });
  }

  /**
   * Emit streaming chunk
   */
  emitAgentStream(sessionId: string, agentId: string, chunk: string): void {
    this.emitAgentEvent({
      type: "stream",
      agentId,
      sessionId,
      data: { chunk },
      timestamp: new Date(),
    });
  }

  /**
   * Emit agent completion
   */
  emitAgentComplete(sessionId: string, agentId: string, result: unknown): void {
    this.emitAgentEvent({
      type: "complete",
      agentId,
      sessionId,
      data: { result },
      timestamp: new Date(),
    });
  }

  /**
   * Emit agent error
   */
  emitAgentError(sessionId: string, agentId: string, error: string): void {
    this.emitAgentEvent({
      type: "error",
      agentId,
      sessionId,
      data: { error },
      timestamp: new Date(),
    });
  }

  /**
   * Emit generic agent event
   */
  private emitAgentEvent(event: AgentEvent): void {
    if (!this.io) {
      console.warn("[SocketIO] Server not initialized, event not emitted");
      return;
    }

    this.io.to(`agent:${event.sessionId}`).emit("agent:event", event);
  }

  /**
   * Emit to specific agent session room
   */
  private emitToAgentSession(sessionId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`agent:${sessionId}`).emit(event, data);
  }

  /**
   * Emit to all sockets of a user
   */
  emitToUser(userId: number, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  // ============================================
  // Stats & Monitoring
  // ============================================

  /**
   * Get connected user count
   */
  getConnectedUserCount(): number {
    return this.userSessions.size;
  }

  /**
   * Get total socket count
   */
  getTotalSocketCount(): number {
    let total = 0;
    for (const sockets of this.userSessions.values()) {
      total += sockets.size;
    }
    return total;
  }

  /**
   * Get active agent session count
   */
  getActiveAgentSessionCount(): number {
    return this.agentSessions.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: number): boolean {
    const sockets = this.userSessions.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get user's socket count
   */
  getUserSocketCount(userId: number): number {
    return this.userSessions.get(userId)?.size || 0;
  }

  /**
   * Get server instance
   */
  getServer(): Server | null {
    return this.io;
  }
}

// Export singleton
export const socketIOService = new SocketIOService();
