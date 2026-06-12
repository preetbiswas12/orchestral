import type { Command } from '../../commands.js'

const auto = {
  type: 'local-jsx',
  name: 'auto',
  description: 'AI-powered command orchestrator — describe what you want in natural language',
  load: () => import('./auto.js'),
} satisfies Command

export default auto
