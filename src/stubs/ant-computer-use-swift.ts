/**
 * Stub for @ant/computer-use-swift
 * This is an internal Anthropic package for macOS only (not available publicly)
 */

export interface ComputerUseAPI {
  screenshot: () => Promise<Buffer | null>
  getRunningApps: () => string[]
  checkTccPermission: (permission: string) => boolean
  requestTccPermission: (permission: string) => boolean
}

export function getComputerUseAPI(): ComputerUseAPI | null {
  return null
}
