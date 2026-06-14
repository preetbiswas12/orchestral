/**
 * Agent Dashboard — Multi-Agent Orchestration Dashboard
 *
 * Interactive TUI for managing parallel agent swarms.
 *
 * Views:
 * - Swarm View: Grid of agent progress cards, real-time updates
 * - Create View: Create a new swarm with multiple agents
 * - History View: Past swarms with results and statistics
 *
 * Controls:
 * - Tab: switch views
 * - n: new swarm
 * - s: steer selected agent
 * - c: cancel selected agent
 * - m: merge results
 * - d: view agent details
 * - ↑/↓: navigate agents
 * - Esc/q: close
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  agentOrchestrator,
  type SwarmState,
  type SwarmAgentResult,
  type MergeStrategy,
} from '../../services/agentOrchestrator.js'
import { AgentProgressCard } from '../../components/AgentProgressCard.js'

type View = 'swarms' | 'create' | 'history' | 'details'

type LocalJSXCommandCall = (
  onDone: () => void,
  context: any,
  args: string,
) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  return <AgentDashboardUI onClose={onDone} toolUseContext={context} args={args} />
}

function AgentDashboardUI({
  onClose,
  toolUseContext,
}: {
  onClose: () => void
  toolUseContext: any
}) {
  const [view, setView] = useState<View>('swarms')
  const [selectedSwarmIdx, setSelectedSwarmIdx] = useState(0)
  const [selectedAgentIdx, setSelectedAgentIdx] = useState(0)
  const [, setTick] = useState(0)

  // Create form state
  const [swarmName, setSwarmName] = useState('')
  const [agentInputs, setAgentInputs] = useState<Array<{ name: string; prompt: string }>>([
    { name: 'Agent 1', prompt: '' },
  ])
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('concatenate')
  const [maxConcurrency, setMaxConcurrency] = useState(3)
  const [createStep, setCreateStep] = useState<'name' | 'agents' | 'options' | 'confirm'>('name')
  const [error, setError] = useState<string | null>(null)

  const views: View[] = ['swarms', 'create', 'history', 'details']

  // 1s tick for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const swarms = agentOrchestrator.listSwarms()
  const activeSwarm = swarms[selectedSwarmIdx] ?? null

  useInput((inputChar, key) => {
    if (key.escape) {
      if (view === 'create' && createStep !== 'name') {
        // Go back in create flow
        const steps: Array<typeof createStep> = ['name', 'agents', 'options', 'confirm']
        const idx = steps.indexOf(createStep)
        if (idx > 0) setCreateStep(steps[idx - 1])
        return
      }
      if (view === 'details') {
        setView('swarms')
        return
      }
      onClose()
      return
    }

    // View switching
    if (key.tab) {
      const idx = views.indexOf(view)
      setView(views[(idx + 1) % views.length])
      return
    }

    if (inputChar === 'q' && view !== 'create') {
      onClose()
      return
    }

    // Swarm view controls
    if (view === 'swarms') {
      if (inputChar === 'j' || key.downArrow) {
        setSelectedAgentIdx(prev => Math.min(prev + 1, (activeSwarm?.agents.length ?? 1) - 1))
      }
      if (inputChar === 'k' || key.upArrow) {
        setSelectedAgentIdx(prev => Math.max(prev - 1, 0))
      }
      if (inputChar === 'n') {
        setView('create')
        setCreateStep('name')
        setSwarmName('')
        setAgentInputs([{ name: 'Agent 1', prompt: '' }])
        setError(null)
      }
      if (inputChar === 'm' && activeSwarm && activeSwarm.status === 'completed') {
        agentOrchestrator.mergeSwarmResults(activeSwarm.swarmId)
      }
      if (inputChar === 'c' && activeSwarm && activeSwarm.status === 'running') {
        agentOrchestrator.cancelSwarm(activeSwarm.swarmId)
      }
      if (inputChar === 'd' && activeSwarm) {
        setView('details')
      }
    }

    // Create view controls
    if (view === 'create') {
      if (inputChar === 'a') {
        setAgentInputs(prev => [...prev, { name: `Agent ${prev.length + 1}`, prompt: '' }])
      }
      if (inputChar === 'r' && agentInputs.length > 1) {
        setAgentInputs(prev => prev.slice(0, -1))
      }
      if (inputChar === 'n' || key.return) {
        const steps: Array<typeof createStep> = ['name', 'agents', 'options', 'confirm']
        const idx = steps.indexOf(createStep)
        if (idx < steps.length - 1) {
          setCreateStep(steps[idx + 1])
        } else {
          // Submit
          handleCreateSwarm()
        }
      }
      if (inputChar === 'v') {
        // Cycle merge strategy
        const strategies: MergeStrategy[] = ['concatenate', 'vote', 'rank', 'best']
        const idx = strategies.indexOf(mergeStrategy)
        setMergeStrategy(strategies[(idx + 1) % strategies.length])
      }
      if (inputChar === '+' && maxConcurrency < 10) {
        setMaxConcurrency(prev => prev + 1)
      }
      if (inputChar === '-' && maxConcurrency > 1) {
        setMaxConcurrency(prev => prev - 1)
      }
    }
  })

  const handleCreateSwarm = useCallback(() => {
    if (!swarmName.trim()) {
      setError('Swarm name is required')
      return
    }
    const validAgents = agentInputs.filter(a => a.name.trim() && a.prompt.trim())
    if (validAgents.length === 0) {
      setError('At least one agent with name and prompt is required')
      return
    }

    const swarmId = agentOrchestrator.createSwarm({
      name: swarmName.trim(),
      agents: validAgents.map(a => ({
        name: a.name.trim(),
        prompt: a.prompt.trim(),
        agentType: 'local_agent',
      })),
      mergeStrategy,
      maxConcurrency,
    })

    // If we have a ToolUseContext (running inside an active session),
    // pass it to startSwarm for real agent execution.
    // Without context, agents are just tracked (legacy mode).
    if (toolUseContext) {
      try {
        const { createCacheSafeParams, getLastCacheSafeParams } = require('../../utils/forkedAgent.js')
        let cacheSafeParams = getLastCacheSafeParams?.()
        if (!cacheSafeParams && createCacheSafeParams) {
          cacheSafeParams = createCacheSafeParams(toolUseContext)
        }
        if (cacheSafeParams && toolUseContext.canUseTool) {
          agentOrchestrator.startSwarm(swarmId, {
            cacheSafeParams,
            canUseTool: toolUseContext.canUseTool,
          })
        } else {
          // Fallback: start without real execution
          agentOrchestrator.startSwarm(swarmId)
        }
      } catch {
        // Fallback: start without real execution
        agentOrchestrator.startSwarm(swarmId)
      }
    } else {
      agentOrchestrator.startSwarm(swarmId)
    }

    setView('swarms')
    setSelectedSwarmIdx(0)
    setError(null)
  }, [swarmName, agentInputs, mergeStrategy, maxConcurrency, toolUseContext])

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
      {/* Header */}
      <Box flexDirection="row">
        <Text bold color="blue">Multi-Agent Dashboard</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* View tabs */}
      <Box flexDirection="row">
        {views.map((v, i) => (
          <Text key={v} color={view === v ? 'blue' : 'gray'}>
            {i + 1}:{v}{i < views.length - 1 ? '  ' : ''}
          </Text>
        ))}
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* View content */}
      {view === 'swarms' && (
        <SwarmsView
          swarms={swarms}
          selectedSwarmIdx={selectedSwarmIdx}
          selectedAgentIdx={selectedAgentIdx}
          onSelectSwarm={setSelectedSwarmIdx}
          onSelectAgent={setSelectedAgentIdx}
        />
      )}
      {view === 'create' && (
        <CreateView
          step={createStep}
          swarmName={swarmName}
          agentInputs={agentInputs}
          mergeStrategy={mergeStrategy}
          maxConcurrency={maxConcurrency}
          error={error}
        />
      )}
      {view === 'history' && (
        <HistoryView swarms={swarms} />
      )}
      {view === 'details' && activeSwarm && (
        <DetailsView swarm={activeSwarm} />
      )}

      {/* Footer */}
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>
        Tab: switch views | Esc: back/quit
        {view === 'swarms' ? ' | n: new | m: merge | c: cancel | d: details | j/k: navigate' : ''}
        {view === 'create' ? ' | n/Enter: next | a: add agent | r: remove | v: strategy | +/-: concurrency' : ''}
      </Text>
    </Box>
  )
}

