/**
 * Agent Swarm Panel
 *
 * Compact panel showing running agent swarms in the main view footer.
 * Complements the existing CoordinatorTaskPanel with richer visualization.
 * Click to expand into the full agent dashboard.
 */

import React, { useState, useEffect } from 'react'
import { Box, Text } from '../ink.js'
import { agentOrchestrator } from '../services/agentOrchestrator.js'
import { AgentProgressLine } from './AgentProgressCard.js'

interface AgentSwarmPanelProps {
  /** Callback to open the full dashboard */
  onOpenDashboard?: () => void
}

export function AgentSwarmPanel({
  onOpenDashboard,
}: AgentSwarmPanelProps): React.ReactElement | null {
  const [, setTick] = useState(0)
  const swarms = agentOrchestrator.listActiveSwarms()
  const hasActiveAgents = swarms.some(
    s => s.agents.some(a => a.status === 'running' || a.status === 'pending')
  )

  // 1s tick for real-time updates (matches CoordinatorTaskPanel pattern)
  useEffect(() => {
    if (!hasActiveAgents) return
    const interval = setInterval(() => {
      setTick(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [hasActiveAgents])

  if (swarms.length === 0) return null

  // Show the most recent active swarm
  const activeSwarm = swarms[0]
  const runningCount = activeSwarm.agents.filter(a => a.status === 'running').length
  const completedCount = activeSwarm.agents.filter(a => a.status === 'completed').length
  const totalCount = activeSwarm.agents.length

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row">
        <Text bold color="cyan">{activeSwarm.name}</Text>
        <Text dimColor> ({completedCount}/{totalCount} agents)</Text>
        {runningCount > 0 && (
          <Text color="cyan"> — {runningCount} running</Text>
        )}
        {onOpenDashboard && (
          <Text dimColor> [Tab for dashboard]</Text>
        )}
      </Box>
      {activeSwarm.agents
        .filter(a => a.status === 'running' || a.status === 'pending')
        .map(agent => (
          <AgentProgressLine key={agent.agentId} agent={agent} />
        ))}
    </Box>
  )
}
