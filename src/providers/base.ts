/**
 * Base Provider Implementation
 *
 * Abstract base class for all provider implementations.
 * Provides common functionality and helper methods.
 */

import type {
  CompletionRequest,
  CompletionResponse,
  ModelCapabilities,
  ModelInfo,
  Provider,
  ProviderConfig,
  ProviderId,
  StreamEvent,
} from './types.js'

export abstract class BaseProvider implements Provider {
  abstract readonly id: ProviderId
  abstract readonly name: string
  abstract readonly description: string

  protected config: ProviderConfig | undefined
  protected models: ModelInfo[] = []

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config
  }

  abstract testConnection(): Promise<true | string>

  getAvailableModels(): ModelInfo[] {
    return this.models
  }

  getModel(modelId: string): ModelInfo | undefined {
    return this.models.find((m) => m.id === modelId)
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>

  abstract stream(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent, void, unknown>

  supportsCapability(
    capability: keyof ModelCapabilities,
    modelId?: string,
  ): boolean {
    const model = modelId ? this.getModel(modelId) : this.getDefaultModel()
    return model?.capabilities[capability] ?? false
  }

  getConfig(): ProviderConfig | undefined {
    return this.config
  }

  abstract validateApiKey(apiKey: string): boolean

  protected getDefaultModel(): ModelInfo | undefined {
    // First try to find the model specified in config.defaultModel
    if (this.config?.defaultModel) {
      const configModel = this.models.find((m) => m.id === this.config?.defaultModel)
      if (configModel) {
        return configModel
      }
    }
    
    // Fallback to the model marked as default
    return this.models.find((m) => m.isDefault) ?? this.models[0]
  }

  protected getApiKey(): string | null {
    return this.config?.apiKey ?? null
  }

  protected getBaseUrl(): string {
    return this.config?.baseUrl ?? ''
  }

  protected async fetchWithAuth(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = new Headers(options.headers)

    // Add auth header if API key is present
    const apiKey = this.getApiKey()
    if (apiKey) {
      this.addAuthHeader(headers, apiKey)
    }

    // Add custom headers from config
    if (this.config?.customHeaders) {
      for (const [key, value] of Object.entries(this.config.customHeaders)) {
        headers.set(key, value)
      }
    }

    return fetch(url, { ...options, headers })
  }

  protected addAuthHeader(headers: Headers, apiKey: string): void {
    headers.set('Authorization', `Bearer ${apiKey}`)
  }

  getModelCapabilities(): ModelCapabilities {
    const currentModel = this.getDefaultModel()
    if (!currentModel) {
      // Return default capabilities if no model is selected
      return {
        tools: false,
        vision: false,
        extendedThinking: false,
        streaming: true,
        structuredOutput: false,
        systemPrompt: true,
        multiTurn: true,
        imageGeneration: false,
      }
    }
    return currentModel.capabilities
  }
}
