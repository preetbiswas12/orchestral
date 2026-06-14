import type { Command } from '../../commands.js'

const github = {
  type: 'local-jsx',
  name: 'github',
  description: 'GitHub Integration Suite — PRs, issues, CI, notifications',
  load: () => import('./github.js'),
} satisfies Command

export default github
