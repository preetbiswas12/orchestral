/**
 * Custom Update System for Claude Code Fork
 * 
 * Checks for updates from our git repository and applies them
 * without losing user configurations.
 */

import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'
import { logForDebugging } from '../utils/debug.js'

const execAsync = promisify(exec)

// Configuration
const REPO_URL = 'https://git.justw.tf/LightZirconite/claude-code'
const VERSION_FILE_URL = `${REPO_URL}/raw/branch/main/VERSION.txt`
const UPDATE_CHECK_FILE = join(getClaudeConfigHomeDir(), 'last_update_check.json')

// Check interval: every 24 hours
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  lastChecked: number
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string | null
  error?: string
}

/**
 * Get current version from local VERSION.txt file
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const versionFile = join(process.cwd(), 'VERSION.txt')
    if (!existsSync(versionFile)) {
      // Fallback to package.json version or MACRO.VERSION
      return (globalThis as any).MACRO?.VERSION || '1.0.0'
    }
    const content = await readFile(versionFile, 'utf-8')
    return content.trim()
  } catch (error) {
    logForDebugging('[CustomUpdate] Failed to read local version:', error)
    return '1.0.0'
  }
}

/**
 * Fetch latest version from git repository
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(VERSION_FILE_URL, {
      headers: {
        'User-Agent': 'ClaudeCodeCustomUpdater/1.0',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const content = await response.text()
    return content.trim()
  } catch (error) {
    logForDebugging('[CustomUpdate] Failed to fetch latest version:', error)
    return null
  }
}

/**
 * Compare two version strings (simple semantic versioning)
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  
  return 0
}

/**
 * Check if an update is available
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = await getCurrentVersion()
  const latestVersion = await getLatestVersion()
  
  if (!latestVersion) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: null,
      error: 'Failed to fetch latest version',
    }
  }
  
  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0
  
  return {
    hasUpdate,
    currentVersion,
    latestVersion,
  }
}

/**
 * Get last update check info
 */
export async function getLastUpdateCheck(): Promise<UpdateInfo | null> {
  try {
    if (!existsSync(UPDATE_CHECK_FILE)) {
      return null
    }
    
    const content = await readFile(UPDATE_CHECK_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    return null
  }
}

/**
 * Save update check info
 */
export async function saveUpdateCheck(info: UpdateInfo): Promise<void> {
  try {
    await writeFile(UPDATE_CHECK_FILE, JSON.stringify(info, null, 2), 'utf-8')
  } catch (error) {
    logForDebugging('[CustomUpdate] Failed to save update check:', error)
  }
}

/**
 * Check if we should check for updates (not checked in last 24h)
 */
export async function shouldCheckForUpdates(): Promise<boolean> {
  const lastCheck = await getLastUpdateCheck()
  
  if (!lastCheck) {
    return true
  }
  
  const timeSinceLastCheck = Date.now() - lastCheck.lastChecked
  return timeSinceLastCheck > CHECK_INTERVAL_MS
}

/**
 * Perform update check and save result
 */
export async function performUpdateCheck(): Promise<UpdateCheckResult> {
  const result = await checkForUpdate()
  
  const info: UpdateInfo = {
    currentVersion: result.currentVersion,
    latestVersion: result.latestVersion || result.currentVersion,
    hasUpdate: result.hasUpdate,
    lastChecked: Date.now(),
  }
  
  await saveUpdateCheck(info)
  
  return result
}

/**
 * Download and apply update from git repository
 * Preserves user configurations in ~/.claude/
 */
export async function applyUpdate(): Promise<{ success: boolean; error?: string }> {
  try {
    logForDebugging('[CustomUpdate] Starting update process...')
    
    const currentDir = process.cwd()
    
    // 1. Backup current providers directory
    logForDebugging('[CustomUpdate] Backing up providers...')
    try {
      await execAsync('cp -r src/providers src/providers.backup')
    } catch {
      // Backup might fail if providers.backup already exists, ignore
    }
    
    // 2. Clone latest version to temp directory
    const tempDir = join(getClaudeConfigHomeDir(), 'update_temp')
    logForDebugging('[CustomUpdate] Cloning latest version...')
    
    try {
      // Remove temp dir if exists
      await execAsync(`rm -rf "${tempDir}"`)
    } catch {
      // Ignore if doesn't exist
    }
    
    await execAsync(`git clone --depth 1 "${REPO_URL}" "${tempDir}"`)
    
    // 3. Copy new files, excluding configuration
    logForDebugging('[CustomUpdate] Applying updates...')
    
    // Exclude: node_modules, .git, user configs
    const excludes = [
      '--exclude=node_modules',
      '--exclude=.git',
      '--exclude=.gitignore',
      '--exclude=dist',
      '--exclude=*.log',
    ]
    
    await execAsync(`rsync -av ${excludes.join(' ')} "${tempDir}/" "${currentDir}/"`)
    
    // 4. Restore providers directory (our custom code)
    logForDebugging('[CustomUpdate] Restoring custom providers...')
    await execAsync('rm -rf src/providers')
    await execAsync('mv src/providers.backup src/providers')
    
    // 5. Install dependencies if package.json changed
    logForDebugging('[CustomUpdate] Checking dependencies...')
    try {
      await execAsync('npm install --quiet')
    } catch {
      // Fallback to bun if npm fails
      try {
        await execAsync('bun install')
      } catch {
        logForDebugging('[CustomUpdate] Warning: Failed to install dependencies')
      }
    }
    
    // 6. Cleanup
    logForDebugging('[CustomUpdate] Cleaning up...')
    await execAsync(`rm -rf "${tempDir}"`)
    
    // 7. Update version check
    const newVersion = await getCurrentVersion()
    await saveUpdateCheck({
      currentVersion: newVersion,
      latestVersion: newVersion,
      hasUpdate: false,
      lastChecked: Date.now(),
    })
    
    logForDebugging('[CustomUpdate] Update completed successfully!')
    
    return { success: true }
  } catch (error) {
    logForDebugging('[CustomUpdate] Update failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Auto-check for updates on startup (non-blocking)
 */
export async function autoCheckForUpdatesOnStartup(): Promise<void> {
  // Run in background, don't block startup
  setTimeout(async () => {
    try {
      const shouldCheck = await shouldCheckForUpdates()
      if (shouldCheck) {
        const result = await performUpdateCheck()
        if (result.hasUpdate) {
          logForDebugging(
            `[CustomUpdate] Update available: ${result.currentVersion} → ${result.latestVersion}`,
          )
          logForDebugging('[CustomUpdate] Run /update to install')
        }
      }
    } catch (error) {
      // Silent fail, don't interrupt user
      logForDebugging('[CustomUpdate] Background check failed:', error)
    }
  }, 5000) // Wait 5 seconds after startup
}

/**
 * Disable Anthropic's auto-updater (always returns disabled)
 */
export function isAnthropicAutoUpdaterDisabled(): boolean {
  return true // Always disabled
}
