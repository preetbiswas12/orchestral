/**
 * Command Palette
 *
 * VS Code-style command palette with fuzzy search, recent commands,
 * keyboard shortcut display, and custom command support.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import Fuse from 'fuse.js'

interface CommandItem {
  id: string
  name: string
  description: string
  category: string
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  commands: CommandItem[]
  onClose: () => void
  onExecute: (command: CommandItem) => void
  recentCommands?: string[]
}

export function CommandPalette({
  commands,
  onClose,
  onExecute,
  recentCommands = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showAll, setShowAll] = useState(false)

  // Fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        keys: [
          { name: 'name', weight: 0.4 },
          { name: 'description', weight: 0.3 },
          { name: 'category', weight: 0.2 },
          { name: 'id', weight: 0.1 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1,
      }),
    [commands],
  )

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all
      const recent = recentCommands
        .map(id => commands.find(c => c.id === id))
        .filter(Boolean) as CommandItem[]
      const rest = commands.filter(c => !recentCommands.includes(c.id))
      return [...recent, ...rest]
    }

    const results = fuse.search(query)
    return results.map(r => r.item)
  }, [query, commands, recentCommands, fuse])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      onExecute(cmd)
      cmd.action()
    },
    [onExecute],
  )

  useInput((input, key) => {
    if (key.escape) {
      onClose()
      return
    }

    if (key.return && filteredCommands[selectedIdx]) {
      executeCommand(filteredCommands[selectedIdx])
      return
    }

    if (key.upArrow) {
      setSelectedIdx(prev => Math.max(0, prev - 1))
      return
    }

    if (key.downArrow) {
      setSelectedIdx(prev => Math.min(filteredCommands.length - 1, prev + 1))
      return
    }

    if (key.pageUp) {
      setSelectedIdx(prev => Math.max(0, prev - 10))
      return
    }

    if (key.pageDown) {
      setSelectedIdx(prev => Math.min(filteredCommands.length - 1, prev + 10))
      return
    }

    if (key.backspace || key.delete) {
      setQuery(prev => prev.slice(0, -1))
      return
    }

    if (input && !key.ctrl && !key.meta) {
      setQuery(prev => prev + input)
    }
  })

  const visibleCommands = showAll ? filteredCommands : filteredCommands.slice(0, 15)

  // Group by category
  const grouped = new Map<string, CommandItem[]>()
  for (const cmd of visibleCommands) {
    const category = cmd.category || 'Other'
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category)!.push(cmd)
  }

  let globalIdx = -1

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
      {/* Search input */}
      <Box flexDirection="row">
        <Text bold color="blue">⌘ </Text>
        <Text>{query}</Text>
        <Text dimColor>_</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" width="100%" />

      {/* Results count */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text dimColor>
          {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''} found
        </Text>
        <Text dimColor>↑↓ navigate | ⏎ execute | Esc close</Text>
      </Box>

      {/* Command list */}
      <Box flexDirection="column" marginTop={1}>
        {Array.from(grouped.entries()).map(([category, cmds]) => (
          <Box key={category} flexDirection="column" marginBottom={1}>
            <Text bold color="gray" dimColor>
              {category}
            </Text>
            {cmds.map(cmd => {
              globalIdx++
              const idx = globalIdx
              const isSelected = idx === selectedIdx

              return (
                <Box key={cmd.id} flexDirection="row" marginLeft={1}>
                  <Text color={isSelected ? 'blue' : undefined}>
                    {isSelected ? '▸' : ' '}
                    <Text bold={isSelected}>{cmd.name}</Text>
                  </Text>
                  <Text dimColor> — {cmd.description}</Text>
                  {cmd.shortcut && (
                    <Text color="yellow" dimColor>
                      {' '}[{cmd.shortcut}]
                    </Text>
                  )}
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>

      {filteredCommands.length > 15 && !showAll && (
        <Text dimColor>
          ... and {filteredCommands.length - 15} more (press Tab to show all)
        </Text>
      )}

      {filteredCommands.length === 0 && (
        <Text color="yellow">No commands match "{query}"</Text>
      )}
    </Box>
  )
}

// ============================================================================
// Built-in Command Registry
// ============================================================================

export interface BuiltinCommand {
  id: string
  name: string
  description: string
  category: string
  shortcut?: string
}

export const BUILTIN_COMMANDS: BuiltinCommand[] = [
  // File operations
  { id: 'file.read', name: 'Read File', description: 'Read contents of a file', category: 'File' },
  { id: 'file.write', name: 'Write File', description: 'Write content to a file', category: 'File' },
  { id: 'file.edit', name: 'Edit File', description: 'Edit a file with diff preview', category: 'File' },
  { id: 'file.glob', name: 'Find Files', description: 'Find files by glob pattern', category: 'File' },
  { id: 'file.grep', name: 'Search in Files', description: 'Search for patterns in files', category: 'File' },

  // Git operations
  { id: 'git.commit', name: 'Commit Changes', description: 'Commit staged changes', category: 'Git', shortcut: '⌘G' },
  { id: 'git.commit-gen', name: 'Generate Commit', description: 'AI-powered commit message', category: 'Git' },
  { id: 'git.changelog', name: 'Generate Changelog', description: 'Auto-generate changelog', category: 'Git' },
  { id: 'git.diff', name: 'View Diff', description: 'View changes', category: 'Git' },
  { id: 'git.branch', name: 'Branch', description: 'Branch operations', category: 'Git' },

  // Project
  { id: 'scaffold', name: 'Scaffold Project', description: 'Create new project from template', category: 'Project' },
  { id: 'test', name: 'Run Tests', description: 'Run test suite', category: 'Project', shortcut: '⌘T' },
  { id: 'code-review', name: 'Code Review', description: 'AI-powered code review', category: 'Project' },
  { id: 'batch', name: 'Batch Operations', description: 'Apply operations across files', category: 'Project' },

  // AI & Models
  { id: 'model', name: 'Switch Model', description: 'Change the AI model', category: 'AI' },
  { id: 'providers', name: 'Manage Providers', description: 'Configure AI providers', category: 'AI' },
  { id: 'token-analytics', name: 'Token Analytics', description: 'View usage and costs', category: 'AI' },
  { id: 'fast', name: 'Fast Mode', description: 'Toggle fast mode', category: 'AI', shortcut: '⌘F' },
  { id: 'effort', name: 'Effort Level', description: 'Set reasoning effort', category: 'AI' },

  // Session
  { id: 'session.new', name: 'New Session', description: 'Start a new session', category: 'Session' },
  { id: 'session.resume', name: 'Resume Session', description: 'Resume a previous session', category: 'Session' },
  { id: 'session.export', name: 'Export Session', description: 'Export session history', category: 'Session' },
  { id: 'compact', name: 'Compact Context', description: 'Compact conversation context', category: 'Session' },

  // Tools
  { id: 'mcp', name: 'MCP Servers', description: 'Manage MCP server connections', category: 'Tools' },
  { id: 'skills', name: 'Skills', description: 'Manage skills', category: 'Tools' },
  { id: 'plugins', name: 'Plugins', description: 'Manage plugins', category: 'Tools' },
  { id: 'hooks', name: 'Hooks', description: 'Manage hooks', category: 'Tools' },

  // Settings
  { id: 'config', name: 'Settings', description: 'Open settings', category: 'Settings', shortcut: '⌘,' },
  { id: 'theme', name: 'Theme', description: 'Change color theme', category: 'Settings' },
  { id: 'keybindings', name: 'Keybindings', description: 'Customize keybindings', category: 'Settings' },
  { id: 'permissions', name: 'Permissions', description: 'Manage tool permissions', category: 'Settings' },

  // Help
  { id: 'help', name: 'Help', description: 'Show help', category: 'Help', shortcut: '⌘H' },
  { id: 'doctor', name: 'Doctor', description: 'Diagnose issues', category: 'Help' },
  { id: 'stats', name: 'Statistics', description: 'View usage statistics', category: 'Help' },
  { id: 'release-notes', name: 'Release Notes', description: 'View release notes', category: 'Help' },
]
