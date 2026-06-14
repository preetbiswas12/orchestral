import type { Command } from '../../commands.js'

const issue = {
  type: 'local-jsx',
  name: 'issue',
  description: 'GitHub Issue management — list, view, create, edit, close',
  load: () => import('./issue.js'),
} satisfies Command

export default issue
