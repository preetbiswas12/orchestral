import type { Command } from '../../commands.js'

export default {
  type: 'local-jsx',
  name: 'providers',
  description: 'Manage AI providers (add, remove, switch)',
  immediate: false,
  load: () => import('./providers.js'),
} satisfies Command
