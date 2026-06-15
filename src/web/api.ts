/**
 * Web Dashboard API
 *
 * REST API route handlers for the web dashboard.
 * Each handler reads from existing services and returns JSON.
 */

import { readFileSync, existsSync, statSync } from 'fs'
import { readdir, stat, readFile } from 'fs/promises'
import { join, basename, extname } from 'path'
import { getCwd } from '../utils/cwd.js'
import { getOriginalCwd } from '../bootstrap/state.js'
import { healthMonitor } from '../services/contextEngine/index.js'
import { agentOrchestrator } from '../services/agentOrchestrator.js'
import { WebSocketManager } from './realtime.js'
import {
  loadConfig,
  getEnabledProviders,
  getActiveProviderConfig,
  hasAnyProviderConfigured,
} from '../providers/config.js'
import { COMMANDS, findCommand } from '../commands.js'

// ── Types ──────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

// ── Helpers ────────────────────────────────────────────────────────

function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function errorResponse(error: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Route Handler ──────────────────────────────────────────────────

export async function handleApiRequest(
  req: Request,
  url: URL,
  _wsManager: WebSocketManager,
): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const path = url.pathname.replace('/api/', '')

  try {
    if (path === 'project' && req.method === 'GET') return handleProject()
    if (path === 'sessions' && req.method === 'GET') return handleSessions()
    if (path.startsWith('sessions/') && req.method === 'GET') return handleSessionDetail(path.replace('sessions/', ''))
    if (path === 'tokens' && req.method === 'GET') return handleTokens()
    if (path === 'files' && req.method === 'GET') return handleFiles(url)
    if (path.startsWith('files/') && req.method === 'GET') return handleFileContent(path.replace('files/', ''))
    if (path === 'agents' && req.method === 'GET') return handleAgents()
    if (path === 'context' && req.method === 'GET') return handleContext()
    if (path === 'commands' && req.method === 'GET') return handleCommands()
    if (path === 'command' && req.method === 'POST') return handleCommandExecute(req)
    if (path === 'health' && req.method === 'GET') return handleHealth()
    if (path === 'providers' && req.method === 'GET') return handleProviders()
    if (path === 'config' && req.method === 'GET') return handleConfig()

    return errorResponse('Not found', 404)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : String(err), 500)
  }
}

// ── Project ────────────────────────────────────────────────────────

async function handleProject(): Promise<Response> {
  const cwd = getCwd()
  const originalCwd = getOriginalCwd()

  let gitBranch: string | undefined
  let gitStatus: string | undefined
  try {
    const gitHeadPath = join(cwd, '.git', 'HEAD')
    if (existsSync(gitHeadPath)) {
      const head = readFileSync(gitHeadPath, 'utf8').trim()
      if (head.startsWith('ref: refs/heads/')) {
        gitBranch = head.replace('ref: refs/heads/', '')
      }
    }
    // Get git status summary
    const { execSync } = await import('child_process')
    try {
      const statusOutput = execSync('git status --porcelain', { cwd, timeout: 5000, encoding: 'utf8' }) as string
      const lines = statusOutput.trim().split('\n').filter(Boolean)
      if (lines.length > 0) {
        gitStatus = `${lines.length} changed file(s)`
      } else {
        gitStatus = 'clean'
      }
    } catch {
      gitStatus = undefined
    }
  } catch {
    // Git info unavailable
  }

  return jsonResponse({
    name: basename(cwd),
    path: cwd,
    originalPath: originalCwd,
    gitBranch,
    gitStatus,
  })
}

// ── Sessions ───────────────────────────────────────────────────────

