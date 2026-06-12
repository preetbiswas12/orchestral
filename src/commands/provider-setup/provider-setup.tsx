/**
 * Provider Setup Wizard
 *
 * Interactive wizard to configure all 13 AI providers:
 * API key entry, model selection, connection testing, and activation.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  getAllProvidersInfo,
  getProvider,
  switchProvider,
} from '../../providers/registry.js'
import {
  loadConfig,
  enableProvider,
  disableProvider,
  updateProvider,
} from '../../providers/config.js'
import { ALL_MODELS } from '../../providers/capabilities.js'
import type { ProviderId, ProviderConfig } from '../../providers/types.js'

type Step = 'list' | 'enter-key' | 'select-model' | 'testing' | 'done'

interface ProviderStatus {
  id: ProviderId
  name: string
  description: string
  enabled: boolean
  isActive: boolean
  hasKey: boolean
  modelCount: number
  defaultModel: string
}

const PROVIDER_IDS: ProviderId[] = [
  'anthropic', 'openrouter', 'openai', 'gemini', 'ollama',
  'mistral', 'groq', 'deepseek', 'perplexity', 'cohere', 'xai',
]

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async onDone => {
  return <ProviderSetupWizard onClose={onDone} />
}

function ProviderSetupWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('list')
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [modelIdx, setModelIdx] = useState(0)

  const refreshProviders = useCallback(() => {
    const infos = getAllProvidersInfo()
    const config = loadConfig()
    const statuses: ProviderStatus[] = PROVIDER_IDS.map(id => {
      const info = infos.find(i => i.id === id)
      const providerConfig: ProviderConfig | undefined = (config.providers as Record<ProviderId, ProviderConfig>)[id]
      const models = ALL_MODELS[id] ?? []
      return {
        id,
        name: info?.name ?? id,
        description: info?.description ?? '',
        enabled: providerConfig?.enabled ?? false,
        isActive: config.activeProvider === id,
        hasKey: !!(providerConfig?.apiKey),
        modelCount: models.length,
        defaultModel: providerConfig?.defaultModel ?? models[0]?.id ?? 'default',
      }
    })
    setProviders(statuses)
  }, [])

  useEffect(() => {
    refreshProviders()
  }, [refreshProviders])

  const spStatus = providers.find(p => p.id === selectedProvider)
  const spModels = selectedProvider ? (ALL_MODELS[selectedProvider] ?? []) : []

  const testConnection = useCallback(async (providerId: ProviderId, apiKey: string) => {
    setStep('testing')
    setTestResult(null)
    try {
      enableProvider(providerId, apiKey)
      const provider = getProvider(providerId)
      if (provider) {
        const result = await provider.testConnection()
        if (result === true) {
          setTestResult('Connection successful!')
          refreshProviders()
        } else {
          setTestResult(`Connection failed: ${result}`)
        }
      }
    } catch (error) {
      setTestResult(`Error: ${error}`)
    }
  }, [refreshProviders])

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (step === 'list') { onClose() } else { setStep('list'); setTestResult(null); setApiKeyInput(''); setSelectedProvider(null) }
      return
    }
    if (step === 'list') {
      if (key.upArrow && selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
      if (key.downArrow && selectedIdx < providers.length - 1) setSelectedIdx(selectedIdx + 1)
      if (key.return) {
        const p = providers[selectedIdx]
        setSelectedProvider(p.id)
        if (p.enabled) { setStep('select-model'); const models = ALL_MODELS[p.id] ?? []; const cur = loadConfig().providers[p.id]?.defaultModel; const idx = models.findIndex(m => m.id === cur); setModelIdx(idx >= 0 ? idx : 0) }
        else { setStep('enter-key'); setApiKeyInput('') }
      }
      if (input === 'a' && providers[selectedIdx] && providers[selectedIdx].enabled) { switchProvider(providers[selectedIdx].id); refreshProviders() }
    }
    if (step === 'enter-key') {
      if (key.return && apiKeyInput.trim()) { testConnection(selectedProvider!, apiKeyInput.trim()) }
      if (key.backspace || key.delete) { setApiKeyInput(prev => prev.slice(0, -1)) }
      if (input && !key.ctrl && !key.meta) { setApiKeyInput(prev => prev + input) }
    }
    if (step === 'select-model') {
      if (key.upArrow && modelIdx > 0) setModelIdx(modelIdx - 1)
      if (key.downArrow && modelIdx < spModels.length - 1) setModelIdx(modelIdx + 1)
      if (key.return && selectedProvider) { const m = spModels[modelIdx]; if (m) { updateProvider(selectedProvider, { defaultModel: m.id }); refreshProviders(); setStep('done') } }
      if (input === 'a' && selectedProvider) { switchProvider(selectedProvider); refreshProviders(); setStep('done') }
      if (input === 'd' && selectedProvider) { disableProvider(selectedProvider); refreshProviders(); setStep('done') }
    }
    if (step === 'testing' && key.return) { setStep('done') }
    if (step === 'done' && (key.return || input === 'q')) { setStep('list'); setTestResult(null); setApiKeyInput(''); setSelectedProvider(null) }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box flexDirection="row">
        <Text bold color="cyan">Provider Setup Wizard</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />
      {step === 'list' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Configured Providers ({providers.filter(p => p.enabled).length}/{providers.length})</Text>
          <Text dimColor>Select a provider to configure or activate</Text>
          {providers.map((p, i) => (
            <Box key={p.id} flexDirection="row">
              <Text color={i === selectedIdx ? 'cyan' : undefined}>{i === selectedIdx ? '>' : ' '}</Text>
              <Text color={p.isActive ? 'green' : p.enabled ? 'yellow' : 'gray'}>{p.isActive ? '*' : ' '} {p.name}</Text>
              <Text dimColor> ({p.enabled ? `${p.modelCount} models` : 'not configured'})</Text>
              {p.isActive && <Text color="green"> [active]</Text>}
            </Box>
          ))}
        </Box>
      )}
      {step === 'enter-key' && spStatus && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Configure {spStatus.name}</Text>
          <Text dimColor>{spStatus.description}</Text>
          <Box marginTop={1}><Text>Enter API key:</Text><Text color="cyan">{apiKeyInput || '(type your key)'}</Text></Box>
          <Text dimColor>Press Enter to test connection</Text>
        </Box>
      )}
      {step === 'testing' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="cyan">Testing connection to {spStatus?.name}...</Text>
          {testResult && <Text>{testResult}</Text>}
        </Box>
      )}
      {step === 'select-model' && spStatus && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>{spStatus.name} - Select Default Model</Text>
          <Text dimColor>Current: {spStatus.defaultModel}</Text>
          <Text dimColor>Press 'a' to activate | 'd' to disable | Enter to set model</Text>
          <Box flexDirection="column" marginTop={1}>
            {spModels.slice(0, 10).map((model, i) => (
              <Text key={model.id} color={i === modelIdx ? 'cyan' : undefined}>
                {i === modelIdx ? '>' : ' '}{model.name}<Text dimColor> ({model.id})</Text>
                {model.meta?.inputCostPerMTok !== undefined && <Text dimColor> - ${model.meta.inputCostPerMTok}/M in</Text>}
              </Text>
            ))}
          </Box>
        </Box>
      )}
      {step === 'done' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="green" bold>Done!</Text>
          {testResult && <Text>{testResult}</Text>}
          <Text dimColor>Press Enter to continue, q to go back</Text>
        </Box>
      )}
    </Box>
  )
}
