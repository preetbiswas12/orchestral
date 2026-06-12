/**
 * Provider Capabilities Matrix
 *
 * Defines available models and their capabilities for each provider.
 * Updated April 2026.
 */

import type { ModelCapabilities, ModelInfo, ProviderId } from './types.js'

// ============================================================================
// Full Capabilities (all features supported)
// ============================================================================

const FULL_CAPABILITIES: ModelCapabilities = {
  tools: true,
  vision: true,
  extendedThinking: true,
  streaming: true,
  structuredOutput: true,
  systemPrompt: true,
  multiTurn: true,
}

const STANDARD_CAPABILITIES: ModelCapabilities = {
  tools: true,
  vision: true,
  extendedThinking: false,
  streaming: true,
  structuredOutput: true,
  systemPrompt: true,
  multiTurn: true,
}

const BASIC_CAPABILITIES: ModelCapabilities = {
  tools: true,
  vision: false,
  extendedThinking: false,
  streaming: true,
  structuredOutput: false,
  systemPrompt: true,
  multiTurn: true,
}

// ============================================================================
// Anthropic Models (April 2026)
// ============================================================================

export const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    capabilities: FULL_CAPABILITIES,
    isDefault: true,
    meta: {
      inputCostPerMTok: 3,
      outputCostPerMTok: 15,
      knowledgeCutoff: 'Jan 2026',
      family: 'claude-4',
    },
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    capabilities: FULL_CAPABILITIES,
    meta: {
      inputCostPerMTok: 5,
      outputCostPerMTok: 25,
      knowledgeCutoff: 'Aug 2025',
      family: 'claude-4',
    },
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: FULL_CAPABILITIES,
    meta: {
      inputCostPerMTok: 1,
      outputCostPerMTok: 5,
      knowledgeCutoff: 'Feb 2025',
      family: 'claude-4',
    },
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      inputCostPerMTok: 3,
      outputCostPerMTok: 15,
      family: 'claude-4',
    },
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      inputCostPerMTok: 5,
      outputCostPerMTok: 25,
      family: 'claude-4',
    },
  },
]

// ============================================================================
// OpenAI Models (April 2026)
// ============================================================================

export const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: 'openai',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    isDefault: true,
    meta: {
      family: 'gpt-5',
    },
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    provider: 'openai',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      family: 'gpt-5',
    },
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      family: 'gpt-5',
    },
  },
  {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      family: 'gpt-5',
    },
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      family: 'gpt-5',
    },
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      family: 'gpt-5',
    },
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      family: 'gpt-5',
    },
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: {
      family: 'gpt-4',
    },
  },
]

// ============================================================================
// OpenRouter Models (uses OpenAI format, provides access to many models)
// ============================================================================

export const OPENROUTER_MODELS: ModelInfo[] = [
  // OpenAI via OpenRouter
  {
    id: 'openai/gpt-5.3-codex',
    name: 'GPT-5.3 Codex (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    isDefault: true,
    meta: { family: 'openai' },
  },
  {
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4 (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'openai' },
  },
  {
    id: 'openai/gpt-5.4-mini',
    name: 'GPT-5.4 Mini (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'openai' },
  },
  // Anthropic via OpenRouter
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6 (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    capabilities: FULL_CAPABILITIES,
    meta: { family: 'anthropic' },
  },
  {
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude Opus 4.6 (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    capabilities: FULL_CAPABILITIES,
    meta: { family: 'anthropic' },
  },
  // Google via OpenRouter
  {
    id: 'google/gemini-3.1-pro',
    name: 'Gemini 3.1 Pro (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 2_000_000,
    maxOutputTokens: 64_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'google' },
  },
  {
    id: 'google/gemini-3.1-flash',
    name: 'Gemini 3.1 Flash (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'google' },
  },
  // DeepSeek via OpenRouter
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, extendedThinking: true },
    meta: { family: 'deepseek' },
  },
  // Qwen via OpenRouter
  {
    id: 'qwen/qwen3.5-72b',
    name: 'Qwen 3.5 72B (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'qwen' },
  },
]

// ============================================================================
// Google Gemini Models (Real models from Google AI - April 2026)
// Source: https://ai.google.dev/gemini-api/docs/models
// ============================================================================

