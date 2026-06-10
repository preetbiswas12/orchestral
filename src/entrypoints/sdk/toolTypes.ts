/**
 * SDK Tool Types - Types for tool definitions
 * @internal - Until SDK API stabilizes
 */

import type { z } from 'zod/v4'

export interface ToolParameter {
  name: string
  type: string
  description?: string
  required?: boolean
}

export interface ToolSchema {
  name: string
  description: string
  parameters?: ToolParameter[]
}

export type AnyToolSchema = ToolSchema & Record<string, unknown>
