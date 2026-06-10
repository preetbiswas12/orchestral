/**
 * SDK Control Types - Types for control protocol (SDK builders)
 */

export interface SDKControlRequest {
  type: string
  requestId: string
  payload?: unknown
}

export interface SDKControlResponse {
  type: string
  requestId: string
  success: boolean
  error?: string
  payload?: unknown
}
