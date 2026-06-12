/**
 * Auto-Compact Policies
 *
 * Configurable trigger policies for automatic compaction.
 * Each policy defines a condition under which compaction should run.
 *
 * Built-in policies:
 * - TokenThreshold: Compact when context reaches N% capacity
 * - TimeBased: Compact every N minutes during active session
 * - TaskBoundary: Compact when user starts a new topic (intent shift)
 * - FileBased: Compact after reading N files in a single turn
 * - ToolBased: Compact after N tool calls without user interaction
 */

// ── Types ──────────────────────────────────────────────────────────

export type PolicyType = 'token_threshold' | 'time_based' | 'task_boundary' | 'file_based' | 'tool_based'

export interface PolicyConfig {
  type: PolicyType
  enabled: boolean
  /** Human-readable label */
  label: string
  /** Description of when this triggers */
  description: string
  /** Policy-specific parameters */
  params: Record<string, number | string | boolean>
}

export interface PolicyEvaluationResult {
  shouldCompact: boolean
  reason: string
  policy: PolicyType
  /** Recommended compaction tier based on urgency */
  recommendedTier: 'light' | 'medium' | 'aggressive'
}

// ── Default Policies ──────────────────────────────────────────────

export const DEFAULT_POLICIES: PolicyConfig[] = [
  {
    type: 'token_threshold',
    enabled: true,
    label: 'Token Threshold',
    description: 'Compact when context reaches a percentage of capacity',
    params: {
      warningPercent: 60,
      criticalPercent: 80,
      emergencyPercent: 90,
    },
  },
  {
    type: 'time_based',
    enabled: false,
    label: 'Time Based',
    description: 'Compact periodically during long sessions',
    params: {
      intervalMinutes: 15,
    },
  },
  {
    type: 'task_boundary',
    enabled: false,
    label: 'Task Boundary',
    description: 'Compact when the user starts a new task or topic',
    params: {
      sensitivity: 0.7, // 0-1, higher = more sensitive to topic changes
    },
  },
  {
    type: 'file_based',
    enabled: false,
    label: 'File Based',
    description: 'Compact after reading many files in a single turn',
    params: {
      fileThreshold: 10,
    },
  },
  {
    type: 'tool_based',
    enabled: false,
    label: 'Tool Based',
    description: 'Compact after many tool calls without user interaction',
    params: {
      toolThreshold: 20,
    },
  },
]

// ── Policy Evaluator ──────────────────────────────────────────────

export class AutoCompactPolicyEvaluator {
  private policies: PolicyConfig[]
  private lastCompactionTime = 0
  private lastUserMessageTime = 0
  private filesReadThisTurn = 0
  private toolsCalledThisTurn = 0

  constructor(policies: PolicyConfig[] = DEFAULT_POLICIES) {
    this.policies = policies
  }

  /**
   * Update policy configurations.
   */
  setPolicies(policies: PolicyConfig[]): void {
    this.policies = policies
  }

  /**
   * Get current policy configurations.
   */
  getPolicies(): PolicyConfig[] {
    return [...this.policies]
  }

  /**
   * Evaluate all enabled policies and return the first that triggers,
   * or null if no policy triggers.
   */
  evaluate(context: {
    currentTokens: number
    maxTokens: number
    messageCount: number
    lastMessageTimestamp: number
  }): PolicyEvaluationResult | null {
    for (const policy of this.policies) {
      if (!policy.enabled) continue

      const result = this.evaluatePolicy(policy, context)
      if (result.shouldCompact) {
        return result
      }
    }
    return null
  }

  /**
   * Record that a compaction occurred.
   */
  recordCompaction(): void {
    this.lastCompactionTime = Date.now()
    this.filesReadThisTurn = 0
    this.toolsCalledThisTurn = 0
  }

  /**
   * Record a user message (for task boundary detection).
   */
  recordUserMessage(): void {
    this.lastUserMessageTime = Date.now()
    this.filesReadThisTurn = 0
    this.toolsCalledThisTurn = 0
  }

  /**
   * Record a file read.
   */
  recordFileRead(): void {
    this.filesReadThisTurn++
  }

  /**
   * Record a tool call.
   */
  recordToolCall(): void {
    this.toolsCalledThisTurn++
  }

  // ── Private ──────────────────────────────────────────────────────

