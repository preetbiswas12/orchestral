import type { Command } from '../../commands.js'

const testCmd = {
  type: 'local-jsx',
  name: 'test',
  description: 'Run tests with auto-detection, results parsing, and auto-fix suggestions',
  load: () => import('./test.js'),
} satisfies Command

export default testCmd
