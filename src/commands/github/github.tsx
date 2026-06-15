/**
 * GitHub Integration Suite — Unified Dashboard
 *
 * Interactive TUI for GitHub operations: PRs, issues, CI, notifications.
 * Uses the gh CLI under the hood — requires `gh auth login`.
 *
 * Tabs:
 * - PRs: Filterable list, view details, create, merge, close
 * - Issues: Filterable list, view details, create, edit, close
 * - CI: Workflow runs, logs, rerun, cancel
 * - Notifications: Unread notifications, mark as read
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput, Spinner } from 'ink'
import {
  listPRs, getPR, createPR, mergePR, closePR, addPRComment,
  listIssues, getIssue, createIssue, closeIssue, editIssue,
  listRuns, getRun, rerunRun, cancelRun,
  getNotifications, markNotificationRead,
  checkAuth, getRepoInfo, clearCache,
  checkGhCliAvailable, getGhCliInstallGuide,
} from '../../services/github/api.js'
import type { PR, Issue, Run, Notification } from '../../services/github/types.js'

type Tab = 'prs' | 'issues' | 'ci' | 'notifications'
type Phase = 'loading' | 'ready' | 'error' | 'detail' | 'creating' | 'merging'

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async onDone => {
  return <GitHubDashboardUI onClose={onDone} />
}

function GitHubDashboardUI({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('prs')
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState<string | null>(null)
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null)

  // Data state
  const [prs, setPRs] = useState<PR[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedPR, setSelectedPR] = useState<PR | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [selectedRun, setSelectedRun] = useState<Run | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Filter state
  const [prFilter, setPrFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [issueFilter, setIssueFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const tabs: Tab[] = ['prs', 'issues', 'ci', 'notifications']

  // Initial load
  useEffect(() => {
    loadInitial()
  }, [])

  const loadInitial = useCallback(async () => {
    setPhase('loading')
    try {
      // First check if gh CLI is even installed
      const ghCheck = checkGhCliAvailable()
      if (!ghCheck.available) {
        setError(getGhCliInstallGuide())
        setPhase('error')
        return
      }

      const auth = await checkAuth()
      if (!auth.authenticated) {
        setError(
          `Not authenticated with GitHub.\n\n` +
          `Run: gh auth login\n\n` +
          `If gh is installed but not on PATH, ensure it's in your system environment variables.`
        )
        setPhase('error')
        return
      }
      setAuthUser(auth.user ?? null)
      const repo = await getRepoInfo()
      setRepoInfo(repo)
      await loadTabData('prs')
      setPhase('ready')
    } catch (err) {
      // Check if the error is about gh not installed
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('not installed') || errMsg.includes('not found') || errMsg.includes('not on PATH')) {
        setError(getGhCliInstallGuide())
      } else {
        setError(errMsg)
      }
      setPhase('error')
    }
  }, [])

  const loadTabData = useCallback(async (t: Tab) => {
    try {
      if (t === 'prs') {
        const data = await listPRs({ state: prFilter, limit: 50 })
        setPRs(data)
      } else if (t === 'issues') {
        const data = await listIssues({ state: issueFilter, limit: 50 })
        setIssues(data)
      } else if (t === 'ci') {
        const data = await listRuns({ limit: 20 })
        setRuns(data)
      } else if (t === 'notifications') {
        const data = await getNotifications()
        setNotifications(data)
      }
      setSelectedIdx(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [prFilter, issueFilter])

  // Refresh current tab when switching
  useEffect(() => {
    if (phase === 'ready') {
      loadTabData(tab)
    }
  }, [tab, prFilter, issueFilter, phase, loadTabData])

  const currentList = tab === 'prs' ? prs : tab === 'issues' ? issues : tab === 'ci' ? runs : notifications

  useInput((inputChar, key) => {
    if (key.escape) {
      if (phase === 'detail') {
        setSelectedPR(null)
        setSelectedIssue(null)
        setSelectedRun(null)
        setPhase('ready')
        return
      }
      if (showSearch) {
        setShowSearch(false)
        setSearchQuery('')
        return
      }
      onClose()
      return
    }

    if (phase === 'error') {
      if (inputChar === 'r') loadInitial()
      return
    }

    if (showSearch) {
      if (key.return) {
        setShowSearch(false)
        // Apply search filter
        loadTabData(tab)
      } else if (key.backspace || key.delete) {
        setSearchQuery(prev => prev.slice(0, -1))
      } else if (inputChar && !key.ctrl && !key.meta) {
        setSearchQuery(prev => prev + inputChar)
      }
      return
    }

    if (phase === 'detail') return // Detail view has its own handlers

    // Tab switching
    if (key.tab) {
      const idx = tabs.indexOf(tab)
      setTab(tabs[(idx + 1) % tabs.length])
      return
    }
    if (inputChar >= '1' && inputChar <= '4') {
      setTab(tabs[parseInt(inputChar) - 1])
      return
    }

    // Navigation
    if (inputChar === 'j' || key.downArrow) {
      setSelectedIdx(prev => Math.min(prev + 1, currentList.length - 1))
    }
    if (inputChar === 'k' || key.upArrow) {
      setSelectedIdx(prev => Math.max(prev - 1, 0))
    }

    // Refresh
    if (inputChar === 'r') {
      clearCache()
      loadTabData(tab)
    }

    // Search
    if (inputChar === '/') {
      setShowSearch(true)
      setSearchQuery('')
    }

    // Filter toggle
    if (tab === 'prs' && (inputChar === 'f' || inputChar === 'F')) {
      setPrFilter(prev => prev === 'open' ? 'closed' : prev === 'closed' ? 'all' : 'open')
    }
    if (tab === 'issues' && (inputChar === 'f' || inputChar === 'F')) {
      setIssueFilter(prev => prev === 'open' ? 'closed' : prev === 'closed' ? 'all' : 'open')
    }

    // Actions
    if (inputChar === 'v' || key.return) {
      if (tab === 'prs' && prs[selectedIdx]) {
        viewPR(prs[selectedIdx].number)
      } else if (tab === 'issues' && issues[selectedIdx]) {
        viewIssue(issues[selectedIdx].number)
      } else if (tab === 'ci' && runs[selectedIdx]) {
        viewRun(runs[selectedIdx].id)
      } else if (tab === 'notifications' && notifications[selectedIdx]) {
        markNotificationRead(notifications[selectedIdx].id)
        setNotifications(prev => prev.filter((_, i) => i !== selectedIdx))
      }
    }

    if (inputChar === 'c' && tab === 'prs') {
      // Quick create PR (opens in terminal)
      setPhase('creating')
    }

    if (inputChar === 'm' && tab === 'prs' && prs[selectedIdx]) {
      mergePR(prs[selectedIdx].number)
      clearCache()
      loadTabData('prs')
    }

    if (inputChar === 'x' && tab === 'prs' && prs[selectedIdx]) {
      closePR(prs[selectedIdx].number)
      clearCache()
      loadTabData('prs')
    }

    if (inputChar === 'x' && tab === 'issues' && issues[selectedIdx]) {
      closeIssue(issues[selectedIdx].number)
      clearCache()
      loadTabData('issues')
    }

    if (inputChar === 'r' && tab === 'ci' && runs[selectedIdx]) {
      rerunRun(runs[selectedIdx].id)
      clearCache()
      loadTabData('ci')
    }
  })

  const viewPR = async (number: number) => {
    setPhase('loading')
    try {
      const pr = await getPR(number)
      setSelectedPR(pr)
      setPhase('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('ready')
    }
  }

  const viewIssue = async (number: number) => {
    setPhase('loading')
    try {
      const issue = await getIssue(number)
      setSelectedIssue(issue)
      setPhase('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('ready')
    }
  }

  const viewRun = async (id: number) => {
    setPhase('loading')
    try {
      const run = await getRun(id)
      setSelectedRun(run)
      setPhase('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('ready')
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
        <Text color="yellow"><Spinner type="dots" /> Connecting to GitHub...</Text>
        <Text dimColor>Using gh CLI. Make sure you're logged in: gh auth login</Text>
      </Box>
    )
  }

  if (phase === 'error') {
    // Support multi-line error messages (e.g. gh install guide)
    const errorLines = (error ?? 'Unknown error').split('\n')
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text color="red" bold>GitHub Error</Text>
        {errorLines.map((line, i) => (
          <Text key={i} color={line.startsWith('║') ? 'yellow' : line.startsWith('╔') || line.startsWith('╠') || line.startsWith('╚') ? 'gray' : 'red'}>
            {line}
          </Text>
        ))}
        <Box marginTop={1}>
          <Text dimColor>Press r to retry | Esc to close</Text>
        </Box>
      </Box>
    )
  }

  if (phase === 'detail' && selectedPR) {
    return <PRDetail pr={selectedPR} onClose={() => { setSelectedPR(null); setPhase('ready') }} />
  }

  if (phase === 'detail' && selectedIssue) {
    return <IssueDetail issue={selectedIssue} onClose={() => { setSelectedIssue(null); setPhase('ready') }} />
  }

  if (phase === 'detail' && selectedRun) {
    return <RunDetail run={selectedRun} onClose={() => { setSelectedRun(null); setPhase('ready') }} />
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      {/* Header */}
      <Box flexDirection="row">
        <Text bold color="yellow">GitHub</Text>
        {authUser && <Text dimColor> @{authUser}</Text>}
        {repoInfo && <Text dimColor> · {repoInfo.owner}/{repoInfo.repo}</Text>}
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* Tabs */}
      <Box flexDirection="row">
        {tabs.map((t, i) => (
          <Text key={t} color={tab === t ? 'yellow' : 'gray'}>
            {i + 1}:{t === 'ci' ? 'CI' : t}{i < tabs.length - 1 ? '  ' : ''}
          </Text>
        ))}
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* Search bar */}
      {showSearch && (
        <Box marginTop={1}>
          <Text color="yellow">Search: {searchQuery || '(type to search)'}_</Text>
        </Box>
      )}

      {/* Filter indicator */}
      {(tab === 'prs' || tab === 'issues') && !showSearch && (
        <Box marginTop={1}>
          <Text dimColor>Filter: {tab === 'prs' ? prFilter : issueFilter} | Press f to cycle</Text>
        </Box>
      )}

      {/* List */}
      <Box flexDirection="column" marginTop={1}>
        {currentList.length === 0 ? (
          <Text dimColor>No {tab} found.</Text>
        ) : (
          currentList.slice(0, 20).map((item, i) => {
            const isSelected = i === selectedIdx
            if (tab === 'prs') return <PRLine key={(item as PR).number} pr={item as PR} selected={isSelected} />
            if (tab === 'issues') return <IssueLine key={(item as Issue).number} issue={item as Issue} selected={isSelected} />
            if (tab === 'ci') return <RunLine key={(item as Run).id} run={item as Run} selected={isSelected} />
            return <NotificationLine key={(item as Notification).id} notification={item as Notification} selected={isSelected} />
          })
        )}
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>
        1-4: tabs | j/k: navigate | v/Enter: view | /: search | f: filter | r: refresh | Esc: back
      </Text>
      <Text dimColor>
        {tab === 'prs' ? 'c: create | m: merge | x: close' : ''}
        {tab === 'issues' ? 'c: create | x: close' : ''}
        {tab === 'ci' ? 'r: rerun' : ''}
      </Text>
    </Box>
  )
}

