/**
 * Provider Configuration Manager
 *
 * Handles loading, saving, and managing the providers.json configuration file
 * stored at ~/.claude/providers.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import {
  DEFAULT_BASE_URLS,
  DEFAULT_MODELS,
  type ProviderId,
  type ProviderConfig,
  type ProvidersConfig,
} from './types.js'

// ============================================================================
// Constants
// ============================================================================

const CLAUDE_DIR = join(homedir(), '.claude')
const CONFIG_FILE = join(CLAUDE_DIR, 'providers.json')

// ============================================================================
// Default Configuration
// ============================================================================

function createDefaultProviderConfig(providerId: ProviderId): ProviderConfig {
  return {
    enabled: false,
    apiKey: null,
    defaultModel: DEFAULT_MODELS[providerId],
    baseUrl: DEFAULT_BASE_URLS[providerId],
  }
}

function createDefaultConfig(): ProvidersConfig {
  const config: ProvidersConfig = {
    activeProvider: 'anthropic',
    providers: {
      anthropic: createDefaultProviderConfig('anthropic'),
      openrouter: createDefaultProviderConfig('openrouter'),
      openai: createDefaultProviderConfig('openai'),
      gemini: createDefaultProviderConfig('gemini'),
      ollama: {
        ...createDefaultProviderConfig('ollama'),
        enabled: false,
      },
      mistral: createDefaultProviderConfig('mistral'),
      groq: createDefaultProviderConfig('groq'),
      deepseek: createDefaultProviderConfig('deepseek'),
      perplexity: createDefaultProviderConfig('perplexity'),
      cohere: createDefaultProviderConfig('cohere'),
      xai: createDefaultProviderConfig('xai'),
      bedrock: {
        ...createDefaultProviderConfig('bedrock'),
        baseUrl: '', // Must be configured
      },
      'azure-openai': {
        ...createDefaultProviderConfig('azure-openai'),
        baseUrl: '', // Must be configured with Azure resource URL
      },
    },
  }
  return config
}

// ============================================================================
// Configuration Manager
// ============================================================================

let cachedConfig: ProvidersConfig | null = null

/**
 * Ensure the ~/.claude directory exists
 */
