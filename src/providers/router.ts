/**
 * Smart Model Router
 *
 * Intelligent model routing with fallback chains, cost optimization,
 * and task-based model selection across all configured providers.
 */

import { getProviderRegistry, getActiveProvider } from './registry.js'
import { getModelById, ALL_MODELS } from './capabilities.js'
import type {
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  ModelTask,
  ProviderId,
  StreamEvent,
} from './types.js'

// ============================================================================
// Task-to-Model Mapping
// ============================================================================

interface ModelScore {
  providerId: ProviderId
  modelId: string
  model: ModelInfo
  score: number
  reason: string
}

/**
 * Score models for a given task type
 */
function scoreModelsForTask(
  task: ModelTask,
  preferredProvider?: ProviderId,
): ModelScore[] {
  const registry = getProviderRegistry()
  const enabledProviders = registry.getEnabled()
  const scores: ModelScore[] = []

  for (const provider of enabledProviders) {
    const config = provider.getConfig()
    if (!config?.enabled) continue

    const providerId = provider.id
    const models = ALL_MODELS[providerId] ?? []

    for (const model of models) {
      let score = 0
      let reason = ''

      switch (task) {
        case 'quick':
          // Prefer fast, cheap models
          score = calculateQuickScore(model, providerId === preferredProvider)
          reason = 'Fast & cost-effective'
          break

        case 'coding':
          // Prefer models with strong coding capabilities
          score = calculateCodingScore(model, providerId === preferredProvider)
          reason = 'Strong coding capabilities'
          break

        case 'reasoning':
          // Prefer models with extended thinking
          score = calculateReasoningScore(model, providerId === preferredProvider)
          reason = 'Advanced reasoning'
          break

        case 'vision':
          // Must support vision
          if (!model.capabilities.vision) continue
          score = calculateVisionScore(model, providerId === preferredProvider)
          reason = 'Vision support'
          break

        case 'long-context':
          // Prefer large context windows
          score = calculateLongContextScore(model, providerId === preferredProvider)
          reason = 'Large context window'
          break

        case 'creative':
          // Prefer models with higher temperature range
          score = calculateCreativeScore(model, providerId === preferredProvider)
          reason = 'Creative capabilities'
          break
      }

      // Boost score for preferred provider
      if (providerId === preferredProvider) {
        score += 20
        reason += ' (preferred provider)'
      }

      // Penalize expensive models slightly
      const costPenalty = (model.meta?.inputCostPerMTok ?? 0) * 2
      score -= costPenalty

      scores.push({ providerId, modelId: model.id, model, score, reason })
    }
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score)
}

function calculateQuickScore(model: ModelInfo, isPreferred: boolean): number {
  let score = 50

  // Smaller models are faster
  if (model.id.includes('mini') || model.id.includes('small') || model.id.includes('lite')) {
    score += 30
  }

  // Cheap models preferred
  if ((model.meta?.inputCostPerMTok ?? 10) < 1) score += 20

  // Streaming support is a must
  if (model.capabilities.streaming) score += 10

  if (isPreferred) score += 15

  return score
}

function calculateCodingScore(model: ModelInfo, isPreferred: boolean): number {
  let score = 50

  // Coding-specific models
  if (model.id.includes('coder') || model.id.includes('codestral') || model.id.includes('code')) {
    score += 40
  }

  // Models known for coding excellence
  if (model.id.includes('gpt-5') || model.id.includes('claude') || model.id.includes('deepseek')) {
    score += 25
  }

  // Tool support is important for coding
  if (model.capabilities.tools) score += 15

  // Large context for codebase understanding
  if (model.contextWindow >= 100_000) score += 10

  if (isPreferred) score += 15

  return score
}

function calculateReasoningScore(model: ModelInfo, isPreferred: boolean): number {
  let score = 50

  // Extended thinking is a huge plus
  if (model.capabilities.extendedThinking) score += 40

  // Reasoning-specific models
  if (model.id.includes('reason') || model.id.includes('r1') || model.id.includes('thinking')) {
    score += 30
  }

  // Large context for complex analysis
  if (model.contextWindow >= 100_000) score += 10

  if (isPreferred) score += 15

  return score
}

function calculateVisionScore(model: ModelInfo, isPreferred: boolean): number {
  let score = 50

  // Vision-specific models
  if (model.id.includes('vision') || model.id.includes('pixtral') || model.id.includes('llava')) {
    score += 30
  }

  // Large context for image-heavy tasks
  if (model.contextWindow >= 100_000) score += 10

  if (isPreferred) score += 15

  return score
}

function calculateLongContextScore(model: ModelInfo, isPreferred: boolean): number {
  let score = 50

  // Score based on context window size
  if (model.contextWindow >= 1_000_000) score += 40
  else if (model.contextWindow >= 200_000) score += 30
  else if (model.contextWindow >= 100_000) score += 20
  else if (model.contextWindow >= 50_000) score += 10

  if (isPreferred) score += 15

  return score
}

