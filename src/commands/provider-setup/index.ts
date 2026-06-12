import type { Command } from '../../commands.js'

const providerSetup = {
  type: 'local-jsx',
  name: 'provider-setup',
  description: 'Interactive wizard to configure AI providers (API keys, models, connection testing)',
  load: () => import('./provider-setup.js'),
} satisfies Command

export default providerSetup
