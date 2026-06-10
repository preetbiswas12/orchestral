/**
 * Provider Setup Screen
 *
 * First-run wizard for configuring AI providers.
 * Shown when no providers are configured.
 */

import React, { useState, useCallback } from 'react'
import { Box, Text, useInput, useTheme } from '../ink.js'
import {
  type ProviderId,
  DEFAULT_MODELS,
  DEFAULT_BASE_URLS,
} from '../providers/types.js'
import {
  enableProvider,
  loadConfig,
  saveConfig,
  setActiveProvider,
} from '../providers/config.js'
import {
  getProviderRegistry,
  initializeProviders,
} from '../providers/registry.js'

// Provider display info
const PROVIDERS: Array<{
  id: ProviderId
  name: string
  description: string
  requiresKey: boolean
  keyHint: string
}> = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Direct access to Claude models',
    requiresKey: true,
    keyHint: 'Starts with sk-ant-',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 300+ models from multiple providers',
    requiresKey: true,
    keyHint: 'Starts with sk-or-',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Direct access to GPT models',
    requiresKey: true,
    keyHint: 'Starts with sk-',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Direct access to Gemini models',
    requiresKey: true,
    keyHint: 'Starts with AIza',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run models locally (no API key required)',
    requiresKey: false,
    keyHint: 'No API key needed',
  },
]

type SetupStep = 'provider' | 'apikey' | 'url' | 'testing' | 'complete'

interface ProviderSetupProps {
  onComplete: () => void
}

