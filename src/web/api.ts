/**
 * Web Dashboard API
 *
 * REST API route handlers for the web dashboard.
 * Each handler reads from existing services and returns JSON.
 */

import { readFileSync, existsSync, statSync } from 'fs'
import { readdir, stat, readFile } from 'fs/promises'
import { join, basename, relative, extname } from 'path'
import { getCwd } from '../utils/cwd.js'
import { getOriginalCwd } from '../bootstrap/state.js'
import { healthMonitor } from '../services/contextEngine/index.js'
import { agentOrchestrator } from '../services/agentOrchestrator.js'
import { WebSocketManager } from './realtime.js'

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
    // Route matching
    if (path === 'project' && req.method === 'GET') {
      return handleProject()
    }
    if (path === 'sessions' && req.method === 'GET') {
      return handleSessions()
    }
    if (path.startsWith('sessions/') && req.method === 'GET') {
      return handleSessionDetail(path.replace('sessions/', ''))
    }
    if (path === 'tokens' && req.method === 'GET') {
      return handleTokens()
    }
    if (path === 'files' && req.method === 'GET') {
      return handleFiles(url)
    }
    if (path.startsWith('files/') && req.method === 'GET') {
      return handleFileContent(path.replace('files/', ''))
    }
    if (path === 'agents' && req.method === 'GET') {
      return handleAgents()
    }
    if (path === 'context' && req.method === 'GET') {
      return handleContext()
    }
    if (path === 'commands' && req.method === 'GET') {
      return handleCommands()
    }
    if (path === 'command' && req.method === 'POST') {
      return handleCommandExecute(req)
    }
    if (path === 'health' && req.method === 'GET') {
      return handleHealth()
    }

    return errorResponse('Not found', 404)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : String(err), 500)
  }
}

// ── Project ────────────────────────────────────────────────────────

async function handleProject(): Promise<Response> {
  const cwd = getCwd()
  const originalCwd = getOriginalCwd()

  // Try to get git info
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
      // Rough token estimate
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
  children?: FileEntry[]
}

async function handleFiles(url: URL): Promise<Response> {
  const cwd = getCwd()
  const subPath = url.searchParams.get('path') ?? ''
  const targetPath = join(cwd, subPath)

  // Security: ensure we don't escape the project directory
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
      let fileInfo: FileEntry = {
        name: entry.name,
        path: entryPath,
        isDirectory: entry.isDirectory(),
      }

      if (!entry.isDirectory()) {
        try {
          const stats = await stat(join(targetPath, entry.name))
          fileInfo.size = stats.size
          fileInfo.modified = stats.mtime.toISOString()
        } catch {
          // Skip unreadable files
        }
      }

      files.push(fileInfo)
    }

    // Sort: directories first, then by name
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
  // Return a safe subset of command info (not the full Command objects which may contain functions)
  const commandList = [
    { name: 'auto', description: 'AI-powered command orchestrator', category: 'automation' },
    { name: 'batch', description: 'Apply operations across multiple files', category: 'automation' },
    { name: 'changelog', description: 'Auto-generate changelog from git history', category: 'git' },
    { name: 'code-review', description: 'Review code for bugs, security, performance', category: 'analysis' },
    { name: 'commit-gen', description: 'Generate conventional commit messages', category: 'git' },
    { name: 'context-engine', description: 'Context Engine Pro dashboard', category: 'context' },
    { name: 'agent-dashboard', description: 'Multi-Agent Dashboard', category: 'agents' },
    { name: 'docs', description: 'Auto-generate documentation', category: 'documentation' },
    { name: 'scaffold', description: 'Create a new project from templates', category: 'project' },
    { name: 'sessions', description: 'Browse and manage past sessions', category: 'management' },
    { name: 'snippets', description: 'Manage code snippets library', category: 'productivity' },
    { name: 'test', description: 'Run the project test suite', category: 'testing' },
    { name: 'token-analytics', description: 'View token usage analytics and costs', category: 'analytics' },
    { name: 'provider-setup', description: 'Configure AI providers', category: 'config' },
    { name: 'compact', description: 'Compact conversation context', category: 'session' },
    { name: 'diff', description: 'View changes between working tree, staged, or branches', category: 'git' },
    { name: 'model', description: 'Switch the active AI model', category: 'config' },
    { name: 'theme', description: 'Change the color theme', category: 'config' },
    { name: 'web', description: 'Open the Web Dashboard', category: 'web' },
  ]

  return Promise.resolve(jsonResponse({ commands: commandList }))
}

async function handleCommandExecute(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { command: string; args?: string }
    if (!body.command) {
      return errorResponse('Command name is required')
    }

    // In a real implementation, this would dispatch to the command system
    // For now, return a placeholder — the TUI handles actual execution
    return jsonResponse({
      message: `Command "${body.command}" received. Use the TUI for full execution.`,
      command: body.command,
      args: body.args ?? '',
    })
  } catch {
    return errorResponse('Invalid request body')
  }
}

// ── Health ─────────────────────────────────────────────────────────

function handleHealth(): Promise<Response> {
  return Promise.resolve(jsonResponse({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }))
}