async function handleSessions(): Promise<Response> {
  const cwd = getCwd()
  const sessionsDir = join(cwd, '.claude', 'sessions')

  if (!existsSync(sessionsDir)) {
    return jsonResponse({ sessions: [] })
  }

  try {
    const entries = await readdir(sessionsDir, { withFileTypes: true })
    const sessions = []

    for (const entry of entries.slice(0, 50)) {
      if (entry.isDirectory()) {
        const sessionPath = join(sessionsDir, entry.name)
        try {
          const stats = await stat(sessionPath)
          sessions.push({
            id: entry.name,
            name: entry.name,
            modified: stats.mtime.toISOString(),
            size: stats.size,
          })
        } catch {
          // Skip unreadable sessions
        }
      }
    }

    sessions.sort((a, b) => (b.modified > a.modified ? 1 : -1))
    return jsonResponse({ sessions })
  } catch {
    return jsonResponse({ sessions: [] })
  }
}

async function handleSessionDetail(sessionId: string): Promise<Response> {
  const cwd = getCwd()
  const sessionPath = join(cwd, '.claude', 'sessions', sessionId)

  if (!existsSync(sessionPath)) {
    return errorResponse('Session not found', 404)
  }

  try {
    const entries = await readdir(sessionPath)
    const transcriptFile = entries.find(f => f.endsWith('.jsonl'))
    let messageCount = 0
    let tokenCount = 0

    if (transcriptFile) {
      const content = await readFile(join(sessionPath, transcriptFile), 'utf8')
      const lines = content.split('\n').filter(Boolean)
      messageCount = lines.length
      tokenCount = Math.round(content.length / 4)
    }

    return jsonResponse({
      id: sessionId,
      messageCount,
      tokenCount,
      files: entries,
    })
  } catch {
    return errorResponse('Failed to read session', 500)
  }
}

// ── Tokens ─────────────────────────────────────────────────────────

function handleTokens(): Promise<Response> {
  const health = healthMonitor.getHealth()
  const stats = agentOrchestrator.getStats()

  return Promise.resolve(jsonResponse({
    context: {
      percentage: health.current.percentage,
      totalTokens: health.current.totalTokens,
      maxTokens: health.current.maxTokens,
      status: health.status,
      trend: health.trend,
      tokensPerMinute: Math.round(health.tokensPerMinute),
      estimatedMinutesUntilFull: health.estimatedMinutesUntilFull,
      compactionCount: health.compactionCount,
      avgTokensSaved: health.avgTokensSavedPerCompaction,
    },
    agents: {
      totalSwarms: stats.totalSwarms,
      activeSwarms: stats.activeSwarms,
      totalAgents: stats.totalAgents,
      totalTokens: stats.totalTokens,
      avgDuration: stats.avgDuration,
    },
    history: health.history.slice(-20).map(h => ({
      timestamp: h.timestamp,
      percentage: h.percentage,
      tokens: h.totalTokens,
      messages: h.messageCount,
    })),
  }))
}

// ── Files ──────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.cache', '__pycache__', '.venv', 'vendor', '.claude'])
const SKIP_EXTENSIONS = new Set(['.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'])

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  modified?: string
}

async function handleFiles(url: URL): Promise<Response> {
  const cwd = getCwd()
  const subPath = url.searchParams.get('path') ?? ''
  const targetPath = join(cwd, subPath)

  if (!targetPath.startsWith(cwd)) {
    return errorResponse('Access denied', 403)
  }

  try {
    const entries = await readdir(targetPath, { withFileTypes: true })
    const files: FileEntry[] = []

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue
      if (!entry.isDirectory() && SKIP_EXTENSIONS.has(extname(entry.name))) continue

      const entryPath = join(subPath, entry.name)
      const fileInfo: FileEntry = {
        name: entry.name,
        path: entryPath,
        isDirectory: entry.isDirectory(),
      }

      if (!entry.isDirectory()) {
        try {
          const fileStats = await stat(join(targetPath, entry.name))
          fileInfo.size = fileStats.size
          fileInfo.modified = fileStats.mtime.toISOString()
        } catch {
          // Skip unreadable files
        }
      }

      files.push(fileInfo)
    }

    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return jsonResponse({ files, path: subPath })
  } catch {
    return errorResponse('Failed to read directory', 500)
  }
}

