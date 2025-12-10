/**
 * WebSocket Service
 *
 * Manages real-time WebSocket connections for broadcasting
 * browser session events to connected clients.
 */

interface WebSocketClient {
  userId: number;
  connectionId: string;
  connectedAt: Date;
  // In production, this would be an actual WebSocket connection
  // For now, we'll use a placeholder that logs events
}

type BrowserEvent =
  | "browser:session:created"
  | "browser:session:closed"
  | "browser:navigation"
  | "browser:action"
  | "browser:screenshot:captured"
  | "browser:data:extracted"
  | "browser:error";

class WebSocketService {
  private static instance: WebSocketService;
  private clients: Map<string, WebSocketClient> = new Map();
  private userConnections: Map<number, Set<string>> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Register a new client connection
   */
  public registerClient(userId: number, connectionId: string): void {
    const client: WebSocketClient = {
      userId,
      connectionId,
      connectedAt: new Date(),
    };

    this.clients.set(connectionId, client);

    // Track user's connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    console.log(`[WebSocket] Client registered: ${connectionId} for user ${userId}`);
  }

  /**
   * Unregister a client connection
   */
  public unregisterClient(connectionId: string): void {
    const client = this.clients.get(connectionId);
    if (client) {
      const userConns = this.userConnections.get(client.userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
      this.clients.delete(connectionId);
      console.log(`[WebSocket] Client unregistered: ${connectionId}`);
    }
  }

  /**
   * Broadcast event to all connections of a specific user
   */
  public broadcastToUser(userId: number, event: BrowserEvent, data: any): void {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      console.log(`[WebSocket] No connections for user ${userId}, event: ${event} (logged only)`);
      return;
    }

    for (const connectionId of connections) {
      this.sendToClient(connectionId, event, data);
    }

    console.log(`[WebSocket] Broadcasted ${event} to ${connections.size} connection(s) for user ${userId}`);
  }

  /**
   * Send event to a specific client
   */
  public sendToClient(connectionId: string, event: BrowserEvent, data: any): void {
    const client = this.clients.get(connectionId);
    if (!client) {
      console.warn(`[WebSocket] Client ${connectionId} not found`);
      return;
    }

    // In production, this would send via actual WebSocket
    // For now, we log the event
    console.log(`[WebSocket] -> ${connectionId}: ${event}`, {
      timestamp: new Date().toISOString(),
      data: JSON.stringify(data).substring(0, 200), // Truncate for logging
    });
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcastToAll(event: BrowserEvent, data: any): void {
    for (const connectionId of this.clients.keys()) {
      this.sendToClient(connectionId, event, data);
    }

    console.log(`[WebSocket] Broadcasted ${event} to ${this.clients.size} client(s)`);
  }

  /**
   * Get connected client count
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get connections for a user
   */
  public getUserConnections(userId: number): string[] {
    const connections = this.userConnections.get(userId);
    return connections ? Array.from(connections) : [];
  }

  /**
   * Check if user has active connections
   */
  public hasActiveConnections(userId: number): boolean {
    const connections = this.userConnections.get(userId);
    return !!connections && connections.size > 0;
  }

  /**
   * Get service stats
   */
  public getStats(): {
    totalClients: number;
    totalUsers: number;
  } {
    return {
      totalClients: this.clients.size,
      totalUsers: this.userConnections.size,
    };
  }
}

// Export singleton instance
export const websocketService = WebSocketService.getInstance();

// Export class for testing
export { WebSocketService };
