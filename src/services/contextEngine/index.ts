/**
 * Context Engine — Public API
 *
 * Exports all context engine services for use by commands and other services.
 */

export {
  scoreMessages,
  partitionByTier,
  getScoringSummary,
  type RelevanceScore,
  type ScoringContext,
  type ScoredMessage,
} from './scorer.js'

export {
  STRATEGIES,
  createCompactionPlan,
  applyLightCompaction,
  describeStrategy,
  recommendTier,
  type CompactionTier,
  type CompactionStrategy,
  type CompactionPlan,
} from './strategies.js'

export {
  loadIndex,
  saveIndex,
  search,
  shouldIndex,
  getIndexStats,
  type FileEmbedding,
  type SearchResult,
  type SemanticIndex,
} from './semanticSearch.js'

export {
  ContextHealthMonitor,
  healthMonitor,
  type HealthSnapshot,
  type ContextHealth,
  type ConsumerBreakdown,
} from './healthMonitor.js'

export {
  DEFAULT_POLICIES,
  AutoCompactPolicyEvaluator,
  policyEvaluator,
  type PolicyType,
  type PolicyConfig,
  type PolicyEvaluationResult,
} from './autoCompactPolicies.js'
