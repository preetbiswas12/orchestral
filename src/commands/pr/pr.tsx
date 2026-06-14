/**
 * PR Command — Quick PR management.
 *
 * Usage:
 *   /pr           — open PR list (delegates to /github prs tab)
 *   /pr <number>  — view specific PR
 *   /pr create    — create a new PR
 */

import React from 'react'
import { Box, Text } from 'ink'
import { listPRs, getPR, checkAuth } from '../../services/github/api.js'

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async (onDone, context) => {
  // If args provided, handle directly
  const args = (context as any)?.args?.trim() || ''

  if (!args) {
    // No args — delegate to full github dashboard
    const github = await import('../github/github.js')
    return github.call(onDone, context)
  }

  if (args === 'create') {
    return <PRCreateUI onClose={onDone} />
  }

  const num = parseInt(args)
  if (!isNaN(num)) {
    return <PRViewUI prNumber={num} onClose={onDone} />
  }

  // Fallback: open github dashboard
  const github = await import('../github/github.js')
  return github.call(onDone, context)
}

function PRCreateUI({ onClose }: { onClose: () => void }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Text bold color="green">Create Pull Request</Text>
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>For full PR creation, use the interactive GitHub dashboard:</Text>
      <Text dimColor>Press Esc, then type /github</Text>
      <Box marginTop={1}>
        <Text>Or use the terminal directly:</Text>
        <Text color="cyan">  gh pr create --title "Title" --body "Description"</Text>
        <Text color="cyan">  gh pr create --draft --reviewer user1,user2</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Esc to close</Text>
      </Box>
    </Box>
  )
}

function PRViewUI({ prNumber, onClose }: { prNumber: number; onClose: () => void }) {
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getPR(prNumber).then(() => setStatus('ready')).catch(err => {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    })
  }, [prNumber])

  if (status === 'loading') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
        <Text color="yellow">Loading PR #{prNumber}...</Text>
      </Box>
    )
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">Error loading PR #{prNumber}: {error}</Text>
        <Text dimColor>Esc to close</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Text color="green">PR #{prNumber} loaded</Text>
      <Text dimColor>Use /github for full PR management</Text>
      <Text dimColor>Esc to close</Text>
    </Box>
  )
}
