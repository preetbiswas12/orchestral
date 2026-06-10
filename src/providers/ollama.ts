/**
 * Ollama Provider Implementation
 *
 * Integration with local Ollama server for running models locally.
 * Supports custom server URLs for remote Ollama instances.
 */

import { BaseProvider } from './base.js'
import { OLLAMA_MODELS } from './capabilities.js'
import type {
  CompletionRequest,
  CompletionResponse,
  ContentBlock,
  ModelInfo,
  ProviderConfig,
  StreamEvent,
  TextContent,
  ToolUseContent,
} from './types.js'

export class OllamaProvider extends BaseProvider {
  readonly id = 'ollama' as const
  readonly name = 'Ollama'
  readonly description = 'Run models locally with Ollama (supports remote servers)'

  constructor() {
    super()
    this.models = OLLAMA_MODELS
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config)
    // Try to fetch available models from server
    await this.refreshModels()
  }

  validateApiKey(_apiKey: string): boolean {
    // Ollama doesn't require API key
    return true
  }

  protected addAuthHeader(_headers: Headers, _apiKey: string): void {
    // Ollama doesn't use auth headers
  }

  /**
   * Refresh available models from Ollama server
   */
  async refreshModels(): Promise<void> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/tags`)
      if (response.ok) {
        const data = (await response.json()) as { models?: Array<{ name: string; size: number }> }
        if (data.models) {
          // Merge with known models, adding any new ones
          const knownIds = new Set(this.models.map((m) => m.id))
          for (const model of data.models) {
            if (!knownIds.has(model.name)) {
              this.models.push(this.createModelInfo(model.name))
            }
          }
        }
      }
    } catch {
      // Server might not be running, use default models
    }
  }

  private createModelInfo(modelName: string): ModelInfo {
    return {
      id: modelName,
      name: modelName,
      provider: 'ollama',
      contextWindow: 32_000, // Default, actual varies by model
      maxOutputTokens: 8_000,
      capabilities: {
        tools: true, // Assume tools support, will fail gracefully if not
        vision: modelName.includes('vision') || modelName.includes('llava'),
        extendedThinking: modelName.includes('deepseek') || modelName.includes('qwq'),
        streaming: true,
        structuredOutput: false,
        systemPrompt: true,
        multiTurn: true,
      },
    }
  }

  async testConnection(): Promise<true | string> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/tags`)

      if (response.ok) {
        return true
      }

      return `HTTP ${response.status}`
    } catch (error) {
      return `Connection failed: ${error}. Is Ollama running?`
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const body = this.buildRequestBody(request)

    const response = await fetch(`${this.getBaseUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return this.parseResponse(data)
  }

  async *stream(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const body = this.buildRequestBody({ ...request, stream: true })

    const response = await fetch(`${this.getBaseUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let messageStarted = false
    let currentIndex = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0

    try {
      // Emit message start
      yield {
        type: 'message_start',
        message: { id: crypto.randomUUID(), model: request.model },
      }
      messageStarted = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const event = JSON.parse(line)

            // Handle message content
            if (event.message?.content) {
              if (currentIndex === 0 && !event.done) {
                yield {
                  type: 'content_block_start',
                  index: currentIndex,
                  contentBlock: { type: 'text', text: '' },
                }
              }
              yield {
                type: 'content_block_delta',
                index: currentIndex,
                delta: { type: 'text_delta', text: event.message.content },
              }
            }

            // Handle tool calls
            if (event.message?.tool_calls) {
              for (const tc of event.message.tool_calls) {
                yield {
                  type: 'content_block_start',
                  index: currentIndex,
                  contentBlock: {
                    type: 'tool_use',
                    id: tc.id ?? crypto.randomUUID(),
                    name: tc.function?.name ?? '',
                    input: {},
                  },
                }
                if (tc.function?.arguments) {
                  yield {
                    type: 'content_block_delta',
                    index: currentIndex,
                    delta: {
                      type: 'input_json_delta',
                      partialJson:
                        typeof tc.function.arguments === 'string'
                          ? tc.function.arguments
                          : JSON.stringify(tc.function.arguments),
                    },
                  }
                }
                currentIndex++
              }
            }

            // Track token usage
            if (event.prompt_eval_count) {
              totalInputTokens = event.prompt_eval_count
            }
            if (event.eval_count) {
              totalOutputTokens = event.eval_count
            }

            // Handle completion
            if (event.done) {
              yield { type: 'content_block_stop', index: currentIndex }
              yield {
                type: 'message_delta',
                delta: {
                  stopReason: event.message?.tool_calls ? 'tool_use' : 'end_turn',
                },
                usage: {
                  inputTokens: totalInputTokens,
                  outputTokens: totalOutputTokens,
                },
              }
              yield { type: 'message_stop' }
              return
            }
          } catch {
            // Skip invalid JSON lines
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
      messages,
      stream: request.stream ?? false,
      options: {
        num_predict: request.maxTokens ?? 8192,
      },
    }

    // Add tools if present
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

    const options = body.options as Record<string, unknown>

    if (request.temperature !== undefined) {
      options.temperature = request.temperature
    }

    if (request.topP !== undefined) {
      options.top_p = request.topP
    }

    if (request.stopSequences?.length) {
      options.stop = request.stopSequences
    }

    return body
  }

  private convertMessages(
    request: CompletionRequest,
  ): Array<Record<string, unknown>> {
    const messages: Array<Record<string, unknown>> = []

    // Add system message if present
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
        const images: string[] = []
        const toolCalls: Array<Record<string, unknown>> = []

        for (const block of msg.content) {
          switch (block.type) {
            case 'text':
              textContent += block.text
              break
            case 'image':
              if (block.source.data) {
                images.push(block.source.data)
              }
              break
            case 'tool_use':
              toolCalls.push({
                id: block.id,
                function: {
                  name: block.name,
                  arguments: block.input,
                },
              })
              break
            case 'tool_result':
              // Tool results are separate messages in Ollama
              messages.push({
                role: 'tool',
                content:
                  typeof block.content === 'string'
                    ? block.content
                    : JSON.stringify(block.content),
              })
              break
          }
        }

        if (textContent) {
          converted.content = textContent
        }
        if (images.length) {
          converted.images = images
        }
        if (toolCalls.length) {
          converted.tool_calls = toolCalls
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
    const message = data.message as Record<string, unknown>
    const content: ContentBlock[] = []

    if (message?.content) {
      content.push({ type: 'text', text: message.content as string })
    }

    const toolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined
    if (toolCalls) {
      for (const tc of toolCalls) {
        const fn = tc.function as Record<string, unknown>
        content.push({
          type: 'tool_use',
          id: (tc.id as string) ?? crypto.randomUUID(),
          name: fn.name as string,
          input:
            typeof fn.arguments === 'string'
              ? JSON.parse(fn.arguments)
              : (fn.arguments as Record<string, unknown>) ?? {},
        })
      }
    }

    return {
      id: crypto.randomUUID(),
      model: data.model as string,
      content,
      stopReason: toolCalls ? 'tool_use' : 'end_turn',
      usage: {
        inputTokens: (data.prompt_eval_count as number) ?? 0,
        outputTokens: (data.eval_count as number) ?? 0,
      },
    }
  }
}
