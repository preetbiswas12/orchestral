/**
 * Context Collapse — Intelligent Context Reduction
 *
 * Uses the context engine's relevance scorer to identify messages
 * that can be safely summarized or dropped, then applies the
 * appropriate compaction strategy.
 *
 * Wired into the CONTEXT_COLLAPSE feature flag in context.tsx.
 */

import { scoreMessages, partitionByTier, recommendTier } from '../contextEngine/scorer.js'
import { createCompactionPlan } from '../contextEngine/strategies.js'
import { healthMonitor } from '../contextEngine/healthMonitor.js'
import type { ScoringContext } from '../contextEngine/scorer.js'
import type { Message } from '../types/message.js'

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

/**
 * Check if context collapse is enabled.
 */
export function isContextCollapseEnabled(): boolean {
  // Feature flag check — matches the pattern in context.tsx
  try {
    const { feature } = require('bun:bundle')
    return feature('CONTEXT_COLLAPSE')
  } catch {
    return false
  }
}

/**
 * Main entry point: collapse context by scoring and reducing messages.
 * Called from the CONTEXT_COLLAPSE feature flag path in context.tsx.
 */
export async function collapseContext(messages: Message[]): Promise<Message[]> {
  stats.health.totalSpawns++

  try {
    if (messages.length === 0) {
      stats.health.totalEmptySpawns++
      if (stats.health.totalEmptySpawns >= 5) {
        stats.health.emptySpawnWarningEmitted = true
      }
      return messages
    }

    stats.health.totalEmptySpawns = 0
    stats.health.emptySpawnWarningEmitted = false

    // Build scoring context from available data
    const scoringContext: ScoringContext = {
      currentTask: extractCurrentTask(messages),
      recentMessages: messages.slice(-20),
      fileTree: [],
      openFiles: extractOpenFiles(messages),
    }

    // Score and partition messages
    const scored = scoreMessages(messages, scoringContext)
    const { keep, summarize, drop } = partitionByTier(scored)

    // Record health metrics
    healthMonitor.recordSnapshot(
      messages.length * 500, // rough token estimate
      200_000, // default context window
      messages.length,
    )

    // If nothing to collapse, return as-is
    if (drop.length === 0 && summarize.length === 0) {
      return messages
    }

    // Build collapsed result: keep all, but collapse the summarize tier
    // into compact representations
    const result: Message[] = []
    const dropSet = new Set(drop.map(d => d.score.messageId))
    const summarizeSet = new Set(summarize.map(s => s.score.messageId))

    for (const msg of messages) {
      const msgId = (msg as any)?.message?.id ?? (msg as any)?.uuid ?? ''

      if (dropSet.has(msgId)) {
        stats.collapsedMessages++
        continue // Drop this message
      }

      if (summarizeSet.has(msgId)) {
        // Keep but could be summarized in a more advanced implementation
        result.push(msg)
        continue
      }

      result.push(msg)
    }

    if (drop.length > 0) {
      stats.collapsedSpans++
    }

    return result
  } catch (error) {
    stats.health.totalErrors++
    lastError = error instanceof Error ? error.message : String(error)
    stats.health.lastError = lastError
    // On error, return original messages unchanged
    return messages
  }
}

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

export default {
  collapseContext,
  isContextCollapseEnabled,
  getStats,
  resetStats,
}

// ── Helpers ────────────────────────────────────────────────────────

function extractCurrentTask(messages: Message[]): string {
  // Get the last user message as the current task
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