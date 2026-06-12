/**
 * Cost Optimizer
 *
 * Tracks and optimizes API costs across providers.
 * Provides budget management, cost alerts, and spending insights.
 */

import { getProviderRegistry } from './registry.js'
import { ALL_MODELS } from './capabilities.js'
import type { ProviderId, ModelInfo } from './types.js'

// ============================================================================
// Types
// ============================================================================

export interface CostEntry {
  timestamp: number
  providerId: ProviderId
  modelId: string
  inputTokens: number
  outputTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  sessionId?: string
}

export interface CostSummary {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  byProvider: Record<ProviderId, ProviderCostSummary>
  byModel: Record<string, ModelCostSummary>
  dailyCosts: Record<string, number> // YYYY-MM-DD -> cost
}

export interface ProviderCostSummary {
  totalCost: number
  inputTokens: number
  outputTokens: number
  requests: number
}

export interface ModelCostSummary {
  providerId: ProviderId
  modelId: string
  modelName: string
  totalCost: number
  inputTokens: number
  outputTokens: number
  requests: number
}

export interface BudgetConfig {
  dailyLimit?: number
  weeklyLimit?: number
  monthlyLimit?: number
  alertThresholds: number[] // Percentages: [50, 75, 90, 100]
  enabled: boolean
}

// ============================================================================
// Cost Tracker
// ============================================================================

const costLog: CostEntry[] = []
const MAX_LOG_SIZE = 10_000

let budgetConfig: BudgetConfig = {
  alertThresholds: [50, 75, 90, 100],
  enabled: false,
}

const triggeredAlerts = new Set<string>()

/**
 * Calculate cost for a model given token usage
 */
export function calculateCost(
  model: ModelInfo,
  inputTokens: number,
  outputTokens: number,
): { inputCost: number; outputCost: number; totalCost: number } {
  const inputCostPerMTok = model.meta?.inputCostPerMTok ?? 0
  const outputCostPerMTok = model.meta?.outputCostPerMTok ?? 0

  const inputCost = (inputTokens / 1_000_000) * inputCostPerMTok
  const outputCost = (outputTokens / 1_000_000) * outputCostPerMTok

  return {
    inputCost: Math.round(inputCost * 100000) / 100000,
    outputCost: Math.round(outputCost * 100000) / 100000,
    totalCost: Math.round((inputCost + outputCost) * 100000) / 100000,
  }
}

/**
 * Record a cost entry
 */
export function recordCost(
  providerId: ProviderId,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  sessionId?: string,
): CostEntry {
  const registry = getProviderRegistry()
  const provider = registry.get(providerId)
  const model = provider?.getModel(modelId)

  const costs = model
    ? calculateCost(model, inputTokens, outputTokens)
    : { inputCost: 0, outputCost: 0, totalCost: 0 }

  const entry: CostEntry = {
    timestamp: Date.now(),
    providerId,
    modelId,
    inputTokens,
    outputTokens,
    ...costs,
    sessionId,
  }

  costLog.push(entry)

  // Trim log if too large
  if (costLog.length > MAX_LOG_SIZE) {
    costLog.splice(0, costLog.length - MAX_LOG_SIZE)
  }

  // Check budget alerts
  checkBudgetAlerts()

  return entry
}

/**
 * Get cost summary for a time range
 */
export function getCostSummary(since?: number): CostSummary {
  const entries = since
    ? costLog.filter((e) => e.timestamp >= since)
    : costLog

  const summary: CostSummary = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalRequests: entries.length,
    byProvider: {} as Record<ProviderId, ProviderCostSummary>,
    byModel: {},
    dailyCosts: {},
  }

  for (const entry of entries) {
    summary.totalCost += entry.totalCost
    summary.totalInputTokens += entry.inputTokens
    summary.totalOutputTokens += entry.outputTokens

    // By provider
    if (!summary.byProvider[entry.providerId]) {
      summary.byProvider[entry.providerId] = {
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
      }
    }
    const ps = summary.byProvider[entry.providerId]
    ps.totalCost += entry.totalCost
    ps.inputTokens += entry.inputTokens
    ps.outputTokens += entry.outputTokens
    ps.requests++

    // By model
    const modelKey = `${entry.providerId}/${entry.modelId}`
    if (!summary.byModel[modelKey]) {
      const registry = getProviderRegistry()
      const provider = registry.get(entry.providerId)
      const model = provider?.getModel(entry.modelId)
      summary.byModel[modelKey] = {
        providerId: entry.providerId,
        modelId: entry.modelId,
        modelName: model?.name ?? entry.modelId,
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
      }
    }
    const ms = summary.byModel[modelKey]
    ms.totalCost += entry.totalCost
    ms.inputTokens += entry.inputTokens
    ms.outputTokens += entry.outputTokens
    ms.requests++

    // Daily costs
    const date = new Date(entry.timestamp).toISOString().split('T')[0]
    summary.dailyCosts[date] = (summary.dailyCosts[date] ?? 0) + entry.totalCost
  }

  // Round costs
  summary.totalCost = Math.round(summary.totalCost * 100000) / 100000

  return summary
}