function ensureConfigDir(): void {
  const dir = dirname(CONFIG_FILE)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * Check if providers.json exists
 */
export function configExists(): boolean {
  return existsSync(CONFIG_FILE)
}

/**
 * Get the path to the providers.json file
 */
export function getConfigPath(): string {
  return CONFIG_FILE
}

/**
 * Load provider configuration from disk
 * Creates default config if file doesn't exist
 */
export function loadConfig(forceReload = false): ProvidersConfig {
  if (cachedConfig && !forceReload) {
    return cachedConfig
  }

  ensureConfigDir()

  if (!existsSync(CONFIG_FILE)) {
    const defaultConfig = createDefaultConfig()
    cachedConfig = defaultConfig
    return defaultConfig
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(content) as Partial<ProvidersConfig>

    // Merge with defaults to handle missing fields
    const config = mergeWithDefaults(parsed)
    cachedConfig = config
    return config
  } catch (error) {
    // If config is corrupted, return default
    console.error('Failed to load providers.json, using defaults:', error)
    const defaultConfig = createDefaultConfig()
    cachedConfig = defaultConfig
    return defaultConfig
  }
}

/**
 * Merge partial config with defaults to ensure all fields exist
 */
function mergeWithDefaults(partial: Partial<ProvidersConfig>): ProvidersConfig {
  const defaults = createDefaultConfig()

  const providers = { ...defaults.providers }
  if (partial.providers) {
    for (const [key, value] of Object.entries(partial.providers)) {
      const providerId = key as ProviderId
      if (providers[providerId] && value) {
        providers[providerId] = {
          ...providers[providerId],
          ...value,
        }
      }
    }
  }

  return {
    activeProvider: partial.activeProvider ?? defaults.activeProvider,
    providers,
  }
}

/**
 * Save provider configuration to disk
 */
export function saveConfig(config: ProvidersConfig): void {
  ensureConfigDir()

  try {
    const content = JSON.stringify(config, null, 2)
    writeFileSync(CONFIG_FILE, content, 'utf-8')
    cachedConfig = config
  } catch (error) {
    throw new Error(`Failed to save providers.json: ${error}`)
  }
}

/**
 * Update a specific provider's configuration
 */
export function updateProvider(
  providerId: ProviderId,
  updates: Partial<ProviderConfig>,
): ProvidersConfig {
  const config = loadConfig()

  config.providers[providerId] = {
    ...config.providers[providerId],
    ...updates,
  }

  saveConfig(config)
  return config
}

/**
 * Set the active provider
 */
export function setActiveProvider(providerId: ProviderId): ProvidersConfig {
  const config = loadConfig()

  // Verify the provider is enabled
  if (!config.providers[providerId].enabled) {
    throw new Error(
      `Cannot set ${providerId} as active provider: it is not enabled`,
    )
  }

  config.activeProvider = providerId
  saveConfig(config)
  return config
}

/**
 * Get the currently active provider configuration
 */
export function getActiveProviderConfig(): {
  id: ProviderId
  config: ProviderConfig
} {
  const config = loadConfig()
  return {
    id: config.activeProvider,
    config: config.providers[config.activeProvider],
  }
}

/**
 * Enable a provider with API key
 */
export function enableProvider(
  providerId: ProviderId,
  apiKey: string | null,
  options?: {
    defaultModel?: string
    baseUrl?: string
    setAsActive?: boolean
  },
): ProvidersConfig {
  const config = loadConfig()

  config.providers[providerId] = {
    ...config.providers[providerId],
    enabled: true,
    apiKey,
    ...(options?.defaultModel && { defaultModel: options.defaultModel }),
    ...(options?.baseUrl && { baseUrl: options.baseUrl }),
  }

  if (options?.setAsActive) {
    config.activeProvider = providerId
  }

  saveConfig(config)
  return config
}

/**
 * Disable a provider
 */
export function disableProvider(providerId: ProviderId): ProvidersConfig {
  const config = loadConfig()

  config.providers[providerId].enabled = false

  // If this was the active provider, switch to another enabled one
  if (config.activeProvider === providerId) {
    const enabledProvider = Object.entries(config.providers).find(
      ([id, cfg]) => id !== providerId && cfg.enabled,
    )
    if (enabledProvider) {
      config.activeProvider = enabledProvider[0] as ProviderId
    }
  }

  saveConfig(config)
  return config
}

/**
 * Get list of enabled providers
 */
export function getEnabledProviders(): ProviderId[] {
  const config = loadConfig()
  return Object.entries(config.providers)
    .filter(([_, cfg]) => cfg.enabled)
    .map(([id]) => id as ProviderId)
}

/**
 * Check if any provider is configured
 */
export function hasAnyProviderConfigured(): boolean {
  const config = loadConfig()
  return Object.values(config.providers).some((p) => p.enabled)
}

/**
 * Update the default model for a provider
 */
export function setDefaultModel(
  providerId: ProviderId,
  modelId: string,
): ProvidersConfig {
  return updateProvider(providerId, { defaultModel: modelId })
}

/**
 * Update the base URL for a provider (useful for Ollama remote servers)
 */
export function setBaseUrl(
  providerId: ProviderId,
  baseUrl: string,
): ProvidersConfig {
  return updateProvider(providerId, { baseUrl })
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): ProvidersConfig {
  const defaultConfig = createDefaultConfig()
  saveConfig(defaultConfig)
  return defaultConfig
}

/**
 * Export current config (for backup/migration)
 */
export function exportConfig(): string {
  const config = loadConfig()
  return JSON.stringify(config, null, 2)
}

/**
 * Import config from string (for backup/migration)
 */
export function importConfig(configJson: string): ProvidersConfig {
  try {
    const parsed = JSON.parse(configJson) as Partial<ProvidersConfig>
    const config = mergeWithDefaults(parsed)
    saveConfig(config)
    return config
  } catch (error) {
    throw new Error(`Failed to import config: ${error}`)
  }
}
