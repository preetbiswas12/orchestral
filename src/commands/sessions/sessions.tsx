/**
 * Session Management Dashboard
 *
 * Browse, search, and manage Claude Code sessions.
 * View session history, token usage, export/import.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

type Step = 'list' | 'detail'

interface SessionInfo {
  id: string
  name: string
  path: string
  createdAt: number
  modifiedAt: number
  size: number
  messageCount: number
}

const SESSIONS_DIR = join(homedir(), '.claude', 'projects')

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async onDone => {
  return <SessionsUI onClose={onDone} />
}

function SessionsUI({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('list')
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [detailSession, setDetailSession] = useState<SessionInfo | null>(null)

  const scanSessions = useCallback(() => {
    const results: SessionInfo[] = []
    try {
      if (!existsSync(SESSIONS_DIR)) return results
      const dirs = readdirSync(SESSIONS_DIR)
      for (const dir of dirs) {
        const dirPath = join(SESSIONS_DIR, dir)
        try {
          const stat = statSync(dirPath)
          if (!stat.isDirectory()) continue
          // Count JSONL files (session transcripts)
          const files = readdirSync(dirPath)
          const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))
          let messageCount = 0
          let totalSize = 0
          for (const f of jsonlFiles) {
            const fPath = join(dirPath, f)
            try {
              const fStat = statSync(fPath)
              totalSize += fStat.size
              // Count lines (messages) in JSONL
              const content = readFileSync(fPath, 'utf-8')
              messageCount += content.split('\n').filter(l => l.trim()).length
            } catch { /* skip */ }
          }
          results.push({
            id: dir,
            name: dir.replace(/-/g, '/'),
            path: dirPath,
            createdAt: stat.birthtimeMs,
            modifiedAt: stat.mtimeMs,
            size: totalSize,
            messageCount,
          })
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
    return results.sort((a, b) => b.modifiedAt - a.modifiedAt)
  }, [])

  useEffect(() => {
    setSessions(scanSessions())
  }, [scanSessions])

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (step === 'list') onClose()
      else setStep('list')
      return
    }
    if (step === 'list') {
      if (key.upArrow && selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
      if (key.downArrow && selectedIdx < sessions.length - 1) setSelectedIdx(selectedIdx + 1)
      if (key.return && sessions[selectedIdx]) {
        setDetailSession(sessions[selectedIdx])
        setStep('detail')
      }
    }
    if (step === 'detail') {
      if (key.escape || input === 'q') setStep('list')
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
      <Box flexDirection="row">
        <Text bold color="blue">Session Dashboard</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {step === 'list' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>{sessions.length} sessions found</Text>
          <Text dimColor>Press Enter to view details | q to quit</Text>
          {sessions.slice(0, 15).map((s, i) => (
            <Text key={s.id} color={i === selectedIdx ? 'blue' : undefined}>
              {i === selectedIdx ? '>' : ' '}
              <Text bold>{s.name}</Text>
              <Text dimColor> — {s.messageCount} messages, {formatSize(s.size)}, {formatDate(s.modifiedAt)}</Text>
            </Text>
          ))}
          {sessions.length > 15 && <Text dimColor>... and {sessions.length - 15} more</Text>}
          {sessions.length === 0 && <Text dimColor>No sessions found in {SESSIONS_DIR}</Text>}
        </Box>
      )}

      {step === 'detail' && detailSession && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>{detailSession.name}</Text>
          <Text dimColor>ID: {detailSession.id}</Text>
          <Text dimColor>Path: {detailSession.path}</Text>
          <Text dimColor>Messages: {detailSession.messageCount}</Text>
          <Text dimColor>Size: {formatSize(detailSession.size)}</Text>
          <Text dimColor>Created: {formatDate(detailSession.createdAt)}</Text>
          <Text dimColor>Modified: {formatDate(detailSession.modifiedAt)}</Text>
          <Text dimColor>Press q to go back</Text>
        </Box>
      )}
    </Box>
  )
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDate(ts: number): string {
  if (!ts) return 'unknown'
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toISOString().split('T')[0]
}
