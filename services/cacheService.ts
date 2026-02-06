import type { SitewideAnalysis, SeoAnalysisResult } from '../types';

const CACHE_PREFIX = 'orchestrator-ai-cache';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 50; // Maximum number of cached analyses


interface CachedAnalysis {
  domain: string;
  urlsHash: string;
  timestamp: number;
  ttl: number;
  sitewide: SitewideAnalysis;
  seo: SeoAnalysisResult;
}

interface CacheMetadata {
  version: string;
  lastCleanup: number;
  entries: number;
}


/**
 * Generate a simple hash from a string using FNV-1a algorithm
 * Fast, deterministic hashing for cache key generation
 */
function simpleHash(str: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Generate a content-aware hash from an array of URLs
 * Sorts URLs for consistent hashing regardless of input order
 */
function generateUrlsHash(urls: string[]): string {
  const sortedUrls = [...urls].sort();
  const urlString = sortedUrls.join('|');
  return simpleHash(urlString);
}

/**
 * Extract domain from a URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Generate a unique cache key for a domain and URL set
 */
function generateCacheKey(domain: string, urlsHash: string): string {
  return `${CACHE_PREFIX}:${domain}:${urlsHash}`;
}

/**
 * Get cache metadata
 */
function getMetadata(): CacheMetadata {
  try {
    const data = localStorage.getItem(`${CACHE_PREFIX}:metadata`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('[CacheService] Failed to parse metadata:', e);
  }
  return {
    version: '1.0',
    lastCleanup: Date.now(),
    entries: 0
  };
}

/**
 * Update cache metadata
 */
function updateMetadata(updates: Partial<CacheMetadata>): void {
  const current = getMetadata();
  const updated = { ...current, ...updates };
  try {
    localStorage.setItem(`${CACHE_PREFIX}:metadata`, JSON.stringify(updated));
  } catch (e) {
    console.warn('[CacheService] Failed to update metadata:', e);
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const metadata = getMetadata();

  // Only run cleanup once per hour
  if (now - metadata.lastCleanup < 60 * 60 * 1000) {
    return;
  }

  let removedCount = 0;
  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX) && key !== `${CACHE_PREFIX}:metadata`) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const cached: CachedAnalysis = JSON.parse(data);
            // Check if expired
            if (now - cached.timestamp > cached.ttl) {
              keysToRemove.push(key);
              removedCount++;
            }
          }
        } catch (e) {
          // If parsing fails, mark for removal
          keysToRemove.push(key);
          removedCount++;
        }
      }
    }

    // Remove expired entries
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[CacheService] Failed to remove expired entry:', key);
      }
    });

    if (removedCount > 0) {
      console.log(`[CacheService] Cleaned up ${removedCount} expired entries`);
    }

    updateMetadata({
      lastCleanup: now,
      entries: Math.max(0, metadata.entries - removedCount)
    });
  } catch (e) {
    console.warn('[CacheService] Cleanup failed:', e);
  }
}

/**
 * Enforce cache size limits by removing oldest entries
 */
function enforceCacheLimit(): void {
  const metadata = getMetadata();

  if (metadata.entries <= MAX_CACHE_SIZE) {
    return;
  }

  const entries: Array<{ key: string; timestamp: number }> = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX) && key !== `${CACHE_PREFIX}:metadata`) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const cached: CachedAnalysis = JSON.parse(data);
            entries.push({ key, timestamp: cached.timestamp });
          }
        } catch (e) {
          // Skip invalid entries
        }
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries until we're under the limit
    const toRemove = entries.length - MAX_CACHE_SIZE;
    if (toRemove > 0) {
      for (let i = 0; i < toRemove; i++) {
        try {
          localStorage.removeItem(entries[i].key);
        } catch (e) {
          console.warn('[CacheService] Failed to remove old entry:', entries[i].key);
        }
      }
      console.log(`[CacheService] Removed ${toRemove} oldest entries to maintain cache limit`);
      updateMetadata({ entries: MAX_CACHE_SIZE });
    }
  } catch (e) {
    console.warn('[CacheService] Failed to enforce cache limit:', e);
  }
}


class CacheService {
  /**
   * Retrieve a cached analysis if available and not expired
   */
  async getAnalysis(
    domainUrl: string,
    urls: string[]
  ): Promise<{ sitewide: SitewideAnalysis; seo: SeoAnalysisResult } | null> {
    // Run cleanup in background
    setTimeout(() => cleanupExpiredEntries(), 0);

    const domain = extractDomain(domainUrl);
    const urlsHash = generateUrlsHash(urls);
    const cacheKey = generateCacheKey(domain, urlsHash);

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        console.log(`[CacheService] Cache miss for ${domain}`);
        return null;
      }

