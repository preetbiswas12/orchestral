import type { Command } from '../../commands.js'

const web = {
  type: 'local-jsx',
  name: 'web',
  description: 'Open the Web Dashboard — browser-accessible project overview',
  load: () => import('./web.js'),
} satisfies Command

export default web
