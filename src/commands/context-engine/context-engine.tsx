/**
 * Context Engine Pro — Interactive Dashboard
 *
 * Provides real-time visibility into context health, message scoring,
 * semantic file search, and compaction strategy configuration.
 *
 * Tabs:
 * - Overview: Health bar, token usage, predictions
 * - Messages: Scored message list with tier indicators
 * - Files: Semantic search, file relevance ranking
 * - Strategies: Configure compaction tier and auto-compact policies
 * - History: Compaction history and effectiveness metrics
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  healthMonitor,
  policyEvaluator,
  describeStrategy,
  recommendTier,
  getStats as getCollapseStats,
  type CompactionTier,
  type PolicyConfig,
} from '../../services/contextEngine/index.js'
import { ContextHealthBar } from '../../components/ContextHealthBar.js'

type Tab = 'overview' | 'messages' | 'files' | 'strategies' | 'history'

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async onDone => {
  return <ContextEngineUI onClose={onDone} />
}

function ContextEngineUI({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<CompactionTier>('light')
  const [policies, setPolicies] = useState<PolicyConfig[]>(policyEvaluator.getPolicies())
  const [, forceUpdate] = useState(0)

  const tabs: Tab[] = ['overview', 'messages', 'files', 'strategies', 'history']

  // Read real data from health monitor (populated by context collapse during query loop)
  const health = useMemo(() => {
    return healthMonitor.getHealth()
  }, [])

  const healthBar = useMemo(() => {
    return healthMonitor.getHealthBar(20)
  }, [health])

  const collapseStats = useMemo(() => {
    return getCollapseStats()
  }, [])

  // Real token/message data from the health monitor
  const currentTokens = health.current.totalTokens
  const maxTokens = health.current.maxTokens
  const messageCount = health.current.messageCount

  useInput((inputChar, key) => {
    if (key.escape) {
      if (searchInput) {
        setSearchInput(false)
        setSearchQuery('')
      } else {
        onClose()
      }
      return
    }

    if (searchInput) {
      if (key.return) {
        setSearchInput(false)
      } else if (key.backspace || key.delete) {
        setSearchQuery(prev => prev.slice(0, -1))
      } else if (inputChar && !key.ctrl && !key.meta) {
        setSearchQuery(prev => prev + inputChar)
      }
      return
    }

    // Tab switching with number keys
    if (inputChar >= '1' && inputChar <= '5') {
      const idx = parseInt(inputChar) - 1
      if (idx < tabs.length) setTab(tabs[idx])
      return
    }

    // Quick actions
    if (tab === 'strategies') {
      if (inputChar === 'l' || inputChar === 'L') setSelectedStrategy('light')
      if (inputChar === 'm' || inputChar === 'M') setSelectedStrategy('medium')
      if (inputChar === 'a' || inputChar === 'A') setSelectedStrategy('aggressive')
      if (inputChar === 'r' || inputChar === 'R') {
        const recommended = recommendTier(health.current.percentage)
        setSelectedStrategy(recommended)
      }
      if (inputChar === 't' || inputChar === 'T') {
        // Toggle first policy
        const updated = [...policies]
        if (updated[0]) {
          updated[0] = { ...updated[0], enabled: !updated[0].enabled }
          setPolicies(updated)
          policyEvaluator.setPolicies(updated)
        }
      }
    }

    if (tab === 'files' && (inputChar === '/' || inputChar === 's')) {
      setSearchInput(true)
      setSearchQuery('')
    }

    // Tab navigation
    if (key.tab || inputChar === 'n' || inputChar === 'N') {
      const currentIdx = tabs.indexOf(tab)
      setTab(tabs[(currentIdx + 1) % tabs.length])
    }
    if (inputChar === 'p' || inputChar === 'P') {
      const currentIdx = tabs.indexOf(tab)
      setTab(tabs[(currentIdx - 1 + tabs.length) % tabs.length])
    }

    // Force refresh
    if (inputChar === 'f' || inputChar === 'F') {
      forceUpdate(prev => prev + 1)
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      {/* Header */}
      <Box flexDirection="row">
        <Text bold color="cyan">Context Engine Pro</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* Tab bar */}
      <Box flexDirection="row">
        {tabs.map((t, i) => (
          <Text key={t} color={tab === t ? 'cyan' : 'gray'}>
            {i + 1}:{t}{i < tabs.length - 1 ? '  ' : ''}
          </Text>
        ))}
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab health={health} healthBar={healthBar} currentTokens={currentTokens} maxTokens={maxTokens} messageCount={messageCount} />
      )}
      {tab === 'messages' && (
        <MessagesTab currentTokens={currentTokens} maxTokens={maxTokens} />
      )}
      {tab === 'files' && (
        <FilesTab searchQuery={searchQuery} searchInput={searchInput} />
      )}
      {tab === 'strategies' && (
        <StrategiesTab
          selectedStrategy={selectedStrategy}
          policies={policies}
          contextPercent={health.current.percentage}
        />
      )}
      {tab === 'history' && (
        <HistoryTab health={health} collapseStats={collapseStats} />
      )}

      {/* Footer */}
      <Box borderStyle="single" borderColor="gray" width="100%" />
      <Text dimColor>
        1-5: switch tabs | Tab/n/p: navigate | F: refresh | Esc: back/quit
        {tab === 'files' ? ' | /: search' : ''}
        {tab === 'strategies' ? ' | l/m/a: tier | r: recommend | t: toggle policy' : ''}
      </Text>
    </Box>
  )
}

