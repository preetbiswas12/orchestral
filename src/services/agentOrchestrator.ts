/**
 * Agent Orchestrator
 *
 * Multi-agent orchestration service that manages swarms of parallel agents.
 * Builds on the existing task system and runForkedAgent infrastructure to
 * actually spawn real agent query loops.
 *
 * Integration:
 * - Uses runForkedAgent() for actual agent execution (same as sideQuestion, compact, memory)
 * - Uses CacheSafeParams for prompt cache sharing with parent
 * - Uses extractResultText() for result extraction
 * - Uses createUserMessage() for prompt construction
 */

import { randomBytes } from 'crypto'
import { runForkedAgent, extractResultText, createUserMessage } from '../utils/forkedAgent.js'
import type { CacheSafeParams } from '../utils/forkedAgent.js'
import type { CanUseToolFn } from '../hooks/useCanUseTool.js'
import { realtimeEventBus } from '../web/realtime.js'

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

/**
 * Context needed to actually spawn agents (not just track state).
 * Obtained from the query loop's ToolUseContext via createCacheSafeParams().
 */
export interface SwarmSpawnContext {
  cacheSafeParams: CacheSafeParams
  canUseTool: CanUseToolFn
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
   * Start a swarm. Two modes:
   *
   * 1. With spawnContext: Actually spawns real agents via runForkedAgent().
   *    Each agent runs in its own forked query loop with access to the full
   *    conversation context (via CacheSafeParams for prompt cache sharing).
   *    Progress is tracked via updateAgent() calls.
   *
   * 2. Without spawnContext: Legacy behavior — marks agents as 'running'
   *    without actual execution. Used for config/planning from dashboards
   *    that don't have query loop context.
   */
  startSwarm(swarmId: string, spawnContext?: SwarmSpawnContext): void {
    const swarm = this.swarms.get(swarmId)
    if (!swarm) throw new Error(`Swarm not found: ${swarmId}`)

    swarm.status = 'running'
    swarm.startedAt = Date.now()
    this.activeSwarmId = swarmId

    if (!spawnContext) {
      // Legacy mode: just mark agents as running (no real execution)
      const { maxConcurrency } = swarm.config
      let launched = 0
      for (const agent of swarm.agents) {
        if (launched >= maxConcurrency) break
        if (agent.status === 'pending') {
          agent.status = 'running'
          launched++
        }
      }
      return
    }

    // Real execution mode: spawn agents via runForkedAgent
    this.spawnAgents(swarm, spawnContext)
  }

  /**
   * Spawn agents for a swarm using the provided execution context.
   * Launches agents up to maxConcurrency and manages lifecycle.
   * Fire-and-forget: runAgent calls updateAgent on completion, which
   * triggers launchNextBatch to fill concurrency slots.
   */
  private spawnAgents(swarm: SwarmState, spawnContext: SwarmSpawnContext): void {
    const { maxConcurrency } = swarm.config

    // Mark initial batch as running
    const pendingAgents = swarm.agents.filter(a => a.status === 'pending')
    const initialBatch = pendingAgents.slice(0, maxConcurrency)
    for (const agent of initialBatch) {
      agent.status = 'running'
    }

    // Launch each agent. Each runAgent is independent and calls
    // updateAgent on completion, which triggers launchNextBatch.
    for (const agent of initialBatch) {
      this.runAgent(swarm, agent, spawnContext)
        .catch(err => {
          // Safety net: shouldn't happen since runAgent catches internally
          this.updateAgent(swarm.swarmId, agent.agentId, {
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
          })
        })
    }
  }

  /**
   * Run a single agent via runForkedAgent. This creates a forked query loop
   * that shares the parent's prompt cache for efficiency.
   */
  private async runAgent(
    swarm: SwarmState,
    agent: SwarmAgentResult,
    spawnContext: SwarmSpawnContext,
  ): Promise<void> {
    const startTime = Date.now()

    try {
      // Get the agent's prompt from the swarm config
      const agentConfig = swarm.config.agents.find(a => a.agentId === agent.agentId)
      const basePrompt = agentConfig?.prompt ?? 'No prompt provided.'

      // Wrap the agent prompt with swarm-specific instructions
      const promptContent = `<system-reminder>You are agent "${agent.name}" in a swarm called "${swarm.name}". Complete the task below independently and provide a thorough, self-contained response.</system-reminder>

${basePrompt}`

      const result = await runForkedAgent({
        promptMessages: [createUserMessage({ content: promptContent })],
        cacheSafeParams: spawnContext.cacheSafeParams,
        canUseTool: spawnContext.canUseTool,
        querySource: 'swarm_agent',
        forkLabel: `swarm_${swarm.swarmId}_${agent.agentId}`,
        maxTurns: 25, // Reasonable limit — agents should complete within 25 turns
        maxOutputTokens: 8192, // Cap output — swarm agents shouldn't produce essays
      })

      const duration = Date.now() - startTime
      const output = extractResultText(result.messages, 'Agent completed with no text output')
      const totalTokens = result.totalUsage.input_tokens + result.totalUsage.output_tokens

      this.updateAgent(swarm.swarmId, agent.agentId, {
        status: 'completed',
        output,
        duration,
        tokensUsed: totalTokens,
      })
    } catch (error) {
      const duration = Date.now() - startTime
      this.updateAgent(swarm.swarmId, agent.agentId, {
        status: 'failed',
        output: '',
        duration,
        tokensUsed: 0,
        error: error instanceof Error ? error.message : String(error),
      })
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

    // Push realtime event to WebSocket clients
    try {
      realtimeEventBus.emit('agent_update', {
        swarmId,
        agentId,
        status: update.status ?? agent.status,
        output: update.output ?? agent.output,
        tokensUsed: update.tokensUsed ?? agent.tokensUsed,
      })
    } catch {
      // Realtime is best-effort
    }

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
