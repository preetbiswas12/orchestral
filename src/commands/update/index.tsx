/**
 * /update command - Custom update system
 * Checks for and applies updates from our git repository
 */

import React from 'react'
import { Box, Text } from '../../ink.js'
import { logForDebugging } from '../../utils/debug.js'
import {
  checkForUpdate,
  applyUpdate,
  getCurrentVersion,
  performUpdateCheck,
} from '../../utils/customUpdate.js'

export const updateCommand = {
  name: 'update',
  description: 'Check for and install updates',
  
  async execute() {
    return <UpdateCommand />
  },
}

function UpdateCommand(): React.ReactNode {
  const [status, setStatus] = React.useState<'checking' | 'upToDate' | 'available' | 'updating' | 'success' | 'error'>('checking')
  const [currentVersion, setCurrentVersion] = React.useState<string>('')
  const [latestVersion, setLatestVersion] = React.useState<string>('')
  const [error, setError] = React.useState<string>('')
  
  React.useEffect(() => {
    async function check() {
      try {
        logForDebugging('[Update] Checking for updates...')
        const result = await performUpdateCheck()
        
        setCurrentVersion(result.currentVersion)
        setLatestVersion(result.latestVersion || result.currentVersion)
        
        if (result.hasUpdate) {
          setStatus('available')
        } else {
          setStatus('upToDate')
        }
      } catch (err) {
        logForDebugging('[Update] Check failed:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    }
    
    check()
  }, [])
  
  const handleUpdate = React.useCallback(async () => {
    setStatus('updating')
    
    try {
      logForDebugging('[Update] Starting update...')
      const result = await applyUpdate()
      
      if (result.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(result.error || 'Unknown error')
      }
    } catch (err) {
      logForDebugging('[Update] Update failed:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])
  
  if (status === 'checking') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">🔍 Checking for updates...</Text>
      </Box>
    )
  }
  
  if (status === 'upToDate') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">✓ You're up to date!</Text>
        <Text dimColor>Current version: {currentVersion}</Text>
      </Box>
    )
  }
  
  if (status === 'available') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">⚠ Update available!</Text>
        <Text dimColor>Current: {currentVersion}</Text>
        <Text dimColor>Latest: {latestVersion}</Text>
        <Box marginTop={1}>
          <Text>
            Press <Text color="cyan">Enter</Text> to update now, or <Text color="red">Ctrl+C</Text> to cancel
          </Text>
        </Box>
      </Box>
    )
  }
  
  if (status === 'updating') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">⏳ Updating...</Text>
        <Text dimColor>This may take a minute. Please don't close the terminal.</Text>
      </Box>
    )
  }
  
  if (status === 'success') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">✓ Update successful!</Text>
        <Text dimColor>Updated to version {latestVersion}</Text>
        <Text dimColor>Please restart Claude Code to use the new version.</Text>
      </Box>
    )
  }
  
  if (status === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">✗ Update failed</Text>
        <Text dimColor>Error: {error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Please check your internet connection and try again.</Text>
        </Box>
      </Box>
    )
  }
  
  return null
}

