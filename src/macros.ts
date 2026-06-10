/**
 * MACRO definitions
 * 
 * This file defines the MACRO object that is normally injected at build time.
 * For development without a full build process, we provide default values.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// Try to read version from VERSION.txt
function getVersion(): string {
  try {
    const versionPath = join(process.cwd(), 'VERSION.txt')
    return readFileSync(versionPath, 'utf-8').trim()
  } catch {
    return '1.0.0-dev'
  }
}

// Define MACRO globally
;(globalThis as any).MACRO = {
  VERSION: getVersion(),
  BUILD_TIME: new Date().toISOString(),
  VERSION_CHANGELOG: []
}