export const GEMINI_MODELS: ModelInfo[] = [
  // Gemini 3.0 - Current generation (recommended)
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    provider: 'gemini',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: true },
    isDefault: true, // Best general-purpose model
    meta: { family: 'gemini-3' },
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    provider: 'gemini',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: true, extendedThinking: true },
    meta: { family: 'gemini-3' },
  },
  // Gemini 2.5 - Production stable
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    contextWindow: 1_000_000,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'gemini-2.5', free: true },
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'gemini',
    contextWindow: 500_000,
    maxOutputTokens: 8_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'gemini-2.5', free: true, lowLatency: true },
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, extendedThinking: true },
    meta: { family: 'gemini-2.5' },
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'gemini',
    contextWindow: 500_000,
    maxOutputTokens: 8_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: true, imageGeneration: true },
    meta: { family: 'gemini-2.5', specialization: 'image' },
  },
  // Gemini 2.0 - Still available
  {
    id: 'gemini-2.0-pro',
    name: 'Gemini 2.0 Pro',
    provider: 'gemini',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'gemini-2.0' },
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    contextWindow: 1_000_000,
    maxOutputTokens: 8_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'gemini-2.0', free: true },
  },
]

// ============================================================================
// Ollama Models (Popular local models)
// ============================================================================

export const OLLAMA_MODELS: ModelInfo[] = [
  {
    id: 'qwen3.5:latest',
    name: 'Qwen 3.5',
    provider: 'ollama',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    isDefault: true,
    meta: { family: 'qwen' },
  },
  {
    id: 'qwen3-coder:30b',
    name: 'Qwen3 Coder 30B',
    provider: 'ollama',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'qwen' },
  },
  {
    id: 'deepseek-r1:70b',
    name: 'DeepSeek R1 70B',
    provider: 'ollama',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: { ...BASIC_CAPABILITIES, extendedThinking: true },
    meta: { family: 'deepseek' },
  },
  {
    id: 'deepseek-r1:32b',
    name: 'DeepSeek R1 32B',
    provider: 'ollama',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: { ...BASIC_CAPABILITIES, extendedThinking: true },
    meta: { family: 'deepseek' },
  },
  {
    id: 'llama4:latest',
    name: 'Llama 4',
    provider: 'ollama',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'llama' },
  },
  {
    id: 'llama3.3:70b',
    name: 'Llama 3.3 70B',
    provider: 'ollama',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'llama' },
  },
  {
    id: 'gemma3:27b',
    name: 'Gemma 3 27B',
    provider: 'ollama',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: { ...BASIC_CAPABILITIES, vision: true },
    meta: { family: 'gemma' },
  },
  {
    id: 'codellama:34b',
    name: 'Code Llama 34B',
    provider: 'ollama',
    contextWindow: 16_000,
    maxOutputTokens: 4_000,
    capabilities: { ...BASIC_CAPABILITIES, tools: false },
    meta: { family: 'codellama' },
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    provider: 'ollama',
    contextWindow: 32_000,
    maxOutputTokens: 8_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'mistral' },
  },
  {
    id: 'mixtral:8x7b',
    name: 'Mixtral 8x7B',
    provider: 'ollama',
    contextWindow: 32_000,
    maxOutputTokens: 8_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'mistral' },
  },
]

// ============================================================================
// Mistral AI Models (June 2026)
// ============================================================================

export const MISTRAL_MODELS: ModelInfo[] = [
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large 3',
    provider: 'mistral',
    contextWindow: 131_072,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, extendedThinking: true },
    isDefault: true,
    meta: { family: 'mistral-large', inputCostPerMTok: 2, outputCostPerMTok: 6 },
  },
  {
    id: 'mistral-medium-latest',
    name: 'Mistral Medium 3',
    provider: 'mistral',
    contextWindow: 131_072,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'mistral-medium', inputCostPerMTok: 0.4, outputCostPerMTok: 2 },
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small 4',
    provider: 'mistral',
    contextWindow: 131_072,
    maxOutputTokens: 16_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'mistral-small', inputCostPerMTok: 0.1, outputCostPerMTok: 0.3 },
  },
  {
    id: 'codestral-latest',
    name: 'Codestral',
    provider: 'mistral',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: false },
    meta: { family: 'codestral', specialization: 'code', inputCostPerMTok: 0.3, outputCostPerMTok: 0.9 },
  },
  {
    id: 'pixtral-large-latest',
    name: 'Pixtral Large',
    provider: 'mistral',
    contextWindow: 131_072,
    maxOutputTokens: 16_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: true },
    meta: { family: 'pixtral', specialization: 'vision', inputCostPerMTok: 2, outputCostPerMTok: 6 },
  },
  {
    id: 'ministral-8b-latest',
    name: 'Ministral 8B',
    provider: 'mistral',
    contextWindow: 131_072,
    maxOutputTokens: 16_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'ministral', inputCostPerMTok: 0.1, outputCostPerMTok: 0.1 },
  },
]

