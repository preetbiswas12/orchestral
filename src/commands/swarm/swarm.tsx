/**
 * Swarm Command — Multi-Agent Parallel Execution
 *
 * Spawns a swarm of parallel agents that each work on the same task
 * from different angles, then merges their results.
 *
 * Usage:
 *   /swarm "Review this codebase for security issues"
 *   /swarm --agents=5 --strategy=vote "Find bugs in the auth module"
 *   /swarm --agents=3 --strategy=best "Suggest performance improvements"
 *
 * Options:
 *   --agents=N       Number of parallel agents (default: 3, max: 8)
 *   --strategy=TYPE  Merge strategy: concatenate, vote, rank, best (default: concatenate)
 *   --concurrency=N  Max concurrent agents (default: agents count)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  agentOrchestrator,
  type MergeStrategy,
} from '../../services/agentOrchestrator.js'
import { createCacheSafeParams, getLastCacheSafeParams } from '../../utils/forkedAgent.js'
import type { SwarmSpawnContext } from '../../services/agentOrchestrator.js'

type Phase = 'config' | 'running' | 'completed' | 'error'

interface SwarmResult {
  swarmId: string
  name: string
  status: Phase
  output: string
  agentCount: number
  completedCount: number
  failedCount: number
  duration: number
}

type LocalJSXCommandCall = (
  onDone: () => void,
  context: any,
  args: string,
) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  return <SwarmUI onClose={onDone} toolUseContext={context} args={args} />
}

function SwarmUI({
  onClose,
  toolUseContext,
  args,
}: {
  onClose: () => void
  toolUseContext: any
  args: string
}) {
  const [phase, setPhase] = useState<Phase>('config')
  const [task, setTask] = useState(parseTask(args))
  const [agentCount, setAgentCount] = useState(parseAgentCount(args))
  const [strategy, setStrategy] = useState<MergeStrategy>(parseStrategy(args))
  const [concurrency, setConcurrency] = useState(parseAgentCount(args))
  const [result, setResult] = useState<SwarmResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [configStep, setConfigStep] = useState<'task' | 'agents' | 'strategy' | 'confirm'>('task')
  const swarmIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)

  // Poll for swarm progress
  useEffect(() => {
    if (phase !== 'running' || !swarmIdRef.current) return

    const interval = setInterval(() => {
      const swarm = agentOrchestrator.getSwarm(swarmIdRef.current!)
      if (!swarm) return

      const completed = swarm.agents.filter(a => a.status === 'completed').length
      const failed = swarm.agents.filter(a => a.status === 'failed').length
      const total = swarm.agents.length

      setResult({
        swarmId: swarm.swarmId,
        name: swarm.name,
        status: swarm.status === 'completed' ? 'completed' : swarm.status === 'failed' ? 'error' : 'running',
        output: swarm.mergedOutput ?? '',
        agentCount: total,
        completedCount: completed,
        failedCount: failed,
        duration: swarm.totalDuration,
      })

      if (swarm.status === 'completed' || swarm.status === 'failed') {
        setPhase(swarm.status === 'completed' ? 'completed' : 'error')
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  const handleLaunch = useCallback(() => {
    if (!task.trim()) {
      setError('Task description is required')
      return
    }

    try {
      // Build CacheSafeParams from the current ToolUseContext
      // This follows the same pattern as btw.tsx and other forked agent callers
      let cacheSafeParams = getLastCacheSafeParams()
      if (!cacheSafeParams) {
        // Fallback: build from ToolUseContext
        cacheSafeParams = createCacheSafeParams(toolUseContext)
      }

      const spawnContext: SwarmSpawnContext = {
        cacheSafeParams,
        canUseTool: toolUseContext.canUseTool,
      }

      // Create agent configs — each agent gets the same task but with a unique angle
      const agentConfigs = Array.from({ length: agentCount }, (_, i) => ({
        name: `Agent ${i + 1}`,
        prompt: buildAgentPrompt(task, i, agentCount),
        agentType: 'general-purpose',
      }))

      const swarmId = agentOrchestrator.createSwarm({
        name: `Swarm: ${task.slice(0, 40)}${task.length > 40 ? '...' : ''}`,
        agents: agentConfigs,
        mergeStrategy: strategy,
        maxConcurrency: concurrency,
      })

      swarmIdRef.current = swarmId
      startTimeRef.current = Date.now()

      // Start the swarm with real execution context
      agentOrchestrator.startSwarm(swarmId, spawnContext)

      setPhase('running')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [task, agentCount, strategy, concurrency, toolUseContext])

  useInput((inputChar, key) => {
    if (key.escape) {
      // Cancel running swarm on escape
      if (phase === 'running' && swarmIdRef.current) {
        agentOrchestrator.cancelSwarm(swarmIdRef.current)
      }
      onClose()
      return
    }

    if (phase === 'config') {
      if (configStep === 'task') {
        if (key.return && task.trim()) {
          setConfigStep('agents')
        } else if (key.backspace || key.delete) {
          setTask(prev => prev.slice(0, -1))
        } else if (inputChar && !key.ctrl && !key.meta) {
          setTask(prev => prev + inputChar)
        }
      }

      if (configStep === 'agents') {
        if (inputChar === '3') setAgentCount(3)
        if (inputChar === '4') setAgentCount(4)
        if (inputChar === '5') setAgentCount(5)
        if (inputChar === '6') setAgentCount(6)
        if (inputChar === '7') setAgentCount(7)
        if (inputChar === '8') setAgentCount(8)
        if (key.return) setConfigStep('strategy')
      }

      if (configStep === 'strategy') {
        if (inputChar === 'c' || inputChar === '1') setStrategy('concatenate')
        if (inputChar === 'v' || inputChar === '2') setStrategy('vote')
        if (inputChar === 'r' || inputChar === '3') setStrategy('rank')
        if (inputChar === 'b' || inputChar === '4') setStrategy('best')
        if (key.return) setConfigStep('confirm')
      }

      if (configStep === 'confirm') {
        if (inputChar === 'y' || inputChar === 'Y' || key.return) handleLaunch()
        if (inputChar === 'n' || inputChar === 'N') {
          setConfigStep('task')
        }
      }
    }

    if (phase === 'completed' || phase === 'error') {
      if (key.return || inputChar === 'q') {
        onClose()
      }
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Box flexDirection="row">
        <Text bold color="green">⚡ Swarm Command</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {phase === 'config' && (
        <ConfigStep
          step={configStep}
          task={task}
          agentCount={agentCount}
          strategy={strategy}
        />
      )}

      {phase === 'running' && result && (
        <RunningView result={result} />
      )}

      {phase === 'completed' && result && (
        <CompletedView result={result} />
      )}

      {phase === 'error' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="red" bold>✗ Swarm failed</Text>
          {error && <Text color="red">Error: {error}</Text>}
          {result && (
            <Box flexDirection="column" marginTop={1}>
              <Text>Completed: {result.completedCount}/{result.agentCount} agents</Text>
              {result.failedCount > 0 && <Text color="yellow">Failed: {result.failedCount}</Text>}
            </Box>
          )}
        </Box>
      )}

      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>
        {phase === 'config'
          ? 'Enter: next | Esc: cancel'
          : phase === 'running'
            ? 'Esc: cancel swarm'
            : 'Enter/q: close'}
      </Text>
    </Box>
  )
}

// ── Sub-views ──────────────────────────────────────────────────────

function ConfigStep({
  step,
  task,
  agentCount,
  strategy,
}: {
  step: 'task' | 'agents' | 'strategy' | 'confirm'
  task: string
  agentCount: number
  strategy: MergeStrategy
}) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Configure Swarm</Text>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text color={step === 'task' ? 'green' : 'gray'}>1. Task: </Text>
          <Text color={step === 'task' ? 'cyan' : 'white'}>
            {task || '(type your task)'}
            {step === 'task' && <Text dimColor>_</Text>}
          </Text>
        </Text>

        <Text>
          <Text color={step === 'agents' ? 'green' : 'gray'}>2. Agents: </Text>
          <Text color={step === 'agents' ? 'cyan' : 'white'}>{agentCount}</Text>
          {step === 'agents' && <Text dimColor> (3-8)</Text>}
        </Text>

        <Text>
          <Text color={step === 'strategy' ? 'green' : 'gray'}>3. Strategy: </Text>
          <Text color={step === 'strategy' ? 'cyan' : 'white'}>{strategy}</Text>
          {step === 'strategy' && <Text dimColor> (c=concatenate, v=vote, r=rank, b=best)</Text>}
        </Text>

        {step === 'confirm' && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color="green">Ready to launch {agentCount} agents with "{strategy}" merge.</Text>
            <Text dimColor>Press Y/Enter to start | N to go back</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function RunningView({ result }: { result: SwarmResult }) {
  const progress = result.agentCount > 0
    ? Math.round((result.completedCount / result.agentCount) * 100)
    : 0

  const barWidth = 30
  const filled = Math.round((progress / 100) * barWidth)
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled)

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold color="yellow">⚡ Swarm Running</Text>
      <Box marginTop={1}>
        <Text color="cyan">[{bar}]</Text> <Text>{progress}%</Text>
      </Box>
      <Text>Completed: {result.completedCount}/{result.agentCount} agents</Text>
      {result.failedCount > 0 && (
        <Text color="red">Failed: {result.failedCount}</Text>
      )}
      <Text dimColor>Elapsed: {Math.round(result.duration / 1000)}s</Text>
    </Box>
  )
}

function CompletedView({ result }: { result: SwarmResult }) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold color="green">✓ Swarm Complete</Text>
      <Text>Agents: {result.completedCount}/{result.agentCount} completed</Text>
      <Text>Duration: {Math.round(result.duration / 1000)}s</Text>
      {result.failedCount > 0 && (
        <Text color="yellow">Failed: {result.failedCount}</Text>
      )}
      {result.output && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Merged Results:</Text>
          <Box borderStyle="single" borderColor="gray" width="100%" />
          <Text>{result.output.slice(0, 500)}{result.output.length > 500 ? '...' : ''}</Text>
        </Box>
      )}
    </Box>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function buildAgentPrompt(task: string, agentIndex: number, totalAgents: number): string {
  const angles = [
    'Focus on correctness and potential bugs.',
    'Focus on security vulnerabilities and attack vectors.',
    'Focus on performance and optimization opportunities.',
    'Focus on code style, readability, and maintainability.',
    'Focus on edge cases and error handling.',
    'Focus on architecture and design patterns.',
    'Focus on testing coverage and testability.',
    'Focus on documentation and developer experience.',
  ]

  const angle = angles[agentIndex % angles.length]

  if (totalAgents === 1) {
    return task
  }

  return `${task}\n\nYour specific focus: ${angle}`
}

function parseTask(args: string): string {
  // Extract task from args, removing flags
  const cleaned = args
    .replace(/--agents=\d+/g, '')
    .replace(/--strategy=\w+/g, '')
    .replace(/--concurrency=\d+/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
  return cleaned
}

function parseAgentCount(args: string): number {
  const match = args.match(/--agents=(\d+)/)
  if (match) {
    const n = parseInt(match[1], 10)
    if (n >= 1 && n <= 8) return n
  }
  return 3 // Default
}

function parseStrategy(args: string): MergeStrategy {
  const match = args.match(/--strategy=(\w+)/)
  if (match) {
    const s = match[1].toLowerCase()
    if (['concatenate', 'vote', 'rank', 'best', 'custom'].includes(s)) {
      return s as MergeStrategy
    }
  }
  return 'concatenate'
}
