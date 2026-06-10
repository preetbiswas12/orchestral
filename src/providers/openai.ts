/**
 * OpenAI Provider Implementation
 *
 * Direct integration with OpenAI's API.
 * Also serves as base for OpenRouter (OpenAI-compatible API).
 */

import { BaseProvider } from './base.js'
import { OPENAI_MODELS } from './capabilities.js'
import type {
  CompletionRequest,
  CompletionResponse,
  ContentBlock,
  ProviderConfig,
  StreamEvent,
  TextContent,
  ToolUseContent,
} from './types.js'

export class OpenAIProvider extends BaseProvider {
  readonly id = 'openai' as const
  readonly name = 'OpenAI'
  readonly description = 'Direct access to GPT models via OpenAI API'

  constructor() {
    super()
    this.models = OPENAI_MODELS
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config)
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20
  }

  async testConnection(): Promise<true | string> {
    try {
      const response = await this.fetchWithAuth(
        `${this.getBaseUrl()}/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config?.defaultModel ?? 'gpt-5.3-codex',
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
              
              // First chunk - emit message_start
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

              // Handle content
              if (delta?.content) {
                // Start new content block if needed
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

              // Handle tool calls
              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  const idx = toolCall.index ?? currentIndex
                  
                  if (toolCall.id) {
                    // New tool call starting
                    yield {
                      type: 'content_block_start',
                      index: idx,
                      contentBlock: {
                        type: 'tool_use',
                        id: toolCall.id,
                        name: toolCall.function?.name ?? '',
                        input: {},
                      },
                    }
                  }

                  if (toolCall.function?.arguments) {
                    yield {
                      type: 'content_block_delta',
                      index: idx,
                      delta: {
                        type: 'input_json_delta',
                        partialJson: toolCall.function.arguments,
                      },
                    }
                  }
                }
              }

              // Handle finish
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

  protected buildRequestBody(request: CompletionRequest): Record<string, unknown> {
    const messages = this.convertMessages(request)
    
    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 8192,
      messages,
    }

    if (request.tools?.length) {
      body.tools = request.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }))
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP
    }

    if (request.stopSequences?.length) {
      body.stop = request.stopSequences
    }

    if (request.stream) {
      body.stream = true
    }

    return body
  }

  protected convertMessages(
    request: CompletionRequest,
  ): Array<Record<string, unknown>> {
    const messages: Array<Record<string, unknown>> = []

    // Add system message if present
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }

    // Convert each message
    for (const msg of request.messages) {
      if (msg.role === 'system') {
        messages.push({ role: 'system', content: this.contentToString(msg.content) })
        continue
      }

      const converted: Record<string, unknown> = { role: msg.role }

      if (typeof msg.content === 'string') {
        converted.content = msg.content
      } else {
        // Handle complex content
        const contentParts: Array<Record<string, unknown>> = []
        const toolCalls: Array<Record<string, unknown>> = []
        const toolResults: Array<{ toolCallId: string; content: string }> = []

        for (const block of msg.content) {
          switch (block.type) {
            case 'text':
              contentParts.push({ type: 'text', text: block.text })
              break
            case 'image':
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url:
                    block.source.type === 'url'
                      ? block.source.url
                      : `data:${block.source.mediaType};base64,${block.source.data}`,
                },
              })
              break
            case 'tool_use':
              toolCalls.push({
                id: block.id,
                type: 'function',
                function: {
                  name: block.name,
                  arguments: JSON.stringify(block.input),
                },
              })
              break
            case 'tool_result':
              toolResults.push({
                toolCallId: block.toolUseId,
                content:
                  typeof block.content === 'string'
                    ? block.content
                    : JSON.stringify(block.content),
              })
              break
          }
        }

        if (contentParts.length) {
          converted.content = contentParts
        }
        if (toolCalls.length) {
          converted.tool_calls = toolCalls
        }

        // Tool results need separate messages
        for (const result of toolResults) {
          messages.push({
            role: 'tool',
            tool_call_id: result.toolCallId,
            content: result.content,
          })
        }

        if (toolResults.length && !contentParts.length && !toolCalls.length) {
          continue // Skip this message, tool results were added separately
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

  protected parseResponse(data: Record<string, unknown>): CompletionResponse {
    const choice = (data.choices as Array<Record<string, unknown>>)?.[0]
    const message = choice?.message as Record<string, unknown>

    const content: ContentBlock[] = []

    // Handle text content
    if (message?.content) {
      content.push({ type: 'text', text: message.content as string })
    }

    // Handle tool calls
    const toolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined
    if (toolCalls) {
      for (const tc of toolCalls) {
        const fn = tc.function as Record<string, unknown>
        content.push({
          type: 'tool_use',
          id: tc.id as string,
          name: fn.name as string,
          input: JSON.parse((fn.arguments as string) || '{}'),
        })
      }
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

  protected mapFinishReason(
    reason: string,
  ): 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' {
    switch (reason) {
      case 'stop':
        return 'end_turn'
      case 'length':
        return 'max_tokens'
      case 'tool_calls':
        return 'tool_use'
      default:
        return 'end_turn'
    }
  }
}
