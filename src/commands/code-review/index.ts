import type { Command } from '../../commands.js'

const codeReview = {
  type: 'local-jsx',
  name: 'code-review',
  description: 'AI-powered code review with security, performance, and style analysis',
  load: () => import('./code-review.js'),
} satisfies Command

export default codeReview
