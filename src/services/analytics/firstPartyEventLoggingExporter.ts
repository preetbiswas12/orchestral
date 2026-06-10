import type { HrTime } from '@opentelemetry/api'
import { type ExportResult, ExportResultCode } from '@opentelemetry/core'
import type {
  LogRecordExporter,
  ReadableLogRecord,
} from '@opentelemetry/sdk-logs'
import axios from 'axios'
import { randomUUID } from 'crypto'
import { appendFile, mkdir, readdir, unlink, writeFile } from 'fs/promises'
import * as path from 'path'
import type { CoreUserData } from 'src/utils/user.js'
import {
  getIsNonInteractiveSession,
  getSessionId,
} from '../../bootstrap/state.js'
import { ClaudeCodeInternalEvent } from '../../types/generated/events_mono/claude_code/v1/claude_code_internal_event.js'
import { GrowthbookExperimentEvent } from '../../types/generated/events_mono/growthbook/v1/growthbook_experiment_event.js'
import {
  getClaudeAIOAuthTokens,
  hasProfileScope,
  isClaudeAISubscriber,
} from '../../utils/auth.js'
import { checkHasTrustDialogAccepted } from '../../utils/config.js'
import { logForDebugging } from '../../utils/debug.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { errorMessage, isFsInaccessible, toError } from '../../utils/errors.js'
import { getAuthHeaders } from '../../utils/http.js'
import { readJSONLFile } from '../../utils/json.js'
import { logError } from '../../utils/log.js'
import { sleep } from '../../utils/sleep.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { getClaudeCodeUserAgent } from '../../utils/userAgent.js'
import { isOAuthTokenExpired } from '../oauth/client.js'
import { stripProtoFields } from './index.js'
import { type EventMetadata, to1PEventFormat } from './metadata.js'

// Unique ID for this process run - used to isolate failed event files between runs
const BATCH_UUID = randomUUID()

// File prefix for failed event storage
const FILE_PREFIX = '1p_failed_events.'

// Storage directory for failed events - evaluated at runtime to respect CLAUDE_CONFIG_DIR in tests
function getStorageDir(): string {
  return path.join(getClaudeConfigHomeDir(), 'telemetry')
}

// API envelope - event_data is the JSON output from proto toJSON()
type FirstPartyEventLoggingEvent = {
  event_type: 'ClaudeCodeInternalEvent' | 'GrowthbookExperimentEvent'
  event_data: unknown
}

type FirstPartyEventLoggingPayload = {
  events: FirstPartyEventLoggingEvent[]
}

/**
 * Exporter for 1st-party event logging to /api/event_logging/batch.
 *
 * Export cycles are controlled by OpenTelemetry's BatchLogRecordProcessor, which
 * triggers export() when either:
 * - Time interval elapses (default: 5 seconds via scheduledDelayMillis)
 * - Batch size is reached (default: 200 events via maxExportBatchSize)
 *
 * This exporter adds resilience on top:
 * - Append-only log for failed events (concurrency-safe)
 * - Quadratic backoff retry for failed events, dropped after maxAttempts
 * - Immediate retry of queued events when any export succeeds (endpoint is healthy)
 * - Chunking large event sets into smaller batches
 * - Auth fallback: retries without auth on 401 errors
 */
export class FirstPartyEventLoggingExporter implements LogRecordExporter {
  private readonly endpoint: string
  private readonly timeout: number
  private readonly maxBatchSize: number
  private readonly skipAuth: boolean
  private readonly batchDelayMs: number
  private readonly baseBackoffDelayMs: number
  private readonly maxBackoffDelayMs: number
  private readonly maxAttempts: number
  private readonly isKilled: () => boolean
  private pendingExports: Promise<void>[] = []
  private isShutdown = false
  private readonly schedule: (
    fn: () => Promise<void>,
    delayMs: number,
  ) => () => void
  private cancelBackoff: (() => void) | null = null
  private attempts = 0
  private isRetrying = false
  private lastExportErrorContext: string | undefined

  constructor(
    options: {
      timeout?: number
      maxBatchSize?: number
      skipAuth?: boolean
      batchDelayMs?: number
      baseBackoffDelayMs?: number
      maxBackoffDelayMs?: number
      maxAttempts?: number
      path?: string
      baseUrl?: string
      // Injected killswitch probe. Checked per-POST so that disabling the
      // firstParty sink also stops backoff retries (not just new emits).
      // Passed in rather than imported to avoid a cycle with firstPartyEventLogger.ts.
      isKilled?: () => boolean
      schedule?: (fn: () => Promise<void>, delayMs: number) => () => void
    } = {},
  ) {
    // Default: prod, except when ANTHROPIC_BASE_URL is explicitly staging.
    // Overridable via tengu_1p_event_batch_config.baseUrl.
    const baseUrl =
      options.baseUrl ||
      (process.env.ANTHROPIC_BASE_URL === 'https://api-staging.anthropic.com'
        ? 'https://api-staging.anthropic.com'
        : 'https://api.anthropic.com')

    this.endpoint = `${baseUrl}${options.path || '/api/event_logging/batch'}`

    this.timeout = options.timeout || 10000
    this.maxBatchSize = options.maxBatchSize || 200
    this.skipAuth = options.skipAuth ?? false
    this.batchDelayMs = options.batchDelayMs || 100
    this.baseBackoffDelayMs = options.baseBackoffDelayMs || 500
    this.maxBackoffDelayMs = options.maxBackoffDelayMs || 30000
    this.maxAttempts = options.maxAttempts ?? 8
    this.isKilled = options.isKilled ?? (() => false)
    this.schedule =
      options.schedule ??
      ((fn, ms) => {
        const t = setTimeout(fn, ms)
        return () => clearTimeout(t)
      })

    // Retry any failed events from previous runs of this session (in background)
    void this.retryPreviousBatches()
  }

