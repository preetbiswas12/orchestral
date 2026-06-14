/**
 * GitHub API Service
 *
 * Wraps `gh` CLI commands with structured JSON output, caching, and error handling.
 * All operations go through the existing `gh` CLI — no new dependencies required.
 *
 * Requires: `gh auth login` to be configured
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import type {
  PR, Issue, Workflow, Run, Notification, CheckStatus,
  PRFilter, IssueFilter, RunFilter,
  CreatePRParams, CreateIssueParams, GitHubError,
} from './types.js'

const execAsync = promisify(exec)

// ── Cache ──────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL_MS = 30_000 // 30 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

function clearCache(): void {
  cache.clear()
}

// ── gh CLI Wrapper ─────────────────────────────────────────────────

async function gh(args: string, options?: { timeout?: number; noCache?: boolean }): Promise<string> {
  const cacheKey = `gh:${args}`
  if (!options?.noCache) {
    const cached = getCached<string>(cacheKey)
    if (cached) return cached
  }

  try {
    const { stdout, stderr } = await execAsync(`gh ${args}`, {
      timeout: options?.timeout ?? 30_000,
      maxBuffer: 10 * 1024 * 1024, // 10MB for large diffs
    })

    if (stderr && !stdout) {
      throw parseGhError(stderr)
    }

    const result = stdout.trim()
    if (!options?.noCache) {
      setCache(cacheKey, result)
    }
    return result
  } catch (err) {
    if (err instanceof Error && 'stderr' in err) {
      throw parseGhError(String((err as any).stderr))
    }
    if (err instanceof Error && 'stdout' in err) {
      // Command returned non-zero but has output — might be valid JSON
      const output = String((err as any).stdout).trim()
      if (output) return output
    }
    throw parseGhError(err instanceof Error ? err.message : String(err))
  }
}

function parseGhError(stderr: string): GitHubError {
  if (stderr.includes('not logged in') || stderr.includes('authentication')) {
    return { code: 'AUTH_REQUIRED', message: 'Not authenticated with GitHub. Run: gh auth login', suggestion: 'gh auth login' }
  }
  if (stderr.includes('Could not resolve') || stderr.includes('404')) {
    return { code: 'NOT_FOUND', message: 'Resource not found on GitHub', suggestion: 'Check the PR/issue number and repository' }
  }
  if (stderr.includes('rate limit') || stderr.includes('403')) {
    return { code: 'RATE_LIMITED', message: 'GitHub API rate limit exceeded', suggestion: 'Wait a few minutes and try again' }
  }
  if (stderr.includes('permission') || stderr.includes('401')) {
    return { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for this operation', suggestion: 'Check your GitHub token scopes' }
  }
  return { code: 'UNKNOWN', message: stderr.slice(0, 200) }
}

async function ghJson<T>(args: string): Promise<T> {
  const output = await gh(`${args} --json ${getJsonFields(args)}`)
  try {
    return JSON.parse(output) as T
  } catch {
    // If JSON parse fails, try wrapping single objects
    try {
      return JSON.parse(`[${output}]`) as T
    } catch {
      throw { code: 'UNKNOWN', message: 'Failed to parse gh CLI output', suggestion: 'Ensure gh CLI is up to date' } as GitHubError
    }
  }
}

function getJsonFields(args: string): string {
  // Return appropriate --json fields based on command
  if (args.startsWith('pr list')) return 'number,title,state,author,headRefName,baseRefName,isDraft,mergeable,createdAt,updatedAt,closedAt,comments,additions,deletions,labels,assignees,url'
  if (args.startsWith('pr view')) return 'number,title,state,body,author,headRefName,baseRefName,isDraft,mergeable,mergeStateStatus,reviewDecision,createdAt,updatedAt,closedAt,mergedAt,comments,reviewComments,additions,deletions,changedFiles,labels,assignees,reviews,commits,url'
  if (args.startsWith('issue list')) return 'number,title,state,author,labels,assignees,createdAt,updatedAt,closedAt,comments,url'
  if (args.startsWith('issue view')) return 'number,title,state,body,author,labels,assignees,milestone,createdAt,updatedAt,closedAt,comments,url'
  if (args.startsWith('run list')) return 'id,name,status,conclusion,workflowId,headBranch,headSha,event,createdAt,updatedAt,url,checkSuiteId'
  if (args.startsWith('run view')) return 'id,name,status,conclusion,workflowId,headBranch,headSha,event,createdAt,updatedAt,url,checkSuiteId,jobs'
  if (args.startsWith('workflow list')) return 'id,name,state,path,createdAt,updatedAt'
  return ''
}

// ── PR Operations ──────────────────────────────────────────────────

export async function listPRs(filter: PRFilter = {}): Promise<PR[]> {
  const cacheKey = `prs:${JSON.stringify(filter)}`
  const cached = getCached<PR[]>(cacheKey)
  if (cached) return cached

  const args = ['pr', 'list']
  if (filter.state && filter.state !== 'open') args.push('--state', filter.state)
  if (filter.author) args.push('--author', filter.author)
  if (filter.label) args.push('--label', filter.label)
  if (filter.search) args.push('--search', filter.search)
  if (filter.limit) args.push('--limit', String(filter.limit))
  if (filter.sort) args.push('--sort', filter.sort)
  if (filter.direction) args.push('--direction', filter.direction)

  const result = await ghJson<PR[]>(args.join(' '))
  setCache(cacheKey, result)
  return result
}

export async function getPR(number: number): Promise<PR> {
  return ghJson<PR>(`pr view ${number}`)
}

export async function createPR(params: CreatePRParams): Promise<PR> {
  const args = ['pr', 'create', '--title', params.title]
  if (params.body) args.push('--body', params.body)
  if (params.base) args.push('--base', params.base)
  if (params.head) args.push('--head', params.head)
  if (params.draft) args.push('--draft')
  if (params.reviewers?.length) args.push('--reviewer', params.reviewers.join(','))
  if (params.assignees?.length) args.push('--assignee', params.assignees.join(','))
  if (params.labels?.length) args.push('--label', params.labels.join(','))

  clearCache()
  const output = await gh(args.join(' '))
  // gh pr create outputs the URL
  const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/(\d+)/)
  if (urlMatch) {
    return getPR(parseInt(urlMatch[1]))
  }
  return { number: 0, title: params.title, state: 'open', url: output, body: params.body ?? '', author: { login: '' }, headRefName: '', baseRefName: '', isDraft: params.draft ?? false, mergeable: '', mergeStateStatus: '', reviewDecision: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: 0, reviewComments: 0, additions: 0, deletions: 0, changedFiles: 0, labels: [], assignees: [], reviews: [], commits: [] }
}

export async function mergePR(number: number, method: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<void> {
  await gh(`pr merge ${number} --${method} --delete-branch`, { noCache: true })
  clearCache()
}

export async function closePR(number: number): Promise<void> {
  await gh(`pr close ${number}`, { noCache: true })
  clearCache()
}

export async function addPRComment(number: number, body: string): Promise<void> {
  await gh(`pr comment ${number} --body "${body.replace(/"/g, '\\"')}"`, { noCache: true })
  clearCache()
}

// ── Issue Operations ───────────────────────────────────────────────

export async function listIssues(filter: IssueFilter = {}): Promise<Issue[]> {
  const cacheKey = `issues:${JSON.stringify(filter)}`
  const cached = getCached<Issue[]>(cacheKey)
  if (cached) return cached

  const args = ['issue', 'list']
  if (filter.state && filter.state !== 'open') args.push('--state', filter.state)
  if (filter.author) args.push('--author', filter.author)
  if (filter.assignee) args.push('--assignee', filter.assignee)
  if (filter.label) args.push('--label', filter.label)
  if (filter.search) args.push('--search', filter.search)
  if (filter.limit) args.push('--limit', String(filter.limit))
  if (filter.sort) args.push('--sort', filter.sort)
  if (filter.direction) args.push('--direction', filter.direction)

  const result = await ghJson<Issue[]>(args.join(' '))
  setCache(cacheKey, result)
  return result
}

export async function getIssue(number: number): Promise<Issue> {
  return ghJson<Issue>(`issue view ${number}`)
}

export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  const args = ['issue', 'create', '--title', params.title]
  if (params.body) args.push('--body', params.body)
  if (params.assignees?.length) args.push('--assignee', params.assignees.join(','))
  if (params.labels?.length) args.push('--label', params.labels.join(','))
  if (params.milestone) args.push('--milestone', params.milestone)

  clearCache()
  const output = await gh(args.join(' '))
  const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/issues\/(\d+)/)
  if (urlMatch) {
    return getIssue(parseInt(urlMatch[1]))
  }
  return { number: 0, title: params.title, state: 'open', url: output, body: params.body ?? '', author: { login: '' }, labels: [], assignees: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: 0 }
}

export async function closeIssue(number: number): Promise<void> {
  await gh(`issue close ${number}`, { noCache: true })
  clearCache()
}

export async function editIssue(number: number, updates: Partial<CreateIssueParams>): Promise<void> {
  const args = ['issue', 'edit', String(number)]
  if (updates.title) args.push('--title', updates.title)
  if (updates.body) args.push('--body', updates.body)
  if (updates.assignees?.length) args.push('--add-assignee', updates.assignees.join(','))
  if (updates.labels?.length) args.push('--add-label', updates.labels.join(','))
  await gh(args.join(' '), { noCache: true })
  clearCache()
}

// ── CI / Workflow Operations ───────────────────────────────────────

export async function listWorkflows(): Promise<Workflow[]> {
  return ghJson<Workflow[]>('workflow list')
}

export async function listRuns(filter: RunFilter = {}): Promise<Run[]> {
  const cacheKey = `runs:${JSON.stringify(filter)}`
  const cached = getCached<Run[]>(cacheKey)
  if (cached) return cached

  const args = ['run', 'list']
  if (filter.workflow) args.push('--workflow', filter.workflow)
  if (filter.branch) args.push('--branch', filter.branch)
  if (filter.event) args.push('--event', filter.event)
  if (filter.status) args.push('--status', filter.status)
  if (filter.limit) args.push('--limit', String(filter.limit))

  const result = await ghJson<Run[]>(args.join(' '))
  setCache(cacheKey, result)
  return result
}

export async function getRun(id: number): Promise<Run> {
  return ghJson<Run>(`run view ${id}`)
}

export async function rerunRun(id: number): Promise<void> {
  await gh(`run rerun ${id}`, { noCache: true })
  clearCache()
}

export async function cancelRun(id: number): Promise<void> {
  await gh(`run cancel ${id}`, { noCache: true })
  clearCache()
}

export async function getRunLogs(id: number): Promise<string> {
  const { stdout } = await execAsync(`gh run view ${id} --log`, { timeout: 30000 })
  return stdout
}

// ── Notifications ──────────────────────────────────────────────────

export async function getNotifications(all = false): Promise<Notification[]> {
  const args = ['api', 'notifications']
  if (all) args.push('--all')
  const output = await gh(args.join(' '), { noCache: true })
  try {
    return JSON.parse(output) as Notification[]
  } catch {
    return []
  }
}

export async function markNotificationRead(threadId: string): Promise<void> {
  await gh(`api notifications/threads/${threadId} --method PATCH`, { noCache: true })
}

// ── Status Check ───────────────────────────────────────────────────

export async function checkAuth(): Promise<{ authenticated: boolean; user?: string; error?: string }> {
  try {
    const output = await gh('api user --jq .login', { noCache: true })
    return { authenticated: true, user: output }
  } catch (err) {
    const ghErr = err as GitHubError
    return { authenticated: false, error: ghErr.message }
  }
}

export async function getRepoInfo(): Promise<{ owner: string; repo: string } | null> {
  try {
    const output = await gh('repo view --json nameWithOwner --jq .nameWithOwner', { noCache: true })
    const parts = output.split('/')
    if (parts.length === 2) return { owner: parts[0], repo: parts[1] }
    return null
  } catch {
    return null
  }
}

// ── Export cache control ───────────────────────────────────────────

export { clearCache }
