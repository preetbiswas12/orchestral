/**
 * Token Analytics Dashboard
 *
 * Visual dashboard showing token usage, costs, and budget tracking
 * across all providers and models.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  getCostSummary,
  getTodayCost,
  getMonthCost,
  getBudgetConfig,
  getActiveAlerts,
  type CostSummary,
} from '../providers/costOptimizer.js'
import { getAllProvidersInfo } from '../providers/registry.js'

type Tab = 'overview' | 'providers' | 'models' | 'daily' | 'budget'

export function TokenDashboard({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [alerts, setAlerts] = useState<ReturnType<typeof getActiveAlerts>>([])

  const refresh = useCallback(() => {
    setSummary(getCostSummary())
    setAlerts(getActiveAlerts())
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose()
    }
    if (input === '1') setTab('overview')
    if (input === '2') setTab('providers')
    if (input === '3') setTab('models')
    if (input === '4') setTab('daily')
    if (input === '5') setTab('budget')
    if (input === 'r') refresh()
  })

  const tabs: Tab[] = ['overview', 'providers', 'models', 'daily', 'budget']

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="cyan">📊 Token Analytics Dashboard</Text>
        <Text dimColor>Press 1-5 for tabs, r to refresh, q to quit</Text>
      </Box>

      {/* Tab bar */}
      <Box flexDirection="row" gap={2}>
        {tabs.map((t, i) => (
          <Text
            key={t}
            bold={tab === t}
            color={tab === t ? 'cyan' : 'gray'}
            dimColor={tab !== t}
          >
            {`[${i + 1}] ${t.charAt(0).toUpperCase() + t.slice(1)}`}
          </Text>
        ))}
      </Box>

      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box flexDirection="column" marginY={1}>
          <Text bold color="yellow">⚠️ Budget Alerts</Text>
          {alerts.map((alert, i) => (
            <Text key={i} color="yellow">
              {`  ${alert.period}: ${alert.percentage.toFixed(1)}% ($${alert.current.toFixed(4)} / $${alert.limit})`}
            </Text>
          ))}
        </Box>
      )}

      {/* Tab content */}
      <Box flexDirection="column" marginY={1}>
        {tab === 'overview' && <OverviewTab summary={summary} />}
        {tab === 'providers' && <ProvidersTab summary={summary} />}
        {tab === 'models' && <ModelsTab summary={summary} />}
        {tab === 'daily' && <DailyTab summary={summary} />}
        {tab === 'budget' && <BudgetTab />}
      </Box>
    </Box>
  )
}

function OverviewTab({ summary }: { summary: CostSummary | null }) {
  if (!summary) {
    return <Text dimColor>No usage data yet. Start a session to track tokens.</Text>
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Summary</Text>
      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column">
          <Text dimColor>Total Cost</Text>
          <Text bold color="green">${summary.totalCost.toFixed(4)}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Input Tokens</Text>
          <Text>{formatNumber(summary.totalInputTokens)}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Output Tokens</Text>
          <Text>{formatNumber(summary.totalOutputTokens)}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Requests</Text>
          <Text>{summary.totalRequests}</Text>
        </Box>
      </Box>

      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column">
          <Text dimColor>Today</Text>
          <Text color="cyan">${getTodayCost().toFixed(4)}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>This Month</Text>
          <Text color="cyan">${getMonthCost().toFixed(4)}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Active Providers</Text>
        <ProviderList />
      </Box>
    </Box>
  )
}