/**
 * Get today's cost
 */
export function getTodayCost(): number {
  const today = new Date().toISOString().split('T')[0]
  const summary = getCostSummary()
  return summary.dailyCosts[today] ?? 0
}

/**
 * Get this month's cost
 */
export function getMonthCost(): number {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return getCostSummary(monthStart).totalCost
}

/**
 * Find the cheapest model that meets requirements
 */
export function findCheapestModel(requirements: {
  minContextWindow?: number
  needsTools?: boolean
  needsVision?: boolean
  needsThinking?: boolean
}): { providerId: ProviderId; modelId: string; model: ModelInfo; costPer1M: number } | null {
  const registry = getProviderRegistry()
  const enabledProviders = registry.getEnabled()
  let best: { providerId: ProviderId; modelId: string; model: ModelInfo; costPer1M: number } | null = null

  for (const provider of enabledProviders) {
    const config = provider.getConfig()
    if (!config?.enabled) continue

    const models = ALL_MODELS[provider.id] ?? []
    for (const model of models) {
      // Check requirements
      if (requirements.minContextWindow && model.contextWindow < requirements.minContextWindow) continue
      if (requirements.needsTools && !model.capabilities.tools) continue
      if (requirements.needsVision && !model.capabilities.vision) continue
      if (requirements.needsThinking && !model.capabilities.extendedThinking) continue

      const costPer1M = (model.meta?.inputCostPerMTok ?? 0) + (model.meta?.outputCostPerMTok ?? 0)

      if (!best || costPer1M < best.costPer1M) {
        best = { providerId: provider.id, modelId: model.id, model, costPer1M }
      }
    }
  }

  return best
}

// ============================================================================
// Budget Management
// ============================================================================

export function setBudgetConfig(config: BudgetConfig): void {
  budgetConfig = config
  triggeredAlerts.clear()
}

export function getBudgetConfig(): BudgetConfig {
  return { ...budgetConfig }
}

function checkBudgetAlerts(): void {
  if (!budgetConfig.enabled) return

  const summary = getCostSummary()
  const now = new Date()

  // Check daily budget
  if (budgetConfig.dailyLimit) {
    const todayCost = summary.dailyCosts[now.toISOString().split('T')[0]] ?? 0
    checkThreshold('daily', todayCost, budgetConfig.dailyLimit)
  }

  // Check monthly budget
  if (budgetConfig.monthlyLimit) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const monthCost = getCostSummary(monthStart).totalCost
    checkThreshold('monthly', monthCost, budgetConfig.monthlyLimit)
  }
}

function checkThreshold(period: string, current: number, limit: number): void {
  const percentage = (current / limit) * 100

  for (const threshold of budgetConfig.alertThresholds) {
    const alertKey = `${period}-${threshold}`
    if (percentage >= threshold && !triggeredAlerts.has(alertKey)) {
      triggeredAlerts.add(alertKey)
      // Alert will be picked up by the UI
      console.warn(
        `[CostOptimizer] Budget alert: ${period} spending at ${percentage.toFixed(1)}% ($${current.toFixed(4)} / $${limit})`,
      )
    }
  }
}

/**
 * Get active budget alerts
 */
export function getActiveAlerts(): Array<{
  period: string
  threshold: number
  current: number
  limit: number
  percentage: number
}> {
  if (!budgetConfig.enabled) return []

  const alerts: Array<{
    period: string
    threshold: number
    current: number
    limit: number
    percentage: number
  }> = []

  const summary = getCostSummary()
  const now = new Date()

  if (budgetConfig.dailyLimit) {
    const todayCost = summary.dailyCosts[now.toISOString().split('T')[0]] ?? 0
    const pct = (todayCost / budgetConfig.dailyLimit) * 100
    for (const threshold of budgetConfig.alertThresholds) {
      if (pct >= threshold) {
        alerts.push({
          period: 'daily',
          threshold,
          current: todayCost,
          limit: budgetConfig.dailyLimit,
          percentage: pct,
        })
      }
    }
  }

  if (budgetConfig.monthlyLimit) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const monthCost = getCostSummary(monthStart).totalCost
    const pct = (monthCost / budgetConfig.monthlyLimit) * 100
    for (const threshold of budgetConfig.alertThresholds) {
      if (pct >= threshold) {
        alerts.push({
          period: 'monthly',
          threshold,
          current: monthCost,
          limit: budgetConfig.monthlyLimit,
          percentage: pct,
        })
      }
    }
  }

  return alerts
}

/**
 * Clear cost log (for testing)
 */
export function clearCostLog(): void {
  costLog.length = 0
  triggeredAlerts.clear()
}
