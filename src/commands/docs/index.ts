import type { Command } from '../../commands.js'

const docs = {
  type: 'local-jsx',
  name: 'docs',
  description: 'Auto-generate documentation (README, API docs, JSDoc/TSDoc)',
  load: () => import('./docs.js'),
} satisfies Command

export default docs