// ── List Line Components ───────────────────────────────────────────

function PRLine({ pr, selected }: { pr: PR; selected: boolean }) {
  const color = pr.state === 'open' ? 'green' : pr.state === 'merged' ? 'magenta' : 'red'
  const borderColor = selected ? 'yellow' : 'gray'
  return (
    <Box flexDirection="row" borderStyle={selected ? 'round' : 'single'} borderColor={borderColor} paddingX={1}>
      <Text color={color}>●</Text>
      <Text bold> #{pr.number}</Text>
      <Text> {pr.title.slice(0, 50)}{pr.title.length > 50 ? '...' : ''}</Text>
      <Text dimColor> by {pr.author.login}</Text>
      {pr.isDraft && <Text color="gray"> [draft]</Text>}
      <Text dimColor> +{pr.additions}/-{pr.deletions}</Text>
    </Box>
  )
}

function IssueLine({ issue, selected }: { issue: Issue; selected: boolean }) {
  const color = issue.state === 'open' ? 'green' : 'magenta'
  const borderColor = selected ? 'yellow' : 'gray'
  return (
    <Box flexDirection="row" borderStyle={selected ? 'round' : 'single'} borderColor={borderColor} paddingX={1}>
      <Text color={color}>●</Text>
      <Text bold> #{issue.number}</Text>
      <Text> {issue.title.slice(0, 50)}{issue.title.length > 50 ? '...' : ''}</Text>
      <Text dimColor> by {issue.author.login}</Text>
      {issue.labels.length > 0 && <Text color="cyan"> {issue.labels.map(l => l.name).join(', ')}</Text>}
    </Box>
  )
}

