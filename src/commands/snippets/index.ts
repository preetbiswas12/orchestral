import type { Command } from '../../commands.js'

const snippets = {
  type: 'local-jsx',
  name: 'snippets',
  description: 'Manage code snippets library (save, search, insert)',
  load: () => import('./snippets.js'),
} satisfies Command

export default snippets
