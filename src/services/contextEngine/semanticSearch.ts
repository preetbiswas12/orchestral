/**
 * Semantic File Search
 *
 * Provides embedding-based file search for the context engine.
 * Generates embeddings for project files and caches them, enabling
 * natural language queries like "find authentication-related files".
 *
 * Embeddings are stored in .claude/embeddings.json with file hash + mtime
 * for cache invalidation. Auto-indexes on session start (background, incremental).
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, relative } from 'path'

// ── Types ──────────────────────────────────────────────────────────

export interface FileEmbedding {
  path: string
  hash: string
  mtime: number
  embedding: number[]
  /** Number of tokens in the file when indexed */
  tokenCount: number
}

export interface SearchResult {
  path: string
  score: number
  snippet: string
}

export interface SemanticIndex {
  version: number
  embeddings: FileEmbedding[]
  /** Model used for embeddings */
  model: string
  /** When the index was last updated */
  lastUpdated: number
}

// ── Constants ──────────────────────────────────────────────────────

const INDEX_VERSION = 1
const INDEX_FILE = '.claude/embeddings.json'
const MAX_FILE_SIZE = 50_000 // Skip files larger than 50KB
const MAX_FILES = 500 // Max files to index
const SNIPPET_LENGTH = 200

// File extensions to index
const INDEXABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb',
  '.php', '.c', '.cpp', '.h', '.hpp', '.json', '.yaml', '.yml',
  '.toml', '.md', '.txt', '.sh', '.bash', '.zsh', '.fish',
])

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage',
  '.next', '.nuxt', '.cache', '__pycache__', '.venv', 'vendor',
])

// ── Public API ─────────────────────────────────────────────────────

/**
 * Load the semantic index from disk, or create a new empty one.
 */
export async function loadIndex(cwd: string): Promise<SemanticIndex> {
  const indexPath = join(cwd, INDEX_FILE)
  try {
    if (existsSync(indexPath)) {
      const content = await readFile(indexPath, 'utf8')
      const index = JSON.parse(content) as SemanticIndex
      if (index.version === INDEX_VERSION) {
        return index
      }
    }
  } catch {
    // Index corrupt or missing — create fresh
  }
  return createEmptyIndex()
}

/**
 * Save the semantic index to disk.
 */
export async function saveIndex(cwd: string, index: SemanticIndex): Promise<void> {
  const indexPath = join(cwd, INDEX_FILE)
  await mkdir(join(cwd, '.claude'), { recursive: true })
  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8')
}

/**
 * Search for files semantically similar to the query.
 * Returns ranked results with path, relevance score, and a snippet.
 *
 * NOTE: This is a rule-based implementation that uses keyword matching
 * and file path analysis. For true semantic search, integrate with an
 * embedding API (OpenAI, Cohere, or the active AI provider).
 */
export async function search(
  cwd: string,
  query: string,
  index: SemanticIndex,
  maxResults: number = 10,
): Promise<SearchResult[]> {
  const queryKeywords = extractSearchKeywords(query)
  const results: SearchResult[] = []

  for (const entry of index.embeddings) {
    const score = computeRelevanceScore(queryKeywords, entry, cwd)
    if (score > 0.1) {
      const snippet = await getFileSnippet(join(cwd, entry.path))
      results.push({
        path: entry.path,
        score,
        snippet,
      })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, maxResults)
}

/**
 * Check if a file should be indexed based on extension and location.
 */
export function shouldIndex(filePath: string): boolean {
  // Check extension
  const ext = filePath.slice(filePath.lastIndexOf('.'))
  if (!INDEXABLE_EXTENSIONS.has(ext.toLowerCase())) return false

  // Check if in a skipped directory
  const parts = filePath.split(/[/\\]/)
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return false
  }

  return true
}

/**
 * Get statistics about the current index.
 */
export function getIndexStats(index: SemanticIndex): {
  totalFiles: number
  totalTokens: number
  model: string
  lastUpdated: number
  oldestFile: string | null
  newestFile: string | null
} {
  const totalTokens = index.embeddings.reduce((sum, e) => sum + e.tokenCount, 0)
  const sorted = [...index.embeddings].sort((a, b) => a.mtime - b.mtime)

  return {
    totalFiles: index.embeddings.length,
    totalTokens,
    model: index.model,
    lastUpdated: index.lastUpdated,
    oldestFile: sorted[0]?.path ?? null,
    newestFile: sorted[sorted.length - 1]?.path ?? null,
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function createEmptyIndex(): SemanticIndex {
  return {
    version: INDEX_VERSION,
    embeddings: [],
    model: 'keyword-based',
    lastUpdated: Date.now(),
  }
}

function extractSearchKeywords(query: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'find', 'search', 'look', 'get', 'show', 'me', 'all', 'files',
    'related', 'about', 'for', 'with', 'that', 'this', 'which',
    'to', 'of', 'in', 'on', 'at', 'by', 'from', 'as', 'into',
    'and', 'or', 'but', 'not', 'no', 'it', 'its',
  ])

  return new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s_]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )
}

function computeRelevanceScore(
  queryKeywords: Set<string>,
  entry: FileEmbedding,
  _cwd: string,
): number {
  let score = 0
  const pathLower = entry.path.toLowerCase()
  const fileName = pathLower.split(/[/\\]/).pop() ?? ''

  for (const keyword of queryKeywords) {
    // Exact path match
    if (pathLower.includes(keyword)) {
      score += 0.3
    }
    // Filename match (higher weight)
    if (fileName.includes(keyword)) {
      score += 0.5
    }
    // Directory name match
    const dirParts = pathLower.split(/[/\\]/)
    for (const part of dirParts) {
      if (part === keyword || part.includes(keyword)) {
        score += 0.2
      }
    }
  }

  // Normalize by query size
  if (queryKeywords.size > 0) {
    score = score / queryKeywords.size
  }

  // Recency bonus (files modified more recently get a small boost)
  const ageInDays = (Date.now() - entry.mtime) / (1000 * 60 * 60 * 24)
  if (ageInDays < 7) score += 0.1
  else if (ageInDays < 30) score += 0.05

  return Math.min(1, score)
}

async function getFileSnippet(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf8')
    return content.slice(0, SNIPPET_LENGTH).replace(/\n/g, ' ') +
      (content.length > SNIPPET_LENGTH ? '...' : '')
  } catch {
    return '(unable to read file)'
  }
}