async function handleFileContent(filePath: string): Promise<Response> {
  const cwd = getCwd()
  const fullPath = join(cwd, filePath)

  if (!fullPath.startsWith(cwd)) {
    return errorResponse('Access denied', 403)
  }

  if (!existsSync(fullPath)) {
    return errorResponse('File not found', 404)
  }

  try {
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      return errorResponse('Cannot read directory', 400)
    }
    if (stats.size > 1_000_000) {
      return errorResponse('File too large (>1MB)', 400)
    }

    const content = await readFile(fullPath, 'utf8')
    return jsonResponse({ content, size: stats.size, modified: stats.mtime.toISOString() })
  } catch {
    return errorResponse('Failed to read file', 500)
  }
}

// ── Agents ─────────────────────────────────────────────────────────

function handleAgents(): Promise<Response> {
  const swarms = agentOrchestrator.listSwarms()
  const stats = agentOrchestrator.getStats()

  return Promise.resolve(jsonResponse({
    swarms: swarms.map(s => ({
      id: s.swarmId,
      name: s.name,
      status: s.status,
      agentCount: s.agents.length,
      completedCount: s.agents.filter(a => a.status === 'completed').length,
      runningCount: s.agents.filter(a => a.status === 'running').length,
      totalTokens: s.totalTokens,
      duration: s.totalDuration,
      mergeStrategy: s.config.mergeStrategy,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
      agents: s.agents.map(a => ({
        id: a.agentId,
        name: a.name,
        status: a.status,
        tokensUsed: a.tokensUsed,
        duration: a.duration,
        outputPreview: a.output.slice(0, 200),
      })),
    })),
    stats,
  }))
}

// ── Context ────────────────────────────────────────────────────────

function handleContext(): Promise<Response> {
  const health = healthMonitor.getHealth()
  const healthBar = healthMonitor.getHealthBar(30)

  return Promise.resolve(jsonResponse({
    health: {
      status: health.status,
      percentage: health.current.percentage,
      totalTokens: health.current.totalTokens,
      maxTokens: health.current.maxTokens,
      trend: health.trend,
      tokensPerMinute: Math.round(health.tokensPerMinute),
      estimatedMinutesUntilFull: health.estimatedMinutesUntilFull,
      compactionCount: health.compactionCount,
      avgTokensSaved: health.avgTokensSavedPerCompaction,
    },
    bar: healthBar,
  }))
}

// ── Commands ───────────────────────────────────────────────────────

function handleCommands(): Promise<Response> {
  // Build the command list from the actual COMMANDS registry so the
  // dashboard always shows what's really available.
  try {
    const allCommands = COMMANDS()
    const commandList = allCommands
      .filter(cmd => cmd.type === 'local-jsx' || cmd.type === 'local' || cmd.type === 'prompt')
      .filter(cmd => {
        // Skip internal-only commands
        const cmdName = cmd.name || ''
        return !cmdName.startsWith('_') && cmdName.length > 0
      })
      .map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        type: cmd.type,
        category: cmd.type === 'prompt' ? 'prompt' : 'interactive',
      }))
      .slice(0, 50) // Cap at 50 to keep the response manageable

    return Promise.resolve(jsonResponse({ commands: commandList }))
  } catch {
    // Fallback to static list if COMMANDS() fails
    return Promise.resolve(jsonResponse({
      commands: [
        { name: 'auto', description: 'AI-powered command orchestrator', type: 'local-jsx', category: 'automation' },
        { name: 'batch', description: 'Apply operations across multiple files', type: 'local-jsx', category: 'automation' },
        { name: 'code-review', description: 'Review code for bugs, security, performance', type: 'local-jsx', category: 'analysis' },
        { name: 'context-engine', description: 'Context Engine Pro dashboard', type: 'local-jsx', category: 'context' },
        { name: 'agent-dashboard', description: 'Multi-Agent Dashboard', type: 'local-jsx', category: 'agents' },
        { name: 'scaffold', description: 'Create a new project from templates', type: 'local-jsx', category: 'project' },
        { name: 'token-analytics', description: 'View token usage analytics and costs', type: 'local-jsx', category: 'analytics' },
        { name: 'compact', description: 'Compact conversation context', type: 'local-jsx', category: 'session' },
        { name: 'model', description: 'Switch the active AI model', type: 'local-jsx', category: 'config' },
        { name: 'theme', description: 'Change the color theme', type: 'local-jsx', category: 'config' },
        { name: 'diff', description: 'View changes', type: 'local-jsx', category: 'git' },
        { name: 'help', description: 'Show help', type: 'local-jsx', category: 'help' },
      ],
    }))
  }
}

