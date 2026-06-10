// Stub for protectedNamespace.js
// This would normally contain protected env vars logic

export function getProtectedNamespaces(): string[] {
  return []
}

export function isProtectedEnvVar(key: string): boolean {
  return false
}

export default {
  getProtectedNamespaces,
  isProtectedEnvVar,
}
