/**
 * Multi-Provider System Types
 *
 * Defines interfaces and types for supporting multiple AI providers:
 * - Anthropic (direct API)
 * - OpenRouter (300+ models)
 * - OpenAI (GPT-5.x series)
 * - Google Gemini (Gemini 2.5/3.x series)
 * - Ollama (local models)
 */

// ============================================================================
// Provider Identifiers
// ============================================================================

export type ProviderId =
  | 'anthropic'
  | 'openrouter'
  | 'openai'
  | 'gemini'
  | 'ollama'
  | 'mistral'
  | 'groq'
  | 'deepseek'
  | 'perplexity'
  | 'cohere'
  | 'xai'
  | 'bedrock'
  | 'azure-openai'

// ============================================================================
// Model Definitions
// ============================================================================

export interface ModelInfo {
  /** Model ID used in API calls */
  id: string
  /** Human-readable display name */
  name: string
  /** Provider this model belongs to */
  provider: ProviderId
  /** Maximum input context tokens */
  contextWindow: number
  /** Maximum output tokens */
  maxOutputTokens: number
  /** Capabilities this model supports */
  capabilities: ModelCapabilities
  /** Is this a default/recommended model */
  isDefault?: boolean
  /** Additional metadata */
  meta?: {
    /** Cost per million input tokens (USD) */
    inputCostPerMTok?: number
    /** Cost per million output tokens (USD) */
    outputCostPerMTok?: number
    /** Knowledge cutoff date */
    knowledgeCutoff?: string
    /** Model family/series */
    family?: string
  }
}

export interface ModelCapabilities {
  /** Supports tool/function calling */
  tools: boolean
  /** Supports vision/image input */
  vision: boolean
  /** Supports extended/chain-of-thought thinking */
  extendedThinking: boolean
  /** Supports streaming responses */
  streaming: boolean
  /** Supports structured JSON output */
  structuredOutput: boolean
  /** Supports system prompts */
  systemPrompt: boolean
  /** Supports multi-turn conversations */
  multiTurn: boolean
  /** Supports image generation */
  imageGeneration?: boolean
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  /** Is this provider enabled/configured */
  enabled: boolean
  /** API key (null for Ollama which doesn't require auth) */
  apiKey: string | null
  /** Default model to use for this provider */
  defaultModel: string
  /** Base URL for API requests */
  baseUrl: string
  /** Optional custom headers */
  customHeaders?: Record<string, string>
}

export interface ProvidersConfig {
  /** Currently active provider */
  activeProvider: ProviderId
  /** Configuration for each provider */
  providers: Record<ProviderId, ProviderConfig>
}

// ============================================================================
// Message Types (Provider-agnostic)
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image'
  source: {
    type: 'base64' | 'url'
    mediaType?: string
    data?: string
    url?: string
  }
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultContent {
  type: 'tool_result'
  toolUseId: string
  content: string | ContentBlock[]
  isError?: boolean
}

export interface ThinkingContent {
  type: 'thinking'
  thinking: string
}

export type ContentBlock =
  | TextContent
  | ImageContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent

export interface UnifiedMessage {
  role: MessageRole
  content: string | ContentBlock[]
}

// ============================================================================
// Tool Definitions (Provider-agnostic)
// ============================================================================

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  enum?: string[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
  required?: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required?: string[]
  }
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CompletionRequest {
  /** Model ID to use */
  model: string
  /** Messages in the conversation */
  messages: UnifiedMessage[]
  /** System prompt */
  systemPrompt?: string
  /** Available tools */
  tools?: ToolDefinition[]
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Temperature (0-1) */
  temperature?: number
  /** Top-p sampling */
  topP?: number
  /** Stop sequences */
  stopSequences?: string[]
  /** Enable streaming */
  stream?: boolean
  /** Enable extended thinking (if supported) */
  extendedThinking?: boolean
  /** Thinking budget tokens (if extended thinking enabled) */
  thinkingBudget?: number
}

export interface CompletionResponse {
  /** Unique response ID */
  id: string
  /** Model used */
  model: string
  /** Response content blocks */
  content: ContentBlock[]
  /** Why generation stopped */
  stopReason: StopReason
  /** Token usage */
  usage: TokenUsage
}

export type StopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'tool_use'

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