      const data: CachedAnalysis = JSON.parse(cached);

      // Check if expired
      const now = Date.now();
      if (now - data.timestamp > data.ttl) {
        console.log(`[CacheService] Cache expired for ${domain}`);
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`[CacheService] ✅ Cache hit for ${domain} (${Math.round((now - data.timestamp) / (1000 * 60 * 60))}h old)`);

      return {
        sitewide: data.sitewide,
        seo: data.seo
      };
    } catch (e) {
      console.warn('[CacheService] Failed to retrieve cache:', e);
      return null;
    }
  }

  /**
   * Store an analysis in the cache
   */
  async setAnalysis(
    domainUrl: string,
    urls: string[],
    sitewideAnalysis: SitewideAnalysis,
    seoAnalysis: SeoAnalysisResult,
    ttl: number = DEFAULT_TTL_MS
  ): Promise<void> {
    const domain = extractDomain(domainUrl);
    const urlsHash = generateUrlsHash(urls);
    const cacheKey = generateCacheKey(domain, urlsHash);

    const cacheEntry: CachedAnalysis = {
      domain,
      urlsHash,
      timestamp: Date.now(),
      ttl,
      sitewide: sitewideAnalysis,
      seo: seoAnalysis
    };

    try {
      const serialized = JSON.stringify(cacheEntry);
      localStorage.setItem(cacheKey, serialized);

      // Update metadata
      const metadata = getMetadata();
      updateMetadata({ entries: metadata.entries + 1 });

      console.log(`[CacheService] ✅ Cached analysis for ${domain} (${(serialized.length / 1024).toFixed(1)}KB)`);

      // Enforce cache size limits
      setTimeout(() => enforceCacheLimit(), 0);
    } catch (e) {
      console.warn('[CacheService] Failed to cache analysis:', e);

      // If quota exceeded, try to clear old entries and retry
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        console.log('[CacheService] Storage quota exceeded, clearing old entries...');
        this.clearOldestEntries(5);

        // Retry once
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
          console.log('[CacheService] ✅ Cached after cleanup');
        } catch (retryError) {
          console.error('[CacheService] Failed to cache even after cleanup');
        }
      }
    }
  }

  /**
   * Clear a specific cached analysis
   */
  clearAnalysis(domainUrl: string, urls: string[]): void {
    const domain = extractDomain(domainUrl);
    const urlsHash = generateUrlsHash(urls);
    const cacheKey = generateCacheKey(domain, urlsHash);

    try {
      localStorage.removeItem(cacheKey);
      const metadata = getMetadata();
      updateMetadata({ entries: Math.max(0, metadata.entries - 1) });
      console.log(`[CacheService] Cleared cache for ${domain}`);
    } catch (e) {
      console.warn('[CacheService] Failed to clear cache:', e);
    }
  }

  /**
   * Clear all cached analyses (or specific pattern)
   */
  clearCache(pattern: string = '*'): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          if (pattern === '*' || key.includes(pattern)) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('[CacheService] Failed to remove key:', key);
        }
      });

      updateMetadata({ entries: 0, lastCleanup: Date.now() });
      console.log(`[CacheService] Cleared ${keysToRemove.length} cache entries`);
    } catch (e) {
      console.warn('[CacheService] Failed to clear cache:', e);
    }
  }

  /**
   * Remove the oldest N entries from cache
   */
  private clearOldestEntries(count: number): void {
    const entries: Array<{ key: string; timestamp: number }> = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX) && key !== `${CACHE_PREFIX}:metadata`) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const cached: CachedAnalysis = JSON.parse(data);
              entries.push({ key, timestamp: cached.timestamp });
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest N entries
      for (let i = 0; i < Math.min(count, entries.length); i++) {
        localStorage.removeItem(entries[i].key);
      }

      console.log(`[CacheService] Removed ${Math.min(count, entries.length)} oldest entries`);
    } catch (e) {
      console.warn('[CacheService] Failed to clear oldest entries:', e);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let totalSize = 0;
    let entryCount = 0;
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX) && key !== `${CACHE_PREFIX}:metadata`) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              totalSize += data.length;
              entryCount++;

              const cached: CachedAnalysis = JSON.parse(data);
              if (!oldestTimestamp || cached.timestamp < oldestTimestamp) {
                oldestTimestamp = cached.timestamp;
              }
              if (!newestTimestamp || cached.timestamp > newestTimestamp) {
                newestTimestamp = cached.timestamp;
              }
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      }
    } catch (e) {
      console.warn('[CacheService] Failed to get stats:', e);
    }

    return {
      entries: entryCount,
      totalSize,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();