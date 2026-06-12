import type { Command } from '../../commands.js'

const batch = {
  type: 'local-jsx',
  name: 'batch',
  description: 'Apply AI operations across multiple files (refactor, document, review)',
  load: () => import('./batch.js'),
} satisfies Command

export default batch
