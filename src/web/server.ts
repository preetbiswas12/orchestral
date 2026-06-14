/**
 * Web Dashboard Server
 *
 * Lightweight HTTP server using Bun.serve() — zero new dependencies.
 * Serves REST API, WebSocket realtime updates, and the dashboard HTML.
 *
 * Usage:
 *   import { startServer } from './server.js'
 *   const server = await startServer({ port: 3456, onReady: (url) => open(url) })
 *   // ... later:
 *   await server.stop()
 */

import { dashboardHtml } from './dashboard.html.js'
import { handleApiRequest } from './api.js'
import { WebSocketManager } from './realtime.js'

// ── Types ──────────────────────────────────────────────────────────

export interface ServerOptions {
  port?: number
  host?: string
  onReady?: (url: string) => void
  onShutdown?: () => void
}

export interface ServerInstance {
  port: number
  url: string
  stop: () => Promise<void>
  getStats: () => ServerStats
}

export interface ServerStats {
  port: number
  uptime: number
  wsClients: number
  totalRequests: number
}

// ── Server ────────────────────────────────────────────────────────

export async function startServer(options: ServerOptions = {}): Promise<ServerInstance> {
  const port = options.port ?? 3456
  const host = options.host ?? '127.0.0.1'
  const wsManager = new WebSocketManager()
  const startTime = Date.now()
  let totalRequests = 0

  const server = Bun.serve({
    port,
    host,
    fetch(req, server) {
      totalRequests++
      const url = new URL(req.url)

      // WebSocket upgrade
      if (url.pathname === '/ws') {
        const upgraded = server.upgrade(req, {
          data: { connectedAt: Date.now() },
        })
        if (upgraded) return undefined
        return new Response('WebSocket upgrade failed', { status: 400 })
      }

      // API routes
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(req, url, wsManager)
      }

      // Dashboard HTML (root)
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(dashboardHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }

      return new Response('Not Found', { status: 404 })
    },
    websocket: {
      open(ws) {
        wsManager.addClient(ws)
        wsManager.broadcast({ type: 'server_info', data: { port, uptime: Date.now() - startTime } })
      },
      close(ws) {
        wsManager.removeClient(ws)
      },
      message(ws, message) {
        // Handle incoming messages from clients (e.g., command execution requests)
        try {
          const data = JSON.parse(String(message))
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          }
        } catch {
          // Ignore malformed messages
        }
      },
    },
  })

  const instance: ServerInstance = {
    port: server.port,
    url: `http://${host}:${server.port}`,
    stop: () => {
      wsManager.closeAll()
      server.stop()
      options.onShutdown?.()
      return Promise.resolve()
    },
    getStats: () => ({
      port: server.port,
      uptime: Date.now() - startTime,
      wsClients: wsManager.getClientCount(),
      totalRequests,
    }),
  }

  // Subscribe WebSocketManager to the global event bus so services can push realtime updates
  wsManager.subscribeToEventBus()

  options.onReady?.(instance.url)
  return instance
}
