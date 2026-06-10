/**
 * Generated Settings Types
 * These types are generated from settings JSON schema
 */

export interface Settings {
  // Core settings
  model?: string
  maxTokens?: number
  temperature?: number
  
  // API settings
  apiKey?: string
  baseUrl?: string
  
  // Permission settings
  dangerouslySkipPermissions?: boolean
  
  // Session settings
  sessionDir?: string
  
  // MCP settings
  mcpServers?: Record<string, unknown>
  
  // Other settings
  [key: string]: unknown
}
