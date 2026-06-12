import type { Command } from '../../commands.js'

const commitGen = {
  type: 'local-jsx',
  name: 'commit-gen',
  description: 'Generate AI-powered conventional commit messages from your changes',
  load: () => import('./commit-gen.js'),
} satisfies Command

export default commitGen
