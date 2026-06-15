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
  const [browserOpened, setBrowserOpened] = useState(false)

  // Start server on mount
  useEffect(() => {
    let mounted = true

    startServer({
      port,
      onReady: (url) => {
        if (!mounted) return
        setPhase('running')

        // Try to open browser using the `open` package (cross-platform)
        import('open').then(({ default: open }) => {
          open(url).then(() => {
            if (mounted) setBrowserOpened(true)
          }).catch(() => {
            // Browser open failed — user can navigate manually
          })
        }).catch(() => {
          // Fallback: try execSync
          try {
            const { execSync } = require('child_process')
            const platform = process.platform
            if (platform === 'win32') {
              execSync(`start "" "${url}"`)
            } else if (platform === 'darwin') {
              execSync(`open "${url}"`)
            } else {
              execSync(`xdg-open "${url}"`)
            }
            if (mounted) setBrowserOpened(true)
          } catch {
            // Browser open failed — user can navigate manually
          }
        })
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

  const handleOpenBrowser = useCallback(async () => {
    if (!server) return
    const url = server.url
    try {
      const { default: open } = await import('open')
      await open(url)
      setBrowserOpened(true)
    } catch {
      try {
        const { execSync } = require('child_process')
        const platform = process.platform
        if (platform === 'win32') execSync(`start "" "${url}"`)
        else if (platform === 'darwin') execSync(`open "${url}"`)
        else execSync(`xdg-open "${url}"`)
        setBrowserOpened(true)
      } catch {
        // Ignore
      }
    }
  }, [server])

  useInput((inputChar, key) => {
    if (key.escape || inputChar === 'q') {
      handleShutdown()
      return
    }

    if (phase === 'running') {
      if (inputChar === 'o') {
        handleOpenBrowser()
      }
      if (inputChar === 'c' && server) {
        // Copy URL to clipboard hint
        setBrowserOpened(false) // Reset to show URL again
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
          <Text dimColor>This may take a moment...</Text>
        </Box>
      )}

      {phase === 'running' && server && (
        <Box flexDirection="column" marginY={1}>
          <Text color="green" bold>✓ Server running</Text>
          <Text>  </Text>
          <Text bold>Dashboard URL:</Text>
          <Text>  </Text>
          <Text backgroundColor="blue" color="white" bold> {server.url} </Text>
          <Text>  </Text>
          {browserOpened && (
            <Text color="green">  ✓ Browser opened automatically</Text>
          )}
          <Text>  </Text>
          <Text dimColor>Open this URL in your browser to access the dashboard.</Text>
          <Text>  </Text>

          {stats && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>--- Server Stats ---</Text>
              <Text>  Connected clients: <Text color="cyan">{stats.wsClients}</Text></Text>
              <Text>  Total requests: <Text color="cyan">{stats.totalRequests}</Text></Text>
              <Text>  Uptime: <Text color="cyan">{Math.round(stats.uptime / 1000)}s</Text></Text>
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
            <Text dimColor>  · Provider status & configuration</Text>
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
      {phase === 'running' ? (
        <Text dimColor>
          o: open in browser | q/Esc: stop & quit
        </Text>
      ) : (
        <Text dimColor>
          q/Esc: cancel
        </Text>
      )}
    </Box>
  )
}
