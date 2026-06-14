import type { Command } from '../../commands.js'

const pr = {
  type: 'local-jsx',
  name: 'pr',
  description: 'GitHub PR management — list, view, create, review, merge',
  load: () => import('./pr.js'),
} satisfies Command

export default pr
