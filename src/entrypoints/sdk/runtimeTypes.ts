/**
 * SDK Runtime Types - Non-serializable types (callbacks, interfaces)
 * These types are used by SDK builders for runtime functionality
 */

import type { z } from 'zod/v4'
import type { SDKMessage, SDKResultMessage, SDKUserMessage } from './coreTypes.js'

// ============================================================================
// Zod Helper Types
// ============================================================================

export type AnyZodRawShape = Record<string, z.ZodTypeAny>
export type InferShape<T extends AnyZodRawShape> = {
  [K in keyof T]: z.infer<T[K]>
}

// ============================================================================
// MCP Server Types
// ============================================================================

export interface SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> {
  name: string
  description: string
  inputSchema: Schema
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<unknown>
  annotations?: Record<string, unknown>
  searchHint?: string
  alwaysLoad?: boolean
}

export interface McpSdkServerConfigWithInstance {
  type: 'sdk'
  name: string
  instance: unknown
}

// ============================================================================
// Session Types
// ============================================================================

export interface SDKSessionOptions {
  dir?: string
  model?: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

export interface SDKSession {
  id: string
  send(message: string | SDKUserMessage): Promise<SDKResultMessage>
  stream(message: string | SDKUserMessage): AsyncIterable<SDKMessage>
  abort(): void
}

export interface ListSessionsOptions {
  dir?: string
  limit?: number
  offset?: number
}

export interface GetSessionInfoOptions {
  dir?: string
}

export interface GetSessionMessagesOptions {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export interface SessionMutationOptions {
  dir?: string
}

export interface ForkSessionOptions {
  dir?: string
  upToMessageId?: string
  title?: string
}

export interface ForkSessionResult {
  sessionId: string
}

export interface SessionMessage {
  type: 'user' | 'assistant' | 'system'
  content: string
  uuid: string
  parentUuid?: string
  timestamp?: number
}

// ============================================================================
// Query Types
// ============================================================================

export interface Options {
  dir?: string
  model?: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
  dangerouslySkipPermissions?: boolean
}

export interface InternalOptions extends Options {
  /** @internal */
  _internal?: boolean
}

export interface Query {
  stream(): AsyncIterable<SDKMessage>
  result(): Promise<SDKResultMessage>
}

export interface InternalQuery extends Query {
  /** @internal */
  _internal: true
}