export function ProviderSetup({ onComplete }: ProviderSetupProps): React.ReactElement {
  const theme = useTheme()
  const [step, setStep] = useState<SetupStep>('provider')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleProviderSelect = useCallback(() => {
    const provider = PROVIDERS[selectedIndex]
    if (!provider) return

    setSelectedProvider(provider.id)
    setError(null)

    if (provider.id === 'ollama') {
      // Ollama doesn't need API key, ask for URL
      setStep('url')
      setCustomUrl(DEFAULT_BASE_URLS.ollama)
    } else {
      setStep('apikey')
    }
  }, [selectedIndex])

  const handleApiKeySubmit = useCallback(() => {
    if (!selectedProvider) return

    const provider = PROVIDERS.find((p) => p.id === selectedProvider)
    if (!provider) return

    // Basic validation
    if (provider.requiresKey && !apiKey.trim()) {
      setError('API key is required')
      return
    }

    // Provider-specific validation
    if (selectedProvider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      setError('Anthropic API key should start with sk-ant-')
      return
    }
    if (selectedProvider === 'openrouter' && !apiKey.startsWith('sk-or-')) {
      setError('OpenRouter API key should start with sk-or-')
      return
    }
    if (selectedProvider === 'openai' && !apiKey.startsWith('sk-')) {
      setError('OpenAI API key should start with sk-')
      return
    }
    if (selectedProvider === 'gemini' && !apiKey.startsWith('AIza')) {
      setError('Gemini API key should start with AIza')
      return
    }

    setError(null)
    setStep('testing')
    void testAndSave()
  }, [selectedProvider, apiKey])

  const handleUrlSubmit = useCallback(() => {
    if (!customUrl.trim()) {
      setError('URL is required')
      return
    }

    try {
      new URL(customUrl)
    } catch {
      setError('Invalid URL format')
      return
    }

    setError(null)
    setStep('testing')
    void testAndSave()
  }, [customUrl])

  const testAndSave = useCallback(async () => {
    if (!selectedProvider) return

    try {
      setTestResult('Configuring provider...')

      // Enable the provider
      enableProvider(selectedProvider, apiKey || null, {
        defaultModel: DEFAULT_MODELS[selectedProvider],
        baseUrl: customUrl || DEFAULT_BASE_URLS[selectedProvider],
        setAsActive: true,
      })

      // Initialize providers
      setTestResult('Initializing...')
      await initializeProviders()

      // Test connection
      setTestResult('Testing connection...')
      const registry = getProviderRegistry()
      const provider = registry.get(selectedProvider)

      if (provider) {
        const result = await provider.testConnection()
        if (result === true) {
          setTestResult('Connection successful!')
          setStep('complete')
          setTimeout(onComplete, 1500)
        } else {
          setError(`Connection failed: ${result}`)
          setStep('apikey')
        }
      }
    } catch (err) {
      setError(`Setup failed: ${err}`)
      setStep('apikey')
    }
  }, [selectedProvider, apiKey, customUrl, onComplete])

  useInput((input, key) => {
    if (step === 'provider') {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1))
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(PROVIDERS.length - 1, i + 1))
      } else if (key.return) {
        handleProviderSelect()
      }
    } else if (step === 'apikey') {
      if (key.return) {
        handleApiKeySubmit()
      } else if (key.escape) {
        setStep('provider')
        setApiKey('')
        setError(null)
      } else if (key.backspace || key.delete) {
        setApiKey((k) => k.slice(0, -1))
      } else if (input && !key.ctrl && !key.meta) {
        setApiKey((k) => k + input)
      }
    } else if (step === 'url') {
      if (key.return) {
        handleUrlSubmit()
      } else if (key.escape) {
        setStep('provider')
        setCustomUrl('')
        setError(null)
      } else if (key.backspace || key.delete) {
        setCustomUrl((u) => u.slice(0, -1))
      } else if (input && !key.ctrl && !key.meta) {
        setCustomUrl((u) => u + input)
      }
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.secondaryText}>
          ╭─────────────────────────────────────────╮
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color={theme.secondaryText}>
          │  
        </Text>
        <Text bold color={theme.primary}>
          Provider Setup
        </Text>
        <Text bold color={theme.secondaryText}>
                              │
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color={theme.secondaryText}>
          ╰─────────────────────────────────────────╯
        </Text>
      </Box>

      {step === 'provider' && (
        <Box flexDirection="column">
          <Text color={theme.secondaryText}>
            Select an AI provider to get started:
          </Text>
          <Box marginTop={1} flexDirection="column">
            {PROVIDERS.map((provider, index) => (
              <Box key={provider.id}>
                <Text
                  color={
                    index === selectedIndex ? theme.primary : theme.text
                  }
                >
                  {index === selectedIndex ? '❯ ' : '  '}
                  {provider.name}
                </Text>
                <Text color={theme.secondaryText}>
                  {' - '}
                  {provider.description}
                </Text>
              </Box>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color={theme.secondaryText}>
              ↑/↓ to select, Enter to continue
            </Text>
          </Box>
        </Box>
      )}

      {step === 'apikey' && selectedProvider && (
        <Box flexDirection="column">
          <Text>
            Enter your{' '}
            <Text bold color={theme.primary}>
              {PROVIDERS.find((p) => p.id === selectedProvider)?.name}
            </Text>{' '}
            API key:
          </Text>
          <Box marginTop={1}>
            <Text color={theme.secondaryText}>
              ({PROVIDERS.find((p) => p.id === selectedProvider)?.keyHint})
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.primary}>{'> '}</Text>
            <Text>{apiKey ? '*'.repeat(apiKey.length) : ''}</Text>
            <Text color={theme.primary}>█</Text>
          </Box>
          {error && (
            <Box marginTop={1}>
              <Text color="red">✗ {error}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color={theme.secondaryText}>
              Enter to confirm, Esc to go back
            </Text>
          </Box>
        </Box>
      )}

      {step === 'url' && (
        <Box flexDirection="column">
          <Text>
            Enter Ollama server URL (or press Enter for default):
          </Text>
          <Box marginTop={1}>
            <Text color={theme.primary}>{'> '}</Text>
            <Text>{customUrl}</Text>
            <Text color={theme.primary}>█</Text>
          </Box>
          {error && (
            <Box marginTop={1}>
              <Text color="red">✗ {error}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color={theme.secondaryText}>
              Enter to confirm, Esc to go back
            </Text>
          </Box>
        </Box>
      )}

      {step === 'testing' && (
        <Box flexDirection="column">
          <Text color={theme.primary}>⠋ {testResult}</Text>
        </Box>
      )}

      {step === 'complete' && (
        <Box flexDirection="column">
          <Text color="green">✓ Setup complete!</Text>
          <Text color={theme.secondaryText}>Starting Claude Code...</Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Check if provider setup is needed
 */
export function needsProviderSetup(): boolean {
  try {
    const config = loadConfig()
    return !Object.values(config.providers).some((p) => p.enabled)
  } catch {
    return true
  }
}
