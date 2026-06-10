# Multi-Provider System

This system allows Claude Code to work with multiple AI providers instead of being locked to Anthropic OAuth.

## Supported Providers

1. **Anthropic** (direct API) - `claude-sonnet-4-6`, `claude-opus-4-6`, etc.
2. **OpenRouter** - Gateway to multiple models (GPT, Claude, etc.)
3. **OpenAI** - ChatGPT models (GPT-5.4, GPT-5.3-Codex, etc.)
4. **Google Gemini** - Gemini 3.x models
5. **Ollama** - Local models (Qwen, Llama, etc.)

## Architecture

### Core Files

- **`types.ts`** - TypeScript interfaces for providers, messages, capabilities
- **`config.ts`** - Manages `~/.claude/providers.json` configuration file
- **`registry.ts`** - Provider registration and active provider management
- **`capabilities.ts`** - Model definitions and feature support matrix
- **`bridge.ts`** - Compatibility layer with existing OAuth code
- **`adapter.ts`** - Message/stream conversion between formats
- **`clientWrapper.ts`** - Wraps Anthropic SDK client to intercept calls

### Provider Implementations

- **`base.ts`** - Abstract base class all providers extend
- **`anthropic.ts`** - Anthropic API (Messages API, streaming)
- **`openai.ts`** - OpenAI Chat Completions API
- **`openrouter.ts`** - OpenRouter (extends OpenAI provider)
- **`gemini.ts`** - Google Gemini API
- **`ollama.ts`** - Ollama local server API

### UI Components

- **`src/screens/ProviderSetup.tsx`** - First-run setup wizard
- **`src/commands/providers/`** - `/providers` command for runtime management

## How It Works

### 1. Initialization

On app startup (`src/entrypoints/init.ts`):
```typescript
import { initializeMultiProvider } from '../providers/index.js'
initializeMultiProvider()
```

This:
- Registers all 5 providers
- Loads `~/.claude/providers.json`
- Sets the active provider
- Bypasses OAuth if providers are configured

### 2. First Run

If `~/.claude/providers.json` doesn't exist:
- `ProviderSetup` screen shows before onboarding
- User chooses provider(s) and enters API keys
- Configuration is saved to `~/.claude/providers.json`

### 3. API Call Interception

When code calls `anthropic.beta.messages.create()`:

1. **Client Creation** (`src/services/api/client.ts`):
   ```typescript
   const client = new Anthropic(...)
   return wrapAnthropicClient(client)
   ```

2. **Proxy Wrapping** (`clientWrapper.ts`):
   - Intercepts `beta.messages.create()` calls
   - Routes to `createProviderStream()` or `createProviderCompletion()`

3. **Message Conversion** (`adapter.ts`):
   - Converts Anthropic format → Unified format
   - Calls active provider's `stream()` or `complete()` method
   - Converts response back to Anthropic format

4. **Provider Execution** (e.g., `openai.ts`):
   - Sends request to provider's API
   - Streams/returns response
   - Handles provider-specific errors

### 4. OAuth Bypass

The `bridge.ts` module provides `isMultiProviderEnabled()`:

```typescript
// src/utils/auth.ts
export function isAnthropicAuthEnabled(): boolean {
  const { isMultiProviderEnabled } = require('../providers/bridge.js')
  if (isMultiProviderEnabled()) {
    return false  // Disable OAuth
  }
  // ... normal OAuth flow
}
```

## Configuration File

`~/.claude/providers.json`:

```json
{
  "activeProvider": "anthropic",
  "providers": {
    "anthropic": {
      "enabled": true,
      "apiKey": "sk-ant-...",
      "defaultModel": "claude-sonnet-4-6",
      "baseUrl": "https://api.anthropic.com"
    },
    "openrouter": {
      "enabled": true,
      "apiKey": "sk-or-...",
      "defaultModel": "openai/gpt-5.3-codex",
      "baseUrl": "https://openrouter.ai/api/v1"
    },
    "openai": {
      "enabled": false,
      "apiKey": "",
      "defaultModel": "gpt-5.3-codex",
      "baseUrl": "https://api.openai.com/v1"
    },
    "gemini": {
      "enabled": false,
      "apiKey": "",
      "defaultModel": "gemini-3.1-pro",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta"
    },
    "ollama": {
      "enabled": false,
      "apiKey": "",
      "defaultModel": "qwen3.5:latest",
      "baseUrl": "http://localhost:11434"
    }
  }
}
```

