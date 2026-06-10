/**
 * Anthropic Client Wrapper
 * 
 * This module wraps the Anthropic SDK client to intercept API calls
 * and redirect them to the multi-provider system when enabled.
 */

import type Anthropic from '@anthropic-ai/sdk'
import type {
  BetaMessage,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { isMultiProviderEnabled } from './bridge.js'
import {
  createProviderCompletion,
  createProviderStream,
} from './adapter.js'

/**
 * Create a wrapped Anthropic client that redirects to providers
 */
export function wrapAnthropicClient(
  originalClient: Anthropic,
): Anthropic {
  // If multi-provider is not enabled, return original client
  if (!isMultiProviderEnabled()) {
    return originalClient
  }

  // Create a proxy that intercepts beta.messages.create calls
  const wrappedClient = new Proxy(originalClient, {
    get(target, prop) {
      if (prop === 'beta') {
        return new Proxy(target.beta, {
          get(betaTarget, betaProp) {
            if (betaProp === 'messages') {
              return new Proxy(betaTarget.messages, {
                get(messagesTarget, messagesProp) {
                  if (messagesProp === 'create') {
                    return createInterceptedMessageCreate(
                      messagesTarget.create.bind(messagesTarget),
                    )
                  }
                  return (messagesTarget as any)[messagesProp]
                },
              })
            }
            return (betaTarget as any)[betaProp]
          },
        })
      }
      return (target as any)[prop]
    },
  })

  return wrappedClient
}

/**
 * Intercept anthropic.beta.messages.create() calls
 */
function createInterceptedMessageCreate(
  originalCreate: Function,
) {
  return function interceptedCreate(
    params: BetaMessageStreamParams & { stream?: boolean },
    options?: {
      signal?: AbortSignal
      headers?: Record<string, string>
      timeout?: number
    },
  ) {
    // Check if multi-provider is enabled
    if (!isMultiProviderEnabled()) {
      return originalCreate(params, options)
    }

    const signal = options?.signal

    // Handle streaming
    if (params.stream === true) {
      const streamGenerator = createProviderStream(
        params as BetaMessageStreamParams & { stream: true },
        signal,
      )

      // Add withResponse() method to match Anthropic SDK API
      return Object.assign(streamGenerator, {
        async withResponse() {
          return {
            data: streamGenerator,
            response: new Response('', {
              status: 200,
              headers: {
                'content-type': 'text/event-stream',
                'x-request-id': `req_${Date.now()}`,
              },
            }),
          }
        },
      })
    }

    // Handle non-streaming
    return createProviderCompletion(
      params as BetaMessageStreamParams & { stream: false },
      signal,
    )
  }
}

/**
 * Check if the client should be wrapped
 * (i.e., if multi-provider system is active)
 */
export function shouldWrapClient(): boolean {
  return isMultiProviderEnabled()
}
