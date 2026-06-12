/**
 * Perplexity Provider Implementation
 *
 * Integration with Perplexity's Sonar models with real-time web search.
 * All models include built-in web search capabilities.
 * API is OpenAI-compatible.
 */

import { BaseProvider } from './base.js'
import { PERPLEXITY_MODELS } from './capabilities.js'
import type {
  CompletionRequest,
  CompletionResponse,
  ContentBlock,
  ProviderConfig,
  StreamEvent,
  TextContent,
} from './types.js'

export class PerplexityProvider extends BaseProvider {
  readonly id = 'perplexity' as const
  readonly name = 'Perplexity'
  readonly description = 'AI-powered search with real-time web access (Sonar models)'

  constructor() {
    super()
    this.models = PERPLEXITY_MODELS
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config)
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('pplx-') && apiKey.length > 20
  }

  async testConnection(): Promise<true | string> {
    try {
      const response = await this.fetchWithAuth(
        `${this.getBaseUrl()}/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config?.defaultModel ?? 'perplexity-sonar-pro',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        },
      )

      if (response.ok) {
        return true
      }

      const error = await response.json().catch(() => ({}))
      return (error as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`
    } catch (error) {
      return `Connection failed: ${error}`
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const body = this.buildRequestBody(request)

    const response = await this.fetchWithAuth(
      `${this.getBaseUrl()}/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        (error as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`,
      )
    }

    const data = await response.json()
    return this.parseResponse(data)
  }

  async *stream(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const body = this.buildRequestBody({ ...request, stream: true })

    const response = await this.fetchWithAuth(
      `${this.getBaseUrl()}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal,
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        (error as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let currentIndex = 0
    let messageId = ''
    let model = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              yield { type: 'message_stop' }
              return
            }

            try {
              const event = JSON.parse(data)

              if (!messageId && event.id) {
                messageId = event.id
                model = event.model
                yield {
                  type: 'message_start',
                  message: { id: messageId, model },
                }
              }

              const choice = event.choices?.[0]
              if (!choice) continue

              const delta = choice.delta

              if (delta?.content) {
                if (currentIndex === 0) {
                  yield {
                    type: 'content_block_start',
                    index: currentIndex,
                    contentBlock: { type: 'text', text: '' },
                  }
                }
                yield {
                  type: 'content_block_delta',
                  index: currentIndex,
                  delta: { type: 'text_delta', text: delta.content },
                }
              }

              if (choice.finish_reason) {
                yield { type: 'content_block_stop', index: currentIndex }
                yield {
                  type: 'message_delta',
                  delta: { stopReason: this.mapFinishReason(choice.finish_reason) },
                  usage: {
                    inputTokens: event.usage?.prompt_tokens ?? 0,
                    outputTokens: event.usage?.completion_tokens ?? 0,
                  },
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private buildRequestBody(request: CompletionRequest): Record<string, unknown> {
    const messages = this.convertMessages(request)

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 8192,
      messages,
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP
    }

    if (request.stream) {
      body.stream = true
    }

    return body
  }

  private convertMessages(
    request: CompletionRequest,
  ): Array<Record<string, unknown>> {
    const messages: Array<Record<string, unknown>> = []

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        messages.push({ role: 'system', content: this.contentToString(msg.content) })
        continue
      }

      const converted: Record<string, unknown> = { role: msg.role }

      if (typeof msg.content === 'string') {
        converted.content = msg.content
      } else {
        let textContent = ''
        for (const block of msg.content) {
          if (block.type === 'text') {
            textContent += block.text
          }
        }
        if (textContent) {
          converted.content = textContent
        }
      }

      messages.push(converted)
    }

    return messages
  }

  private contentToString(content: string | ContentBlock[]): string {
    if (typeof content === 'string') return content
    return content
      .filter((b): b is TextContent => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
  }

  private parseResponse(data: Record<string, unknown>): CompletionResponse {
    const choice = (data.choices as Array<Record<string, unknown>>)?.[0]
    const message = choice?.message as Record<string, unknown>

    const content: ContentBlock[] = []

    if (message?.content) {
      content.push({ type: 'text', text: message.content as string })
    }

    return {
      id: data.id as string,
      model: data.model as string,
      content,
      stopReason: this.mapFinishReason(choice?.finish_reason as string),
      usage: {
        inputTokens: (data.usage as Record<string, number>)?.prompt_tokens ?? 0,
        outputTokens: (data.usage as Record<string, number>)?.completion_tokens ?? 0,
      },
    }
  }

  private mapFinishReason(
    reason: string,
  ): 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' {
    switch (reason) {
      case 'stop':
        return 'end_turn'
      case 'length':
        return 'max_tokens'
      default:
        return 'end_turn'
    }
  }
}