// ── Command Execute ────────────────────────────────────────────────

async function handleCommandExecute(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { command: string; args?: string }
    if (!body.command) {
      return errorResponse('Command name is required')
    }

    // Look up the command in the registry
    const allCommands = COMMANDS()
    const cmd = findCommand(body.command, allCommands)

    if (!cmd) {
      return errorResponse(`Command "${body.command}" not found in registry`, 404)
    }

    // Check if the command can be dispatched
    if (cmd.type === 'prompt') {
      // Prompt commands can be expanded — return the info
      return jsonResponse({
        message: `Command "${body.command}" is a prompt-type command. It expands to a text prompt that gets sent to the AI model in the TUI. Prompt commands need an active session to execute.`,
        command: body.command,
        args: body.args ?? '',
        commandType: cmd.type,
        note: 'To use this command, type it directly in the TUI prompt.',
      })
    }

    if (cmd.type === 'local' || cmd.type === 'local-jsx') {
      // These commands render TUI UI — they can't run in the web dashboard
      return jsonResponse({
        message: `Command "${body.command}" is a TUI-interactive command (${cmd.type}). It requires the terminal UI and cannot be executed from the web dashboard.`,
        command: body.command,
        args: body.args ?? '',
        commandType: cmd.type,
        note: `Type /${body.command} in the TUI to use this command.`,
      })
    }

    return jsonResponse({
      message: `Command "${body.command}" has type "${cmd.type}" — not executable from the web dashboard.`,
      command: body.command,
      args: body.args ?? '',
      commandType: cmd.type,
    })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('Invalid request body: expected JSON')
    }
    return errorResponse('Internal server error', 500)
  }
}

// ── Providers ──────────────────────────────────────────────────────

function handleProviders(): Promise<Response> {
  try {
    const config = loadConfig()
    const enabledProviders = getEnabledProviders()
    const active = getActiveProviderConfig()

    // Return provider info without exposing API keys
    const providers = Object.entries(config.providers).map(([id, cfg]) => ({
      id,
      enabled: cfg.enabled,
      model: cfg.defaultModel,
      baseUrl: cfg.baseUrl,
      is_active: id === config.activeProvider,
      has_api_key: !!cfg.apiKey,
    }))

    return jsonResponse({
      active: active.id,
      active_has_key: !!active.config.apiKey,
      enabled_count: enabledProviders.length,
      configured: hasAnyProviderConfigured(),
      providers,
    })
  } catch (err) {
    return jsonResponse({
      active: null,
      active_has_key: false,
      enabled_count: 0,
      configured: false,
      providers: [],
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ── Config ─────────────────────────────────────────────────────────

function handleConfig(): Promise<Response> {
  try {
    const config = loadConfig()
    const cwd = getCwd()

    // Return safe config info (no API keys)
    return jsonResponse({
      activeProvider: config.activeProvider,
      configured: hasAnyProviderConfigured(),
      enabledProviders: getEnabledProviders(),
      project: {
        name: basename(cwd),
        path: cwd,
      },
      features: {
        multiProvider: true,
        agentSwarm: true,
        contextEngine: true,
        webDashboard: true,
      },
    })
  } catch (err) {
    return errorResponse(`Failed to load config: ${err instanceof Error ? err.message : String(err)}`, 500)
  }
}

// ── Health ─────────────────────────────────────────────────────────

function handleHealth(): Promise<Response> {
  return Promise.resolve(jsonResponse({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    bun_version: process.version,
    platform: process.platform,
  }))
}
