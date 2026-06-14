/**
 * Issue Command — Quick issue management.
 *
 * Usage:
 *   /issue        — open issue list (delegates to /github issues tab)
 *   /issue <num>  — view specific issue
 *   /issue create — create a new issue
 */

import React from 'react'
import { Box, Text } from 'ink'
import { listIssues, getIssue } from '../../services/github/api.js'

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async (onDone, context) => {
  const args = (context as any)?.args?.trim() || ''

  if (!args) {
    const github = await import('../github/github.js')
    return github.call(onDone, context)
  }

  if (args === 'create') {
    return <IssueCreateUI onClose={onDone} />
  }

  const num = parseInt(args)
  if (!isNaN(num)) {
    return <IssueViewUI issueNumber={num} onClose={onDone} />
  }

  const github = await import('../github/github.js')
  return github.call(onDone, context)
}

function IssueCreateUI({ onClose }: { onClose: () => void }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Text bold color="green">Create Issue</Text>
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>For full issue creation, use the interactive GitHub dashboard:</Text>
      <Text dimColor>Press Esc, then type /github</Text>
      <Box marginTop={1}>
        <Text>Or use the terminal directly:</Text>
        <Text color="cyan">  gh issue create --title "Title" --body "Description"</Text>
        <Text color="cyan">  gh issue create --label "bug" --assignee @me</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Esc to close</Text>
      </Box>
    </Box>
  )
}

function IssueViewUI({ issueNumber, onClose }: { issueNumber: number; onClose: () => void }) {
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getIssue(issueNumber).then(() => setStatus('ready')).catch(err => {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    })
  }, [issueNumber])

  if (status === 'loading') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
        <Text color="yellow">Loading Issue #{issueNumber}...</Text>
      </Box>
    )
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">Error loading Issue #{issueNumber}: {error}</Text>
        <Text dimColor>Esc to close</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Text color="green">Issue #{issueNumber} loaded</Text>
      <Text dimColor>Use /github for full issue management</Text>
      <Text dimColor>Esc to close</Text>
    </Box>
  )
}