  private evaluatePolicy(
    policy: PolicyConfig,
    context: {
      currentTokens: number
      maxTokens: number
      messageCount: number
      lastMessageTimestamp: number
    },
  ): PolicyEvaluationResult {
    const percentage = Math.round((context.currentTokens / context.maxTokens) * 100)

    switch (policy.type) {
      case 'token_threshold':
        return this.evaluateTokenThreshold(policy, percentage)
      case 'time_based':
        return this.evaluateTimeBased(policy)
      case 'task_boundary':
        return this.evaluateTaskBoundary(policy, context)
      case 'file_based':
        return this.evaluateFileBased(policy)
      case 'tool_based':
        return this.evaluateToolBased(policy)
      default:
        return { shouldCompact: false, reason: '', policy: policy.type, recommendedTier: 'light' }
    }
  }

  private evaluateTokenThreshold(policy: PolicyConfig, percentage: number): PolicyEvaluationResult {
    const emergency = Number(policy.params.emergencyPercent ?? 90)
    const critical = Number(policy.params.criticalPercent ?? 80)
    const warning = Number(policy.params.warningPercent ?? 60)

    if (percentage >= emergency) {
      return {
        shouldCompact: true,
        reason: `Context at ${percentage}% — emergency threshold (${emergency}%) exceeded`,
        policy: 'token_threshold',
        recommendedTier: 'aggressive',
      }
    }
    if (percentage >= critical) {
      return {
        shouldCompact: true,
        reason: `Context at ${percentage}% — critical threshold (${critical}%) exceeded`,
        policy: 'token_threshold',
        recommendedTier: 'medium',
      }
    }
    if (percentage >= warning) {
      return {
        shouldCompact: true,
        reason: `Context at ${percentage}% — warning threshold (${warning}%) exceeded`,
        policy: 'token_threshold',
        recommendedTier: 'light',
      }
    }
    return { shouldCompact: false, reason: '', policy: 'token_threshold', recommendedTier: 'light' }
  }

  private evaluateTimeBased(policy: PolicyConfig): PolicyEvaluationResult {
    const intervalMs = Number(policy.params.intervalMinutes ?? 15) * 60 * 1000
    const elapsed = Date.now() - this.lastCompactionTime

    if (elapsed >= intervalMs) {
      return {
        shouldCompact: true,
        reason: `Time-based compaction: ${Math.round(elapsed / 60000)} min since last compaction`,
        policy: 'time_based',
        recommendedTier: 'light',
      }
    }
    return { shouldCompact: false, reason: '', policy: 'time_based', recommendedTier: 'light' }
  }

  private evaluateTaskBoundary(
    policy: PolicyConfig,
    _context: { lastMessageTimestamp: number },
  ): PolicyEvaluationResult {
    // Task boundary detection: if enough time has passed since last compaction
    // and there's been user activity, it might be a good time to compact
    const timeSinceUser = Date.now() - this.lastUserMessageTime
    const timeSinceCompaction = Date.now() - this.lastCompactionTime

    // If user sent a message > 2 min after last compaction, likely a new task
    if (timeSinceCompaction > 120_000 && timeSinceUser < 30_000) {
      return {
        shouldCompact: true,
        reason: 'Task boundary detected — new user message after quiet period',
        policy: 'task_boundary',
        recommendedTier: 'light',
      }
    }
    return { shouldCompact: false, reason: '', policy: 'task_boundary', recommendedTier: 'light' }
  }

  private evaluateFileBased(policy: PolicyConfig): PolicyEvaluationResult {
    const threshold = Number(policy.params.fileThreshold ?? 10)
    if (this.filesReadThisTurn >= threshold) {
      return {
        shouldCompact: true,
        reason: `File-based compaction: ${this.filesReadThisTurn} files read this turn (threshold: ${threshold})`,
        policy: 'file_based',
        recommendedTier: 'light',
      }
    }
    return { shouldCompact: false, reason: '', policy: 'file_based', recommendedTier: 'light' }
  }

  private evaluateToolBased(policy: PolicyConfig): PolicyEvaluationResult {
    const threshold = Number(policy.params.toolThreshold ?? 20)
    if (this.toolsCalledThisTurn >= threshold) {
      return {
        shouldCompact: true,
        reason: `Tool-based compaction: ${this.toolsCalledThisTurn} tool calls this turn (threshold: ${threshold})`,
        policy: 'tool_based',
        recommendedTier: 'light',
      }
    }
    return { shouldCompact: false, reason: '', policy: 'tool_based', recommendedTier: 'light' }
  }
}

// ── Singleton ──────────────────────────────────────────────────────

export const policyEvaluator = new AutoCompactPolicyEvaluator()
