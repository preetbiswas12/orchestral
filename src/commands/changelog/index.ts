import type { Command } from '../../commands.js'

const changelog = {
  type: 'local-jsx',
  name: 'changelog',
  description: 'Auto-generate changelogs from git history and conventional commits',
  load: () => import('./changelog.js'),
} satisfies Command

export default changelog