// ============================================================================
// Streaming Types
// ============================================================================

export type StreamEvent =
  | { type: 'message_start'; message: { id: string; model: string } }
  | { type: 'content_block_start'; index: number; contentBlock: ContentBlock }
  | {
      type: 'content_block_delta'
      index: number
      delta: TextDelta | ToolInputDelta | ThinkingDelta
    }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta: { stopReason: StopReason }; usage: TokenUsage }
  | { type: 'message_stop' }
  | { type: 'error'; error: { type: string; message: string } }

export interface TextDelta {
  type: 'text_delta'
  text: string
}

export interface ToolInputDelta {
  type: 'input_json_delta'
  partialJson: string
}

export interface ThinkingDelta {
  type: 'thinking_delta'
  thinking: string
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface Provider {
  /** Provider identifier */
  readonly id: ProviderId
  /** Display name */
  readonly name: string
  /** Provider description */
  readonly description: string

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>

  /**
   * Test connection to the provider
   * @returns true if connection successful, error message if failed
   */
  testConnection(): Promise<true | string>

  /**
   * Get list of available models for this provider
   */
  getAvailableModels(): ModelInfo[]

  /**
   * Get model info by ID
   */
  getModel(modelId: string): ModelInfo | undefined

  /**
   * Create a completion (non-streaming)
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>

  /**
   * Create a streaming completion
   */
  stream(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent, void, unknown>

  /**
   * Check if a capability is supported
   */
  supportsCapability(
    capability: keyof ModelCapabilities,
    modelId?: string,
  ): boolean

  /**
   * Get current configuration
   */
  getConfig(): ProviderConfig | undefined

  /**
   * Validate an API key format (basic validation, not server-side)
   */
  validateApiKey(apiKey: string): boolean

  /**
   * Get capabilities for the current model
   */
  getModelCapabilities(): ModelCapabilities
}

// ============================================================================
// Provider Registry Types
// ============================================================================

export interface ProviderRegistry {
  /**
   * Register a provider
   */
  register(provider: Provider): void

  /**
   * Get a provider by ID
   */
  get(id: ProviderId): Provider | undefined

  /**
   * Get all registered providers
   */
  getAll(): Provider[]

  /**
   * Get the currently active provider
   */
  getActive(): Provider | undefined

  /**
   * Set the active provider
   */
  setActive(id: ProviderId): Promise<void>

  /**
   * Initialize all providers from config
   */
  initializeFromConfig(config: ProvidersConfig): Promise<void>
}

// ============================================================================
// Error Types
// ============================================================================

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderId,
    public readonly code: ProviderErrorCode,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export type ProviderErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'MODEL_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR'
  | 'UNSUPPORTED_FEATURE'

// ============================================================================
// Model Task Types (for smart routing)
// ============================================================================

export type ModelTask =
  | 'quick'          // Simple Q&A, formatting, trivial tasks
  | 'coding'         // Code generation, refactoring, debugging
  | 'reasoning'      // Complex analysis, architecture decisions
  | 'vision'         // Image understanding, screenshot analysis
  | 'long-context'   // Large file analysis, codebase-wide tasks
  | 'creative'       // Writing, brainstorming, design

// ============================================================================
// Default Models per Provider (April 2026)
// ============================================================================

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-sonnet-4-6',
  openrouter: 'openai/gpt-5.3-codex',
  openai: 'gpt-5.3-codex',
  gemini: 'gemini-2.5-flash',
  ollama: 'qwen3.5:latest',
  mistral: 'mistral-large-latest',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-reasoner',
  perplexity: 'perplexity-sonar-pro',
  cohere: 'command-r-plus',
  xai: 'grok-3',
  bedrock: 'anthropic.claude-sonnet-4-6',
  'azure-openai': 'gpt-5.3-codex',
}

// ============================================================================
// Default Base URLs
// ============================================================================

export const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  anthropic: 'https://api.anthropic.com',
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434',
  mistral: 'https://api.mistral.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  perplexity: 'https://api.perplexity.ai/v1',
  cohere: 'https://api.cohere.ai/v1',
  xai: 'https://api.x.ai/v1',
  bedrock: '', // Must be configured with region-specific endpoint
  'azure-openai': '', // Must be configured with Azure resource URL
}
