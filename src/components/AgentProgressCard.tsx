/**
 * Agent Progress Card
 *
 * Displays a single agent's progress in the multi-agent dashboard.
 * Shows status, progress bar, token usage, duration, and output preview.
 */

import React from 'react'
import { Box, Text } from '../ink.js'
import type { SwarmAgentResult } from '../services/agentOrchestrator.js'

interface AgentProgressCardProps {
  agent: SwarmAgentResult
  selected?: boolean
  index: number
}

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  running: '◉',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
  cancelled: 'yellow',
}

export function AgentProgressCard({
  agent,
  selected = false,
  index,
}: AgentProgressCardProps): React.ReactElement {
  const icon = STATUS_ICONS[agent.status] ?? '?'
  const color = STATUS_COLORS[agent.status] ?? 'white'
  const borderColor = selected ? 'cyan' : 'gray'

  // Progress: running agents show indeterminate, completed = 100%, failed = red bar
  const progress = agent.status === 'completed' ? 100
    : agent.status === 'running' ? 45 // Indeterminate — actual progress comes from task system
    : agent.status === 'failed' ? 100
    : 0

  const barWidth = 20
  const filled = Math.round((progress / 100) * barWidth)
  const bar = agent.status === 'failed'
    ? '█'.repeat(barWidth)
    : agent.status === 'running'
      ? '█'.repeat(filled) + '░'.repeat(barWidth - filled)
      : agent.status === 'completed'
        ? '█'.repeat(barWidth)
        : '░'.repeat(barWidth)

  // Output preview (last 2 lines)
  const outputPreview = agent.output
    ? agent.output.split('\n').slice(-2).join('\n').slice(0, 60)
    : ''

  const duration = agent.duration > 0
    ? agent.duration < 60000
      ? `${(agent.duration / 1000).toFixed(1)}s`
      : `${Math.round(agent.duration / 60000)}m ${Math.round((agent.duration % 60000) / 1000)}s`
    : '-'

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} padding={1}>
      {/* Header row */}
      <Box flexDirection="row">
        <Text color={color}>{icon}</Text>
        <Text bold> {agent.name}</Text>
        <Text dimColor> [{index}]</Text>
        {selected && <Text color="cyan"> ◄</Text>}
      </Box>

      {/* Progress bar */}
      <Box flexDirection="row">
        <Text color={color}>[{bar}]</Text>
        <Text> {agent.status}</Text>
      </Box>

      {/* Stats */}
      <Box flexDirection="row">
        <Text dimColor>Duration: {duration}</Text>
        <Text dimColor> | Tokens: {agent.tokensUsed > 0 ? agent.tokensUsed.toLocaleString() : '-'}</Text>
      </Box>

      {/* Output preview */}
      {outputPreview && (
        <Text dimColor>{outputPreview}{agent.output.length > 60 ? '...' : ''}</Text>
      )}

      {/* Error */}
      {agent.error && (
        <Text color="red">Error: {agent.error.slice(0, 80)}</Text>
      )}
    </Box>
  )
}

/**
 * Compact version for the swarm panel (single line).
 */
export function AgentProgressLine({
  agent,
}: {
  agent: SwarmAgentResult
}): React.ReactElement {
  const icon = STATUS_ICONS[agent.status] ?? '?'
  const color = STATUS_COLORS[agent.status] ?? 'white'

  const duration = agent.duration > 0
    ? `${(agent.duration / 1000).toFixed(0)}s`
    : ''

  return (
    <Box flexDirection="row">
      <Text color={color}>{icon}</Text>
      <Text> {agent.name}</Text>
      {duration && <Text dimColor> ({duration})</Text>}
      <Text dimColor> {agent.status}</Text>
    </Box>
  )
}
