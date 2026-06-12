/**
 * Agent Orchestrator
 *
 * Multi-agent orchestration service that manages swarms of parallel agents.
 * Builds on the existing task system (LocalAgentTaskState, TaskStateBase) and
 * provides higher-level swarm management: spawn, track, steer, merge, cancel.
 *
 * Integration:
 * - Uses existing TaskStatus, TaskStateBase, generateTaskId from Task.ts
 * - Uses existing LocalAgentTaskState for agent state tracking
 * - Uses existing agentNameRegistry for agent naming
 * - Uses existing AppState.tasks for task storage
 */

import { randomBytes } from 'crypto'

// ── Types ──────────────────────────────────────────────────────────

export type MergeStrategy = 'concatenate' | 'vote' | 'rank' | 'best' | 'custom'

export interface AgentConfig {
  name: string
  prompt: string
  model?: string
  agentType: string
  tools?: string[]
  /** Color for UI display */
  color?: string
}

export interface SwarmConfig {
  name: string
  agents: AgentConfig[]
  mergeStrategy: MergeStrategy
  maxConcurrency: number
}

export interface SwarmAgentResult {
  agentId: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  output: string
  duration: number
  tokensUsed: number
  error?: string
}

export interface SwarmState {
  swarmId: string
  name: string
  config: SwarmConfig
  agents: SwarmAgentResult[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  createdAt: number
  startedAt?: number
  completedAt?: number
  totalDuration: number
  totalTokens: number
  mergedOutput?: string
}

// ── Swarm ID Generation ────────────────────────────────────────────

const SWARM_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function generateSwarmId(): string {
  const bytes = randomBytes(6)
  let id = 'swarm_'
  for (let i = 0; i < 6; i++) {
    id += SWARM_ALPHABET[bytes[i]! % SWARM_ALPHABET.length]
  }
  return id
}

function generateAgentId(): string {
  const bytes = randomBytes(6)
  let id = 'agent_'
  for (let i = 0; i < 6; i++) {
    id += SWARM_ALPHABET[bytes[i]! % SWARM_ALPHABET.length]
  }
  return id
}

// ── Merge Strategies ───────────────────────────────────────────────

function mergeConcatenate(results: SwarmAgentResult[]): string {
  return results
    .filter(r => r.status === 'completed' && r.output)
    .map(r => `=== ${r.name} ===\n${r.output}`)
    .join('\n\n')
}

function mergeVote(results: SwarmAgentResult[]): string {
  const completed = results.filter(r => r.status === 'completed' && r.output)
  if (completed.length === 0) return 'No completed results to vote on.'

  // Simple voting: group similar outputs and pick the most common
  const outputs = completed.map(r => r.output.trim())
  const counts = new Map<string, number>()
  for (const o of outputs) {
    counts.set(o, (counts.get(o) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const winner = sorted[0]

  return `=== VOTE RESULT (${winner[1]}/${completed.length} agents agreed) ===\n${winner[0]}`
}

function mergeRank(results: SwarmAgentResult[]): string {
  const completed = results
    .filter(r => r.status === 'completed' && r.output)
    .sort((a, b) => b.tokensUsed - a.tokensUsed) // Rank by token usage (proxy for thoroughness)

  if (completed.length === 0) return 'No completed results to rank.'

  return completed
    .map((r, i) => `=== RANK ${i + 1}: ${r.name} (${r.tokensUsed} tok, ${r.duration}ms) ===\n${r.output}`)
    .join('\n\n')
}

function mergeBest(results: SwarmAgentResult[]): string {
  const completed = results.filter(r => r.status === 'completed' && r.output)
  if (completed.length === 0) return 'No completed results.'

  // Pick the result with the best ratio of output length to tokens used
  const best = completed.reduce((best, current) => {
    const bestScore = best.output.length / Math.max(best.tokensUsed, 1)
    const currentScore = current.output.length / Math.max(current.tokensUsed, 1)
    return currentScore > bestScore ? current : best
  })

  return `=== BEST RESULT: ${best.name} ===\n${best.output}`
}

function mergeResults(results: SwarmAgentResult[], strategy: MergeStrategy): string {
  switch (strategy) {
    case 'concatenate': return mergeConcatenate(results)
    case 'vote': return mergeVote(results)
    case 'rank': return mergeRank(results)
    case 'best': return mergeBest(results)
    case 'custom': return mergeConcatenate(results) // Fallback
    default: return mergeConcatenate(results)
  }
}

// ── Agent Orchestrator ─────────────────────────────────────────────

export class AgentOrchestrator {
  private swarms: Map<string, SwarmState> = new Map()
  private activeSwarmId: string | null = null

  /**
   * Create a new swarm configuration.
   */
  createSwarm(config: SwarmConfig): string {
    const swarmId = generateSwarmId()
    const agents: SwarmAgentResult[] = config.agents.map(a => ({
      agentId: generateAgentId(),
      name: a.name,
      status: 'pending',
      output: '',
      duration: 0,
      tokensUsed: 0,
    }))

    const swarm: SwarmState = {
      swarmId,
      name: config.name,
      config,
      agents,
      status: 'pending',
      createdAt: Date.now(),
      totalDuration: 0,
      totalTokens: 0,
    }

    this.swarms.set(swarmId, swarm)
    return swarmId
  }

  /**
   * Start a swarm — marks all agents as ready to run.
   * Actual agent execution is handled by the task system;
   * this orchestrator tracks the swarm-level state.
   */
  startSwarm(swarmId: string): void {
    const swarm = this.swarms.get(swarmId)
    if (!swarm) throw new Error(`Swarm not found: ${swarmId}`)

    swarm.status = 'running'
    swarm.startedAt = Date.now()
    this.activeSwarmId = swarmId

    // Mark agents as running up to concurrency limit
    const { maxConcurrency } = swarm.config
    let launched = 0
    for (const agent of swarm.agents) {
      if (launched >= maxConcurrency) break
      if (agent.status === 'pending') {
        agent.status = 'running'
        launched++
      }
    }
  }

  /**
   * Update an agent's status within a swarm.
   */
  updateAgent(swarmId: string, agentId: string, update: Partial<SwarmAgentResult>): void {
    const swarm = this.swarms.get(swarmId)
    if (!swarm) return

    const agent = swarm.agents.find(a => a.agentId === agentId)
    if (!agent) return

    Object.assign(agent, update)

    // Update swarm totals
    swarm.totalTokens = swarm.agents.reduce((sum, a) => sum + a.tokensUsed, 0)
    swarm.totalDuration = swarm.startedAt ? Date.now() - swarm.startedAt : 0

    // Check if all agents are done
    const allDone = swarm.agents.every(
      a => a.status === 'completed' || a.status === 'failed' || a.status === 'cancelled'
    )
    if (allDone && swarm.status === 'running') {
      swarm.status = swarm.agents.some(a => a.status === 'completed') ? 'completed' : 'failed'
      swarm.completedAt = Date.now()
      swarm.totalDuration = swarm.completedAt - (swarm.startedAt ?? swarm.createdAt)

      // Auto-merge results
      swarm.mergedOutput = mergeResults(swarm.agents, swarm.config.mergeStrategy)
    }

    // Launch next batch if concurrency allows
    if (swarm.status === 'running') {
      this.launchNextBatch(swarm)
    }
  }

  /**
   * Get the current state of a swarm.
   */
  getSwarm(swarmId: string): SwarmState | undefined {
    return this.swarms.get(swarmId)
  }

  /**
   * Get the currently active swarm.
   */
  getActiveSwarm(): SwarmState | null {
    if (!this.activeSwarmId) return null
    return this.swarms.get(this.activeSwarmId) ?? null
  }

  /**
   * List all swarms (most recent first).
   */
  listSwarms(): SwarmState[] {
    return [...this.swarms.values()].sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * List active (running or pending) swarms.
   */
  listActiveSwarms(): SwarmState[] {
    return this.listSwarms().filter(
      s => s.status === 'pending' || s.status === 'running'
    )
  }

  /**
   * Cancel a specific agent in a swarm.
   */
  cancelAgent(swarmId: string, agentId: string): void {
    this.updateAgent(swarmId, agentId, { status: 'cancelled' })
  }

  /**
   * Cancel an entire swarm.
   */
  cancelSwarm(swarmId: string): void {
    const swarm = this.swarms.get(swarmId)
    if (!swarm) return

    swarm.status = 'cancelled'
    swarm.completedAt = Date.now()
    for (const agent of swarm.agents) {
      if (agent.status === 'pending' || agent.status === 'running') {
        agent.status = 'cancelled'
      }
    }
  }

  /**
   * Merge results for a completed swarm.
   */
  mergeSwarmResults(swarmId: string): string {
    const swarm = this.swarms.get(swarmId)
    if (!swarm) return 'Swarm not found.'

    const output = mergeResults(swarm.agents, swarm.config.mergeStrategy)
    swarm.mergedOutput = output
    return output
  }

  /**
   * Get aggregate statistics across all swarms.
   */
  getStats(): {
    totalSwarms: number
    activeSwarms: number
    completedSwarms: number
    failedSwarms: number
    totalAgents: number
    totalTokens: number
    avgAgentsPerSwarm: number
    avgDuration: number
  } {
    const all = this.listSwarms()
    const completed = all.filter(s => s.status === 'completed')
    const totalAgents = all.reduce((sum, s) => sum + s.agents.length, 0)
    const totalTokens = all.reduce((sum, s) => sum + s.totalTokens, 0)
    const durations = completed.filter(s => s.totalDuration > 0).map(s => s.totalDuration)

    return {
      totalSwarms: all.length,
      activeSwarms: all.filter(s => s.status === 'running' || s.status === 'pending').length,
      completedSwarms: completed.length,
      failedSwarms: all.filter(s => s.status === 'failed').length,
      totalAgents,
      totalTokens,
      avgAgentsPerSwarm: all.length > 0 ? Math.round(totalAgents / all.length) : 0,
      avgDuration: durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    }
  }

  /**
   * Clear completed/failed swarms older than the given age (ms).
   */
  cleanupOldSwarms(maxAgeMs: number = 3_600_000): void {
    const cutoff = Date.now() - maxAgeMs
    for (const [id, swarm] of this.swarms) {
      if (
        (swarm.status === 'completed' || swarm.status === 'failed' || swarm.status === 'cancelled') &&
        (swarm.completedAt ?? swarm.createdAt) < cutoff
      ) {
        this.swarms.delete(id)
      }
    }
  }

  // ── Private ──────────────────────────────────────────────────────

  private launchNextBatch(swarm: SwarmState): void {
    const running = swarm.agents.filter(a => a.status === 'running').length
    const { maxConcurrency } = swarm.config
    const slots = maxConcurrency - running

    let launched = 0
    for (const agent of swarm.agents) {
      if (launched >= slots) break
      if (agent.status === 'pending') {
        agent.status = 'running'
        launched++
      }
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────

export const agentOrchestrator = new AgentOrchestrator()
