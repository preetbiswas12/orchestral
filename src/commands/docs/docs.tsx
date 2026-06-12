/**
 * Auto-Documentation Command
 *
 * Generates documentation for the current project:
 * - README generation
 * - API documentation
 * - JSDoc/TSDoc comments
 * - Architecture overview
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { execa } from 'execa'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import glob from 'fast-glob'

type DocMode = 'readme' | 'api' | 'jsdoc' | 'architecture'
type Step = 'select-mode' | 'scanning' | 'results'

interface ScanResult {
  filesScanned: number
  filesDocumented: number
  outputPath?: string
  errors: string[]
}

const MODES: { id: DocMode; name: string; description: string }[] = [
  { id: 'readme', name: 'Generate README', description: 'Create a comprehensive README.md for the project' },
  { id: 'api', name: 'API Documentation', description: 'Generate API docs from exported functions and classes' },
  { id: 'jsdoc', name: 'Add JSDoc/TSDoc', description: 'Add missing JSDoc/TSDoc comments to functions' },
  { id: 'architecture', name: 'Architecture Overview', description: 'Generate an architecture diagram and overview' },
]

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>

export const call: LocalJSXCommandCall = async onDone => {
  return <DocsUI onClose={onDone} />
}

function DocsUI({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('select-mode')
  const [modeIdx, setModeIdx] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    setProjectName(basename(process.cwd()))
  }, [])

  const scanProject = useCallback(async (mode: DocMode): Promise<ScanResult> => {
    const cwd = process.cwd()
    const errors: string[] = []
    let filesScanned = 0
    let filesDocumented = 0
    let outputPath: string | undefined

    try {
      if (mode === 'readme') {
        outputPath = join(cwd, 'README.md')
        if (existsSync(outputPath)) {
          errors.push('README.md already exists — will create README.generated.md instead')
          outputPath = join(cwd, 'README.generated.md')
        }

        // Gather project info
        let pkgName = projectName
        let pkgDescription = ''
        let hasTests = false
        let hasTypeScript = false
        let dependencies: string[] = []

        const pkgJsonPath = join(cwd, 'package.json')
        if (existsSync(pkgJsonPath)) {
          try {
            const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
            pkgName = pkg.name || projectName
            pkgDescription = pkg.description || ''
            dependencies = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
            hasTests = !!(pkg.scripts?.test)
          } catch { /* ignore */ }
        }

        hasTypeScript = existsSync(join(cwd, 'tsconfig.json'))

        // Scan source files
        const srcFiles = await glob(['src/**/*.{ts,tsx,js,jsx}', 'lib/**/*.{ts,tsx}'], {
          cwd, ignore: ['**/node_modules/**', '**/dist/**'], onlyFiles: true
        })
        filesScanned = srcFiles.length

        // Generate README
        const readme = generateReadme(pkgName, pkgDescription, hasTypeScript, hasTests, dependencies, srcFiles)
        writeFileSync(outputPath, readme, 'utf-8')
        filesDocumented = 1

      } else if (mode === 'jsdoc') {
        // Find functions without JSDoc
        const srcFiles = await glob(['src/**/*.{ts,tsx}'], {
          cwd, ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'], onlyFiles: true
        })

        for (const file of srcFiles) {
          const filePath = join(cwd, file)
          try {
            const content = readFileSync(filePath, 'utf-8')
            const lines = content.split('\n')
            let modified = false

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim()
              // Match exported function/class without JSDoc
              if ((line.startsWith('export function ') || line.startsWith('export async function ') ||
                   line.startsWith('export class ') || line.startsWith('export const ') ||
                   line.startsWith('export default function ')) &&
                  (i === 0 || !lines[i - 1].trim().endsWith('*/'))) {
                // Check if next non-empty line starts with /**
                let hasJSDoc = false
                for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                  if (lines[j].trim().startsWith('/**')) { hasJSDoc = true; break }
                  if (lines[j].trim() && !lines[j].trim().startsWith('//') && !lines[j].trim().startsWith('*')) break
                }
                if (!hasJSDoc) {
                  const nameMatch = line.match(/(?:function|class|const)\s+(\w+)/)
                  const name = nameMatch ? nameMatch[1] : 'unknown'
                  const params = extractParams(line)
                  const indent = lines[i].match(/^(\s*)/)?.[1] || ''
                  const jsdoc = [
                    `${indent}/**`,
                    `${indent} * ${name}`,
                    ...params.map(p => `${indent} * @param ${p}`),
                    `${indent} * @returns ${line.includes('Promise') ? 'Promise<void>' : 'void'}`,
                    `${indent} */`,
                  ]
                  lines.splice(i, 0, ...jsdoc)
                  modified = true
                  filesDocumented++
                }
              }
            }

            if (modified) {
              writeFileSync(filePath, lines.join('\n'), 'utf-8')
            }
            filesScanned++
          } catch { /* skip file */ }
        }
        outputPath = `${filesDocumented} files updated`

      } else if (mode === 'api') {
        outputPath = join(cwd, 'API.md')
        const srcFiles = await glob(['src/**/*.{ts,tsx}'], {
          cwd, ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/*.test.*', '**/*.spec.*'], onlyFiles: true
        })

        const apiEntries: string[] = []
        for (const file of srcFiles) {
          const filePath = join(cwd, file)
          try {
            const content = readFileSync(filePath, 'utf-8')
            // Find exported functions and classes
            const exportMatches = content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g)
            for (const match of exportMatches) {
              const [, name, params] = match
              apiEntries.push(`### \`${name}(${params})\`\n\n*Source: \`${file}\`*\n`)
            }
            const classMatches = content.matchAll(/export\s+class\s+(\w+)/g)
            for (const match of classMatches) {
              const [, name] = match
              apiEntries.push(`### \`class ${name}\`\n\n*Source: \`${file}\`*\n`)
            }
            filesScanned++
          } catch { /* skip */ }
        }

        const apiDoc = `# ${projectName} API Documentation\n\n*Auto-generated on ${new Date().toISOString().split('T')[0]}*\n\n${apiEntries.join('\n---\n\n')}`
        writeFileSync(outputPath, apiDoc, 'utf-8')
        filesDocumented = 1

      } else if (mode === 'architecture') {
        outputPath = join(cwd, 'ARCHITECTURE.md')

        // Scan directory structure
        const dirs = await glob(['src/*/', 'lib/*/', 'packages/*/'], {
          cwd, onlyDirectories: true
        })

        const fileTypes = await glob(['src/**/*.*'], {
          cwd, ignore: ['**/node_modules/**', '**/dist/**', '**/*.map'], onlyFiles: true
        })

        const typeCounts: Record<string, number> = {}
        for (const f of fileTypes) {
          const ext = f.split('.').pop() || 'unknown'
          typeCounts[ext] = (typeCounts[ext] || 0) + 1
        }

        const archDoc = [
          `# ${projectName} Architecture`,
          '',
          `*Auto-generated on ${new Date().toISOString().split('T')[0]}*`,
          '',
          '## Directory Structure',
          '',
          '```',
          ...dirs.map(d => `  ${d}`),
          '```',
          '',
          '## File Types',
          '',
          '| Extension | Count |',
          '|-----------|-------|',
          ...Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([ext, count]) => `| .${ext} | ${count} |`),
          '',
          '## Key Directories',
          '',
          ...dirs.slice(0, 10).map(d => `- **${d}** — ${fileTypes.filter(f => f.startsWith(d)).length} files`),
        ].join('\n')

        writeFileSync(outputPath, archDoc, 'utf-8')
        filesScanned = fileTypes.length
        filesDocumented = 1
      }
    } catch (err) {
      errors.push(String(err))
    }

    return { filesScanned, filesDocumented, outputPath, errors }
  }, [projectName])

  const runMode = useCallback(async (mode: DocMode) => {
    setStep('scanning')
    const r = await scanProject(mode)
    setResult(r)
    setStep('results')
  }, [scanProject])

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (step === 'select-mode') onClose()
      else { setStep('select-mode'); setResult(null) }
      return
    }
    if (step === 'select-mode') {
      if (key.upArrow && modeIdx > 0) setModeIdx(modeIdx - 1)
      if (key.downArrow && modeIdx < MODES.length - 1) setModeIdx(modeIdx + 1)
      if (key.return) runMode(MODES[modeIdx].id)
    }
    if (step === 'results' && (key.return || input === 'q')) {
      setStep('select-mode'); setResult(null)
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Box flexDirection="row">
        <Text bold color="green">Documentation Generator</Text>
      </Box>
      <Box borderStyle="single" borderColor="gray" width="100%" />

      {step === 'select-mode' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Project: {projectName}</Text>
          <Text dimColor>Select documentation type:</Text>
          {MODES.map((m, i) => (
            <Text key={m.id} color={i === modeIdx ? 'green' : undefined}>
              {i === modeIdx ? '>' : ' '}{m.name}<Text dimColor> — {m.description}</Text>
            </Text>
          ))}
        </Box>
      )}

      {step === 'scanning' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="cyan">Scanning project...</Text>
        </Box>
      )}

      {step === 'results' && result && (
        <Box flexDirection="column" marginY={1}>
          <Text color="green" bold>Done!</Text>
          <Text>Files scanned: {result.filesScanned}</Text>
          <Text>Files documented: {result.filesDocumented}</Text>
          {result.outputPath && <Text color="cyan">Output: {result.outputPath}</Text>}
          {result.errors.length > 0 && result.errors.map((e, i) => <Text key={i} color="yellow">{e}</Text>)}
          <Text dimColor>Press Enter to continue</Text>
        </Box>
      )}
    </Box>
  )
}

