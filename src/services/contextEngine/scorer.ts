/**
 * Context Relevance Scorer
 *
 * Scores messages and files by relevance to the current task using
 * a fast rule-based algorithm. Optionally upgradeable to LLM-based
 * scoring for complex tasks.
 *
 * Scoring factors:
 * - Recency decay (newer = more relevant)
 * - File reference matching (messages mentioning open files score higher)
 * - Tool result age (old tool results decay faster)
 * - Message role weighting (user messages > assistant > tool results)
 * - Task keyword overlap (shared tokens with current task)
 */

import type { Message } from '../../types/message.js'

// ── Types ──────────────────────────────────────────────────────────

export interface RelevanceScore {
  messageId: string
  score: number
  reasons: string[]
  tier: 'keep' | 'summarize' | 'drop'
}

export interface ScoringContext {
  currentTask: string
  recentMessages: Message[]
  fileTree: string[]
  openFiles: string[]
}

export interface ScoredMessage {
  message: Message
  score: RelevanceScore
}

// ── Constants ──────────────────────────────────────────────────────

const KEEP_THRESHOLD = 0.7
const SUMMARIZE_THRESHOLD = 0.3

// Half-life for recency decay (number of messages)
const RECENCY_HALF_LIFE = 20

// Tool result decay is faster — half-life of 8 messages
const TOOL_RESULT_HALF_LIFE = 8

// Role weights
const ROLE_WEIGHTS: Record<string, number> = {
  user: 1.0,
  assistant: 0.8,
  tool_result: 0.4,
  system: 0.6,
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Score all messages in the context window against the current task.
 * Returns scored messages sorted by relevance (highest first).
 */
export function scoreMessages(
  messages: Message[],
  context: ScoringContext,
): ScoredMessage[] {
  const totalMessages = messages.length
  const taskKeywords = extractKeywords(context.currentTask)
  const openFileSet = new Set(context.openFiles.map(f => f.toLowerCase()))

  return messages.map((message, index) => {
    const score = scoreSingleMessage(message, index, totalMessages, taskKeywords, openFileSet)
    return { message, score }
  }).sort((a, b) => b.score.score - a.score.score)
}

/**
 * Partition messages into tiers based on scoring.
 * Used by compaction strategies to decide what to keep/summarize/drop.
 */
export function partitionByTier(
  scored: ScoredMessage[],
): { keep: ScoredMessage[]; summarize: ScoredMessage[]; drop: ScoredMessage[] } {
  const keep: ScoredMessage[] = []
  const summarize: ScoredMessage[] = []
  const drop: ScoredMessage[] = []

  for (const s of scored) {
    if (s.score.tier === 'keep') keep.push(s)
    else if (s.score.tier === 'summarize') summarize.push(s)
    else drop.push(s)
  }

  return { keep, summarize, drop }
}

/**
 * Get a summary of the scoring results for display.
 */
export function getScoringSummary(scored: ScoredMessage[]): {
  total: number
  keep: number
  summarize: number
  drop: number
  avgScore: number
  topReasons: string[]
} {
  const { keep, summarize, drop } = partitionByTier(scored)
  const avgScore = scored.reduce((sum, s) => sum + s.score.score, 0) / Math.max(scored.length, 1)

  // Collect most common reasons
  const reasonCounts = new Map<string, number>()
  for (const s of scored) {
    for (const reason of s.score.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
    }
  }
  const topReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason]) => reason)

  return {
    total: scored.length,
    keep: keep.length,
    summarize: summarize.length,
    drop: drop.length,
    avgScore: Math.round(avgScore * 100) / 100,
    topReasons,
  }
}

// ── Scoring Logic ──────────────────────────────────────────────────

function scoreSingleMessage(
  message: Message,
  index: number,
  totalMessages: number,
  taskKeywords: Set<string>,
  openFileSet: Set<string>,
): RelevanceScore {
  const reasons: string[] = []
  let score = 0.5 // Start at neutral

  // 1. Recency decay (exponential)
  const messagesFromEnd = totalMessages - index - 1
  const halfLife = getMessageType(message) === 'tool_result' ? TOOL_RESULT_HALF_LIFE : RECENCY_HALF_LIFE
  const recencyScore = Math.pow(0.5, messagesFromEnd / halfLife)
  score = score * 0.6 + recencyScore * 0.4

  if (messagesFromEnd < 5) {
    reasons.push('Very recent message')
  } else if (messagesFromEnd > 50) {
    reasons.push('Old message')
  }

  // 2. Role weighting
  const role = getMessageType(message)
  const roleWeight = ROLE_WEIGHTS[role] ?? 0.5
  score *= roleWeight

  if (role === 'user') {
    reasons.push('User message (high priority)')
  }

  // 3. Task keyword overlap
  const messageText = extractMessageText(message)
  const messageKeywords = extractKeywords(messageText)
  const overlap = [...taskKeywords].filter(k => messageKeywords.has(k)).length
  const overlapRatio = taskKeywords.size > 0 ? overlap / taskKeywords.size : 0

  if (overlapRatio > 0.3) {
    score += 0.2
    reasons.push(`Shares ${overlap} task keywords`)
  }

  // 4. File reference matching
  const fileRefs = extractFileReferences(messageText)
  const matchingFiles = [...fileRefs].filter(f => openFileSet.has(f.toLowerCase()))
  if (matchingFiles.length > 0) {
    score += 0.15
    reasons.push(`References ${matchingFiles.length} open file(s)`)
  }

  // 5. Penalize very long tool results (likely bloat)
  if (role === 'tool_result' && messageText.length > 5000) {
    score -= 0.1
    reasons.push('Large tool result')
  }

  // Clamp to [0, 1]
  score = Math.max(0, Math.min(1, score))

  // Assign tier
  const tier: RelevanceScore['tier'] =
    score >= KEEP_THRESHOLD ? 'keep' :
    score >= SUMMARIZE_THRESHOLD ? 'summarize' : 'drop'

  return {
    messageId: getMessageId(message),
    score: Math.round(score * 100) / 100,
    reasons,
    tier,
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function getMessageType(message: Message): string {
  // Message type from Anthropic SDK has a 'type' field
  return (message as any)?.type ?? 'unknown'
}

function getMessageId(message: Message): string {
  return (message as any)?.message?.id ?? (message as any)?.uuid ?? `msg_${Math.random().toString(36).slice(2)}`
}

function extractMessageText(message: Message): string {
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

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up',
    'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
    'our', 'you', 'your', 'he', 'she', 'they', 'them', 'his', 'her', 'their',
    'what', 'which', 'who', 'whom',
  ])

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )
}

function extractFileReferences(text: string): Set<string> {
  const refs = new Set<string>()
  // Match common file path patterns
  const patterns = [
    /[\w./-]+\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|c|cpp|h|hpp|json|yaml|yml|toml|md|txt|sh|bash|zsh|fish|ps1|bat|cmd)/gi,
    /(?:src|lib|test|tests|spec|specs|app|bin|cmd|pkg|internal|pkg|config|configs|utils|helpers|services|components|pages|routes|controllers|models|middleware)/gi,
  ]
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const m of matches) refs.add(m)
    }
  }
  return refs
}
