/**
 * Snippets Command
 *
 * Manage a library of reusable code snippets.
 * Save, search, categorize, and insert snippets.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

type Step = 'list' | 'view' | 'add' | 'search'

interface Snippet {
  id: string
  name: string
  description: string
  category: string
  language: string
  content: string
  tags: string[]
  createdAt: number
}

const SNIPPETS_DIR = join(homedir(), '.claude', 'snippets')
const SNIPPETS_FILE = join(SNIPPETS_DIR, 'snippets.json')

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'react-fc', name: 'React Functional Component', description: 'TypeScript React functional component with props',
    category: 'react', language: 'tsx', tags: ['react', 'component', 'typescript'],
    createdAt: Date.now(),
    content: `interface Props {
  // Define props here
}

export function Component({}: Props) {
  return (
    <div>
      {/* Component content */}
    </div>
  )
}`,
  },
  {
    id: 'express-route', name: 'Express Route Handler', description: 'Express.js route handler with error handling',
    category: 'backend', language: 'typescript', tags: ['express', 'api', 'route'],
    createdAt: Date.now(),
    content: `app.get('/api/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    // Handle request
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})`,
  },
  {
    id: 'try-catch', name: 'Try-Catch Block', description: 'Standard try-catch with typed error',
    category: 'utility', language: 'typescript', tags: ['error-handling'],
    createdAt: Date.now(),
    content: `try {
  // Code that might throw
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message)
  }
}`,
  },
]

function loadSnippets(): Snippet[] {
  if (!existsSync(SNIPPETS_FILE)) {
    mkdirSync(SNIPPETS_DIR, { recursive: true })
    writeFileSync(SNIPPETS_FILE, JSON.stringify(DEFAULT_SNIPPETS, null, 2), 'utf-8')
    return DEFAULT_SNIPPETS
  }
  try {
    return JSON.parse(readFileSync(SNIPPETS_FILE, 'utf-8')) as Snippet[]
  } catch {
    return DEFAULT_SNIPPETS
  }
}

function saveSnippets(snippets: Snippet[]): void {
  mkdirSync(SNIPPETS_DIR, { recursive: true })
  writeFileSync(SNIPPETS_FILE, JSON.stringify(snippets, null, 2), 'utf-8')
}

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async onDone => {
  return <SnippetsUI onClose={onDone} />
}

function SnippetsUI({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('list')
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewIdx, setViewIdx] = useState(0)

  useEffect(() => {
    setSnippets(loadSnippets())
  }, [])

  const filteredSnippets = searchQuery
    ? snippets.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : snippets

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (step === 'list') onClose()
      else { setStep('list'); setSearchQuery('') }
      return
    }
    if (step === 'list') {
      if (key.upArrow && selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
      if (key.downArrow && selectedIdx < filteredSnippets.length - 1) setSelectedIdx(selectedIdx + 1)
      if (key.return && filteredSnippets[selectedIdx]) {
        setViewIdx(selectedIdx)
        setStep('view')
      }
      if (input === '/') {
        setStep('search')
        setSearchQuery('')
      }
    }
    if (step === 'view') {
      if (key.escape || input === 'q') setStep('list')
    }
    if (step === 'search') {
      if (key.escape) { setStep('list'); setSearchQuery('') }
      if (key.backspace || key.delete) setSearchQuery(prev => prev.slice(0, -1))
      if (input && !key.ctrl && !key.meta && !key.return) setSearchQuery(prev => prev + input)
      if (key.return) { setStep('list'); setSelectedIdx(0) }
    }
  })

  const snippet = filteredSnippets[viewIdx]

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Box flexDirection="row">
        <Text bold color="yellow">Snippets Library</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {step === 'list' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>{snippets.length} snippets</Text>
          <Text dimColor>Press Enter to view | / to search | q to quit</Text>
          {filteredSnippets.slice(0, 15).map((s, i) => (
            <Text key={s.id} color={i === selectedIdx ? 'yellow' : undefined}>
              {i === selectedIdx ? '>' : ' '}
              <Text bold>{s.name}</Text>
              <Text dimColor> [{s.category}] {s.description}</Text>
            </Text>
          ))}
          {filteredSnippets.length > 15 && <Text dimColor>... and {filteredSnippets.length - 15} more</Text>}
        </Box>
      )}

      {step === 'view' && snippet && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>{snippet.name}</Text>
          <Text dimColor>{snippet.description}</Text>
          <Text dimColor>Category: {snippet.category} | Language: {snippet.language} | Tags: {snippet.tags.join(', ')}</Text>
          <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
            <Text>{snippet.content.slice(0, 300)}{snippet.content.length > 300 ? '...' : ''}</Text>
          </Box>
          <Text dimColor>Press q to go back</Text>
        </Box>
      )}

      {step === 'search' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Search snippets:</Text>
          <Text color="yellow">{searchQuery || '(type to search)'}</Text>
          <Text dimColor>Press Enter to filter | Esc to cancel</Text>
        </Box>
      )}
    </Box>
  )
}
