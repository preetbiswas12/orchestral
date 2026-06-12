import type { Command } from '../../commands.js'

const sessions = {
  type: 'local-jsx',
  name: 'sessions',
  description: 'Session management dashboard (search, tag, export, compare)',
  load: () => import('./sessions.js'),
} satisfies Command

export default sessions
