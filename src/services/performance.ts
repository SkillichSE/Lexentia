// caching and performance optimization per optimization spec section 11

// cache entry with expiration
interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number // time to live in ms
}

// lru cache implementation per spec section 11.1
class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)

    if (!entry) return undefined

    // check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: K, value: V, ttl: number = 5 * 60 * 1000): void { // default 5 min
    // evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const keys = Array.from(this.cache.keys())
      const firstKey = keys[0]
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// response cache for ai requests
// key includes input + context hash per spec section 11.1
export function createResponseCache(maxSize: number = 50) {
  const cache = new LRUCache<string, string>(maxSize)

  return {
    get: (input: string, contextHash: string): string | undefined => {
      const key = generateCacheKey(input, contextHash)
      return cache.get(key)
    },

    set: (input: string, contextHash: string, response: string, ttl?: number): void => {
      const key = generateCacheKey(input, contextHash)
      cache.set(key, response, ttl)
    },

    clear: () => cache.clear(),

    size: () => cache.size()
  }
}

// generate cache key from input and context
function generateCacheKey(input: string, contextHash: string): string {
  // simple hash function
  const str = input + '|' + contextHash
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // convert to 32bit integer
  }
  return hash.toString(36)
}

// context hash for cache keys
export function hashContext(context: string): string {
  let hash = 0
  for (let i = 0; i < context.length; i++) {
    const char = context.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

// lazy file loading per spec section 11.2
export function createLazyLoader<T>(loader: (path: string) => Promise<T>) {
  const loadedFiles = new Map<string, T>()
  const loadingPromises = new Map<string, Promise<T>>()

  return {
    load: async (path: string): Promise<T> => {
      // return cached
      if (loadedFiles.has(path)) {
        return loadedFiles.get(path)!
      }

      // return existing promise
      if (loadingPromises.has(path)) {
        return loadingPromises.get(path)!
      }

      // start loading
      const promise = loader(path).then(result => {
        loadedFiles.set(path, result)
        loadingPromises.delete(path)
        return result
      }).catch(error => {
        loadingPromises.delete(path)
        throw error
      })

      loadingPromises.set(path, promise)
      return promise
    },

    get: (path: string): T | undefined => {
      return loadedFiles.get(path)
    },

    has: (path: string): boolean => {
      return loadedFiles.has(path)
    },

    invalidate: (path: string): void => {
      loadedFiles.delete(path)
      loadingPromises.delete(path)
    },

    clear: (): void => {
      loadedFiles.clear()
      loadingPromises.clear()
    }
  }
}

// debounce utility for performance
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

// throttle utility for limiting requests
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// performance monitoring
export function createPerformanceMonitor() {
  const metrics: Record<string, number[]> = {}

  return {
    record: (operation: string, duration: number): void => {
      if (!metrics[operation]) {
        metrics[operation] = []
      }
      metrics[operation].push(duration)

      // keep only last 100 measurements
      if (metrics[operation].length > 100) {
        metrics[operation].shift()
      }
    },

    getAverage: (operation: string): number => {
      const values = metrics[operation]
      if (!values || values.length === 0) return 0
      return values.reduce((a, b) => a + b, 0) / values.length
    },

    getMetrics: (): Record<string, { avg: number; count: number }> => {
      const result: Record<string, { avg: number; count: number }> = {}
      for (const [op, values] of Object.entries(metrics)) {
        result[op] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length
        }
      }
      return result
    },

    clear: (): void => {
      for (const key in metrics) {
        delete metrics[key]
      }
    }
  }
}