function calculateCreativeScore(model: ModelInfo, isPreferred: boolean): number {
  let score = 50

  // Larger models tend to be more creative
  if (model.id.includes('large') || model.id.includes('pro') || model.id.includes('opus')) {
    score += 25
  }

  // Good output token limit
  if (model.maxOutputTokens >= 16_000) score += 15

  if (isPreferred) score += 15

  return score
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the best model for a given task
 */
export function getBestModelForTask(
  task: ModelTask,
  preferredProvider?: ProviderId,
): { providerId: ProviderId; modelId: string; model: ModelInfo; reason: string } | null {
  const scores = scoreModelsForTask(task, preferredProvider)
  if (scores.length === 0) return null

  const best = scores[0]
  return {
    providerId: best.providerId,
    modelId: best.modelId,
    model: best.model,
    reason: best.reason,
  }
}

/**
 * Get a fallback chain for a given model
 * Returns ordered list of alternatives if the primary model fails
 */
export function getFallbackChain(
  primaryProviderId: ProviderId,
  primaryModelId: string,
  task?: ModelTask,
): Array<{ providerId: ProviderId; modelId: string; model: ModelInfo }> {
  const chain: Array<{ providerId: ProviderId; modelId: string; model: ModelInfo }> = []
  const registry = getProviderRegistry()
  const enabledProviders = registry.getEnabled()

  // First: same provider, different model
  const primaryProvider = registry.get(primaryProviderId)
  if (primaryProvider) {
    const config = primaryProvider.getConfig()
    const models = ALL_MODELS[primaryProviderId] ?? []
    for (const model of models) {
      if (model.id !== primaryModelId) {
        chain.push({ providerId: primaryProviderId, modelId: model.id, model })
      }
    }
  }

  // Then: other providers' default models
  for (const provider of enabledProviders) {
    if (provider.id === primaryProviderId) continue
    const config = provider.getConfig()
    if (!config?.enabled) continue

    const models = ALL_MODELS[provider.id] ?? []
    const defaultModel = models.find((m) => m.isDefault) ?? models[0]
    if (defaultModel) {
      chain.push({ providerId: provider.id, modelId: defaultModel.id, model: defaultModel })
    }
  }

  // If task is specified, sort by task relevance
  if (task) {
    const scores = scoreModelsForTask(task, primaryProviderId)
    const scoreMap = new Map(scores.map((s) => [`${s.providerId}:${s.modelId}`, s.score]))

    chain.sort((a, b) => {
      const scoreA = scoreMap.get(`${a.providerId}:${a.modelId}`) ?? 0
      const scoreB = scoreMap.get(`${b.providerId}:${b.modelId}`) ?? 0
      return scoreB - scoreA
    })
  }

  return chain
}

/**
 * Create a completion with automatic fallback
 * Tries the primary model first, then falls back through the chain
 */
export async function createCompletionWithFallback(
  request: CompletionRequest,
  options?: {
    task?: ModelTask
    maxRetries?: number
    onFallback?: (from: string, to: string, error: Error) => void
  },
): Promise<CompletionResponse> {
  const maxRetries = options?.maxRetries ?? 3
  const primaryProvider = getActiveProvider()
  if (!primaryProvider) {
    throw new Error('No active provider configured')
  }

  const errors: Array<{ provider: string; model: string; error: Error }> = []

  // Try primary model first
  try {
    return await primaryProvider.complete(request)
  } catch (error) {
    errors.push({
      provider: primaryProvider.id,
      model: request.model,
      error: error as Error,
    })
    options?.onFallback?.(
      `${primaryProvider.id}/${request.model}`,
      'fallback-chain',
      error as Error,
    )
  }

  // Get fallback chain
  const chain = getFallbackChain(primaryProvider.id, request.model, options?.task)

  for (const fallback of chain.slice(0, maxRetries)) {
    const provider = getProviderRegistry().get(fallback.providerId)
    if (!provider) continue

    try {
      const fallbackRequest = { ...request, model: fallback.modelId }
      return await provider.complete(fallbackRequest)
    } catch (error) {
      errors.push({
        provider: fallback.providerId,
        model: fallback.modelId,
        error: error as Error,
      })
    }
  }

  // All fallbacks exhausted
  const errorSummary = errors.map((e) => `${e.provider}/${e.model}: ${e.error.message}`).join('; ')
  throw new Error(`All providers failed. Errors: ${errorSummary}`)
}

/**
 * Create a streaming completion with fallback
 */
export async function* createStreamingCompletionWithFallback(
  request: CompletionRequest,
  options?: {
    task?: ModelTask
    maxRetries?: number
    signal?: AbortSignal
    onFallback?: (from: string, to: string, error: Error) => void
  },
): AsyncGenerator<StreamEvent, void, unknown> {
  const maxRetries = options?.maxRetries ?? 3
  const primaryProvider = getActiveProvider()
  if (!primaryProvider) {
    throw new Error('No active provider configured')
  }

  // Try primary model first
  try {
    yield* primaryProvider.stream(request, options?.signal)
    return
  } catch (error) {
    options?.onFallback?.(
      `${primaryProvider.id}/${request.model}`,
      'fallback-chain',
      error as Error,
    )
  }

  // Get fallback chain
  const chain = getFallbackChain(primaryProvider.id, request.model, options?.task)

  for (const fallback of chain.slice(0, maxRetries)) {
    const provider = getProviderRegistry().get(fallback.providerId)
    if (!provider) continue

    try {
      const fallbackRequest = { ...request, model: fallback.modelId }
      yield* provider.stream(fallbackRequest, options?.signal)
      return
    } catch {
      // Try next fallback
    }
  }

  throw new Error('All providers failed for streaming')
}

/**
 * Get routing recommendations for the UI
 */
export function getRoutingRecommendations(
  task: ModelTask,
): Array<{ providerId: ProviderId; modelId: string; modelName: string; score: number; reason: string }> {
  const scores = scoreModelsForTask(task)
  return scores.slice(0, 5).map((s) => ({
    providerId: s.providerId,
    modelId: s.modelId,
    modelName: s.model.name,
    score: s.score,
    reason: s.reason,
  }))
}