  // Expose for testing
  async getQueuedEventCount(): Promise<number> {
    return (await this.loadEventsFromCurrentBatch()).length
  }

  // --- Storage helpers ---

  private getCurrentBatchFilePath(): string {
    return path.join(
      getStorageDir(),
      `${FILE_PREFIX}${getSessionId()}.${BATCH_UUID}.json`,
    )
  }

  private async loadEventsFromFile(
    filePath: string,
  ): Promise<FirstPartyEventLoggingEvent[]> {
    try {
      return await readJSONLFile<FirstPartyEventLoggingEvent>(filePath)
    } catch {
      return []
    }
  }

  private async loadEventsFromCurrentBatch(): Promise<
    FirstPartyEventLoggingEvent[]
  > {
    return this.loadEventsFromFile(this.getCurrentBatchFilePath())
  }

  private async saveEventsToFile(
    filePath: string,
    events: FirstPartyEventLoggingEvent[],
  ): Promise<void> {
    try {
      if (events.length === 0) {
        try {
          await unlink(filePath)
        } catch {
          // File doesn't exist, nothing to delete
        }
      } else {
        // Ensure storage directory exists
        await mkdir(getStorageDir(), { recursive: true })
        // Write as JSON lines (one event per line)
        const content = events.map(e => jsonStringify(e)).join('\n') + '\n'
        await writeFile(filePath, content, 'utf8')
      }
    } catch (error) {
      logError(error)
    }
  }

  private async appendEventsToFile(
    filePath: string,
    events: FirstPartyEventLoggingEvent[],
  ): Promise<void> {
    if (events.length === 0) return
    try {
      // Ensure storage directory exists
      await mkdir(getStorageDir(), { recursive: true })
      // Append as JSON lines (one event per line) - atomic on most filesystems
      const content = events.map(e => jsonStringify(e)).join('\n') + '\n'
      await appendFile(filePath, content, 'utf8')
    } catch (error) {
      logError(error)
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath)
    } catch {
      // File doesn't exist or can't be deleted, ignore
    }
  }

  // --- Previous batch retry (startup) ---

  private async retryPreviousBatches(): Promise<void> {
    try {
      const prefix = `${FILE_PREFIX}${getSessionId()}.`
      let files: string[]
      try {
        files = (await readdir(getStorageDir()))
          .filter((f: string) => f.startsWith(prefix) && f.endsWith('.json'))
          .filter((f: string) => !f.includes(BATCH_UUID)) // Exclude current batch
      } catch (e) {
        if (isFsInaccessible(e)) return
        throw e
      }

      for (const file of files) {
        const filePath = path.join(getStorageDir(), file)
        void this.retryFileInBackground(filePath)
      }
    } catch (error) {
      logError(error)
    }
  }

  private async retryFileInBackground(filePath: string): Promise<void> {
    if (this.attempts >= this.maxAttempts) {
      await this.deleteFile(filePath)
      return
    }

    const events = await this.loadEventsFromFile(filePath)
    if (events.length === 0) {
      await this.deleteFile(filePath)
      return
    }

    if (process.env.USER_TYPE === 'ant') {
      logForDebugging(
        `1P event logging: retrying ${events.length} events from previous batch`,
      )
    }

    const failedEvents = await this.sendEventsInBatches(events)
    if (failedEvents.length === 0) {
      await this.deleteFile(filePath)
      if (process.env.USER_TYPE === 'ant') {
        logForDebugging('1P event logging: previous batch retry succeeded')
      }
    } else {
      // Save only the failed events back (not all original events)
      await this.saveEventsToFile(filePath, failedEvents)
      if (process.env.USER_TYPE === 'ant') {
        logForDebugging(
          `1P event logging: previous batch retry failed, ${failedEvents.length} events remain`,
        )
      }
    }
  }

  async export(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    if (this.isShutdown) {
      if (process.env.USER_TYPE === 'ant') {
        logForDebugging(
          '1P event logging export failed: Exporter has been shutdown',
        )
      }
      resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error('Exporter has been shutdown'),
      })
      return
    }

    const exportPromise = this.doExport(logs, resultCallback)
    this.pendingExports.push(exportPromise)

    // Clean up completed exports
    void exportPromise.finally(() => {
      const index = this.pendingExports.indexOf(exportPromise)
      if (index > -1) {
        void this.pendingExports.splice(index, 1)
      }
    })
  }

  /**
   * TELEMETRY DISABLED: This function is now a no-op
   */
  private async doExport(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    // TELEMETRY DISABLED: Return success without exporting
    resultCallback({ code: ExportResultCode.SUCCESS })
    return
  }

  async shutdown(): Promise<void> {
    // TELEMETRY DISABLED: No-op
  }
}