// ============================================================================
// Groq Models (June 2026) — Ultra-fast LPU inference
// ============================================================================

export const GROQ_MODELS: ModelInfo[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    contextWindow: 131_072,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    isDefault: true,
    meta: { family: 'llama', speed: 'ultra-fast', inputCostPerMTok: 0.59, outputCostPerMTok: 0.79 },
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    contextWindow: 131_072,
    maxOutputTokens: 8_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'llama', speed: 'ultra-fast', inputCostPerMTok: 0.05, outputCostPerMTok: 0.08 },
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    contextWindow: 32_768,
    maxOutputTokens: 8_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'mixtral', speed: 'ultra-fast', inputCostPerMTok: 0.24, outputCostPerMTok: 0.24 },
  },
  {
    id: 'gemma-2-9b-it',
    name: 'Gemma 2 9B',
    provider: 'groq',
    contextWindow: 8_192,
    maxOutputTokens: 4_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'gemma', speed: 'ultra-fast', inputCostPerMTok: 0.2, outputCostPerMTok: 0.2 },
  },
  {
    id: 'qwen-2.5-32b',
    name: 'Qwen 2.5 32B',
    provider: 'groq',
    contextWindow: 131_072,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'qwen', speed: 'ultra-fast', inputCostPerMTok: 0.79, outputCostPerMTok: 0.79 },
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill Llama 70B',
    provider: 'groq',
    contextWindow: 131_072,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, extendedThinking: true },
    meta: { family: 'deepseek', speed: 'ultra-fast', inputCostPerMTok: 0.75, outputCostPerMTok: 0.99 },
  },
]

// ============================================================================
// DeepSeek Models (June 2026)
// ============================================================================

export const DEEPSEEK_MODELS: ModelInfo[] = [
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1 (Reasoner)',
    provider: 'deepseek',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, extendedThinking: true },
    isDefault: true,
    meta: { family: 'deepseek-r1', inputCostPerMTok: 0.55, outputCostPerMTok: 2.19 },
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    provider: 'deepseek',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'deepseek-v3', inputCostPerMTok: 0.27, outputCostPerMTok: 1.10 },
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder V2',
    provider: 'deepseek',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: false },
    meta: { family: 'deepseek-coder', specialization: 'code', inputCostPerMTok: 0.27, outputCostPerMTok: 1.10 },
  },
]

// ============================================================================
// Perplexity Models (June 2026) — AI-powered search
// ============================================================================

export const PERPLEXITY_MODELS: ModelInfo[] = [
  {
    id: 'perplexity-sonar-pro',
    name: 'Sonar Pro',
    provider: 'perplexity',
    contextWindow: 200_000,
    maxOutputTokens: 16_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: false, tools: false },
    isDefault: true,
    meta: { family: 'sonar', webSearch: true, inputCostPerMTok: 3, outputCostPerMTok: 15 },
  },
  {
    id: 'perplexity-sonar',
    name: 'Sonar',
    provider: 'perplexity',
    contextWindow: 128_000,
    maxOutputTokens: 8_000,
    capabilities: { ...BASIC_CAPABILITIES, vision: false, tools: false },
    meta: { family: 'sonar', webSearch: true, inputCostPerMTok: 1, outputCostPerMTok: 1 },
  },
  {
    id: 'perplexity-sonar-reasoning-pro',
    name: 'Sonar Reasoning Pro',
    provider: 'perplexity',
    contextWindow: 200_000,
    maxOutputTokens: 16_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: false, tools: false, extendedThinking: true },
    meta: { family: 'sonar-reasoning', webSearch: true, inputCostPerMTok: 3, outputCostPerMTok: 15 },
  },
  {
    id: 'perplexity-sonar-deep-research',
    name: 'Sonar Deep Research',
    provider: 'perplexity',
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, vision: false, tools: false, extendedThinking: true },
    meta: { family: 'sonar-deep', webSearch: true, deepResearch: true, inputCostPerMTok: 5, outputCostPerMTok: 25 },
  },
]