// ── Tab Components ─────────────────────────────────────────────────

function OverviewTab({
  health,
  healthBar,
  currentTokens,
  maxTokens,
  messageCount,
}: {
  health: ReturnType<typeof healthMonitor.getHealth>
  healthBar: ReturnType<typeof healthMonitor.getHealthBar>
  currentTokens: number
  maxTokens: number
  messageCount: number
}) {
  const statusColor = health.status === 'critical' ? 'red' : health.status === 'warning' ? 'yellow' : 'green'

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Context Health Overview</Text>
      <Box marginTop={1}>
        <ContextHealthBar currentTokens={currentTokens} maxTokens={maxTokens} width={25} />
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text>
          Status: <Text color={statusColor}>{health.status.toUpperCase()}</Text>
        </Text>
        <Text>Tokens: {currentTokens.toLocaleString()} / {maxTokens.toLocaleString()} ({health.current.percentage}%)</Text>
        <Text>Messages: {messageCount}</Text>
        <Text>Trend: {health.trend}</Text>
        {health.tokensPerMinute > 0 && (
          <Text>Usage rate: {Math.round(health.tokensPerMinute)} tok/min</Text>
        )}
        {health.estimatedMinutesUntilFull !== null && health.estimatedMinutesUntilFull > 0 && (
          <Text>
            Est. time until full:{' '}
            <Text color={health.estimatedMinutesUntilFull < 5 ? 'red' : 'yellow'}>
              {Math.round(health.estimatedMinutesUntilFull)} min
            </Text>
          </Text>
        )}
        <Text>Compactions this session: {health.compactionCount}</Text>
        {health.avgTokensSavedPerCompaction > 0 && (
          <Text>Avg tokens saved/compaction: {health.avgTokensSavedPerCompaction.toLocaleString()}</Text>
        )}
      </Box>
    </Box>
  )
}

