/**
 * Provider Adapter - Bridge between multi-provider system and existing Claude API client
 * 
 * This adapter intercepts API calls to the Anthropic SDK and redirects them to
 * the configured provider (Anthropic, OpenRouter, OpenAI, Gemini, or Ollama).
 */

import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
  BetaToolUnion,
  BetaUsage,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { getActiveProvider, isProviderSystemInitialized } from './registry.js'
import type {
  UnifiedMessage,
  ContentBlock as UnifiedContentBlock,
  StreamEvent,
  ProviderCapabilities,
} from './types.js'

/**
 * Convert Anthropic API params to unified provider format
 */
export function convertToUnifiedMessage(
  params: BetaMessageParam,
): UnifiedMessage {
  const content: UnifiedContentBlock[] = []

  if (typeof params.content === 'string') {
    content.push({ type: 'text', text: params.content })
  } else if (Array.isArray(params.content)) {
    for (const block of params.content) {
      if ('type' in block) {
        switch (block.type) {
          case 'text':
            content.push({ type: 'text', text: block.text })
            break
          case 'image':
            content.push({
              type: 'image',
              source: block.source as any,
            })
            break
          case 'tool_use':
            content.push({
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: block.input,
            })
            break
          case 'tool_result':
            content.push({
              type: 'tool_result',
              tool_use_id: block.tool_use_id,
              content: typeof block.content === 'string' 
                ? block.content 
                : JSON.stringify(block.content),
            })
            break
          case 'document':
            // Documents are provider-specific, convert to text for now
            content.push({
              type: 'text',
              text: `[Document: ${(block as any).source?.type || 'unknown'}]`,
            })
            break
        }
      }
    }
  }

  return {
    role: params.role as 'user' | 'assistant',
    content,
  }
}

/**
 * Convert unified content block to Anthropic API format
 */
export function convertFromUnifiedContentBlock(
  block: UnifiedContentBlock,
): BetaContentBlock {
  switch (block.type) {
    case 'text':
      return {
        type: 'text',
        text: block.text,
      } as BetaContentBlock

    case 'image':
      return {
        type: 'image',
        source: block.source as any,
      } as BetaContentBlock

    case 'tool_use':
      return {
        type: 'tool_use',
        id: block.id!,
        name: block.name!,
        input: block.input!,
      } as BetaContentBlock

    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: block.tool_use_id!,
        content: block.content,
      } as BetaContentBlock

    case 'thinking':
      return {
        type: 'thinking',
        thinking: block.thinking || '',
        signature: block.signature,
      } as BetaContentBlock

    default:
      // Fallback for unknown types
      return {
        type: 'text',
        text: JSON.stringify(block),
      } as BetaContentBlock
  }
}

/**
 * Convert provider stream event to Anthropic stream event format
 */
