/**
 * Context Health Monitor
 *
 * Tracks context usage over time, predicts when compaction will be needed,
 * and provides real-time health metrics for the status line and dashboard.
 *
 * Metrics tracked:
 * - Token usage rate (tokens/minute)
 * - Context fill percentage over time
 * - Compaction frequency and effectiveness
 * - Largest context consumers (files, tools, messages)
 * - Predicted time until next compaction
 */

// ── Types ──────────────────────────────────────────────────────────

export interface HealthSnapshot {
  timestamp: number
  totalTokens: number
  maxTokens: number
  percentage: number
  messageCount: number
  compactionCount: number
}

export interface ContextHealth {
  /** Current state */
  current: HealthSnapshot
  /** History of snapshots (last N) */
  history: HealthSnapshot[]
  /** Tokens per minute usage rate */
  tokensPerMinute: number
  /** Estimated minutes until compaction needed */
  estimatedMinutesUntilFull: number | null
  /** Number of compactions in this session */
  compactionCount: number
  /** Average tokens saved per compaction */
  avgTokensSavedPerCompaction: number
  /** Health status */
  status: 'healthy' | 'warning' | 'critical'
  /** Trend: is context usage accelerating? */
  trend: 'stable' | 'growing' | 'accelerating'
}

export interface ConsumerBreakdown {
  category: string
  tokens: number
  percentage: number
}

// ── Constants ──────────────────────────────────────────────────────

const MAX_HISTORY = 100
const WARNING_THRESHOLD = 60
const CRITICAL_THRESHOLD = 80
const ACCELERATION_THRESHOLD = 1.5 // 1.5x growth rate = accelerating

// ── Health Monitor Class ──────────────────────────────────────────

export class ContextHealthMonitor {
  private history: HealthSnapshot[] = []
  private compactionCount = 0
  private totalTokensSaved = 0
  private lastSnapshot: HealthSnapshot | null = null

  /**
   * Record a new context usage snapshot.
   */
  recordSnapshot(
    totalTokens: number,
    maxTokens: number,
    messageCount: number,
  ): HealthSnapshot {
    const snapshot: HealthSnapshot = {
      timestamp: Date.now(),
      totalTokens,
      maxTokens,
      percentage: Math.round((totalTokens / maxTokens) * 100),
      messageCount,
      compactionCount: this.compactionCount,
    }

    this.history.push(snapshot)
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY)
    }
    this.lastSnapshot = snapshot
    return snapshot
  }

  /**
   * Record that a compaction occurred.
   */
  recordCompaction(tokensSaved: number): void {
    this.compactionCount++
    this.totalTokensSaved += tokensSaved
  }

  /**
   * Get the current health status.
   */
  getHealth(): ContextHealth {
    const current = this.lastSnapshot ?? {
      timestamp: Date.now(),
      totalTokens: 0,
      maxTokens: 1,
      percentage: 0,
      messageCount: 0,
      compactionCount: 0,
    }

    const tokensPerMinute = this.calculateTokensPerMinute()
    const estimatedMinutes = this.estimateMinutesUntilFull(current, tokensPerMinute)
    const status = this.determineStatus(current.percentage)
    const trend = this.calculateTrend()

    return {
      current,
      history: [...this.history],
      tokensPerMinute,
      estimatedMinutesUntilFull: estimatedMinutes,
      compactionCount: this.compactionCount,
      avgTokensSavedPerCompaction: this.compactionCount > 0
        ? Math.round(this.totalTokensSaved / this.compactionCount)
        : 0,
      status,
      trend,
    }
  }

  /**
   * Get a compact health bar string for the status line.
   */
  getHealthBar(width: number = 20): { bar: string; label: string; color: string } {
    const health = this.getHealth()
    const filled = Math.round((health.current.percentage / 100) * width)
    const empty = width - filled

    const bar = '█'.repeat(filled) + '░'.repeat(empty)

    let color: string
    if (health.status === 'critical') color = 'red'
    else if (health.status === 'warning') color = 'yellow'
    else color = 'green'

    const label = `${health.current.percentage}%`

    return { bar, label, color }
  }

  /**
   * Get a text summary suitable for display.
   */
  getSummary(): string {
    const health = this.getHealth()
    const parts = [
      `Context: ${health.current.percentage}% (${health.current.totalTokens.toLocaleString()}/${health.current.maxTokens.toLocaleString()} tokens)`,
      `Messages: ${health.current.messageCount}`,
    ]

    if (health.tokensPerMinute > 0) {
      parts.push(`Usage rate: ${Math.round(health.tokensPerMinute)} tok/min`)
    }

    if (health.estimatedMinutesUntilFull !== null && health.estimatedMinutesUntilFull > 0) {
      parts.push(`Est. ${Math.round(health.estimatedMinutesUntilFull)} min until full`)
    }

    if (health.compactionCount > 0) {
      parts.push(`Compactions: ${health.compactionCount} (avg ${health.avgTokensSavedPerCompaction.toLocaleString()} tok saved)`)
    }

    parts.push(`Trend: ${health.trend}`)

    return parts.join(' | ')
  }

  /**
   * Reset all tracking data.
   */
  reset(): void {
    this.history = []
    this.compactionCount = 0
    this.totalTokensSaved = 0
    this.lastSnapshot = null
  }

  // ── Private ──────────────────────────────────────────────────────

  private calculateTokensPerMinute(): number {
    if (this.history.length < 2) return 0

    const recent = this.history.slice(-10)
    if (recent.length < 2) return 0

    const oldest = recent[0]
    const newest = recent[recent.length - 1]
    const timeDiffMs = newest.timestamp - oldest.timestamp
    const timeDiffMinutes = timeDiffMs / (1000 * 60)

    if (timeDiffMinutes < 0.1) return 0

    const tokenDiff = newest.totalTokens - oldest.totalTokens
    return Math.max(0, tokenDiff / timeDiffMinutes)
  }

  private estimateMinutesUntilFull(
    current: HealthSnapshot,
    tokensPerMinute: number,
  ): number | null {
    if (tokensPerMinute <= 0) return null

    const remainingTokens = current.maxTokens - current.totalTokens
    if (remainingTokens <= 0) return 0

    return remainingTokens / tokensPerMinute
  }

  private determineStatus(percentage: number): ContextHealth['status'] {
    if (percentage >= CRITICAL_THRESHOLD) return 'critical'
    if (percentage >= WARNING_THRESHOLD) return 'warning'
    return 'healthy'
  }

  private calculateTrend(): ContextHealth['trend'] {
    if (this.history.length < 5) return 'stable'

    const recent = this.history.slice(-10)
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))

    const firstAvg = firstHalf.reduce((s, h) => s + h.percentage, 0) / Math.max(firstHalf.length, 1)
    const secondAvg = secondHalf.reduce((s, h) => s + h.percentage, 0) / Math.max(secondHalf.length, 1)

    const growthRate = firstAvg > 0 ? secondAvg / firstAvg : 1

    if (growthRate > ACCELERATION_THRESHOLD) return 'accelerating'
    if (growthRate > 1.1) return 'growing'
    return 'stable'
  }
}

// ── Singleton ──────────────────────────────────────────────────────

/** Global health monitor instance for the current session. */
export const healthMonitor = new ContextHealthMonitor()
