/**
 * Auto Command — AI-Powered Command Orchestrator
 *
 * Takes natural language input, decomposes it into a command chain,
 * and executes the chain with progress tracking.
 *
 * Usage:
 *   /auto review my code and fix security issues
 *   /auto set up a new React project with tests
 *   /auto prepare a release
 *   /auto document all API endpoints
 */

import React, { useState, useCallback, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  decomposeTask,
  type CommandChain,
  type CommandStep,
} from '../../services/taskDecomposer.js'
import {
  executeChain,
  formatChainResult,
  type StepResult,
} from '../../services/commandChain.js'

type Phase = 'ready' | 'planning' | 'confirm' | 'executing' | 'results'

type LocalJSXCommandCall = (
  onDone: () => void,
  context: any,
  args: string,
) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  return <AutoUI onClose={onDone} toolUseContext={context} args={args} />
}

function AutoUI({
  onClose,
  toolUseContext,
  args,
}: {
  onClose: () => void
  toolUseContext: any
  args: string
}) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [input, setInput] = useState(args || '')
  const [chain, setChain] = useState<CommandChain | null>(null)
  const [results, setResults] = useState<StepResult[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  const runTask = useCallback(async (task: string) => {
    setPhase('planning')
    setError(null)
    abortRef.current = false

    try {
      // Step 1: Decompose task into command chain
      const plan = await decomposeTask(task)
      setChain(plan)
      setPhase('confirm')
    } catch (err) {
      setError(`Planning failed: ${err}`)
      setPhase('results')
    }
  }, [])

  const executeChainNow = useCallback(async () => {
    if (!chain) return
    setPhase('executing')
    setResults([])
    setCurrentStep(0)

    try {
      const result = await executeChain(
        chain,
        (stepResult, index, total) => {
          setResults(prev => {
            const next = [...prev]
            next[index] = stepResult
            return next
          })
          setCurrentStep(index)
        },
        () => abortRef.current,
        toolUseContext,
      )
      setResults(result.results)
      setPhase('results')
    } catch (err) {
      setError(`Execution failed: ${err}`)
      setPhase('results')
    }
  }, [chain])

  useInput((inputChar, key) => {
    if (key.escape) {
      if (phase === 'ready') onClose()
      else if (phase === 'executing') { abortRef.current = true }
      else { setPhase('ready'); setInput(''); setChain(null); setResults([]); setError(null) }
      return
    }

    if (phase === 'ready') {
      if (key.return && input.trim()) {
        runTask(input.trim())
      }
      if (key.backspace || key.delete) setInput(prev => prev.slice(0, -1))
      if (inputChar && !key.ctrl && !key.meta && !key.return) setInput(prev => prev + inputChar)
    }

    if (phase === 'confirm') {
      if (inputChar === 'y' || inputChar === 'Y' || key.return) executeChainNow()
      if (inputChar === 'n' || inputChar === 'N' || key.escape) { setPhase('ready'); setChain(null) }
    }

    if (phase === 'results') {
      if (key.return || input === 'q') { setPhase('ready'); setInput(''); setChain(null); setResults([]); setError(null) }
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      <Box flexDirection="row">
        <Text bold color="magenta">Command Orchestrator</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {phase === 'ready' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>What would you like to do?</Text>
          <Text dimColor>Describe your task in natural language</Text>
          <Box marginTop={1}>
            <Text color="magenta">{input || '(type your task)'}_</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Examples: "review staged code and fix issues" | "scaffold a new React project" | "prepare a release"
            </Text>
          </Box>
          <Text dimColor>Press Enter to plan | Esc to quit</Text>
        </Box>
      )}

      {phase === 'planning' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="cyan">Analyzing your task...</Text>
          <Text dimColor>Decomposing into command chain</Text>
        </Box>
      )}

      {phase === 'confirm' && chain && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Execution Plan: {chain.summary}</Text>
          <Text dimColor>Estimated time: {chain.estimatedTime}</Text>
          <Box flexDirection="column" marginTop={1}>
            {chain.steps.map((step: CommandStep, i: number) => (
              <Text key={i}>
                {i + 1}. {step.description}
                <Text dimColor> — /{step.command} {step.args}</Text>
              </Text>
            ))}
          </Box>
          <Box marginTop={1}><Text dimColor>Execute this plan? (Y/n)</Text></Box>
        </Box>
      )}

      {phase === 'executing' && chain && (
        <Box flexDirection="column" marginY={1}>
          <Text color="cyan">Executing plan...</Text>
          {chain.steps.map((step: CommandStep, i: number) => {
            const result = results[i]
            const icon = !result ? '...' :
                         result.status === 'running' ? '>' :
                         result.status === 'success' ? 'OK' :
                         result.status === 'error' ? 'FAIL' : 'SKIP'
            const color = !result ? 'gray' :
                          result.status === 'running' ? 'cyan' :
                          result.status === 'success' ? 'green' :
                          result.status === 'error' ? 'red' : 'yellow'
            return (
              <Text key={i} color={color}>
                {icon} {step.description}
              </Text>
            )
          })}
          <Box marginTop={1}><Text dimColor>Press Esc to abort</Text></Box>
        </Box>
      )}

      {phase === 'results' && (
        <Box flexDirection="column" marginY={1}>
          {error ? (
            <Text color="red">Error: {error}</Text>
          ) : (
            <>
              <Text color="green" bold>Chain Complete!</Text>
              {chain?.steps.map((step: CommandStep, i: number) => {
                const result = results[i]
                const icon = result?.status === 'success' ? 'OK' :
                             result?.status === 'error' ? 'FAIL' :
                             result?.status === 'skipped' ? 'SKIP' : '?'
                return (
                  <Text key={i}>
                    <Text color={result?.status === 'success' ? 'green' : result?.status === 'error' ? 'red' : 'yellow'}>
                      {icon}
                    </Text>
                    {' '}{step.description}
                  </Text>
                )
              })}
              <Box marginTop={1}>
                <Text dimColor>
                  {results.filter(r => r.status === 'success').length}/{results.length} steps completed
                </Text>
              </Box>
              <Text dimColor>Press Enter to run another task</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}