function ProvidersTab({ summary }: { summary: CostSummary | null }) {
  if (!summary || Object.keys(summary.byProvider).length === 0) {
    return <Text dimColor>No provider usage data yet.</Text>
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Usage by Provider</Text>
      {Object.entries(summary.byProvider).map(([providerId, data]) => {
        const pct = summary.totalCost > 0 ? (data.totalCost / summary.totalCost) * 100 : 0
        return (
          <Box key={providerId} flexDirection="column">
            <Text bold>{providerId}</Text>
            <Box flexDirection="row" gap={4}>
              <Text color="green">${data.totalCost.toFixed(4)}</Text>
              <Text dimColor>{pct.toFixed(1)}%</Text>
              <Text dimColor>In: {formatNumber(data.inputTokens)}</Text>
              <Text dimColor>Out: {formatNumber(data.outputTokens)}</Text>
              <Text dimColor>Reqs: {data.requests}</Text>
            </Box>
            <Bar percentage={pct} width={40} color="cyan" />
          </Box>
        )
      })}
    </Box>
  )
}

function ModelsTab({ summary }: { summary: CostSummary | null }) {
  if (!summary || Object.keys(summary.byModel).length === 0) {
    return <Text dimColor>No model usage data yet.</Text>
  }

  const sorted = Object.entries(summary.byModel).sort((a, b) => b[1].totalCost - a[1].totalCost)

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Usage by Model</Text>
      {sorted.map(([key, data]) => (
        <Box key={key} flexDirection="row" gap={2}>
          <Text bold>{data.modelName}</Text>
          <Text color="green">${data.totalCost.toFixed(4)}</Text>
          <Text dimColor>{formatNumber(data.inputTokens)} in</Text>
          <Text dimColor>{formatNumber(data.outputTokens)} out</Text>
          <Text dimColor>{data.requests} reqs</Text>
        </Box>
      ))}
    </Box>
  )
}

function DailyTab({ summary }: { summary: CostSummary | null }) {
  if (!summary || Object.keys(summary.dailyCosts).length === 0) {
    return <Text dimColor>No daily usage data yet.</Text>
  }

  const sorted = Object.entries(summary.dailyCosts).sort((a, b) => b[0].localeCompare(a[0]))
  const maxCost = Math.max(...Object.values(summary.dailyCosts))

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Daily Costs</Text>
      {sorted.map(([date, cost]) => {
        const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0
        return (
          <Box key={date} flexDirection="row" gap={2}>
            <Text>{date}</Text>
            <Text color="green">${cost.toFixed(4)}</Text>
            <Bar percentage={pct} width={30} color="green" />
          </Box>
        )
      })}
    </Box>
  )
}

function BudgetTab() {
  const config = getBudgetConfig()

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Budget Configuration</Text>
      <Text dimColor>Budget tracking is {config.enabled ? 'enabled' : 'disabled'}</Text>

      {config.dailyLimit && (
        <Box flexDirection="row" gap={2}>
          <Text>Daily Limit:</Text>
          <Text color="cyan">${config.dailyLimit}</Text>
          <Text dimColor>Today: ${getTodayCost().toFixed(4)}</Text>
        </Box>
      )}

      {config.monthlyLimit && (
        <Box flexDirection="row" gap={2}>
          <Text>Monthly Limit:</Text>
          <Text color="cyan">${config.monthlyLimit}</Text>
          <Text dimColor>This month: ${getMonthCost().toFixed(4)}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Alert Thresholds: {config.alertThresholds.map(t => `${t}%`).join(', ')}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>
          Use /config to set budget limits. Example:{'\n'}
          {'  '}claude config set costOptimizer.dailyLimit 5.00{'\n'}
          {'  '}claude config set costOptimizer.monthlyLimit 100.00{'\n'}
          {'  '}claude config set costOptimizer.enabled true
        </Text>
      </Box>
    </Box>
  )
}

function ProviderList() {
  const providers = getAllProvidersInfo()
  const enabled = providers.filter(p => p.enabled)

  if (enabled.length === 0) {
    return <Text dimColor>No providers configured</Text>
  }

  return (
    <Box flexDirection="row" gap={2}>
      {enabled.map(p => (
        <Text key={p.id} color={p.isActive ? 'green' : 'gray'}>
          {p.isActive ? '●' : '○'} {p.name}
        </Text>
      ))}
    </Box>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function Bar({ percentage, width, color }: { percentage: number; width: number; color: string }) {
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  return (
    <Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
    </Text>
  )
}
