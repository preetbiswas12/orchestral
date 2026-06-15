/**
 * Command Chain Executor
 *
 * Executes a chain of commands with progress tracking, error handling,
 * and data flow between steps.
 *
 * When a ToolUseContext is provided, commands are dispatched through the
 * real command system (mod.call(onDone, context, args)). Without context,
 * a simplified local dispatch is used.
 */

import { getCommand, COMMANDS, findCommand } from '../commands.js'
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
  toolUseContext?: any,
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
      const output = await executeStep(step, results, toolUseContext)
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
 *
 * Uses the synchronous COMMANDS() registry (which contains all statically
 * imported commands) to find and dispatch the command. This avoids the
 * broken require() call on an ESM module.
 */
async function executeStep(
  step: CommandStep,
  previousResults: StepResult[],
  toolUseContext?: any,
): Promise<string> {
  const fullCommand = `/${step.command} ${step.args}`.trim()

  // Build context from previous steps
  const previousOutput = previousResults
    .filter(r => r.status === 'success' && r.output)
    .map(r => r.output)
    .join('\n')

  const enrichedArgs = previousOutput
    ? `${step.args}\n\nContext from previous steps:\n${previousOutput}`.trim()
    : step.args

  // Look up the command in the synchronous registry
  const allCommands = COMMANDS()
  const cmd = findCommand(step.command, allCommands)

  if (!cmd) {
    // Command not found — return a clear message instead of silent simulation
    return `[Command "${step.command}" is a known command but was not found in the active command registry. This may be because the command is gated behind a feature flag or has not been registered. Args: ${step.args}]`
  }

  // Dispatch based on command type
  if (cmd.type === 'local-jsx' || cmd.type === 'local') {
    if (cmd.load) {
      try {
        const mod = await cmd.load()
        if (mod?.call) {
          // For local-jsx commands, we need a ToolUseContext.
          // If one was provided (from /auto being invoked inside a session),
          // pass it through. Otherwise create a minimal context.
          const ctx = toolUseContext ?? createMinimalContext()

          let resolved = false
          const onDone = () => { resolved = true }

          await mod.call(onDone, ctx, enrichedArgs)
          return `Dispatched: ${fullCommand}\nCommand was loaded and executed through the real command system.`
        }
      } catch (err) {
        throw new Error(`Failed to dispatch "${step.command}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    // Command found but can't be called directly (no `load` or no `call`)
    return `[Command "${step.command}" found in registry but cannot be dispatched programmatically. It may require interactive TUI. Args: ${step.args}]`
  }

  if (cmd.type === 'prompt') {
    // Prompt commands expand to text sent to the model
    if (cmd.getPromptForCommand) {
      try {
        const prompt = await cmd.getPromptForCommand(enrichedArgs, toolUseContext)
        return `[Prompt command "${step.command}" expanded. Prompt length: ${prompt.length} chars. Content: ${prompt.slice(0, 200)}...]`
      } catch (err) {
        throw new Error(`Failed to expand prompt for "${step.command}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    return `[Prompt command "${step.command}" — no getPromptForCommand handler]`
  }

  return `[Command "${step.command}" has type "${cmd.type}" — not dispatchable programmatically]`
}

/**
 * Create a minimal context object for dispatching commands outside
 * the normal query loop. This gives commands access to basic cwd
 * information even when no full ToolUseContext is available.
 */
function createMinimalContext(): any {
  return {
    options: {
      cwd: process.cwd(),
    },
    abortController: new AbortController(),
  }
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
