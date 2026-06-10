import { isEnvDefinedFalsy } from '../../utils/envUtils.js'

// --- Mocking the missing 'color-diff-napi' types and classes locally ---
export class ColorDiff {
  // Empty class stub to satisfy type and runtime existence check
}

export class ColorFile {
  // Empty class stub to satisfy type and runtime existence check
}

export interface SyntaxTheme {
  // Empty interface stub
}

function nativeGetSyntaxTheme(themeName: string): SyntaxTheme | null {
  return null // Safe no-op fallback
}
// -----------------------------------------------------------------------

export type ColorModuleUnavailableReason = 'env'

/**
 * Returns a static reason why the color-diff module is unavailable, or null if available.
 * 'env' = disabled via CLAUDE_CODE_SYNTAX_HIGHLIGHT
 *
 * The TS port of color-diff works in all build modes, so the only way to
 * disable it is via the env var.
 */
export function getColorModuleUnavailableReason(): ColorModuleUnavailableReason | null {
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SYNTAX_HIGHLIGHT)) {
    return 'env'
  }
  // Force it to look 'unavailable' so the app safely bypasses native rendering
  return 'env' 
}

export function expectColorDiff(): typeof ColorDiff | null {
  return getColorModuleUnavailableReason() === null ? ColorDiff : null
}

export function expectColorFile(): typeof ColorFile | null {
  return getColorModuleUnavailableReason() === null ? ColorFile : null
}

export function getSyntaxTheme(themeName: string): SyntaxTheme | null {
  return getColorModuleUnavailableReason() === null
    ? nativeGetSyntaxTheme(themeName)
    : null
}
