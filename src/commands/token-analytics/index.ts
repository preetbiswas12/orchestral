import type { Command } from '../../commands.js'

const tokenAnalytics = {
  type: 'local-jsx',
  name: 'token-analytics',
  description: 'View detailed token usage analytics, costs, and budget tracking',
  load: () => import('./token-analytics.js'),
} satisfies Command

export default tokenAnalytics
