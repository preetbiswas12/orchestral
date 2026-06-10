import { loadConfig, saveConfig } from '../../providers/config.js'
import { getProviderRegistry, switchProvider } from '../../providers/registry.js'
import type { ProviderId } from '../../providers/types.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (onDone, _context, rawArgs) => {
  const args = rawArgs?.trim() ?? ''
  const cfg = loadConfig()

  if (!args || args === 'list') {
    const enabledProviders = Object.entries(cfg.providers)
      .filter(([_, p]) => p.enabled)
      .map(([id, p]) => ({ id, model: p.defaultModel, active: cfg.activeProvider === id }))
    
    if (enabledProviders.length === 0) {
      onDone('No providers configured. Run provider setup to add providers.', { display: 'system' })
      return
    }

    const lines = ['⎿  Configured providers:']
    enabledProviders.forEach(p => {
      lines.push(`     - ${p.id}: ${p.model} ${p.active ? '(active)' : '(disabled)'}`)
    })
    
    lines.push('')
    lines.push('     Usage:')
    lines.push('     /providers list')
    lines.push('     /providers switch')
    lines.push('     /providers test [provider]')
    
    onDone(lines.join('\n'), { display: 'system' })
    return
  }

  const [command, value] = args.split(/\s+/, 2)

  if (command === 'switch') {
    const enabledProviders = Object.entries(cfg.providers)
      .filter(([_, p]) => p.enabled)
      .map(([id]) => id)
      .filter(id => id !== cfg.activeProvider)
    
    if (enabledProviders.length === 0) {
      onDone('⎿  No other providers available to switch to.', { display: 'system' })
      return
    }

    if (!value) {
      // Auto-switch to first available provider
      const targetProvider = enabledProviders[0] as ProviderId
      await switchProvider(targetProvider)
      onDone(`⎿  Switched to ${targetProvider}. Use '/model' to see available models.`, { display: 'system' })
      return
    }

    const providerId = value as ProviderId
    const providerCfg = cfg.providers[providerId]
    if (!providerCfg) {
      onDone(`⎿  Unknown provider '${value}'. Available: ${enabledProviders.join(', ')}`, { display: 'system' })
      return
    }
    if (!providerCfg.enabled) {
      onDone(`⎿  Provider '${value}' is disabled.`, { display: 'system' })
      return
    }

    await switchProvider(providerId)
    onDone(`⎿  Switched to ${providerId}. Use '/model' to see available models.`, { display: 'system' })
    return
  }

  if (command === 'test') {
    const providerId = (value ?? cfg.activeProvider) as ProviderId
    const registry = getProviderRegistry()
    const provider = registry.get(providerId)
    if (!provider) {
      onDone(
        `⎿  Provider '${providerId}' is not initialized yet. Restart CLI and try again.`,
        { display: 'system' },
      )
      return
    }

    try {
      const result = await provider.testConnection()
      if (result === true) {
        onDone(`⎿  Provider '${providerId}' connection OK.`, { display: 'system' })
      } else {
        onDone(`⎿  Provider '${providerId}' connection failed: ${result}`, {
          display: 'system',
        })
      }
    } catch (error) {
      onDone(`⎿  Provider '${providerId}' connection failed: ${error}`, {
        display: 'system',
      })
    }
    return
  }

  onDone(`⎿  Unknown command: '${command}'. Try '/providers list' or '/providers switch'.`, {
    display: 'system',
  })
}


