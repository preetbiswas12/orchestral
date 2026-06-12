import type { Command } from '../../commands.js'

const contextEngine = {
  type: 'local-jsx',
  name: 'context-engine',
  description: 'Context Engine Pro — AI-powered context management dashboard',
  load: () => import('./context-engine.js'),
} satisfies Command

export default contextEngine
