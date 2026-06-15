/**
 * Agent Dashboard — Multi-Agent Orchestration Dashboard
 *
 * Interactive TUI for managing parallel agent swarms.
 *
 * Views:
 * - Swarm View: Grid of agent progress cards, real-time updates
 * - Create View: Create a new swarm with multiple agents (interactive text inputs)
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
import { Box, Text, useInput, TextInput } from 'ink'
import {
  agentOrchestrator,
  type SwarmState,
  type SwarmAgentResult,
  type MergeStrategy,
} from '../../services/agentOrchestrator.js'
import { AgentProgressCard } from '../../components/AgentProgressCard.js'

type View = 'swarms' | 'create' | 'history' | 'details'
type CreateStep = 'name' | 'agents' | 'options' | 'confirm'

// Field focus tracking for the create form
type CreateField =
  | { step: 'name' }
  | { step: 'agents'; agentIndex: number; field: 'name' | 'prompt' }
  | { step: 'options' }
  | { step: 'confirm' }

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
  const [createStep, setCreateStep] = useState<CreateStep>('name')
  const [createField, setCreateField] = useState<CreateField>({ step: 'name' })
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

  // Reset form when entering create view
  const enterCreateView = useCallback(() => {
    setView('create')
    setCreateStep('name')
    setCreateField({ step: 'name' })
    setSwarmName('')
    setAgentInputs([{ name: 'Agent 1', prompt: '' }])
    setMergeStrategy('concatenate')
    setMaxConcurrency(3)
    setError(null)
  }, [])

  const handleCreateSwarm = useCallback(() => {
    if (!swarmName.trim()) {
      setError('Swarm name is required')
      return
    }
    const validAgents = agentInputs.filter(a => a.name.trim() && a.prompt.trim())
    if (validAgents.length === 0) {
      setError('At least one agent with a name and prompt is required')
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
    if (toolUseContext) {
      try {
        // Dynamic import for ESM compatibility
        import('../../utils/forkedAgent').then(({ createCacheSafeParams, getLastCacheSafeParams }) => {
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
            agentOrchestrator.startSwarm(swarmId)
          }
        }).catch(() => {
          agentOrchestrator.startSwarm(swarmId)
        })
      } catch {
        agentOrchestrator.startSwarm(swarmId)
      }
    } else {
      agentOrchestrator.startSwarm(swarmId)
    }

    setView('swarms')
    setSelectedSwarmIdx(0)
    setError(null)
  }, [swarmName, agentInputs, mergeStrategy, maxConcurrency, toolUseContext])

  // Determine if we're in "typing mode" (a text input is focused)
  const isTypingMode = view === 'create' && (
    createField.step === 'name' ||
    (createField.step === 'agents' && (createField.field === 'name' || createField.field === 'prompt'))
  )

  useInput((inputChar, key) => {
    if (key.escape) {
      if (view === 'create' && createStep !== 'name') {
        const steps: CreateStep[] = ['name', 'agents', 'options', 'confirm']
        const idx = steps.indexOf(createStep)
        if (idx > 0) setCreateStep(steps[idx - 1])
        return
      }
      if (view === 'create' && createStep === 'name') {
        // Exit create view entirely
        setView('swarms')
        return
      }
      if (view === 'details') {
        setView('swarms')
        return
      }
      onClose()
      return
    }

    // View switching (only when not typing and not in create flow)
    if (key.tab && !isTypingMode && view !== 'create') {
      const idx = views.indexOf(view)
      setView(views[(idx + 1) % views.length])
      return
    }

    if (inputChar === 'q' && view !== 'create' && !isTypingMode) {
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
        enterCreateView()
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

    // Create view controls — only process non-typing keys when NOT in typing mode
    if (view === 'create' && !isTypingMode) {
      // Add agent
      if (inputChar === 'a' && createStep === 'agents') {
        setAgentInputs(prev => [...prev, { name: `Agent ${prev.length + 1}`, prompt: '' }])
      }
      // Remove agent
      if (inputChar === 'r' && createStep === 'agents' && agentInputs.length > 1) {
        setAgentInputs(prev => prev.slice(0, -1))
      }
      // Cycle merge strategy
      if (inputChar === 'v' && createStep === 'options') {
        const strategies: MergeStrategy[] = ['concatenate', 'vote', 'rank', 'best']
        const idx = strategies.indexOf(mergeStrategy)
        setMergeStrategy(strategies[(idx + 1) % strategies.length])
      }
      // Concurrency controls
      if (inputChar === '+' && createStep === 'options' && maxConcurrency < 10) {
        setMaxConcurrency(prev => prev + 1)
      }
      if (inputChar === '-' && createStep === 'options' && maxConcurrency > 1) {
        setMaxConcurrency(prev => prev - 1)
      }
      // Navigate steps
      if (inputChar === 'n' || key.return) {
        const steps: CreateStep[] = ['name', 'agents', 'options', 'confirm']
        const idx = steps.indexOf(createStep)
        if (idx < steps.length - 1) {
          const nextStep = steps[idx + 1]
          setCreateStep(nextStep)
          // Set default focus for next step
          if (nextStep === 'agents') {
            setCreateField({ step: 'agents', agentIndex: 0, field: 'name' })
          } else if (nextStep === 'options') {
            setCreateField({ step: 'options' })
          } else if (nextStep === 'confirm') {
            setCreateField({ step: 'confirm' })
          }
        } else {
          // Submit on confirm step
          handleCreateSwarm()
        }
      }
    }
  })

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
          field={createField}
          swarmName={swarmName}
          onSwarmNameChange={setSwarmName}
          agentInputs={agentInputs}
          onAgentInputsChange={setAgentInputs}
          mergeStrategy={mergeStrategy}
          maxConcurrency={maxConcurrency}
          error={error}
          onFieldChange={setCreateField}
          onNextStep={() => {
            const steps: CreateStep[] = ['name', 'agents', 'options', 'confirm']
            const idx = steps.indexOf(createStep)
            if (idx < steps.length - 1) {
              const nextStep = steps[idx + 1]
              setCreateStep(nextStep)
              if (nextStep === 'agents') {
                setCreateField({ step: 'agents', agentIndex: 0, field: 'name' })
              } else if (nextStep === 'options') {
                setCreateField({ step: 'options' })
              } else if (nextStep === 'confirm') {
                setCreateField({ step: 'confirm' })
              }
            } else {
              handleCreateSwarm()
            }
          }}
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
      {isTypingMode ? (
        <Text dimColor>typing... | Enter: accept | Esc: cancel input</Text>
      ) : (
        <Text dimColor>
          Tab: switch views | Esc: back/quit
          {view === 'swarms' ? ' | n: new | m: merge | c: cancel | d: details | j/k: navigate' : ''}
          {view === 'create' && createStep === 'name' ? ' | Type name then press Enter' : ''}
          {view === 'create' && createStep === 'agents' ? ' | Tab: next field | Enter: next step | a: add | r: remove' : ''}
          {view === 'create' && createStep === 'options' ? ' | v: cycle strategy | +/-: concurrency | Enter: next' : ''}
          {view === 'create' && createStep === 'confirm' ? ' | Enter: create swarm | Esc: back' : ''}
        </Text>
      )}
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
      <Box flexDirection="row">
        <Text bold>Swarms: </Text>
        {swarms.map((s, i) => (
          <Text key={s.swarmId} color={i === selectedSwarmIdx ? 'blue' : 'gray'}>
            {s.name}{i < swarms.length - 1 ? ' | ' : ''}
          </Text>
        ))}
      </Box>

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

      {swarm.mergedOutput && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">Merged Output:</Text>
          <Text dimColor>{swarm.mergedOutput.slice(0, 200)}{swarm.mergedOutput.length > 200 ? '...' : ''}</Text>
        </Box>
      )}
    </Box>
  )
}

// ── Interactive Create View ─────────────────────────────────────────

function CreateView({
  step,
  field,
  swarmName,
  onSwarmNameChange,
  agentInputs,
  onAgentInputsChange,
  mergeStrategy,
  maxConcurrency,
  error,
  onFieldChange,
  onNextStep,
}: {
  step: CreateStep
  field: CreateField
  swarmName: string
  onSwarmNameChange: (v: string) => void
  agentInputs: Array<{ name: string; prompt: string }>
  onAgentInputsChange: (agents: Array<{ name: string; prompt: string }>) => void
  mergeStrategy: MergeStrategy
  maxConcurrency: number
  error: string | null
  onFieldChange: (f: CreateField) => void
  onNextStep: () => void
}) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Create New Swarm</Text>
      <Text dimColor>Step: {step}</Text>

      {error && <Text color="red">Error: {error}</Text>}

      {/* Step 1: Swarm Name */}
      {step === 'name' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Swarm Name:</Text>
          <TextInput
            value={swarmName}
            onChange={onSwarmNameChange}
            onSubmit={() => {
              if (swarmName.trim()) {
                onFieldChange({ step: 'agents', agentIndex: 0, field: 'name' })
              }
            }}
            placeholder="e.g. Security Review Swarm"
          />
          <Text dimColor>Enter a name for this swarm, then press Enter to continue</Text>
        </Box>
      )}

      {/* Step 2: Agent Configuration */}
      {step === 'agents' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Agents ({agentInputs.length}):</Text>
          {agentInputs.map((agent, i) => (
            <Box key={i} flexDirection="column" marginTop={1} borderStyle="single" borderColor={field.step === 'agents' && field.agentIndex === i ? 'cyan' : 'gray'} paddingX={1}>
              <Text bold>Agent {i + 1}:</Text>
              <Box flexDirection="row">
                <Text dimColor>Name: </Text>
                {field.step === 'agents' && field.agentIndex === i && field.field === 'name' ? (
                  <TextInput
                    value={agent.name}
                    onChange={(val) => {
                      const updated = [...agentInputs]
                      updated[i] = { ...updated[i], name: val }
                      onAgentInputsChange(updated)
                    }}
                    onSubmit={() => onFieldChange({ step: 'agents', agentIndex: i, field: 'prompt' })}
                    placeholder="Agent name"
                  />
                ) : (
                  <Text color="cyan">{agent.name}</Text>
                )}
              </Box>
              <Box flexDirection="row">
                <Text dimColor>Prompt: </Text>
                {field.step === 'agents' && field.agentIndex === i && field.field === 'prompt' ? (
                  <TextInput
                    value={agent.prompt}
                    onChange={(val) => {
                      const updated = [...agentInputs]
                      updated[i] = { ...updated[i], prompt: val }
                      onAgentInputsChange(updated)
                    }}
                    onSubmit={() => {
                      // Move to next agent or wrap around
                      if (i + 1 < agentInputs.length) {
                        onFieldChange({ step: 'agents', agentIndex: i + 1, field: 'name' })
                      } else {
                        onFieldChange({ step: 'agents', agentIndex: 0, field: 'prompt' })
                      }
                    }}
                    placeholder="What should this agent do?"
                  />
                ) : (
                  <Text>{agent.prompt ? agent.prompt.slice(0, 60) + (agent.prompt.length > 60 ? '...' : '') : '(no prompt)'}</Text>
                )}
              </Box>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text dimColor>a: add agent | r: remove last | Tab: cycle through fields | Enter: next step</Text>
          </Box>
        </Box>
      )}

      {/* Step 3: Options */}
      {step === 'options' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Options:</Text>
          <Text>Merge Strategy: <Text color="cyan">{mergeStrategy}</Text> <Text dimColor>(v to cycle)</Text></Text>
          <Text>Max Concurrency: <Text color="cyan">{maxConcurrency}</Text> <Text dimColor>(+/- to adjust)</Text></Text>
          <Box marginTop={1}>
            <Text dimColor>Enter: continue to confirm</Text>
          </Box>
        </Box>
      )}

      {/* Step 4: Confirm */}
      {step === 'confirm' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Ready to Create</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>Swarm Name: <Text color="green">{swarmName}</Text></Text>
            <Text>Agents: <Text color="green">{agentInputs.length}</Text></Text>
            <Text>Strategy: <Text color="green">{mergeStrategy}</Text></Text>
            <Text>Concurrency: <Text color="green">{maxConcurrency}</Text></Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Agent configs:</Text>
            {agentInputs.map((agent, i) => (
              <Text key={i}>
                {i + 1}. <Text bold>{agent.name}</Text>: {agent.prompt.slice(0, 80)}{agent.prompt.length > 80 ? '...' : ''}
              </Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="green" bold>Press Enter to create and launch the swarm</Text>
            <Text dimColor>Press Esc to go back</Text>
          </Box>
        </Box>
      )}
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
