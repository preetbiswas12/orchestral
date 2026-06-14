/**
 * Context Collapse — Intelligent Context Reduction
 *
 * Uses the context engine's relevance scorer to identify messages
 * that can be safely summarized or dropped, then applies the
 * appropriate compaction strategy.
 *
 * Wired into the CONTEXT_COLLAPSE feature flag in query.ts.
 *
 * Lifecycle (per query loop iteration):
 * 1. applyCollapsesIfNeeded() — proactively score + stage low-relevance messages
 * 2. isWithheldPromptTooLong() — detect 413 errors during streaming
 * 3. recoverFromOverflow() — drain staged collapses on 413
 * 4. resetContextCollapse() — clear all state after autocompact or /compact
 */

import { scoreMessages, partitionByTier } from '../contextEngine/scorer.js'
import { healthMonitor } from '../contextEngine/healthMonitor.js'
import type { ScoringContext } from '../contextEngine/scorer.js'
import type { Message } from '../types/message.js'
import type { AssistantMessage } from '../types/message.js'
import type { ToolUseContext } from '../../Tool.js'

// ── Staged Collapse State ──────────────────────────────────────────

interface StagedCollapse {
  messageIds: Set<string>
  tier: 'summarize' | 'drop'
  scoredAt: number
}

let stagedCollapses: StagedCollapse[] = []
let committedMessageIds: Set<string> = new Set()
let pending413 = false

// ── Collapse Stats ─────────────────────────────────────────────────

export interface CollapseStats {
  collapsedSpans: number
  collapsedMessages: number
  stagedSpans: number
  health: {
    totalSpawns: number
    totalErrors: number
    totalEmptySpawns: number
    emptySpawnWarningEmitted: boolean
    lastError?: string
  }
}

let stats: CollapseStats = {
  collapsedSpans: 0,
  collapsedMessages: 0,
  stagedSpans: 0,
  health: {
    totalSpawns: 0,
    totalErrors: 0,
    totalEmptySpawns: 0,
    emptySpawnWarningEmitted: false,
  },
}

let lastError: string | undefined

// ── Feature Flag ───────────────────────────────────────────────────

/**
 * Check if context collapse is enabled.
 */
export function isContextCollapseEnabled(): boolean {
  try {
    const { feature } = require('bun:bundle')
    return feature('CONTEXT_COLLAPSE')
  } catch {
    return false
  }
}

// ── 1. applyCollapsesIfNeeded ──────────────────────────────────────

/**
 * Proactively score messages and stage low-relevance ones for collapse.
 * Called by the query loop BEFORE autocompact each iteration.
 *
 * Messages in the 'drop' tier are staged (not immediately removed).
 * The next recoverFromOverflow() call commits them.
 * Messages already committed are skipped.
 */
export async function applyCollapsesIfNeeded(
  messages: Message[],
  _toolUseContext: ToolUseContext,
  _querySource: string,
): Promise<{ messages: Message[] }> {
  stats.health.totalSpawns++

  try {
    if (messages.length === 0) {
      stats.health.totalEmptySpawns++
      if (stats.health.totalEmptySpawns >= 5) {
        stats.health.emptySpawnWarningEmitted = true
      }
      return { messages }
    }

    stats.health.totalEmptySpawns = 0
    stats.health.emptySpawnWarningEmitted = false

    // Filter out already-committed messages
    const activeMessages = messages.filter(msg => {
      const msgId = getMessageId(msg)
      return !committedMessageIds.has(msgId)
    })

    if (activeMessages.length === 0) {
      return { messages }
    }

    // Build scoring context
    const scoringContext: ScoringContext = {
      currentTask: extractCurrentTask(activeMessages),
      recentMessages: activeMessages.slice(-20),
      fileTree: [],
      openFiles: extractOpenFiles(activeMessages),
    }

    // Score and partition
    const scored = scoreMessages(activeMessages, scoringContext)
    const { keep, summarize, drop } = partitionByTier(scored)

    // Record health snapshot (rough token estimate: ~500 tokens per message)
    const estimatedTokens = activeMessages.length * 500
    healthMonitor.recordSnapshot(estimatedTokens, 200_000, activeMessages.length)

    // If pending413, be more aggressive — also summarize the summarize tier
    const shouldCollapseDrop = drop.length > 0
    const shouldCollapseSummarize = pending413 && summarize.length > 0

    if (!shouldCollapseDrop && !shouldCollapseSummarize) {
      return { messages }
    }

    // Stage the drop-tier messages
    if (shouldCollapseDrop) {
      const dropIds = new Set(drop.map(d => d.score.messageId))
      stagedCollapses.push({
        messageIds: dropIds,
        tier: 'drop',
        scoredAt: Date.now(),
      })
      stats.stagedSpans++
    }

    // If pending413, also stage summarize-tier
    if (shouldCollapseSummarize) {
      const summarizeIds = new Set(summarize.map(s => s.score.messageId))
      stagedCollapses.push({
        messageIds: summarizeIds,
        tier: 'summarize',
        scoredAt: Date.now(),
      })
      stats.stagedSpans++
    }

    // Build result: remove drop-tier messages immediately (staged for commit)
    const dropSet = new Set(drop.map(d => d.score.messageId))
    const summarizeSet = new Set(
      shouldCollapseSummarize ? summarize.map(s => s.score.messageId) : [],
    )

    const result: Message[] = []
    for (const msg of messages) {
      const msgId = getMessageId(msg)

      if (dropSet.has(msgId)) {
        stats.collapsedMessages++
        continue // Remove drop-tier
      }

      if (summarizeSet.has(msgId)) {
        // Keep summarize-tier but mark as collapsible
        result.push(msg)
        continue
      }

      result.push(msg)
    }

    if (drop.length > 0) {
      stats.collapsedSpans++
    }

    // Reset pending413 after acting on it
    pending413 = false

    return { messages: result }
  } catch (error) {
    stats.health.totalErrors++
    lastError = error instanceof Error ? error.message : String(error)
    stats.health.lastError = lastError
    return { messages }
  }
}