function RunLine({ run, selected }: { run: Run; selected: boolean }) {
  const color = run.conclusion === 'success' ? 'green' : run.conclusion === 'failure' ? 'red' : run.status === 'in_progress' ? 'yellow' : 'gray'
  const borderColor = selected ? 'yellow' : 'gray'
  return (
    <Box flexDirection="row" borderStyle={selected ? 'round' : 'single'} borderColor={borderColor} paddingX={1}>
      <Text color={color}>●</Text>
      <Text bold> {run.name}</Text>
      <Text dimColor> #{run.id}</Text>
      <Text> {run.headBranch}</Text>
      <Text color={color}> {run.conclusion || run.status}</Text>
    </Box>
  )
}

function NotificationLine({ notification, selected }: { notification: Notification; selected: boolean }) {
  const borderColor = selected ? 'yellow' : 'gray'
  return (
    <Box flexDirection="row" borderStyle={selected ? 'round' : 'single'} borderColor={borderColor} paddingX={1}>
      <Text color={notification.unread ? 'yellow' : 'gray'}>●</Text>
      <Text bold> [{notification.subject.type}]</Text>
      <Text> {notification.subject.title.slice(0, 50)}</Text>
      <Text dimColor> {notification.repository.nameWithOwner}</Text>
      <Text dimColor> · {notification.reason}</Text>
    </Box>
  )
}

