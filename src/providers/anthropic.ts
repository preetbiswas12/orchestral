/**
 * Anthropic Provider Implementation
 *
 * Direct integration with Anthropic's Claude API.
 */

import { BaseProvider } from './base.js'
import { ANTHROPIC_MODELS } from './capabilities.js'
import type {
  CompletionRequest,
  CompletionResponse,
  ContentBlock,
  ProviderConfig,
  StreamEvent,
  TextContent,
  ThinkingContent,
  ToolUseContent,
} from './types.js'

export class AnthropicProvider extends BaseProvider {
  readonly id = 'anthropic' as const
  readonly name = 'Anthropic'
  readonly description = 'Direct access to Claude models via Anthropic API'

  constructor() {
    super()
    this.models = ANTHROPIC_MODELS
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config)
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20
  }

  protected addAuthHeader(headers: Headers, apiKey: string): void {
    headers.set('x-api-key', apiKey)
    headers.set('anthropic-version', '2023-06-01')
  }

  async testConnection(): Promise<true | string> {
    try {
      const response = await this.fetchWithAuth(
        `${this.getBaseUrl()}/v1/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config?.defaultModel ?? 'claude-sonnet-4-6',
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
      `${this.getBaseUrl()}/v1/messages`,
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
      `${this.getBaseUrl()}/v1/messages`,
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
            if (data === '[DONE]') return

            try {
              const event = JSON.parse(data)
              const streamEvent = this.parseStreamEvent(event)
              if (streamEvent) yield streamEvent
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
    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 8192,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: this.convertContent(m.content),
      })),
    }

    if (request.systemPrompt) {
      body.system = request.systemPrompt
    }

    if (request.tools?.length) {
      body.tools = request.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }))
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP
    }

    if (request.stopSequences?.length) {
      body.stop_sequences = request.stopSequences
    }

    if (request.stream) {
      body.stream = true
    }

    if (request.extendedThinking) {
      body.thinking = {
        type: 'enabled',
        budget_tokens: request.thinkingBudget ?? 10000,
      }
    }

    return body
  }

  private convertContent(
    content: string | ContentBlock[],
  ): unknown {
    if (typeof content === 'string') {
      return content
    }

    return content.map((block) => {
      switch (block.type) {
        case 'text':
          return { type: 'text', text: block.text }
        case 'image':
          return {
            type: 'image',
            source: block.source,
          }
        case 'tool_use':
          return {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
          }
        case 'tool_result':
          return {
            type: 'tool_result',
            tool_use_id: block.toolUseId,
            content: block.content,
            is_error: block.isError,
          }
        default:
          return block
      }
    })
  }

  private parseResponse(data: Record<string, unknown>): CompletionResponse {
    const content = (data.content as Array<Record<string, unknown>>).map(
      (block): ContentBlock => {
        switch (block.type) {
          case 'text':
            return { type: 'text', text: block.text as string } as TextContent
          case 'tool_use':
            return {
              type: 'tool_use',
              id: block.id as string,
              name: block.name as string,
              input: block.input as Record<string, unknown>,
            } as ToolUseContent
          case 'thinking':
            return {
              type: 'thinking',
              thinking: block.thinking as string,
            } as ThinkingContent
          default:
            return { type: 'text', text: '' } as TextContent
        }
      },
    )

    return {
      id: data.id as string,
      model: data.model as string,
      content,
      stopReason: this.mapStopReason(data.stop_reason as string),
      usage: {
        inputTokens: (data.usage as Record<string, number>)?.input_tokens ?? 0,
        outputTokens: (data.usage as Record<string, number>)?.output_tokens ?? 0,
      },
    }
  }

  private parseStreamEvent(event: Record<string, unknown>): StreamEvent | null {
    switch (event.type) {
      case 'message_start':
        return {
          type: 'message_start',
          message: {
            id: (event.message as Record<string, unknown>)?.id as string,
            model: (event.message as Record<string, unknown>)?.model as string,
          },
        }
      case 'content_block_start':
        return {
          type: 'content_block_start',
          index: event.index as number,
          contentBlock: this.parseContentBlock(
            event.content_block as Record<string, unknown>,
          ),
        }
      case 'content_block_delta':
        return {
          type: 'content_block_delta',
          index: event.index as number,
          delta: this.parseDelta(event.delta as Record<string, unknown>),
        }
      case 'content_block_stop':
        return { type: 'content_block_stop', index: event.index as number }
      case 'message_delta':
        return {
          type: 'message_delta',
          delta: {
            stopReason: this.mapStopReason(
              (event.delta as Record<string, unknown>)?.stop_reason as string,
            ),
          },
          usage: {
            inputTokens: 0,
            outputTokens:
              (event.usage as Record<string, number>)?.output_tokens ?? 0,
          },
        }
      case 'message_stop':
        return { type: 'message_stop' }
      case 'error':
        return {
          type: 'error',
          error: {
            type: (event.error as Record<string, unknown>)?.type as string,
            message: (event.error as Record<string, unknown>)?.message as string,
          },
        }
      default:
        return null
    }
  }

  private parseContentBlock(block: Record<string, unknown>): ContentBlock {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: (block.text as string) ?? '' }
      case 'tool_use':
        return {
          type: 'tool_use',
          id: block.id as string,
          name: block.name as string,
          input: {},
        }
      case 'thinking':
        return { type: 'thinking', thinking: '' }
      default:
        return { type: 'text', text: '' }
    }
  }

  private parseDelta(
    delta: Record<string, unknown>,
  ): StreamEvent extends { type: 'content_block_delta' } ? StreamEvent['delta'] : never {
    switch (delta.type) {
      case 'text_delta':
        return { type: 'text_delta', text: delta.text as string } as any
      case 'input_json_delta':
        return {
          type: 'input_json_delta',
          partialJson: delta.partial_json as string,
        } as any
      case 'thinking_delta':
        return { type: 'thinking_delta', thinking: delta.thinking as string } as any
      default:
        return { type: 'text_delta', text: '' } as any
    }
  }

  private mapStopReason(
    reason: string,
  ): 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' {
    switch (reason) {
      case 'end_turn':
        return 'end_turn'
      case 'max_tokens':
        return 'max_tokens'
      case 'stop_sequence':
        return 'stop_sequence'
      case 'tool_use':
        return 'tool_use'
      default:
        return 'end_turn'
    }
  }
}