// ── 2. recoverFromOverflow ─────────────────────────────────────────

/**
 * Emergency drain of ALL staged collapses when a real 413 (prompt too long)
 * is received from the API. Commits all staged message IDs and filters
 * them out of the message array.
 *
 * Called by the query loop when isWithheld413 is detected.
 */
export function recoverFromOverflow(
  messages: Message[],
  _querySource: string,
): { messages: Message[]; committed: number } {
  if (stagedCollapses.length === 0) {
    return { messages, committed: 0 }
  }

  // Drain all staged collapses into committed set
  let totalCommitted = 0
  for (const staged of stagedCollapses) {
    for (const id of staged.messageIds) {
      if (!committedMessageIds.has(id)) {
        committedMessageIds.add(id)
        totalCommitted++
      }
    }
  }

  // Clear staged collapses (they're now committed)
  stagedCollapses = []

  // Filter messages to remove committed IDs
  const filtered = messages.filter(msg => {
    const msgId = getMessageId(msg)
    return !committedMessageIds.has(msgId)
  })

  // Record compaction in health monitor
  const tokensSaved = totalCommitted * 500 // rough estimate
  if (tokensSaved > 0) {
    healthMonitor.recordCompaction(tokensSaved)
  }

  return { messages: filtered, committed: totalCommitted }
}

// ── 3. isWithheldPromptTooLong ─────────────────────────────────────

/**
 * Detect 413 (prompt too long) API errors during streaming.
 * When detected, sets the pending413 flag so the next applyCollapsesIfNeeded
 * call will be more aggressive (also collapsing summarize-tier messages).
 *
 * Returns true to withhold the error from streaming output, allowing
 * the recovery loop to run first.
 */
export function isWithheldPromptTooLong(
  message: AssistantMessage,
  isPromptTooLongMessage: (msg: AssistantMessage) => boolean,
  _querySource: string,
): boolean {
  if (message.type !== 'assistant') return false
  if (!(message as any)?.isApiErrorMessage) return false

  if (isPromptTooLongMessage(message)) {
    pending413 = true
    return true // Withhold — let recovery loop handle it
  }

  return false
}

// ── 4. resetContextCollapse ────────────────────────────────────────

/**
 * Clear all staged/committed collapse state and reset the health monitor.
 * Called after autocompact or manual /compact, since compaction replaces
 * the entire context window and prior collapse state is stale.
 */
export function resetContextCollapse(): void {
  stagedCollapses = []
  committedMessageIds = new Set()
  pending413 = false
  healthMonitor.reset()
}

// ── Original collapseContext (kept for backward compatibility) ─────

/**
 * Main entry point: collapse context by scoring and reducing messages.
 * Kept for backward compatibility with direct callers.
 */
export async function collapseContext(messages: Message[]): Promise<Message[]> {
  const result = await applyCollapsesIfNeeded(
    messages,
    {} as ToolUseContext,
    'direct',
  )
  return result.messages
}

// ── Stats ──────────────────────────────────────────────────────────

/**
 * Get current collapse statistics for display.
 */
export function getStats(): CollapseStats {
  return { ...stats, health: { ...stats.health, lastError } }
}

/**
 * Reset collapse statistics.
 */
export function resetStats(): void {
  stats = {
    collapsedSpans: 0,
    collapsedMessages: 0,
    stagedSpans: 0,
    health: {
      totalSpawns: 0,
      totalErrors: 0,
      totalEmptySpawns: 0,
      emptySpawnWarningEmitted: false,
    },
  }
  lastError = undefined
}

// ── Default Export ─────────────────────────────────────────────────

export default {
  collapseContext,
  applyCollapsesIfNeeded,
  recoverFromOverflow,
  isWithheldPromptTooLong,
  resetContextCollapse,
  isContextCollapseEnabled,
  getStats,
  resetStats,
}

// ── Helpers ────────────────────────────────────────────────────────

function getMessageId(message: Message): string {
  return (message as any)?.message?.id ?? (message as any)?.uuid ?? ''
}

function extractCurrentTask(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if ((msg as any)?.type === 'user') {
      const content = (msg as any)?.message?.content
      if (typeof content === 'string') return content
      if (Array.isArray(content)) {
        return content
          .filter((b: any) => b?.type === 'text')
          .map((b: any) => b.text ?? '')
          .join(' ')
      }
    }
  }
  return ''
}

function extractOpenFiles(messages: Message[]): string[] {
  const files = new Set<string>()
  const filePattern = /[\w./-]+\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|c|cpp|h|hpp|json|yaml|yml|toml|md)/g

  for (const msg of messages.slice(-30)) {
    const text = extractText(msg)
    const matches = text.match(filePattern)
    if (matches) {
      for (const m of matches) files.add(m)
    }
  }

  return [...files]
}

function extractText(message: Message): string {
  const msg = (message as any)?.message
  if (!msg) return ''
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((block: any) => {
        if (typeof block === 'string') return block
        if (block?.type === 'text') return block.text ?? ''
        return ''
      })
      .join(' ')
  }
  return ''
}
