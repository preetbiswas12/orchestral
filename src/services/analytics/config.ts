/**
 * Shared analytics configuration
 *
 * Common logic for determining when analytics should be disabled
 * across all analytics systems (Datadog, 1P)
 */

import { isEnvTruthy } from '../../utils/envUtils.js'
import { isTelemetryDisabled } from '../../utils/privacyLevel.js'

/**
 * Check if analytics operations should be disabled
 *
 * TELEMETRY DISABLED: Always returns true to disable all analytics
 */
export function isAnalyticsDisabled(): boolean {
  return true
}

/**
 * Check if the feedback survey should be suppressed.
 *
 * TELEMETRY DISABLED: Always returns true to disable feedback surveys
 */
export function isFeedbackSurveyDisabled(): boolean {
  return true
}
