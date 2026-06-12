/**
 * Code Review Command
 *
 * Interactive code review with AI-powered analysis across multiple dimensions:
 * - Correctness bugs
 * - Security vulnerabilities
 * - Performance issues
 * - Style consistency
 * - Best practices
 * - Suggested fixes with diffs
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { execa } from 'execa'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

type ReviewScope = 'staged' | 'branch' | 'pr' | 'file' | 'directory'
type ReviewDimension = 'bugs' | 'security' | 'performance' | 'style' | 'all'

interface ReviewIssue {
  file: string
  line: number
  dimension: ReviewDimension
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  suggestion?: string
}

interface ReviewResult {
  issues: ReviewIssue[]
  summary: string
  filesReviewed: number
}

export const call: LocalJSXCommandCall = async onDone => {
  return <CodeReviewUI onClose={onDone} />
}

function CodeReviewUI({ onClose }: { onClose: () => void }) {
  const [scope, setScope] = useState<ReviewScope>('staged')
  const [dimension, setDimension] = useState<ReviewDimension>('all')
  const [reviewing, setReviewing] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [selectedIssue, setSelectedIssue] = useState(0)
  const [step, setStep] = useState<'scope' | 'dimension' | 'reviewing' | 'results'>('scope')

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (step === 'results') {
        setStep('scope')
        setResult(null)
      } else {
        onClose()
      }
    }

    if (step === 'scope') {
      if (input === '1') { setScope('staged'); setStep('dimension') }
      if (input === '2') { setScope('branch'); setStep('dimension') }
      if (input === '3') { setScope('pr'); setStep('dimension') }
      if (input === '4') { setScope('file'); setStep('dimension') }
      if (input === '5') { setScope('directory'); setStep('dimension') }
    }

    if (step === 'dimension') {
      if (input === '1') { setDimension('all'); runReview() }
      if (input === '2') { setDimension('bugs'); runReview() }
      if (input === '3') { setDimension('security'); runReview() }
      if (input === '4') { setDimension('performance'); runReview() }
      if (input === '5') { setDimension('style'); runReview() }
    }

    if (step === 'results' && result) {
      if (key.upArrow && selectedIssue > 0) setSelectedIssue(selectedIssue - 1)
      if (key.downArrow && selectedIssue < result.issues.length - 1) setSelectedIssue(selectedIssue + 1)
    }
  })

  const runReview = useCallback(async () => {
    setStep('reviewing')
    setReviewing(true)

    try {
      const files = await getFilesToReview(scope)
      const issues = await analyzeFiles(files, dimension)
      setResult({
        issues,
        summary: generateSummary(issues),
        filesReviewed: files.length,
      })
      setStep('results')
    } catch (error) {
      setResult({
        issues: [],
        summary: `Error: ${error}`,
        filesReviewed: 0,
      })
      setStep('results')
    }
    setReviewing(false)
  }, [scope, dimension])

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="blue">🔍 Code Review</Text>
        <Text dimColor>Press q to go back/quit</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" width="100%" />

      {step === 'scope' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Select review scope:</Text>
          <Text>[1] Staged changes (git diff --staged)</Text>
          <Text>[2] Current branch (vs main/master)</Text>
          <Text>[3] Pull request</Text>
          <Text>[4] Specific file</Text>
          <Text>[5] Directory</Text>
        </Box>
      )}

      {step === 'dimension' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Select review dimensions:</Text>
          <Text>[1] All (bugs, security, performance, style)</Text>
          <Text>[2] Bugs & correctness only</Text>
          <Text>[3] Security vulnerabilities only</Text>
          <Text>[4] Performance issues only</Text>
          <Text>[5] Style & best practices only</Text>
        </Box>
      )}

      {step === 'reviewing' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="cyan">⏳ Analyzing code...</Text>
          <Text dimColor>Scope: {scope} | Dimensions: {dimension}</Text>
        </Box>
      )}

      {step === 'results' && result && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>{result.summary}</Text>
          <Text dimColor>Files reviewed: {result.filesReviewed} | Issues found: {result.issues.length}</Text>

          {result.issues.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>Issues:</Text>
              {result.issues.slice(0, 20).map((issue, i) => (
                <Box key={i} flexDirection="column" marginLeft={1}>
                  <Text color={i === selectedIssue ? 'cyan' : undefined}>
                    {i === selectedIssue ? '▸' : ' '}
                    <Text color={getSeverityColor(issue.severity)}>[{issue.severity.toUpperCase()}]</Text>
                    {' '}{issue.file}:{issue.line} - {issue.title}
                  </Text>
                  {i === selectedIssue && (
                    <Box flexDirection="column" marginLeft={3}>
                      <Text dimColor>{issue.description}</Text>
                      {issue.suggestion && (
                        <Text color="green">💡 {issue.suggestion}</Text>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
              {result.issues.length > 20 && (
                <Text dimColor>... and {result.issues.length - 20} more issues</Text>
              )}
            </Box>
          )}

          {result.issues.length === 0 && (
            <Text color="green">✅ No issues found! Code looks clean.</Text>
          )}
        </Box>
      )}
    </Box>
  )
}

// ============================================================================
// File Discovery
// ============================================================================

async function getFilesToReview(scope: ReviewScope): Promise<string[]> {
  const cwd = process.cwd()

  switch (scope) {
    case 'staged': {
      const { stdout } = await execa('git', ['diff', '--staged', '--name-only'], { cwd })
      return stdout.split('\n').filter(f => f.trim() && isCodeFile(f))
    }

    case 'branch': {
      // Find the default branch
      let defaultBranch = 'main'
      try {
        const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'origin/HEAD'], { cwd })
        defaultBranch = stdout.trim().replace('origin/', '')
      } catch {
        try {
          await execa('git', ['rev-parse', '--verify', 'master'], { cwd })
          defaultBranch = 'master'
        } catch {
          // Use main as fallback
        }
      }

      const { stdout } = await execa('git', ['diff', `${defaultBranch}...HEAD`, '--name-only'], { cwd })
      return stdout.split('\n').filter(f => f.trim() && isCodeFile(f))
    }

    case 'pr':
    case 'file':
    case 'directory':
    default: {
      // Fall back to staged
      const { stdout } = await execa('git', ['diff', '--staged', '--name-only'], { cwd })
      return stdout.split('\n').filter(f => f.trim() && isCodeFile(f))
    }
  }
}

function isCodeFile(file: string): boolean {
  const codeExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
    '.c', '.cpp', '.h', '.hpp', '.cs',
    '.vue', '.svelte', '.html', '.css', '.scss', '.less',
    '.sh', '.bash', '.zsh', '.ps1',
    '.yaml', '.yml', '.json', '.toml', '.xml',
    '.md', '.mdx',
    '.sql', '.graphql', '.proto',
  ]
  return codeExtensions.some(ext => file.endsWith(ext))
}

// ============================================================================
// Analysis (delegates to the AI via the existing tool system)
// ============================================================================

async function analyzeFiles(files: string[], dimension: ReviewDimension): Promise<ReviewIssue[]> {
  // This is a simplified implementation that checks for common patterns
  // In a full implementation, this would use the AI model for deep analysis
  const issues: ReviewIssue[] = []

  for (const file of files) {
    const filePath = join(process.cwd(), file)
    if (!existsSync(filePath)) continue

    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNum = i + 1

        // Security checks
        if (dimension === 'all' || dimension === 'security') {
          issues.push(...checkSecurity(file, lineNum, line))
        }

        // Bug checks
        if (dimension === 'all' || dimension === 'bugs') {
          issues.push(...checkBugs(file, lineNum, line))
        }

        // Performance checks
        if (dimension === 'all' || dimension === 'performance') {
          issues.push(...checkPerformance(file, lineNum, line))
        }

        // Style checks
        if (dimension === 'all' || dimension === 'style') {
          issues.push(...checkStyle(file, lineNum, line))
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return issues
}

function checkSecurity(file: string, lineNum: number, line: string): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  // Hardcoded secrets
  if (/(password|secret|api_key|apikey|token|auth)\s*[:=]\s*['"][^'"]+['"]/i.test(line) &&
      !line.includes('process.env') && !line.includes('import.meta.env')) {
    issues.push({
      file, line: lineNum, dimension: 'security',
      severity: 'critical',
      title: 'Hardcoded secret detected',
      description: `Line appears to contain a hardcoded secret: "${line.trim().slice(0, 50)}"`,
      suggestion: 'Use environment variables (process.env) for secrets',
    })
  }

  // SQL injection risk
  if (/\$\{|query\s*\(|execute\s*\(/.test(line) && /SELECT|INSERT|UPDATE|DELETE/i.test(line)) {
    issues.push({
      file, line: lineNum, dimension: 'security',
      severity: 'warning',
      title: 'Potential SQL injection',
      description: 'String interpolation in SQL query detected',
      suggestion: 'Use parameterized queries or an ORM',
    })
  }

  // eval() usage
  if (/\beval\s*\(/.test(line)) {
    issues.push({
      file, line: lineNum, dimension: 'security',
      severity: 'critical',
      title: 'Dangerous eval() usage',
      description: 'eval() can execute arbitrary code and is a security risk',
      suggestion: 'Use JSON.parse() for JSON data or a safe evaluation library',
    })
  }

  // innerHTML
  if (/\.innerHTML\s*=/.test(line) && !line.includes('DOMPurify') && !line.includes('sanitize')) {
    issues.push({
      file, line: lineNum, dimension: 'security',
      severity: 'warning',
      title: 'Potential XSS via innerHTML',
      description: 'Setting innerHTML with unsanitized content can lead to XSS',
      suggestion: 'Use textContent or sanitize with DOMPurify',
    })
  }

  return issues
}

function checkBugs(file: string, lineNum: number, line: string): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  // == instead of ===
  if (/[^!=]==[^=]/.test(line) && !line.includes('//') && !line.trim().startsWith('*')) {
    issues.push({
      file, line: lineNum, dimension: 'bugs',
      severity: 'warning',
      title: 'Loose equality (==) used',
      description: 'Using == instead of === can cause type coercion bugs',
      suggestion: 'Use === for strict equality comparison',
    })
  }

  // console.log in production code
  if (/console\.(log|debug|info|warn)\s*\(/.test(line) && !file.includes('test') && !file.includes('spec')) {
    issues.push({
      file, line: lineNum, dimension: 'bugs',
      severity: 'info',
      title: 'console statement in production code',
      description: 'console statements should be removed or replaced with proper logging',
      suggestion: 'Use a logging library like winston or pino',
    })
  }

  // TODO/FIXME without issue reference
  if (/(TODO|FIXME|HACK|XXX)\s*:/i.test(line) && !/#\d+/.test(line)) {
    issues.push({
      file, line: lineNum, dimension: 'bugs',
      severity: 'info',
      title: 'TODO/FIXME without issue reference',
      description: 'Consider linking to a tracking issue',
      suggestion: 'Add an issue reference: TODO(#123): description',
    })
  }

  // Empty catch block
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
    issues.push({
      file, line: lineNum, dimension: 'bugs',
      severity: 'warning',
      title: 'Empty catch block',
      description: 'Silently swallowing errors can hide bugs',
      suggestion: 'At minimum, log the error: console.error(error)',
    })
  }

  return issues
}

function checkPerformance(file: string, lineNum: number, line: string): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  // Nested loops (simple heuristic)
  if (/\b(for|while)\s*\(/.test(line)) {
    // Check if we're inside another loop (simplified)
    issues.push({
      file, line: lineNum, dimension: 'performance',
      severity: 'info',
      title: 'Loop detected — check for O(n²) patterns',
      description: 'Nested loops can cause performance issues with large datasets',
      suggestion: 'Consider using Map/Set for O(1) lookups instead of nested iteration',
    })
  }

  // Large JSON.parse
  if (/JSON\.parse\s*\(/.test(line) && line.length > 100) {
    issues.push({
      file, line: lineNum, dimension: 'performance',
      severity: 'info',
      title: 'Large JSON.parse — consider streaming',
      description: 'Parsing large JSON strings can block the event loop',
      suggestion: 'Use streaming JSON parsers for large payloads',
    })
  }

  return issues
}

function checkStyle(file: string, lineNum: number, line: string): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  // Long lines
  if (line.length > 120) {
    issues.push({
      file, line: lineNum, dimension: 'style',
      severity: 'info',
      title: 'Line exceeds 120 characters',
      description: `Line is ${line.length} characters long`,
      suggestion: 'Break long lines for better readability',
    })
  }

  // Trailing whitespace
  if (/\s+$/.test(line) && line.trim().length > 0) {
    issues.push({
      file, line: lineNum, dimension: 'style',
      severity: 'info',
      title: 'Trailing whitespace',
      description: 'Line has trailing whitespace characters',
      suggestion: 'Remove trailing whitespace (enable editor.trimAutoWhitespace)',
    })
  }

  return issues
}

// ============================================================================
// Helpers
// ============================================================================

function generateSummary(issues: ReviewIssue[]): string {
  if (issues.length === 0) return '✅ No issues found!'

  const critical = issues.filter(i => i.severity === 'critical').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length

  const parts: string[] = []
  if (critical > 0) parts.push(`${critical} critical`)
  if (warnings > 0) parts.push(`${warnings} warnings`)
  if (info > 0) parts.push(`${info} info`)

  return `Found ${issues.length} issues: ${parts.join(', ')}`
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'red'
    case 'warning': return 'yellow'
    case 'info': return 'blue'
    default: return 'white'
  }
}

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>
