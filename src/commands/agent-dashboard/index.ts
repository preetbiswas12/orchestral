import type { Command } from '../../commands.js'

const agentDashboard = {
  type: 'local-jsx',
  name: 'agent-dashboard',
  description: 'Multi-Agent Dashboard — spawn, track, steer, and merge parallel agents',
  load: () => import('./agent-dashboard.js'),
} satisfies Command

export default agentDashboard
