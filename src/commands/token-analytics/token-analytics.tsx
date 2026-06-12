import * as React from 'react'
import { TokenDashboard } from '../../components/TokenDashboard.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

export const call: LocalJSXCommandCall = async onDone => {
  return <TokenDashboard onClose={onDone} />
}