## Commands

### `/providers` - Manage Providers

Runtime provider management:
- List all providers and their status
- Switch active provider
- Add/remove API keys
- Test connections
- View model lists

### `/model` - Switch Model (Existing)

The existing `/model` command continues to work:
- Lists models for the active provider
- Switches model within the active provider

## Message Format Conversion

### Anthropic → Unified

```typescript
// Input: BetaMessageParam
{
  role: 'user',
  content: [
    { type: 'text', text: 'Hello' },
    { type: 'image', source: {...} }
  ]
}

// Output: UnifiedMessage
{
  role: 'user',
  content: [
    { type: 'text', text: 'Hello' },
    { type: 'image', source: {...} }
  ]
}
```

### Provider-Specific Conversions

Each provider adapter handles its own API format:

- **OpenAI**: `messages[].content` (string or array)
- **Gemini**: `contents[].parts[]` with `text` or `inline_data`
- **Ollama**: `messages[]` with `role` and `content`

## Streaming

All providers support streaming via async generators:

```typescript
const stream = provider.stream({ messages, model, ... })

for await (const event of stream) {
  switch (event.type) {
    case 'message_start':
      // Initial message
    case 'content_block_delta':
      // Progressive text/tool input
    case 'content_block_stop':
      // Block complete
  }
}
```

Events are normalized to Anthropic's `BetaRawMessageStreamEvent` format.

## Tool Calls

Providers that support tools (Anthropic, OpenAI, OpenRouter) convert tool schemas:

```typescript
// Unified format
{
  name: 'bash',
  description: 'Execute bash command',
  input_schema: { type: 'object', properties: {...} }
}

// OpenAI format
{
  type: 'function',
  function: {
    name: 'bash',
    description: '...',
    parameters: { type: 'object', properties: {...} }
  }
}

// Gemini format
{
  name: 'bash',
  description: '...',
  parameters: { type: 'object', properties: {...} }
}
```

## Capabilities Matrix

Each provider/model declares its capabilities:

```typescript
interface ProviderCapabilities {
  supportsStreaming: boolean
  supportsTools: boolean
  supportsVision: boolean
  supportsExtendedThinking: boolean
  maxTokens: number
  contextWindow: number
}
```

Features are auto-disabled if the provider doesn't support them.

## Error Handling

Provider errors are wrapped to maintain consistency:

```typescript
try {
  await provider.complete(...)
} catch (error) {
  throw new Error(`[openai] Rate limit exceeded`)
}
```

The calling code sees errors in a format it expects.

## Testing

To test a provider connection:

```bash
# Start Claude Code
claude

# Open provider menu
/providers

# Select "Test Connection" for any provider
```

## Extending

To add a new provider:

1. Create `src/providers/newprovider.ts` extending `BaseProvider`
2. Implement `complete()`, `stream()`, `testConnection()`
3. Add models to `capabilities.ts`
4. Register in `initializeMultiProvider()` in `index.ts`
5. Add UI entry in `ProviderSetup.tsx`

## Security

- API keys are stored in `~/.claude/providers.json` (same location as OAuth tokens)
- File permissions: `0600` (user read/write only)
- No keys are sent to telemetry (telemetry is disabled anyway)
- Keys are never logged

## Compatibility

The system is designed to be 100% backward compatible:

- If `providers.json` doesn't exist, OAuth is used normally
- If OAuth is active, provider system is inactive
- Existing code sees no difference (wrapped client mimics Anthropic SDK)
- All features continue to work (tools, streaming, thinking, etc.)

## Troubleshooting

### Provider not working?

1. Check API key: `/providers` → Test Connection
2. Check model: `/model` to see available models
3. Check logs: Look for `[provider_id]` errors in console

### OAuth still activating?

- Ensure `~/.claude/providers.json` exists and has an enabled provider
- Check `isMultiProviderEnabled()` returns `true`
- Delete OAuth tokens: `rm ~/.claude/.credentials.json`

### Features disabled?

- Check provider capabilities in `capabilities.ts`
- Some providers don't support all features (e.g., Ollama has no vision)
- Features auto-disable based on `supportsX` flags
