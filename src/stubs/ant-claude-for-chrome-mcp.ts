/**
 * Stub for @ant/claude-for-chrome-mcp
 * This is an internal Anthropic package not available publicly
 */

export const BROWSER_TOOLS: any[] = []

export class ClaudeForChromeContext {
  static getSocketPaths(): string[] {
    return []
  }
}

export function startMcpServer(_options: any): any {
  return {
    close: () => {},
  }
}

export function connectToExtension(_options: any): any {
  return null
}
