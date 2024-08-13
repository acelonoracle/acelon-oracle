import { log } from 'console'
import { CACHE_DURATION } from '../constants'

interface CacheEntry {
  price: number
  timestamp: number
  sources: Array<{ exchangeId: string; certificate: string }>
}

export class Cache {
  private cache: Map<string, CacheEntry> = new Map()
  private cacheDuration: number

  constructor(cacheDuration: number = CACHE_DURATION) {
    this.cacheDuration = cacheDuration
    log(`🌴 Cache initialized with duration: ${this.cacheDuration}ms`)
  }

  private getKey(from: string, to: string, exchangeId: string): string {
    return `${from}-${to}-${exchangeId}`
  }

  set(
    from: string,
    to: string,
    exchangeId: string,
    price: number,
    certificate: string
  ): void {
    const key = this.getKey(from, to, exchangeId)
    this.cache.set(key, {
      price,
      timestamp: Date.now(),
      sources: [{ exchangeId, certificate }],
    })
    log(`🗿 Cache entry set for ${key}: price=${price}`)
  }

  get(from: string, to: string, exchangeId: string): CacheEntry | undefined {
    const key = this.getKey(from, to, exchangeId)
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.timestamp < this.cacheDuration) {
      log(`🎯 Cache hit for ${key}: price=${entry.price}`)
      return entry
    }
    if (entry) {
      log(`⌛️ Cache entry expired for ${key}`)
      this.cache.delete(key)
    } else {
      log(`🌊 Cache miss for ${key}`)
    }
    return undefined
  }

  getAll(from: string, to: string, exchanges?: string[]): CacheEntry[] {
    const results: CacheEntry[] = []
    const prefix = `${from}-${to}-`
    log(`Fetching all cache entries for ${from}-${to}`)

    for (const [key, value] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        const exchangeId = key.slice(prefix.length)
        if (!exchanges || exchanges.includes(exchangeId)) {
          if (Date.now() - value.timestamp < this.cacheDuration) {
            results.push(value)
            log(`🎯 Valid cache entry found for ${key}`)
          } else {
            log(`⌛️ Expired cache entry removed for ${key}`)
            this.cache.delete(key)
          }
        }
      }
    }

    log(`Found ${results.length} valid cache entries for ${from}-${to}`)
    return results
  }
}

export const cache = new Cache()
