import type { Command } from '../../commands.js'

const scaffold = {
  type: 'local-jsx',
  name: 'scaffold',
  description: 'Scaffold new projects from templates (React, Next.js, Node, Python, Rust, Go)',
  load: () => import('./scaffold.js'),
} satisfies Command

export default scaffold