function generateReadme(name: string, description: string, isTS: boolean, hasTests: boolean, deps: string[], srcFiles: string[]): string {
  const lines = [
    `# ${name}`,
    '',
    description || 'A software project.',
    '',
    '## Getting Started',
    '',
    '```bash',
    '# Install dependencies',
    'npm install',
    '',
    '# Run in development',
    'npm run dev',
    '',
    '# Build for production',
    'npm run build',
    '```',
    '',
  ]

  if (hasTests) {
    lines.push('## Testing', '', '```bash', 'npm test', '```', '')
  }

  lines.push(
    '## Project Structure', '',
    '```',
    ...srcFiles.slice(0, 20).map(f => `  ${f}`),
    srcFiles.length > 20 ? `  ... and ${srcFiles.length - 20} more files` : '',
    '```', '',
  )

  if (deps.length > 0) {
    const keyDeps = deps.filter(d => !d.startsWith('@types/')).slice(0, 15)
    if (keyDeps.length > 0) {
      lines.push('## Key Dependencies', '', ...keyDeps.map(d => `- \`${d}\``), '')
    }
  }

  lines.push(
    '## Tech Stack', '',
    isTS ? '- TypeScript' : '- JavaScript',
    '- Node.js',
    '',
    '---',
    `*Generated on ${new Date().toISOString().split('T')[0]}*`,
  )

  return lines.join('\n')
}

function extractParams(line: string): string[] {
  const match = line.match(/\(([^)]*)\)/)
  if (!match || !match[1].trim()) return []
  return match[1].split(',').map(p => p.trim().split(/[:=]/)[0].trim()).filter(Boolean)
}
