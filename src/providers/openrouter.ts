/**
 * OpenRouter Provider Implementation
 *
 * Access to 300+ models via OpenRouter's OpenAI-compatible API.
 */

import { OPENROUTER_MODELS } from './capabilities.js'
import { OpenAIProvider } from './openai.js'
import type { ProviderConfig } from './types.js'

export class OpenRouterProvider extends OpenAIProvider {
  readonly id = 'openrouter' as const
  readonly name = 'OpenRouter'
  readonly description = 'Access 300+ models from multiple providers via OpenRouter'

  constructor() {
    super()
    this.models = OPENROUTER_MODELS
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config)
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-or-') && apiKey.length > 20
  }

  protected addAuthHeader(headers: Headers, apiKey: string): void {
    super.addAuthHeader(headers, apiKey)
    // OpenRouter specific headers
    headers.set('HTTP-Referer', 'https://github.com/anthropics/claude-code')
    headers.set('X-Title', 'Claude Code')
  }

  protected buildRequestBody(request: import('./types.js').CompletionRequest): Record<string, unknown> {
    const body = super.buildRequestBody(request)
    
    // OpenRouter specific options
    // Allow fallback to other providers if primary is down
    body.route = 'fallback'
    
    return body
  }
}