// ── Sub-Views ──────────────────────────────────────────────────────

function SwarmsView({
  swarms,
  selectedSwarmIdx,
  selectedAgentIdx,
  onSelectSwarm,
  onSelectAgent,
}: {
  swarms: SwarmState[]
  selectedSwarmIdx: number
  selectedAgentIdx: number
  onSelectSwarm: (idx: number) => void
  onSelectAgent: (idx: number) => void
}) {
  if (swarms.length === 0) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text dimColor>No swarms yet. Press 'n' to create one.</Text>
        <Text dimColor>A swarm lets you run multiple agents in parallel.</Text>
      </Box>
    )
  }

  const swarm = swarms[selectedSwarmIdx]
  if (!swarm) return null

  const statusColor = swarm.status === 'completed' ? 'green'
    : swarm.status === 'running' ? 'cyan'
    : swarm.status === 'failed' ? 'red'
    : 'gray'

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Swarm selector */}
      <Box flexDirection="row">
        <Text bold>Swarms: </Text>
        {swarms.map((s, i) => (
          <Text key={s.swarmId} color={i === selectedSwarmIdx ? 'blue' : 'gray'}>
            {s.name}{i < swarms.length - 1 ? ' | ' : ''}
          </Text>
        ))}
      </Box>

      {/* Selected swarm info */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold>{swarm.name}</Text>
        <Text>
          Status: <Text color={statusColor}>{swarm.status.toUpperCase()}</Text>
          {' | '}Agents: {swarm.agents.length}
          {' | '}Strategy: {swarm.config.mergeStrategy}
          {' | '}Concurrency: {swarm.config.maxConcurrency}
        </Text>
        {swarm.totalDuration > 0 && (
          <Text dimColor>
            Duration: {(swarm.totalDuration / 1000).toFixed(1)}s | Tokens: {swarm.totalTokens.toLocaleString()}
          </Text>
        )}
      </Box>

      {/* Agent cards */}
      <Box flexDirection="column" marginTop={1}>
        {swarm.agents.map((agent, i) => (
          <AgentProgressCard
            key={agent.agentId}
            agent={agent}
            selected={i === selectedAgentIdx}
            index={i + 1}
          />
        ))}
      </Box>

      {/* Merged output preview */}
      {swarm.mergedOutput && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">Merged Output:</Text>
          <Text dimColor>{swarm.mergedOutput.slice(0, 200)}{swarm.mergedOutput.length > 200 ? '...' : ''}</Text>
        </Box>
      )}
    </Box>
  )
}

