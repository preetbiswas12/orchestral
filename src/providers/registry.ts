/**
 * Provider Registry
 *
 * Central registry for managing AI providers. Handles registration,
 * initialization, and switching between providers.
 */

import {
  getActiveProviderConfig,
  loadConfig,
  setActiveProvider as setActiveProviderConfig,
  type ProvidersConfig,
} from './config.js'
import type {
  Provider,
  ProviderId,
  ProviderRegistry as IProviderRegistry,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamEvent,
  ModelCapabilities,
} from './types.js'

// ============================================================================
// Provider Registry Implementation
// ============================================================================

class ProviderRegistryImpl implements IProviderRegistry {
  private providers = new Map<ProviderId, Provider>()
  private activeProviderId: ProviderId | null = null
  private initialized = false

  /**
   * Register a provider
   */
  register(provider: Provider): void {
    this.providers.set(provider.id, provider)
  }

  /**
   * Get a provider by ID
   */
  get(id: ProviderId): Provider | undefined {
    return this.providers.get(id)
  }

  /**
   * Get all registered providers
   */
  getAll(): Provider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get the currently active provider
   */
  getActive(): Provider | undefined {
    if (!this.activeProviderId) {
      return undefined
    }
    return this.providers.get(this.activeProviderId)
  }

  /**
   * Get the active provider ID
   */
  getActiveId(): ProviderId | null {
    return this.activeProviderId
  }

  /**
   * Set the active provider
   */
  async setActive(id: ProviderId): Promise<void> {
    const provider = this.providers.get(id)
    if (!provider) {
      throw new Error(`Provider ${id} is not registered`)
    }

    const config = provider.getConfig()
    if (!config?.enabled) {
      throw new Error(`Provider ${id} is not enabled`)
    }

    // Update config file
    setActiveProviderConfig(id)
    this.activeProviderId = id
  }

  /**
   * Initialize all providers from config
   */
  async initializeFromConfig(config?: ProvidersConfig): Promise<void> {
    const cfg = config ?? loadConfig()

    // Initialize each enabled provider
    for (const [id, providerConfig] of Object.entries(cfg.providers)) {
      const providerId = id as ProviderId
      const provider = this.providers.get(providerId)

      if (provider && providerConfig.enabled) {
        try {
          await provider.initialize(providerConfig)
        } catch (error) {
          console.error(`Failed to initialize provider ${providerId}:`, error)
        }
      }
    }

    // Set active provider
    this.activeProviderId = cfg.activeProvider
    this.initialized = true
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get all enabled providers
   */
  getEnabled(): Provider[] {
    return this.getAll().filter((p) => p.getConfig()?.enabled)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: ProviderRegistryImpl | null = null

/**
 * Get the provider registry singleton
 */
export function getProviderRegistry(): ProviderRegistryImpl {
  if (!registryInstance) {
    registryInstance = new ProviderRegistryImpl()
  }
  return registryInstance
}

/**
 * Reset registry (useful for testing)
 */
export function resetProviderRegistry(): void {
  registryInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the currently active provider
 */
export function getActiveProvider(): Provider | undefined {
  return getProviderRegistry().getActive()
}

/**
 * Get a provider by ID
 */
export function getProvider(id: ProviderId): Provider | undefined {
  return getProviderRegistry().get(id)
}

/**
 * Register a provider
 */
export function registerProvider(provider: Provider): void {
  getProviderRegistry().register(provider)
}

/**
 * Initialize providers from config
 */
export async function initializeProviders(
  config?: ProvidersConfig,
): Promise<void> {
  await getProviderRegistry().initializeFromConfig(config)
}

/**
 * Switch to a different provider
 */
export async function switchProvider(id: ProviderId): Promise<void> {
  await getProviderRegistry().setActive(id)
}

/**
 * Get the current model for the active provider
 */
export function getCurrentModel(): ModelInfo | undefined {
  const provider = getActiveProvider()
  if (!provider) return undefined

  const config = provider.getConfig()
  if (!config) return undefined

  return provider.getModel(config.defaultModel)
}

/**
 * Get all available models for the active provider
 */
export function getAvailableModels(): ModelInfo[] {
  const provider = getActiveProvider()
  if (!provider) return []
  return provider.getAvailableModels()
}

/**
 * Check if a capability is supported by the current provider/model
 */
export function supportsCapability(
  capability: keyof ModelCapabilities,
  modelId?: string,
): boolean {
  const provider = getActiveProvider()
  if (!provider) return false
  return provider.supportsCapability(capability, modelId)
}

// ============================================================================
// High-level API (used by the rest of the app)
// ============================================================================

/**
 * Create a completion using the active provider
 */
export async function createCompletion(
  request: CompletionRequest,
): Promise<CompletionResponse> {
  const provider = getActiveProvider()
  if (!provider) {
    throw new Error('No active provider configured')
  }
  return provider.complete(request)
}

/**
 * Create a streaming completion using the active provider
 */
export async function* createStreamingCompletion(
  request: CompletionRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, unknown> {
  const provider = getActiveProvider()
  if (!provider) {
    throw new Error('No active provider configured')
  }
  yield* provider.stream(request, signal)
}

/**
 * Test connection to a specific provider
 */
export async function testProviderConnection(
  id: ProviderId,
): Promise<true | string> {
  const provider = getProviderRegistry().get(id)
  if (!provider) {
    return `Provider ${id} is not registered`
  }

  const config = provider.getConfig()
  if (!config?.enabled) {
    return `Provider ${id} is not enabled`
  }

  return provider.testConnection()
}

/**
 * Get provider display info for UI
 */
export function getProviderDisplayInfo(
  id: ProviderId,
): { name: string; description: string; enabled: boolean } | undefined {
  const provider = getProviderRegistry().get(id)
  if (!provider) return undefined

  const config = provider.getConfig()
  return {
    name: provider.name,
    description: provider.description,
    enabled: config?.enabled ?? false,
  }
}

/**
 * Get all providers with their display info
 */
export function getAllProvidersInfo(): Array<{
  id: ProviderId
  name: string
  description: string
  enabled: boolean
  isActive: boolean
}> {
  const registry = getProviderRegistry()
  const activeId = registry.getActiveId()

  return registry.getAll().map((provider) => {
    const config = provider.getConfig()
    return {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      enabled: config?.enabled ?? false,
      isActive: provider.id === activeId,
    }
  })
}

/**
 * Check if the provider system has been initialized
 */
export function isProviderSystemInitialized(): boolean {
  return getProviderRegistry().isInitialized()
}
