/**
 * Google Gemini Provider Implementation
 *
 * Direct integration with Google's Generative AI API.
 */

import { BaseProvider } from './base.js'
import { GEMINI_MODELS } from './capabilities.js'
import type {
  CompletionRequest,
  CompletionResponse,
  ContentBlock,
  ProviderConfig,
  StreamEvent,
  TextContent,
  ToolUseContent,
} from './types.js'

export class GeminiProvider extends BaseProvider {
  readonly id = 'gemini' as const
  readonly name = 'Google Gemini'
  readonly description = 'Direct access to Gemini models via Google AI API'

  constructor() {
    super()
    this.models = GEMINI_MODELS
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config)
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('AIza') && apiKey.length > 20
  }

  protected addAuthHeader(_headers: Headers, _apiKey: string): void {
    // Gemini uses API key in URL, not header
  }

  private getApiUrl(model: string, stream = false): string {
    const method = stream ? 'streamGenerateContent' : 'generateContent'
    return `${this.getBaseUrl()}/models/${model}:${method}?key=${this.getApiKey()}`
  }

  async testConnection(): Promise<true | string> {
    try {
      const model = this.config?.defaultModel ?? 'gemini-2.5-flash'
      const response = await fetch(this.getApiUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      })

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
    const url = this.getApiUrl(request.model)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

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
    const body = this.buildRequestBody(request)
    const url = this.getApiUrl(request.model, true) + '&alt=sse'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    })

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
    let messageStarted = false
    let currentIndex = 0

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

              if (!messageStarted) {
                messageStarted = true
                yield {
                  type: 'message_start',
                  message: { id: crypto.randomUUID(), model: request.model },
                }
              }

              const candidate = event.candidates?.[0]
              if (!candidate) continue

              const content = candidate.content
              if (content?.parts) {
                for (const part of content.parts) {
                  if (part.text) {
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
                      delta: { type: 'text_delta', text: part.text },
                    }
                  }

                  if (part.functionCall) {
                    yield {
                      type: 'content_block_start',
                      index: currentIndex,
                      contentBlock: {
                        type: 'tool_use',
                        id: crypto.randomUUID(),
                        name: part.functionCall.name,
                        input: {},
                      },
                    }
                    yield {
                      type: 'content_block_delta',
                      index: currentIndex,
                      delta: {
                        type: 'input_json_delta',
                        partialJson: JSON.stringify(part.functionCall.args),
                      },
                    }
                  }
                }
              }

              if (candidate.finishReason) {
                yield { type: 'content_block_stop', index: currentIndex }
                yield {
                  type: 'message_delta',
                  delta: { stopReason: this.mapFinishReason(candidate.finishReason) },
                  usage: {
                    inputTokens: event.usageMetadata?.promptTokenCount ?? 0,
                    outputTokens: event.usageMetadata?.candidatesTokenCount ?? 0,
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
    const contents = this.convertMessages(request)

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 8192,
      },
    }

    // Add system instruction if present
    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] }
    }

    // Add tools if present
    if (request.tools?.length) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          })),
        },
      ]
    }

    const genConfig = body.generationConfig as Record<string, unknown>

    if (request.temperature !== undefined) {
      genConfig.temperature = request.temperature
    }

    if (request.topP !== undefined) {
      genConfig.topP = request.topP
    }

    if (request.stopSequences?.length) {
      genConfig.stopSequences = request.stopSequences
    }

    return body
  }

  private convertMessages(
    request: CompletionRequest,
  ): Array<Record<string, unknown>> {
    const contents: Array<Record<string, unknown>> = []

    for (const msg of request.messages) {
      if (msg.role === 'system') continue // Handled separately

      const parts: Array<Record<string, unknown>> = []

      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content })
      } else {
        for (const block of msg.content) {
          switch (block.type) {
            case 'text':
              parts.push({ text: block.text })
              break
            case 'image':
              parts.push({
                inlineData: {
                  mimeType: block.source.mediaType ?? 'image/png',
                  data: block.source.data,
                },
              })
              break
            case 'tool_use':
              parts.push({
                functionCall: {
                  name: block.name,
                  args: block.input,
                },
              })
              break
            case 'tool_result':
              parts.push({
                functionResponse: {
                  name: block.toolUseId, // Gemini uses name here
                  response: {
                    content:
                      typeof block.content === 'string'
                        ? block.content
                        : JSON.stringify(block.content),
                  },
                },
              })
              break
          }
        }
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      })
    }

    return contents
  }

  private parseResponse(data: Record<string, unknown>): CompletionResponse {
    const candidate = (data.candidates as Array<Record<string, unknown>>)?.[0]
    const contentData = candidate?.content as Record<string, unknown>
    const parts = contentData?.parts as Array<Record<string, unknown>> | undefined

    const content: ContentBlock[] = []

    if (parts) {
      for (const part of parts) {
        if (part.text) {
          content.push({ type: 'text', text: part.text as string })
        }
        if (part.functionCall) {
          const fc = part.functionCall as Record<string, unknown>
          content.push({
            type: 'tool_use',
            id: crypto.randomUUID(),
            name: fc.name as string,
            input: (fc.args as Record<string, unknown>) ?? {},
          })
        }
      }
    }

    const usage = data.usageMetadata as Record<string, number> | undefined

    return {
      id: crypto.randomUUID(),
      model: (data.modelVersion as string) ?? 'gemini',
      content,
      stopReason: this.mapFinishReason(candidate?.finishReason as string),
      usage: {
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
      },
    }
  }

  private mapFinishReason(
    reason: string,
  ): 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' {
    switch (reason) {
      case 'STOP':
        return 'end_turn'
      case 'MAX_TOKENS':
        return 'max_tokens'
      case 'SAFETY':
      case 'RECITATION':
        return 'end_turn'
      case 'FUNCTION_CALL':
        return 'tool_use'
      default:
        return 'end_turn'
    }
  }
}
