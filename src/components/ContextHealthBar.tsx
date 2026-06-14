/**
 * Context Health Bar
 *
 * Compact health bar component for the status line.
 * Shows context usage as a colored bar with percentage.
 *
 * Usage:
 *   <ContextHealthBar currentTokens={45000} maxTokens={100000} width={15} />
 */

import React, { useState, useEffect } from 'react'
import { Box, Text } from '../ink.js'
import { healthMonitor } from '../services/contextEngine/index.js'

interface ContextHealthBarProps {
  currentTokens: number
  maxTokens: number
  /** Width of the bar in characters */
  width?: number
  /** Show percentage label */
  showLabel?: boolean
}

export function ContextHealthBar({
  currentTokens,
  maxTokens,
  width = 15,
  showLabel = true,
}: ContextHealthBarProps): React.ReactElement {
  const percentage = maxTokens > 0 ? Math.round((currentTokens / maxTokens) * 100) : 0
  const filled = Math.round((percentage / 100) * width)
  const empty = Math.max(0, width - filled)

  // Color based on thresholds
  let color: string
  if (percentage >= 80) color = 'red'
  else if (percentage >= 60) color = 'yellow'
  else color = 'green'

  const bar = '█'.repeat(filled) + '░'.repeat(empty)

  return (
    <Box flexDirection="row">
      <Text color={color}>[{bar}]</Text>
      {showLabel && <Text color={color}> {percentage}%</Text>}
    </Box>
  )
}

/**
 * Minimal text-only health indicator for inline use.
 */
export function ContextHealthInline({
  currentTokens,
  maxTokens,
}: {
  currentTokens: number
  maxTokens: number
}): React.ReactElement {
  const percentage = maxTokens > 0 ? Math.round((currentTokens / maxTokens) * 100) : 0

  let color: string
  if (percentage >= 80) color = 'red'
  else if (percentage >= 60) color = 'yellow'
  else color = 'green'

  return <Text color={color}>ctx:{percentage}%</Text>
}

/**
 * Connected health bar that reads directly from the health monitor.
 * Drops into any component without needing to thread token counts through props.
 *
 * Usage:
 *   <ContextHealthBarConnected width={15} />
 */
export function ContextHealthBarConnected({
  width = 15,
  showLabel = true,
}: {
  width?: number
  showLabel?: boolean
}): React.ReactElement {
  const [health, setHealth] = useState(() => healthMonitor.getHealth())

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(healthMonitor.getHealth())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <ContextHealthBar
      currentTokens={health.current.totalTokens}
      maxTokens={health.current.maxTokens}
      width={width}
      showLabel={showLabel}
    />
  )
}
