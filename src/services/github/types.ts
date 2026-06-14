/**
 * GitHub Integration — Type Definitions
 *
 * Structured types for GitHub entities returned by `gh` CLI JSON output.
 */

export interface GitHubUser {
  login: string
  id: number
  name?: string
  email?: string
}

export interface Label {
  name: string
  color: string
  description?: string
}

export interface PR {
  number: number
  title: string
  state: string
  url: string
  body: string
  author: GitHubUser
  headRefName: string
  headRepository?: { nameWithOwner: string }
  baseRefName: string
  isDraft: boolean
  mergeable: string
  mergeStateStatus: string
  reviewDecision: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  mergedAt?: string
  comments: number
  reviewComments: number
  additions: number
  deletions: number
  changedFiles: number
  labels: Label[]
  assignees: GitHubUser[]
  reviews: PRReview[]
  commits: PRCommit[]
}

export interface PRReview {
  author: GitHubUser
  state: string
  body: string
  submittedAt: string
}

export interface PRCommit {
  oid: string
  message: string
  authors: GitHubUser[]
  committedDate: string
}

export interface Issue {
  number: number
  title: string
  state: string
  url: string
  body: string
  author: GitHubUser
  labels: Label[]
  assignees: GitHubUser[]
  milestone?: { title: number; description?: string }
  createdAt: string
  updatedAt: string
  closedAt?: string
  comments: number
}

export interface Workflow {
  id: number
  name: string
  state: string
  path: string
  createdAt: string
  updatedAt: string
}

export interface Run {
  id: number
  name: string
  status: string
  conclusion: string
  workflowId: number
  workflowName: string
  headBranch: string
  headSha: string
  event: string
  createdAt: string
  updatedAt: string
  url: string
  checkSuiteId: number
  jobs?: Job[]
}

export interface Job {
  id: number
  name: string
  status: string
  conclusion: string
  startedAt: string
  completedAt?: string
  url: string
  steps: Step[]
}

export interface Step {
  name: string
  status: string
  conclusion: string
  number: number
  startedAt: string
  completedAt?: string
}

export interface Notification {
  id: string
  reason: string
  unread: boolean
  updatedAt: string
  subject: {
    title: string
    url: string
    type: string
  }
  repository: {
    nameWithOwner: string
  }
}

export interface CheckStatus {
  name: string
  status: string
  conclusion: string
  startedAt?: string
  completedAt?: string
  detailsUrl?: string
}

// ── Filter Types ───────────────────────────────────────────────────

export interface PRFilter {
  state?: 'open' | 'closed' | 'all'
  author?: string
  label?: string
  search?: string
  limit?: number
  sort?: 'created' | 'updated' | 'popularity'
  direction?: 'asc' | 'desc'
}

export interface IssueFilter {
  state?: 'open' | 'closed' | 'all'
  author?: string
  assignee?: string
  label?: string
  search?: string
  limit?: number
  sort?: 'created' | 'updated' | 'comments'
  direction?: 'asc' | 'desc'
}

export interface RunFilter {
  workflow?: string
  branch?: string
  event?: string
  status?: 'queued' | 'in_progress' | 'completed' | 'failure' | 'success' | 'cancelled'
  limit?: number
}

// ── Create Types ───────────────────────────────────────────────────

export interface CreatePRParams {
  title: string
  body?: string
  base?: string
  head?: string
  draft?: boolean
  reviewers?: string[]
  assignees?: string[]
  labels?: string[]
}

export interface CreateIssueParams {
  title: string
  body?: string
  assignees?: string[]
  labels?: string[]
  milestone?: string
}

// ── Error Types ───────────────────────────────────────────────────

export interface GitHubError {
  code: 'AUTH_REQUIRED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN'
  message: string
  suggestion?: string
}