export function convertStreamEventToAnthropicFormat(
  event: StreamEvent,
  currentIndex: number,
): BetaRawMessageStreamEvent | null {
  switch (event.type) {
    case 'message_start':
      return {
        type: 'message_start',
        message: {
          id: event.message?.id || `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: [],
          model: event.message?.model || '',
          stop_reason: null,
          stop_sequence: null,
          usage: event.message?.usage || { input_tokens: 0, output_tokens: 0 },
        } as BetaMessage,
      }

    case 'content_block_start':
      return {
        type: 'content_block_start',
        index: event.index ?? currentIndex,
        content_block: convertFromUnifiedContentBlock(
          event.content_block!,
        ) as any,
      }

    case 'content_block_delta':
      if (event.delta?.type === 'text_delta') {
        return {
          type: 'content_block_delta',
          index: event.index ?? currentIndex,
          delta: {
            type: 'text_delta',
            text: event.delta.text || '',
          },
        }
      }
      if (event.delta?.type === 'input_json_delta') {
        return {
          type: 'content_block_delta',
          index: event.index ?? currentIndex,
          delta: {
            type: 'input_json_delta',
            partial_json: event.delta.partial_json || '',
          },
        }
      }
      return null

    case 'content_block_stop':
      return {
        type: 'content_block_stop',
        index: event.index ?? currentIndex,
      }

    case 'message_delta':
      return {
        type: 'message_delta',
        delta: {
          stop_reason: event.delta?.stop_reason || null,
          stop_sequence: event.delta?.stop_sequence || null,
        },
        usage: event.usage
          ? { output_tokens: event.usage.output_tokens || 0 }
          : { output_tokens: 0 },
      }

    case 'message_stop':
      // Anthropic doesn't have message_stop, just return null
      return null

    case 'error':
      // Errors are handled separately
      return null

    default:
      return null
  }
}

/**
 * Wrapper for streaming API calls - converts to provider format and back
 */
export async function* createProviderStream(
  params: BetaMessageStreamParams & { stream: true },
  signal?: AbortSignal,
): AsyncGenerator<BetaRawMessageStreamEvent, void, unknown> {
  if (!isProviderSystemInitialized()) {
    throw new Error('Provider system not initialized')
  }

  const provider = getActiveProvider()
  if (!provider) {
    throw new Error('No active provider configured')
  }

  // Convert messages
  const messages = params.messages.map(convertToUnifiedMessage)

  // Convert system prompt
  const systemPrompt =
    typeof params.system === 'string'
      ? params.system
      : Array.isArray(params.system)
        ? params.system
            .map((block) =>
              typeof block === 'string'
                ? block
                : 'text' in block
                  ? block.text
                  : '',
            )
            .join('\n')
        : undefined

  // Convert tools if supported
  const capabilities = provider.getModelCapabilities()
  const tools = capabilities.supportsTools && params.tools ? params.tools : undefined

  try {
    // Use the provider's configured model instead of the request model
    const providerConfig = provider.getConfig()
    const modelToUse = providerConfig?.defaultModel || params.model
    
    // Stream from provider
    const stream = provider.stream({
      messages,
      model: modelToUse,
      system: systemPrompt,
      tools: tools as any,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      signal,
    })

    let contentBlockIndex = 0

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        contentBlockIndex = event.index ?? contentBlockIndex
      }

      const anthropicEvent = convertStreamEventToAnthropicFormat(
        event,
        contentBlockIndex,
      )

      if (anthropicEvent) {
        yield anthropicEvent
      }

      if (event.type === 'content_block_stop') {
        contentBlockIndex++
      }
    }
  } catch (error) {
    // Wrap provider errors in a format the calling code expects
    throw wrapProviderError(error, provider.id)
  }
}

/**
 * Wrapper for non-streaming API calls
 */
export async function createProviderCompletion(
  params: BetaMessageStreamParams & { stream: false },
  signal?: AbortSignal,
): Promise<BetaMessage> {
  if (!isProviderSystemInitialized()) {
    throw new Error('Provider system not initialized')
  }

  const provider = getActiveProvider()
  if (!provider) {
    throw new Error('No active provider configured')
  }

  // Convert messages
  const messages = params.messages.map(convertToUnifiedMessage)

  // Convert system prompt
  const systemPrompt =
    typeof params.system === 'string'
      ? params.system
      : Array.isArray(params.system)
        ? params.system
            .map((block) =>
              typeof block === 'string'
                ? block
                : 'text' in block
                  ? block.text
                  : '',
            )
            .join('\n')
        : undefined

  // Convert tools if supported
  const capabilities = provider.getModelCapabilities()
  const tools = capabilities.supportsTools && params.tools ? params.tools : undefined

  try {
    // Use the provider's configured model instead of the request model
    const providerConfig = provider.getConfig()
    const modelToUse = providerConfig?.defaultModel || params.model
    
    // Call provider
    const response = await provider.complete({
      messages,
      model: modelToUse,
      system: systemPrompt,
      tools: tools as any,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      signal,
    })

    // Convert response to BetaMessage format
    const content: BetaContentBlock[] = response.content.map(
      convertFromUnifiedContentBlock,
    )

    return {
      id: response.id || `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content,
      model: response.model,
      stop_reason: response.stop_reason || null,
      stop_sequence: null,
      usage: response.usage || { input_tokens: 0, output_tokens: 0 },
    } as BetaMessage
  } catch (error) {
    // Wrap provider errors
    throw wrapProviderError(error, provider.id)
  }
}

/**
 * Wrap provider errors in Anthropic API error format
 */
function wrapProviderError(error: unknown, providerId: string): Error {
  if (error instanceof Error) {
    // Create an error that looks like Anthropic SDK errors
    const wrappedError = new Error(
      `[${providerId}] ${error.message}`,
    )
    wrappedError.name = error.name
    wrappedError.stack = error.stack
    
    // Add provider context
    Object.assign(wrappedError, {
      provider: providerId,
      originalError: error,
    })
    
    return wrappedError
  }
  
  return new Error(`[${providerId}] Unknown error: ${String(error)}`)
}

/**
 * Check if a feature is supported by the current provider
 */
export function isProviderFeatureSupported(feature: keyof ProviderCapabilities): boolean {
  if (!isProviderSystemInitialized()) {
    return true // Default to Anthropic capabilities
  }

  const provider = getActiveProvider()
  if (!provider) {
    return true
  }

  const capabilities = provider.getModelCapabilities()
  return capabilities[feature] || false
}
