/**
 * Stub for @ant/computer-use-mcp
 * This is an internal Anthropic package not available publicly
 */

export const API_RESIZE_PARAMS = {
  width: 1280,
  height: 800,
}

export function targetImageSize(_width: number, _height: number): { width: number; height: number } {
  return { width: 1280, height: 800 }
}

export function buildComputerUseTools(_options: any): any[] {
  return []
}

export function bindSessionContext(_context: any): void {}

export function startMcpServer(_options: any): any {
  return {
    close: () => {},
  }
}

export const DEFAULT_GRANT_FLAGS = {
  allowScreenshot: false,
  allowClick: false,
  allowType: false,
  allowScroll: false,
  allowKey: false,
}

// Types
export interface ComputerUseSessionContext {
  [key: string]: any
}

export interface CuCallToolResult {
  success: boolean
  error?: string
}

export interface CuPermissionRequest {
  tool: string
  action: string
}

export interface CuPermissionResponse {
  granted: any[]
  denied: any[]
  flags: Record<string, boolean>
}

export interface ScreenshotDims {
  width: number
  height: number
}

// Executor types
export interface ComputerExecutor {
  click: (x: number, y: number) => Promise<void>
  doubleClick: (x: number, y: number) => Promise<void>
  type: (text: string) => Promise<void>
  key: (key: string) => Promise<void>
  keys: (keys: string[]) => Promise<void>
  scroll: (x: number, y: number, amount: number) => Promise<void>
  moveMouse: (x: number, y: number) => Promise<void>
  screenshot: () => Promise<Buffer>
  listInstalledApps: () => Promise<InstalledApp[]>
  listRunningApps: () => Promise<RunningApp[]>
  getFrontmostApp: () => Promise<FrontmostApp | null>
  getDisplayGeometry: () => Promise<DisplayGeometry>
  resolvePrepareCapture: (options: any) => Promise<ResolvePrepareCaptureResult>
}

export interface DisplayGeometry {
  width: number
  height: number
  scale: number
}

export interface FrontmostApp {
  bundleId: string
  name: string
  pid: number
}

export interface InstalledApp {
  bundleId: string
  name: string
  path: string
}

export interface RunningApp {
  bundleId: string
  name: string
  pid: number
}

export interface ScreenshotResult {
  data: Buffer
  width: number
  height: number
}

export interface ResolvePrepareCaptureResult {
  success: boolean
  error?: string
}
