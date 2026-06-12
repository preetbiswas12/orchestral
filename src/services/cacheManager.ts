/**
 * Cache Manager
 *
 * Intelligent caching system for API responses and computed results.
 * Supports TTL-based expiration, LRU eviction, and size limits.
 */

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  size: number
  hits: number
}

interface CacheConfig {
  maxSize: number        // Max entries
  maxMemoryBytes: number // Max memory usage
  defaultTtl: number     // Default TTL in ms
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  maxMemoryBytes: 50 * 1024 * 1024, // 50MB
  defaultTtl: 5 * 60 * 1000,        // 5 minutes
}

class CacheManager<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>()
  private currentMemory = 0
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get a cached value. Returns undefined if not found or expired.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key)
      return undefined
    }

    entry.hits++
    return entry.value
  }

  /**
   * Set a cached value.
   */
  set(key: string, value: T, ttl?: number): void {
    // Remove existing entry
    if (this.cache.has(key)) {
      this.delete(key)
    }

    const size = estimateSize(value)
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTtl,
      size,
      hits: 0,
    }

    // Evict if necessary
    this.evictIfNeeded(size)

    this.cache.set(key, entry)
    this.currentMemory += size
  }

  /**
   * Get or compute a value.
   */
  async getOrCompute(key: string, compute: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key)
    if (cached !== undefined) return cached

    const value = await compute()
    this.set(key, value, ttl)
    return value
  }

  /**
   * Delete a cached entry.
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentMemory -= entry.size
      return this.cache.delete(key)
    }
    return false
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear()
    this.currentMemory = 0
  }

  /**
   * Get cache statistics.
   */
  stats(): { entries: number; memoryBytes: number; hitRate: number } {
    let totalHits = 0
    for (const entry of this.cache.values()) {
      totalHits += entry.hits
    }
    return {
      entries: this.cache.size,
      memoryBytes: this.currentMemory,
      hitRate: totalHits / Math.max(this.cache.size, 1),
    }
  }

  private evictIfNeeded(newEntrySize: number): void {
    // Evict by memory
    while (this.currentMemory + newEntrySize > this.config.maxMemoryBytes && this.cache.size > 0) {
      this.evictLeastRecentlyUsed()
    }

    // Evict by count
    while (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed()
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldest: { key: string; timestamp: number } | null = null
    for (const [key, entry] of this.cache) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = { key, timestamp: entry.timestamp }
      }
    }
    if (oldest) {
      this.delete(oldest.key)
    }
  }
}

/**
 * Estimate the memory size of a value.
 */
function estimateSize(value: unknown): number {
  if (typeof value === 'string') return value.length * 2
  if (typeof value === 'number') return 8
  if (typeof value === 'boolean') return 4
  if (value === null || value === undefined) return 0
  try {
    return JSON.stringify(value).length * 2
  } catch {
    return 1024 // Default estimate
  }
}

// ============================================================================
// Global Cache Instances
// ============================================================================

/** API response cache */
export const apiResponseCache = new CacheManager<unknown>({
  maxSize: 500,
  defaultTtl: 5 * 60 * 1000, // 5 minutes
})

/** File content cache */
export const fileContentCache = new CacheManager<string>({
  maxSize: 200,
  defaultTtl: 30_000, // 30 seconds
})

/** Computation cache (expensive operations) */
export const computationCache = new CacheManager<unknown>({
  maxSize: 100,
  defaultTtl: 60_000, // 1 minute
})

/**
 * Clear all caches.
 */
export function clearAllCaches(): void {
  apiResponseCache.clear()
  fileContentCache.clear()
  computationCache.clear()
}

/**
 * Get combined cache statistics.
 */
export function getCacheStats(): {
  api: { entries: number; memoryBytes: number; hitRate: number }
  file: { entries: number; memoryBytes: number; hitRate: number }
  computation: { entries: number; memoryBytes: number; hitRate: number }
} {
  return {
    api: apiResponseCache.stats(),
    file: fileContentCache.stats(),
    computation: computationCache.stats(),
  }
}
