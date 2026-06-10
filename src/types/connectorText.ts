/**
 * Stub for connectorText.ts (not in leaked source)
 * Contains types for connector text formatting
 */

export interface ConnectorText {
  type: 'text' | 'code' | 'markdown'
  content: string
}

export type ConnectorTextBlock = ConnectorText | string

export function formatConnectorText(text: ConnectorTextBlock): string {
  if (typeof text === 'string') {
    return text
  }
  return text.content
}

export function isConnectorText(value: unknown): value is ConnectorText {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'content' in value
  )
}
