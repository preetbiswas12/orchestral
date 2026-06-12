/**
 * WebSocket Realtime Manager
 *
 * Manages WebSocket connections for the web dashboard.
 * Broadcasts state changes to all connected clients.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface RealtimeEvent {
  type: 'task_update' | 'context_update' | 'agent_update' | 'session_update' | 'server_info' | 'pong'
  data: Record<string, unknown>
  timestamp: number
}

interface WebSocketClient {
  ws: { send: (data: string) => void; readyState: number }
  connectedAt: number
  lastPing: number
}

// ── WebSocket Manager ─────────────────────────────────────────────

export class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map()
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private nextId = 0

  constructor() {
    // Start heartbeat to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      this.cleanupDeadClients()
    }, 30_000)
  }

  /**
   * Add a new WebSocket client.
   */
  addClient(ws: { send: (data: string) => void; readyState: number; data?: { connectedAt?: number } }): void {
    const id = `ws_${++this.nextId}`
    this.clients.set(id, {
      ws: ws as WebSocketClient['ws'],
      connectedAt: ws.data?.connectedAt ?? Date.now(),
      lastPing: Date.now(),
    })
  }

  /**
   * Remove a WebSocket client.
   */
  removeClient(ws: unknown): void {
    for (const [id, client] of this.clients) {
      if (client.ws === ws) {
        this.clients.delete(id)
        return
      }
    }
  }

  /**
   * Broadcast an event to all connected clients.
   */
  broadcast(event: RealtimeEvent): void {
    const message = JSON.stringify({ ...event, timestamp: event.timestamp ?? Date.now() })
    for (const [, client] of this.clients) {
      try {
        if (client.ws.readyState === 1) { // WebSocket.OPEN
          client.ws.send(message)
        }
      } catch {
        // Client disconnected
      }
    }
  }

  /**
   * Broadcast a task update event.
   */
  broadcastTaskUpdate(taskId: string, status: string, data?: Record<string, unknown>): void {
    this.broadcast({
      type: 'task_update',
      data: { taskId, status, ...data },
      timestamp: Date.now(),
    })
  }

  /**
   * Broadcast a context health update.
   */
  broadcastContextUpdate(health: { status: string; percentage: number; tokens: number }): void {
    this.broadcast({
      type: 'context_update',
      data: health,
      timestamp: Date.now(),
    })
  }

  /**
   * Broadcast an agent status update.
   */
  broadcastAgentUpdate(swarmId: string, agentId: string, status: string): void {
    this.broadcast({
      type: 'agent_update',
      data: { swarmId, agentId, status },
      timestamp: Date.now(),
    })
  }

  /**
   * Get the number of connected clients.
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Close all connections and stop heartbeat.
   */
  closeAll(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.clients.clear()
  }

  // ── Private ──────────────────────────────────────────────────────

  private cleanupDeadClients(): void {
    const now = Date.now()
    for (const [id, client] of this.clients) {
      // Remove clients that haven't responded in 2 minutes
      if (now - client.lastPing > 120_000) {
        this.clients.delete(id)
      }
    }
  }
}