function CreateView({
  step,
  swarmName,
  agentInputs,
  mergeStrategy,
  maxConcurrency,
  error,
}: {
  step: 'name' | 'agents' | 'options' | 'confirm'
  swarmName: string
  agentInputs: Array<{ name: string; prompt: string }>
  mergeStrategy: MergeStrategy
  maxConcurrency: number
  error: string | null
}) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Create New Swarm</Text>
      <Text dimColor>Step: {step}</Text>

      {error && <Text color="red">Error: {error}</Text>}

      <Box flexDirection="column" marginTop={1}>
        <Text>Swarm Name: <Text color={step === 'name' ? 'cyan' : 'white'}>{swarmName || '(not set)'}</Text></Text>
        <Text>Agents: {agentInputs.length}</Text>
        <Text>Merge Strategy: <Text color={step === 'options' ? 'cyan' : 'white'}>{mergeStrategy}</Text></Text>
        <Text>Max Concurrency: <Text color={step === 'options' ? 'cyan' : 'white'}>{maxConcurrency}</Text></Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Agent configs:</Text>
        {agentInputs.map((agent, i) => (
          <Text key={i}>
            {i + 1}. {agent.name}: {agent.prompt ? agent.prompt.slice(0, 40) + '...' : '(no prompt)'}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {step === 'name' && 'Enter swarm name, then press n to continue'}
          {step === 'agents' && 'Configure agents (a: add, r: remove), then press n'}
          {step === 'options' && 'v: cycle strategy | +/-: concurrency | n: continue'}
          {step === 'confirm' && 'Press n to create and launch the swarm'}
        </Text>
      </Box>
    </Box>
  )
}

function HistoryView({ swarms }: { swarms: SwarmState[] }) {
  const stats = agentOrchestrator.getStats()

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Swarm History & Statistics</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Stats:</Text>
        <Text>Total swarms: {stats.totalSwarms}</Text>
        <Text>Active: {stats.activeSwarms} | Completed: {stats.completedSwarms} | Failed: {stats.failedSwarms}</Text>
        <Text>Total agents: {stats.totalAgents} | Avg per swarm: {stats.avgAgentsPerSwarm}</Text>
        <Text>Total tokens: {stats.totalTokens.toLocaleString()} | Avg duration: {(stats.avgDuration / 1000).toFixed(1)}s</Text>
      </Box>

      {swarms.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Recent Swarms:</Text>
          {swarms.slice(0, 10).map(swarm => {
            const statusColor = swarm.status === 'completed' ? 'green'
              : swarm.status === 'failed' ? 'red'
              : swarm.status === 'running' ? 'cyan'
              : 'gray'
            return (
              <Text key={swarm.swarmId}>
                <Text color={statusColor}>●</Text>
                {' '}{swarm.name} — {swarm.status} ({swarm.agents.length} agents, {(swarm.totalDuration / 1000).toFixed(1)}s)
              </Text>
            )
          })}
        </Box>
      )}

      {swarms.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>No swarm history yet.</Text>
        </Box>
      )}
    </Box>
  )
}

