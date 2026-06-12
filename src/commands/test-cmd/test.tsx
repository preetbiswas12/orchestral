/**
 * Test Runner Command
 *
 * Universal test runner with auto-detection, results parsing, and auto-fix.
 * Supports Jest, Vitest, Pytest, Go test, Rust cargo test, and more.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { execa } from 'execa'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

type TestFramework = 'jest' | 'vitest' | 'pytest' | 'go-test' | 'cargo-test' | 'mocha' | 'bun-test' | 'unknown'
type TestState = 'detecting' | 'ready' | 'running' | 'results'

interface TestResult {
  framework: TestFramework
  totalTests: number
  passed: number
  failed: number
  skipped: number
  duration: number
  failures: TestFailure[]
  coverage?: number
}

interface TestFailure {
  testName: string
  file: string
  error: string
  suggestion?: string
}

export const call: LocalJSXCommandCall = async onDone => {
  return <TestRunnerUI onClose={onDone} />
}

function TestRunnerUI({ onClose }: { onClose: () => void }) {
  const [framework, setFramework] = useState<TestFramework>('unknown')
  const [state, setState] = useState<TestState>('detecting')
  const [result, setResult] = useState<TestResult | null>(null)
  const [selectedFailure, setSelectedFailure] = useState(0)
  const [watchMode, setWatchMode] = useState(false)

  // Auto-detect framework
  useEffect(() => {
    const detected = detectTestFramework()
    setFramework(detected)
    setState('ready')
  }, [])

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose()
    }

    if (state === 'ready') {
      if (input === 'r' || input === ' ') {
        runTests()
      }
      if (input === 'w') {
        setWatchMode(!watchMode)
      }
      if (input === 'a') {
        runTests('--all')
      }
    }

    if (state === 'results' && result) {
      if (key.upArrow && selectedFailure > 0) setSelectedFailure(selectedFailure - 1)
      if (key.downArrow && selectedFailure < result.failures.length - 1) setSelectedFailure(selectedFailure + 1)
      if (input === 'r') runTests()
      if (input === 'f') runTests('--only-failures')
    }
  })

  const runTests = useCallback(async (flags?: string) => {
    setState('running')
    try {
      const testResult = await executeTests(framework, flags)
      setResult(testResult)
      setState('results')
    } catch (error) {
      setResult({
        framework,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        failures: [{
          testName: 'Test execution failed',
          file: '',
          error: String(error),
        }],
      })
      setState('results')
    }
  }, [framework])

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="green">🧪 Test Runner</Text>
        <Text dimColor>q: quit | r: run | w: watch | a: all</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" width="100%" />

      <Box flexDirection="row" gap={4} marginY={1}>
        <Box flexDirection="column">
          <Text dimColor>Framework</Text>
          <Text color="cyan">{framework === 'unknown' ? 'Not detected' : framework}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Watch Mode</Text>
          <Text color={watchMode ? 'green' : 'gray'}>{watchMode ? 'ON' : 'OFF'}</Text>
        </Box>
      </Box>

      {state === 'detecting' && (
        <Text color="cyan">⏳ Detecting test framework...</Text>
      )}

      {state === 'ready' && (
        <Box flexDirection="column" marginY={1}>
          <Text>Press <Text bold>r</Text> to run tests</Text>
          <Text>Press <Text bold>w</Text> to toggle watch mode</Text>
          <Text>Press <Text bold>a</Text> to run all tests (no cache)</Text>
        </Box>
      )}

      {state === 'running' && (
        <Text color="cyan">⏳ Running tests with {framework}...</Text>
      )}

      {state === 'results' && result && (
        <Box flexDirection="column" marginY={1}>
          <Box flexDirection="row" gap={4}>
            <Text bold>Results:</Text>
            <Text color="green">{result.passed} passed</Text>
            {result.failed > 0 && <Text color="red">{result.failed} failed</Text>}
            {result.skipped > 0 && <Text color="yellow">{result.skipped} skipped</Text>}
            <Text dimColor>{result.totalTests} total</Text>
            <Text dimColor>{result.duration}ms</Text>
          </Box>

          {result.coverage !== undefined && (
            <Box flexDirection="row" gap={2}>
              <Text dimColor>Coverage:</Text>
              <Text color={result.coverage >= 80 ? 'green' : result.coverage >= 60 ? 'yellow' : 'red'}>
                {result.coverage.toFixed(1)}%
              </Text>
            </Box>
          )}

          {result.failures.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="red">Failures:</Text>
              {result.failures.map((f, i) => (
                <Box key={i} flexDirection="column" marginLeft={1}>
                  <Text color={i === selectedFailure ? 'cyan' : undefined}>
                    {i === selectedFailure ? '▸' : ' '}
                    ❌ {f.testName}
                  </Text>
                  {f.file && <Text dimColor>   {f.file}</Text>}
                  {i === selectedFailure && (
                    <Box flexDirection="column" marginLeft={3}>
                      <Text color="red" dimColor>{f.error.slice(0, 200)}</Text>
                      {f.suggestion && (
                        <Text color="green">💡 {f.suggestion}</Text>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {result.failed === 0 && (
            <Text color="green" bold>✅ All tests passed!</Text>
          )}
        </Box>
      )}
    </Box>
  )
}

// ============================================================================
// Framework Detection
// ============================================================================

function detectTestFramework(): TestFramework {
  const cwd = process.cwd()

  // Check package.json for test configuration
  const pkgJsonPath = join(cwd, 'package.json')
  if (existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }

      if (allDeps.vitest) return 'vitest'
      if (allDeps.jest) return 'jest'
      if (allDeps.mocha) return 'mocha'
      if (allDeps['@playwright/test']) return 'jest' // Playwright uses Jest-like

      // Check test script
      const testScript = pkg.scripts?.test ?? ''
      if (testScript.includes('vitest')) return 'vitest'
      if (testScript.includes('jest')) return 'jest'
      if (testScript.includes('mocha')) return 'mocha'
      if (testScript.includes('bun test')) return 'bun-test'
    } catch {
      // Ignore parse errors
    }
  }

  // Check for config files
  if (existsSync(join(cwd, 'vitest.config.ts')) || existsSync(join(cwd, 'vitest.config.js'))) return 'vitest'
  if (existsSync(join(cwd, 'jest.config.ts')) || existsSync(join(cwd, 'jest.config.js'))) return 'jest'
  if (existsSync(join(cwd, '.jestrc')) || existsSync(join(cwd, '.jestrc.json'))) return 'jest'
  if (existsSync(join(cwd, 'pytest.ini')) || existsSync(join(cwd, 'pyproject.toml'))) return 'pytest'
  if (existsSync(join(cwd, 'go.mod'))) return 'go-test'
  if (existsSync(join(cwd, 'Cargo.toml'))) return 'cargo-test'

  return 'unknown'
}

// ============================================================================
// Test Execution
// ============================================================================

async function executeTests(framework: TestFramework, flags?: string): Promise<TestResult> {
  const cwd = process.cwd()
  let cmd: string
  let args: string[]

  switch (framework) {
    case 'vitest':
      cmd = 'npx'
      args = ['vitest', 'run', '--reporter=verbose']
      if (flags === '--all') args.push('--no-cache')
      if (flags === '--only-failures') args.push('--reuse-failures')
      break

    case 'jest':
      cmd = 'npx'
      args = ['jest', '--verbose', '--no-coverage']
      if (flags === '--all') args.push('--no-cache')
      if (flags === '--only-failures') args.push('--onlyFailures')
      break

    case 'bun-test':
      cmd = 'bun'
      args = ['test']
      break

    case 'pytest':
      cmd = 'python'
      args = ['-m', 'pytest', '-v', '--tb=short']
      if (flags === '--only-failures') args.push('--lf')
      break

    case 'go-test':
      cmd = 'go'
      args = ['test', './...', '-v', '-count=1']
      break

    case 'cargo-test':
      cmd = 'cargo'
      args = ['test', '--', '--nocapture']
      break

    case 'mocha':
      cmd = 'npx'
      args = ['mocha', '--reporter=spec']
      break

    default:
      throw new Error(`Unknown test framework: ${framework}. Please configure manually.`)
  }

  const startTime = Date.now()

  try {
    const { stdout, stderr, exitCode } = await execa(cmd, args, {
      cwd,
      timeout: 120_000,
      reject: false,
    })

    const output = stdout + '\n' + stderr
    const duration = Date.now() - startTime

    return parseTestOutput(framework, output, duration)
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      framework,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      failures: [{
        testName: 'Test execution error',
        file: '',
        error: String(error),
      }],
    }
  }
}

// ============================================================================
// Output Parsing
// ============================================================================

function parseTestOutput(framework: TestFramework, output: string, duration: number): TestResult {
  const failures: TestFailure[] = []
  let totalTests = 0
  let passed = 0
  let failed = 0
  let skipped = 0

  switch (framework) {
    case 'vitest':
    case 'jest':
    case 'bun-test': {
      // Parse "Tests: 5 passed, 2 failed, 1 skipped, 8 total"
      const testsMatch = output.match(/Tests?:\s+(\d+)\s+passed,\s+(\d+)\s+failed|(\d+)\s+passed.*?(\d+)\s+failed|(\d+)\s+passed/g)
      const passedMatch = output.match(/(\d+)\s+passed/g)
      const failedMatch = output.match(/(\d+)\s+failed/g)
      const skippedMatch = output.match(/(\d+)\s+skipped/g)
      const totalMatch = output.match(/(\d+)\s+total/g)

      if (passedMatch) passed = parseInt(passedMatch[1])
      if (failedMatch) failed = parseInt(failedMatch[1])
      if (skippedMatch) skipped = parseInt(skippedMatch[1])
      if (totalMatch) totalTests = parseInt(totalMatch[1])
      else totalTests = passed + failed + skipped

      // Parse individual failures
      const failBlocks = output.split('FAIL ')
      for (const block of failBlocks.slice(1)) {
        const lines = block.split('\n')
        const testName = lines[0]?.trim() ?? 'Unknown test'
        const errorLine = lines.find(l => l.includes('Error') || l.includes('AssertionError') || l.includes('Expected'))
        failures.push({
          testName,
          file: '',
          error: errorLine?.trim() ?? 'Test failed',
          suggestion: generateFixSuggestion(errorLine ?? ''),
        })
      }
      break
    }

    case 'pytest': {
      // Parse "3 passed, 2 failed in 0.05s"
      const summaryMatch = output.match(/(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+skipped)?/i)
      if (summaryMatch) {
        passed = parseInt(summaryMatch[1]) || 0
        failed = parseInt(summaryMatch[2]) || 0
        skipped = parseInt(summaryMatch[3]) || 0
        totalTests = passed + failed + skipped
      }

      // Parse failures
      const failMatch = output.match(/FAILED .*/g)
      if (failMatch) {
        for (const f of failMatch) {
          failures.push({
            testName: f.replace('FAILED ', ''),
            file: '',
            error: 'Test failed',
            suggestion: 'Check the test output for details',
          })
        }
      }
      break
    }

    case 'go-test': {
      const passMatch = output.match(/--- PASS:/g)
      const failMatch = output.match(/--- FAIL:/g)
      passed = passMatch?.length ?? 0
      failed = failMatch?.length ?? 0
      totalTests = passed + failed

      const failLines = output.split('\n').filter(l => l.includes('--- FAIL:'))
      for (const line of failLines) {
        const name = line.replace(/--- FAIL:\s*/, '').trim()
        failures.push({
          testName: name,
          file: '',
          error: 'Go test failed',
          suggestion: 'Run with -v for verbose output',
        })
      }
      break
    }

    case 'cargo-test': {
      const summaryMatch = output.match(/test result:.*?(\d+)\s+passed.*?(\d+)\s+failed/)
      if (summaryMatch) {
        passed = parseInt(summaryMatch[1])
        failed = parseInt(summaryMatch[2])
        totalTests = passed + failed
      }
      break
    }

    default:
      totalTests = 0
  }

  return {
    framework,
    totalTests,
    passed,
    failed,
    skipped,
    duration,
    failures,
  }
}

function generateFixSuggestion(error: string): string | undefined {
  if (error.includes('Cannot read propert')) return 'Check for undefined/null values before accessing properties'
  if (error.includes('is not a function')) return 'Verify the object has the method you are calling'
  if (error.includes('Expected')) return 'Check the expected vs actual values in the assertion'
  if (error.includes('timeout')) return 'Consider increasing the timeout or optimizing the test'
  if (error.includes('ENOENT')) return 'Check that the file path exists'
  if (error.includes('Cannot find module')) return 'Install missing dependencies with npm install'
  return undefined
}

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>
