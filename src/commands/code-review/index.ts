import type { Command } from '../../commands.js'

const codeReview = {
  type: 'local-jsx',
  name: 'code-review',
  description: 'Pattern-based code review — checks for security, performance, style, and bug patterns',
  load: () => import('./code-review.js'),
} satisfies Command

export default codeReview
