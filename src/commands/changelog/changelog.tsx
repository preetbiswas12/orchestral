/**
 * Changelog Generator
 *
 * Auto-generates changelogs from git history using conventional commits.
 * Supports grouping by type, filtering by version, and multiple output formats.
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { execa } from 'execa'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

type Step = 'config' | 'generating' | 'result'
type Format = 'markdown' | 'json' | 'plain'

interface ChangelogEntry {
  version: string
  date: string
  features: string[]
  fixes: string[]
  docs: string[]
  perf: string[]
  refactor: string[]
  build: string[]
  chore: string[]
  breaking: string[]
  other: string[]
}

export const call: LocalJSXCommandCall = async onDone => {
  return <ChangelogUI onClose={onDone} />
}

function ChangelogUI({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('config')
  const [format, setFormat] = useState<Format>('markdown')
  const [since, setSince] = useState('') // empty = all
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [preview, setPreview] = useState('')
  const [error, setError] = useState<string | null>(null)

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose()
    }

    if (step === 'config') {
      if (input === '1') { setFormat('markdown'); generateChangelog() }
      if (input === '2') { setFormat('json'); generateChangelog() }
      if (input === '3') { setFormat('plain'); generateChangelog() }
    }

    if (step === 'result') {
      if (input === 's') saveChangelog()
      if (input === 'r') setStep('config')
    }
  })

  const generateChangelog = async () => {
    setStep('generating')
    setError(null)

    try {
      // Get git log with conventional commits
      const args = ['log', '--pretty=format:%H|%s|%b|%ai|%D', '--no-merges']
      if (since) {
        args.push(`--since=${since}`)
      }

      const { stdout } = await execa('git', args, {
        cwd: process.cwd(),
        reject: false,
      })

      if (!stdout.trim()) {
        setError('No commits found. Make sure you have git history.')
        setStep('result')
        return
      }

      const changelogEntries = parseGitLog(stdout)
      setEntries(changelogEntries)

      const rendered = renderChangelog(changelogEntries, format)
      setPreview(rendered)
      setStep('result')
    } catch (err) {
      setError(`Failed to generate changelog: ${err}`)
      setStep('result')
    }
  }

  const saveChangelog = () => {
    try {
      const cwd = process.cwd()
      const filename = format === 'json' ? 'changelog.json' : 'CHANGELOG.md'
      const filepath = join(cwd, filename)

      // Append to existing or create new
      let content = preview
      if (existsSync(filepath) && format === 'markdown') {
        const existing = readFileSync(filepath, 'utf-8')
        content = preview + '\n\n' + existing
      }

      writeFileSync(filepath, content, 'utf-8')
    } catch (err) {
      setError(`Failed to save: ${err}`)
    }
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="orange" padding={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="orange">📋 Changelog Generator</Text>
        <Text dimColor>q: quit</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" width="100%" />

      {step === 'config' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Select output format:</Text>
          <Text>[1] Markdown (CHANGELOG.md)</Text>
          <Text>[2] JSON (changelog.json)</Text>
          <Text>[3] Plain text</Text>
        </Box>
      )}

      {step === 'generating' && (
        <Text color="cyan">⏳ Generating changelog from git history...</Text>
      )}

      {step === 'result' && (
        <Box flexDirection="column" marginY={1}>
          {error ? (
            <Text color="red">❌ {error}</Text>
          ) : (
            <>
              <Text bold>Changelog Preview:</Text>
              <Text dimColor>{`${entries.length} version(s) found`}</Text>
              <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
                <Text>{preview.slice(0, 1000)}{preview.length > 1000 ? '...' : ''}</Text>
              </Box>
              <Text dimColor>Press 's' to save, 'r' to regenerate</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}

// ============================================================================
// Git Log Parsing
// ============================================================================

function parseGitLog(log: string): ChangelogEntry[] {
  const commits = log.split('\n').filter(line => line.trim())
  const versionMap = new Map<string, ChangelogEntry>()

  // Group commits by version tag or date
  let currentVersion = 'Unreleased'
  let currentDate = new Date().toISOString().split('T')[0]

  for (const commit of commits) {
    const parts = commit.split('|')
    if (parts.length < 4) continue

    const [hash, subject, body, date] = parts
    const dateStr = date.split(' ')[0]

    // Check for version tags in refs
    const refs = parts[4] || ''
    const versionMatch = refs.match(/tag: v?(\d+\.\d+\.\d+)/)
    if (versionMatch) {
      currentVersion = versionMatch[1]
      currentDate = dateStr
    }

    if (!versionMap.has(currentVersion)) {
      versionMap.set(currentVersion, {
        version: currentVersion,
        date: currentDate,
        features: [],
        fixes: [],
        docs: [],
        perf: [],
        refactor: [],
        build: [],
        chore: [],
        breaking: [],
        other: [],
      })
    }

    const entry = versionMap.get(currentVersion)!

    // Parse conventional commit
    const convMatch = subject.match(/^(feat|fix|docs|style|refactor|perf|test|build|chore|revert)(?:\(([^)]+)\))?(!)?:\s*(.+)/i)

    if (convMatch) {
      const [, type, scope, breaking, message] = convMatch
      const prefix = scope ? `**${scope}**: ` : ''
      const line = `- ${prefix}${message}`

      if (breaking === '!') {
        entry.breaking.push(`⚠️ ${line}`)
      }

      switch (type.toLowerCase()) {
        case 'feat': entry.features.push(line); break
        case 'fix': entry.fixes.push(line); break
        case 'docs': entry.docs.push(line); break
        case 'perf': entry.perf.push(line); break
        case 'refactor': entry.refactor.push(line); break
        case 'build': entry.build.push(line); break
        case 'chore': entry.chore.push(line); break
        default: entry.other.push(line); break
      }
    } else {
      entry.other.push(`- ${subject}`)
    }
  }

  return Array.from(versionMap.values())
}

// ============================================================================
// Rendering
// ============================================================================

function renderChangelog(entries: ChangelogEntry[], format: Format): string {
  switch (format) {
    case 'markdown': return renderMarkdown(entries)
    case 'json': return renderJson(entries)
    case 'plain': return renderPlain(entries)
  }
}

function renderMarkdown(entries: ChangelogEntry[]): string {
  const lines: string[] = ['# Changelog\n']

  for (const entry of entries) {
    lines.push(`## [${entry.version}] - ${entry.date}\n`)

    if (entry.breaking.length) {
      lines.push('### ⚠️ Breaking Changes\n')
      lines.push(...entry.breaking, '')
    }
    if (entry.features.length) {
      lines.push('### ✨ Features\n')
      lines.push(...entry.features, '')
    }
    if (entry.fixes.length) {
      lines.push('### 🐛 Bug Fixes\n')
      lines.push(...entry.fixes, '')
    }
    if (entry.perf.length) {
      lines.push('### ⚡ Performance\n')
      lines.push(...entry.perf, '')
    }
    if (entry.docs.length) {
      lines.push('### 📝 Documentation\n')
      lines.push(...entry.docs, '')
    }
    if (entry.refactor.length) {
      lines.push('### ♻️ Refactoring\n')
      lines.push(...entry.refactor, '')
    }
    if (entry.build.length) {
      lines.push('🔧 Build\n')
      lines.push(...entry.build, '')
    }
    if (entry.other.length) {
      lines.push('### 🔨 Other\n')
      lines.push(...entry.other, '')
    }
  }

  return lines.join('\n')
}

function renderJson(entries: ChangelogEntry[]): string {
  return JSON.stringify(entries, null, 2)
}

function renderPlain(entries: ChangelogEntry[]): string {
  const lines: string[] = ['CHANGELOG\n=========\n']

  for (const entry of entries) {
    lines.push(`Version ${entry.version} (${entry.date})\n`)

    const allChanges = [
      ...entry.features.map(f => `  FEATURE: ${f}`),
      ...entry.fixes.map(f => `  FIX: ${f}`),
      ...entry.perf.map(f => `  PERF: ${f}`),
      ...entry.docs.map(f => `  DOCS: ${f}`),
      ...entry.refactor.map(f => `  REFACTOR: ${f}`),
      ...entry.breaking.map(f => `  BREAKING: ${f}`),
      ...entry.other.map(f => `  OTHER: ${f}`),
    ]

    lines.push(...allChanges, '')
  }

  return lines.join('\n')
}

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>
