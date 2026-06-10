/**
 * Bridge between the new multi-provider system and the existing codebase.
 * This module provides compatibility functions that allow the existing
 * Claude Code infrastructure to work with the new provider system.
 */

import { loadConfig, type ProvidersConfig } from './config.js'
import { getActiveProvider, isProviderSystemInitialized } from './registry.js'
import type { ProviderId } from './types.js'

let cachedConfig: ProvidersConfig | null = null

/**
 * Check if the multi-provider system is configured and active.
 * This is used to bypass OAuth when providers.json exists.
 */
export function isMultiProviderEnabled(): boolean {
  try {
    const config = loadConfig()
    cachedConfig = config
    
    // Check if there's an active provider with a valid API key (except Ollama)
    const activeProvider = config.providers[config.activeProvider]
    if (!activeProvider?.enabled) {
      return false
    }
    
    // Ollama doesn't require an API key
    if (config.activeProvider === 'ollama') {
      return true
    }
    
    // Other providers need an API key
    return !!activeProvider.apiKey
  } catch {
    return false
  }
}

/**
 * Get the active provider ID if multi-provider is enabled.
 */
export function getActiveProviderId(): ProviderId | null {
  if (!isMultiProviderEnabled()) {
    return null
  }
  
  const config = cachedConfig ?? loadConfig()
  return config.activeProvider
}

/**
 * Check if the active provider is Anthropic (for backward compatibility).
 */
export function isUsingAnthropicProvider(): boolean {
  return getActiveProviderId() === 'anthropic'
}

/**
 * Check if the active provider is a third-party (non-Anthropic).
 */
export function isUsingThirdPartyProvider(): boolean {
  const provider = getActiveProviderId()
  return provider !== null && provider !== 'anthropic'
}

/**
 * Get the API key for the active provider.
 * This is used to satisfy existing API key checks.
 */
export function getProviderApiKey(): string | null {
  if (!isMultiProviderEnabled()) {
    return null
  }
  
  const config = cachedConfig ?? loadConfig()
  const provider = config.providers[config.activeProvider]
  return provider?.apiKey ?? null
}

/**
 * Get the base URL for the active provider.
 */
export function getProviderBaseUrl(): string | null {
  if (!isMultiProviderEnabled()) {
    return null
  }
  
  const config = cachedConfig ?? loadConfig()
  const provider = config.providers[config.activeProvider]
  return provider?.baseUrl ?? null
}

/**
 * Get the current model for the active provider.
 */
export function getProviderModel(): string | null {
  if (!isMultiProviderEnabled()) {
    return null
  }
  
  const config = cachedConfig ?? loadConfig()
  const provider = config.providers[config.activeProvider]
  return provider?.defaultModel ?? null
}

/**
 * Check if a specific feature is supported by the current provider/model.
 */
export function isFeatureSupported(feature: string): boolean {
  if (!isProviderSystemInitialized()) {
    return true // Default to true for Anthropic
  }
  
  const provider = getActiveProvider()
  if (!provider) {
    return true
  }
  
  const capabilities = provider.getModelCapabilities()
  
  switch (feature) {
    case 'tools':
    case 'function_calling':
      return capabilities.supportsTools
    case 'vision':
    case 'images':
      return capabilities.supportsVision
    case 'extended_thinking':
      return capabilities.supportsExtendedThinking
    case 'streaming':
      return capabilities.supportsStreaming
    default:
      return true
  }
}

/**
 * Refresh the cached config.
 */
export function refreshProviderConfig(): void {
  try {
    cachedConfig = loadConfig()
  } catch {
    cachedConfig = null
  }
}
