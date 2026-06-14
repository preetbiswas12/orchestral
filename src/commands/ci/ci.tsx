/**
 * CI Command — Quick CI/workflow management.
 *
 * Usage:
 *   /ci           — view recent CI runs (delegates to /github ci tab)
 *   /ci <run-id>  — view specific run
 *   /ci rerun <id> — rerun a workflow
 */

import React from 'react'
import { Box, Text } from 'ink'
import { listRuns, getRun, rerunRun } from '../../services/github/api.js'

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async (onDone, context) => {
  const args = (context as any)?.args?.trim() || ''

  if (!args) {
    const github = await import('../github/github.js')
    return github.call(onDone, context)
  }

  const parts = args.split(/\s+/)
  if (parts[0] === 'rerun' && parts[1]) {
    const id = parseInt(parts[1])
    return <RerunUI runId={id} onClose={onDone} />
  }

  const num = parseInt(args)
  if (!isNaN(num)) {
    return <RunViewUI runId={num} onClose={onDone} />
  }

  const github = await import('../github/github.js')
  return github.call(onDone, context)
}

function RunViewUI({ runId, onClose }: { runId: number; onClose: () => void }) {
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getRun(runId).then(() => setStatus('ready')).catch(err => {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    })
  }, [runId])

  if (status === 'loading') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
        <Text color="yellow">Loading Run #{runId}...</Text>
      </Box>
    )
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">Error loading Run #{runId}: {error}</Text>
        <Text dimColor>Esc to close</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Text color="green">Run #{runId} loaded</Text>
      <Text dimColor>Use /github for full CI management</Text>
      <Text dimColor>Esc to close</Text>
    </Box>
  )
}

function RerunUI({ runId, onClose }: { runId: number; onClose: () => void }) {
  const [status, setStatus] = React.useState<'loading' | 'done' | 'error'>('loading')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    rerunRun(runId).then(() => setStatus('done')).catch(err => {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    })
  }, [runId])

  if (status === 'loading') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
        <Text color="yellow">Rerunning workflow #{runId}...</Text>
      </Box>
    )
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Esc to close</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Text color="green">✓ Workflow #{runId} rerun triggered</Text>
      <Text dimColor>Use /github to monitor progress</Text>
      <Text dimColor>Esc to close</Text>
    </Box>
  )
}