function MessagesTab({ currentTokens, maxTokens }: { currentTokens: number; maxTokens: number }) {
  const percentage = maxTokens > 0 ? Math.round((currentTokens / maxTokens) * 100) : 0
  const recommended = recommendTier(percentage)

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Message Scoring</Text>
      <Box marginTop={1}>
        <Text>Context fill: {percentage}%</Text>
        <Text>Recommended compaction: <Text color="cyan">{recommended}</Text></Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Message relevance tiers:</Text>
        <Text>
          <Text color="green">KEEP</Text>: Recent messages, user messages, task-relevant content
        </Text>
        <Text>
          <Text color="yellow">SUMMARIZE</Text>: Older conversation turns, redundant tool results
        </Text>
        <Text>
          <Text color="red">DROP</Text>: Old tool results, duplicate file reads, stale content
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Scoring factors: recency, role weight, task keyword overlap, file references, tool result age
        </Text>
      </Box>
    </Box>
  )
}

function FilesTab({ searchQuery, searchInput }: { searchQuery: string; searchInput: boolean }) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Semantic File Search</Text>
      <Box marginTop={1}>
        <Text dimColor>Search for files by meaning, not just name patterns</Text>
      </Box>
      {searchInput && (
        <Box marginTop={1}>
          <Text color="cyan">Search: {searchQuery || '(type your query)'}_</Text>
        </Box>
      )}
      {!searchInput && (
        <Box marginTop={1}>
          <Text dimColor>Press / or s to search | Enter to execute | Esc to cancel</Text>
        </Box>
      )}
      {searchQuery && !searchInput && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Results for: "{searchQuery}"</Text>
          <Text dimColor>(Connect to semantic search service for results)</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          Tip: Try queries like "authentication", "database models", "API routes"
        </Text>
      </Box>
    </Box>
  )
}

function StrategiesTab({
  selectedStrategy,
  policies,
  contextPercent,
}: {
  selectedStrategy: CompactionTier
  policies: PolicyConfig[]
  contextPercent: number
}) {
  const recommended = recommendTier(contextPercent)

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Compaction Strategies</Text>
      <Box marginTop={1}>
        <Text>Current context: {contextPercent}% | Recommended: <Text color="cyan">{recommended}</Text></Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Active strategy: {selectedStrategy}</Text>
        <Text>{describeStrategy(selectedStrategy)}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Auto-Compact Policies:</Text>
        {policies.map((policy, i) => (
          <Text key={policy.type}>
            {policy.enabled ? <Text color="green">ON </Text> : <Text color="gray">OFF</Text>}
            {' '}{policy.label}: {policy.description}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press l/m/a to select tier | r to auto-recommend | t to toggle first policy</Text>
      </Box>
    </Box>
  )
}

function HistoryTab({
  health,
  collapseStats,
}: {
  health: ReturnType<typeof healthMonitor.getHealth>
  collapseStats: ReturnType<typeof getCollapseStats>
}) {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>Compaction History</Text>
      <Box marginTop={1}>
        <Text>Total compactions: {health.compactionCount}</Text>
        {health.avgTokensSavedPerCompaction > 0 && (
          <Text>Average tokens saved: {health.avgTokensSavedPerCompaction.toLocaleString()}</Text>
        )}
        <Text>History snapshots: {health.history.length}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Context Collapse Stats:</Text>
        <Text>Collapsed spans: {collapseStats.collapsedSpans}</Text>
        <Text>Collapsed messages: {collapseStats.collapsedMessages}</Text>
        <Text>Staged spans: {collapseStats.stagedSpans}</Text>
        <Text>Total runs: {collapseStats.health.totalSpawns}</Text>
        <Text>Errors: {collapseStats.health.totalErrors}</Text>
        {collapseStats.health.lastError && (
          <Text color="red">Last error: {collapseStats.health.lastError}</Text>
        )}
      </Box>
      {health.history.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Recent snapshots:</Text>
          {health.history.slice(-5).map((snapshot, i) => (
            <Text key={i}>
              {new Date(snapshot.timestamp).toLocaleTimeString()} — {snapshot.percentage}% ({snapshot.totalTokens.toLocaleString()} tok, {snapshot.messageCount} msgs)
            </Text>
          ))}
        </Box>
      )}
      {health.history.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>No snapshots recorded yet. Context health is tracked during active sessions.</Text>
        </Box>
      )}
    </Box>
  )
}