// ── Detail Views ───────────────────────────────────────────────────

function PRDetail({ pr, onClose }: { pr: PR; onClose: () => void }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Box flexDirection="row">
        <Text color="green">●</Text>
        <Text bold> #{pr.number}: {pr.title}</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text>State: <Text color={pr.state === 'open' ? 'green' : 'red'}>{pr.state}</Text></Text>
      <Text>Author: {pr.author.login}</Text>
      <Text>Branch: {pr.headRefName} → {pr.baseRefName}</Text>
      <Text>Changes: +{pr.additions}/-{pr.deletions} in {pr.changedFiles} files</Text>
      <Text>Comments: {pr.comments} | Reviews: {pr.reviewComments}</Text>
      <Text>Created: {new Date(pr.createdAt).toLocaleString()}</Text>
      <Text>Updated: {new Date(pr.updatedAt).toLocaleString()}</Text>
      {pr.labels.length > 0 && <Text>Labels: {pr.labels.map(l => l.name).join(', ')}</Text>}
      {pr.body && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>--- Body ---</Text>
          <Text>{pr.body.slice(0, 500)}{pr.body.length > 500 ? '...' : ''}</Text>
        </Box>
      )}
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>m: merge | x: close | c: comment | Esc: back</Text>
    </Box>
  )
}

function IssueDetail({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Box flexDirection="row">
        <Text color="green">●</Text>
        <Text bold> #{issue.number}: {issue.title}</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text>State: <Text color={issue.state === 'open' ? 'green' : 'magenta'}>{issue.state}</Text></Text>
      <Text>Author: {issue.author.login}</Text>
      <Text>Comments: {issue.comments}</Text>
      <Text>Created: {new Date(issue.createdAt).toLocaleString()}</Text>
      {issue.labels.length > 0 && <Text>Labels: {issue.labels.map(l => l.name).join(', ')}</Text>}
      {issue.assignees.length > 0 && <Text>Assignees: {issue.assignees.map(a => a.login).join(', ')}</Text>}
      {issue.body && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>--- Body ---</Text>
          <Text>{issue.body.slice(0, 500)}{issue.body.length > 500 ? '...' : ''}</Text>
        </Box>
      )}
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>x: close | Esc: back</Text>
    </Box>
  )
}

function RunDetail({ run, onClose }: { run: Run; onClose: () => void }) {
  const color = run.conclusion === 'success' ? 'green' : run.conclusion === 'failure' ? 'red' : 'yellow'
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} padding={1}>
      <Box flexDirection="row">
        <Text color={color}>●</Text>
        <Text bold> {run.name}</Text>
        <Text dimColor> #{run.id}</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text>Status: <Text color={color}>{run.conclusion || run.status}</Text></Text>
      <Text>Branch: {run.headBranch}</Text>
      <Text>Event: {run.event}</Text>
      <Text>Created: {new Date(run.createdAt).toLocaleString()}</Text>
      {run.jobs && run.jobs.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>--- Jobs ---</Text>
          {run.jobs.map(job => (
            <Text key={job.id}>
              <Text color={job.conclusion === 'success' ? 'green' : job.conclusion === 'failure' ? 'red' : 'yellow'}>●</Text>
              {' '}{job.name} ({job.conclusion || job.status})
            </Text>
          ))}
        </Box>
      )}
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>r: rerun | Esc: back</Text>
    </Box>
  )
}
