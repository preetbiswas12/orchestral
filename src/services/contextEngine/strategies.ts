/**
 * Compaction Strategies
 *
 * Multi-tier compaction strategies that build on the existing microcompact
 * system. Each tier provides progressively more aggressive context reduction.
 *
 * Tiers:
 * - Light:  Truncate tool results, dedupe file reads, remove redundant messages
 * - Medium: LLM-powered summarization of middle conversation turns
 * - Aggressive: Full conversation summarization with context recovery notes
 */

import type { Message } from '../../types/message.js'
import { scoreMessages, partitionByTier, type ScoringContext } from './scorer.js'

// ── Types ──────────────────────────────────────────────────────────

export type CompactionTier = 'light' | 'medium' | 'aggressive'

export interface CompactionStrategy {
  tier: CompactionTier
  description: string
  /** Estimated token savings percentage */
  estimatedSavingsPercent: number
}

export interface CompactionPlan {
  strategy: CompactionStrategy
  keepIndices: Set<number>
  summarizeIndices: number[]
  dropIndices: number[]
  /** Human-readable explanation of what will happen */
  summary: string
}

// ── Strategy Definitions ───────────────────────────────────────────

export const STRATEGIES: Record<CompactionTier, CompactionStrategy> = {
  light: {
    tier: 'light',
    description: 'Truncate old tool results, deduplicate file reads, remove redundant messages',
    estimatedSavingsPercent: 15,
  },
  medium: {
    tier: 'medium',
    description: 'Summarize middle conversation turns, keep first/last intact, preserve all user messages',
    estimatedSavingsPercent: 40,
  },
  aggressive: {
    tier: 'aggressive',
    description: 'Full conversation summarization with context recovery notes',
    estimatedSavingsPercent: 65,
  },
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Create a compaction plan for the given messages and tier.
 * The plan describes which messages to keep, summarize, or drop.
 */
export function createCompactionPlan(
  messages: Message[],
  tier: CompactionTier,
  context: ScoringContext,
): CompactionPlan {
  const strategy = STRATEGIES[tier]
  const scored = scoreMessages(messages, context)
  const { keep, summarize, drop } = partitionByTier(scored)

  const keepIndices = new Set(keep.map(s => messages.indexOf(s.message)))
  const summarizeIndices = summarize.map(s => messages.indexOf(s.message)).filter(i => i >= 0)
  const dropIndices = drop.map(s => messages.indexOf(s.message)).filter(i => i >= 0)

  const summary = buildSummary(strategy, keep.length, summarize.length, drop.length, messages.length)

  return { strategy, keepIndices, summarizeIndices, dropIndices, summary }
}

/**
 * Apply the light compaction tier.
 * Fast, rule-based, no LLM needed.
 */
export function applyLightCompaction(messages: Message[]): {
  messages: Message[]
  tokensSaved: number
  actions: string[]
} {
  const actions: string[] = []
  const result: Message[] = []
  let tokensSaved = 0

  // Track file reads to dedupe
  const fileReadCounts = new Map<string, number>()
  const FILE_READ_DUPE_THRESHOLD = 3
  const TOOL_RESULT_MAX_AGE = 10 // messages from end
  const TOOL_RESULT_MAX_LENGTH = 2000

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const messagesFromEnd = messages.length - i - 1
    const type = (msg as any)?.type ?? 'unknown'

    // Deduplicate repeated file reads
    if (type === 'tool_result') {
      const text = extractText(msg)
      const fileMatch = text.match(/<file>([^<]+)<\/file>/)

      if (fileMatch) {
        const filePath = fileMatch[1]
        const count = (fileReadCounts.get(filePath) ?? 0) + 1
        fileReadCounts.set(filePath, count)

        if (count > FILE_READ_DUPE_THRESHOLD) {
          tokensSaved += text.length
          actions.push(`Deduplicated file read: ${filePath} (read ${count}x)`)
          continue
        }
      }

      // Truncate old tool results
      if (messagesFromEnd > TOOL_RESULT_MAX_AGE && text.length > TOOL_RESULT_MAX_LENGTH) {
        const truncated = text.slice(0, TOOL_RESULT_MAX_LENGTH) + '\n[truncated by context engine]'
        tokensSaved += text.length - truncated.length
        actions.push(`Truncated old tool result (${text.length} → ${truncated.length} chars)`)
        result.push({ ...msg, ...((msg as any)?.message ? { message: { ...(msg as any).message, content: truncated } } : {}) } as Message)
        continue
      }
    }

    result.push(msg)
  }

  return { messages: result, tokensSaved, actions }
}

/**
 * Get a human-readable description of what a strategy will do.
 */
export function describeStrategy(tier: CompactionTier): string {
  const s = STRATEGIES[tier]
  return `${s.tier.toUpperCase()}: ${s.description} (~${s.estimatedSavingsPercent}% savings)`
}

/**
 * Recommend a compaction tier based on context fill percentage.
 */
export function recommendTier(contextPercentFull: number): CompactionTier {
  if (contextPercentFull >= 85) return 'aggressive'
  if (contextPercentFull >= 60) return 'medium'
  if (contextPercentFull >= 40) return 'light'
  return 'light' // Default even when not very full
}

// ── Helpers ────────────────────────────────────────────────────────

function buildSummary(
  strategy: CompactionStrategy,
  keep: number,
  summarize: number,
  drop: number,
  total: number,
): string {
  const parts = [
    `${strategy.tier.toUpperCase()} compaction: ${total} messages → keep ${keep}, summarize ${summarize}, drop ${drop}`,
  ]
  if (summarize > 0) {
    parts.push(`${summarize} messages will be summarized by AI`)
  }
  if (drop > 0) {
    parts.push(`${drop} messages can be safely removed`)
  }
  return parts.join('. ')
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
        if (block?.type === 'tool_result') return typeof block.content === 'string' ? block.content : ''
        return ''
      })
      .join(' ')
  }
  return ''
}
