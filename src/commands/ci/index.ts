import type { Command } from '../../commands.js'

const ci = {
  type: 'local-jsx',
  name: 'ci',
  description: 'GitHub CI/workflow status — view runs, logs, rerun, cancel',
  load: () => import('./ci.js'),
} satisfies Command

export default ci
