/**
 * Multi-Provider System
 *
 * Central export for the multi-provider AI system.
 */

// Types
export * from './types.js'

// Configuration
export {
  configExists,
  getConfigPath,
  loadConfig,
  saveConfig,
  updateProvider,
  setActiveProvider,
  getActiveProviderConfig,
  enableProvider,
  disableProvider,
  getEnabledProviders,
  hasAnyProviderConfigured,
  setDefaultModel,
  setBaseUrl,
  clearConfigCache,
  resetConfig,
  exportConfig,
  importConfig,
} from './config.js'

// Registry
export {
  getProviderRegistry,
  resetProviderRegistry,
  getActiveProvider,
  getProvider,
  registerProvider,
  initializeProviders,
  switchProvider,
  getCurrentModel,
  getAvailableModels,
  supportsCapability,
  createCompletion,
  createStreamingCompletion,
  testProviderConnection,
  getProviderDisplayInfo,
  getAllProvidersInfo,
} from './registry.js'

// Capabilities
export {
  ANTHROPIC_MODELS,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
  GEMINI_MODELS,
  OLLAMA_MODELS,
  ALL_MODELS,
  getModelsForProvider,
  getDefaultModel,
  getModelById,
  modelSupportsCapability,
} from './capabilities.js'

// Bridge (compatibility layer)
export {
  isMultiProviderEnabled,
  getActiveProviderId,
  isUsingAnthropicProvider,
  isUsingThirdPartyProvider,
  getProviderApiKey,
  getProviderBaseUrl,
  getProviderModel,
  isFeatureSupported,
  refreshProviderConfig,
} from './bridge.js'

// Adapter (message/stream conversion)
export {
  convertToUnifiedMessage,
  convertFromUnifiedContentBlock,
  convertStreamEventToAnthropicFormat,
  createProviderStream,
  createProviderCompletion,
  isProviderFeatureSupported,
} from './adapter.js'

// Client wrapper
export {
  wrapAnthropicClient,
  shouldWrapClient,
} from './clientWrapper.js'

// Smart routing
export {
  getBestModelForTask,
  getFallbackChain,
  createCompletionWithFallback,
  createStreamingCompletionWithFallback,
  getRoutingRecommendations,
} from './router.js'

// Cost optimization
export {
  calculateCost,
  recordCost,
  getCostSummary,
  getTodayCost,
  getMonthCost,
  findCheapestModel,
  setBudgetConfig,
  getBudgetConfig,
  getActiveAlerts,
  clearCostLog,
  type CostEntry,
  type CostSummary,
  type BudgetConfig,
} from './costOptimizer.js'

// Provider implementations
export { BaseProvider } from './base.js'
export { AnthropicProvider } from './anthropic.js'
export { OpenAIProvider } from './openai.js'
export { OpenRouterProvider } from './openrouter.js'
export { GeminiProvider } from './gemini.js'
export { OllamaProvider } from './ollama.js'
export { MistralProvider } from './mistral.js'
export { GroqProvider } from './groq.js'
export { DeepSeekProvider } from './deepseek.js'
export { PerplexityProvider } from './perplexity.js'
export { CohereProvider } from './cohere.js'
export { XaiProvider } from './xai.js'

// ============================================================================
// Initialization Helper
// ============================================================================

import { loadConfig, hasAnyProviderConfigured } from './config.js'
import { getProviderRegistry, registerProvider } from './registry.js'
import { AnthropicProvider } from './anthropic.js'
import { OpenAIProvider } from './openai.js'
import { OpenRouterProvider } from './openrouter.js'
import { GeminiProvider } from './gemini.js'
import { OllamaProvider } from './ollama.js'
import { MistralProvider } from './mistral.js'
import { GroqProvider } from './groq.js'
import { DeepSeekProvider } from './deepseek.js'
import { PerplexityProvider } from './perplexity.js'
import { CohereProvider } from './cohere.js'
import { XaiProvider } from './xai.js'

let initialized = false

/**
 * Initialize the multi-provider system
 * Call this at app startup
 */
export async function initializeMultiProvider(): Promise<{
  needsSetup: boolean
  activeProvider: string | null
}> {
  if (initialized) {
    const registry = getProviderRegistry()
    return {
      needsSetup: !hasAnyProviderConfigured(),
      activeProvider: registry.getActiveId(),
    }
  }

  // Register all providers
  const registry = getProviderRegistry()
  registry.register(new AnthropicProvider())
  registry.register(new OpenRouterProvider())
  registry.register(new OpenAIProvider())
  registry.register(new GeminiProvider())
  registry.register(new OllamaProvider())
  registry.register(new MistralProvider())
  registry.register(new GroqProvider())
  registry.register(new DeepSeekProvider())
  registry.register(new PerplexityProvider())
  registry.register(new CohereProvider())
  registry.register(new XaiProvider())

  // Load config and initialize
  const config = loadConfig()
  await registry.initializeFromConfig(config)

  initialized = true

  return {
    needsSetup: !hasAnyProviderConfigured(),
    activeProvider: registry.getActiveId(),
  }
}

/**
 * Check if provider system needs setup (first run)
 */
export function needsProviderSetup(): boolean {
  return !hasAnyProviderConfigured()
}
