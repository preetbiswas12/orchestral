/**
 * Stub for @ant/computer-use-mcp/types
 * This is an internal Anthropic package not available publicly
 */

export interface CuPermissionRequest {
  tool: string
  action: string
  details?: Record<string, any>
  tccState?: any
}

export interface CuPermissionResponse {
  granted: any[]
  denied: any[]
  flags: Record<string, boolean>
  reason?: string
}

export interface CoordinateMode {
  type: 'absolute' | 'relative'
}

export type CoordinateModeValue = 'pixels' | 'normalized'

export interface CuSubGates {
  pixelValidation: boolean
  clipboardPasteMultiline: boolean
  mouseAnimation: boolean
  hideBeforeAction: boolean
  autoTargetDisplay: boolean
  clipboardGuard: boolean
  [key: string]: boolean
}

export const DEFAULT_GRANT_FLAGS = {
  allowScreenshot: false,
  allowClick: false,
  allowType: false,
  allowScroll: false,
  allowKey: false,
}

export interface Logger {
  silly(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export interface ComputerUseHostAdapter {
  serverName: string
  logger: Logger
  executor: any
  ensureOsPermissions: () => Promise<any>
}
