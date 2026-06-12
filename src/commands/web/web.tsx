/**
 * Web Dashboard Command
 *
 * Starts the HTTP web server and opens the dashboard in the browser.
 * Shows server status, connected clients, and quick controls.
 *
 * Usage:
 *   /web           — start server on default port (3456)
 *   /web --port=8080 — start on custom port
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { startServer, type ServerInstance, type ServerStats } from '../../web/server.js'

type Phase = 'starting' | 'running' | 'error'

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async onDone => {
  return <WebDashboardUI onClose={onDone} />
}

function WebDashboardUI({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('starting')
  const [server, setServer] = useState<ServerInstance | null>(null)
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [port, setPort] = useState(3456)

  // Start server on mount
  useEffect(() => {
    let mounted = true

    startServer({
      port,
      onReady: (url) => {
        if (!mounted) return
        setPhase('running')
        // Try to open browser
        try {
          const { execSync } = require('child_process')
          const platform = process.platform
          if (platform === 'darwin') execSync(`open "${url}"`)
          else if (platform === 'win32') execSync(`start "${url}"`)
          else execSync(`xdg-open "${url}"`)
        } catch {
          // Browser open failed — user can navigate manually
        }
      },
      onShutdown: () => {
        if (mounted) setPhase('error')
      },
    }).then(srv => {
      if (mounted) setServer(srv)
    }).catch(err => {
      if (mounted) {
        setError(err instanceof Error ? err.message : String(err))
        setPhase('error')
      }
    })

    return () => { mounted = false }
  }, [port])

  // Poll stats
  useEffect(() => {
    if (phase !== 'running' || !server) return
    const interval = setInterval(() => {
      setStats(server.getStats())
    }, 2000)
    return () => clearInterval(interval)
  }, [phase, server])

  const handleShutdown = useCallback(async () => {
    if (server) {
      await server.stop()
    }
    onClose()
  }, [server, onClose])

  useInput((inputChar, key) => {
    if (key.escape || inputChar === 'q') {
      handleShutdown()
      return
    }

    if (phase === 'running') {
      if (inputChar === 'o' && server) {
        // Re-open browser
        const url = server.url
        try {
          const { execSync } = require('child_process')
          const platform = process.platform
          if (platform === 'darwin') execSync(`open "${url}"`)
          else if (platform === 'win32') execSync(`start "${url}"`)
          else execSync(`xdg-open "${url}"`)
        } catch {
          // Ignore
        }
      }
      if (inputChar === 's' && stats) {
        // Show detailed stats (just triggers re-render)
        setStats({ ...stats })
      }
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
      <Box flexDirection="row">
        <Text bold color="blue">Web Dashboard</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {phase === 'starting' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="cyan">Starting server on port {port}...</Text>
        </Box>
      )}

      {phase === 'running' && server && (
        <Box flexDirection="column" marginY={1}>
          <Text color="green" bold>✓ Server running</Text>
          <Text>  URL: <Text color="cyan">{server.url}</Text></Text>
          <Text>  Dashboard: <Text color="cyan">{server.url}</Text></Text>

          {stats && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>--- Stats ---</Text>
              <Text>  Connected clients: <Text color="cyan">{stats.wsClients}</Text></Text>
              <Text>  Total requests: {stats.totalRequests}</Text>
              <Text>  Uptime: {Math.round(stats.uptime / 1000)}s</Text>
            </Box>
          )}

          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>The dashboard provides:</Text>
            <Text dimColor>  · Project overview with git status</Text>
            <Text dimColor>  · Interactive file tree browser</Text>
            <Text dimColor>  · Session history viewer</Text>
            <Text dimColor>  · Token usage analytics with charts</Text>
            <Text dimColor>  · Agent swarm monitoring (real-time)</Text>
            <Text dimColor>  · Context health dashboard</Text>
            <Text dimColor>  · Command palette</Text>
          </Box>
        </Box>
      )}

      {phase === 'error' && (
        <Box flexDirection="column" marginY={1}>
          {error ? (
            <Text color="red">Error: {error}</Text>
          ) : (
            <Text color="yellow">Server stopped.</Text>
          )}
        </Box>
      )}

      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>
        {phase === 'running'
          ? 'o: open in browser | s: refresh stats | q/Esc: stop & quit'
          : 'q/Esc: cancel'}
      </Text>
    </Box>
  )
}