function DetailsView({ swarm }: { swarm: SwarmState }) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Swarm Details: {swarm.name}</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text>ID: <Text dimColor>{swarm.swarmId}</Text></Text>
        <Text>Created: {new Date(swarm.createdAt).toLocaleString()}</Text>
        {swarm.startedAt && <Text>Started: {new Date(swarm.startedAt).toLocaleString()}</Text>}
        {swarm.completedAt && <Text>Completed: {new Date(swarm.completedAt).toLocaleString()}</Text>}
        <Text>Merge strategy: {swarm.config.mergeStrategy}</Text>
        <Text>Max concurrency: {swarm.config.maxConcurrency}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Agent Results:</Text>
        {swarm.agents.map(agent => (
          <Box key={agent.agentId} flexDirection="column" marginTop={1}>
            <Text bold>{agent.name} <Text dimColor>({agent.agentId})</Text></Text>
            <Text>Status: {agent.status} | Duration: {(agent.duration / 1000).toFixed(1)}s | Tokens: {agent.tokensUsed.toLocaleString()}</Text>
            {agent.output && (
              <Box marginTop={1}>
                <Text dimColor>Output:</Text>
                <Text>{agent.output.slice(0, 300)}{agent.output.length > 300 ? '...' : ''}</Text>
              </Box>
            )}
            {agent.error && <Text color="red">Error: {agent.error}</Text>}
          </Box>
        ))}
      </Box>

      {swarm.mergedOutput && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">Merged Output:</Text>
          <Text>{swarm.mergedOutput.slice(0, 500)}{swarm.mergedOutput.length > 500 ? '...' : ''}</Text>
        </Box>
      )}
    </Box>
  )
}
