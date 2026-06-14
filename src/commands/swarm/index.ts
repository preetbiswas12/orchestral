import type { Command } from '../../commands.js'

const swarm = {
  type: 'local-jsx',
  name: 'swarm',
  description: 'Spawn a multi-agent swarm — runs parallel agents and merges results',
  load: () => import('./swarm.js'),
} satisfies Command

export default swarm