// ============================================================================
// Cohere Models (June 2026)
// ============================================================================

export const COHERE_MODELS: ModelInfo[] = [
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    contextWindow: 131_072,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    isDefault: true,
    meta: { family: 'command-r', inputCostPerMTok: 2.5, outputCostPerMTok: 10 },
  },
  {
    id: 'command-r',
    name: 'Command R',
    provider: 'cohere',
    contextWindow: 131_072,
    maxOutputTokens: 8_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'command-r', inputCostPerMTok: 0.15, outputCostPerMTok: 0.6 },
  },
  {
    id: 'command-r7b',
    name: 'Command R7B',
    provider: 'cohere',
    contextWindow: 131_072,
    maxOutputTokens: 8_000,
    capabilities: BASIC_CAPABILITIES,
    meta: { family: 'command-r', inputCostPerMTok: 0.0375, outputCostPerMTok: 0.15 },
  },
  {
    id: 'command-a',
    name: 'Command A',
    provider: 'cohere',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: { ...STANDARD_CAPABILITIES, extendedThinking: true },
    meta: { family: 'command-a', inputCostPerMTok: 2.5, outputCostPerMTok: 10 },
  },
]

// ============================================================================
// xAI (Grok) Models (June 2026)
// ============================================================================

export const XAI_MODELS: ModelInfo[] = [
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xai',
    contextWindow: 131_072,
    maxOutputTokens: 16_000,
    capabilities: STANDARD_CAPABILITIES,
    isDefault: true,
    meta: { family: 'grok-3', inputCostPerMTok: 3, outputCostPerMTok: 15 },
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xai',
    contextWindow: 131_072,
    maxOutputTokens: 8_000,
    capabilities: { ...BASIC_CAPABILITIES, extendedThinking: true },
    meta: { family: 'grok-3', inputCostPerMTok: 0.25, outputCostPerMTok: 0.6 },
  },
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    contextWindow: 131_072,
    maxOutputTokens: 8_000,
    capabilities: STANDARD_CAPABILITIES,
    meta: { family: 'grok-2', inputCostPerMTok: 2, outputCostPerMTok: 10 },
  },
]

// ============================================================================
// Model Registry
// ============================================================================

export const ALL_MODELS: Record<ProviderId, ModelInfo[]> = {
  anthropic: ANTHROPIC_MODELS,
  openrouter: OPENROUTER_MODELS,
  openai: OPENAI_MODELS,
  gemini: GEMINI_MODELS,
  ollama: OLLAMA_MODELS,
  mistral: MISTRAL_MODELS,
  groq: GROQ_MODELS,
  deepseek: DEEPSEEK_MODELS,
  perplexity: PERPLEXITY_MODELS,
  cohere: COHERE_MODELS,
  xai: XAI_MODELS,
  bedrock: ANTHROPIC_MODELS, // Bedrock uses Anthropic models
  'azure-openai': OPENAI_MODELS, // Azure uses OpenAI models
}

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(providerId: ProviderId): ModelInfo[] {
  return ALL_MODELS[providerId] ?? []
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(providerId: ProviderId): ModelInfo | undefined {
  const models = getModelsForProvider(providerId)
  return models.find((m) => m.isDefault) ?? models[0]
}

/**
 * Get a specific model by ID
 */
export function getModelById(
  providerId: ProviderId,
  modelId: string,
): ModelInfo | undefined {
  return getModelsForProvider(providerId).find((m) => m.id === modelId)
}

/**
 * Check if a model supports a specific capability
 */
export function modelSupportsCapability(
  providerId: ProviderId,
  modelId: string,
  capability: keyof ModelCapabilities,
): boolean {
  const model = getModelById(providerId, modelId)
  return model?.capabilities[capability] ?? false
}
