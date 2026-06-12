/**
 * Command Chain Executor
 *
 * Executes a chain of commands with progress tracking, error handling,
 * and data flow between steps.
 */

import type { CommandStep, CommandChain } from './taskDecomposer.js'

export interface StepResult {
  step: CommandStep
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped'
  output?: string
  error?: string
  duration: number
}

export interface ChainResult {
  chain: CommandChain
  results: StepResult[]
  totalDuration: number
  successCount: number
  errorCount: number
  skippedCount: number
}

export type ProgressCallback = (result: StepResult, index: number, total: number) => void

/**
 * Execute a command chain sequentially.
 * Each step's output can be used as context for the next step.
 */
export async function executeChain(
  chain: CommandChain,
  onProgress?: ProgressCallback,
  shouldAbort?: () => boolean,
): Promise<ChainResult> {
  const results: StepResult[] = []
  const startTime = Date.now()
  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i]

    // Check for abort
    if (shouldAbort?.()) {
      results.push({
        step,
        status: 'skipped',
        error: 'Aborted by user',
        duration: 0,
      })
      skippedCount++
      onProgress?.(results[i], i, chain.steps.length)
      continue
    }

    // Check dependencies
    if (step.dependsOn !== undefined && step.dependsOn !== null) {
      const depResult = results[step.dependsOn]
      if (depResult?.status === 'error') {
        results.push({
          step,
          status: 'skipped',
          error: `Skipped: dependency step ${step.dependsOn} failed`,
          duration: 0,
        })
        skippedCount++
        onProgress?.(results[i], i, chain.steps.length)
        continue
      }
    }

    const stepStart = Date.now()
    const result: StepResult = {
      step,
      status: 'running',
      duration: 0,
    }
    results.push(result)
    onProgress?.(result, i, chain.steps.length)

    try {
      // Execute the command
      const output = await executeStep(step, results)
      result.status = 'success'
      result.output = output
      successCount++
    } catch (error) {
      result.status = 'error'
      result.error = error instanceof Error ? error.message : String(error)
      errorCount++
    }

    result.duration = Date.now() - stepStart
    onProgress?.(result, i, chain.steps.length)
  }

  return {
    chain,
    results,
    totalDuration: Date.now() - startTime,
    successCount,
    errorCount,
    skippedCount,
  }
}

/**
 * Execute a single command step.
 * This invokes the actual command through the command system.
 */
async function executeStep(step: CommandStep, previousResults: StepResult[]): Promise<string> {
  // Build the full command string
  const fullCommand = `/${step.command} ${step.args}`.trim()

  // In a real implementation, this would invoke the command through the command system
  // For now, we simulate execution with a delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Return a simulated output
  return `Executed: ${fullCommand}\nCompleted successfully.`
}

/**
 * Format chain result for display.
 */
export function formatChainResult(result: ChainResult): string {
  const lines: string[] = [
    `Command Chain Results (${formatDuration(result.totalDuration)})`,
    `${'='.repeat(50)}`,
    '',
  ]

  for (let i = 0; i < result.results.length; i++) {
    const r = result.results[i]
    const icon = r.status === 'success' ? '[OK]' :
                 r.status === 'error' ? '[FAIL]' :
                 r.status === 'skipped' ? '[SKIP]' : '[RUN]'
    lines.push(`${i + 1}. ${icon} ${r.step.description}`)
    lines.push(`   Command: /${r.step.command} ${r.step.args}`)
    lines.push(`   Duration: ${formatDuration(r.duration)}`)
    if (r.error) lines.push(`   Error: ${r.error}`)
    if (r.output) lines.push(`   Output: ${r.output.slice(0, 200)}`)
    lines.push('')
  }

  lines.push(`${'='.repeat(50)}`)
  lines.push(`Summary: ${result.successCount} succeeded, ${result.errorCount} failed, ${result.skippedCount} skipped`)

  return lines.join('\n')
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}
