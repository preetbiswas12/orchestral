/**
 * AI-Powered Commit Message Generator
 *
 * Analyzes staged changes and generates conventional commit messages.
 * Supports all conventional commit types and scopes.
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { execa } from 'execa'

type Step = 'analyzing' | 'result' | 'committing' | 'done'

interface CommitSuggestion {
  type: string
  scope: string
  subject: string
  body: string
  breaking: boolean
}

const COMMIT_TYPES = [
  { type: 'feat', description: 'A new feature', emoji: '✨' },
  { type: 'fix', description: 'A bug fix', emoji: '🐛' },
  { type: 'docs', description: 'Documentation only', emoji: '📝' },
  { type: 'style', description: 'Formatting, missing semi-colons, etc', emoji: '💄' },
  { type: 'refactor', description: 'Code change that neither fixes a bug nor adds a feature', emoji: '♻️' },
  { type: 'perf', description: 'Performance improvement', emoji: '⚡' },
  { type: 'test', description: 'Adding or updating tests', emoji: '✅' },
  { type: 'build', description: 'Build system or external dependencies', emoji: '🔧' },
  { type: 'ci', description: 'CI configuration', emoji: '👷' },
  { type: 'chore', description: 'Other changes that don\'t modify src or test', emoji: '🔨' },
  { type: 'revert', description: 'Reverts a previous commit', emoji: '⏪' },
]

export const call: LocalJSXCommandCall = async onDone => {
  return <CommitGenUI onClose={onDone} />
}

function CommitGenUI({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('analyzing')
  const [diff, setDiff] = useState('')
  const [suggestions, setSuggestions] = useState<CommitSuggestion[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    analyzeChanges()
  }, [])

  const analyzeChanges = async () => {
    try {
      // Get staged diff
      const { stdout: stagedDiff } = await execa('git', ['diff', '--staged', '--no-color'], {
        cwd: process.cwd(),
        reject: false,
      })

      if (!stagedDiff.trim()) {
        // Try unstaged if no staged changes
        const { stdout: unstagedDiff } = await execa('git', ['diff', '--no-color'], {
          cwd: process.cwd(),
          reject: false,
        })
        if (!unstagedDiff.trim()) {
          setError('No changes found. Stage some changes first with git add.')
          setStep('done')
          return
        }
        setDiff(unstagedDiff)
        generateSuggestions(unstagedDiff)
      } else {
        setDiff(stagedDiff)
        generateSuggestions(stagedDiff)
      }

      setStep('result')
    } catch (err) {
      setError(`Failed to analyze changes: ${err}`)
      setStep('done')
    }
  }

  const generateSuggestions = (diffText: string) => {
    const suggestions: CommitSuggestion[] = []

    // Analyze the diff to determine commit type and scope
    const files = diffText.match(/diff --git a\/(.+?) b\//g)?.map(m => m.replace(/diff --git a\//, '').replace(/ b\//, '')) || []
    const addedLines = (diffText.match(/^\+[^+]/gm) || []).length
    const removedLines = (diffText.match(/^-[^-]/gm) || []).length

    // Determine scope from file paths
    const scopes = new Set<string>()
    for (const file of files) {
      const parts = file.split('/')
      if (parts.length > 1) {
        scopes.add(parts[0])
      }
    }
    const scope = scopes.size === 1 ? [...scopes][0] : ''

    // Determine commit type from patterns
    const hasTestFiles = files.some(f => f.includes('test') || f.includes('spec') || f.includes('__tests__'))
    const hasDocFiles = files.some(f => f.endsWith('.md') || f.includes('docs/') || f.includes('README'))
    const hasConfigFiles = files.some(f => f.includes('package.json') || f.includes('tsconfig') || f.includes('.config.'))
    const hasStyleChanges = files.some(f => f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.less'))

    // Count significant changes
    const totalChanges = addedLines + removedLines
    const isLargeChange = totalChanges > 100

    // Generate primary suggestion
    if (hasTestFiles && files.every(f => f.includes('test') || f.includes('spec'))) {
      suggestions.push({
        type: 'test',
        scope,
        subject: `add tests for ${scope || 'module'}`,
        body: `Added ${addedLines} lines of test coverage.\n\nFiles: ${files.join(', ')}`,
        breaking: false,
      })
    } else if (hasDocFiles && files.every(f => f.endsWith('.md') || f.includes('docs/'))) {
      suggestions.push({
        type: 'docs',
        scope,
        subject: `update ${scope ? scope + ' ' : ''}documentation`,
        body: `Documentation changes:\n${files.map(f => `- ${f}`).join('\n')}`,
        breaking: false,
      })
    } else if (hasConfigFiles && files.every(f => f.includes('package.json') || f.includes('.config.'))) {
      suggestions.push({
        type: 'build',
        scope,
        subject: `update ${scope || 'project'} configuration`,
        body: `Configuration changes:\n${files.map(f => `- ${f}`).join('\n')}`,
        breaking: false,
      })
    } else if (hasStyleChanges && files.every(f => f.endsWith('.css') || f.endsWith('.scss'))) {
      suggestions.push({
        type: 'style',
        scope,
        subject: `update ${scope ? scope + ' ' : ''}styles`,
        body: `Style changes:\n${files.map(f => `- ${f}`).join('\n')}`,
        breaking: false,
      })
    } else {
      // Analyze content for more specific type
      const hasBugFixPatterns = /fix|bug|issue|error|crash|null|undefined|patch/i.test(diffText)
      const hasPerfPatterns = /perf|optim|cache|memo|lazy|debounce|throttle/i.test(diffText)
      const hasRefactorPatterns = /refactor|reorganiz|restructur|clean|simplif/i.test(diffText)
      const hasRevertPatterns = /revert|undo|roll\s*back/i.test(diffText)

      if (hasRevertPatterns) {
        suggestions.push({
          type: 'revert',
          scope,
          subject: `revert recent changes in ${scope || 'module'}`,
          body: `Reverting changes from:\n${files.map(f => `- ${f}`).join('\n')}`,
          breaking: false,
        })
      } else if (hasBugFixPatterns) {
        suggestions.push({
          type: 'fix',
          scope,
          subject: `fix issue in ${scope || 'module'}`,
          body: `Fixed ${removedLines} lines, added ${addedLines} lines.\n\nFiles changed:\n${files.map(f => `- ${f}`).join('\n')}`,
          breaking: false,
        })
      } else if (hasPerfPatterns) {
        suggestions.push({
          type: 'perf',
          scope,
          subject: `improve performance in ${scope || 'module'}`,
          body: `Performance improvements:\n${files.map(f => `- ${f}`).join('\n')}`,
          breaking: false,
        })
      } else if (hasRefactorPatterns) {
        suggestions.push({
          type: 'refactor',
          scope,
          subject: `refactor ${scope || 'module'}`,
          body: `Refactoring changes:\n${files.map(f => `- ${f}`).join('\n')}`,
          breaking: false,
        })
      } else {
        // Default to feat for new code, fix for modifications
        const isNewCode = addedLines > removedLines * 2
        suggestions.push({
          type: isNewCode ? 'feat' : 'fix',
          scope,
          subject: `${isNewCode ? 'add' : 'update'} ${scope || 'module'}`,
          body: `${isNewCode ? 'Added' : 'Modified'} ${totalChanges} lines.\n\nFiles:\n${files.map(f => `- ${f}`).join('\n')}`,
          breaking: false,
        })
      }
    }

    // Add alternative suggestions
    if (suggestions[0]?.type !== 'feat') {
      suggestions.push({
        ...suggestions[0],
        type: 'feat',
        subject: `add changes to ${scope || 'module'}`,
      })
    }
    if (suggestions[0]?.type !== 'chore') {
      suggestions.push({
        ...suggestions[0],
        type: 'chore',
        subject: `update ${scope || 'module'}`,
      })
    }

    setSuggestions(suggestions.slice(0, 5))
  }

  const formatCommitMessage = (s: CommitSuggestion): string => {
    const scopeStr = s.scope ? `(${s.scope})` : ''
    const breakingStr = s.breaking ? '!' : ''
    return `${s.type}${scopeStr}${breakingStr}: ${s.subject}\n\n${s.body}`
  }

  const commitWithMessage = async (suggestion: CommitSuggestion) => {
    setStep('committing')
    try {
      const message = formatCommitMessage(suggestion)
      await execa('git', ['commit', '-m', message], { cwd: process.cwd() })
      setStep('done')
    } catch (err) {
      setError(`Commit failed: ${err}`)
      setStep('done')
    }
  }

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose()
    }

    if (step === 'result' && suggestions.length > 0) {
      if (key.upArrow && selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
      if (key.downArrow && selectedIdx < suggestions.length - 1) setSelectedIdx(selectedIdx + 1)
      if (key.return) {
        commitWithMessage(suggestions[selectedIdx])
      }
      if (input === 'c') {
        // Copy to clipboard (just show the message)
        const msg = formatCommitMessage(suggestions[selectedIdx])
        // In a real implementation, use clipboard API
      }
    }

    if (step === 'done') {
      onClose()
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="yellow">📝 Commit Message Generator</Text>
        <Text dimColor>q: quit | ↑↓: select | enter: commit</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" width="100%" />

      {step === 'analyzing' && (
        <Text color="cyan">⏳ Analyzing staged changes...</Text>
      )}

      {step === 'result' && suggestions.length > 0 && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Suggested commit messages:</Text>
          {suggestions.map((s, i) => {
            const typeInfo = COMMIT_TYPES.find(t => t.type === s.type)
            return (
              <Box key={i} flexDirection="column" marginLeft={1}>
                <Text color={i === selectedIdx ? 'yellow' : undefined}>
                  {i === selectedIdx ? '▸' : ' '}
                  {typeInfo?.emoji} <Text bold>{s.type}{s.scope ? `(${s.scope})` : ''}:</Text> {s.subject}
                </Text>
                {i === selectedIdx && (
                  <Box flexDirection="column" marginLeft={3}>
                    <Text dimColor>{s.body.split('\n').slice(0, 3).join('\n')}</Text>
                    <Text dimColor>---</Text>
                    <Text color="green" dimColor>Full message:</Text>
                    <Text dimColor>{formatCommitMessage(s).slice(0, 200)}</Text>
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      )}

      {step === 'committing' && (
        <Text color="cyan">⏳ Creating commit...</Text>
      )}

      {step === 'done' && !error && (
        <Text color="green" bold>✅ Commit created successfully!</Text>
      )}

      {error && (
        <Text color="red">❌ {error}</Text>
      )}
    </Box>
  )
}

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>
