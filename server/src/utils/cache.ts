import crypto from 'crypto';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessSeq: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private accessCounter = 0;

  constructor(maxEntries: number = 2000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Retrieves a cached value if it exists and has not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    entry.accessSeq = ++this.accessCounter;
    return entry.value as T;
  }

  /**
   * Stores a value in cache with a time-to-live in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
      accessSeq: ++this.accessCounter,
    });
  }

  /**
   * Checks whether an unexpired key exists.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Deletes a specific key from the cache.
   */
  del(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Atomically invalidates all cache keys matching a given prefix.
   * e.g., invalidatePrefix('products:') clears all product list, slug, and suggestion caches.
   */
  invalidatePrefix(prefix: string): number {
    let deletedCount = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Clears the entire cache store.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns current active number of entries.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Sweeps and removes all expired items from memory.
   */
  cleanupExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Evicts the least recently accessed item.
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestSeq = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.accessSeq < oldestSeq) {
        oldestSeq = entry.accessSeq;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Generates a deterministic cache key from a prefix and arbitrary parameter object.
   */
  generateKey(prefix: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return prefix;
    }

    // Sort keys deterministically
    const sortedEntries = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));

    const paramString = sortedEntries
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join('&');

    if (paramString.length > 60) {
      const hash = crypto.createHash('sha1').update(paramString).digest('hex').slice(0, 16);
      return `${prefix}:${hash}`;
    }

    return `${prefix}:${paramString}`;
  }

  /**
   * Generates an HTTP ETag (Weak by default) based on deterministic payload hashing.
   */
  generateETag(body: unknown): string {
    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    const hash = crypto.createHash('md5').update(serialized).digest('hex').slice(0, 16);
    return `W/"${hash}"`;
  }

  /**
   * Compares client If-None-Match header with current resource ETag.
   */
  isFresh(ifNoneMatch: string | undefined, currentETag: string): boolean {
    if (!ifNoneMatch) return false;
    const cleanClient = ifNoneMatch.replace(/^W\//, '').replace(/"/g, '').trim();
    const cleanCurrent = currentETag.replace(/^W\//, '').replace(/"/g, '').trim();
    return cleanClient === cleanCurrent;
  }
}

export const cacheService = new MemoryCache();
